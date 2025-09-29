import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  DollarSign, 
  Calendar,
  FileText,
  Eye,
  Download
} from 'lucide-react';
import { useAvailableReports } from '@/hooks/useReports';
import { AvailableReport } from '@/types/report';
import { formatDate } from '@/utils/formatters';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ReportsListProps {
  onSelectReport: (report: AvailableReport) => void;
  onExportReport?: (report: AvailableReport) => void;
}

const ReportsList: React.FC<ReportsListProps> = ({ onSelectReport, onExportReport }) => {
  const { data: reportsData, isLoading, error } = useAvailableReports();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const getReportIcon = (reportName: string) => {
    const name = reportName.toLowerCase();
    if (name.includes('inventory') || name.includes('valuation')) return DollarSign;
    if (name.includes('sales')) return TrendingUp;
    if (name.includes('user') || name.includes('activity')) return Users;
    if (name.includes('stock') || name.includes('low')) return AlertTriangle;
    if (name.includes('executive') || name.includes('summary')) return FileText;
    if (name.includes('movement') || name.includes('daily')) return Calendar;
    return BarChart3;
  };

  const isReportAvailable = (endpoint: string) => {
    // These endpoints are implemented and working on the backend based on API responses
    const availableEndpoints = [
      '/api/reports/low-stock-alerts',
      '/api/reports/inventory-valuation',
      '/api/reports/executive-summary',
      '/api/reports/sales-performance',
      '/api/reports/user-activity',
      '/api/reports/stock-movement'
    ];
    return availableEndpoints.includes(endpoint);
  };

  const getReportColor = (reportName: string) => {
    const name = reportName.toLowerCase();
    if (name.includes('inventory') || name.includes('valuation')) return 'bg-green-500';
    if (name.includes('sales')) return 'bg-blue-500';
    if (name.includes('user') || name.includes('activity')) return 'bg-purple-500';
    if (name.includes('stock') || name.includes('low')) return 'bg-red-500';
    if (name.includes('executive') || name.includes('summary')) return 'bg-indigo-500';
    if (name.includes('movement') || name.includes('daily')) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" text="Loading available reports..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to load reports
        </h3>
        <p className="text-gray-600">
          Unable to fetch available reports. Please try again later.
        </p>
      </Card>
    );
  }

  const reports = reportsData?.data?.data?.available_reports || [];
  const reportFeatures = reportsData?.data?.data?.report_features;
  const usageGuidelines = reportsData?.data?.data?.usage_guidelines;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h2 className="text-2xl font-bold text-gray-900">Available Reports</h2>
        <p className="text-gray-600">
          Select a report to view detailed analytics and insights
        </p>
      </motion.div>

      {/* Report Features Info */}
      {reportFeatures && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Report Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Real-time Data:</span>
                  <p className="text-gray-600">{reportFeatures.real_time_data}</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Historical Analysis:</span>
                  <p className="text-gray-600">{reportFeatures.historical_analysis}</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Export Integration:</span>
                  <p className="text-gray-600">{reportFeatures.export_integration}</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Customizable Filters:</span>
                  <p className="text-gray-600">{reportFeatures.customizable_filters}</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Reports Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {reports.map((report, index) => {
          const IconComponent = getReportIcon(report.name);
          const colorClass = getReportColor(report.name);
          const isAvailable = isReportAvailable(report.endpoint);
          
          return (
            <motion.div
              key={report.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Card className={`h-full transition-shadow duration-200 ${isAvailable ? 'hover:shadow-lg' : 'opacity-75'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${colorClass} rounded-lg flex items-center justify-center`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right space-y-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      report.access_level === 'manager' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {report.access_level}
                    </span>
                    {!isAvailable && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {report.name}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {report.description}
                </p>

                {/* Parameters */}
                {report.parameters.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Available Parameters:</p>
                    <div className="flex flex-wrap gap-1">
                      {report.parameters.slice(0, 3).map((param) => (
                        <span
                          key={param}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          {param}
                        </span>
                      ))}
                      {report.parameters.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                          +{report.parameters.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedReport(report.name);
                      onSelectReport(report);
                    }}
                    icon={<Eye className="w-4 h-4" />}
                    className="flex-1"
                    disabled={!isAvailable}
                  >
                    {isAvailable ? 'View Report' : 'Coming Soon'}
                  </Button>
                  
                  {onExportReport && isAvailable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onExportReport(report)}
                      icon={<Download className="w-4 h-4" />}
                    >
                      Export
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Usage Guidelines */}
      {usageGuidelines && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Usage Guidelines</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Date Formats:</span>
                <p className="text-gray-600">{usageGuidelines.date_formats}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Performance:</span>
                <p className="text-gray-600">{usageGuidelines.performance}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Caching:</span>
                <p className="text-gray-600">{usageGuidelines.caching}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Access Control:</span>
                <p className="text-gray-600">{usageGuidelines.access_control}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default ReportsList;
