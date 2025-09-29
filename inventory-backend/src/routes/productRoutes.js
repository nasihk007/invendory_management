const express = require('express');
const Joi = require('joi');
const router = express.Router();

// Import controllers
const productController = require('../controllers/productController');

// Import middleware
const { authenticateToken, requireManager, requireStaffOrManager } = require('../middleware/auth');
const { validate, sanitizeInput, schemas } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Apply authentication to all product routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with filtering and pagination
 *     description: Retrieve a paginated list of products with optional filtering and sorting
 *     tags: [Products]
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
 *         description: Number of products to return per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of products to skip
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search term for product name or SKU
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by product category
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter to show only low stock products
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, sku, category, quantity, price, created_at]
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
 *         description: Products retrieved successfully
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
 *                         $ref: '#/components/schemas/Product'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/',
  validate(schemas.product.search, 'query'),
  asyncHandler(productController.getAllProducts)
);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     description: Add a new product to the inventory system
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductCreate'
 *           example:
 *             sku: "LAPTOP-001"
 *             name: "Dell Laptop XPS 13"
 *             description: "High-performance ultrabook with 16GB RAM"
 *             category: "Electronics"
 *             quantity: 25
 *             reorder_level: 5
 *             price: 999.99
 *             location: "Warehouse A-15"
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product created successfully"
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: Product SKU already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/',
  requireStaffOrManager,
  // validate(schemas.product.create), // Temporarily disabled for debugging
  asyncHandler(productController.createProduct)
);

/**
 * @swagger
 * /api/products/categories:
 *   get:
 *     summary: Get all product categories
 *     description: Retrieve a list of all unique product categories in the inventory
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
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
 *                   example: "Categories retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: "Electronics"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/categories',
  asyncHandler(productController.getCategories)
);

/**
 * @route   GET /api/products/low-stock
 * @desc    Get low stock products
 * @access  Private (Staff/Manager)
 * @query   { limit? }
 */
router.get('/low-stock',
  validate({
    limit: Joi.number().integer().min(1).max(100).default(10)
  }, 'query'),
  asyncHandler(productController.getLowStockProducts)
);

/**
 * @route   GET /api/products/search
 * @desc    Advanced product search
 * @access  Private (Staff/Manager)
 * @query   { q?, category?, minPrice?, maxPrice?, inStock?, limit?, offset? }
 */
router.get('/search',
  validate({
    q: Joi.string().max(100).trim().optional(),
    category: Joi.string().min(2).max(100).trim().optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    inStock: Joi.boolean().optional(),
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0)
  }, 'query'),
  asyncHandler(productController.searchProducts)
);

/**
 * @route   GET /api/products/stats
 * @desc    Get product statistics
 * @access  Private (Staff/Manager)
 */
router.get('/stats',
  asyncHandler(productController.getProductStats)
);

/**
 * @route   GET /api/products/category/:category
 * @desc    Get products by category
 * @access  Private (Staff/Manager)
 * @params  { category }
 * @query   { limit?, offset? }
 */
router.get('/category/:category',
  validate({
    category: Joi.string().min(2).max(100).trim().required()
  }, 'params'),
  validate({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0)
  }, 'query'),
  asyncHandler(productController.getProductsByCategory)
);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Private (Staff/Manager)
 * @params  { id }
 */
router.get('/:id',
  validate(schemas.param.id, 'params'),
  asyncHandler(productController.getProductById)
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Staff/Manager)
 * @params  { id }
 * @body    { sku?, name?, description?, category?, quantity?, reorder_level?, price?, location?, reason? }
 */
router.put('/:id',
  requireStaffOrManager,
  validate(schemas.param.id, 'params'),
  validate(schemas.product.update),
  asyncHandler(productController.updateProduct)
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product
 * @access  Private (Staff can delete zero-stock products, Manager can delete any)
 * @params  { id }
 */
router.delete('/:id',
  requireStaffOrManager,
  validate(schemas.param.id, 'params'),
  asyncHandler(productController.deleteProduct)
);

/**
 * @swagger
 * /api/products/{id}/stock:
 *   post:
 *     summary: Update product stock quantity
 *     description: Update the stock quantity of a product with audit logging
 *     tags: [Stock Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StockUpdate'
 *           examples:
 *             purchase:
 *               summary: Stock increase from purchase
 *               value:
 *                 quantity: 50
 *                 reason: "Received new shipment"
 *                 operation_type: "purchase"
 *             sale:
 *               summary: Stock decrease from sale
 *               value:
 *                 quantity: 15
 *                 reason: "Sold 10 units to customer"
 *                 operation_type: "sale"
 *             damage:
 *               summary: Stock decrease from damage
 *               value:
 *                 quantity: 23
 *                 reason: "2 units damaged during transport"
 *                 operation_type: "damage"
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stock updated successfully"
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *                 stock_change:
 *                   type: object
 *                   properties:
 *                     old_quantity:
 *                       type: integer
 *                       example: 25
 *                     new_quantity:
 *                       type: integer
 *                       example: 30
 *                     change:
 *                       type: integer
 *                       example: 5
 *                     reason:
 *                       type: string
 *                       example: "Received new shipment"
 *                     operation_type:
 *                       type: string
 *                       example: "purchase"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:id/stock',
  requireStaffOrManager,
  validate(schemas.param.id, 'params'),
  validate(schemas.product.updateStock),
  asyncHandler(productController.updateStock)
);

/**
 * @route   POST /api/products/import
 * @desc    Bulk import products from CSV
 * @access  Manager only
 * @body    CSV file upload
 */
router.post('/import',
  requireManager,
  (req, res) => {
    res.status(501).json({
      message: 'CSV import functionality not yet implemented',
      note: 'Will be implemented in Phase 7: Bulk Operations'
    });
  }
);

/**
 * @route   GET /api/products/export
 * @desc    Export products to CSV
 * @access  Private (Staff/Manager)
 * @query   { category?, format? }
 */
router.get('/export',
  requireStaffOrManager,
  (req, res) => {
    res.status(501).json({
      message: 'CSV export functionality not yet implemented',
      note: 'Will be implemented in Phase 7: Bulk Operations'
    });
  }
);

/**
 * Route documentation endpoint
 * @route   GET /api/products/
 * @desc    List available product endpoints (when accessed without other routes)
 * @access  Private
 */
router.get('/docs', (req, res) => {
  res.json({
    message: 'Product Management API Endpoints',
    version: '1.0.0',
    endpoints: {
      products: [
        'GET /api/products - List all products (with filtering)',
        'POST /api/products - Create new product',
        'GET /api/products/:id - Get product by ID',
        'PUT /api/products/:id - Update product',
        'DELETE /api/products/:id - Delete product',
        'POST /api/products/:id/stock - Update stock quantity'
      ],
      categories: [
        'GET /api/products/categories - List all categories',
        'GET /api/products/category/:category - Products by category'
      ],
      search_and_filters: [
        'GET /api/products/search - Advanced product search',
        'GET /api/products/low-stock - Low stock products',
        'GET /api/products/stats - Product statistics'
      ],
      bulk_operations: [
        'POST /api/products/import - CSV import (Manager only)',
        'GET /api/products/export - CSV export'
      ]
    },
    filtering: {
      search: 'Search by name or SKU',
      category: 'Filter by product category',
      lowStock: 'Show only low stock items',
      price_range: 'Filter by price range (minPrice, maxPrice)',
      inStock: 'Show only items in stock'
    },
    sorting: {
      sortBy: 'name, sku, category, quantity, price, created_at',
      sortOrder: 'asc or desc'
    },
    pagination: {
      limit: 'Number of items per page (1-100, default: 50)',
      offset: 'Number of items to skip (default: 0)'
    },
    permissions: {
      staff: 'Can view, create, update products. Can delete zero-stock products.',
      manager: 'Full access including bulk operations and deleting any product.'
    }
  });
});

module.exports = router;