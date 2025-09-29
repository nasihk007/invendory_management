const { Product, Audit, Notification } = require('../models');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

/**
 * Stock Management Service
 * Specialized service for inventory stock operations
 */
class StockService {
  /**
   * Perform stock adjustment with full audit trail
   * @param {number} productId - Product ID
   * @param {number} newQuantity - New stock quantity
   * @param {number} userId - User performing the adjustment
   * @param {string} reason - Reason for adjustment
   * @param {string} operationType - Type of operation
   * @returns {Promise<Object>} Adjustment result
   */
  static async adjustStock(productId, newQuantity, userId, reason, operationType = 'manual_adjustment') {
    try {
      // Validate inputs
      if (newQuantity < 0) {
        throw new ValidationError('Stock quantity cannot be negative');
      }

      if (!reason || reason.trim().length < 3) {
        throw new ValidationError('Reason for stock adjustment is required (minimum 3 characters)');
      }

      // Get current product
      const product = await Product.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      const oldQuantity = product.quantity;
      const quantityChange = newQuantity - oldQuantity;

      // Update stock with audit logging
      const updatedProduct = await Product.updateStock(
        productId,
        newQuantity,
        userId,
        reason,
        operationType
      );

      // Check for stock level notifications
      await this.checkStockLevelNotifications(updatedProduct);

      // Return comprehensive result
      return {
        product: updatedProduct,
        adjustment: {
          old_quantity: oldQuantity,
          new_quantity: newQuantity,
          change: quantityChange,
          change_type: quantityChange > 0 ? 'increase' : quantityChange < 0 ? 'decrease' : 'no_change',
          reason,
          operation_type: operationType
        },
        status: {
          is_low_stock: updatedProduct.isLowStock(),
          is_out_of_stock: updatedProduct.isOutOfStock(),
          stock_level: this.determineStockLevel(updatedProduct),
          notification_created: newQuantity <= updatedProduct.reorder_level && oldQuantity > updatedProduct.reorder_level
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk stock adjustments
   * @param {Array} adjustments - Array of stock adjustments
   * @param {number} userId - User performing adjustments
   * @returns {Promise<Object>} Bulk adjustment results
   */
  static async bulkStockAdjustment(adjustments, userId) {
    const results = {
      successful: [],
      failed: [],
      summary: {
        total: adjustments.length,
        success_count: 0,
        error_count: 0,
        total_items_affected: 0,
        notifications_created: 0
      }
    };

    for (const adjustment of adjustments) {
      try {
        const { sku, quantity, reason, operation_type = 'manual_adjustment' } = adjustment;

        // Find product by SKU
        const product = await Product.findBySku(sku);
        if (!product) {
          results.failed.push({
            sku,
            error: 'Product not found'
          });
          results.summary.error_count++;
          continue;
        }

        // Perform adjustment
        const result = await this.adjustStock(
          product.id,
          quantity,
          userId,
          reason || `Bulk adjustment for ${sku}`,
          operation_type
        );

        results.successful.push({
          sku,
          product_id: product.id,
          product_name: product.name,
          old_quantity: result.adjustment.old_quantity,
          new_quantity: result.adjustment.new_quantity,
          change: result.adjustment.change,
          notification_created: result.status.notification_created
        });

        results.summary.success_count++;
        results.summary.total_items_affected += Math.abs(result.adjustment.change);
        if (result.status.notification_created) {
          results.summary.notifications_created++;
        }

      } catch (error) {
        results.failed.push({
          sku: adjustment.sku,
          error: error.message
        });
        results.summary.error_count++;
      }
    }

    return results;
  }

  /**
   * Stock transfer between locations or products
   * @param {number} fromProductId - Source product ID
   * @param {number} toProductId - Destination product ID (optional, for transfers)
   * @param {number} quantity - Quantity to transfer
   * @param {number} userId - User performing transfer
   * @param {string} reason - Reason for transfer
   * @returns {Promise<Object>} Transfer result
   */
  static async transferStock(fromProductId, toProductId, quantity, userId, reason) {
    try {
      // Validate transfer quantity
      if (quantity <= 0) {
        throw new ValidationError('Transfer quantity must be positive');
      }

      // Get source product
      const fromProduct = await Product.findById(fromProductId);
      if (!fromProduct) {
        throw new NotFoundError('Source product not found');
      }

      if (fromProduct.quantity < quantity) {
        throw new ValidationError(`Insufficient stock. Available: ${fromProduct.quantity}, Requested: ${quantity}`);
      }

      let transferResult = {
        from_product: null,
        to_product: null,
        transfer_details: {
          quantity,
          reason,
          timestamp: new Date().toISOString()
        }
      };

      // Decrease from source
      const fromResult = await this.adjustStock(
        fromProductId,
        fromProduct.quantity - quantity,
        userId,
        `Transfer out: ${reason}`,
        'transfer'
      );

      transferResult.from_product = fromResult;

      // If destination product specified, increase its stock
      if (toProductId) {
        const toProduct = await Product.findById(toProductId);
        if (!toProduct) {
          // Rollback the first operation
          await this.adjustStock(
            fromProductId,
            fromProduct.quantity,
            userId,
            'Rollback failed transfer',
            'correction'
          );
          throw new NotFoundError('Destination product not found');
        }

        const toResult = await this.adjustStock(
          toProductId,
          toProduct.quantity + quantity,
          userId,
          `Transfer in: ${reason}`,
          'transfer'
        );

        transferResult.to_product = toResult;
      }

      return transferResult;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Process sale and update stock
   * @param {Array} saleItems - Array of sale items
   * @param {number} userId - User processing sale
   * @param {string} saleReference - Sale reference number
   * @returns {Promise<Object>} Sale processing result
   */
  static async processSale(saleItems, userId, saleReference) {
    const results = {
      successful: [],
      failed: [],
      summary: {
        total_items: saleItems.length,
        total_quantity_sold: 0,
        total_value: 0,
        success_count: 0,
        error_count: 0
      }
    };

    for (const item of saleItems) {
      try {
        const { sku, quantity } = item;

        // Find product
        const product = await Product.findBySku(sku);
        if (!product) {
          results.failed.push({
            sku,
            error: 'Product not found'
          });
          results.summary.error_count++;
          continue;
        }

        // Check stock availability
        if (product.quantity < quantity) {
          results.failed.push({
            sku,
            error: `Insufficient stock. Available: ${product.quantity}, Requested: ${quantity}`
          });
          results.summary.error_count++;
          continue;
        }

        // Process sale
        const newQuantity = product.quantity - quantity;
        const saleResult = await this.adjustStock(
          product.id,
          newQuantity,
          userId,
          `Sale: ${saleReference}`,
          'sale'
        );

        const itemValue = quantity * product.price;

        results.successful.push({
          sku,
          product_id: product.id,
          product_name: product.name,
          quantity_sold: quantity,
          unit_price: product.price,
          total_value: itemValue,
          remaining_stock: newQuantity,
          notification_created: saleResult.status.notification_created
        });

        results.summary.success_count++;
        results.summary.total_quantity_sold += quantity;
        results.summary.total_value += itemValue;

      } catch (error) {
        results.failed.push({
          sku: item.sku,
          error: error.message
        });
        results.summary.error_count++;
      }
    }

    return results;
  }

  /**
   * Process purchase/receiving and update stock
   * @param {Array} purchaseItems - Array of purchase items
   * @param {number} userId - User processing purchase
   * @param {string} purchaseReference - Purchase reference number
   * @returns {Promise<Object>} Purchase processing result
   */
  static async processPurchase(purchaseItems, userId, purchaseReference) {
    const results = {
      successful: [],
      failed: [],
      summary: {
        total_items: purchaseItems.length,
        total_quantity_received: 0,
        success_count: 0,
        error_count: 0
      }
    };

    for (const item of purchaseItems) {
      try {
        const { sku, quantity } = item;

        // Find product
        const product = await Product.findBySku(sku);
        if (!product) {
          results.failed.push({
            sku,
            error: 'Product not found'
          });
          results.summary.error_count++;
          continue;
        }

        // Process purchase
        const newQuantity = product.quantity + quantity;
        const purchaseResult = await this.adjustStock(
          product.id,
          newQuantity,
          userId,
          `Purchase received: ${purchaseReference}`,
          'purchase'
        );

        results.successful.push({
          sku,
          product_id: product.id,
          product_name: product.name,
          quantity_received: quantity,
          previous_stock: product.quantity,
          new_stock: newQuantity,
          stock_level_improved: product.isLowStock() && !purchaseResult.product.isLowStock()
        });

        results.summary.success_count++;
        results.summary.total_quantity_received += quantity;

      } catch (error) {
        results.failed.push({
          sku: item.sku,
          error: error.message
        });
        results.summary.error_count++;
      }
    }

    return results;
  }

  /**
   * Get comprehensive stock level report
   * @param {Object} filters - Report filters
   * @returns {Promise<Object>} Stock level report
   */
  static async getStockLevelReport(filters = {}) {
    try {
      const { category, lowStockOnly = false, outOfStockOnly = false } = filters;

      // Get products based on filters
      const result = await Product.findAll({
        category,
        lowStock: lowStockOnly,
        limit: 10000 // Get all for report
      });

      let products = result.products;

      // Filter for out of stock if requested
      if (outOfStockOnly) {
        products = products.filter(p => p.quantity === 0);
      }

      // Categorize products by stock level
      const report = {
        summary: {
          total_products: products.length,
          categories_count: category ? 1 : await Product.getCategories().then(cats => cats.length),
          total_stock_value: 0,
          stock_distribution: {
            out_of_stock: 0,
            low_stock: 0,
            normal_stock: 0,
            overstocked: 0
          }
        },
        products_by_level: {
          critical: [], // Out of stock
          warning: [], // Low stock
          normal: [], // Normal stock
          overstocked: [] // Above normal levels (future feature)
        },
        category_breakdown: {}
      };

      // Process each product
      for (const product of products) {
        const stockLevel = this.determineStockLevel(product);
        const productValue = product.getTotalValue();

        report.summary.total_stock_value += productValue;
        report.summary.stock_distribution[stockLevel]++;

        const productWithStatus = {
          id: product.id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          quantity: product.quantity,
          reorder_level: product.reorder_level,
          price: product.price,
          total_value: productValue,
          stock_level: stockLevel,
          days_to_reorder: this.calculateDaysToReorder(product)
        };

        // Categorize by stock level
        switch (stockLevel) {
          case 'out_of_stock':
            report.products_by_level.critical.push(productWithStatus);
            break;
          case 'low_stock':
            report.products_by_level.warning.push(productWithStatus);
            break;
          default:
            report.products_by_level.normal.push(productWithStatus);
        }

        // Category breakdown
        if (!report.category_breakdown[product.category]) {
          report.category_breakdown[product.category] = {
            total_products: 0,
            total_value: 0,
            stock_levels: {
              out_of_stock: 0,
              low_stock: 0,
              normal_stock: 0
            }
          };
        }

        report.category_breakdown[product.category].total_products++;
        report.category_breakdown[product.category].total_value += productValue;
        report.category_breakdown[product.category].stock_levels[stockLevel]++;
      }

      return report;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Check and create stock level notifications
   * @private
   */
  static async checkStockLevelNotifications(product) {
    try {
      if (product.quantity <= product.reorder_level) {
        await Notification.createLowStockIfNotExists(
          product.id,
          product.quantity,
          product.reorder_level
        );
      }
    } catch (error) {
      console.error('Failed to create stock notification:', error.message);
    }
  }

  /**
   * Determine stock level category
   * @private
   */
  static determineStockLevel(product) {
    if (product.quantity === 0) {
      return 'out_of_stock';
    } else if (product.quantity <= product.reorder_level) {
      return 'low_stock';
    } else {
      return 'normal_stock';
    }
  }

  /**
   * Calculate estimated days until reorder needed (placeholder)
   * @private
   */
  static calculateDaysToReorder(product) {
    // This would use historical usage data in a real implementation
    // For now, return null as placeholder
    return null;
  }

  /**
   * Validate stock operation permissions
   * @param {Object} user - Current user
   * @param {string} operation - Operation being performed
   * @param {Object} product - Product being operated on
   * @returns {boolean} Permission granted
   */
  static validateStockOperationPermissions(user, operation, product = null) {
    switch (operation) {
      case 'adjust_stock':
      case 'process_sale':
      case 'process_purchase':
        return true; // All authenticated users can perform stock operations

      case 'transfer_stock':
        return user.role === 'manager'; // Only managers can transfer stock

      case 'bulk_operations':
        return user.role === 'manager'; // Only managers can perform bulk operations

      case 'view_reports':
        return true; // All authenticated users can view stock reports

      default:
        return false;
    }
  }
}

module.exports = StockService;