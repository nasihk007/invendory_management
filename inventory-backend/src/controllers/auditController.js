const { InventoryAudit, Product, User } = require('../models');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * Get All Audit Records with Filtering
 * GET /api/audit
 */
const getAllAuditRecords = async (req, res, next) => {
  try {
    const {
      limit = 50,
      offset = 0,
      productId,
      userId,
      operationType,
      dateFrom,
      dateTo
    } = req.query;

    const result = await InventoryAudit.findWithFilters({
      limit: parseInt(limit),
      offset: parseInt(offset),
      productId: productId ? parseInt(productId) : null,
      userId: userId ? parseInt(userId) : null,
      operationType,
      dateFrom,
      dateTo
    });

    // Format audit records for display
    const formattedAudits = result.audits.map(audit => audit.toDisplayFormat());

    res.status(200).json({
      success: true,
      message: 'Audit records retrieved successfully',
      data: {
        audits: formattedAudits,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          pages: Math.ceil(result.total / result.limit)
        },
        filters: result.filters
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Audit Record by ID
 * GET /api/audit/:id
 */
const getAuditById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const audit = await InventoryAudit.findByPk(parseInt(id));
    if (!audit) {
      throw new NotFoundError('Audit record not found');
    }

    res.status(200).json({
      success: true,
      message: 'Audit record retrieved successfully',
      data: {
        audit: audit.toDisplayFormat()
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Audit History for Specific Product
 * GET /api/audit/product/:productId
 */
const getProductAuditHistory = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { limit = 100 } = req.query;

    // Verify product exists
    const product = await Product.findById(parseInt(productId));
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const auditResult = await InventoryAudit.findWithFilters({
      productId: parseInt(productId),
      limit: parseInt(limit)
    });
    const audits = auditResult.audits;
    const formattedAudits = audits.map(audit => audit.toDisplayFormat());

    res.status(200).json({
      success: true,
      message: 'Product audit history retrieved successfully',
      data: {
        product: {
          id: product.id,
          sku: product.sku,
          name: product.name,
          current_quantity: product.quantity
        },
        audit_history: formattedAudits,
        summary: {
          total_changes: audits.length,
          total_increases: audits.filter(a => a.isIncrease()).length,
          total_decreases: audits.filter(a => a.isDecrease()).length,
          earliest_record: audits.length > 0 ? audits[audits.length - 1].created_at : null,
          latest_record: audits.length > 0 ? audits[0].created_at : null
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Audit History for Specific User
 * GET /api/audit/user/:userId
 */
const getUserAuditHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 100 } = req.query;

    // Only managers can view other users' audit history
    if (req.user.role !== 'manager' && req.user.id !== parseInt(userId)) {
      throw new ValidationError('You can only view your own audit history');
    }

    // Verify user exists
    const user = await User.findById(parseInt(userId));
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const auditResult = await InventoryAudit.findWithFilters({
      userId: parseInt(userId),
      limit: parseInt(limit)
    });
    const audits = auditResult.audits;
    const formattedAudits = audits.map(audit => audit.toDisplayFormat());

    res.status(200).json({
      success: true,
      message: 'User audit history retrieved successfully',
      data: {
        user: user.toSafeObject(),
        audit_history: formattedAudits,
        summary: {
          total_operations: audits.length,
          total_increases: audits.filter(a => a.isIncrease()).length,
          total_decreases: audits.filter(a => a.isDecrease()).length,
          products_affected: [...new Set(audits.map(a => a.product_id))].length,
          earliest_operation: audits.length > 0 ? audits[audits.length - 1].created_at : null,
          latest_operation: audits.length > 0 ? audits[0].created_at : null
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Audit Records by Date Range
 * GET /api/audit/date-range
 */
const getAuditByDateRange = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, limit = 500 } = req.query;

    if (!dateFrom || !dateTo) {
      throw new ValidationError('Both dateFrom and dateTo are required');
    }

    // Validate date format
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
    }

    if (fromDate > toDate) {
      throw new ValidationError('dateFrom cannot be later than dateTo');
    }

    const auditResult = await InventoryAudit.findWithFilters({
      dateFrom,
      dateTo,
      limit: parseInt(limit)
    });
    const audits = auditResult.audits;
    const formattedAudits = audits.map(audit => audit.toDisplayFormat());

    res.status(200).json({
      success: true,
      message: 'Audit records for date range retrieved successfully',
      data: {
        date_range: {
          from: dateFrom,
          to: dateTo
        },
        audit_records: formattedAudits,
        summary: {
          total_records: audits.length,
          total_increases: audits.filter(a => a.isIncrease()).length,
          total_decreases: audits.filter(a => a.isDecrease()).length,
          unique_products: [...new Set(audits.map(a => a.product_id))].length,
          unique_users: [...new Set(audits.map(a => a.user_id))].length
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Daily Audit Summary
 * GET /api/audit/daily-summary
 */
const getDailySummary = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;

    if (parseInt(days) < 1 || parseInt(days) > 365) {
      throw new ValidationError('Days must be between 1 and 365');
    }

    const summary = await InventoryAudit.getDailySummary(parseInt(days));

    res.status(200).json({
      success: true,
      message: 'Daily audit summary retrieved successfully',
      data: {
        period: {
          days: parseInt(days),
          from: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        },
        daily_summary: summary,
        totals: {
          total_changes: summary.reduce((sum, day) => sum + day.total_changes, 0),
          total_increases: summary.reduce((sum, day) => sum + day.total_increases, 0),
          total_decreases: summary.reduce((sum, day) => sum + day.total_decreases, 0),
          average_daily_changes: summary.length > 0 ?
            Math.round(summary.reduce((sum, day) => sum + day.total_changes, 0) / summary.length) : 0
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Audit Statistics by Operation Type
 * GET /api/audit/stats-by-operation
 */
const getStatsByOperationType = async (req, res, next) => {
  try {
    const { days } = req.query;

    const stats = await InventoryAudit.getStatsByOperationType(days ? parseInt(days) : null);

    res.status(200).json({
      success: true,
      message: 'Audit statistics by operation type retrieved successfully',
      data: {
        period: days ? `Last ${days} days` : 'All time',
        operation_stats: stats,
        summary: {
          total_operations: stats.reduce((sum, stat) => sum + stat.total_operations, 0),
          most_common_operation: stats.length > 0 ? stats[0].operation_type : null,
          total_products_affected: stats.reduce((sum, stat) => sum + stat.products_affected, 0)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Most Active Users (by audit count)
 * GET /api/audit/most-active-users
 */
const getMostActiveUsers = async (req, res, next) => {
  try {
    const { limit = 10, days } = req.query;

    const users = await InventoryAudit.getMostActiveUsers(parseInt(limit), days ? parseInt(days) : null);

    res.status(200).json({
      success: true,
      message: 'Most active users retrieved successfully',
      data: {
        period: days ? `Last ${days} days` : 'All time',
        active_users: users,
        summary: {
          users_analyzed: users.length,
          total_operations: users.reduce((sum, user) => sum + user.total_operations, 0),
          most_active_user: users.length > 0 ? {
            username: users[0].username,
            operations: users[0].total_operations
          } : null
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Products with Most Changes
 * GET /api/audit/most-changed-products
 */
const getMostChangedProducts = async (req, res, next) => {
  try {
    const { limit = 10, days } = req.query;

    const products = await InventoryAudit.getMostChangedProducts(parseInt(limit), days ? parseInt(days) : null);

    res.status(200).json({
      success: true,
      message: 'Products with most changes retrieved successfully',
      data: {
        period: days ? `Last ${days} days` : 'All time',
        changed_products: products,
        summary: {
          products_analyzed: products.length,
          total_changes: products.reduce((sum, product) => sum + product.total_changes, 0),
          most_changed_product: products.length > 0 ? {
            sku: products[0].sku,
            name: products[0].name,
            changes: products[0].total_changes
          } : null
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Comprehensive Audit Report
 * GET /api/audit/report
 */
const getAuditReport = async (req, res, next) => {
  try {
    const {
      dateFrom,
      dateTo,
      includeDetails = false
    } = req.query;

    // Default to last 30 days if no date range provided
    const endDate = dateTo ? new Date(dateTo) : new Date();
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const fromDateStr = startDate.toISOString().split('T')[0];
    const toDateStr = endDate.toISOString().split('T')[0];

    // Get comprehensive data
    const [
      audits,
      dailySummary,
      operationStats,
      activeUsers,
      changedProducts
    ] = await Promise.all([
      includeDetails === 'true' ? InventoryAudit.findWithFilters({
        dateFrom: fromDateStr,
        dateTo: toDateStr,
        limit: 1000
      }).then(result => result.audits) : [],
      InventoryAudit.getDailySummary(Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))),
      InventoryAudit.getStatsByOperationType(Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))),
      InventoryAudit.getMostActiveUsers(5, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))),
      InventoryAudit.getMostChangedProducts(5, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))
    ]);

    const report = {
      report_metadata: {
        generated_at: new Date().toISOString(),
        date_range: {
          from: fromDateStr,
          to: toDateStr,
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        },
        includes_details: includeDetails === 'true'
      },
      summary: {
        total_audit_records: audits.length || dailySummary.reduce((sum, day) => sum + day.total_changes, 0),
        total_stock_increases: dailySummary.reduce((sum, day) => sum + day.total_increases, 0),
        total_stock_decreases: dailySummary.reduce((sum, day) => sum + day.total_decreases, 0),
        unique_products_affected: dailySummary.reduce((sum, day) => sum + day.products_affected, 0),
        unique_users_involved: dailySummary.reduce((sum, day) => sum + day.users_involved, 0)
      },
      daily_breakdown: dailySummary,
      operation_analysis: operationStats,
      user_activity: activeUsers,
      product_activity: changedProducts
    };

    if (includeDetails === 'true') {
      report.detailed_records = audits.map(audit => audit.toDisplayFormat());
    }

    res.status(200).json({
      success: true,
      message: 'Comprehensive audit report generated successfully',
      data: report
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete Old Audit Records (Manager only)
 * DELETE /api/audit/cleanup
 */
const cleanupOldRecords = async (req, res, next) => {
  try {
    const { daysOld = 365 } = req.body;

    if (parseInt(daysOld) < 90) {
      throw new ValidationError('Cannot delete audit records newer than 90 days');
    }

    const deletedCount = await InventoryAudit.deleteOldRecords(parseInt(daysOld));

    res.status(200).json({
      success: true,
      message: 'Old audit records cleaned up successfully',
      data: {
        records_deleted: deletedCount,
        cutoff_date: new Date(Date.now() - parseInt(daysOld) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        performed_by: req.user.username
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAuditRecords,
  getAuditById,
  getProductAuditHistory,
  getUserAuditHistory,
  getAuditByDateRange,
  getDailySummary,
  getStatsByOperationType,
  getMostActiveUsers,
  getMostChangedProducts,
  getAuditReport,
  cleanupOldRecords
};