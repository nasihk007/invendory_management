const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CSVImportService = require('../services/csvImportService');
const CSVExportService = require('../services/csvExportService');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

// Configure multer for CSV file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'text/csv',
      'application/csv',
      'text/comma-separated-values'
    ];
    const isCSVFile = allowedTypes.includes(file.mimetype) ||
      file.originalname.toLowerCase().endsWith('.csv');

    if (!isCSVFile) {
      return cb(new ValidationError('Only CSV files (.csv) are allowed'));
    }
    cb(null, true);
  }
});

/**
 * Upload CSV file for import preview
 * POST /api/bulk/upload
 */
const uploadCSV = async (req, res, next) => {
  try {
    upload.single('csvFile')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ValidationError('File size too large. Maximum size is 10MB.'));
        }
        return next(new ValidationError(`Upload error: ${err.message}`));
      } else if (err) {
        return next(err);
      }

      if (!req.file) {
        return next(new ValidationError('No CSV file uploaded'));
      }

      try {
        // Validate CSV format and parse data
        const validation = await CSVImportService.validateCSVFormat(req.file.path);

        res.status(200).json({
          success: true,
          message: 'CSV file uploaded and validated successfully',
          data: {
            file_info: {
              original_name: req.file.originalname,
              file_path: req.file.path,
              file_size: req.file.size,
              uploaded_at: new Date().toISOString()
            },
            validation: validation,
            next_steps: {
              preview: 'Use /api/bulk/import/preview with validateOnly=true to preview import',
              import: 'Use /api/bulk/import to perform actual import',
              template: 'Use /api/bulk/template to download CSV import template'
            }
          }
        });

      } catch (validationError) {
        // Clean up uploaded file if validation fails
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        throw validationError;
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Import products from CSV
 * POST /api/bulk/import
 */
const importProducts = async (req, res, next) => {
  try {
    const {
      filePath,
      updateExisting = false,
      skipErrors = true,
      validateOnly = false,
      batchSize = 100
    } = req.body;

    if (!filePath) {
      throw new ValidationError('File path is required');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Uploaded file not found. Please upload the file first.');
    }

    const importOptions = {
      updateExisting: updateExisting === 'true' || updateExisting === true,
      skipErrors: skipErrors === 'true' || skipErrors === true,
      validateOnly: validateOnly === 'true' || validateOnly === true,
      batchSize: parseInt(batchSize) || 100
    };

    const results = await CSVImportService.importProducts(
      filePath,
      req.user,
      importOptions
    );

    const responseMessage = validateOnly
      ? 'CSV validation completed successfully'
      : 'Product import completed successfully';

    res.status(200).json({
      success: true,
      message: responseMessage,
      data: {
        import_results: results,
        performance: {
          success_rate: results.total_rows > 0
            ? parseFloat(((results.successful_imports / results.total_rows) * 100).toFixed(1))
            : 0,
          processing_time: new Date().toISOString()
        },
        recommendations: generateImportRecommendations(results)
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Download CSV import template
 * GET /api/bulk/template
 */
const downloadTemplate = async (req, res, next) => {
  try {
    const template = await CSVExportService.downloadTemplate();

    // Set headers for CSV file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);

    // Stream the CSV file
    const fileStream = fs.createReadStream(template.filepath);
    fileStream.pipe(res);

    // Clean up temporary file after streaming
    fileStream.on('end', () => {
      if (fs.existsSync(template.filepath)) {
        fs.unlinkSync(template.filepath);
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get import template information
 * GET /api/bulk/template/info
 */
const getTemplateInfo = async (req, res, next) => {
  try {
    const templateInfo = {
      required_fields: ['SKU', 'Name', 'Category', 'Quantity', 'Reorder Level', 'Price'],
      optional_fields: ['Description', 'Location'],
      data_validation: {
        sku: 'Must be unique, 3-20 characters, alphanumeric with hyphens/underscores',
        price: 'Must be positive decimal number',
        quantity: 'Must be non-negative integer',
        reorder_level: 'Must be non-negative integer (defaults to 10% of quantity)',
        category: 'Select from predefined dropdown list'
      },
      sample_data: [
        {
          sku: 'SAMPLE-001',
          name: 'Sample Product 1',
          description: 'This is a sample product',
          category: 'Electronics',
          quantity: 100,
          reorder_level: 10,
          price: 29.99,
          location: 'A1-B2-C3'
        }
      ]
    };

    res.status(200).json({
      success: true,
      message: 'Import template information retrieved successfully',
      data: {
        template_info: templateInfo,
        import_guidelines: {
          file_format: 'CSV (.csv)',
          encoding: 'UTF-8',
          max_file_size: '10MB',
          max_records: '10,000 products per import',
          required_headers: templateInfo.required_fields,
          data_validation: {
            sku: 'Must be unique, 3-20 characters, alphanumeric with hyphens/underscores',
            price: 'Must be positive decimal number',
            quantity: 'Must be non-negative integer',
            reorder_level: 'Must be non-negative integer (defaults to 10% of quantity)'
          }
        },
        best_practices: [
          'Always backup your data before bulk import',
          'Use validateOnly=true first to check for errors',
          'Test with small batches before large imports',
          'Ensure SKUs are unique across your inventory',
          'Verify product categories match your system'
        ]
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Export products to CSV
 * POST /api/bulk/export/products
 */
const exportProducts = async (req, res, next) => {
  try {
    const {
      category,
      lowStockOnly = false,
      includeAuditData = false,
      format = 'standard'
    } = req.body;

    const filters = {};
    if (category) {
      filters.category = category;
    }
    if (lowStockOnly === 'true' || lowStockOnly === true) {
      filters.lowStockOnly = true;
    }

    const exportOptions = {
      includeAuditData: includeAuditData === 'true' || includeAuditData === true,
      format
    };

    const results = await CSVExportService.exportProducts(filters, exportOptions);

    res.status(200).json({
      success: true,
      message: 'Product export completed successfully',
      data: {
        export_results: results,
        download_info: {
          filename: results.filename,
          download_url: `/api/bulk/download/${results.filename}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Export audit records to CSV
 * POST /api/bulk/export/audit
 */
const exportAuditRecords = async (req, res, next) => {
  try {
    const {
      dateFrom,
      dateTo,
      operationType,
      productId,
      userId,
      format = 'detailed'
    } = req.body;

    const filters = {};
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (operationType) filters.operationType = operationType;
    if (productId) filters.productId = parseInt(productId);
    if (userId) filters.userId = parseInt(userId);

    const exportOptions = { format };

    const results = await CSVExportService.exportAuditRecords(filters, exportOptions);

    res.status(200).json({
      success: true,
      message: 'Audit records export completed successfully',
      data: {
        export_results: results,
        download_info: {
          filename: results.filename,
          download_url: `/api/bulk/download/${results.filename}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Export low stock report
 * POST /api/bulk/export/low-stock
 */
const exportLowStockReport = async (req, res, next) => {
  try {
    const { includeOutOfStock = true } = req.body;

    const options = {
      includeOutOfStock: includeOutOfStock === 'true' || includeOutOfStock === true
    };

    const results = await CSVExportService.exportLowStockReport(options);

    res.status(200).json({
      success: true,
      message: 'Low stock report export completed successfully',
      data: {
        export_results: results,
        download_info: {
          filename: results.filename,
          download_url: `/api/bulk/download/${results.filename}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        urgency_indicators: {
          out_of_stock_items: results.export_summary.out_of_stock_items,
          low_stock_items: results.export_summary.low_stock_items,
          total_shortage: results.export_summary.total_shortage,
          requires_immediate_action: results.export_summary.out_of_stock_items > 0
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Export inventory summary report
 * POST /api/bulk/export/summary
 */
const exportInventorySummary = async (req, res, next) => {
  try {
    const results = await CSVExportService.exportInventorySummary();

    res.status(200).json({
      success: true,
      message: 'Inventory summary export completed successfully',
      data: {
        export_results: results,
        download_info: {
          filename: results.filename,
          download_url: `/api/bulk/download/${results.filename}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Download exported file
 * GET /api/bulk/download/:filename
 */
const downloadExport = async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (!/^[a-zA-Z0-9_.-]+\.csv$/.test(filename)) {
      throw new ValidationError('Invalid filename format');
    }

    const filePath = path.join(process.cwd(), 'uploads', 'exports', filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Export file not found or has expired');
    }

    // Check if file is not older than 24 hours
    const stats = fs.statSync(filePath);
    const fileAge = Date.now() - stats.mtime.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (fileAge > maxAge) {
      // Delete expired file
      fs.unlinkSync(filePath);
      throw new NotFoundError('Export file has expired and has been removed');
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);

    // Stream file to response
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);

  } catch (error) {
    next(error);
  }
};

/**
 * Get bulk operations statistics
 * GET /api/bulk/stats
 */
const getBulkStats = async (req, res, next) => {
  try {
    const exportsDir = path.join(process.cwd(), 'uploads', 'exports');
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');

    let exportFiles = [];
    let tempFiles = [];

    if (fs.existsSync(exportsDir)) {
      exportFiles = fs.readdirSync(exportsDir)
        .filter(file => file.endsWith('.csv'))
        .map(file => {
          const stats = fs.statSync(path.join(exportsDir, file));
          return {
            filename: file,
            size: stats.size,
            created_at: stats.mtime.toISOString(),
            expires_at: new Date(stats.mtime.getTime() + 24 * 60 * 60 * 1000).toISOString()
          };
        });
    }

    if (fs.existsSync(tempDir)) {
      tempFiles = fs.readdirSync(tempDir)
        .filter(file => file.endsWith('.csv'))
        .map(file => {
          const stats = fs.statSync(path.join(tempDir, file));
          return {
            filename: file,
            size: stats.size,
            uploaded_at: stats.mtime.toISOString()
          };
        });
    }

    res.status(200).json({
      success: true,
      message: 'Bulk operations statistics retrieved successfully',
      data: {
        export_files: {
          count: exportFiles.length,
          files: exportFiles,
          total_size: exportFiles.reduce((sum, file) => sum + file.size, 0)
        },
        uploaded_files: {
          count: tempFiles.length,
          files: tempFiles,
          total_size: tempFiles.reduce((sum, file) => sum + file.size, 0)
        },
        system_limits: {
          max_file_size: '10MB',
          max_records_per_import: 10000,
          export_retention: '24 hours',
          supported_formats: ['CSV (.csv)']
        },
        available_operations: {
          import: ['Product bulk import with validation from CSV files'],
          export: ['Products to CSV', 'Audit records', 'Low stock report', 'Inventory summary']
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Clean up old files
 * DELETE /api/bulk/cleanup
 */
const cleanupFiles = async (req, res, next) => {
  try {
    const { type = 'all' } = req.body; // 'exports', 'temp', or 'all'

    let deletedFiles = 0;
    let totalSize = 0;

    // Clean up export files older than 24 hours
    if (type === 'exports' || type === 'all') {
      const exportsDir = path.join(process.cwd(), 'uploads', 'exports');
      if (fs.existsSync(exportsDir)) {
        const files = fs.readdirSync(exportsDir);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        for (const file of files) {
          const filePath = path.join(exportsDir, file);
          const stats = fs.statSync(filePath);
          const fileAge = Date.now() - stats.mtime.getTime();

          if (fileAge > maxAge) {
            totalSize += stats.size;
            fs.unlinkSync(filePath);
            deletedFiles++;
          }
        }
      }
    }

    // Clean up temp files older than 1 hour
    if (type === 'temp' || type === 'all') {
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        const maxAge = 60 * 60 * 1000; // 1 hour

        for (const file of files) {
          const filePath = path.join(tempDir, file);
          const stats = fs.statSync(filePath);
          const fileAge = Date.now() - stats.mtime.getTime();

          if (fileAge > maxAge) {
            totalSize += stats.size;
            fs.unlinkSync(filePath);
            deletedFiles++;
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'File cleanup completed successfully',
      data: {
        files_deleted: deletedFiles,
        space_freed: totalSize,
        cleanup_type: type,
        performed_by: req.user.username,
        cleanup_criteria: {
          exports: 'Files older than 24 hours',
          temp: 'Files older than 1 hour'
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Generate import recommendations
 * @private
 */
function generateImportRecommendations(results) {
  const recommendations = [];

  if (results.failed_imports > 0) {
    recommendations.push({
      type: 'warning',
      message: `${results.failed_imports} products failed to import. Review error details.`,
      action: 'Check validation_errors and errors arrays for specific issues'
    });
  }

  if (results.validation_errors.length > 0) {
    recommendations.push({
      type: 'error',
      message: `${results.validation_errors.length} rows have validation errors.`,
      action: 'Fix data issues in CSV file and re-import'
    });
  }

  if (results.successful_imports > 0) {
    recommendations.push({
      type: 'success',
      message: `${results.successful_imports} products imported successfully.`,
      action: 'Review imported products and update stock levels if needed'
    });
  }

  if (results.successful_imports === 0 && results.validation_errors.length === 0) {
    recommendations.push({
      type: 'info',
      message: 'No products were imported. Check if updateExisting is set correctly.',
      action: 'Set updateExisting=true to update existing products'
    });
  }

  return recommendations;
}

module.exports = {
  uploadCSV,
  importProducts,
  downloadTemplate,
  getTemplateInfo,
  exportProducts,
  exportAuditRecords,
  exportLowStockReport,
  exportInventorySummary,
  downloadExport,
  getBulkStats,
  cleanupFiles
};