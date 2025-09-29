const DataResponseDto = require('../shared/dto/DataResponseDto');

// Get environment info
const nodeEnv = process.env.NODE_ENV || 'development';

/**
 * Custom error classes for better error handling
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.type = 'ValidationError';
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.type = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.type = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.type = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.type = 'ConflictError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
    this.type = 'DatabaseError';
  }
}

/**
 * Handle different types of database errors
 */
const handleDatabaseError = (error) => {
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      if (error.message.includes('username')) {
        return new ConflictError('Username already exists');
      }
      if (error.message.includes('email')) {
        return new ConflictError('Email already exists');
      }
      if (error.message.includes('sku')) {
        return new ConflictError('Product SKU already exists');
      }
      return new ConflictError('Duplicate entry detected');

    case 'ER_NO_REFERENCED_ROW_2':
      return new ValidationError('Referenced record does not exist');

    case 'ER_ROW_IS_REFERENCED_2':
      return new ConflictError('Cannot delete record as it is referenced by other records');

    case 'ER_DATA_TOO_LONG':
      return new ValidationError('Data too long for field');

    case 'ER_BAD_NULL_ERROR':
      return new ValidationError('Required field cannot be null');

    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return new ValidationError('Data violates database constraints');

    case 'ECONNREFUSED':
      return new DatabaseError('Database connection refused');

    case 'ETIMEDOUT':
      return new DatabaseError('Database operation timed out');

    case 'ER_ACCESS_DENIED_ERROR':
      return new DatabaseError('Database access denied');

    default:
      return new DatabaseError('Database operation failed');
  }
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error) => {
  switch (error.name) {
    case 'TokenExpiredError':
      return new AuthenticationError('Token has expired');

    case 'JsonWebTokenError':
      return new AuthenticationError('Invalid token');

    case 'NotBeforeError':
      return new AuthenticationError('Token not active yet');

    default:
      return new AuthenticationError('Token validation failed');
  }
};

/**
 * Handle Joi validation errors
 */
const handleJoiError = (error) => {
  const details = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));

  return new ValidationError('Request validation failed', details);
};

/**
 * Handle Multer errors (file upload)
 */
const handleMulterError = (error) => {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new ValidationError('File size too large');

    case 'LIMIT_FILE_COUNT':
      return new ValidationError('Too many files uploaded');

    case 'LIMIT_UNEXPECTED_FILE':
      return new ValidationError('Unexpected file field');

    case 'MISSING_FIELD_NAME':
      return new ValidationError('File field name is missing');

    default:
      return new ValidationError('File upload failed');
  }
};

/**
 * Log errors appropriately based on environment and severity
 */
const logError = (error, req) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.userId || 'anonymous',
    error: {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      type: error.type,
      stack: error.stack
    }
  };

  // Only log stack traces for server errors (5xx) or in development
  if (error.statusCode >= 500 || nodeEnv === 'development') {
    console.error('🚨 Error Details:', JSON.stringify(errorLog, null, 2));
  } else {
    // For client errors (4xx), log basic info without stack trace
    console.warn(`⚠️  Client Error: ${error.statusCode} ${error.message} - ${req.method} ${req.originalUrl}`);
  }

  // In production, you might want to send logs to external service
  if (nodeEnv === 'production' && error.statusCode >= 500) {
    // Example: send to logging service like Winston, Sentry, etc.
    // logService.error(errorLog);
  }
};

/**
 * Format error response based on environment
 */
const formatErrorResponse = (error, req) => {
  const errorData = {
    error: error.type || 'Error',
    timestamp: error.timestamp || new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Add additional details for validation errors
  if (error.details) {
    errorData.details = error.details;
  }

  // In development, include more debugging information
  if (nodeEnv === 'development') {
    errorData.stack = error.stack;

    if (error.statusCode >= 500) {
      errorData.debug = {
        name: error.name,
        isOperational: error.isOperational,
        originalError: error.originalError?.message
      };
    }
  }

  return new DataResponseDto(
    errorData,
    false,
    error.message
  );
};

/**
 * Main error handling middleware
 * Must be the last middleware in the chain
 */
const errorHandler = (error, req, res, next) => {
  let processedError = error;

  // Convert known error types to AppError instances
  if (error.code && error.sqlMessage) {
    // Database errors
    processedError = handleDatabaseError(error);
    processedError.originalError = error;
  } else if (error.name && error.name.includes('JWT')) {
    // JWT errors
    processedError = handleJWTError(error);
  } else if (error.isJoi) {
    // Joi validation errors
    processedError = handleJoiError(error);
  } else if (error.code && error.code.startsWith('LIMIT_')) {
    // Multer upload errors
    processedError = handleMulterError(error);
  } else if (!(error instanceof AppError)) {
    // Unknown errors - wrap in generic AppError
    processedError = new AppError(
      nodeEnv === 'production' ? 'Internal server error' : error.message,
      500,
      false
    );
    processedError.originalError = error;
  }

  // Log the error
  logError(processedError, req);

  // Send error response
  const statusCode = processedError.statusCode || 500;
  const response = formatErrorResponse(processedError, req);

  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors for unmatched routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch and forward errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle uncaught exceptions and promise rejections
 */
const handleUncaughtExceptions = () => {
  process.on('uncaughtException', (error) => {
    console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
    console.error('Error:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 UNHANDLED PROMISE REJECTION! Shutting down...');
    console.error('Promise:', promise);
    console.error('Reason:', reason);
    process.exit(1);
  });
};

/**
 * Operational error detector
 * Determines if an error is operational (expected) or programming (unexpected)
 */
const isOperationalError = (error) => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,

  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,

  // Utilities
  handleUncaughtExceptions,
  isOperationalError,
  logError,
  formatErrorResponse
};