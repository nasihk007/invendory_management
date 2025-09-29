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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ArrowUpDown,
  Activity,
  Calendar,
  Filter
} from 'lucide-react';
import { useStockMovementReport } from '@/hooks/useReports';
import { ReportFilters } from '@/types/report';
import { formatNumber, formatDate } from '@/utils/formatters';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';

interface StockMovementReportProps {
  filters?: ReportFilters;
  onExport?: () => void;
}

const StockMovementReport: React.FC<StockMovementReportProps> = ({ 
  filters, 
  onExport 
}) => {
  const { data, isLoading, error } = useStockMovementReport(filters);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Loading stock movement data..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <Activity className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to load stock movement data
        </h3>
        <p className="text-gray-600">
          Unable to fetch stock movement report. Please try again later.
        </p>
      </Card>
    );
  }

  const reportData = data?.data?.data;
  const summary = reportData?.summary || {};
  const dailyBreakdown = reportData?.daily_breakdown || [];
  const operationBreakdown = reportData?.operation_breakdown || [];
  const efficiencyMetrics = reportData?.efficiency_metrics || {};
  const mostActiveProducts = reportData?.most_active_products || [];
  const mostActiveUsers = reportData?.most_active_users || [];

  // Calculate summary metrics from actual API data
  const totalMovements = summary.total_movements || 0;
  const stockIncrease = summary.total_stock_increase || 0;
  const stockDecrease = summary.total_stock_decrease || 0;
  const netStockChange = summary.net_stock_change || 0;
  const uniqueProductsAffected = summary.unique_products_affected || 0;
  const uniqueUsersInvolved = summary.unique_users_involved || 0;
  const operationTypes = summary.operation_types_used || 0;

  // Prepare chart data from actual API structure
  const operationChartData = operationBreakdown.map((op: any) => ({
    name: op.operation_type.replace('_', ' ').toUpperCase(),
    movements: op.total_movements,
    net_change: op.net_change,
    total_increase: op.total_increase,
    total_decrease: op.total_decrease,
    unique_products: op.unique_products,
    unique_users: op.unique_users,
    percentage: totalMovements > 0 ? ((op.total_movements / totalMovements) * 100).toFixed(1) : '0'
  }));

  const dailyChartData = dailyBreakdown.slice(0, 30).map((day: any) => ({
    date: formatDate(day.date, true).split(' ')[0], // Get just the date part
    movements: day.total_movements,
    increase: day.total_increase,
    decrease: day.total_decrease,
    net_change: day.net_change,
    unique_products: day.unique_products,
    unique_users: day.unique_users
  }));

  const movementTypes = [
    { name: 'Stock Increases', value: stockIncrease, color: '#10b981' },
    { name: 'Stock Decreases', value: Math.abs(stockDecrease), color: '#ef4444' }
  ];

  const getOperationColor = (operation: string) => {
    const colors: Record<string, string> = {
      'purchase': '#10b981',
      'sale': '#ef4444',
      'manual_adjustment': '#f59e0b',
      'damage': '#ef4444',
      'transfer': '#3b82f6',
      'correction': '#8b5cf6',
      'bulk_import': '#06b6d4'
    };
    return colors[operation] || '#6b7280';
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
              onClick={() => setSelectedTimeframe('daily')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                selectedTimeframe === 'daily'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setSelectedTimeframe('weekly')}
              className={`px-4 py-2 text-sm font-medium ${
                selectedTimeframe === 'weekly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setSelectedTimeframe('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                selectedTimeframe === 'monthly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Monthly
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
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Movements
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(totalMovements)}
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
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Stock Increases
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(stockIncrease)}
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
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Products Affected
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(uniqueProductsAffected)}
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
                  <ArrowUpDown className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Users Involved
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(uniqueUsersInvolved)}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Movement Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Movement Trend (Last 30 Days)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="movements" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Total Movements"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="net_change" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Net Change"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Operation Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Movement Types Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={movementTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {movementTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatNumber(value as number), 'Quantity']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Operation Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Movement Breakdown by Operation Type
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operationChartData}>
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
                    name === 'movements' ? 'Movements' : 'Net Change'
                  ]}
                />
                <Bar dataKey="movements" fill="#3b82f6" name="movements" />
                <Bar dataKey="net_change" fill="#10b981" name="net_change" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Efficiency Metrics */}
      {efficiencyMetrics && Object.keys(efficiencyMetrics).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Efficiency Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Movement Frequency</span>
                  <span className="text-sm font-medium text-gray-900">
                    {efficiencyMetrics.movement_frequency?.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((efficiencyMetrics.movement_frequency || 0) * 10, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Stock Velocity</span>
                  <span className="text-sm font-medium text-gray-900">
                    {efficiencyMetrics.stock_velocity?.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((efficiencyMetrics.stock_velocity || 0) * 20, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Operational Diversity</span>
                  <span className="text-sm font-medium text-gray-900">
                    {efficiencyMetrics.operational_diversity || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(((efficiencyMetrics.operational_diversity || 0) / 7) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Detailed Operation Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Operation Type Details
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Operation Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Movements
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Net Change
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Products
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Users
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {operationChartData.map((operation: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: getOperationColor(operation.name.toLowerCase().replace(' ', '_')) }}
                        ></div>
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {operation.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatNumber(operation.movements)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className={operation.net_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {operation.net_change >= 0 ? '+' : ''}{formatNumber(operation.net_change)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatNumber(operation.unique_products)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatNumber(operation.unique_users)}
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

export default StockMovementReport;
