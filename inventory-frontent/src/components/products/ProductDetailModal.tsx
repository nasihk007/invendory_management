import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Package, AlertCircle, X } from 'lucide-react';
import { Product } from '@/types/product';
import { auditAPI, notificationAPI } from '@/api/api';
import { formatDate, formatCurrency, formatOperationType } from '@/utils/formatters';
import { QUERY_KEYS } from '@/utils/constants';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { data: auditData, isLoading: isLoadingAudit } = useQuery({
    queryKey: QUERY_KEYS.PRODUCT_AUDIT_LOGS(product?.id?.toString() || ''),
    queryFn: () => auditAPI.getProductAuditLogs(product!.id),
    enabled: !!product,
  });

  const { data: notificationData, isLoading: isLoadingNotifications } = useQuery({
    queryKey: [QUERY_KEYS.NOTIFICATIONS, { product_id: product?.id }],
    queryFn: () => notificationAPI.getNotifications({ product_id: product!.id }),
    enabled: !!product,
  });

  if (!product) return null;

  const auditLogs = auditData?.data?.data?.audit_history || [];
  const notifications = notificationData?.data?.data?.notifications || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black bg-opacity-50"
            // Disabled backdrop click to close
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Product Details - {product.name}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onMouseDown={(e) => e.preventDefault()}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
        {/* Product Information */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Basic Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">SKU:</span>
                    <span className="font-medium">{product.sku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{product.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{product.location || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Inventory Details
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Stock:</span>
                    <span className="font-medium">{product.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reorder Level:</span>
                    <span className="font-medium">{product.reorder_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(product.price))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Value:</span>
                    <span className="font-medium">
                      {formatCurrency(product.quantity * parseFloat(product.price))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {product.description && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{product.description}</p>
            </div>
          )}
        </Card>

        {/* Recent Notifications */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Recent Notifications
          </h3>
          {isLoadingNotifications ? (
            <LoadingSpinner />
          ) : notifications.length === 0 ? (
            <p className="text-gray-500">No notifications for this product</p>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg border ${
                    notification.is_read
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(notification.created_at, true)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      notification.type === 'low_stock'
                        ? 'bg-yellow-100 text-yellow-800'
                        : notification.type === 'out_of_stock'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {notification.type.replace('_', ' ')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Audit Log */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Stock Movement History
          </h3>
          {isLoadingAudit ? (
            <LoadingSpinner />
          ) : auditLogs.length === 0 ? (
            <p className="text-gray-500">No stock movements recorded</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.slice(0, 10).map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatOperationType(log.operation_type)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {log.user} • {formatDate(log.timestamp, true)}
                      </p>
                      {log.reason && (
                        <p className="text-xs text-gray-600 mt-1">{log.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{log.change.from}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-sm font-medium text-gray-900">
                        {log.change.to}
                      </span>
                    </div>
                    <p className={`text-xs ${
                      log.change.type === 'increase'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {log.change.type === 'increase' ? '+' : ''}
                      {log.change.difference}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailModal;