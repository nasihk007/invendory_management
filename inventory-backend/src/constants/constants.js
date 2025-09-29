const Order = {
  ASC: 'ASC',
  DESC: 'DESC'
};

const ResponseMessages = {
  SUCCESS: 'Request completed successfully',
  NO_DATA: 'No data found',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  LOGIN_SUCCESS: 'Login successful',
  REGISTRATION_SUCCESS: 'Registration successful',
  INVALID_CREDENTIALS: 'Invalid credentials',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  INTERNAL_ERROR: 'Internal server error',
  PRODUCTS_RETRIEVED: 'Products retrieved successfully',
  PRODUCT_CREATED: 'Product created successfully',
  PRODUCT_UPDATED: 'Product updated successfully',
  PRODUCT_DELETED: 'Product deleted successfully',
  STOCK_UPDATED: 'Stock updated successfully',
  NOTIFICATION_MARKED_READ: 'Notification marked as read',
  NOTIFICATIONS_RETRIEVED: 'Notifications retrieved successfully',
  AUDIT_RETRIEVED: 'Audit records retrieved successfully',
  REPORT_GENERATED: 'Report generated successfully',
  IMPORT_SUCCESS: 'Import completed successfully',
  EXPORT_SUCCESS: 'Export completed successfully'
};

const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

module.exports = {
  Order,
  ResponseMessages,
  HttpStatus
};