const { Notification, Product } = require('../models');
const { Op } = require('sequelize');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const DataResponseDto = require('../shared/dto/DataResponseDto');
const PageOptionsDto = require('../shared/dto/PageOptionsDto');
const { ResponseMessages, HttpStatus } = require('../constants/constants');

/**
 * Get All Notifications with Filtering
 * GET /api/notifications
 */
const getAllNotifications = async (req, res, next) => {
  try {
    const pageOptions = PageOptionsDto.fromQuery(req.query);
    const {
      unreadOnly = false,
      type,
      productId
    } = req.query;

    // Build where clause for filtering
    const whereClause = {};

    if (unreadOnly === 'true') {
      whereClause.is_read = false;
    }

    if (type) {
      whereClause.type = type;
    }

    if (productId) {
      whereClause.product_id = parseInt(productId);
    }

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: whereClause,
      limit: pageOptions.limit,
      offset: pageOptions.offset,
      order: [['created_at', pageOptions.order]],
      include: [{
        model: Product,
        as: 'Product',
        attributes: ['id', 'name', 'sku', 'category'],
        required: false
      }]
    });

    // Add formatted messages and urgency levels
    const enrichedNotifications = notifications.map(notification => {
      const notificationData = notification.toJSON();
      return {
        ...notificationData,
        urgency: notificationData.type === 'out_of_stock' ? 'critical' : 'warning',
        age_hours: Math.floor((Date.now() - new Date(notificationData.created_at).getTime()) / (1000 * 60 * 60))
      };
    });

    const unreadCount = enrichedNotifications.filter(n => !n.is_read).length;
    const criticalCount = enrichedNotifications.filter(n => n.type === 'out_of_stock').length;

    res.status(200).json(new DataResponseDto(
      {
        notifications: enrichedNotifications,
        summary: {
          total_notifications: count,
          unread_count: unreadCount,
          critical_count: criticalCount
        }
      },
      true,
      ResponseMessages.NOTIFICATIONS_RETRIEVED,
      pageOptions,
      count
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get Notification by ID
 * GET /api/notifications/:id
 */
const getNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(parseInt(id));
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const enrichedNotification = {
      ...notification,
      formatted_message: notification.getFormattedMessage(),
      urgency: notification.isCritical() ? 'critical' : 'warning',
      age_hours: Math.floor((Date.now() - new Date(notification.created_at).getTime()) / (1000 * 60 * 60))
    };

    res.status(200).json(new DataResponseDto(
      { notification: enrichedNotification },
      true,
      'Notification retrieved successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Mark Notification as Read
 * PUT /api/notifications/:id/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if notification exists
    const notification = await Notification.findById(parseInt(id));
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    // Mark as read
    const success = await Notification.markAsRead(parseInt(id));
    if (!success) {
      throw new Error('Failed to mark notification as read');
    }

    res.status(200).json(new DataResponseDto(
      {
        notification_id: parseInt(id),
        marked_at: new Date().toISOString()
      },
      true,
      ResponseMessages.NOTIFICATION_MARKED_READ
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Mark Multiple Notifications as Read
 * PUT /api/notifications/mark-multiple-read
 */
const markMultipleAsRead = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('Notification IDs array is required');
    }

    if (ids.length > 100) {
      throw new ValidationError('Cannot mark more than 100 notifications at once');
    }

    const markedCount = await Notification.markMultipleAsRead(ids);

    res.status(200).json(new DataResponseDto(
      {
        requested_count: ids.length,
        marked_count: markedCount,
        marked_at: new Date().toISOString()
      },
      true,
      'Notifications marked as read successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Mark All Notifications as Read
 * PUT /api/notifications/mark-all-read
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const { type } = req.query;

    const markedCount = await Notification.markAllAsRead(type);

    res.status(200).json(new DataResponseDto(
      {
        marked_count: markedCount,
        type_filter: type || 'all',
        marked_at: new Date().toISOString()
      },
      true,
      type ?
        `All ${type} notifications marked as read successfully` :
        'All notifications marked as read successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get Unread Notification Count
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const { type } = req.query;

    const count = await Notification.getUnreadCount(type);

    res.status(200).json(new DataResponseDto(
      {
        unread_count: count,
        type_filter: type || 'all',
        checked_at: new Date().toISOString()
      },
      true,
      'Unread notification count retrieved successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get Notifications by Product
 * GET /api/notifications/product/:productId
 */
const getNotificationsByProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { unreadOnly = false } = req.query;

    // Verify product exists
    const product = await Product.findById(parseInt(productId));
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const notifications = await Notification.findByProduct(
      parseInt(productId),
      unreadOnly === 'true'
    );

    const enrichedNotifications = notifications.map(notification => ({
      ...notification,
      formatted_message: notification.getFormattedMessage(),
      urgency: notification.isCritical() ? 'critical' : 'warning',
      age_hours: Math.floor((Date.now() - new Date(notification.created_at).getTime()) / (1000 * 60 * 60))
    }));

    res.status(200).json(new DataResponseDto(
      {
        product: {
          id: product.id,
          sku: product.sku,
          name: product.name,
          current_quantity: product.quantity,
          reorder_level: product.reorder_level
        },
        notifications: enrichedNotifications,
        summary: {
          total_notifications: notifications.length,
          unread_count: notifications.filter(n => n.isUnread()).length,
          critical_count: notifications.filter(n => n.isCritical()).length
        }
      },
      true,
      'Product notifications retrieved successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get Recent Notifications
 * GET /api/notifications/recent
 */
const getRecentNotifications = async (req, res, next) => {
  try {
    const { limit = 10, unreadOnly = false } = req.query;

    const notifications = await Notification.getRecent(
      parseInt(limit),
      unreadOnly === 'true'
    );

    const enrichedNotifications = notifications.map(notification => ({
      ...notification,
      formatted_message: notification.getFormattedMessage(),
      urgency: notification.isCritical() ? 'critical' : 'warning',
      age_hours: Math.floor((Date.now() - new Date(notification.created_at).getTime()) / (1000 * 60 * 60))
    }));

    res.status(200).json(new DataResponseDto(
      {
        notifications: enrichedNotifications,
        filters: {
          limit: parseInt(limit),
          unread_only: unreadOnly === 'true'
        },
        summary: {
          returned_count: notifications.length,
          critical_count: enrichedNotifications.filter(n => n.isCritical()).length,
          unread_count: enrichedNotifications.filter(n => n.isUnread()).length
        }
      },
      true,
      'Recent notifications retrieved successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get Notification Statistics
 * GET /api/notifications/stats
 */
const getNotificationStats = async (req, res, next) => {
  try {
    const stats = await Notification.getStatsByType();

    // Calculate totals and percentages
    const totalNotifications = Object.values(stats).reduce((sum, stat) => sum + stat.total, 0);
    const totalUnread = Object.values(stats).reduce((sum, stat) => sum + stat.unread, 0);

    const enrichedStats = {};
    for (const [type, data] of Object.entries(stats)) {
      enrichedStats[type] = {
        ...data,
        percentage_of_total: totalNotifications > 0 ?
          parseFloat(((data.total / totalNotifications) * 100).toFixed(1)) : 0,
        unread_percentage: data.total > 0 ?
          parseFloat(((data.unread / data.total) * 100).toFixed(1)) : 0
      };
    }

    res.status(200).json(new DataResponseDto(
      {
        overview: {
          total_notifications: totalNotifications,
          total_unread: totalUnread,
          unread_percentage: totalNotifications > 0 ?
            parseFloat(((totalUnread / totalNotifications) * 100).toFixed(1)) : 0,
          generated_at: new Date().toISOString()
        },
        by_type: enrichedStats,
        recommendations: generateRecommendations(enrichedStats, totalUnread)
      },
      true,
      'Notification statistics retrieved successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Delete Notification (Manager only)
 * DELETE /api/notifications/:id
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if notification exists
    const notification = await Notification.findById(parseInt(id));
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const success = await Notification.delete(parseInt(id));
    if (!success) {
      throw new Error('Failed to delete notification');
    }

    res.status(200).json(new DataResponseDto(
      {
        deleted_notification: {
          id: parseInt(id),
          type: notification.type,
          deleted_by: req.user.username,
          deleted_at: new Date().toISOString()
        }
      },
      true,
      'Notification deleted successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Clean Up Old Read Notifications (Manager only)
 * DELETE /api/notifications/cleanup
 */
const cleanupOldNotifications = async (req, res, next) => {
  try {
    const { daysOld = 30 } = req.body;

    if (parseInt(daysOld) < 7) {
      throw new ValidationError('Cannot delete notifications newer than 7 days');
    }

    const deletedCount = await Notification.deleteOldRead(parseInt(daysOld));

    res.status(200).json(new DataResponseDto(
      {
        notifications_deleted: deletedCount,
        cutoff_date: new Date(Date.now() - parseInt(daysOld) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        performed_by: req.user.username,
        cleanup_criteria: `Read notifications older than ${daysOld} days`
      },
      true,
      'Old read notifications cleaned up successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Create Manual Notification (Manager only)
 * POST /api/notifications
 */
const createNotification = async (req, res, next) => {
  try {
    const { product_id, message, type } = req.body;

    // Verify product exists
    const product = await Product.findById(product_id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Validate notification type
    const validTypes = ['low_stock', 'out_of_stock', 'reorder_required'];
    if (!validTypes.includes(type)) {
      throw new ValidationError(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
    }

    const notification = await Notification.create({
      product_id,
      message,
      type
    });

    res.status(201).json(new DataResponseDto(
      {
        notification: {
          ...notification,
          formatted_message: notification.getFormattedMessage(),
          created_by: req.user.username
        }
      },
      true,
      'Notification created successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Generate recommendations based on notification statistics
 * @private
 */
function generateRecommendations(stats, totalUnread) {
  const recommendations = [];

  if (totalUnread > 10) {
    recommendations.push({
      type: 'urgent',
      message: 'High number of unread notifications. Consider reviewing and addressing them.',
      action: 'Review unread notifications'
    });
  }

  if (stats.out_of_stock && stats.out_of_stock.unread > 0) {
    recommendations.push({
      type: 'critical',
      message: 'Products are out of stock and need immediate attention.',
      action: 'Restock out-of-stock products'
    });
  }

  if (stats.low_stock && stats.low_stock.unread > 5) {
    recommendations.push({
      type: 'warning',
      message: 'Multiple products are running low on stock.',
      action: 'Plan restocking for low-stock products'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'info',
      message: 'Notification levels are manageable.',
      action: 'Continue monitoring'
    });
  }

  return recommendations;
}

module.exports = {
  getAllNotifications,
  getNotificationById,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  getUnreadCount,
  getNotificationsByProduct,
  getRecentNotifications,
  getNotificationStats,
  deleteNotification,
  cleanupOldNotifications,
  createNotification
};