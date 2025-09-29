import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Download,
  ArrowRight,
  ArrowLeft,
  X,
  Settings,
  Eye,
  Play
} from 'lucide-react';
import { useBulkOperations } from '@/hooks/useCsv';
import { BulkImportState } from '@/types/bulk';
import Button from '@/components/common/ButtonSimple';
import Card from '@/components/common/CardSimple';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/ModalSimple';
import Input from '@/components/common/InputSimple';

interface CsvImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const CsvImportWizard: React.FC<CsvImportWizardProps> = ({ isOpen, onClose }) => {
  const {
    importState,
    progress,
    uploadFile,
    importProducts,
    downloadTemplate,
    resetImport,
    updateImportOptions,
    isUploading,
    isImporting,
    uploadResponse,
    importResponse,
  } = useBulkOperations();

  const [currentStep, setCurrentStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const steps = [
    { id: 'upload', title: 'Upload File', description: 'Select and upload your CSV file' },
    { id: 'preview', title: 'Preview & Configure', description: 'Review data and configure import options' },
    { id: 'import', title: 'Import Products', description: 'Execute the import process' },
    { id: 'complete', title: 'Complete', description: 'Review import results' },
  ];

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      uploadFile(file);
      setCurrentStep(1);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleImport = () => {
    if (importState.importOptions.filePath) {
      importProducts(importState.importOptions);
      setCurrentStep(3);
    }
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
    resetImport();
    setCurrentStep(0);
    setShowPreview(false);
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload CSV File</h3>
              <p className="text-gray-600">
                Select a CSV file containing product data to import
              </p>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-blue-600">Drop the CSV file here...</p>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    Drag & drop a CSV file here, or click to select
                  </p>
                  <p className="text-sm text-gray-500">
                    Maximum file size: 10MB • Supported format: CSV
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                icon={<Download className="w-4 h-4" />}
              >
                Download Template
              </Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">File Validation</h3>
                <p className="text-gray-600">
                  Review the validation results and configure import options
                </p>
              </div>
              {uploadResponse?.validation.valid && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">File Valid</span>
                </div>
              )}
            </div>

            {uploadResponse && (
              <div className="space-y-4">
                {/* File Info */}
                <Card>
                  <h4 className="font-medium text-gray-900 mb-3">File Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">File Name:</span>
                      <p className="font-medium">{uploadResponse.file_info.original_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">File Size:</span>
                      <p className="font-medium">
                        {(uploadResponse.file_info.file_size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Rows:</span>
                      <p className="font-medium">{uploadResponse.validation.total_rows}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Headers:</span>
                      <p className="font-medium">{uploadResponse.validation.headers.length}</p>
                    </div>
                  </div>
                </Card>

                {/* Validation Results */}
                <Card>
                  <h4 className="font-medium text-gray-900 mb-3">Validation Results</h4>
                  {uploadResponse.validation.errors.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 text-red-600 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Errors Found</span>
                      </div>
                      <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                        {uploadResponse.validation.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {uploadResponse.validation.warnings.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 text-yellow-600 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Warnings</span>
                      </div>
                      <ul className="list-disc list-inside text-sm text-yellow-600 space-y-1">
                        {uploadResponse.validation.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {uploadResponse.validation.valid && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">File is valid and ready for import</span>
                    </div>
                  )}
                </Card>

                {/* Import Options */}
                <Card>
                  <h4 className="font-medium text-gray-900 mb-3">Import Options</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Update Existing Products
                        </label>
                        <p className="text-xs text-gray-500">
                          Update existing products if SKU matches
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={importState.importOptions.updateExisting}
                        onChange={(e) =>
                          updateImportOptions({ updateExisting: e.target.checked })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Skip Errors
                        </label>
                        <p className="text-xs text-gray-500">
                          Continue importing even if some rows fail
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={importState.importOptions.skipErrors}
                        onChange={(e) =>
                          updateImportOptions({ skipErrors: e.target.checked })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Batch Size
                      </label>
                      <Input
                        type="number"
                        value={importState.importOptions.batchSize}
                        onChange={(e) =>
                          updateImportOptions({ batchSize: parseInt(e.target.value) || 100 })
                        }
                        min="10"
                        max="500"
                        className="w-32"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Number of products to process at once (10-500)
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Play className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Import</h3>
              <p className="text-gray-600">
                Review your settings and start the import process
              </p>
            </div>

            {uploadResponse && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">Import Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">File:</span>
                    <p className="font-medium text-blue-900">{uploadResponse.file_info.original_name}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Rows:</span>
                    <p className="font-medium text-blue-900">{uploadResponse.validation.total_rows}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Update Existing:</span>
                    <p className="font-medium text-blue-900">
                      {importState.importOptions.updateExisting ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <span className="text-blue-700">Batch Size:</span>
                    <p className="font-medium text-blue-900">{importState.importOptions.batchSize}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <Button
                onClick={handleImport}
                disabled={isImporting}
                icon={<Play className="w-4 h-4" />}
                className="px-8"
              >
                {isImporting ? 'Importing...' : 'Start Import'}
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete</h3>
              <p className="text-gray-600">
                The import process has been completed successfully
              </p>
            </div>

            {importResponse && (
              <div className="space-y-4">
                {/* Import Results */}
                <Card>
                  <h4 className="font-medium text-gray-900 mb-3">Import Results</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Rows:</span>
                      <p className="font-medium">{importResponse.import_results.total_rows}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Successful:</span>
                      <p className="font-medium text-green-600">
                        {importResponse.import_results.successful_imports}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium text-blue-600">
                        {importResponse.import_results.created_products}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Updated:</span>
                      <p className="font-medium text-orange-600">
                        {importResponse.import_results.updated_products}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Failed:</span>
                      <p className="font-medium text-red-600">
                        {importResponse.import_results.failed_imports}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Success Rate:</span>
                      <p className="font-medium">{importResponse.performance.success_rate.toFixed(1)}%</p>
                    </div>
                  </div>
                </Card>

                {/* Validation Errors */}
                {importResponse.import_results.validation_errors && importResponse.import_results.validation_errors.length > 0 && (
                  <Card>
                    <h4 className="font-medium text-red-900 mb-3 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      Validation Errors ({importResponse.import_results.validation_errors.length})
                    </h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {importResponse.import_results.validation_errors.map((error, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-red-900">
                                Row {error.row}: {error.error}
                              </p>
                              <div className="mt-2 text-sm text-red-700">
                                <p className="font-medium">Data:</p>
                                <div className="mt-1 bg-white p-2 rounded border text-xs font-mono">
                                  {Object.entries(error.data).map(([key, value]) => (
                                    <div key={key} className="flex">
                                      <span className="font-medium w-24 text-gray-600">{key}:</span>
                                      <span className="ml-2">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Import Errors */}
                {importResponse.import_results.errors && importResponse.import_results.errors.length > 0 && (
                  <Card>
                    <h4 className="font-medium text-red-900 mb-3 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      Import Errors ({importResponse.import_results.errors.length})
                    </h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {importResponse.import_results.errors.map((error, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="font-medium text-red-900">
                            Row {error.row}: {error.error}
                          </p>
                          <p className="text-sm text-red-700 mt-1">SKU: {error.sku}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Recommendations */}
                {importResponse.recommendations.length > 0 && (
                  <Card>
                    <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
                    <div className="space-y-2">
                      {importResponse.recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg ${
                            rec.type === 'success'
                              ? 'bg-green-50 border border-green-200'
                              : rec.type === 'warning'
                              ? 'bg-yellow-50 border border-yellow-200'
                              : rec.type === 'error'
                              ? 'bg-red-50 border border-red-200'
                              : 'bg-blue-50 border border-blue-200'
                          }`}
                        >
                          <p className={`text-sm font-medium ${
                            rec.type === 'success'
                              ? 'text-green-800'
                              : rec.type === 'warning'
                              ? 'text-yellow-800'
                              : rec.type === 'error'
                              ? 'text-red-800'
                              : 'text-blue-800'
                          }`}>
                            {rec.message}
                          </p>
                          {rec.action && (
                            <p className={`text-xs mt-1 ${
                              rec.type === 'success'
                                ? 'text-green-600'
                                : rec.type === 'warning'
                                ? 'text-yellow-600'
                                : rec.type === 'error'
                                ? 'text-red-600'
                                : 'text-blue-600'
                            }`}>
                              {rec.action}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import Products</h2>
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
        {(isUploading || isImporting) && (
          <div className="text-center py-8">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">{progress.message}</p>
          </div>
        )}

        {/* Step Content */}
        {!isUploading && !isImporting && (
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
        {!isUploading && !isImporting && (
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
              {currentStep === 1 && uploadResponse?.validation.valid && (
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                  icon={<Eye className="w-4 h-4" />}
                >
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              )}
              
              {currentStep < steps.length - 1 && currentStep !== 2 && (
                <Button
                  onClick={handleNext}
                  disabled={currentStep === 1 && !uploadResponse?.validation.valid}
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

export default CsvImportWizard;
