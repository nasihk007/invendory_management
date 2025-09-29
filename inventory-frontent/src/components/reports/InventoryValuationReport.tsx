import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  DollarSign, 
  Package, 
  TrendingUp, 
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { useInventoryValuationReport } from '@/hooks/useReports';
import { ReportFilters } from '@/types/report';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';

interface InventoryValuationReportProps {
  filters?: ReportFilters;
  onExport?: () => void;
}

const InventoryValuationReport: React.FC<InventoryValuationReportProps> = ({ 
  filters,
  onExport 
}) => {
  const { data, isLoading, error } = useInventoryValuationReport(filters);
  const [selectedView, setSelectedView] = useState<'summary' | 'detailed'>('summary');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Loading inventory valuation data..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <DollarSign className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to load inventory valuation data
        </h3>
        <p className="text-gray-600">
          Unable to fetch inventory valuation report. Please try again later.
        </p>
      </Card>
    );
  }

  // Extract data with safety checks
  const reportData = data?.data?.data;
  const summary = reportData?.summary || {};
  const detailedItems = reportData?.detailed_items || [];
  const performanceMetrics = reportData?.performance_metrics || {};
  const recommendations = reportData?.recommendations || [];

  // Calculate metrics from actual API data
  const totalValue = (summary as any)?.total_inventory_value || 0;
  const totalProducts = (summary as any)?.total_products || 0;
  const lowStockItems = (summary as any)?.low_stock_items || 0;
  const outOfStockItems = (summary as any)?.out_of_stock_items || 0;
  const averageUnitValue = (summary as any)?.average_unit_value || 0;

  // Create category breakdown from detailed items
  const categoryData = detailedItems.reduce((acc: any, item: any) => {
    const category = item.category || 'Unknown';
    if (!acc[category]) {
      acc[category] = {
        name: category,
        totalValue: 0,
        productCount: 0,
        totalQuantity: 0
      };
    }
    acc[category].totalValue += parseFloat(item.total_value || 0);
    acc[category].productCount += 1;
    acc[category].totalQuantity += parseInt(item.quantity || 0);
    return acc;
  }, {});

  const categoryChartData = Object.values(categoryData).map((cat: any) => ({
    name: cat.name,
    value: cat.totalValue,
    count: cat.productCount,
    quantity: cat.totalQuantity,
    percentage: totalValue > 0 ? ((cat.totalValue / totalValue) * 100).toFixed(1) : '0'
  }));

  const healthData = [
    { name: 'Healthy Stock', value: totalProducts - lowStockItems - outOfStockItems, color: '#10b981' },
    { name: 'Low Stock', value: lowStockItems, color: '#f59e0b' },
    { name: 'Out of Stock', value: outOfStockItems, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >

        <div className="flex items-center space-x-4">
          <div className="flex rounded-lg border border-gray-300">
            <button
              onClick={() => setSelectedView('summary')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                selectedView === 'summary'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setSelectedView('detailed')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                selectedView === 'detailed'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Detailed
            </button>
          </div>
          {onExport && (
            <Button variant="outline" onClick={onExport}>
              Export Report
            </Button>
          )}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Inventory Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(totalValue)}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Products
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(totalProducts)}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Low Stock Items
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(lowStockItems)}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Average Unit Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(averageUnitValue)}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Inventory Value by Category
            </h3>
            <div className="h-64">
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value as number), 'Value']}
                    />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No category data available</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Stock Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Stock Health Distribution
            </h3>
            <div className="h-64">
              {totalProducts > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={healthData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {healthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatNumber(value as number), 'Products']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <PieChartIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No inventory data available</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Performance Metrics */}
      {performanceMetrics && Object.keys(performanceMetrics).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Performance Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Inventory Turnover Indicator</span>
                  <span className="text-sm font-medium text-gray-900">
                    {performanceMetrics.inventory_turnover_indicator?.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(performanceMetrics.inventory_turnover_indicator || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Stock Health Score</span>
                  <span className="text-sm font-medium text-gray-900">
                    {performanceMetrics.stock_health_score?.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${performanceMetrics.stock_health_score || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recommendations
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    rec.priority === 'high' ? 'bg-red-500' : 
                    rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{rec.message}</p>
                    <p className="text-sm text-gray-600">{rec.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Detailed Items Table */}
      {selectedView === 'detailed' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Detailed Inventory Items ({detailedItems.length} items)
            </h3>
            {detailedItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total Value
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Stock Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detailedItems.map((item: any, index: number) => (
                      <tr key={item?.id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item?.name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{item?.sku || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item?.category || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatNumber(item?.quantity || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatCurrency(parseFloat(item?.unit_price || 0))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatCurrency(parseFloat(item?.total_value || 0))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item?.is_out_of_stock 
                              ? 'bg-red-100 text-red-800'
                              : item?.is_low_stock
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {item?.is_out_of_stock 
                              ? 'Out of Stock'
                              : item?.is_low_stock
                              ? 'Low Stock'
                              : 'In Stock'
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Detailed Items Available
                </h3>
                <p className="text-gray-600">
                  No detailed inventory items found for the selected criteria.
                </p>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default InventoryValuationReport;
