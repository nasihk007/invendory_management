const express = require('express');
const Joi = require('joi');
const router = express.Router();

// Import controllers
const reportsController = require('../controllers/reportsController');

// Import middleware
const { authenticateToken, requireManager, requireStaffOrManager } = require('../middleware/auth');
const { validate, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Apply authentication to all report routes
router.use(authenticateToken);

// Note: Role-based authorization is now applied per route instead of globally

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get list of available reports
 *     description: Retrieve all available inventory reports and analytics endpoints
 *     tags: [Reports & Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Available reports retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     available_reports:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           endpoint:
 *                             type: string
 *                           description:
 *                             type: string
 *                           access_level:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/',
  requireStaffOrManager, // Allow both staff and manager
  asyncHandler(reportsController.getAvailableReports)
);

/**
 * @route   GET /api/reports/inventory-valuation
 * @desc    Generate inventory valuation report
 * @access  Staff and Manager (basic inventory info needed for dashboard)
 * @query   { includeZeroValue?, groupByCategory?, format? }
 */
router.get('/inventory-valuation',
  requireStaffOrManager, // Allow both staff and manager for dashboard
  validate(Joi.object({
    includeZeroValue: Joi.boolean().default(false),
    groupByCategory: Joi.boolean().default(true),
    format: Joi.string().valid('json', 'summary').default('json')
  }), 'query'),
  asyncHandler(reportsController.getInventoryValuation)
);

/**
 * @route   GET /api/reports/sales-performance
 * @desc    Generate sales performance report
 * @access  Manager only (sensitive business data)
 * @query   { dateFrom?, dateTo?, includeProductDetails?, limit? }
 */
router.get('/sales-performance',
  requireManager, // Manager only - sensitive business metrics
  validate(Joi.object({
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
    includeProductDetails: Joi.boolean().default(true),
    limit: Joi.number().integer().min(5).max(100).default(20)
  }), 'query'),
  asyncHandler(reportsController.getSalesPerformance)
);

/**
 * @route   GET /api/reports/stock-movement
 * @desc    Generate stock movement report
 * @access  Manager only (detailed operational data)
 * @query   { dateFrom?, dateTo?, operationType?, includeDetails? }
 */
router.get('/stock-movement',
  requireManager, // Manager only - detailed operational analytics
  validate(Joi.object({
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
    operationType: Joi.string().valid(
      'manual_adjustment', 'sale', 'purchase', 'damage', 'transfer', 'correction', 'bulk_import'
    ).optional(),
    includeDetails: Joi.boolean().default(true)
  }), 'query'),
  asyncHandler(reportsController.getStockMovement)
);

/**
 * @route   GET /api/reports/user-activity
 * @desc    Generate user activity report
 * @access  Manager only (sensitive HR/management data)
 * @query   { dateFrom?, dateTo?, includeDetails?, roleFilter? }
 */
router.get('/user-activity',
  requireManager, // Manager only - sensitive user performance data
  validate(Joi.object({
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
    includeDetails: Joi.boolean().default(true),
    roleFilter: Joi.string().valid('staff', 'manager').optional()
  }), 'query'),
  asyncHandler(reportsController.getUserActivity)
);

/**
 * @route   GET /api/reports/low-stock-alerts
 * @desc    Generate low stock alert report
 * @access  Staff and Manager (essential for daily operations)
 * @query   { includePredictions?, daysToPredict?, urgencyThreshold?, categoryFilter? }
 */
router.get('/low-stock-alerts',
  requireStaffOrManager, // Allow both staff and manager - essential for operations
  validate(Joi.object({
    includePredictions: Joi.boolean().default(true),
    daysToPredict: Joi.number().integer().min(1).max(365).default(30),
    urgencyThreshold: Joi.number().min(0).max(100).default(70),
    categoryFilter: Joi.string().trim().optional()
  }), 'query'),
  asyncHandler(reportsController.getLowStockAlerts)
);

/**
 * @route   GET /api/reports/executive-summary
 * @desc    Generate executive dashboard summary
 * @access  Manager only (executive-level analytics)
 * @query   { dateFrom?, dateTo? }
 */
router.get('/executive-summary',
  requireManager, // Manager only - executive-level insights
  validate(Joi.object({
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional()
  }), 'query'),
  asyncHandler(reportsController.getExecutiveSummary)
);

/**
 * Route documentation endpoint
 * @route   GET /api/reports/docs
 * @desc    List available reporting endpoints and features
 * @access  Staff and Manager
 */
router.get('/docs', requireStaffOrManager, (req, res) => {
  res.json({
    message: 'Reporting System API Endpoints',
    version: '1.0.0',
    endpoints: {
      inventory: [
        'GET /api/reports/inventory-valuation - Complete inventory valuation with category breakdown'
      ],
      sales: [
        'GET /api/reports/sales-performance - Sales analysis with trends and product rankings'
      ],
      operations: [
        'GET /api/reports/stock-movement - Stock movement analysis by operation type',
        'GET /api/reports/user-activity - User activity and productivity analysis'
      ],
      alerts: [
        'GET /api/reports/low-stock-alerts - Critical stock alerts with urgency ranking'
      ],
      executive: [
        'GET /api/reports/executive-summary - Comprehensive executive dashboard summary'
      ],
      management: [
        'GET /api/reports - List all available reports'
      ]
    },
    report_features: {
      inventory_valuation: {
        description: 'Complete financial valuation of current inventory',
        key_metrics: ['total_value', 'category_breakdown', 'stock_health', 'low_stock_value'],
        filters: ['includeZeroValue', 'groupByCategory'],
        insights: ['inventory_turnover', 'stock_efficiency', 'reorder_recommendations']
      },
      sales_performance: {
        description: 'Comprehensive sales analysis with trending',
        key_metrics: ['quantity_sold', 'transaction_count', 'product_rankings', 'user_performance'],
        filters: ['dateFrom', 'dateTo', 'includeProductDetails', 'limit'],
        insights: ['sales_velocity', 'trend_analysis', 'top_performers']
      },
      stock_movement: {
        description: 'Detailed stock movement analysis by operation type',
        key_metrics: ['total_movements', 'net_changes', 'operation_breakdown', 'product_activity'],
        filters: ['dateFrom', 'dateTo', 'operationType', 'includeDetails'],
        insights: ['movement_patterns', 'efficiency_metrics', 'operational_insights']
      },
      user_activity: {
        description: 'User productivity and activity analysis',
        key_metrics: ['activity_counts', 'user_rankings', 'role_analysis', 'engagement_rates'],
        filters: ['dateFrom', 'dateTo', 'includeDetails', 'roleFilter'],
        insights: ['productivity_metrics', 'consistency_scores', 'engagement_analysis']
      },
      low_stock_alerts: {
        description: 'Critical stock alerts with urgency prioritization',
        key_metrics: ['urgency_rankings', 'category_breakdown', 'financial_impact', 'predictions'],
        filters: ['includePredictions', 'daysToPredict', 'urgencyThreshold', 'categoryFilter'],
        insights: ['action_recommendations', 'financial_impact', 'stockout_predictions']
      },
      executive_summary: {
        description: 'High-level executive dashboard with KPIs',
        key_metrics: ['inventory_kpis', 'sales_kpis', 'operational_kpis', 'alert_summary'],
        filters: ['dateFrom', 'dateTo'],
        insights: ['performance_indicators', 'priority_actions', 'business_insights']
      }
    },
    data_sources: {
      products: 'Current product inventory and pricing data',
      audit_trail: 'Historical stock movement and transaction records',
      notifications: 'Low stock alerts and system notifications',
      users: 'User activity and role information'
    },
    performance_metrics: {
      inventory_turnover: 'Ratio of sales to inventory levels',
      stock_efficiency: 'Net stock change relative to movements',
      sales_velocity: 'Average quantity per transaction',
      user_engagement: 'Active user participation rates',
      stock_health: 'Percentage of products with adequate stock',
      operational_efficiency: 'Stock movements per active user'
    },
    export_integration: {
      csv_exports: 'All reports link to relevant CSV export endpoints',
      bulk_operations: 'Integration with bulk export system',
      custom_filtering: 'Export data matching report filters'
    },
    business_insights: {
      predictive_analytics: 'Stock consumption predictions and trends',
      financial_analysis: 'Inventory valuation and cost analysis',
      operational_optimization: 'User productivity and workflow insights',
      risk_management: 'Stock shortage and business continuity alerts'
    },
    usage_guidelines: {
      date_ranges: 'Use YYYY-MM-DD format for date parameters',
      performance: 'Large date ranges may require additional processing time',
      filtering: 'Combine filters for targeted analysis',
      interpretation: 'Review insights and recommendations for actionable intelligence'
    },
    access_control: {
      authentication: 'Valid JWT token required',
      authorization: 'Role-based access: Staff can access basic reports (inventory-valuation, low-stock-alerts), Manager can access all reports',
      data_privacy: 'Reports respect user privacy and data protection policies'
    }
  });
});

module.exports = router;