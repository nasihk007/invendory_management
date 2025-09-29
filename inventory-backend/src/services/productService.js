const { Product, InventoryAudit, Notification } = require('../models');
const { ValidationError, ConflictError, NotFoundError } = require('../middleware/errorHandler');

/**
 * Product Service
 * Business logic for product operations and stock management
 */
class ProductService {
  /**
   * Create new product with validation
   * @param {Object} productData - Product data
   * @param {number} userId - User creating the product
   * @returns {Promise<Object>} Created product with status
   */
  static async createProduct(productData, userId) {
    try {
      // Validate SKU uniqueness
      const existingProduct = await Product.findOne({ where: { sku: productData.sku } });
      if (existingProduct) {
        throw new ConflictError(`Product with SKU '${productData.sku}' already exists`);
      }

      // Validate business rules
      this.validateProductData(productData);

      // Create product
      const newProduct = await Product.create(productData);

      // Create initial audit record if product has stock
      if (newProduct.quantity > 0) {
        await InventoryAudit.create({
          product_id: newProduct.id,
          user_id: userId,
          old_quantity: 0,
          new_quantity: newProduct.quantity,
          reason: 'Initial product creation',
          operation_type: 'purchase'
        });
      }

      // Check if low stock notification should be created
      await this.checkAndCreateLowStockNotification(newProduct);

      return this.enrichProductWithStatus(newProduct);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Update product with business logic
   * @param {number} productId - Product ID
   * @param {Object} updateData - Update data
   * @param {number} userId - User making the update
   * @returns {Promise<Object>} Updated product
   */
  static async updateProduct(productId, updateData, userId) {
    try {
      // Get existing product
      const existingProduct = await Product.findByPk(productId);
      if (!existingProduct) {
        throw new NotFoundError('Product not found');
      }

      // Validate SKU uniqueness if being changed
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const skuConflict = await Product.findOne({ where: { sku: updateData.sku } });
        if (skuConflict && skuConflict.id !== productId) {
          throw new ConflictError(`Product with SKU '${updateData.sku}' already exists`);
        }
      }

      // Validate business rules
      this.validateProductData(updateData, false);

      // Handle quantity changes with audit logging
      if (updateData.quantity !== undefined && updateData.quantity !== existingProduct.quantity) {
        return await this.updateProductStock(
          productId,
          updateData.quantity,
          userId,
          updateData.reason || 'Product quantity updated',
          'manual_adjustment',
          updateData
        );
      }

      // Regular update without quantity change
      await existingProduct.update(updateData);
      return this.enrichProductWithStatus(existingProduct);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Update product stock with comprehensive audit logging
   * @param {number} productId - Product ID
   * @param {number} newQuantity - New quantity
   * @param {number} userId - User making the change
   * @param {string} reason - Reason for change
   * @param {string} operationType - Type of operation
   * @param {Object} additionalUpdates - Other fields to update
   * @returns {Promise<Object>} Updated product with change info
   */
  static async updateProductStock(productId, newQuantity, userId, reason, operationType = 'manual_adjustment', additionalUpdates = {}) {
    try {
      // Get existing product
      const existingProduct = await Product.findByPk(productId);
      if (!existingProduct) {
        throw new NotFoundError('Product not found');
      }

      // Validate quantity
      if (newQuantity < 0) {
        throw new ValidationError('Quantity cannot be negative');
      }

      // Update stock with audit logging using Sequelize transaction
      const updatedProduct = await Product.updateStock(
        productId,
        newQuantity,
        userId,
        reason,
        operationType
      );

      // Update other fields if provided
      const { quantity, reason: updateReason, ...otherUpdates } = additionalUpdates;
      if (Object.keys(otherUpdates).length > 0) {
        await updatedProduct.update(otherUpdates);
      }

      // Get final product state
      const finalProduct = await Product.findByPk(productId);

      // Check for low stock notifications
      await this.checkAndCreateLowStockNotification(finalProduct);

      // Prepare response with change information
      const enrichedProduct = this.enrichProductWithStatus(finalProduct);
      enrichedProduct.stock_change = {
        old_quantity: existingProduct.quantity,
        new_quantity: newQuantity,
        change: newQuantity - existingProduct.quantity,
        reason,
        operation_type: operationType
      };

      return enrichedProduct;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk stock adjustment
   * @param {Array} stockUpdates - Array of stock updates
   * @param {number} userId - User making the changes
   * @returns {Promise<Object>} Bulk update results
   */
  static async bulkStockUpdate(stockUpdates, userId) {
    const results = {
      successful: [],
      failed: [],
      summary: {
        total: stockUpdates.length,
        success_count: 0,
        error_count: 0
      }
    };

    for (const update of stockUpdates) {
      try {
        const { sku, quantity, reason, operation_type = 'manual_adjustment' } = update;

        // Find product by SKU
        const product = await Product.findBySku(sku);
        if (!product) {
          results.failed.push({
            sku,
            error: 'Product not found'
          });
          continue;
        }

        // Update stock
        const updatedProduct = await this.updateProductStock(
          product.id,
          quantity,
          userId,
          reason || `Bulk update for ${sku}`,
          operation_type
        );

        results.successful.push({
          sku,
          product_id: product.id,
          old_quantity: product.quantity,
          new_quantity: quantity,
          change: quantity - product.quantity
        });

        results.summary.success_count++;

      } catch (error) {
        results.failed.push({
          sku: update.sku,
          error: error.message
        });
        results.summary.error_count++;
      }
    }

    return results;
  }

  /**
   * Check and create low stock notification
   * @private
   */
  static async checkAndCreateLowStockNotification(product) {
    try {
      if (product.quantity <= product.reorder_level) {
        await Notification.createLowStockIfNotExists(
          product.id,
          product.quantity,
          product.reorder_level
        );
      }
    } catch (error) {
      // Log error but don't throw - notification creation shouldn't break main flow
      console.error('Failed to create low stock notification:', error.message);
    }
  }

  /**
   * Validate product data according to business rules
   * @private
   */
  static validateProductData(productData, isCreate = true) {
    // SKU validation
    if (isCreate && !productData.sku) {
      throw new ValidationError('SKU is required');
    }

    if (productData.sku && !/^[A-Z0-9-]+$/.test(productData.sku)) {
      throw new ValidationError('SKU must contain only uppercase letters, numbers, and hyphens');
    }

    // Name validation
    if (isCreate && !productData.name) {
      throw new ValidationError('Product name is required');
    }

    if (productData.name && productData.name.trim().length < 2) {
      throw new ValidationError('Product name must be at least 2 characters long');
    }

    // Price validation
    if (isCreate && (productData.price === undefined || productData.price === null)) {
      throw new ValidationError('Price is required');
    }

    if (productData.price !== undefined && productData.price < 0) {
      throw new ValidationError('Price cannot be negative');
    }

    // Quantity validation
    if (productData.quantity !== undefined && productData.quantity < 0) {
      throw new ValidationError('Quantity cannot be negative');
    }

    // Reorder level validation
    if (productData.reorder_level !== undefined && productData.reorder_level < 0) {
      throw new ValidationError('Reorder level cannot be negative');
    }

    // Category validation
    if (isCreate && !productData.category) {
      throw new ValidationError('Category is required');
    }

    if (productData.category && productData.category.trim().length < 2) {
      throw new ValidationError('Category must be at least 2 characters long');
    }
  }

  /**
   * Enrich product with status information
   * @private
   */
  static enrichProductWithStatus(product) {
    return {
      ...product,
      status: {
        is_low_stock: product.isLowStock(),
        is_out_of_stock: product.isOutOfStock(),
        stock_level: product.quantity <= product.reorder_level ? 'low' : 'normal',
        total_value: product.getTotalValue(),
        urgency: product.quantity === 0 ? 'critical' :
                 product.isLowStock() ? 'warning' : 'normal'
      }
    };
  }

  /**
   * Calculate inventory statistics
   * @returns {Promise<Object>} Inventory statistics
   */
  static async getInventoryStatistics() {
    try {
      const allProducts = await Product.findAll({ limit: 10000 });
      const lowStockProducts = await Product.findLowStock(1000);
      const categories = await Product.getCategories();

      const stats = {
        total_products: allProducts.total,
        total_categories: categories.length,
        stock_summary: {
          total_items: allProducts.products.reduce((sum, p) => sum + p.quantity, 0),
          total_value: parseFloat(allProducts.products.reduce((sum, p) => sum + p.getTotalValue(), 0).toFixed(2)),
          average_value_per_item: 0,
          low_stock_products: lowStockProducts.length,
          out_of_stock_products: allProducts.products.filter(p => p.quantity === 0).length
        },
        category_breakdown: {},
        stock_alerts: {
          critical: allProducts.products.filter(p => p.quantity === 0).length,
          warning: lowStockProducts.filter(p => p.quantity > 0).length,
          normal: allProducts.products.filter(p => !p.isLowStock()).length
        }
      };

      // Calculate average value per item
      if (stats.stock_summary.total_items > 0) {
        stats.stock_summary.average_value_per_item = parseFloat(
          (stats.stock_summary.total_value / stats.stock_summary.total_items).toFixed(2)
        );
      }

      // Calculate category statistics
      for (const category of categories) {
        const categoryProducts = allProducts.products.filter(p => p.category === category);
        stats.category_breakdown[category] = {
          product_count: categoryProducts.length,
          total_quantity: categoryProducts.reduce((sum, p) => sum + p.quantity, 0),
          total_value: parseFloat(categoryProducts.reduce((sum, p) => sum + p.getTotalValue(), 0).toFixed(2)),
          low_stock_count: categoryProducts.filter(p => p.isLowStock()).length,
          out_of_stock_count: categoryProducts.filter(p => p.quantity === 0).length
        };
      }

      return stats;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Advanced product search with filters
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Object>} Search results
   */
  static async advancedSearch(searchParams) {
    try {
      const {
        query,
        category,
        minPrice,
        maxPrice,
        inStock,
        lowStock,
        sortBy = 'created_at',
        sortOrder = 'desc',
        limit = 50,
        offset = 0
      } = searchParams;

      // Get base results from database
      const result = await Product.findAll({
        search: query,
        category,
        lowStock: lowStock === 'true',
        sortBy,
        sortOrder,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Apply additional filters
      let filteredProducts = result.products;

      if (minPrice !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(minPrice));
      }

      if (maxPrice !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(maxPrice));
      }

      if (inStock === 'true') {
        filteredProducts = filteredProducts.filter(p => p.quantity > 0);
      }

      // Enrich with status
      const enrichedProducts = filteredProducts.map(product =>
        this.enrichProductWithStatus(product)
      );

      return {
        products: enrichedProducts,
        search_metadata: {
          query,
          filters_applied: {
            category,
            price_range: {
              min: minPrice ? parseFloat(minPrice) : null,
              max: maxPrice ? parseFloat(maxPrice) : null
            },
            in_stock_only: inStock === 'true',
            low_stock_only: lowStock === 'true'
          },
          sort: { sortBy, sortOrder }
        },
        results_summary: {
          total_found: enrichedProducts.length,
          total_in_database: result.total,
          filtered_out: result.products.length - enrichedProducts.length
        },
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(result.total / parseInt(limit))
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Predict reorder requirements
   * @param {number} days - Days to look ahead
   * @returns {Promise<Array>} Products that may need reordering
   */
  static async predictReorderRequirements(days = 30) {
    try {
      // Get products that are currently low stock or approaching reorder level
      const lowStockProducts = await Product.findLowStock(1000);

      // Get recent audit data to calculate usage rates
      const predictions = [];

      for (const product of lowStockProducts) {
        // Get audit history for this product
        const auditHistory = await Audit.findByProduct(product.id, 50);

        // Calculate usage rate (items consumed over time)
        const sales = auditHistory.filter(a => ['sale', 'damage', 'transfer'].includes(a.operation_type));

        if (sales.length > 0) {
          const totalConsumed = sales.reduce((sum, audit) => sum + Math.abs(audit.quantity_change), 0);
          const oldestSale = new Date(Math.min(...sales.map(s => new Date(s.created_at))));
          const daysSinceOldest = Math.max(1, (Date.now() - oldestSale.getTime()) / (1000 * 60 * 60 * 24));

          const dailyUsageRate = totalConsumed / daysSinceOldest;
          const projectedUsage = dailyUsageRate * days;
          const projectedStock = Math.max(0, product.quantity - projectedUsage);

          predictions.push({
            ...this.enrichProductWithStatus(product),
            reorder_prediction: {
              current_quantity: product.quantity,
              reorder_level: product.reorder_level,
              daily_usage_rate: parseFloat(dailyUsageRate.toFixed(2)),
              projected_stock_in_days: parseFloat(projectedStock.toFixed(0)),
              days_until_reorder: projectedStock <= product.reorder_level ?
                Math.max(0, Math.floor((product.quantity - product.reorder_level) / dailyUsageRate)) : null,
              recommendation: projectedStock <= product.reorder_level ? 'reorder_now' : 'monitor'
            }
          });
        }
      }

      // Sort by urgency (days until reorder needed)
      predictions.sort((a, b) => {
        const daysA = a.reorder_prediction.days_until_reorder;
        const daysB = b.reorder_prediction.days_until_reorder;

        if (daysA === null && daysB === null) return 0;
        if (daysA === null) return 1;
        if (daysB === null) return -1;
        return daysA - daysB;
      });

      return predictions;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate permissions for product operations
   * @param {Object} user - Current user
   * @param {string} action - Action being performed
   * @param {Object} product - Product being operated on (optional)
   * @returns {boolean} Permission granted
   */
  static validateProductPermissions(user, action, product = null) {
    switch (action) {
      case 'create':
      case 'update':
      case 'update_stock':
        return true; // All authenticated users can create/update products

      case 'delete':
        // Staff can only delete products with zero stock, managers can delete any
        if (user.role === 'manager') return true;
        return product && product.quantity === 0;

      case 'view_all':
      case 'view_stats':
        return true; // All authenticated users can view products and stats

      case 'bulk_operations':
        return user.role === 'manager'; // Only managers can perform bulk operations

      default:
        return false;
    }
  }
}

module.exports = ProductService;