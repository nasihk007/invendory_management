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
  AlertTriangle, 
  AlertCircle, 
  AlertOctagon,
  Package, 
  DollarSign,
  Clock
} from 'lucide-react';
import { useLowStockReport } from '@/hooks/useReports';
import { ReportFilters } from '@/types/report';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';

interface LowStockAlertsReportProps {
  filters?: ReportFilters;
  onExport?: () => void;
}

const LowStockAlertsReport: React.FC<LowStockAlertsReportProps> = ({ 
  filters, 
  onExport 
}) => {
  const { data, isLoading, error } = useLowStockReport(filters);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'critical' | 'warning' | 'low'>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Loading low stock alerts data..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to load low stock alerts data
        </h3>
        <p className="text-gray-600">
          Unable to fetch low stock alerts report. Please try again later.
        </p>
      </Card>
    );
  }

  const reportData = data?.data?.data;
  const summary = reportData?.summary || {};
  const urgencyRanking = reportData?.urgency_ranking || [];
  const financialImpact = reportData?.financial_impact || {};
  const categoryBreakdown = reportData?.category_breakdown || [];

  // Calculate summary metrics from actual API data
  const totalLowStockItems = (summary as any)?.total_low_stock_items || 0;
  const criticalItems = (summary as any)?.critical_items || 0;
  const warningItems = (summary as any)?.warning_items || 0;
  const categoriesAffected = (summary as any)?.categories_affected || 0;
  const estimatedShortageValue = (summary as any)?.total_estimated_shortage_value || 0;

  // Extract data from the complex API structure and filter by urgency
  const processedItems = urgencyRanking.map((item: any) => {
    const data = item.dataValues || item;
    return {
      id: data.id,
      sku: data.sku,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      reorder_level: data.reorder_level,
      price: parseFloat(data.price || 0),
      location: data.location,
      urgency_score: item.urgency_score || 0,
      shortage_amount: item.shortage_amount || 0,
      estimated_stockout_days: item.estimated_stockout_days || 0,
      recommended_order_quantity: item.recommended_order_quantity || 0,
      estimated_shortage_value: (item.shortage_amount || 0) * parseFloat(data.price || 0)
    };
  });

  const filteredItems = processedItems.filter((item: any) => {
    switch (urgencyFilter) {
      case 'critical':
        return item.urgency_score >= 80;
      case 'warning':
        return item.urgency_score >= 60 && item.urgency_score < 80;
      case 'low':
        return item.urgency_score < 60;
      default:
        return true;
    }
  });

  // Prepare chart data from actual API structure
  const urgencyChartData = [
    { name: 'Critical', value: criticalItems, color: '#ef4444' },
    { name: 'Warning', value: warningItems, color: '#f59e0b' },
    { name: 'Low Stock', value: totalLowStockItems - criticalItems - warningItems, color: '#3b82f6' }
  ];

  // Use the category breakdown from the API
  const categoryChartData = categoryBreakdown.map((cat: any) => ({
    name: cat.category,
    count: cat.total_items,
    value: cat.estimated_reorder_cost,
    critical: cat.critical_items
  }));

  const getUrgencyIcon = (score: number) => {
    if (score >= 80) return <AlertOctagon className="w-4 h-4 text-red-600" />;
    if (score >= 60) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <AlertTriangle className="w-4 h-4 text-blue-600" />;
  };

  const getUrgencyColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const getUrgencyLabel = (score: number) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'Warning';
    return 'Low Stock';
  };

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
              onClick={() => setUrgencyFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                urgencyFilter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setUrgencyFilter('critical')}
              className={`px-4 py-2 text-sm font-medium ${
                urgencyFilter === 'critical'
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Critical
            </button>
            <button
              onClick={() => setUrgencyFilter('warning')}
              className={`px-4 py-2 text-sm font-medium ${
                urgencyFilter === 'warning'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Warning
            </button>
            <button
              onClick={() => setUrgencyFilter('low')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                urgencyFilter === 'low'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Low Stock
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
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Critical Items
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(criticalItems)}
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
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Warning Items
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(warningItems)}
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
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Low Stock
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(totalLowStockItems)}
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
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Estimated Shortage Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(estimatedShortageValue)}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Financial Impact */}
      {financialImpact && Object.keys(financialImpact).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Financial Impact Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 mb-2">
                  {formatNumber(criticalItems)}
                </div>
                <div className="text-sm text-gray-600">Critical Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 mb-2">
                  {formatNumber(categoriesAffected)}
                </div>
                <div className="text-sm text-gray-600">Categories Affected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-2">
                  {formatCurrency(estimatedShortageValue)}
                </div>
                <div className="text-sm text-gray-600">Estimated Shortage Value</div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgency Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Urgency Level Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={urgencyChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {urgencyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatNumber(value as number), 'Items']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Low Stock Items by Category
            </h3>
            <div className="h-64">
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
                    formatter={(value, name) => [
                      formatNumber(value as number), 
                      name === 'count' ? 'Items' : name === 'critical' ? 'Critical Items' : 'Value'
                    ]}
                  />
                  <Bar dataKey="count" fill="#3b82f6" name="count" />
                  <Bar dataKey="critical" fill="#ef4444" name="critical" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Urgent Items Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Urgent Stock Items ({filteredItems.length} items)
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
                    Current Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reorder Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Recommended Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Urgency Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estimated Shortage Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Days Until Stockout
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item: any, index: number) => (
                  <tr key={item.id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.sku}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatNumber(item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatNumber(item.reorder_level)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatNumber(item.recommended_order_quantity || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(item.urgency_score)}`}>
                        {getUrgencyIcon(item.urgency_score)}
                        <span className="ml-1">
                          {getUrgencyLabel(item.urgency_score)} ({Math.round(item.urgency_score)}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatCurrency(item.estimated_shortage_value || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-400 mr-1" />
                        {item.estimated_stockout_days || 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default LowStockAlertsReport;
