export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode?: number; // Optional for backward compatibility
  status?: boolean; // Optional for backward compatibility
  token?: string; // Token is at root level for auth responses
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BackendPaginatedResponse<T> {
  data: T[];
  meta: {
    take: number;
    itemCount: number;
    page: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export interface ApiError {
  error: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
    value: any;
  }>;
  timestamp: string;
  path: string;
  method: string;
  retryAfter?: number; // For rate limit errors
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  lowStock?: boolean;
}