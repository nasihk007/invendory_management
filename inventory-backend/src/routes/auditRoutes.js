const express = require('express');
const Joi = require('joi');
const router = express.Router();

// Import controllers
const auditController = require('../controllers/auditController');

// Import middleware
const { authenticateToken, requireManager } = require('../middleware/auth');
const { validate, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Apply authentication to all audit routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Get all audit records with filtering and pagination
 *     description: Retrieve inventory audit trail records with advanced filtering options
 *     tags: [Audit Trail]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of audit records to return per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of audit records to skip
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Filter by specific product ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Filter by specific user ID
 *       - in: query
 *         name: operationType
 *         schema:
 *           type: string
 *           enum: [manual_adjustment, sale, purchase, damage, transfer, correction]
 *         description: Filter by operation type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter from this date (ISO format)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter to this date (ISO format)
 *     responses:
 *       200:
 *         description: Audit records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InventoryAudit'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/',
  validate(Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
    productId: Joi.number().integer().positive().optional(),
    userId: Joi.number().integer().positive().optional(),
    operationType: Joi.string().valid(
      'manual_adjustment', 'sale', 'purchase', 'damage', 'transfer', 'correction'
    ).optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional()
  }), 'query'),
  asyncHandler(auditController.getAllAuditRecords)
);

/**
 * @swagger
 * /api/audit/{id}:
 *   get:
 *     summary: Get specific audit record by ID
 *     description: Retrieve detailed information about a specific audit record
 *     tags: [Audit Trail]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Audit record ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Audit record retrieved successfully
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
 *                   example: "Audit record retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/InventoryAudit'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id',
  validate(Joi.object({
    id: Joi.number().integer().positive().required()
  }), 'params'),
  asyncHandler(auditController.getAuditById)
);

/**
 * @route   GET /api/audit/product/:productId
 * @desc    Get audit history for specific product
 * @access  Private (Staff/Manager)
 * @params  { productId }
 * @query   { limit? }
 */
router.get('/product/:productId',
  validate(Joi.object({
    productId: Joi.number().integer().positive().required()
  }), 'params'),
  validate(Joi.object({
    limit: Joi.number().integer().min(1).max(500).default(100)
  }), 'query'),
  asyncHandler(auditController.getProductAuditHistory)
);

/**
 * @route   GET /api/audit/user/:userId
 * @desc    Get audit history for specific user
 * @access  Private (Staff can view own, Manager can view all)
 * @params  { userId }
 * @query   { limit? }
 */
router.get('/user/:userId',
  validate(Joi.object({
    userId: Joi.number().integer().positive().required()
  }), 'params'),
  validate(Joi.object({
    limit: Joi.number().integer().min(1).max(500).default(100)
  }), 'query'),
  asyncHandler(auditController.getUserAuditHistory)
);

/**
 * @route   GET /api/audit/date-range
 * @desc    Get audit records by date range
 * @access  Private (Staff/Manager)
 * @query   { dateFrom, dateTo, limit? }
 */
router.get('/date-range',
  validate(Joi.object({
    dateFrom: Joi.date().iso().required(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).required(),
    limit: Joi.number().integer().min(1).max(1000).default(500)
  }), 'query'),
  asyncHandler(auditController.getAuditByDateRange)
);

/**
 * @route   GET /api/audit/daily-summary
 * @desc    Get daily audit summary
 * @access  Private (Staff/Manager)
 * @query   { days? }
 */
router.get('/daily-summary',
  validate(Joi.object({
    days: Joi.number().integer().min(1).max(365).default(7)
  }), 'query'),
  asyncHandler(auditController.getDailySummary)
);

/**
 * @route   GET /api/audit/stats-by-operation
 * @desc    Get audit statistics by operation type
 * @access  Private (Staff/Manager)
 * @query   { days? }
 */
router.get('/stats-by-operation',
  validate(Joi.object({
    days: Joi.number().integer().min(1).max(365).optional()
  }), 'query'),
  asyncHandler(auditController.getStatsByOperationType)
);

/**
 * @route   GET /api/audit/most-active-users
 * @desc    Get most active users by audit count
 * @access  Private (Staff/Manager)
 * @query   { limit?, days? }
 */
router.get('/most-active-users',
  validate(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    days: Joi.number().integer().min(1).max(365).optional()
  }), 'query'),
  asyncHandler(auditController.getMostActiveUsers)
);

/**
 * @route   GET /api/audit/most-changed-products
 * @desc    Get products with most changes
 * @access  Private (Staff/Manager)
 * @query   { limit?, days? }
 */
router.get('/most-changed-products',
  validate(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    days: Joi.number().integer().min(1).max(365).optional()
  }), 'query'),
  asyncHandler(auditController.getMostChangedProducts)
);

/**
 * @route   GET /api/audit/report
 * @desc    Get comprehensive audit report
 * @access  Private (Staff/Manager)
 * @query   { dateFrom?, dateTo?, includeDetails? }
 */
router.get('/report',
  validate(Joi.object({
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
    includeDetails: Joi.boolean().default(false)
  }), 'query'),
  asyncHandler(auditController.getAuditReport)
);

/**
 * @route   DELETE /api/audit/cleanup
 * @desc    Delete old audit records
 * @access  Manager only
 * @body    { daysOld? }
 */
router.delete('/cleanup',
  requireManager,
  validate(Joi.object({
    daysOld: Joi.number().integer().min(90).default(365)
  })),
  asyncHandler(auditController.cleanupOldRecords)
);

/**
 * Route documentation endpoint
 * @route   GET /api/audit/docs
 * @desc    List available audit endpoints
 * @access  Private
 */
router.get('/docs', (req, res) => {
  res.json({
    message: 'Audit System API Endpoints',
    version: '1.0.0',
    endpoints: {
      general: [
        'GET /api/audit - List all audit records (with filtering)',
        'GET /api/audit/:id - Get specific audit record',
        'GET /api/audit/date-range - Get records by date range'
      ],
      product_specific: [
        'GET /api/audit/product/:productId - Product audit history',
        'GET /api/audit/most-changed-products - Products with most changes'
      ],
      user_specific: [
        'GET /api/audit/user/:userId - User audit history',
        'GET /api/audit/most-active-users - Most active users'
      ],
      analytics: [
        'GET /api/audit/daily-summary - Daily audit summary',
        'GET /api/audit/stats-by-operation - Statistics by operation type',
        'GET /api/audit/report - Comprehensive audit report'
      ],
      management: [
        'DELETE /api/audit/cleanup - Clean up old records (Manager only)'
      ]
    },
    filtering: {
      date_range: 'Filter by dateFrom and dateTo (YYYY-MM-DD format)',
      operation_type: 'manual_adjustment, sale, purchase, damage, transfer, correction',
      user_and_product: 'Filter by specific user or product ID'
    },
    operation_types: [
      'manual_adjustment - Manual stock adjustments',
      'sale - Stock reduction due to sales',
      'purchase - Stock increase from purchases',
      'damage - Stock reduction due to damage',
      'transfer - Stock transfers between locations',
      'correction - Inventory corrections'
    ],
    permissions: {
      staff: 'Can view all audit records and own user history',
      manager: 'Full access including cleanup operations and all user histories'
    }
  });
});

module.exports = router;