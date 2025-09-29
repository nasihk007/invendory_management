import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  FileText, 
  AlertTriangle,
  BarChart3,
  Settings,
  X,
  ArrowRight,
  ArrowLeft,
  Filter,
  Calendar,
  Database,
  CheckCircle
} from 'lucide-react';
import { useBulkOperations } from '@/hooks/useCsv';
import { BulkExportProductsOptions, BulkExportAuditOptions } from '@/types/bulk';
import Button from '@/components/common/ButtonSimple';
import Card from '@/components/common/CardSimple';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/ModalSimple';
import Input from '@/components/common/InputSimple';

interface CsvExportWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const CsvExportWizard: React.FC<CsvExportWizardProps> = ({ isOpen, onClose }) => {
  const {
    exportProducts,
    exportAudit,
    exportLowStock,
    exportSummary,
    isExportingProducts,
    isExportingAudit,
    isExportingLowStock,
    isExportingSummary,
  } = useBulkOperations();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedExportType, setSelectedExportType] = useState<'products' | 'audit' | 'low-stock' | 'summary'>('products');
  const [exportOptions, setExportOptions] = useState<BulkExportProductsOptions | BulkExportAuditOptions>({});

  const steps = [
    { id: 'select', title: 'Select Export Type', description: 'Choose what data to export' },
    { id: 'configure', title: 'Configure Options', description: 'Set export filters and options' },
    { id: 'export', title: 'Export Data', description: 'Generate and download the file' },
  ];

  const exportTypes = [
    {
      id: 'products',
      title: 'Products Export',
      description: 'Export all products with filtering options',
      icon: Database,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
    },
    {
      id: 'audit',
      title: 'Audit Records',
      description: 'Export inventory audit and change history',
      icon: FileText,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    {
      id: 'low-stock',
      title: 'Low Stock Report',
      description: 'Export low stock and out-of-stock products',
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-600',
    },
    {
      id: 'summary',
      title: 'Inventory Summary',
      description: 'Export comprehensive inventory summary by category',
      icon: BarChart3,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
    },
  ];

  const handleExportTypeSelect = (type: 'products' | 'audit' | 'low-stock' | 'summary') => {
    setSelectedExportType(type);
    setCurrentStep(1);
  };

  const handleExport = () => {
    switch (selectedExportType) {
      case 'products':
        exportProducts(exportOptions as BulkExportProductsOptions);
        break;
      case 'audit':
        exportAudit(exportOptions as BulkExportAuditOptions);
        break;
      case 'low-stock':
        exportLowStock({ includeOutOfStock: true });
        break;
      case 'summary':
        exportSummary();
        break;
    }
    setCurrentStep(2);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setSelectedExportType('products');
    setExportOptions({});
    onClose();
  };

  const updateExportOptions = (options: Partial<BulkExportProductsOptions | BulkExportAuditOptions>) => {
    setExportOptions(prev => ({ ...prev, ...options }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Download className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select Export Type</h3>
              <p className="text-gray-600">
                Choose what type of data you want to export
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleExportTypeSelect(type.id as any)}
                    className={`${type.color} ${type.hoverColor} text-white p-6 rounded-lg text-left transition-colors duration-200`}
                  >
                    <Icon className="w-8 h-8 mb-3" />
                    <h4 className="font-medium text-lg mb-2">{type.title}</h4>
                    <p className="text-sm opacity-90">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Settings className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Configure Export Options</h3>
              <p className="text-gray-600">
                Set filters and options for your {exportTypes.find(t => t.id === selectedExportType)?.title}
              </p>
            </div>

            {selectedExportType === 'products' && (
              <Card>
                <h4 className="font-medium text-gray-900 mb-4">Product Export Options</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category Filter
                    </label>
                    <Input
                      type="text"
                      placeholder="Leave empty for all categories"
                      value={(exportOptions as BulkExportProductsOptions).category || ''}
                      onChange={(e) => updateExportOptions({ category: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Low Stock Only
                      </label>
                      <p className="text-xs text-gray-500">
                        Export only products below reorder level
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={(exportOptions as BulkExportProductsOptions).lowStockOnly || false}
                      onChange={(e) => updateExportOptions({ lowStockOnly: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Include Audit Data
                      </label>
                      <p className="text-xs text-gray-500">
                        Include audit trail information
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={(exportOptions as BulkExportProductsOptions).includeAuditData || false}
                      onChange={(e) => updateExportOptions({ includeAuditData: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Export Format
                    </label>
                    <select
                      value={(exportOptions as BulkExportProductsOptions).format || 'standard'}
                      onChange={(e) => updateExportOptions({ format: e.target.value as 'standard' | 'minimal' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="standard">Standard (All Fields)</option>
                      <option value="minimal">Minimal (Essential Fields Only)</option>
                    </select>
                  </div>
                </div>
              </Card>
            )}

            {selectedExportType === 'audit' && (
              <Card>
                <h4 className="font-medium text-gray-900 mb-4">Audit Export Options</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date From
                      </label>
                      <Input
                        type="date"
                        value={(exportOptions as BulkExportAuditOptions).dateFrom || ''}
                        onChange={(e) => updateExportOptions({ dateFrom: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date To
                      </label>
                      <Input
                        type="date"
                        value={(exportOptions as BulkExportAuditOptions).dateTo || ''}
                        onChange={(e) => updateExportOptions({ dateTo: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Operation Type
                    </label>
                    <select
                      value={(exportOptions as BulkExportAuditOptions).operationType || ''}
                      onChange={(e) => updateExportOptions({ operationType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Operations</option>
                      <option value="manual_adjustment">Manual Adjustment</option>
                      <option value="sale">Sale</option>
                      <option value="purchase">Purchase</option>
                      <option value="damage">Damage</option>
                      <option value="transfer">Transfer</option>
                      <option value="correction">Correction</option>
                      <option value="bulk_import">Bulk Import</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product ID (Optional)
                      </label>
                      <Input
                        type="number"
                        placeholder="Filter by specific product"
                        value={(exportOptions as BulkExportAuditOptions).productId || ''}
                        onChange={(e) => updateExportOptions({ productId: parseInt(e.target.value) || undefined })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        User ID (Optional)
                      </label>
                      <Input
                        type="number"
                        placeholder="Filter by specific user"
                        value={(exportOptions as BulkExportAuditOptions).userId || ''}
                        onChange={(e) => updateExportOptions({ userId: parseInt(e.target.value) || undefined })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Export Format
                    </label>
                    <select
                      value={(exportOptions as BulkExportAuditOptions).format || 'detailed'}
                      onChange={(e) => updateExportOptions({ format: e.target.value as 'standard' | 'detailed' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="standard">Standard</option>
                      <option value="detailed">Detailed (Includes User Roles)</option>
                    </select>
                  </div>
                </div>
              </Card>
            )}

            {selectedExportType === 'low-stock' && (
              <Card>
                <h4 className="font-medium text-gray-900 mb-4">Low Stock Report Options</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Include Out of Stock Items
                      </label>
                      <p className="text-xs text-gray-500">
                        Include products with zero quantity
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <h5 className="font-medium text-yellow-800">Low Stock Report Includes:</h5>
                    </div>
                    <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                      <li>Current quantity and reorder levels</li>
                      <li>Shortage amounts and urgency scores</li>
                      <li>Suggested order quantities</li>
                      <li>Estimated reorder costs</li>
                    </ul>
                  </div>
                </div>
              </Card>
            )}

            {selectedExportType === 'summary' && (
              <Card>
                <h4 className="font-medium text-gray-900 mb-4">Inventory Summary Export</h4>
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                      <h5 className="font-medium text-purple-800">Summary Report Includes:</h5>
                    </div>
                    <ul className="list-disc list-inside text-sm text-purple-700 space-y-1">
                      <li>Category-wise product counts and values</li>
                      <li>Stock health percentages</li>
                      <li>Low stock and out-of-stock counts</li>
                      <li>Average unit prices by category</li>
                      <li>Overall inventory statistics</li>
                    </ul>
                  </div>
                </div>
              </Card>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Download className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Export Complete</h3>
              <p className="text-gray-600">
                Your {exportTypes.find(t => t.id === selectedExportType)?.title} has been generated and downloaded
              </p>
            </div>

            <Card>
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Export Successful!</h4>
                <p className="text-gray-600 mb-4">
                  The file has been automatically downloaded to your computer.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <strong>Note:</strong> Export files are automatically deleted after 24 hours for security.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const isLoading = isExportingProducts || isExportingAudit || isExportingLowStock || isExportingSummary;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Export Data</h2>
            <p className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="ml-3 hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{step.title}</p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 h-0.5 bg-gray-200 mx-4 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Generating export file...</p>
          </div>
        )}

        {/* Step Content */}
        {!isLoading && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Navigation Buttons */}
        {!isLoading && (
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Previous
            </Button>

            <div className="flex items-center space-x-3">
              {currentStep === 1 && (
                <Button
                  onClick={handleExport}
                  icon={<Download className="w-4 h-4" />}
                >
                  Export Data
                </Button>
              )}
              
              {currentStep < steps.length - 1 && currentStep !== 1 && (
                <Button
                  onClick={handleNext}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              )}
              
              {currentStep === steps.length - 1 && (
                <Button onClick={handleClose}>
                  Close
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CsvExportWizard;
