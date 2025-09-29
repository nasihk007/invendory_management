const { Product, InventoryAudit, Notification, User } = require('../models');
const { ValidationError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

/**
 * Reports Service
 * Generates comprehensive business reports for managers
 */
class ReportsService {

  /**
   * Generate Inventory Valuation Report
   * @param {Object} options - Report options
   * @returns {Object} Inventory valuation data
   */
  static async generateInventoryValuation(options = {}) {
    const { includeZeroValue = false, groupByCategory = true } = options;

    try {
      // Get all products with current quantities and prices
      let products = await Product.findAll({ limit: 10000, offset: 0 });

      if (!includeZeroValue) {
        products = products.filter(p => p.quantity > 0);
      }

      // Calculate valuation data
      const valuationData = products.map(product => {
        const totalValue = product.quantity * product.price;
        const lowStockValue = product.quantity <= product.reorder_level ? totalValue : 0;

        return {
          id: product.id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          quantity: product.quantity,
          unit_price: product.price,
          total_value: parseFloat(totalValue.toFixed(2)),
          reorder_level: product.reorder_level,
          is_low_stock: product.quantity <= product.reorder_level,
          is_out_of_stock: product.quantity === 0,
          low_stock_value: parseFloat(lowStockValue.toFixed(2)),
          location: product.location || 'Unknown',
          supplier: product.supplier || 'Unknown'
        };
      });

      // Generate summary statistics
      const summary = {
        total_products: valuationData.length,
        total_inventory_value: parseFloat(valuationData.reduce((sum, item) => sum + item.total_value, 0).toFixed(2)),
        total_quantity: valuationData.reduce((sum, item) => sum + item.quantity, 0),
        low_stock_items: valuationData.filter(item => item.is_low_stock).length,
        out_of_stock_items: valuationData.filter(item => item.is_out_of_stock).length,
        low_stock_value: parseFloat(valuationData.reduce((sum, item) => sum + item.low_stock_value, 0).toFixed(2)),
        average_unit_value: valuationData.length > 0 ?
          parseFloat((valuationData.reduce((sum, item) => sum + item.total_value, 0) / valuationData.length).toFixed(2)) : 0
      };

      let categoryBreakdown = {};
      if (groupByCategory) {
        categoryBreakdown = this.groupByCategory(valuationData);
      }

      return {
        report_type: 'inventory_valuation',
        generated_at: new Date().toISOString(),
        summary,
        category_breakdown: categoryBreakdown,
        detailed_items: valuationData,
        recommendations: this.generateInventoryRecommendations(summary, categoryBreakdown)
      };

    } catch (error) {
      throw new ValidationError(`Failed to generate inventory valuation report: ${error.message}`);
    }
  }

  /**
   * Generate Sales Performance Report
   * @param {Object} options - Report options
   * @returns {Object} Sales performance data
   */
  static async generateSalesReport(options = {}) {
    const {
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0],
      includeProductDetails = true
    } = options;

    try {
      // Get sales-related audit records
      const salesAudits = await InventoryAudit.findByDateRange(dateFrom, dateTo, 10000);
      const salesData = salesAudits.filter(audit =>
        audit.operation_type === 'sale' && audit.quantity_change < 0
      );

      // Calculate sales metrics
      const salesByProduct = {};
      const salesByUser = {};
      const dailySales = {};

      salesData.forEach(sale => {
        const productKey = `${sale.product_id}`;
        const userKey = `${sale.user_id}`;
        const dateKey = new Date(sale.created_at).toISOString().split('T')[0];
        const quantitySold = Math.abs(sale.new_quantity - sale.old_quantity);

        // Group by product
        if (!salesByProduct[productKey]) {
          salesByProduct[productKey] = {
            product_id: sale.product_id,
            product_sku: sale.product_sku || 'Unknown',
            product_name: sale.product_name || 'Unknown',
            total_quantity_sold: 0,
            total_sales_count: 0,
            last_sale_date: sale.created_at
          };
        }
        salesByProduct[productKey].total_quantity_sold += quantitySold;
        salesByProduct[productKey].total_sales_count += 1;

        // Group by user
        if (!salesByUser[userKey]) {
          salesByUser[userKey] = {
            user_id: sale.user_id,
            user_username: sale.user_username || 'Unknown',
            total_quantity_sold: 0,
            total_sales_count: 0,
            unique_products: new Set()
          };
        }
        salesByUser[userKey].total_quantity_sold += quantitySold;
        salesByUser[userKey].total_sales_count += 1;
        salesByUser[userKey].unique_products.add(sale.product_id);

        // Group by day
        if (!dailySales[dateKey]) {
          dailySales[dateKey] = {
            date: dateKey,
            total_quantity_sold: 0,
            total_sales_count: 0,
            unique_products: new Set(),
            unique_users: new Set()
          };
        }
        dailySales[dateKey].total_quantity_sold += quantitySold;
        dailySales[dateKey].total_sales_count += 1;
        dailySales[dateKey].unique_products.add(sale.product_id);
        dailySales[dateKey].unique_users.add(sale.user_id);
      });

      // Convert sets to counts and sort data
      const topProducts = Object.values(salesByProduct)
        .sort((a, b) => b.total_quantity_sold - a.total_quantity_sold)
        .slice(0, 20);

      const topUsers = Object.values(salesByUser)
        .map(user => ({
          ...user,
          unique_products: user.unique_products.size
        }))
        .sort((a, b) => b.total_quantity_sold - a.total_quantity_sold)
        .slice(0, 10);

      const dailySalesArray = Object.values(dailySales)
        .map(day => ({
          ...day,
          unique_products: day.unique_products.size,
          unique_users: day.unique_users.size
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate summary
      const totalQuantitySold = salesData.reduce((sum, sale) => sum + Math.abs(sale.quantity_change), 0);
      const totalSalesTransactions = salesData.length;
      const uniqueProducts = new Set(salesData.map(sale => sale.product_id)).size;
      const uniqueUsers = new Set(salesData.map(sale => sale.user_id)).size;
      const averageDailySales = dailySalesArray.length > 0 ?
        totalQuantitySold / dailySalesArray.length : 0;

      return {
        report_type: 'sales_performance',
        date_range: { from: dateFrom, to: dateTo },
        generated_at: new Date().toISOString(),
        summary: {
          total_quantity_sold: totalQuantitySold,
          total_sales_transactions: totalSalesTransactions,
          unique_products_sold: uniqueProducts,
          unique_users_involved: uniqueUsers,
          average_daily_sales: parseFloat(averageDailySales.toFixed(2)),
          peak_sales_day: dailySalesArray.length > 0 ?
            dailySalesArray.reduce((peak, day) =>
              day.total_quantity_sold > peak.total_quantity_sold ? day : peak
            ) : null
        },
        top_selling_products: topProducts,
        top_performing_users: topUsers,
        daily_breakdown: dailySalesArray,
        trends: this.calculateSalesTrends(dailySalesArray)
      };

    } catch (error) {
      throw new ValidationError(`Failed to generate sales report: ${error.message}`);
    }
  }

  /**
   * Generate Stock Movement Report
   * @param {Object} options - Report options
   * @returns {Object} Stock movement data
   */
  static async generateStockMovementReport(options = {}) {
    const {
      dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0],
      operationType = null
    } = options;

    try {
      // Get all audit records for the date range
      const where = {};
      if (dateFrom || dateTo) {
        where.created_at = {};
        if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom);
        if (dateTo) where.created_at[Op.lte] = new Date(dateTo);
      }
      if (operationType) {
        where.operation_type = operationType;
      }

      const movements = await InventoryAudit.findAll({
        where,
        limit: 10000,
        order: [['created_at', 'DESC']]
      });

      // Analyze stock movements
      const movementsByType = {};
      const movementsByProduct = {};
      const movementsByUser = {};
      const dailyMovements = {};

      movements.forEach(movement => {
        const type = movement.operation_type;
        const productKey = `${movement.product_id}`;
        const userKey = `${movement.user_id}`;
        const dateKey = new Date(movement.created_at).toISOString().split('T')[0];
        const quantityChange = movement.new_quantity - movement.old_quantity;

        // Group by operation type
        if (!movementsByType[type]) {
          movementsByType[type] = {
            operation_type: type,
            total_movements: 0,
            total_increase: 0,
            total_decrease: 0,
            net_change: 0,
            unique_products: new Set(),
            unique_users: new Set()
          };
        }
        movementsByType[type].total_movements += 1;
        if (quantityChange > 0) {
          movementsByType[type].total_increase += quantityChange;
        } else {
          movementsByType[type].total_decrease += Math.abs(quantityChange);
        }
        movementsByType[type].net_change += quantityChange;
        movementsByType[type].unique_products.add(movement.product_id);
        movementsByType[type].unique_users.add(movement.user_id);

        // Group by product
        if (!movementsByProduct[productKey]) {
          movementsByProduct[productKey] = {
            product_id: movement.product_id,
            product_sku: movement.product_sku || 'Unknown',
            product_name: movement.product_name || 'Unknown',
            total_movements: 0,
            total_increase: 0,
            total_decrease: 0,
            net_change: 0,
            operation_types: new Set()
          };
        }
        movementsByProduct[productKey].total_movements += 1;
        if (quantityChange > 0) {
          movementsByProduct[productKey].total_increase += quantityChange;
        } else {
          movementsByProduct[productKey].total_decrease += Math.abs(quantityChange);
        }
        movementsByProduct[productKey].net_change += quantityChange;
        movementsByProduct[productKey].operation_types.add(type);

        // Group by user
        if (!movementsByUser[userKey]) {
          movementsByUser[userKey] = {
            user_id: movement.user_id,
            user_username: movement.user_username || 'Unknown',
            total_movements: 0,
            total_increase: 0,
            total_decrease: 0,
            unique_products: new Set(),
            operation_types: new Set()
          };
        }
        movementsByUser[userKey].total_movements += 1;
        if (quantityChange > 0) {
          movementsByUser[userKey].total_increase += quantityChange;
        } else {
          movementsByUser[userKey].total_decrease += Math.abs(quantityChange);
        }
        movementsByUser[userKey].unique_products.add(movement.product_id);
        movementsByUser[userKey].operation_types.add(type);

        // Group by day
        if (!dailyMovements[dateKey]) {
          dailyMovements[dateKey] = {
            date: dateKey,
            total_movements: 0,
            total_increase: 0,
            total_decrease: 0,
            net_change: 0,
            unique_products: new Set(),
            unique_users: new Set(),
            operation_types: new Set()
          };
        }
        dailyMovements[dateKey].total_movements += 1;
        if (quantityChange > 0) {
          dailyMovements[dateKey].total_increase += quantityChange;
        } else {
          dailyMovements[dateKey].total_decrease += Math.abs(quantityChange);
        }
        dailyMovements[dateKey].net_change += quantityChange;
        dailyMovements[dateKey].unique_products.add(movement.product_id);
        dailyMovements[dateKey].unique_users.add(movement.user_id);
        dailyMovements[dateKey].operation_types.add(type);
      });

      // Convert sets to counts and sort data
      const operationSummary = Object.values(movementsByType)
        .map(op => ({
          ...op,
          unique_products: op.unique_products.size,
          unique_users: op.unique_users.size
        }))
        .sort((a, b) => b.total_movements - a.total_movements);

      const mostActiveProducts = Object.values(movementsByProduct)
        .map(product => ({
          ...product,
          operation_types: Array.from(product.operation_types)
        }))
        .sort((a, b) => b.total_movements - a.total_movements)
        .slice(0, 20);

      const mostActiveUsers = Object.values(movementsByUser)
        .map(user => ({
          ...user,
          unique_products: user.unique_products.size,
          operation_types: Array.from(user.operation_types)
        }))
        .sort((a, b) => b.total_movements - a.total_movements)
        .slice(0, 10);

      const dailyBreakdown = Object.values(dailyMovements)
        .map(day => ({
          ...day,
          unique_products: day.unique_products.size,
          unique_users: day.unique_users.size,
          operation_types: Array.from(day.operation_types)
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate overall summary
      const totalIncrease = movements.reduce((sum, m) => sum + (m.quantity_change > 0 ? m.quantity_change : 0), 0);
      const totalDecrease = movements.reduce((sum, m) => sum + (m.quantity_change < 0 ? Math.abs(m.quantity_change) : 0), 0);
      const netChange = totalIncrease - totalDecrease;

      return {
        report_type: 'stock_movement',
        date_range: { from: dateFrom, to: dateTo },
        operation_filter: operationType || 'all',
        generated_at: new Date().toISOString(),
        summary: {
          total_movements: movements.length,
          total_stock_increase: totalIncrease,
          total_stock_decrease: totalDecrease,
          net_stock_change: netChange,
          unique_products_affected: new Set(movements.map(m => m.product_id)).size,
          unique_users_involved: new Set(movements.map(m => m.user_id)).size,
          operation_types_used: new Set(movements.map(m => m.operation_type)).size
        },
        operation_breakdown: operationSummary,
        most_active_products: mostActiveProducts,
        most_active_users: mostActiveUsers,
        daily_breakdown: dailyBreakdown,
        insights: this.generateMovementInsights(operationSummary, mostActiveProducts, dailyBreakdown)
      };

    } catch (error) {
      throw new ValidationError(`Failed to generate stock movement report: ${error.message}`);
    }
  }

  /**
   * Generate User Activity Report
   * @param {Object} options - Report options
   * @returns {Object} User activity data
   */
  static async generateUserActivityReport(options = {}) {
    const {
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0],
      includeDetails = true
    } = options;

    try {
      // Get all users and their activity
      const users = await User.findAll();
      const activityWhere = {};
      if (dateFrom || dateTo) {
        activityWhere.created_at = {};
        if (dateFrom) activityWhere.created_at[Op.gte] = new Date(dateFrom);
        if (dateTo) activityWhere.created_at[Op.lte] = new Date(dateTo);
      }

      const activities = await InventoryAudit.findAll({
        where: activityWhere,
        limit: 10000,
        order: [['created_at', 'DESC']]
      });

      // Analyze user activities
      const userActivities = {};
      const dailyUserActivities = {};

      // Initialize user data
      users.forEach(user => {
        userActivities[user.id] = {
          user_id: user.id,
          username: user.username,
          role: user.role,
          total_activities: 0,
          activities_by_type: {},
          unique_products_affected: new Set(),
          first_activity: null,
          last_activity: null,
          most_active_day: null,
          daily_breakdown: {}
        };
      });

      // Process activities
      activities.forEach(activity => {
        const userId = activity.user_id;
        const dateKey = new Date(activity.created_at).toISOString().split('T')[0];
        const operationType = activity.operation_type;

        if (userActivities[userId]) {
          const userActivity = userActivities[userId];

          // Update user totals
          userActivity.total_activities += 1;
          userActivity.unique_products_affected.add(activity.product_id);

          // Update activity types
          if (!userActivity.activities_by_type[operationType]) {
            userActivity.activities_by_type[operationType] = 0;
          }
          userActivity.activities_by_type[operationType] += 1;

          // Update timestamps
          if (!userActivity.first_activity || activity.created_at < userActivity.first_activity) {
            userActivity.first_activity = activity.created_at;
          }
          if (!userActivity.last_activity || activity.created_at > userActivity.last_activity) {
            userActivity.last_activity = activity.created_at;
          }

          // Update daily breakdown
          if (!userActivity.daily_breakdown[dateKey]) {
            userActivity.daily_breakdown[dateKey] = 0;
          }
          userActivity.daily_breakdown[dateKey] += 1;
        }

        // Track daily activities across all users
        if (!dailyUserActivities[dateKey]) {
          dailyUserActivities[dateKey] = {
            date: dateKey,
            total_activities: 0,
            active_users: new Set(),
            activities_by_type: {},
            unique_products: new Set()
          };
        }
        dailyUserActivities[dateKey].total_activities += 1;
        dailyUserActivities[dateKey].active_users.add(userId);
        dailyUserActivities[dateKey].unique_products.add(activity.product_id);

        if (!dailyUserActivities[dateKey].activities_by_type[operationType]) {
          dailyUserActivities[dateKey].activities_by_type[operationType] = 0;
        }
        dailyUserActivities[dateKey].activities_by_type[operationType] += 1;
      });

      // Process user activity data
      const processedUserActivities = Object.values(userActivities).map(user => {
        // Find most active day
        const dailyEntries = Object.entries(user.daily_breakdown);
        if (dailyEntries.length > 0) {
          const mostActiveEntry = dailyEntries.reduce((max, [date, count]) =>
            count > max.count ? { date, count } : max
          , { date: null, count: 0 });
          user.most_active_day = mostActiveEntry.date;
        }

        return {
          ...user,
          unique_products_affected: user.unique_products_affected.size,
          average_daily_activities: dailyEntries.length > 0 ?
            parseFloat((user.total_activities / dailyEntries.length).toFixed(2)) : 0
        };
      });

      // Process daily activities
      const processedDailyActivities = Object.values(dailyUserActivities)
        .map(day => ({
          ...day,
          active_users: day.active_users.size,
          unique_products: day.unique_products.size
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Sort users by activity
      const sortedUsers = processedUserActivities
        .sort((a, b) => b.total_activities - a.total_activities);

      // Calculate summary statistics
      const totalActivities = activities.length;
      const activeUsers = sortedUsers.filter(user => user.total_activities > 0);
      const averageActivitiesPerUser = activeUsers.length > 0 ?
        totalActivities / activeUsers.length : 0;

      return {
        report_type: 'user_activity',
        date_range: { from: dateFrom, to: dateTo },
        generated_at: new Date().toISOString(),
        summary: {
          total_users: users.length,
          active_users: activeUsers.length,
          inactive_users: users.length - activeUsers.length,
          total_activities: totalActivities,
          average_activities_per_user: parseFloat(averageActivitiesPerUser.toFixed(2)),
          most_active_user: activeUsers.length > 0 ? {
            username: activeUsers[0].username,
            activities: activeUsers[0].total_activities
          } : null,
          peak_activity_day: processedDailyActivities.length > 0 ?
            processedDailyActivities.reduce((peak, day) =>
              day.total_activities > peak.total_activities ? day : peak
            ) : null
        },
        user_rankings: sortedUsers.slice(0, 20),
        daily_activity_breakdown: processedDailyActivities,
        role_analysis: this.analyzeUsersByRole(sortedUsers),
        productivity_insights: this.generateProductivityInsights(sortedUsers, processedDailyActivities)
      };

    } catch (error) {
      throw new ValidationError(`Failed to generate user activity report: ${error.message}`);
    }
  }

  /**
   * Generate Low Stock Alert Report
   * @param {Object} options - Report options
   * @returns {Object} Low stock alert data
   */
  static async generateLowStockAlertReport(options = {}) {
    const { includePredictions = true, daysToPredict = 30 } = options;

    try {
      // Get current low stock products
      const lowStockProducts = await Product.getLowStockProducts();

      // Get recent notifications for context
      const notifications = await Notification.findAll({
        type: 'low_stock',
        limit: 1000,
        offset: 0
      });

      // Analyze current situation
      const criticalItems = lowStockProducts.filter(p => p.quantity === 0);
      const warningItems = lowStockProducts.filter(p => p.quantity > 0 && p.quantity <= p.reorder_level);

      // Group by category
      const categoryAnalysis = {};
      lowStockProducts.forEach(product => {
        if (!categoryAnalysis[product.category]) {
          categoryAnalysis[product.category] = {
            category: product.category,
            total_items: 0,
            critical_items: 0,
            warning_items: 0,
            total_shortage: 0,
            estimated_reorder_cost: 0
          };
        }

        const category = categoryAnalysis[product.category];
        category.total_items += 1;

        if (product.quantity === 0) {
          category.critical_items += 1;
        } else {
          category.warning_items += 1;
        }

        const shortage = Math.max(0, product.reorder_level - product.quantity);
        category.total_shortage += shortage;
        category.estimated_reorder_cost += shortage * product.price; // Rough estimate
      });

      // Process category data
      const categoryBreakdown = Object.values(categoryAnalysis)
        .map(cat => ({
          ...cat,
          estimated_reorder_cost: parseFloat(cat.estimated_reorder_cost.toFixed(2))
        }))
        .sort((a, b) => b.critical_items - a.critical_items);

      // Calculate urgency scores
      const urgencyAnalysis = lowStockProducts.map(product => {
        const shortage = Math.max(0, product.reorder_level - product.quantity);
        const urgencyScore = product.quantity === 0 ? 100 :
          Math.min(90, (shortage / product.reorder_level) * 90);

        return {
          ...product,
          shortage_amount: shortage,
          urgency_score: parseFloat(urgencyScore.toFixed(1)),
          estimated_stockout_days: this.estimateStockoutDays(product),
          recommended_order_quantity: Math.max(product.reorder_level * 2 - product.quantity, 0)
        };
      }).sort((a, b) => b.urgency_score - a.urgency_score);

      // Generate predictions if requested
      let predictions = {};
      if (includePredictions) {
        predictions = await this.generateStockPredictions(daysToPredict);
      }

      return {
        report_type: 'low_stock_alert',
        generated_at: new Date().toISOString(),
        summary: {
          total_low_stock_items: lowStockProducts.length,
          critical_items: criticalItems.length,
          warning_items: warningItems.length,
          categories_affected: Object.keys(categoryAnalysis).length,
          total_estimated_shortage_value: parseFloat(
            lowStockProducts.reduce((sum, p) => {
              const shortage = Math.max(0, p.reorder_level - p.quantity);
              return sum + (shortage * p.price);
            }, 0).toFixed(2)
          ),
          requires_immediate_action: criticalItems.length > 0
        },
        urgency_ranking: urgencyAnalysis.slice(0, 50),
        category_breakdown: categoryBreakdown,
        recent_notifications: notifications.notifications?.slice(0, 20) || [],
        stock_predictions: predictions,
        action_recommendations: this.generateStockActionRecommendations(urgencyAnalysis, categoryBreakdown)
      };

    } catch (error) {
      throw new ValidationError(`Failed to generate low stock alert report: ${error.message}`);
    }
  }

  /**
   * Group data by category
   * @private
   */
  static groupByCategory(items) {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = {
          category: item.category,
          total_items: 0,
          total_quantity: 0,
          total_value: 0,
          low_stock_items: 0,
          out_of_stock_items: 0
        };
      }

      acc[item.category].total_items += 1;
      acc[item.category].total_quantity += item.quantity || item.current_quantity;
      acc[item.category].total_value += item.total_value || (item.price * item.quantity);

      if (item.is_low_stock) acc[item.category].low_stock_items += 1;
      if (item.is_out_of_stock) acc[item.category].out_of_stock_items += 1;

      return acc;
    }, {});
  }

  /**
   * Generate inventory recommendations
   * @private
   */
  static generateInventoryRecommendations(summary, categoryBreakdown) {
    const recommendations = [];

    if (summary.out_of_stock_items > 0) {
      recommendations.push({
        priority: 'critical',
        type: 'restock',
        message: `${summary.out_of_stock_items} products are out of stock and need immediate restocking.`,
        action: 'Review out-of-stock items and place urgent orders'
      });
    }

    if (summary.low_stock_items > 5) {
      recommendations.push({
        priority: 'high',
        type: 'reorder',
        message: `${summary.low_stock_items} products are running low on stock.`,
        action: 'Plan restock orders for low-stock items'
      });
    }

    if (summary.low_stock_value > summary.total_inventory_value * 0.1) {
      recommendations.push({
        priority: 'medium',
        type: 'optimization',
        message: 'Low stock items represent significant inventory value.',
        action: 'Review reorder levels and purchasing strategies'
      });
    }

    return recommendations;
  }

  /**
   * Calculate sales trends
   * @private
   */
  static calculateSalesTrends(dailySales) {
    if (dailySales.length < 2) return null;

    const recent = dailySales.slice(-7); // Last 7 days
    const previous = dailySales.slice(-14, -7); // Previous 7 days

    const recentAvg = recent.reduce((sum, day) => sum + day.total_quantity_sold, 0) / recent.length;
    const previousAvg = previous.length > 0 ?
      previous.reduce((sum, day) => sum + day.total_quantity_sold, 0) / previous.length : recentAvg;

    const trend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    return {
      recent_average: parseFloat(recentAvg.toFixed(2)),
      previous_average: parseFloat(previousAvg.toFixed(2)),
      trend_percentage: parseFloat(trend.toFixed(1)),
      trend_direction: trend > 5 ? 'increasing' : trend < -5 ? 'decreasing' : 'stable'
    };
  }

  /**
   * Generate movement insights
   * @private
   */
  static generateMovementInsights(operationSummary, products, dailyBreakdown) {
    const insights = [];

    const dominantOperation = operationSummary.length > 0 ? operationSummary[0] : null;
    if (dominantOperation) {
      insights.push(`${dominantOperation.operation_type} operations account for the majority of stock movements`);
    }

    if (products.length > 0) {
      const topProduct = products[0];
      insights.push(`Product ${topProduct.product_sku} had the most stock movements with ${topProduct.total_movements} transactions`);
    }

    if (dailyBreakdown.length > 0) {
      const averageDaily = dailyBreakdown.reduce((sum, day) => sum + day.total_movements, 0) / dailyBreakdown.length;
      insights.push(`Average daily stock movements: ${averageDaily.toFixed(1)} transactions`);
    }

    return insights;
  }

  /**
   * Analyze users by role
   * @private
   */
  static analyzeUsersByRole(users) {
    const roleAnalysis = {};

    users.forEach(user => {
      if (!roleAnalysis[user.role]) {
        roleAnalysis[user.role] = {
          role: user.role,
          total_users: 0,
          active_users: 0,
          total_activities: 0,
          average_activities: 0
        };
      }

      roleAnalysis[user.role].total_users += 1;
      if (user.total_activities > 0) {
        roleAnalysis[user.role].active_users += 1;
        roleAnalysis[user.role].total_activities += user.total_activities;
      }
    });

    Object.values(roleAnalysis).forEach(role => {
      role.average_activities = role.active_users > 0 ?
        parseFloat((role.total_activities / role.active_users).toFixed(2)) : 0;
    });

    return Object.values(roleAnalysis);
  }

  /**
   * Generate productivity insights
   * @private
   */
  static generateProductivityInsights(users, dailyActivities) {
    const insights = [];

    const activeUsers = users.filter(u => u.total_activities > 0);
    if (activeUsers.length > 0) {
      const avgActivities = activeUsers.reduce((sum, u) => sum + u.total_activities, 0) / activeUsers.length;
      insights.push(`Average activities per active user: ${avgActivities.toFixed(1)}`);
    }

    if (dailyActivities.length > 0) {
      const peakDay = dailyActivities.reduce((peak, day) =>
        day.total_activities > peak.total_activities ? day : peak);
      insights.push(`Peak activity day was ${peakDay.date} with ${peakDay.total_activities} activities`);
    }

    return insights;
  }

  /**
   * Estimate stockout days
   * @private
   */
  static estimateStockoutDays(product) {
    // Simple estimation based on current quantity and reorder level
    // In a real system, this would use historical consumption data
    if (product.quantity === 0) return 0;

    const dailyConsumption = (product.reorder_level * 0.1) || 1; // Rough estimate
    return Math.floor(product.quantity / dailyConsumption);
  }

  /**
   * Generate stock predictions
   * @private
   */
  static async generateStockPredictions(days) {
    // Simplified prediction model
    // In production, this would use more sophisticated algorithms
    try {
      const products = await Product.getLowStockProducts();

      return {
        prediction_period: `${days} days`,
        methodology: 'Simple linear projection based on recent consumption patterns',
        predicted_stockouts: products.filter(p => p.quantity > 0).slice(0, 10).map(product => ({
          sku: product.sku,
          name: product.name,
          current_quantity: product.quantity,
          estimated_stockout_date: new Date(Date.now() + this.estimateStockoutDays(product) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          confidence: 'low' // Simple model has low confidence
        })),
        disclaimer: 'Predictions are estimates based on simplified models and should be used as guidelines only'
      };
    } catch (error) {
      return { error: 'Predictions unavailable' };
    }
  }

  /**
   * Generate stock action recommendations
   * @private
   */
  static generateStockActionRecommendations(urgencyItems, categoryBreakdown) {
    const recommendations = [];

    // Critical items recommendations
    const criticalItems = urgencyItems.filter(item => item.urgency_score >= 100);
    if (criticalItems.length > 0) {
      recommendations.push({
        priority: 'immediate',
        action: 'emergency_restock',
        message: `${criticalItems.length} products are completely out of stock`,
        items: criticalItems.slice(0, 5).map(item => item.sku)
      });
    }

    // High urgency recommendations
    const highUrgencyItems = urgencyItems.filter(item => item.urgency_score >= 70 && item.urgency_score < 100);
    if (highUrgencyItems.length > 0) {
      recommendations.push({
        priority: 'urgent',
        action: 'priority_restock',
        message: `${highUrgencyItems.length} products need urgent restocking`,
        items: highUrgencyItems.slice(0, 10).map(item => item.sku)
      });
    }

    // Category-specific recommendations
    const criticalCategories = categoryBreakdown.filter(cat => cat.critical_items > 0);
    if (criticalCategories.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'category_review',
        message: `${criticalCategories.length} categories have critical stock issues`,
        categories: criticalCategories.map(cat => cat.category)
      });
    }

    return recommendations;
  }
}

module.exports = ReportsService;