import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Download, 
  FileText, 
  Settings, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  Info,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useBulkOperations } from '@/hooks/useCsv';
import { BulkImportState } from '@/types/bulk';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CsvImportWizard from './CsvImportWizard';
import CsvExportWizard from './CsvExportWizard';
import { toast } from 'react-hot-toast';
import BulkOperationsStats from './BulkOperationsStats';

const BulkOperationsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'stats' | 'settings'>('import');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showExportWizard, setShowExportWizard] = useState(false);

  const {
    exportLowStock,
    exportSummary,
    downloadTemplate,
    isExportingLowStock,
    isExportingSummary,
    isDownloadingTemplate
  } = useBulkOperations();

  const tabs = [
    { id: 'import', label: 'Import Products', icon: Upload, description: 'Upload and import products from CSV' },
    { id: 'export', label: 'Export Data', icon: Download, description: 'Export products and reports to CSV' },
    { id: 'stats', label: 'Statistics', icon: BarChart3, description: 'View bulk operations statistics' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Manage bulk operations settings' },
  ];

  const quickActions = [
    {
      title: 'Quick Import',
      description: 'Import products from CSV file',
      icon: Upload,
      action: () => setShowImportWizard(true),
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Export Products',
      description: 'Export all products to CSV',
      icon: Download,
      action: () => setShowExportWizard(true),
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'Low Stock Report',
      description: 'Export low stock products',
      icon: AlertTriangle,
      action: async () => {
        try {
          await exportLowStock({ includeOutOfStock: true });
          toast.success('Low stock report exported successfully');
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to export low stock report');
        }
      },
      color: 'bg-yellow-500 hover:bg-yellow-600',
      loading: isExportingLowStock,
    },
    {
      title: 'Download Template',
      description: 'Get CSV import template',
      icon: FileText,
      action: async () => {
        try {
          await downloadTemplate();
          toast.success('Template downloaded successfully');
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to download template');
        }
      },
      color: 'bg-purple-500 hover:bg-purple-600',
      loading: isDownloadingTemplate,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Operations</h1>
          <p className="text-gray-600">
            Manage CSV imports, exports, and bulk data operations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                onClick={action.action}
                disabled={action.loading}
                className={`${action.color} text-white p-4 rounded-lg text-left transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <action.icon className="w-6 h-6 mb-2" />
                <h3 className="font-medium text-sm mb-1">{action.title}</h3>
                <p className="text-xs opacity-90">{action.description}</p>
                {action.loading && (
                  <div className="mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'import' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Import Products</h3>
                    <p className="text-sm text-gray-600">
                      Upload CSV files to import products into your inventory
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowImportWizard(true)}
                    icon={<Upload className="w-4 h-4" />}
                  >
                    Start Import
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Import Guidelines:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Use the CSV template for proper formatting</li>
                        <li>Maximum file size: 10MB</li>
                        <li>Maximum records: 10,000 products per import</li>
                        <li>Required fields: SKU, Name, Category, Quantity, Price</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'export' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Export Data</h3>
                    <p className="text-sm text-gray-600">
                      Export products, audit records, and reports to CSV files
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowExportWizard(true)}
                    icon={<Download className="w-4 h-4" />}
                  >
                    Start Export
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Download className="w-5 h-5 text-green-600" />
                      <h4 className="font-medium text-green-800">Product Export</h4>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      Export all products with filtering options
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowExportWizard(true)}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      Export Products
                    </Button>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <h4 className="font-medium text-yellow-800">Low Stock Report</h4>
                    </div>
                    <p className="text-sm text-yellow-700 mb-3">
                      Export low stock and out-of-stock products
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {/* Export low stock */}}
                      className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                    >
                      Export Report
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <BulkOperationsStats />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Bulk Operations Settings</h3>
                  <p className="text-sm text-gray-600">
                    Configure default settings for bulk operations
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Clean Up Old Files</h4>
                      <p className="text-sm text-gray-600">
                        Remove expired export files and temporary uploads
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {/* Cleanup files */}}
                      icon={<Trash2 className="w-4 h-4" />}
                    >
                      Clean Up
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Import Wizard Modal */}
      {showImportWizard && (
        <CsvImportWizard
          isOpen={showImportWizard}
          onClose={() => setShowImportWizard(false)}
        />
      )}

      {/* Export Wizard Modal */}
      {showExportWizard && (
        <CsvExportWizard
          isOpen={showExportWizard}
          onClose={() => setShowExportWizard(false)}
        />
      )}
    </div>
  );
};

export default BulkOperationsDashboard;
