const express = require('express');
const Joi = require('joi');
const router = express.Router();

// Import controllers
const notificationController = require('../controllers/notificationController');

// Import middleware
const { authenticateToken, requireManager } = require('../middleware/auth');
const { validate, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Apply authentication to all notification routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications with filtering and pagination
 *     description: Retrieve system notifications with optional filtering by read status, type, or product
 *     tags: [Notifications]
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
 *         description: Number of notifications to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of notifications to skip
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Show only unread notifications
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [low_stock, out_of_stock, reorder_required]
 *         description: Filter by notification type
 *       - in: query
 *         name: productId
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Filter by product ID
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
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
 *                         $ref: '#/components/schemas/Notification'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/',
  validate(Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
    unreadOnly: Joi.boolean().default(false),
    type: Joi.string().valid('low_stock', 'out_of_stock', 'reorder_required').optional(),
    productId: Joi.number().integer().positive().optional()
  }), 'query'),
  asyncHandler(notificationController.getAllNotifications)
);

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create manual notification
 *     description: Create a custom notification for system alerts (Manager only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [product_id, message, type]
 *             properties:
 *               product_id:
 *                 type: integer
 *                 minimum: 1
 *                 description: ID of the related product
 *                 example: 1
 *               message:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *                 description: Notification message content
 *                 example: "Manual stock check required"
 *               type:
 *                 type: string
 *                 enum: [low_stock, out_of_stock, reorder_required]
 *                 description: Type of notification
 *                 example: "reorder_required"
 *     responses:
 *       201:
 *         description: Notification created successfully
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
 *                   example: "Notification created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/',
  requireManager,
  validate(Joi.object({
    product_id: Joi.number().integer().positive().required(),
    message: Joi.string().min(10).max(500).trim().required(),
    type: Joi.string().valid('low_stock', 'out_of_stock', 'reorder_required').required()
  })),
  asyncHandler(notificationController.createNotification)
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Private (Staff/Manager)
 * @query   { type? }
 */
router.get('/unread-count',
  validate(Joi.object({
    type: Joi.string().valid('low_stock', 'out_of_stock', 'reorder_required').optional()
  }), 'query'),
  asyncHandler(notificationController.getUnreadCount)
);

/**
 * @route   GET /api/notifications/recent
 * @desc    Get recent notifications
 * @access  Private (Staff/Manager)
 * @query   { limit?, unreadOnly? }
 */
router.get('/recent',
  validate(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    unreadOnly: Joi.boolean().default(false)
  }), 'query'),
  asyncHandler(notificationController.getRecentNotifications)
);

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private (Staff/Manager)
 */
router.get('/stats',
  asyncHandler(notificationController.getNotificationStats)
);

/**
 * @route   PUT /api/notifications/mark-multiple-read
 * @desc    Mark multiple notifications as read
 * @access  Private (Staff/Manager)
 * @body    { ids }
 */
router.put('/mark-multiple-read',
  validate(Joi.object({
    ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(100).required()
  })),
  asyncHandler(notificationController.markMultipleAsRead)
);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private (Staff/Manager)
 * @query   { type? }
 */
router.put('/mark-all-read',
  validate(Joi.object({
    type: Joi.string().valid('low_stock', 'out_of_stock', 'reorder_required').optional()
  }), 'query'),
  asyncHandler(notificationController.markAllAsRead)
);

/**
 * @route   DELETE /api/notifications/cleanup
 * @desc    Clean up old read notifications
 * @access  Manager only
 * @body    { daysOld? }
 */
router.delete('/cleanup',
  requireManager,
  validate(Joi.object({
    daysOld: Joi.number().integer().min(7).default(30)
  })),
  asyncHandler(notificationController.cleanupOldNotifications)
);

/**
 * @route   GET /api/notifications/product/:productId
 * @desc    Get notifications for specific product
 * @access  Private (Staff/Manager)
 * @params  { productId }
 * @query   { unreadOnly? }
 */
router.get('/product/:productId',
  validate(Joi.object({
    productId: Joi.number().integer().positive().required()
  }), 'params'),
  validate(Joi.object({
    unreadOnly: Joi.boolean().default(false)
  }), 'query'),
  asyncHandler(notificationController.getNotificationsByProduct)
);

/**
 * @route   GET /api/notifications/:id
 * @desc    Get specific notification by ID
 * @access  Private (Staff/Manager)
 * @params  { id }
 */
router.get('/:id',
  validate(Joi.object({
    id: Joi.number().integer().positive().required()
  }), 'params'),
  asyncHandler(notificationController.getNotificationById)
);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (Staff/Manager)
 * @params  { id }
 */
router.put('/:id/read',
  validate(Joi.object({
    id: Joi.number().integer().positive().required()
  }), 'params'),
  asyncHandler(notificationController.markAsRead)
);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete specific notification
 * @access  Manager only
 * @params  { id }
 */
router.delete('/:id',
  requireManager,
  validate(Joi.object({
    id: Joi.number().integer().positive().required()
  }), 'params'),
  asyncHandler(notificationController.deleteNotification)
);

/**
 * Route documentation endpoint
 * @route   GET /api/notifications/docs
 * @desc    List available notification endpoints
 * @access  Private
 */
router.get('/docs', (req, res) => {
  res.json({
    message: 'Notification System API Endpoints',
    version: '1.0.0',
    endpoints: {
      general: [
        'GET /api/notifications - List all notifications (with filtering)',
        'GET /api/notifications/:id - Get specific notification',
        'POST /api/notifications - Create manual notification (Manager only)'
      ],
      status_management: [
        'PUT /api/notifications/:id/read - Mark notification as read',
        'PUT /api/notifications/mark-multiple-read - Mark multiple as read',
        'PUT /api/notifications/mark-all-read - Mark all as read'
      ],
      information: [
        'GET /api/notifications/unread-count - Get unread count',
        'GET /api/notifications/recent - Get recent notifications',
        'GET /api/notifications/stats - Get notification statistics'
      ],
      product_specific: [
        'GET /api/notifications/product/:productId - Product notifications'
      ],
      management: [
        'DELETE /api/notifications/:id - Delete notification (Manager only)',
        'DELETE /api/notifications/cleanup - Clean up old notifications (Manager only)'
      ]
    },
    notification_types: [
      'low_stock - Product quantity is below reorder level',
      'out_of_stock - Product quantity is zero',
      'reorder_required - Manual reorder recommendation'
    ],
    filtering: {
      unreadOnly: 'Show only unread notifications',
      type: 'Filter by notification type',
      productId: 'Show notifications for specific product'
    },
    bulk_operations: {
      mark_multiple_read: 'Mark up to 100 notifications as read at once',
      mark_all_read: 'Mark all notifications (or filtered by type) as read',
      cleanup: 'Delete old read notifications (Manager only)'
    },
    permissions: {
      staff: 'Can view, mark as read notifications. Cannot create or delete.',
      manager: 'Full access including create, delete, and cleanup operations'
    },
    auto_generation: {
      low_stock: 'Automatically created when product quantity <= reorder level',
      out_of_stock: 'Automatically created when product quantity = 0',
      manual: 'Manually created by managers for special alerts'
    }
  });
});

module.exports = router;