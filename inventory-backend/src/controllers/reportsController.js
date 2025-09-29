const ReportsService = require('../services/reportsService');
const { ValidationError } = require('../middleware/errorHandler');

/**
 * Generate Inventory Valuation Report
 * GET /api/reports/inventory-valuation
 */
const getInventoryValuation = async (req, res, next) => {
  try {
    const {
      includeZeroValue = false,
      groupByCategory = true,
      format = 'json'
    } = req.query;

    const options = {
      includeZeroValue: includeZeroValue === 'true',
      groupByCategory: groupByCategory === 'true'
    };

    const report = await ReportsService.generateInventoryValuation(options);

    // Add performance metrics
    const performanceMetrics = {
      inventory_turnover_indicator: report.summary.total_inventory_value > 0 ?
        (report.summary.low_stock_value / report.summary.total_inventory_value) * 100 : 0,
      stock_health_score: report.summary.total_products > 0 ?
        ((report.summary.total_products - report.summary.out_of_stock_items) / report.summary.total_products) * 100 : 0
    };

    res.status(200).json({
      success: true,
      message: 'Inventory valuation report generated successfully',
      data: {
        ...report,
        performance_metrics: {
          ...performanceMetrics,
          inventory_turnover_indicator: parseFloat(performanceMetrics.inventory_turnover_indicator.toFixed(2)),
          stock_health_score: parseFloat(performanceMetrics.stock_health_score.toFixed(1))
        },
        export_options: {
          csv_export: '/api/bulk/export/summary',
          detailed_export: '/api/bulk/export/products?includeAuditData=true'
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Generate Sales Performance Report
 * GET /api/reports/sales-performance
 */
const getSalesPerformance = async (req, res, next) => {
  try {
    const {
      dateFrom,
      dateTo,
      includeProductDetails = true,
      limit = 20
    } = req.query;

    const options = {
      dateFrom,
      dateTo,
      includeProductDetails: includeProductDetails === 'true'
    };

    const report = await ReportsService.generateSalesReport(options);

    // Add additional analytics
    const analytics = {
      sales_velocity: report.summary.total_sales_transactions > 0 ?
        report.summary.total_quantity_sold / report.summary.total_sales_transactions : 0,
      product_diversity: report.summary.unique_products_sold,
      user_engagement: report.summary.unique_users_involved,
      peak_performance: report.summary.peak_sales_day
    };

    res.status(200).json({
      success: true,
      message: 'Sales performance report generated successfully',
      data: {
        ...report,
        analytics: {
          ...analytics,
          sales_velocity: parseFloat(analytics.sales_velocity.toFixed(2))
        },
        top_selling_products: report.top_selling_products.slice(0, parseInt(limit)),
        export_options: {
          sales_data_export: '/api/bulk/export/audit?operationType=sale',
          date_range: report.date_range
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Generate Stock Movement Report
 * GET /api/reports/stock-movement
 */
const getStockMovement = async (req, res, next) => {
  try {
    const {
      dateFrom,
      dateTo,
      operationType,
      includeDetails = true
    } = req.query;

    const options = {
      dateFrom,
      dateTo,
      operationType
    };

    const report = await ReportsService.generateStockMovementReport(options);

    // Calculate movement efficiency metrics
    const efficiency = {
      movement_frequency: report.daily_breakdown.length > 0 ?
        report.summary.total_movements / report.daily_breakdown.length : 0,
      stock_velocity: report.summary.total_stock_increase > 0 ?
        report.summary.total_stock_decrease / report.summary.total_stock_increase : 0,
      operational_diversity: report.summary.operation_types_used
    };

    res.status(200).json({
      success: true,
      message: 'Stock movement report generated successfully',
      data: {
        ...report,
        efficiency_metrics: {
          ...efficiency,
          movement_frequency: parseFloat(efficiency.movement_frequency.toFixed(2)),
          stock_velocity: parseFloat(efficiency.stock_velocity.toFixed(2))
        },
        detailed_view: includeDetails === 'true',
        export_options: {
          movement_data_export: '/api/bulk/export/audit',
          filtered_export: operationType ?
            `/api/bulk/export/audit?operationType=${operationType}` : null
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Generate User Activity Report
 * GET /api/reports/user-activity
 */
const getUserActivity = async (req, res, next) => {
  try {
    const {
      dateFrom,
      dateTo,
      includeDetails = true,
      roleFilter
    } = req.query;

    const options = {
      dateFrom,
      dateTo,
      includeDetails: includeDetails === 'true'
    };

    const report = await ReportsService.generateUserActivityReport(options);

    // Filter by role if specified
    let filteredUserRankings = report.user_rankings;
    if (roleFilter) {
      filteredUserRankings = report.user_rankings.filter(user =>
        user.role.toLowerCase() === roleFilter.toLowerCase()
      );
    }

    // Calculate productivity metrics
    const productivity = {
      activity_concentration: report.summary.active_users > 0 ?
        (report.summary.total_activities / report.summary.active_users) : 0,
      user_engagement_rate: report.summary.total_users > 0 ?
        (report.summary.active_users / report.summary.total_users) * 100 : 0,
      consistency_score: calculateConsistencyScore(report.daily_activity_breakdown)
    };

    res.status(200).json({
      success: true,
      message: 'User activity report generated successfully',
      data: {
        ...report,
        user_rankings: filteredUserRankings.slice(0, 20),
        productivity_metrics: {
          ...productivity,
          activity_concentration: parseFloat(productivity.activity_concentration.toFixed(2)),
          user_engagement_rate: parseFloat(productivity.user_engagement_rate.toFixed(1)),
          consistency_score: parseFloat(productivity.consistency_score.toFixed(1))
        },
        filters_applied: {
          role_filter: roleFilter || 'all',
          date_range: report.date_range
        },
        export_options: {
          user_data_export: '/api/bulk/export/audit',
          activity_summary: '/api/audit/most-active-users'
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Generate Low Stock Alert Report
 * GET /api/reports/low-stock-alerts
 */
const getLowStockAlerts = async (req, res, next) => {
  try {
    const {
      includePredictions = true,
      daysToPredict = 30,
      urgencyThreshold = 70,
      categoryFilter
    } = req.query;

    const options = {
      includePredictions: includePredictions === 'true',
      daysToPredict: parseInt(daysToPredict)
    };

    const report = await ReportsService.generateLowStockAlertReport(options);

    // Filter by category if specified
    let filteredUrgencyRanking = report.urgency_ranking;
    if (categoryFilter) {
      filteredUrgencyRanking = report.urgency_ranking.filter(item =>
        item.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Filter by urgency threshold
    const urgentItems = filteredUrgencyRanking.filter(item =>
      item.urgency_score >= parseFloat(urgencyThreshold)
    );

    // Calculate financial impact
    const financialImpact = {
      immediate_restock_cost: urgentItems.reduce((sum, item) =>
        sum + (item.recommended_order_quantity * item.price), 0),
      potential_lost_sales: report.urgency_ranking
        .filter(item => item.quantity === 0)
        .reduce((sum, item) => sum + (item.price * item.reorder_level * 0.5), 0), // Rough estimate
      inventory_risk_value: report.summary.total_estimated_shortage_value
    };

    res.status(200).json({
      success: true,
      message: 'Low stock alert report generated successfully',
      data: {
        ...report,
        urgent_items: urgentItems,
        financial_impact: {
          ...financialImpact,
          immediate_restock_cost: parseFloat(financialImpact.immediate_restock_cost.toFixed(2)),
          potential_lost_sales: parseFloat(financialImpact.potential_lost_sales.toFixed(2)),
          inventory_risk_value: parseFloat(financialImpact.inventory_risk_value.toFixed(2))
        },
        filters_applied: {
          category_filter: categoryFilter || 'all',
          urgency_threshold: parseFloat(urgencyThreshold),
          includes_predictions: includePredictions === 'true'
        },
        urgent_actions_required: urgentItems.length,
        export_options: {
          low_stock_export: '/api/bulk/export/low-stock',
          detailed_export: '/api/bulk/export/products?lowStockOnly=true'
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Generate Executive Dashboard Summary
 * GET /api/reports/executive-summary
 */
const getExecutiveSummary = async (req, res, next) => {
  try {
    const {
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo = new Date().toISOString().split('T')[0]
    } = req.query;

    // Generate multiple reports concurrently
    const [
      inventoryReport,
      salesReport,
      stockMovementReport,
      userActivityReport,
      lowStockReport
    ] = await Promise.all([
      ReportsService.generateInventoryValuation({ includeZeroValue: false }),
      ReportsService.generateSalesReport({ dateFrom, dateTo }),
      ReportsService.generateStockMovementReport({ dateFrom, dateTo }),
      ReportsService.generateUserActivityReport({ dateFrom, dateTo }),
      ReportsService.generateLowStockAlertReport({ includePredictions: false })
    ]);

    // Create executive summary
    const executiveSummary = {
      report_period: { from: dateFrom, to: dateTo },
      generated_at: new Date().toISOString(),
      key_metrics: {
        inventory: {
          total_value: inventoryReport.summary.total_inventory_value,
          total_products: inventoryReport.summary.total_products,
          stock_health_score: inventoryReport.summary.total_products > 0 ?
            ((inventoryReport.summary.total_products - inventoryReport.summary.out_of_stock_items) / inventoryReport.summary.total_products) * 100 : 0
        },
        sales: {
          total_quantity_sold: salesReport.summary.total_quantity_sold,
          total_transactions: salesReport.summary.total_sales_transactions,
          unique_products_sold: salesReport.summary.unique_products_sold,
          average_daily_sales: salesReport.summary.average_daily_sales
        },
        operations: {
          total_stock_movements: stockMovementReport.summary.total_movements,
          net_stock_change: stockMovementReport.summary.net_stock_change,
          active_users: userActivityReport.summary.active_users,
          total_user_activities: userActivityReport.summary.total_activities
        },
        alerts: {
          critical_stock_items: lowStockReport.summary.critical_items,
          warning_stock_items: lowStockReport.summary.warning_items,
          categories_affected: lowStockReport.summary.categories_affected,
          estimated_shortage_value: lowStockReport.summary.total_estimated_shortage_value
        }
      },
      performance_indicators: {
        inventory_turnover: salesReport.summary.total_quantity_sold > 0 ?
          inventoryReport.summary.total_quantity / salesReport.summary.total_quantity_sold : 0,
        stock_efficiency: stockMovementReport.summary.total_stock_increase > 0 ?
          (stockMovementReport.summary.net_stock_change / stockMovementReport.summary.total_stock_increase) * 100 : 0,
        operational_efficiency: userActivityReport.summary.active_users > 0 ?
          stockMovementReport.summary.total_movements / userActivityReport.summary.active_users : 0,
        alert_severity: lowStockReport.summary.total_low_stock_items > 0 ?
          (lowStockReport.summary.critical_items / lowStockReport.summary.total_low_stock_items) * 100 : 0
      },
      top_insights: [
        {
          category: 'inventory',
          insight: `Inventory valued at $${inventoryReport.summary.total_inventory_value.toLocaleString()}`,
          impact: inventoryReport.summary.out_of_stock_items > 0 ? 'negative' : 'positive'
        },
        {
          category: 'sales',
          insight: `${salesReport.summary.total_quantity_sold} units sold across ${salesReport.summary.unique_products_sold} products`,
          impact: salesReport.trends?.trend_direction === 'increasing' ? 'positive' : 'neutral'
        },
        {
          category: 'operations',
          insight: `${stockMovementReport.summary.total_movements} stock movements by ${userActivityReport.summary.active_users} active users`,
          impact: userActivityReport.summary.active_users >= userActivityReport.summary.total_users * 0.7 ? 'positive' : 'neutral'
        },
        {
          category: 'alerts',
          insight: `${lowStockReport.summary.critical_items} critical stock items requiring immediate attention`,
          impact: lowStockReport.summary.critical_items > 0 ? 'negative' : 'positive'
        }
      ],
      priority_actions: [
        ...(lowStockReport.summary.critical_items > 0 ? [{
          priority: 'immediate',
          action: 'Address critical stock shortages',
          description: `${lowStockReport.summary.critical_items} products are out of stock`,
          estimated_impact: 'high'
        }] : []),
        ...(lowStockReport.summary.warning_items > 5 ? [{
          priority: 'urgent',
          action: 'Plan restocking for low inventory',
          description: `${lowStockReport.summary.warning_items} products need restocking`,
          estimated_impact: 'medium'
        }] : []),
        ...(salesReport.trends?.trend_direction === 'decreasing' ? [{
          priority: 'high',
          action: 'Investigate declining sales trend',
          description: 'Sales performance showing downward trend',
          estimated_impact: 'medium'
        }] : [])
      ]
    };

    // Add calculated metrics
    Object.keys(executiveSummary.performance_indicators).forEach(key => {
      const value = executiveSummary.performance_indicators[key];
      executiveSummary.performance_indicators[key] = parseFloat(value.toFixed(2));
    });

    executiveSummary.key_metrics.inventory.stock_health_score =
      parseFloat(executiveSummary.key_metrics.inventory.stock_health_score.toFixed(1));

    res.status(200).json({
      success: true,
      message: 'Executive summary report generated successfully',
      data: {
        executive_summary: executiveSummary,
        detailed_reports: {
          inventory_valuation: `/api/reports/inventory-valuation`,
          sales_performance: `/api/reports/sales-performance?dateFrom=${dateFrom}&dateTo=${dateTo}`,
          stock_movement: `/api/reports/stock-movement?dateFrom=${dateFrom}&dateTo=${dateTo}`,
          user_activity: `/api/reports/user-activity?dateFrom=${dateFrom}&dateTo=${dateTo}`,
          low_stock_alerts: `/api/reports/low-stock-alerts`
        },
        export_options: {
          comprehensive_export: '/api/bulk/export/summary',
          custom_date_range: true
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Available Reports List
 * GET /api/reports
 */
const getAvailableReports = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Available reports retrieved successfully',
      data: {
        available_reports: [
          {
            name: 'Inventory Valuation',
            endpoint: '/api/reports/inventory-valuation',
            description: 'Complete inventory valuation with category breakdown',
            parameters: ['includeZeroValue', 'groupByCategory'],
            access_level: 'manager'
          },
          {
            name: 'Sales Performance',
            endpoint: '/api/reports/sales-performance',
            description: 'Sales analysis with trends and product rankings',
            parameters: ['dateFrom', 'dateTo', 'includeProductDetails'],
            access_level: 'manager'
          },
          {
            name: 'Stock Movement',
            endpoint: '/api/reports/stock-movement',
            description: 'Stock movement analysis by operation type',
            parameters: ['dateFrom', 'dateTo', 'operationType'],
            access_level: 'manager'
          },
          {
            name: 'User Activity',
            endpoint: '/api/reports/user-activity',
            description: 'User activity and productivity analysis',
            parameters: ['dateFrom', 'dateTo', 'roleFilter'],
            access_level: 'manager'
          },
          {
            name: 'Low Stock Alerts',
            endpoint: '/api/reports/low-stock-alerts',
            description: 'Critical stock alerts with urgency ranking',
            parameters: ['includePredictions', 'urgencyThreshold', 'categoryFilter'],
            access_level: 'manager'
          },
          {
            name: 'Executive Summary',
            endpoint: '/api/reports/executive-summary',
            description: 'Comprehensive executive dashboard summary',
            parameters: ['dateFrom', 'dateTo'],
            access_level: 'manager'
          }
        ],
        report_features: {
          real_time_data: 'All reports use current database state',
          historical_analysis: 'Date range filtering for trend analysis',
          export_integration: 'Direct links to CSV export functionality',
          customizable_filters: 'Multiple filtering options per report',
          performance_metrics: 'KPI calculations and insights'
        },
        usage_guidelines: {
          date_formats: 'Use YYYY-MM-DD format for date parameters',
          performance: 'Large date ranges may take longer to process',
          caching: 'Reports are generated fresh on each request',
          access_control: 'Manager role required for all reporting endpoints'
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Calculate consistency score for user activity
 * @private
 */
function calculateConsistencyScore(dailyActivities) {
  if (dailyActivities.length < 2) return 100;

  const activities = dailyActivities.map(day => day.total_activities);
  const mean = activities.reduce((sum, val) => sum + val, 0) / activities.length;
  const variance = activities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / activities.length;
  const stdDev = Math.sqrt(variance);

  // Lower standard deviation relative to mean indicates higher consistency
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
  return Math.max(0, 100 - (coefficientOfVariation * 100));
}

module.exports = {
  getInventoryValuation,
  getSalesPerformance,
  getStockMovement,
  getUserActivity,
  getLowStockAlerts,
  getExecutiveSummary,
  getAvailableReports
};