// Bulk Operations Types
// Comprehensive types for CSV import/export operations

export interface BulkFileInfo {
  original_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

export interface BulkValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  headers: string[];
  sample_rows: any[];
  total_rows: number;
}

export interface BulkNextSteps {
  preview: string;
  import: string;
  template: string;
}

export interface BulkUploadResponse {
  file_info: BulkFileInfo;
  validation: BulkValidation;
  next_steps: BulkNextSteps;
}

export interface BulkImportError {
  row: number;
  sku: string;
  error: string;
}

export interface BulkImportedProduct {
  action: 'created' | 'updated';
  sku: string;
  name: string;
  quantity?: number;
  old_quantity?: number;
  new_quantity?: number;
}

export interface BulkValidationError {
  row: number;
  error: string;
  data: any;
}

export interface BulkImportResults {
  total_rows: number;
  successful_imports: number;
  failed_imports: number;
  updated_products: number;
  created_products: number;
  errors: BulkImportError[];
  imported_products: BulkImportedProduct[];
  validation_errors: BulkValidationError[];
}

export interface BulkPerformance {
  success_rate: number;
  processing_time: string;
}

export interface BulkRecommendation {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  action: string;
}

export interface BulkImportResponse {
  import_results: BulkImportResults;
  performance: BulkPerformance;
  recommendations: BulkRecommendation[];
}

export interface BulkImportOptions {
  filePath: string;
  updateExisting?: boolean;
  skipErrors?: boolean;
  validateOnly?: boolean;
  batchSize?: number;
}

// Template Information Types
export interface BulkTemplateInfo {
  required_fields: string[];
  optional_fields: string[];
  data_validation: Record<string, string>;
  sample_data: any[];
}

export interface BulkImportGuidelines {
  file_format: string;
  encoding: string;
  max_file_size: string;
  max_records: string;
  required_headers: string[];
  data_validation: Record<string, string>;
}

export interface BulkTemplateResponse {
  template_info: BulkTemplateInfo;
  import_guidelines: BulkImportGuidelines;
  best_practices: string[];
}

// Export Types
export interface BulkExportSummary {
  total_products?: number;
  categories?: string[];
  total_value?: string;
  low_stock_items?: number;
  total_records?: number;
  date_range?: {
    earliest: string;
    latest: string;
  };
  operation_types?: string[];
  unique_products?: number;
  unique_users?: number;
  low_stock_items?: number;
  out_of_stock_items?: number;
  total_shortage?: number;
  categories_affected?: string[];
  estimated_reorder_cost?: number;
  total_categories?: number;
  overall_total_products?: number;
  overall_total_value?: string;
  overall_low_stock?: number;
  overall_out_of_stock?: number;
}

export interface BulkExportMetadata {
  exported_at: string;
  format?: string;
  filters_applied?: any;
  includes_audit_data?: boolean;
  includes_out_of_stock?: boolean;
  report_type?: string;
}

export interface BulkExportResults {
  filename: string;
  file_path: string;
  records_exported: number;
  export_summary: BulkExportSummary;
  metadata: BulkExportMetadata;
}

export interface BulkDownloadInfo {
  filename: string;
  download_url: string;
  expires_at: string;
}

export interface BulkExportResponse {
  export_results: BulkExportResults;
  download_info: BulkDownloadInfo;
  urgency_indicators?: {
    out_of_stock_items: number;
    low_stock_items: number;
    total_shortage: number;
    requires_immediate_action: boolean;
  };
}

// Export Options Types
export interface BulkExportProductsOptions {
  category?: string;
  lowStockOnly?: boolean;
  includeAuditData?: boolean;
  format?: 'standard' | 'minimal';
}

export interface BulkExportAuditOptions {
  dateFrom?: string;
  dateTo?: string;
  operationType?: string;
  productId?: number;
  userId?: number;
  format?: 'standard' | 'detailed';
}

export interface BulkExportLowStockOptions {
  includeOutOfStock?: boolean;
}

// Statistics Types
export interface BulkFileStats {
  filename: string;
  size: number;
  created_at: string;
  expires_at?: string;
  uploaded_at?: string;
}

export interface BulkStatsResponse {
  export_files: {
    count: number;
    files: BulkFileStats[];
    total_size: number;
  };
  uploaded_files: {
    count: number;
    files: BulkFileStats[];
    total_size: number;
  };
  system_limits: {
    max_file_size: string;
    max_records_per_import: number;
    export_retention: string;
    supported_formats: string[];
  };
  available_operations: {
    import: string[];
    export: string[];
  };
}

// Cleanup Types
export interface BulkCleanupResponse {
  files_deleted: number;
  space_freed: number;
  cleanup_type: string;
  performed_by: string;
  cleanup_criteria: {
    exports: string;
    temp: string;
  };
}

export interface BulkCleanupOptions {
  type?: 'exports' | 'temp' | 'all';
}

// Documentation Types
export interface BulkDocsResponse {
  message: string;
  version: string;
  endpoints: {
    import: string[];
    export: string[];
    management: string[];
  };
  import_features: Record<string, string>;
  export_features: Record<string, string>;
  file_management: {
    upload_limits: Record<string, string>;
    retention: Record<string, string>;
  };
  import_template: {
    required_fields: string[];
    optional_fields: string[];
    data_validation: Record<string, string>;
  };
  best_practices: {
    import: string[];
    export: string[];
  };
  error_handling: Record<string, string>;
  permissions: Record<string, string>;
}

// UI State Types
export interface BulkImportState {
  uploadedFile: File | null;
  uploadResponse: BulkUploadResponse | null;
  importOptions: BulkImportOptions;
  importResponse: BulkImportResponse | null;
  isUploading: boolean;
  isImporting: boolean;
  step: 'upload' | 'preview' | 'import' | 'complete';
}

export interface BulkExportState {
  selectedExportType: 'products' | 'audit' | 'low-stock' | 'summary';
  exportOptions: BulkExportProductsOptions | BulkExportAuditOptions | BulkExportLowStockOptions;
  exportResponse: BulkExportResponse | null;
  isExporting: boolean;
}

// CSV Row Types for Import
export interface CsvImportRow {
  sku: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  reorder_level?: number;
  price: number;
  location?: string;
  supplier?: string;
}

export interface CsvValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export interface CsvParseResult {
  validRows: CsvImportRow[];
  invalidRows: Array<{
    row: number;
    data: any;
    errors: CsvValidationError[];
  }>;
  totalRows: number;
  headers: string[];
  summary: {
    valid: number;
    invalid: number;
    duplicate_skus: number;
  };
}

// Progress Tracking
export interface BulkOperationProgress {
  operation: 'upload' | 'import' | 'export';
  status: 'idle' | 'in_progress' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  details?: any;
}
