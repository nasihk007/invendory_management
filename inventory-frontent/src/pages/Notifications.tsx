import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Notification, NotificationFilter } from '@/types/notification';
import { formatDate, formatNotificationType } from '@/utils/formatters';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<Notification['type'] | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState<boolean | undefined>(undefined);

  // Build filter parameters for API call
  const filterParams: NotificationFilter = {
    offset: 0,
    limit: 10,
  };

  if (filter === 'unread' || unreadOnly) {
    filterParams.unreadOnly = true;
  }

  if (typeFilter !== 'all') {
    filterParams.type = typeFilter;
  }

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingAsRead,
    isMarkingAllAsRead,
    isDeletingNotification,
  } = useNotifications(filterParams);

  // Use the filtered notifications from the API response
  const filteredNotifications = notifications;

  // Trigger refetch when filters change
  useEffect(() => {
    // The useNotifications hook will automatically refetch when filterParams change
    // due to the queryKey dependency
  }, [filter, typeFilter, unreadOnly]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'out_of_stock':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    const baseClasses = isRead ? 'bg-gray-50 border-gray-200' : '';
    
    switch (type) {
      case 'low_stock':
        return isRead ? baseClasses : 'bg-yellow-50 border-yellow-200';
      case 'out_of_stock':
        return isRead ? baseClasses : 'bg-red-50 border-red-200';
      default:
        return isRead ? baseClasses : 'bg-blue-50 border-blue-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Loading notifications..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            Stay updated with inventory alerts and system notifications
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <Button
              variant="primary"
              onClick={() => markAllAsRead()}
              loading={isMarkingAllAsRead}
              icon={<CheckCheck className="w-4 h-4" />}
            >
              Mark All Read
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card padding="sm">
          <div className="space-y-4">
            {/* Read Status Filter */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Notifications ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Type Filter */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Type:</span>
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => setTypeFilter('low_stock')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  typeFilter === 'low_stock'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Low Stock
              </button>
              <button
                onClick={() => setTypeFilter('out_of_stock')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  typeFilter === 'out_of_stock'
                    ? 'bg-red-100 text-red-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Out of Stock
              </button>
              <button
                onClick={() => setTypeFilter('reorder_required')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  typeFilter === 'reorder_required'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Reorder Required
              </button>
            </div>

            {/* Unread Only Toggle */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Unread Only:</span>
              <button
                onClick={() => setUnreadOnly(unreadOnly === true ? undefined : true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  unreadOnly === true
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {unreadOnly === true ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {/* Clear Filters */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setFilter('all');
                  setTypeFilter('all');
                  setUnreadOnly(undefined);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Notifications List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {filteredNotifications.length === 0 ? (
          <Card className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </h3>
            <p className="text-gray-600">
              {filter === 'unread' 
                ? 'All caught up! You have no unread notifications.'
                : 'You have no notifications at this time.'
              }
            </p>
          </Card>
        ) : (
          filteredNotifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className={`border ${getNotificationColor(notification.type, notification.is_read)}`}
                hover={false}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          notification.is_read ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {notification.message}
                        </p>
                        
                        {notification.Product && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p>Product: {notification.Product.name}</p>
                            <p>SKU: {notification.Product.sku}</p>
                            <p>Category: {notification.Product.category}</p>
                            <p>Urgency: <span className={`font-medium ${
                              notification.urgency === 'critical' ? 'text-red-600' :
                              notification.urgency === 'warning' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>{notification.urgency}</span></p>
                            <p>Age: {notification.age_hours} hours</p>
                          </div>
                        )}
                        
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatDate(notification.created_at, true)}</span>
                          <span className="capitalize">
                            {formatNotificationType(notification.type)}
                          </span>
                          {!notification.is_read && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.is_read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            loading={isMarkingAsRead}
                            icon={<Check className="w-4 h-4" />}
                          >
                            Mark Read
                          </Button>
                        )}
                        
                        {user?.role === 'manager' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            loading={isDeletingNotification}
                            icon={<Trash2 className="w-4 h-4" />}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
};

export default Notifications;