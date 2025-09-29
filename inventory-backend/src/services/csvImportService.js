const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Product, InventoryAudit, sequelize } = require('../models');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * CSV Import Service
 * Handles bulk product import from CSV files
 */
class CSVImportService {

  /**
   * Import products from CSV file
   * @param {string} filePath - Path to CSV file
   * @param {Object} user - User performing the import
   * @param {Object} options - Import options
   * @returns {Object} Import results
   */
  static async importProducts(filePath, user, options = {}) {
    const {
      updateExisting = false,
      skipErrors = true,
      validateOnly = false,
      batchSize = 100
    } = options;

    if (!fs.existsSync(filePath)) {
      throw new ValidationError('CSV file not found');
    }

    const results = {
      total_rows: 0,
      successful_imports: 0,
      failed_imports: 0,
      updated_products: 0,
      created_products: 0,
      errors: [],
      imported_products: [],
      validation_errors: []
    };

    const products = [];
    const seenSKUs = new Set();

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }) => header.toLowerCase().trim()
        }))
        .on('data', (row) => {
          results.total_rows++;

          try {
            const product = this.validateAndParseRow(row, results.total_rows);

            // Check for duplicate SKUs in file
            if (seenSKUs.has(product.sku)) {
              results.validation_errors.push({
                row: results.total_rows,
                error: `Duplicate SKU '${product.sku}' found in CSV file`,
                data: row
              });
              return;
            }

            seenSKUs.add(product.sku);
            products.push({ ...product, row_number: results.total_rows });

          } catch (error) {
            results.validation_errors.push({
              row: results.total_rows,
              error: error.message,
              data: row
            });
          }
        })
        .on('end', async () => {
          try {
            if (validateOnly) {
              results.validation_summary = {
                valid_rows: products.length,
                invalid_rows: results.validation_errors.length,
                duplicate_skus: results.total_rows - products.length - results.validation_errors.length
              };
              resolve(results);
              return;
            }

            // Process products in batches
            await this.processBatches(products, user, updateExisting, skipErrors, batchSize, results);

            // Clean up temporary file
            if (filePath.includes('temp')) {
              fs.unlinkSync(filePath);
            }

            resolve(results);

          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(new ValidationError(`CSV parsing error: ${error.message}`));
        });
    });
  }

  /**
   * Validate and parse CSV row
   * @private
   */
  static validateAndParseRow(row, rowNumber) {
    const requiredFields = ['sku', 'name', 'category', 'price', 'quantity'];
    const missingFields = requiredFields.filter(field => !row[field] || row[field].toString().trim() === '');

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const sku = row.sku.toString().trim();
    const name = row.name.toString().trim();
    const category = row.category.toString().trim();
    const description = row.description ? row.description.toString().trim() : '';

    // Validate SKU format
    if (!/^[A-Z0-9-_]{3,20}$/i.test(sku)) {
      throw new Error('SKU must be 3-20 characters and contain only letters, numbers, hyphens, and underscores');
    }

    // Validate and parse price
    const priceStr = row.price.toString().replace(/[$,]/g, '');
    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      throw new Error('Price must be a valid non-negative number');
    }

    // Validate and parse quantity
    const quantity = parseInt(row.quantity);
    if (isNaN(quantity) || quantity < 0) {
      throw new Error('Quantity must be a valid non-negative integer');
    }

    // Parse optional fields
    const reorderLevel = row.reorder_level ? parseInt(row.reorder_level) : Math.max(5, Math.floor(quantity * 0.1));
    const location = row.location ? row.location.toString().trim() : 'Unknown';
    const supplier = row.supplier ? row.supplier.toString().trim() : '';

    // Validate reorder level
    if (isNaN(reorderLevel) || reorderLevel < 0) {
      throw new Error('Reorder level must be a valid non-negative integer');
    }

    return {
      sku: sku.toUpperCase(),
      name,
      description,
      category,
      price: parseFloat(price.toFixed(2)),
      quantity,
      reorder_level: reorderLevel,
      location,
      supplier
    };
  }

  /**
   * Process products in batches
   * @private
   */
  static async processBatches(products, user, updateExisting, skipErrors, batchSize, results) {
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      for (const productData of batch) {
        try {
          await this.processProduct(productData, user, updateExisting, results);
        } catch (error) {
          results.failed_imports++;
          results.errors.push({
            row: productData.row_number,
            sku: productData.sku,
            error: error.message
          });

          if (!skipErrors) {
            throw error;
          }
        }
      }
    }
  }

  /**
   * Process individual product
   * @private
   */
  static async processProduct(productData, user, updateExisting, results) {
    const { row_number, ...product } = productData;

    // Check if product exists
    const existingProduct = await Product.findBySku(product.sku);

    if (existingProduct) {
      if (!updateExisting) {
        throw new Error(`Product with SKU '${product.sku}' already exists. Set updateExisting=true to update.`);
      }

      // Update existing product
      const oldQuantity = existingProduct.quantity;
      const updatedProduct = await Product.update(existingProduct.id, product);

      // Log audit trail if quantity changed
      if (oldQuantity !== product.quantity) {
        await InventoryAudit.create({
          product_id: existingProduct.id,
          user_id: user.id,
          operation_type: 'correction',
          old_quantity: oldQuantity,
          new_quantity: product.quantity,
          reason: `Bulk CSV import - Product updated`
        });
      }

      results.updated_products++;
      results.imported_products.push({
        action: 'updated',
        sku: product.sku,
        name: product.name,
        old_quantity: oldQuantity,
        new_quantity: product.quantity
      });

    } else {
      // Create new product with transaction
      const newProduct = await sequelize.transaction(async (transaction) => {
        // Create product
        const createdProduct = await Product.create(product, { transaction });

        // Log audit trail for new product
        if (createdProduct.quantity > 0) {
          await InventoryAudit.create({
            product_id: createdProduct.id,
            user_id: user.id,
            operation_type: 'purchase',
            old_quantity: 0,
            new_quantity: createdProduct.quantity,
            reason: `Bulk CSV import - Product created`
          }, { transaction });
        }

        return createdProduct;
      });

      results.created_products++;
      results.imported_products.push({
        action: 'created',
        sku: product.sku,
        name: product.name,
        quantity: product.quantity
      });
    }

    results.successful_imports++;
  }

  /**
   * Get CSV template for product import
   * @returns {Array} Template headers and sample data
   */
  static getImportTemplate() {
    return {
      headers: [
        'sku',
        'name',
        'description',
        'category',
        'price',
        'quantity',
        'reorder_level',
        'location',
        'supplier'
      ],
      required_fields: ['sku', 'name', 'category', 'price', 'quantity'],
      sample_data: [
        {
          sku: 'LAPTOP-001',
          name: 'Dell Laptop XPS 13',
          description: 'High-performance ultrabook with SSD',
          category: 'Electronics',
          price: '1299.99',
          quantity: '25',
          reorder_level: '5',
          location: 'Warehouse A',
          supplier: 'Dell Inc.'
        },
        {
          sku: 'BOOK-002',
          name: 'JavaScript Programming Guide',
          description: 'Comprehensive guide to modern JavaScript',
          category: 'Books',
          price: '39.99',
          quantity: '100',
          reorder_level: '10',
          location: 'Warehouse B',
          supplier: 'Tech Publications'
        }
      ],
      field_descriptions: {
        sku: 'Unique product identifier (3-20 chars, letters/numbers/-/_)',
        name: 'Product name (required)',
        description: 'Product description (optional)',
        category: 'Product category (required)',
        price: 'Product price in decimal format (required)',
        quantity: 'Current stock quantity (required)',
        reorder_level: 'Minimum stock level before reorder (optional, defaults to 10% of quantity)',
        location: 'Storage location (optional)',
        supplier: 'Product supplier (optional)'
      }
    };
  }

  /**
   * Validate CSV file format
   * @param {string} filePath - Path to CSV file
   * @returns {Object} Validation results
   */
  static async validateCSVFormat(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new ValidationError('CSV file not found');
    }

    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      headers: [],
      sample_rows: []
    };

    return new Promise((resolve, reject) => {
      let rowCount = 0;
      let headers = [];

      fs.createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }) => {
            const cleanHeader = header.toLowerCase().trim();
            headers.push(cleanHeader);
            return cleanHeader;
          }
        }))
        .on('headers', (headerList) => {
          validation.headers = headerList;

          // Check for required headers
          const requiredHeaders = ['sku', 'name', 'category', 'price', 'quantity'];
          const missingHeaders = requiredHeaders.filter(h => !headerList.includes(h));

          if (missingHeaders.length > 0) {
            validation.valid = false;
            validation.errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
          }

          // Check for unexpected headers
          const validHeaders = ['sku', 'name', 'description', 'category', 'price', 'quantity', 'reorder_level', 'location', 'supplier'];
          const invalidHeaders = headerList.filter(h => !validHeaders.includes(h));

          if (invalidHeaders.length > 0) {
            validation.warnings.push(`Unknown headers (will be ignored): ${invalidHeaders.join(', ')}`);
          }
        })
        .on('data', (row) => {
          rowCount++;

          // Keep first 3 rows as samples
          if (rowCount <= 3) {
            validation.sample_rows.push(row);
          }
        })
        .on('end', () => {
          validation.total_rows = rowCount;

          if (rowCount === 0) {
            validation.valid = false;
            validation.errors.push('CSV file is empty');
          }

          resolve(validation);
        })
        .on('error', (error) => {
          validation.valid = false;
          validation.errors.push(`CSV parsing error: ${error.message}`);
          resolve(validation);
        });
    });
  }
}

module.exports = CSVImportService;