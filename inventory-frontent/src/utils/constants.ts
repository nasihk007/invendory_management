// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// App Configuration
export const APP_CONFIG = {
  NAME: import.meta.env.APP_NAME || 'Inventory Management',
  VERSION: import.meta.env.APP_VERSION || '1.0.0',
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
    AVAILABLE_PAGE_SIZES: [5, 10, 20, 50],
  },
};

// User Roles
export const USER_ROLES = {
  STAFF: 'staff' as const,
  MANAGER: 'manager' as const,
} as const;

// Product Categories
export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Clothing & Apparel',
  'Home & Garden',
  'Sports & Outdoors',
  'Health & Beauty',
  'Books & Media',
  'Toys & Games',
  'Food & Beverages',
  'Office Supplies',
  'Automotive',
  'Tools & Hardware',
  'Other',
] as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  LOW_STOCK: 'low_stock' as const,
  OUT_OF_STOCK: 'out_of_stock' as const,
  REORDER_REQUIRED: 'reorder_required' as const,
} as const;

// Operation Types
export const OPERATION_TYPES = {
  MANUAL_ADJUSTMENT: 'manual_adjustment' as const,
  SALE: 'sale' as const,
  PURCHASE: 'purchase' as const,
  DAMAGE: 'damage' as const,
  TRANSFER: 'transfer' as const,
  CORRECTION: 'correction' as const,
} as const;

// CSV Configuration
export const CSV_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
  ],
  REQUIRED_HEADERS: [
    'sku',
    'name',
    'category',
    'quantity',
    'reorder_level',
    'price',
  ],
  OPTIONAL_HEADERS: [
    'description',
    'location',
  ],
};

// Toast Configuration
export const TOAST_CONFIG = {
  DURATION: {
    SUCCESS: 3000,
    ERROR: 5000,
    INFO: 4000,
    WARNING: 4000,
  },
  POSITION: 'top-right' as const,
};

// Animation Durations
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
};

// Breakpoints (matching Tailwind CSS)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm',
  API: 'yyyy-MM-dd',
  API_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'inventory_token',
  USER: 'inventory_user',
  THEME: 'inventory_theme',
  SIDEBAR_COLLAPSED: 'inventory_sidebar_collapsed',
} as const;

// Query Keys for React Query
export const QUERY_KEYS = {
  // Auth
  AUTH_PROFILE: ['auth', 'profile'],
  
  // Products
  PRODUCTS: ['products'],
  PRODUCT_DETAIL: (id: number) => ['products', id],
  PRODUCT_STOCK_HISTORY: (id: number) => ['products', id, 'stock-history'],
  PRODUCT_CATEGORIES: ['products', 'categories'],
  PRODUCT_LOW_STOCK: ['products', 'low-stock'],
  PRODUCT_STATS: ['products', 'stats'],
  
  // Notifications
  NOTIFICATIONS: ['notifications'],
  
  // Audit
  AUDIT_LOGS: ['audit'],
  PRODUCT_AUDIT_LOGS: (id: string) => ['audit', 'product', id],
  
  // Reports
  AVAILABLE_REPORTS: ['reports'],
  
  // Bulk Operations
  BULK_STATS: ['bulk-stats'],
  BULK_DOCS: ['bulk-docs'],
  LOW_STOCK_REPORT: ['reports', 'low-stock-alerts'],
  INVENTORY_VALUATION: ['reports', 'inventory-valuation'],
  STOCK_MOVEMENT: ['reports', 'stock-movement'],
  DAILY_CHANGES: ['reports', 'daily-changes'],
  SALES_PERFORMANCE: ['reports', 'sales-performance'],
  USER_ACTIVITY: ['reports', 'user-activity'],
  EXECUTIVE_SUMMARY: ['reports', 'executive-summary'],
  PRODUCT_PERFORMANCE: ['reports', 'product-performance'],
  
  // Staff Management
  STAFF: ['staff'],
  STAFF_DETAILS: (id: number) => ['staff', id],
  STAFF_STATS: ['staff', 'stats'],
  
  // System
  HEALTH_CHECK: ['system', 'health'],
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to server. Please check your internet connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. Insufficient permissions.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Welcome back!',
  LOGOUT_SUCCESS: 'Logged out successfully',
  REGISTER_SUCCESS: 'Account created successfully. Please login.',
  PRODUCT_CREATED: 'Product created successfully',
  PRODUCT_UPDATED: 'Product updated successfully',
  PRODUCT_DELETED: 'Product deleted successfully',
  STOCK_UPDATED: 'Stock level updated successfully',
  CSV_IMPORTED: 'Products imported successfully',
  CSV_EXPORTED: 'Products exported successfully',
  NOTIFICATION_READ: 'Notification marked as read',
  ALL_NOTIFICATIONS_READ: 'All notifications marked as read',
} as const;