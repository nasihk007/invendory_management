import React from 'react';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reportAPI } from '@/api/api';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { QUERY_KEYS } from '@/utils/constants';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const { data: lowStockData, isLoading: isLoadingLowStock } = useQuery({
    queryKey: QUERY_KEYS.LOW_STOCK_REPORT,
    queryFn: () => reportAPI.getLowStock(),
  });

  const { data: inventoryValueData, isLoading: isLoadingInventoryValue } = useQuery({
    queryKey: QUERY_KEYS.INVENTORY_VALUATION,
    queryFn: () => reportAPI.getInventoryValuation(),
  });

  // Extract data from the correct API response structure
  const lowStockProducts = lowStockData?.data?.data?.urgency_ranking || [];
  const inventorySummary = inventoryValueData?.data?.data?.summary || null;
  
  // Get values from summary data
  const totalValue = inventorySummary?.total_inventory_value || 0;
  const totalProducts = inventorySummary?.total_products || 0;
  const lowStockCount = lowStockData?.data?.data?.summary?.total_low_stock_items || 0;

  const stats = [
    {
      name: 'Total Products',
      value: formatNumber(totalProducts),
      icon: Package,
      color: 'bg-blue-500',
      loading: isLoadingInventoryValue,
    },
    {
      name: 'Low Stock Items',
      value: formatNumber(lowStockCount),
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      loading: isLoadingLowStock,
    },
    {
      name: 'Total Inventory Value',
      value: formatCurrency(totalValue),
      icon: TrendingUp,
      color: 'bg-green-500',
      loading: isLoadingInventoryValue,
    },
    {
      name: 'Unread Notifications',
      value: formatNumber(unreadCount),
      icon: Users,
      color: 'bg-red-500',
      loading: false,
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your inventory today.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.loading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        stat.value
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Low Stock Items */}
      {lowStockProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">
                Low Stock Alert
              </h2>
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product, index) => (
                  <motion.div
                    key={product.dataValues?.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{product.dataValues?.name}</p>
                      <p className="text-sm text-gray-600">SKU: {product.dataValues?.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-yellow-800">
                        {product.dataValues?.quantity} left
                      </p>
                      <p className="text-xs text-gray-500">
                        Reorder at {product.dataValues?.reorder_level}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <motion.a
                href="/products"
                whileHover={{ scale: 1.02 }}
                className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <Package className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-blue-900">Manage Products</p>
                  <p className="text-sm text-blue-600">Add, edit, or view products</p>
                </div>
              </motion.a>

              <motion.a
                href="/notifications"
                whileHover={{ scale: 1.02 }}
                className="flex items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors"
              >
                <AlertTriangle className="w-8 h-8 text-yellow-600 mr-3" />
                <div>
                  <p className="font-medium text-yellow-900">View Alerts</p>
                  <p className="text-sm text-yellow-600">Check inventory notifications</p>
                </div>
              </motion.a>

              {user?.role === 'manager' && (
                <motion.a
                  href="/reports"
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
                >
                  <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-green-900">View Reports</p>
                    <p className="text-sm text-green-600">Analyze inventory data</p>
                  </div>
                </motion.a>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;