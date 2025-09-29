const express = require('express');
const Joi = require('joi');
const router = express.Router();

// Import controllers
const bulkController = require('../controllers/bulkController');

// Import middleware
const { authenticateToken, requireManager } = require('../middleware/auth');
const { validate, sanitizeInput } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Apply authentication to all bulk operation routes
router.use(authenticateToken);

/**
 * @route   POST /api/bulk/upload
 * @desc    Upload CSV file for import preview
 * @access  Private (Staff/Manager)
 * @body    multipart/form-data with csvFile
 */
router.post('/upload',
  asyncHandler(bulkController.uploadCSV)
);

/**
 * @route   POST /api/bulk/import
 * @desc    Import products from uploaded CSV file
 * @access  Private (Staff/Manager)
 * @body    { filePath, updateExisting?, skipErrors?, validateOnly?, batchSize? }
 */
router.post('/import',
  validate(Joi.object({
    filePath: Joi.string().required(),
    updateExisting: Joi.boolean().default(false),
    skipErrors: Joi.boolean().default(true),
    validateOnly: Joi.boolean().default(false),
    batchSize: Joi.number().integer().min(10).max(500).default(100)
  })),
  asyncHandler(bulkController.importProducts)
);

/**
 * @route   GET /api/bulk/template
 * @desc    Download CSV import template file
 * @access  Private (Staff/Manager)
 */
router.get('/template',
  asyncHandler(bulkController.downloadTemplate)
);

/**
 * @route   GET /api/bulk/template/info
 * @desc    Get import template information and guidelines
 * @access  Private (Staff/Manager)
 */
router.get('/template/info',
  asyncHandler(bulkController.getTemplateInfo)
);

/**
 * @swagger
 * /api/bulk/export/products:
 *   post:
 *     summary: Export products to CSV file
 *     description: Generate and export product data in CSV format with filtering options
 *     tags: [File Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 description: Filter by product category
 *                 example: "Electronics"
 *               lowStockOnly:
 *                 type: boolean
 *                 default: false
 *                 description: Export only low stock products
 *               includeAuditData:
 *                 type: boolean
 *                 default: false
 *                 description: Include audit trail information
 *               format:
 *                 type: string
 *                 enum: [standard, minimal]
 *                 default: standard
 *                 description: Export format type
 *     responses:
 *       200:
 *         description: Excel export generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     download_url:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     record_count:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/export/products',
  validate(Joi.object({
    category: Joi.string().trim().optional(),
    lowStockOnly: Joi.boolean().default(false),
    includeAuditData: Joi.boolean().default(false),
    format: Joi.string().valid('standard', 'minimal').default('standard')
  })),
  asyncHandler(bulkController.exportProducts)
);

/**
 * @route   POST /api/bulk/export/audit
 * @desc    Export audit records to Excel file
 * @access  Private (Staff/Manager)
 * @body    { dateFrom?, dateTo?, operationType?, productId?, userId?, format? }
 */
router.post('/export/audit',
  validate(Joi.object({
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
    operationType: Joi.string().valid(
      'manual_adjustment', 'sale', 'purchase', 'damage', 'transfer', 'correction', 'bulk_import'
    ).optional(),
    productId: Joi.number().integer().positive().optional(),
    userId: Joi.number().integer().positive().optional(),
    format: Joi.string().valid('standard', 'detailed').default('detailed')
  })),
  asyncHandler(bulkController.exportAuditRecords)
);

/**
 * @route   POST /api/bulk/export/low-stock
 * @desc    Export low stock report to Excel
 * @access  Private (Staff/Manager)
 * @body    { includeOutOfStock? }
 */
router.post('/export/low-stock',
  validate(Joi.object({
    includeOutOfStock: Joi.boolean().default(true)
  })),
  asyncHandler(bulkController.exportLowStockReport)
);

/**
 * @route   POST /api/bulk/export/summary
 * @desc    Export inventory summary report to Excel
 * @access  Private (Staff/Manager)
 */
router.post('/export/summary',
  asyncHandler(bulkController.exportInventorySummary)
);

/**
 * @route   GET /api/bulk/download/:filename
 * @desc    Download exported CSV file
 * @access  Private (Staff/Manager)
 * @params  { filename }
 */
router.get('/download/:filename',
  validate(Joi.object({
    filename: Joi.string().pattern(/^[a-zA-Z0-9_.-]+\.csv$/).required()
  }), 'params'),
  asyncHandler(bulkController.downloadExport)
);

/**
 * @route   GET /api/bulk/stats
 * @desc    Get bulk operations statistics and file information
 * @access  Private (Staff/Manager)
 */
router.get('/stats',
  asyncHandler(bulkController.getBulkStats)
);

/**
 * @route   DELETE /api/bulk/cleanup
 * @desc    Clean up old export and temporary files
 * @access  Manager only
 * @body    { type? }
 */
router.delete('/cleanup',
  requireManager,
  validate(Joi.object({
    type: Joi.string().valid('exports', 'temp', 'all').default('all')
  })),
  asyncHandler(bulkController.cleanupFiles)
);

/**
 * Route documentation endpoint
 * @route   GET /api/bulk/docs
 * @desc    List available bulk operation endpoints
 * @access  Private
 */
router.get('/docs', (req, res) => {
  res.json({
    message: 'Bulk Operations API Endpoints',
    version: '1.0.0',
    endpoints: {
      import: [
        'POST /api/bulk/upload - Upload CSV file for import preview',
        'POST /api/bulk/import - Import products from CSV file',
        'GET /api/bulk/template - Download CSV import template',
        'GET /api/bulk/template/info - Get template information and guidelines'
      ],
      export: [
        'POST /api/bulk/export/products - Export products to CSV',
        'POST /api/bulk/export/audit - Export audit records to CSV',
        'POST /api/bulk/export/low-stock - Export low stock report',
        'POST /api/bulk/export/summary - Export inventory summary report'
      ],
      management: [
        'GET /api/bulk/download/:filename - Download exported file',
        'GET /api/bulk/stats - Get bulk operations statistics',
        'DELETE /api/bulk/cleanup - Clean up old files (Manager only)'
      ]
    },
    import_features: {
      validation: 'CSV format validation before import',
      preview: 'Preview import with validateOnly=true',
      batch_processing: 'Configurable batch size for large imports',
      error_handling: 'Skip errors or stop on first error',
      conflict_resolution: 'Update existing products or skip duplicates',
      audit_trail: 'Automatic audit logging for all changes'
    },
    export_features: {
      filtering: 'Export by category, stock level, date range',
      formats: 'Multiple export formats (standard, minimal, detailed)',
      audit_data: 'Include audit information in product exports',
      reports: 'Pre-built reports (low stock, inventory summary)',
      security: 'Files auto-expire after 24 hours',
      download: 'Secure file download with access control'
    },
    file_management: {
      upload_limits: {
        max_file_size: '10MB',
        max_records: '10,000 products per import',
        allowed_formats: ['CSV (.csv)'],
        encoding: 'UTF-8'
      },
      retention: {
        export_files: '24 hours',
        temp_files: '1 hour',
        automatic_cleanup: 'Available for managers'
      }
    },
    import_template: {
      required_fields: ['sku', 'name', 'category', 'price', 'quantity'],
      optional_fields: ['description', 'reorder_level', 'location', 'supplier'],
      data_validation: {
        sku: 'Must be unique, 3-20 characters, alphanumeric with hyphens/underscores',
        price: 'Must be positive decimal number',
        quantity: 'Must be non-negative integer',
        reorder_level: 'Must be non-negative integer (defaults to 10% of quantity)'
      }
    },
    best_practices: {
      import: [
        'Always backup your data before bulk import',
        'Use validateOnly=true first to check for errors',
        'Test with small batches before large imports',
        'Ensure SKUs are unique across your inventory',
        'Use CSV template with proper column headers'
      ],
      export: [
        'Use filters to export only necessary data',
        'Download files promptly as they expire in 24 hours',
        'Use appropriate export format for your needs',
        'Monitor file sizes for large exports'
      ]
    },
    error_handling: {
      validation_errors: 'Data format issues in CSV file',
      import_conflicts: 'Duplicate SKUs or existing products',
      file_errors: 'Upload issues or corrupted files',
      permission_errors: 'Insufficient access rights',
      system_errors: 'Database or server issues'
    },
    permissions: {
      staff: 'Can import/export products and view audit data',
      manager: 'Full access including file cleanup and all export types'
    }
  });
});

module.exports = router;