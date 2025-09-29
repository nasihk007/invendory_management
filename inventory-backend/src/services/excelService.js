const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { Product } = require('../models');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * Excel Service for handling import/export operations
 * Uses ExcelJS for advanced Excel features with validation and formatting
 */
class ExcelService {
  constructor() {
    this.requiredHeaders = [
      'SKU', 'Name', 'Description', 'Category', 'Quantity', 'Reorder Level', 'Price', 'Location'
    ];
    this.optionalHeaders = [];
    this.categoryOptions = [
      'Electronics', 'Clothing', 'Food & Beverage', 'Home & Garden',
      'Sports & Outdoors', 'Automotive', 'Books', 'Health & Beauty',
      'Tools & Hardware', 'Office Supplies'
    ];
  }

  /**
   * Create Excel template with data validation and professional formatting
   */
  async createTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Product Import Template', {
      properties: { tabColor: { argb: 'FF0066CC' } }
    });

    // Set up columns with proper widths
    worksheet.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Reorder Level', key: 'reorder_level', width: 15 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Location', key: 'location', width: 15 }
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 30;

    // Add data validation for Category column (D)
    worksheet.dataValidations.add('D2:D1000', {
      type: 'list',
      allowBlank: false,
      formulae: [this.categoryOptions.map(cat => `"${cat}"`).join(',')],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid Category',
      error: 'Please select a category from the dropdown list.'
    });

    // Add data validation for Quantity column (E)
    worksheet.dataValidations.add('E2:E1000', {
      type: 'whole',
      operator: 'greaterThanOrEqual',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid Quantity',
      error: 'Quantity must be a non-negative whole number.'
    });

    // Add data validation for Reorder Level column (F)
    worksheet.dataValidations.add('F2:F1000', {
      type: 'whole',
      operator: 'greaterThanOrEqual',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid Reorder Level',
      error: 'Reorder level must be a non-negative whole number.'
    });

    // Add data validation for Price column (G)
    worksheet.dataValidations.add('G2:G1000', {
      type: 'decimal',
      operator: 'greaterThan',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid Price',
      error: 'Price must be a positive decimal number.'
    });

    // Add sample data with proper formatting
    const sampleData = [
      {
        sku: 'SAMPLE-001',
        name: 'Sample Product 1',
        description: 'This is a sample product for demonstration',
        category: 'Electronics',
        quantity: 100,
        reorder_level: 10,
        price: 29.99,
        location: 'A1-B2-C3'
      },
      {
        sku: 'SAMPLE-002',
        name: 'Sample Product 2',
        description: 'Another sample product with different category',
        category: 'Clothing',
        quantity: 50,
        reorder_level: 5,
        price: 19.95,
        location: 'B2-C3-D4'
      }
    ];

    // Add sample data rows
    sampleData.forEach((product, index) => {
      const row = worksheet.addRow(product);

      // Style sample data rows
      row.font = { color: { argb: 'FF666666' } };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F5F5' }
      };

      // Format price column as currency
      row.getCell('G').numFmt = '$#,##0.00';
    });

    // Add instructions worksheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.columns = [
      { header: 'Import Instructions', key: 'instructions', width: 80 }
    ];

    const instructions = [
      'PRODUCT IMPORT TEMPLATE - INSTRUCTIONS',
      '',
      '1. REQUIRED FIELDS (must be filled):',
      '   • SKU: Unique product identifier (3-20 characters, alphanumeric)',
      '   • Name: Product name (max 255 characters)',
      '   • Category: Select from dropdown list',
      '   • Quantity: Non-negative whole number',
      '   • Reorder Level: Non-negative whole number',
      '   • Price: Positive decimal number',
      '',
      '2. OPTIONAL FIELDS:',
      '   • Description: Product description (max 500 characters)',
      '   • Location: Storage location (max 50 characters)',
      '',
      '3. DATA VALIDATION:',
      '   • Category dropdown prevents invalid entries',
      '   • Quantity and Reorder Level must be whole numbers ≥ 0',
      '   • Price must be a positive decimal number',
      '   • SKU must be unique across all products',
      '',
      '4. IMPORT PROCESS:',
      '   • Save this file after entering your data',
      '   • Upload through the Import Products interface',
      '   • Review validation results before confirming import',
      '   • Use "Update Existing" option to modify existing products',
      '',
      '5. TIPS FOR SUCCESS:',
      '   • Always backup your data before bulk imports',
      '   • Test with a small batch first',
      '   • Ensure SKUs are unique',
      '   • Verify categories match the dropdown options',
      '   • Double-check numerical values',
      '',
      'For support, contact your system administrator.'
    ];

    instructions.forEach((instruction, index) => {
      const row = instructionsSheet.addRow({ instructions: instruction });
      if (index === 0) {
        row.font = { bold: true, size: 14, color: { argb: 'FF0066CC' } };
      } else if (instruction.match(/^\d+\./)) {
        row.font = { bold: true, color: { argb: 'FF333333' } };
      }
    });

    return workbook;
  }

  /**
   * Parse Excel file and validate data
   */
  async parseExcelFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new ValidationError('Excel file not found');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(1); // First worksheet
    if (!worksheet) {
      throw new ValidationError('No data worksheet found in Excel file');
    }

    const results = {
      total_rows: 0,
      valid_rows: 0,
      invalid_rows: 0,
      products: [],
      errors: [],
      validation_summary: {
        missing_required_fields: 0,
        invalid_data_types: 0,
        duplicate_skus: 0,
        invalid_categories: 0
      }
    };

    // Validate headers
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value?.toString().trim();
    });

    const missingHeaders = this.requiredHeaders.filter(header =>
      !headers.some(h => h === header)
    );

    if (missingHeaders.length > 0) {
      throw new ValidationError(
        `Missing required headers: ${missingHeaders.join(', ')}`
      );
    }

    // Track SKUs for duplicate detection
    const skuTracker = new Set();

    // Process data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      results.total_rows++;

      const rowData = {};
      const rowErrors = [];

      // Extract data from each cell
      headers.forEach((header, colIndex) => {
        if (header && this.requiredHeaders.includes(header)) {
          const cell = row.getCell(colIndex);
          rowData[this.getFieldKey(header)] = cell.value;
        }
      });

      // Validate required fields
      this.requiredHeaders.forEach(header => {
        const fieldKey = this.getFieldKey(header);
        const value = rowData[fieldKey];

        if (!value || value.toString().trim() === '') {
          rowErrors.push({
            field: header,
            message: `${header} is required`,
            value: value
          });
          results.validation_summary.missing_required_fields++;
        }
      });

      // Data type and format validation
      if (rowData.sku) {
        const sku = rowData.sku.toString().trim();
        if (sku.length < 3 || sku.length > 20) {
          rowErrors.push({
            field: 'SKU',
            message: 'SKU must be 3-20 characters',
            value: sku
          });
          results.validation_summary.invalid_data_types++;
        }

        if (skuTracker.has(sku)) {
          rowErrors.push({
            field: 'SKU',
            message: 'Duplicate SKU found in file',
            value: sku
          });
          results.validation_summary.duplicate_skus++;
        } else {
          skuTracker.add(sku);
        }
      }

      if (rowData.category && !this.categoryOptions.includes(rowData.category)) {
        rowErrors.push({
          field: 'Category',
          message: `Invalid category. Must be one of: ${this.categoryOptions.join(', ')}`,
          value: rowData.category
        });
        results.validation_summary.invalid_categories++;
      }

      if (rowData.quantity && (!Number.isInteger(Number(rowData.quantity)) || Number(rowData.quantity) < 0)) {
        rowErrors.push({
          field: 'Quantity',
          message: 'Quantity must be a non-negative integer',
          value: rowData.quantity
        });
        results.validation_summary.invalid_data_types++;
      }

      if (rowData.reorder_level && (!Number.isInteger(Number(rowData.reorder_level)) || Number(rowData.reorder_level) < 0)) {
        rowErrors.push({
          field: 'Reorder Level',
          message: 'Reorder level must be a non-negative integer',
          value: rowData.reorder_level
        });
        results.validation_summary.invalid_data_types++;
      }

      if (rowData.price && (isNaN(Number(rowData.price)) || Number(rowData.price) <= 0)) {
        rowErrors.push({
          field: 'Price',
          message: 'Price must be a positive number',
          value: rowData.price
        });
        results.validation_summary.invalid_data_types++;
      }

      if (rowErrors.length > 0) {
        results.invalid_rows++;
        results.errors.push({
          row: rowNumber,
          errors: rowErrors,
          data: rowData
        });
      } else {
        results.valid_rows++;
        results.products.push({
          sku: rowData.sku?.toString().trim(),
          name: rowData.name?.toString().trim(),
          description: rowData.description?.toString().trim() || '',
          category: rowData.category?.toString().trim(),
          quantity: Number(rowData.quantity),
          reorder_level: Number(rowData.reorder_level),
          price: Number(rowData.price),
          location: rowData.location?.toString().trim() || ''
        });
      }
    });

    return results;
  }

  /**
   * Import products with comprehensive error handling
   */
  async importProducts(filePath, user, options = {}) {
    const {
      updateExisting = false,
      skipErrors = true,
      validateOnly = false,
      batchSize = 100
    } = options;

    // Parse and validate Excel file
    const parseResults = await this.parseExcelFile(filePath);

    if (validateOnly) {
      return {
        ...parseResults,
        operation: 'validation_only',
        message: 'Excel file validation completed'
      };
    }

    if (parseResults.valid_rows === 0) {
      throw new ValidationError('No valid products found in Excel file');
    }

    const importResults = {
      ...parseResults,
      successful_imports: 0,
      failed_imports: 0,
      updated_products: 0,
      created_products: 0,
      skipped_products: 0,
      import_errors: []
    };

    // Process products in batches
    const validProducts = parseResults.products;
    for (let i = 0; i < validProducts.length; i += batchSize) {
      const batch = validProducts.slice(i, i + batchSize);

      for (const productData of batch) {
        try {
          // Check if product exists
          const existingProduct = await Product.findOne({
            where: { sku: productData.sku }
          });

          if (existingProduct) {
            if (updateExisting) {
              await existingProduct.update(productData);
              importResults.successful_imports++;
              importResults.updated_products++;
            } else {
              importResults.skipped_products++;
            }
          } else {
            await Product.create({
              ...productData,
              created_by: user.id
            });
            importResults.successful_imports++;
            importResults.created_products++;
          }
        } catch (error) {
          importResults.failed_imports++;
          importResults.import_errors.push({
            sku: productData.sku,
            error: error.message,
            data: productData
          });

          if (!skipErrors) {
            throw new ValidationError(
              `Import failed at SKU ${productData.sku}: ${error.message}`
            );
          }
        }
      }
    }

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return importResults;
  }

  /**
   * Export products to Excel with professional formatting
   */
  async exportProducts(filters = {}, options = {}) {
    const {
      includeAuditData = false,
      format = 'standard'
    } = options;

    // Build query based on filters
    const whereClause = {};
    if (filters.category) {
      whereClause.category = filters.category;
    }
    if (filters.lowStockOnly) {
      whereClause.quantity = { [require('sequelize').Op.lte]: require('sequelize').col('reorder_level') };
    }

    const products = await Product.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products Export');

    // Set up columns based on format
    const baseColumns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Reorder Level', key: 'reorder_level', width: 15 },
      { header: 'Price', key: 'price', width: 12 },
      { header: 'Location', key: 'location', width: 15 },
      { header: 'Stock Status', key: 'stock_status', width: 15 },
      { header: 'Stock Value', key: 'stock_value', width: 15 }
    ];

    if (includeAuditData) {
      baseColumns.push(
        { header: 'Created At', key: 'created_at', width: 20 },
        { header: 'Updated At', key: 'updated_at', width: 20 },
        { header: 'Last Modified By', key: 'modified_by', width: 20 }
      );
    }

    worksheet.columns = baseColumns;

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 30;

    // Add product data
    products.forEach((product, index) => {
      const stockStatus = product.quantity === 0 ? 'Out of Stock'
        : product.quantity <= product.reorder_level ? 'Low Stock'
        : 'In Stock';

      const rowData = {
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        quantity: product.quantity,
        reorder_level: product.reorder_level,
        price: product.price,
        location: product.location,
        stock_status: stockStatus,
        stock_value: product.quantity * product.price
      };

      if (includeAuditData) {
        rowData.created_at = product.created_at;
        rowData.updated_at = product.updated_at;
        rowData.modified_by = 'System'; // TODO: Add user tracking
      }

      const row = worksheet.addRow(rowData);

      // Format price and stock value as currency
      row.getCell('price').numFmt = '$#,##0.00';
      row.getCell('stock_value').numFmt = '$#,##0.00';

      // Conditional formatting for stock status
      const statusCell = row.getCell('stock_status');
      if (stockStatus === 'Out of Stock') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF6B6B' }
        };
        statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      } else if (stockStatus === 'Low Stock') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB3B' }
        };
        statusCell.font = { color: { argb: 'FF333333' }, bold: true };
      } else {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4CAF50' }
        };
        statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      }
    });

    // Add summary row
    const summaryRow = worksheet.addRow({
      sku: 'SUMMARY',
      name: `Total Products: ${products.length}`,
      quantity: products.reduce((sum, p) => sum + p.quantity, 0),
      stock_value: products.reduce((sum, p) => sum + (p.quantity * p.price), 0)
    });

    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE3F2FD' }
    };

    // Generate filename and save
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `products_export_${timestamp}.xlsx`;
    const exportsDir = path.join(process.cwd(), 'uploads', 'exports');

    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const filePath = path.join(exportsDir, filename);
    await workbook.xlsx.writeFile(filePath);

    return {
      filename,
      filepath: filePath,
      record_count: products.length,
      export_summary: {
        total_products: products.length,
        total_value: products.reduce((sum, p) => sum + (p.quantity * p.price), 0),
        out_of_stock_items: products.filter(p => p.quantity === 0).length,
        low_stock_items: products.filter(p => p.quantity > 0 && p.quantity <= p.reorder_level).length
      }
    };
  }

  /**
   * Helper method to convert header to field key
   */
  getFieldKey(header) {
    const mapping = {
      'SKU': 'sku',
      'Name': 'name',
      'Description': 'description',
      'Category': 'category',
      'Quantity': 'quantity',
      'Reorder Level': 'reorder_level',
      'Price': 'price',
      'Location': 'location'
    };
    return mapping[header] || header.toLowerCase().replace(/ /g, '_');
  }

  /**
   * Download template file
   */
  async downloadTemplate() {
    const workbook = await this.createTemplate();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `product_import_template_${timestamp}.xlsx`;
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, filename);
    await workbook.xlsx.writeFile(filePath);

    return {
      filename,
      filepath: filePath,
      headers: this.requiredHeaders,
      sample_data_rows: 2
    };
  }
}

module.exports = new ExcelService();