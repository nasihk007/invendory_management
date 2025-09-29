import React from 'react';
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
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  Users,
  Activity,
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  BarChart3
} from 'lucide-react';
import { useExecutiveSummaryReport } from '@/hooks/useReports';
import { ExecutiveSummaryReport as ExecutiveData, ReportFilters } from '@/types/report';
import { formatCurrency, formatNumber, formatDate } from '@/utils/formatters';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';

interface ExecutiveSummaryReportProps {
  filters?: ReportFilters;
  onExport?: () => void;
}

const ExecutiveSummaryReport: React.FC<ExecutiveSummaryReportProps> = ({ 
  filters, 
  onExport 
}) => {
  const { data, isLoading, error } = useExecutiveSummaryReport(filters);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Loading executive summary..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to load executive summary
        </h3>
        <p className="text-gray-600">
          Unable to fetch executive summary report. Please try again later.
        </p>
      </Card>
    );
  }

  const summaryData = data?.data?.data?.executive_summary;
  if (!summaryData) {
    return (
      <Card className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No data available
        </h3>
        <p className="text-gray-600">
          No executive summary data available for the selected period.
        </p>
      </Card>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-600 bg-green-50';
      case 'down': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAlertIcon = (type: 'critical' | 'warning' | 'info') => {
    switch (type) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getAlertColor = (type: 'critical' | 'warning' | 'info') => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  // Prepare data for charts based on actual API response structure
  const kpiData = [
    { name: 'Inventory Turnover', value: summaryData.key_metrics?.inventory?.total_value || 0, target: 260000 },
    { name: 'Stock Health', value: summaryData.key_metrics?.inventory?.stock_health_score || 0, target: 100 },
    { name: 'Operational Efficiency', value: summaryData.performance_indicators?.operational_efficiency || 0, target: 10 },
    { name: 'Alert Severity', value: summaryData.performance_indicators?.alert_severity || 0, target: 25 },
  ];

  const trendData = [
    { name: 'Total Products', value: summaryData.key_metrics?.inventory?.total_products || 0 },
    { name: 'Critical Alerts', value: summaryData.key_metrics?.alerts?.critical_stock_items || 0 },
    { name: 'Warning Alerts', value: summaryData.key_metrics?.alerts?.warning_stock_items || 0 },
  ];

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

      {/* Key Metrics Cards */}
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
                  <Package className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Products
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(summaryData.key_metrics?.inventory?.total_products || 0)}
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
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Inventory Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(summaryData.key_metrics?.inventory?.total_value || 0)}
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
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Low Stock Items
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber((summaryData.key_metrics?.alerts?.critical_stock_items || 0) + (summaryData.key_metrics?.alerts?.warning_stock_items || 0))}
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
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(summaryData.key_metrics?.operations?.active_users || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* KPI Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Key Performance Indicators
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpiData}>
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
                    `${value}${name === 'target' ? '%' : ''}`, 
                    name === 'target' ? 'Target' : 'Current'
                  ]}
                />
                <Bar dataKey="value" fill="#3b82f6" name="Current" />
                <Bar dataKey="target" fill="#e5e7eb" name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Trends and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Business Trends
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">Inventory Turnover</span>
                <span className="text-sm text-gray-600">
                  {summaryData.performance_indicators?.inventory_turnover || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">Stock Efficiency</span>
                <span className="text-sm text-gray-600">
                  {summaryData.performance_indicators?.stock_efficiency || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">Operational Efficiency</span>
                <span className="text-sm text-gray-600">
                  {summaryData.performance_indicators?.operational_efficiency || 0}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              System Alerts
            </h3>
            <div className="space-y-3">
              {summaryData.top_insights && summaryData.top_insights.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No insights at this time</p>
                </div>
              ) : (
                summaryData.top_insights?.map((insight, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 p-3 rounded-lg border ${
                      insight.impact === 'negative' ? 'bg-red-50 border-red-200' :
                      insight.impact === 'positive' ? 'bg-green-50 border-green-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    {insight.impact === 'negative' ? getAlertIcon('critical') :
                     insight.impact === 'positive' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                     <Info className="w-5 h-5 text-blue-600" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {insight.insight}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Category: {insight.category}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Additional Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Additional Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {formatNumber(summaryData.key_metrics?.alerts?.critical_stock_items || 0)}
              </div>
              <div className="text-sm text-gray-600">Critical Stock Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {formatNumber(summaryData.key_metrics?.operations?.total_stock_movements || 0)}
              </div>
              <div className="text-sm text-gray-600">Total Stock Movements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {summaryData.key_metrics?.alerts?.estimated_shortage_value ? formatCurrency(summaryData.key_metrics.alerts.estimated_shortage_value) : '$0'}
              </div>
              <div className="text-sm text-gray-600">Estimated Shortage Value</div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default ExecutiveSummaryReport;
