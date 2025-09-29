import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { bulkAPI } from '@/api/api';
import { parseCsvFile, validateCsvRow, downloadCsvFile } from '@/utils/csvUtils';
import { CsvProductRow } from '@/types/product';
import { 
  BulkImportState, 
  BulkImportOptions, 
  BulkExportProductsOptions,
  BulkExportAuditOptions,
  BulkExportLowStockOptions,
  BulkOperationProgress
} from '@/types/bulk';
import { toast } from 'react-hot-toast';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/utils/constants';

export const useBulkOperations = () => {
  const [importState, setImportState] = useState<BulkImportState>({
    uploadedFile: null,
    uploadResponse: null,
    importOptions: {
      filePath: '',
      updateExisting: false,
      skipErrors: true,
      validateOnly: false,
      batchSize: 100,
    },
    importResponse: null,
    isUploading: false,
    isImporting: false,
    step: 'upload',
  });

  const [progress, setProgress] = useState<BulkOperationProgress>({
    operation: 'upload',
    status: 'idle',
    progress: 0,
    message: '',
  });

  // Upload CSV file
  const uploadMutation = useMutation({
    mutationFn: (file: File) => bulkAPI.uploadCsv(file),
    onMutate: () => {
      setImportState(prev => ({ ...prev, isUploading: true }));
      setProgress({
        operation: 'upload',
        status: 'in_progress',
        progress: 0,
        message: 'Uploading file...',
      });
    },
    onSuccess: (response) => {
      const uploadResponse = response.data.data;
      setImportState(prev => ({
        ...prev,
        uploadResponse,
        importOptions: {
          ...prev.importOptions,
          filePath: uploadResponse.file_info.file_path,
        },
        step: 'preview',
        isUploading: false,
      }));
      
      const { validation } = uploadResponse;
      
      // Check for validation errors
      if (!validation.valid) {
        setProgress({
          operation: 'upload',
          status: 'error',
          progress: 0,
          message: 'File uploaded but has validation errors',
        });
        
        // Show validation errors
        validation.errors.forEach((error, index) => {
          toast.error(error, {
            duration: 5000,
            id: `upload-validation-error-${index}`,
          });
        });
        
        toast.error('File uploaded but contains validation errors. Please fix the issues before importing.', {
          duration: 8000,
        });
        return;
      }
      
      // Check for warnings
      if (validation.warnings && validation.warnings.length > 0) {
        setProgress({
          operation: 'upload',
          status: 'completed',
          progress: 100,
          message: 'File uploaded with warnings',
        });
        
        // Show warnings
        validation.warnings.forEach((warning, index) => {
          toast.error(warning, {
            duration: 4000,
            id: `upload-warning-${index}`,
          });
        });
        
        toast.success('File uploaded successfully with warnings. Review the warnings before importing.', {
          duration: 6000,
        });
        return;
      }
      
      // Success case - no errors or warnings
      setProgress({
        operation: 'upload',
        status: 'completed',
        progress: 100,
        message: 'File uploaded and validated successfully',
      });
      toast.success('File uploaded and validated successfully');
    },
    onError: (error: any) => {
      setImportState(prev => ({ ...prev, isUploading: false }));
      setProgress({
        operation: 'upload',
        status: 'error',
        progress: 0,
        message: error.response?.data?.message || 'Upload failed',
      });
      toast.error(error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR);
    },
  });

  // Import products from uploaded file
  const importMutation = useMutation({
    mutationFn: (options: BulkImportOptions) => bulkAPI.importProducts(options),
    onMutate: () => {
      setImportState(prev => ({ ...prev, isImporting: true }));
      setProgress({
        operation: 'import',
        status: 'in_progress',
        progress: 0,
        message: 'Importing products...',
      });
    },
    onSuccess: (response) => {
      const importResponse = response.data.data;
      setImportState(prev => ({
        ...prev,
        importResponse,
        step: 'complete',
        isImporting: false,
      }));
      
      const { successful_imports, failed_imports, total_rows, validation_errors, errors } = importResponse.import_results;
      
      // Check for validation errors
      if (validation_errors && validation_errors.length > 0) {
        setProgress({
          operation: 'import',
          status: 'error',
          progress: 0,
          message: `${validation_errors.length} rows have validation errors`,
        });
        
        // Show detailed validation errors
        validation_errors.forEach((error, index) => {
          toast.error(`Row ${error.row}: ${error.error}`, {
            duration: 5000,
            id: `validation-error-${index}`, // Prevent duplicate toasts
          });
        });
        
        // Show summary toast
        toast.error(`Import failed: ${validation_errors.length} rows have validation errors. Please fix the data and try again.`, {
          duration: 8000,
        });
        return;
      }
      
      // Check for import errors
      if (errors && errors.length > 0) {
        setProgress({
          operation: 'import',
          status: 'error',
          progress: 0,
          message: `${errors.length} rows failed to import`,
        });
        
        // Show import errors
        errors.forEach((error, index) => {
          toast.error(`Row ${error.row}: ${error.error}`, {
            duration: 5000,
            id: `import-error-${index}`,
          });
        });
        
        toast.error(`Import failed: ${errors.length} rows had errors. ${successful_imports} products were imported successfully.`, {
          duration: 8000,
        });
        return;
      }
      
      // Check for failed imports
      if (failed_imports > 0) {
        setProgress({
          operation: 'import',
          status: 'completed',
          progress: 100,
          message: `Import completed with warnings: ${successful_imports}/${total_rows} products imported`,
        });
        toast.error(`Import completed with warnings: ${successful_imports}/${total_rows} products imported. ${failed_imports} failed.`, {
          duration: 6000,
        });
        return;
      }
      
      // Success case
      setProgress({
        operation: 'import',
        status: 'completed',
        progress: 100,
        message: `Import completed: ${successful_imports} products imported successfully`,
      });
      
      if (successful_imports > 0) {
        toast.success(`Successfully imported ${successful_imports} product${successful_imports > 1 ? 's' : ''}`);
      } else {
        toast.info('No products were imported. Please check your data and try again.');
      }
    },
    onError: (error: any) => {
      setImportState(prev => ({ ...prev, isImporting: false }));
      setProgress({
        operation: 'import',
        status: 'error',
        progress: 0,
        message: error.response?.data?.message || 'Import failed',
      });
      toast.error(error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR);
    },
  });

  // Export products to CSV
  const exportProductsMutation = useMutation({
    mutationFn: (options: BulkExportProductsOptions) => bulkAPI.exportProducts(options),
    onSuccess: (response) => {
      const { download_info, export_results } = response.data.data;
      // Download the file
      downloadFile(download_info.filename, download_info.download_url);
      
      const { records_exported } = export_results;
      if (records_exported > 0) {
        toast.success(`Successfully exported ${records_exported} product${records_exported > 1 ? 's' : ''}`);
      } else {
        toast.info('No products found matching the export criteria');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR;
      toast.error(`Export failed: ${errorMessage}`, {
        duration: 6000,
      });
    },
  });

  // Export audit records to CSV
  const exportAuditMutation = useMutation({
    mutationFn: (options: BulkExportAuditOptions) => bulkAPI.exportAuditRecords(options),
    onSuccess: (response) => {
      const { download_info, export_results } = response.data.data;
      downloadFile(download_info.filename, download_info.download_url);
      
      const { records_exported } = export_results;
      if (records_exported > 0) {
        toast.success(`Successfully exported ${records_exported} audit record${records_exported > 1 ? 's' : ''}`);
      } else {
        toast.info('No audit records found matching the export criteria');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR;
      toast.error(`Audit export failed: ${errorMessage}`, {
        duration: 6000,
      });
    },
  });

  // Export low stock report
  const exportLowStockMutation = useMutation({
    mutationFn: (options: BulkExportLowStockOptions) => bulkAPI.exportLowStockReport(options),
    onSuccess: (response) => {
      const { download_info, export_results } = response.data.data;
      downloadFile(download_info.filename, download_info.download_url);
      
      const { records_exported } = export_results;
      if (records_exported > 0) {
        toast.success(`Successfully exported low stock report with ${records_exported} product${records_exported > 1 ? 's' : ''}`);
      } else {
        toast.info('No low stock products found to export');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR;
      toast.error(`Low stock export failed: ${errorMessage}`, {
        duration: 6000,
      });
    },
  });

  // Export inventory summary
  const exportSummaryMutation = useMutation({
    mutationFn: () => bulkAPI.exportInventorySummary(),
    onSuccess: (response) => {
      const { download_info, export_results } = response.data.data;
      downloadFile(download_info.filename, download_info.download_url);
      
      const { records_exported } = export_results;
      if (records_exported > 0) {
        toast.success(`Successfully exported inventory summary with ${records_exported} categor${records_exported > 1 ? 'ies' : 'y'}`);
      } else {
        toast.info('No inventory data found to export');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR;
      toast.error(`Inventory summary export failed: ${errorMessage}`, {
        duration: 6000,
      });
    },
  });

  // Download template
  const downloadTemplateMutation = useMutation({
    mutationFn: () => bulkAPI.downloadTemplate(),
    onSuccess: (response) => {
      downloadCsvFile(response.data, 'product-import-template.csv');
      toast.success('CSV import template downloaded successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || ERROR_MESSAGES.GENERIC_ERROR;
      toast.error(`Template download failed: ${errorMessage}`, {
        duration: 6000,
      });
    },
  });

  // Helper function to download files
  const downloadFile = async (filename: string, downloadUrl: string) => {
    try {
      const response = await bulkAPI.downloadExport(filename);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  // Reset import state
  const resetImport = () => {
    setImportState({
      uploadedFile: null,
      uploadResponse: null,
      importOptions: {
        filePath: '',
        updateExisting: false,
        skipErrors: true,
        validateOnly: false,
        batchSize: 100,
      },
      importResponse: null,
      isUploading: false,
      isImporting: false,
      step: 'upload',
    });
    setProgress({
      operation: 'upload',
      status: 'idle',
      progress: 0,
      message: '',
    });
  };

  // Update import options
  const updateImportOptions = (options: Partial<BulkImportOptions>) => {
    setImportState(prev => ({
      ...prev,
      importOptions: { ...prev.importOptions, ...options },
    }));
  };

  return {
    // State
    importState,
    progress,
    
    // Actions
    uploadFile: uploadMutation.mutate,
    importProducts: importMutation.mutate,
    exportProducts: exportProductsMutation.mutate,
    exportAudit: exportAuditMutation.mutate,
    exportLowStock: exportLowStockMutation.mutate,
    exportSummary: exportSummaryMutation.mutate,
    downloadTemplate: downloadTemplateMutation.mutate,
    resetImport,
    updateImportOptions,
    
    // Loading states
    isUploading: uploadMutation.isPending,
    isImporting: importMutation.isPending,
    isExportingProducts: exportProductsMutation.isPending,
    isExportingAudit: exportAuditMutation.isPending,
    isExportingLowStock: exportLowStockMutation.isPending,
    isExportingSummary: exportSummaryMutation.isPending,
    isDownloadingTemplate: downloadTemplateMutation.isPending,
    
    // Data
    uploadResponse: importState.uploadResponse,
    importResponse: importState.importResponse,
  };
};

// Legacy CSV hook for backward compatibility
export const useCsv = () => {
  const bulkOps = useBulkOperations();
  
  return {
    parsedData: [],
    validationErrors: [],
    parseFile: async (file: File) => {
      bulkOps.uploadFile(file);
      return { validRows: [], invalidRows: [], totalRows: 0, headers: [], summary: { valid: 0, invalid: 0, duplicate_skus: 0 } };
    },
    importData: (file: File) => {
      // This is a simplified version for backward compatibility
      bulkOps.uploadFile(file);
    },
    exportData: (filters?: any) => {
      bulkOps.exportProducts(filters || {});
    },
    downloadTemplate: () => bulkOps.downloadTemplate(),
    isImporting: bulkOps.isImporting,
    isExporting: bulkOps.isExportingProducts,
  };
};