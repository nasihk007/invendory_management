import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, Package, Award } from 'lucide-react';
import { useSalesPerformanceReport } from '@/hooks/useReports';
import { ReportFilters } from '@/types/report';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';

interface SalesPerformanceReportProps {
  filters?: ReportFilters;
  onExport?: () => void;
}

const SalesPerformanceReport: React.FC<SalesPerformanceReportProps> = ({ 
  filters, 
  onExport 
}) => {
  const { data, isLoading, error } = useSalesPerformanceReport(filters);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Loading sales performance data..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <TrendingDown className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to load sales performance data
        </h3>
        <p className="text-gray-600">
          Unable to fetch sales performance report. Please try again later.
        </p>
      </Card>
    );
  }

  const reportData = (data as any)?.data?.data;
  const salesData = reportData?.top_selling_products || [];
  const summary = reportData?.summary || {};
  const analytics = reportData?.analytics || {};

  // Calculate summary metrics from actual API data structure
  const totalSales = summary.total_quantity_sold || 0;
  const totalTransactions = summary.total_sales_transactions || 0;
  const uniqueProducts = summary.unique_products_sold || 0;
  const uniqueUsers = summary.unique_users_involved || 0;
  const averageDailySales = summary.average_daily_sales || 0;
  const peakSalesDay = summary.peak_sales_day;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'text-green-600 bg-green-50';
      case 'decreasing': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >

        {onExport && (
          <Button variant="outline" onClick={onExport}>
            Export Report
          </Button>
        )}
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
                    Total Sales Transactions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(totalTransactions)}
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
                    Total Quantity Sold
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(totalSales)}
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
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Unique Products Sold
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(uniqueProducts)}
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
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Unique Users Involved
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(uniqueUsers)}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Summary Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Sales Summary
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Transactions', value: totalTransactions },
                  { name: 'Quantity Sold', value: totalSales },
                  { name: 'Unique Products', value: uniqueProducts },
                  { name: 'Unique Users', value: uniqueUsers }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [formatNumber(value as number), 'Count']} />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Analytics Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Analytics Overview
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sales Velocity</span>
                <span className="font-medium">{analytics.sales_velocity || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Product Diversity</span>
                <span className="font-medium">{analytics.product_diversity || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">User Engagement</span>
                <span className="font-medium">{analytics.user_engagement || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Daily Sales</span>
                <span className="font-medium">{formatNumber(averageDailySales)}</span>
              </div>
              {peakSalesDay && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Peak Sales Day</span>
                  <span className="font-medium">{peakSalesDay}</span>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* No Sales Data Message */}
      {totalSales === 0 && totalTransactions === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Sales Activity Found
              </h3>
              <p className="text-gray-600">
                No sales transactions were recorded for the selected date range. 
                Sales data will appear here once transactions are recorded.
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Detailed Table */}
      {salesData.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Sales Performance Details
            </h3>
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
                      Sales Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Avg. Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Trend
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ranking
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesData.map((item: any, index: number) => (
                    <tr key={item?.product_id || index} className="hover:bg-gray-50">
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
                        {formatNumber(item?.sales_quantity || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(item?.revenue || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(item?.average_selling_price || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTrendColor(item?.sales_trend || 'stable')}`}>
                          {getTrendIcon(item?.sales_trend || 'stable')}
                          <span className="ml-1 capitalize">{item?.sales_trend || 'stable'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          #{item?.ranking || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      ) : null}
    </div>
  );
};

export default SalesPerformanceReport;
