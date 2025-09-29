import apiClient from './apiClient';
import { ApiResponse, PaginatedResponse, BackendPaginatedResponse } from '@/types/api';
import { AuthResponse, LoginCredentials, RegisterData, User, ProfileResponse } from '@/types/auth';
import { Product, ProductFormData, ProductFilter, StockUpdate } from '@/types/product';
import { Notification, NotificationFilter, NotificationsApiResponse } from '@/types/notification';
import { AuditLog, AuditFilter, ProductAuditHistory } from '@/types/audit';
import { 
  SalesPerformanceReport,
  UserActivityReport,
  ReportsListResponse,
  ReportFilters,
  LowStockApiResponseData,
  InventoryValuationApiResponseData,
  ExecutiveSummaryApiResponseData
} from '@/types/report';
import { Staff } from '@/types/staff';

// Authentication API
export const authAPI = {
  login: (credentials: LoginCredentials) => {
    // Use the real API for all requests
    return apiClient.post<ApiResponse<AuthResponse>>('/api/auth/login', credentials);
  },
  
  register: (data: RegisterData) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/auth/register', data),
  
  getProfile: () =>
    apiClient.get<ApiResponse<ProfileResponse>>('/api/auth/profile'),
  
  updateProfile: (data: Partial<User>) =>
    apiClient.put<ApiResponse<ProfileResponse>>('/api/auth/profile', data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put<ApiResponse<null>>('/api/auth/password', data),
};

// Products API
export const productAPI = {
  getProducts: (filters?: ProductFilter) =>
    apiClient.get<BackendPaginatedResponse<Product>>('/api/products', { 
      params: filters 
    }),
  
  getProduct: (id: number) =>
    apiClient.get<ApiResponse<{ product: Product }>>(`/api/products/${id}`),
  
  createProduct: (data: ProductFormData) =>
    apiClient.post<ApiResponse<{ product: Product }>>('/api/products', data),
  
  updateProduct: (id: number, data: Partial<ProductFormData>) =>
    apiClient.put<ApiResponse<{ product: Product }>>(`/api/products/${id}`, data),
  
  deleteProduct: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/products/${id}`),
  
  updateStock: (id: number, data: StockUpdate) =>
    apiClient.post<ApiResponse<{ product: Product }>>(`/api/products/${id}/stock`, data),
  
  getCategories: () =>
    apiClient.get<ApiResponse<{ categories: string[]; total: number }>>('/api/products/categories'),
  
  getLowStockProducts: (limit?: number) =>
    apiClient.get<ApiResponse<{ products: Product[]; total: number; summary: { out_of_stock: number; low_stock: number } }>>('/api/products/low-stock', {
      params: { limit }
    }),
  
  searchProducts: (params: { q?: string; category?: string; minPrice?: number; maxPrice?: number; inStock?: boolean; limit?: number; offset?: number }) =>
    apiClient.get<ApiResponse<{ products: Product[]; search_terms: any; results: any }>>('/api/products/search', { params }),
  
  getProductsByCategory: (category: string, params?: { limit?: number; offset?: number }) =>
    apiClient.get<ApiResponse<{ products: Product[]; category: string }>>(`/api/products/category/${category}`, { params }),
  
  getProductStats: () =>
    apiClient.get<ApiResponse<any>>('/api/products/stats'),
  
  getStockHistory: (id: number, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>(`/api/products/${id}/stock-history`, { params }),
};

// Bulk Operations API - Updated to match backend structure
export const bulkAPI = {
  // Upload CSV file for import preview
  uploadCsv: (file: File) => {
    const formData = new FormData();
    formData.append('csvFile', file);
    return apiClient.post<ApiResponse<{
      file_info: {
        original_name: string;
        file_path: string;
        file_size: number;
        uploaded_at: string;
      };
      validation: {
        valid: boolean;
        errors: string[];
        warnings: string[];
        headers: string[];
        sample_rows: any[];
        total_rows: number;
      };
      next_steps: {
        preview: string;
        import: string;
        template: string;
      };
    }>>('/api/bulk/upload', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Import products from uploaded CSV file
  importProducts: (data: {
    filePath: string;
    updateExisting?: boolean;
    skipErrors?: boolean;
    validateOnly?: boolean;
    batchSize?: number;
  }) =>
    apiClient.post<ApiResponse<{
      import_results: {
        total_rows: number;
        successful_imports: number;
        failed_imports: number;
        updated_products: number;
        created_products: number;
        errors: Array<{
          row: number;
          sku: string;
          error: string;
        }>;
        imported_products: Array<{
          action: 'created' | 'updated';
          sku: string;
          name: string;
          quantity?: number;
          old_quantity?: number;
          new_quantity?: number;
        }>;
        validation_errors: Array<{
          row: number;
          error: string;
          data: any;
        }>;
      };
      performance: {
        success_rate: number;
        processing_time: string;
      };
      recommendations: Array<{
        type: 'success' | 'warning' | 'error' | 'info';
        message: string;
        action: string;
      }>;
    }>>('/api/bulk/import', data),

  // Download CSV import template
  downloadTemplate: () =>
    apiClient.get('/api/bulk/template', { 
      responseType: 'blob' 
    }),

  // Get template information and guidelines
  getTemplateInfo: () =>
    apiClient.get<ApiResponse<{
      template_info: {
        required_fields: string[];
        optional_fields: string[];
        data_validation: Record<string, string>;
        sample_data: any[];
      };
      import_guidelines: {
        file_format: string;
        encoding: string;
        max_file_size: string;
        max_records: string;
        required_headers: string[];
        data_validation: Record<string, string>;
      };
      best_practices: string[];
    }>>('/api/bulk/template/info'),

  // Export products to CSV
  exportProducts: (data: {
    category?: string;
    lowStockOnly?: boolean;
    includeAuditData?: boolean;
    format?: 'standard' | 'minimal';
  }) =>
    apiClient.post<ApiResponse<{
      export_results: {
        filename: string;
        file_path: string;
        records_exported: number;
        export_summary: {
          total_products: number;
          categories: string[];
          total_value: string;
          low_stock_items: number;
        };
        metadata: {
          exported_at: string;
          format: string;
          filters_applied: any;
          includes_audit_data: boolean;
        };
      };
      download_info: {
        filename: string;
        download_url: string;
        expires_at: string;
      };
    }>>('/api/bulk/export/products', data),

  // Export audit records to CSV
  exportAuditRecords: (data: {
    dateFrom?: string;
    dateTo?: string;
    operationType?: string;
    productId?: number;
    userId?: number;
    format?: 'standard' | 'detailed';
  }) =>
    apiClient.post<ApiResponse<{
      export_results: {
        filename: string;
        file_path: string;
        records_exported: number;
        export_summary: {
          total_records: number;
          date_range: {
            earliest: string;
            latest: string;
          };
          operation_types: string[];
          unique_products: number;
          unique_users: number;
        };
        metadata: {
          exported_at: string;
          format: string;
          filters_applied: any;
        };
      };
      download_info: {
        filename: string;
        download_url: string;
        expires_at: string;
      };
    }>>('/api/bulk/export/audit', data),

  // Export low stock report
  exportLowStockReport: (data: { includeOutOfStock?: boolean }) =>
    apiClient.post<ApiResponse<{
      export_results: {
        filename: string;
        file_path: string;
        records_exported: number;
        export_summary: {
          low_stock_items: number;
          out_of_stock_items: number;
          total_shortage: number;
          categories_affected: string[];
          estimated_reorder_cost: number;
        };
        metadata: {
          exported_at: string;
          includes_out_of_stock: boolean;
        };
      };
      download_info: {
        filename: string;
        download_url: string;
        expires_at: string;
      };
      urgency_indicators: {
        out_of_stock_items: number;
        low_stock_items: number;
        total_shortage: number;
        requires_immediate_action: boolean;
      };
    }>>('/api/bulk/export/low-stock', data),

  // Export inventory summary report
  exportInventorySummary: () =>
    apiClient.post<ApiResponse<{
      export_results: {
        filename: string;
        file_path: string;
        records_exported: number;
        export_summary: {
          total_categories: number;
          overall_total_products: number;
          overall_total_value: string;
          overall_low_stock: number;
          overall_out_of_stock: number;
        };
        metadata: {
          exported_at: string;
          report_type: string;
        };
      };
      download_info: {
        filename: string;
        download_url: string;
        expires_at: string;
      };
    }>>('/api/bulk/export/summary'),

  // Download exported file
  downloadExport: (filename: string) =>
    apiClient.get(`/api/bulk/download/${filename}`, { 
      responseType: 'blob' 
    }),

  // Get bulk operations statistics
  getBulkStats: () =>
    apiClient.get<ApiResponse<{
      export_files: {
        count: number;
        files: Array<{
          filename: string;
          size: number;
          created_at: string;
          expires_at: string;
        }>;
        total_size: number;
      };
      uploaded_files: {
        count: number;
        files: Array<{
          filename: string;
          size: number;
          uploaded_at: string;
        }>;
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
    }>>('/api/bulk/stats'),

  // Clean up old files (Manager only)
  cleanupFiles: (data: { type?: 'exports' | 'temp' | 'all' }) =>
    apiClient.delete<ApiResponse<{
      files_deleted: number;
      space_freed: number;
      cleanup_type: string;
      performed_by: string;
      cleanup_criteria: {
        exports: string;
        temp: string;
      };
    }>>('/api/bulk/cleanup', { data }),

  // Get bulk operations documentation
  getBulkDocs: () =>
    apiClient.get<ApiResponse<{
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
    }>>('/api/bulk/docs'),
};

// Notifications API
export const notificationAPI = {
  getNotifications: (filters?: NotificationFilter) =>
    apiClient.get<NotificationsApiResponse>('/api/notifications', { 
      params: filters 
    }),
  
  markAsRead: (id: number) =>
    apiClient.put<ApiResponse<Notification>>(`/api/notifications/${id}/read`),
  
  markAllAsRead: () =>
    apiClient.put<ApiResponse<{ message: string; count: number }>>('/api/notifications/mark-all-read'),
  
  deleteNotification: (id: number) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/api/notifications/${id}`),
};

// Audit API
export const auditAPI = {
  getAuditLogs: (filters?: AuditFilter) =>
    apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>('/api/audit', { 
      params: filters 
    }),
  
  getProductAuditLogs: (productId: number) =>
    apiClient.get<ApiResponse<ProductAuditHistory>>(`/api/audit/product/${productId}`),
  
  getUserAuditLogs: (userId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>(`/api/audit/user/${userId}`, { 
      params 
    }),
};

// Reports API
export const reportAPI = {
  // Get all available reports
  getAvailableReports: () =>
    apiClient.get<ApiResponse<ReportsListResponse>>('/api/reports'),
  
  // Existing reports
  getLowStock: (filters?: ReportFilters) =>
    apiClient.get<ApiResponse<LowStockApiResponseData>>('/api/reports/low-stock-alerts', { params: filters }),
  
  getInventoryValuation: (filters?: ReportFilters) =>
    apiClient.get<ApiResponse<InventoryValuationApiResponseData>>('/api/reports/inventory-valuation', { params: filters }),
  
  getStockMovement: (filters?: ReportFilters) =>
    apiClient.get<ApiResponse<any>>('/api/reports/stock-movement', { params: filters }),
  
  getDailyChanges: (_filters?: ReportFilters) =>
    // This endpoint doesn't exist on the backend yet, return empty array
    Promise.resolve({
      data: {
        statusCode: 200,
        status: true,
        message: 'Daily changes endpoint not implemented yet',
        data: [],
      },
    } as any),
  
  // New reports based on API response
  getSalesPerformance: (filters?: ReportFilters) =>
    apiClient.get<ApiResponse<SalesPerformanceReport[]>>('/api/reports/sales-performance', { params: filters }),
  
  getUserActivity: (filters?: ReportFilters) =>
    apiClient.get<ApiResponse<UserActivityReport[]>>('/api/reports/user-activity', { params: filters }),
  
  getExecutiveSummary: (filters?: ReportFilters) =>
    apiClient.get<ApiResponse<ExecutiveSummaryApiResponseData>>('/api/reports/executive-summary', { params: filters }),
  
  // Legacy endpoint for backward compatibility
  getProductPerformance: (params?: { limit?: number }) =>
    apiClient.get<ApiResponse<any>>('/api/reports/product-performance', { params }),
};

// System API
// Staff Management API
export const staffAPI = {
  // Get all staff members
  getStaff: (filters?: {
    search?: string;
    status?: 'active' | 'inactive';
    limit?: number;
    offset?: number;
    sortBy?: 'username' | 'email' | 'created_at' | 'last_login';
    sortOrder?: 'asc' | 'desc';
  }) => {
    return apiClient.get<{
      success: boolean;
      message: string;
      data: {
        staff_members: Staff[];
        summary: {
          total_staff: number;
          active_staff: number;
          inactive_staff?: number;
          new_this_month: number;
          staff_with_recent_activity?: number;
        };
        pagination: {
          current_page: number;
          per_page: number;
          total_items: number;
          total_pages: number;
          has_next: boolean;
          has_prev: boolean;
        };
      };
    }>('/api/auth/staff', { params: filters });
  },

  // Create new staff member
  createStaff: (data: {
    username: string;
    email: string;
    password: string;
  }) => {
    return apiClient.post<{
      success: boolean;
      message: string;
      data: {
        user: Staff;
        temporary_password?: string;
      };
    }>('/api/auth/register', {
      ...data,
      role: 'staff', // Always set role to staff
    });
  },

  // Get staff member details
  getStaffDetails: (id: number) => {
    return apiClient.get<{
      success: boolean;
      message: string;
      data: Staff & {
        stats?: {
          total_actions: number;
          products_managed: number;
          recent_activity: string;
          productivity_score: number;
          last_activity: string;
        };
      };
    }>(`/api/auth/staff/${id}`);
  },

};

export const systemAPI = {
  healthCheck: () =>
    apiClient.get<{
      status: string;
      timestamp: string;
      application: any;
      database: any;
      system: any;
    }>('/health'),
};