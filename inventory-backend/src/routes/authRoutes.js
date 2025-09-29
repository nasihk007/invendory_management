const express = require('express');
const Joi = require('joi');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');

// Import middleware
const { authenticateToken, requireManager, optionalAuth } = require('../middleware/auth');
const { validate, sanitizeInput, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Apply rate limiting to auth routes - DISABLED
// router.use(authRateLimit());

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account. Staff users can self-register, but creating manager accounts requires manager privileges.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *           examples:
 *             staff_user:
 *               summary: Register a staff user
 *               value:
 *                 username: "john_doe"
 *                 email: "john.doe@example.com"
 *                 password: "SecurePass123"
 *                 role: "staff"
 *             manager_user:
 *               summary: Register a manager (requires manager auth)
 *               value:
 *                 username: "jane_manager"
 *                 email: "jane.manager@example.com"
 *                 password: "SecurePass123"
 *                 role: "manager"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       429:
 *         description: Too many registration attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register',
  optionalAuth, // Optional auth to check if manager is creating manager account
  validate(schemas.user.register),
  asyncHandler(authController.register)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and get JWT token
 *     description: Login with email and password to receive a JWT token for API access
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *           example:
 *             email: "john.doe@example.com"
 *             password: "SecurePass123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               user:
 *                 id: 1
 *                 username: "john_doe"
 *                 email: "john.doe@example.com"
 *                 role: "staff"
 *                 created_at: "2024-01-15T10:30:00Z"
 *                 updated_at: "2024-01-15T10:30:00Z"
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               expiresIn: "24h"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Unauthorized"
 *               details: "Invalid email or password"
 *               timestamp: "2024-01-15T10:30:00Z"
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login',
  validate(schemas.user.login),
  asyncHandler(authController.login)
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logout the current user (client-side token invalidation)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/logout',
  authenticateToken,
  asyncHandler(authController.logout)
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     description: Generate a new JWT token for authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/refresh',
  authenticateToken,
  asyncHandler(authController.refreshToken)
);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/profile',
  authenticateToken,
  asyncHandler(authController.getProfile)
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user profile
 * @access  Private
 * @body    { username?, email? }
 */
router.put('/profile',
  authenticateToken,
  validate(schemas.user.updateProfile),
  asyncHandler(authController.updateProfile)
);

/**
 * @swagger
 * /api/auth/password:
 *   put:
 *     summary: Change user password
 *     description: Change the current user's password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *                 example: "OldPassword123"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (min 8 chars, must contain letter and number)
 *                 example: "NewSecurePass456"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password changed successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Current password is incorrect or token invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/password',
  authenticateToken,
  validate(schemas.user.changePassword),
  asyncHandler(authController.changePassword)
);

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (with pagination and filtering)
 * @access  Manager only
 * @query   { limit?, offset?, role? }
 */
router.get('/users',
  authenticateToken,
  requireManager,
  validate(schemas.query.pagination, 'query'),
  asyncHandler(authController.getAllUsers)
);

/**
 * @swagger
 * /api/auth/staff:
 *   get:
 *     summary: Get all staff members (Manager only)
 *     description: Retrieve a list of all staff members with search, pagination and statistics
 *     tags: [User Management]
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
 *         description: Number of staff members to return per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of staff members to skip
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search by username or email
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [username, email, created_at]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Staff members retrieved successfully
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
 *                   example: "Staff members retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     staff_members:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           username:
 *                             type: string
 *                             example: "john_staff"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                           role:
 *                             type: string
 *                             example: "staff"
 *                           member_since:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00Z"
 *                           status:
 *                             type: string
 *                             example: "active"
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total_staff:
 *                           type: integer
 *                           example: 25
 *                         active_staff:
 *                           type: integer
 *                           example: 23
 *                         new_this_month:
 *                           type: integer
 *                           example: 3
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current_page:
 *                           type: integer
 *                           example: 1
 *                         per_page:
 *                           type: integer
 *                           example: 50
 *                         total_items:
 *                           type: integer
 *                           example: 25
 *                         total_pages:
 *                           type: integer
 *                           example: 1
 *                         has_next:
 *                           type: boolean
 *                           example: false
 *                         has_prev:
 *                           type: boolean
 *                           example: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Insufficient permissions - Manager role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/staff',
  authenticateToken,
  requireManager,
  validate(Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
    search: Joi.string().max(100).trim().optional(),
    sortBy: Joi.string().valid('username', 'email', 'created_at').default('created_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    active: Joi.boolean().optional()
  }), 'query'),
  asyncHandler(authController.getStaffMembers)
);

/**
 * @route   PUT /api/auth/users/:id/role
 * @desc    Update user role
 * @access  Manager only
 * @params  { id }
 * @body    { role }
 */
router.put('/users/:id/role',
  authenticateToken,
  requireManager,
  validate(schemas.param.id, 'params'),
  validate({
    role: schemas.user.register.extract('role').required()
  }),
  asyncHandler(authController.updateUserRole)
);

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Delete user account
 * @access  Manager only
 * @params  { id }
 */
router.delete('/users/:id',
  authenticateToken,
  requireManager,
  validate(schemas.param.id, 'params'),
  asyncHandler(authController.deleteUser)
);

/**
 * @route   GET /api/auth/stats
 * @desc    Get authentication statistics
 * @access  Manager only
 */
router.get('/stats',
  authenticateToken,
  requireManager,
  asyncHandler(authController.getAuthStats)
);

/**
 * @route   GET /api/auth/me
 * @desc    Alias for GET /profile (common API pattern)
 * @access  Private
 */
router.get('/me',
  authenticateToken,
  asyncHandler(authController.getProfile)
);

/**
 * Route documentation endpoint
 * @route   GET /api/auth/
 * @desc    List available authentication endpoints
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    message: 'Authentication API Endpoints',
    version: '1.0.0',
    endpoints: {
      public: [
        'POST /api/auth/register - Register new user',
        'POST /api/auth/login - User login',
        'GET /api/auth/ - This documentation'
      ],
      private: [
        'GET /api/auth/profile - Get user profile',
        'GET /api/auth/me - Get user profile (alias)',
        'PUT /api/auth/profile - Update profile',
        'PUT /api/auth/password - Change password',
        'POST /api/auth/refresh - Refresh token',
        'POST /api/auth/logout - Logout'
      ],
      manager_only: [
        'GET /api/auth/users - List all users',
        'GET /api/auth/staff - List all staff members with search and statistics',
        'PUT /api/auth/users/:id/role - Update user role',
        'DELETE /api/auth/users/:id - Delete user',
        'GET /api/auth/stats - Authentication statistics'
      ]
    },
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>',
      expiration: '24 hours'
    },
    rate_limits: {
      auth_endpoints: 'DISABLED - No rate limiting applied',
      note: 'Authentication rate limiting has been disabled'
    }
  });
});

module.exports = router;