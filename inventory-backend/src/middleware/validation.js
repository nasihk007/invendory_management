const Joi = require('joi');

/**
 * Validation middleware factory
 * Creates middleware that validates request data against Joi schema
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[property];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      allowUnknown: false // Don't allow unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Request data is invalid',
        details: errors
      });
    }

    // Replace request data with validated and sanitized data
    req[property] = value;
    next();
  };
};

// Common validation patterns
const commonPatterns = {
  // SKU pattern: uppercase letters, numbers, and hyphens
  sku: Joi.string().pattern(/^[A-Z0-9-]+$/).min(3).max(50),

  // Email pattern
  email: Joi.string().email().lowercase().max(100),

  // Password pattern: at least 8 chars, 1 letter, 1 number
  password: Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)/).max(128),

  // Username pattern: alphanumeric and underscores
  username: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(50),

  // Positive integer
  positiveInteger: Joi.number().integer().min(0),

  // Positive number
  positiveNumber: Joi.number().min(0),

  // ID parameter
  id: Joi.number().integer().positive(),

  // Pagination
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),

  // Sort order
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),

  // Category names
  category: Joi.string().min(2).max(100).trim(),

  // Location codes
  location: Joi.string().max(50).allow(null)
};

// User validation schemas
const userSchemas = {
  register: Joi.object({
    username: commonPatterns.username.required(),
    email: commonPatterns.email.required(),
    password: commonPatterns.password.required(),
    role: Joi.string().valid('staff', 'manager').default('staff')
  }),

  login: Joi.object({
    email: commonPatterns.email.required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    username: commonPatterns.username,
    email: commonPatterns.email,
    role: Joi.string().valid('staff', 'manager')
  }).min(1), // At least one field required

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonPatterns.password.required()
  })
};

// Product validation schemas
const productSchemas = {
  create: Joi.object({
    sku: commonPatterns.sku.required(),
    name: Joi.string().min(2).max(255).trim().required(),
    description: Joi.string().max(1000).trim().allow(null, ''),
    category: commonPatterns.category.required(),
    quantity: commonPatterns.positiveInteger.default(0),
    reorder_level: commonPatterns.positiveInteger.default(10),
    price: commonPatterns.positiveNumber.precision(2).required(),
    location: commonPatterns.location.allow(null, '')
  }),

  update: Joi.object({
    sku: commonPatterns.sku,
    name: Joi.string().min(2).max(255).trim(),
    description: Joi.string().max(1000).trim().allow(null, ''),
    category: commonPatterns.category,
    quantity: commonPatterns.positiveInteger,
    reorder_level: commonPatterns.positiveInteger,
    price: commonPatterns.positiveNumber.precision(2),
    location: commonPatterns.location.allow(null, '')
  }).min(1), // At least one field required

  updateStock: Joi.object({
    quantity: commonPatterns.positiveInteger.required(),
    reason: Joi.string().min(3).max(255).trim().required(),
    operation_type: Joi.string().valid(
      'manual_adjustment',
      'sale',
      'purchase',
      'damage',
      'transfer',
      'correction'
    ).default('manual_adjustment')
  }),

  search: Joi.object({
    search: Joi.string().max(100).trim(),
    category: commonPatterns.category,
    lowStock: Joi.boolean(),
    sortBy: Joi.string().valid('name', 'sku', 'category', 'quantity', 'price', 'created_at').default('created_at'),
    sortOrder: commonPatterns.sortOrder,
    limit: commonPatterns.limit,
    offset: commonPatterns.offset
  }),

  bulkImport: Joi.array().items(
    Joi.object({
      sku: commonPatterns.sku.required(),
      name: Joi.string().min(2).max(255).trim().required(),
      description: Joi.string().max(1000).trim().allow(''),
      category: commonPatterns.category.required(),
      quantity: commonPatterns.positiveInteger.default(0),
      reorder_level: commonPatterns.positiveInteger.default(10),
      price: commonPatterns.positiveNumber.precision(2).required(),
      location: commonPatterns.location.allow('')
    })
  ).min(1).max(1000) // Limit bulk import size
};

// Notification validation schemas
const notificationSchemas = {
  list: Joi.object({
    unreadOnly: Joi.boolean().default(false),
    type: Joi.string().valid('low_stock', 'out_of_stock', 'reorder_required'),
    productId: commonPatterns.id,
    limit: commonPatterns.limit,
    offset: commonPatterns.offset
  }),

  markMultipleRead: Joi.object({
    ids: Joi.array().items(commonPatterns.id).min(1).max(100)
  })
};

// Audit validation schemas
const auditSchemas = {
  list: Joi.object({
    productId: commonPatterns.id,
    userId: commonPatterns.id,
    operationType: Joi.string().valid(
      'manual_adjustment',
      'sale',
      'purchase',
      'damage',
      'transfer',
      'correction'
    ),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')),
    limit: commonPatterns.limit,
    offset: commonPatterns.offset
  })
};

// Report validation schemas
const reportSchemas = {
  dateRange: Joi.object({
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')),
    limit: Joi.number().integer().min(1).max(1000).default(100)
  }),

  lowStock: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

// Parameter validation schemas
const paramSchemas = {
  id: Joi.object({
    id: commonPatterns.id.required()
  }),

  sku: Joi.object({
    sku: commonPatterns.sku.required()
  })
};

// Query validation schemas
const querySchemas = {
  pagination: Joi.object({
    limit: commonPatterns.limit,
    offset: commonPatterns.offset,
    search: Joi.string().max(100).trim(),
    sortBy: Joi.string().max(50),
    sortOrder: commonPatterns.sortOrder
  })
};

// File upload validation
const fileSchemas = {
  csvUpload: Joi.object({
    mimetype: Joi.string().valid('text/csv', 'application/csv').required(),
    size: Joi.number().max(10 * 1024 * 1024) // 10MB max
  })
};

/**
 * Middleware to validate file uploads
 */
const validateFile = (allowedTypes = ['text/csv'], maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'File Required',
        message: 'Please upload a file'
      });
    }

    const { mimetype, size } = req.file;

    if (!allowedTypes.includes(mimetype)) {
      return res.status(400).json({
        error: 'Invalid File Type',
        message: `File type ${mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    if (size > maxSize) {
      return res.status(400).json({
        error: 'File Too Large',
        message: `File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`
      });
    }

    next();
  };
};

/**
 * Sanitize input data to prevent XSS and other attacks
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;

    // Remove potentially dangerous characters and patterns
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = typeof value === 'string' ? sanitizeString(value) : sanitizeObject(value);
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

module.exports = {
  validate,
  validateFile,
  sanitizeInput,
  schemas: {
    user: userSchemas,
    product: productSchemas,
    notification: notificationSchemas,
    audit: auditSchemas,
    report: reportSchemas,
    param: paramSchemas,
    query: querySchemas,
    file: fileSchemas
  },
  patterns: commonPatterns
};