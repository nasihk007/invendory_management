const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

/**
 * Advanced Validation Rules
 * Enhanced validation middleware with business logic validation
 */

/**
 * Custom Joi Extensions
 */
const customJoi = Joi.extend((joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'string.sku': '{{#label}} must be a valid SKU format (3-20 characters, alphanumeric with hyphens/underscores)',
    'string.strongPassword': '{{#label}} must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
    'string.phone': '{{#label}} must be a valid phone number',
    'string.sql': '{{#label}} contains potential SQL injection patterns',
    'string.xss': '{{#label}} contains potential XSS patterns'
  },
  rules: {
    sku: {
      validate(value, helpers) {
        if (!/^[A-Z0-9-_]{3,20}$/i.test(value)) {
          return helpers.error('string.sku');
        }
        return value.toUpperCase();
      }
    },
    strongPassword: {
      validate(value, helpers) {
        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!strongPasswordRegex.test(value)) {
          return helpers.error('string.strongPassword');
        }
        return value;
      }
    },
    phone: {
      validate(value, helpers) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanValue = value.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanValue)) {
          return helpers.error('string.phone');
        }
        return cleanValue;
      }
    },
    noSqlInjection: {
      validate(value, helpers) {
        const sqlPatterns = [
          /(\bselect\b|\bunion\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b|\bexec\b)/gi,
          /('|(\\')|(;)|(\\)|(\-\-)|(\#))/g,
          /(\$\w+)/g // NoSQL injection patterns
        ];

        for (const pattern of sqlPatterns) {
          if (pattern.test(value)) {
            return helpers.error('string.sql');
          }
        }
        return value;
      }
    },
    noXss: {
      validate(value, helpers) {
        const xssPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /<img[^>]+src[\\s]*=[\\s]*[\\"\\']*javascript:/gi
        ];

        for (const pattern of xssPatterns) {
          if (pattern.test(value)) {
            return helpers.error('string.xss');
          }
        }
        return value;
      }
    }
  }
}));

/**
 * Business Logic Validation Schemas
 */

// Enhanced User Validation
const userValidationSchemas = {
  register: Joi.object({
    username: customJoi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .noSqlInjection()
      .noXss()
      .messages({
        'string.alphanum': 'Username must only contain alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters'
      }),
    email: Joi.string()
      .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu', 'gov', 'mil'] } })
      .required()
      .lowercase()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    password: customJoi.string()
      .strongPassword()
      .required(),
    role: Joi.string()
      .valid('staff', 'manager')
      .default('staff'),
    full_name: customJoi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .required()
      .noXss()
      .messages({
        'string.pattern.base': 'Full name can only contain letters, spaces, hyphens, and apostrophes'
      }),
    phone: customJoi.string()
      .phone()
      .optional(),
    department: customJoi.string()
      .max(50)
      .optional()
      .noXss()
  }),

  updateProfile: Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu', 'gov', 'mil'] } })
      .lowercase()
      .optional(),
    full_name: customJoi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z\s'-]+$/)
      .optional()
      .noXss(),
    phone: customJoi.string()
      .phone()
      .optional(),
    department: customJoi.string()
      .max(50)
      .optional()
      .noXss()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: customJoi.string()
      .strongPassword()
      .required(),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match new password'
      })
  })
};

// Enhanced Product Validation
const productValidationSchemas = {
  create: Joi.object({
    sku: customJoi.string()
      .sku()
      .required(),
    name: customJoi.string()
      .min(2)
      .max(200)
      .required()
      .noXss()
      .noSqlInjection(),
    description: customJoi.string()
      .max(1000)
      .optional()
      .allow('')
      .noXss()
      .noSqlInjection(),
    category: customJoi.string()
      .min(2)
      .max(50)
      .required()
      .noXss()
      .pattern(/^[a-zA-Z0-9\s&\-_]+$/)
      .messages({
        'string.pattern.base': 'Category can only contain letters, numbers, spaces, ampersands, hyphens, and underscores'
      }),
    price: Joi.number()
      .positive()
      .precision(2)
      .max(999999.99)
      .required()
      .messages({
        'number.positive': 'Price must be a positive number',
        'number.max': 'Price cannot exceed $999,999.99'
      }),
    quantity: Joi.number()
      .integer()
      .min(0)
      .max(999999)
      .required()
      .messages({
        'number.min': 'Quantity cannot be negative',
        'number.max': 'Quantity cannot exceed 999,999'
      }),
    reorder_level: Joi.number()
      .integer()
      .min(0)
      .max(9999)
      .default(10)
      .messages({
        'number.min': 'Reorder level cannot be negative',
        'number.max': 'Reorder level cannot exceed 9,999'
      }),
    location: customJoi.string()
      .max(100)
      .optional()
      .allow('')
      .noXss()
      .pattern(/^[a-zA-Z0-9\s\-_.,#]+$/)
      .messages({
        'string.pattern.base': 'Location contains invalid characters'
      }),
    supplier: customJoi.string()
      .max(100)
      .optional()
      .allow('')
      .noXss()
      .noSqlInjection()
  }),

  update: Joi.object({
    name: customJoi.string()
      .min(2)
      .max(200)
      .optional()
      .noXss()
      .noSqlInjection(),
    description: customJoi.string()
      .max(1000)
      .optional()
      .allow('')
      .noXss()
      .noSqlInjection(),
    category: customJoi.string()
      .min(2)
      .max(50)
      .optional()
      .noXss()
      .pattern(/^[a-zA-Z0-9\s&\-_]+$/),
    price: Joi.number()
      .positive()
      .precision(2)
      .max(999999.99)
      .optional(),
    reorder_level: Joi.number()
      .integer()
      .min(0)
      .max(9999)
      .optional(),
    location: customJoi.string()
      .max(100)
      .optional()
      .allow('')
      .noXss()
      .pattern(/^[a-zA-Z0-9\s\-_.,#]+$/),
    supplier: customJoi.string()
      .max(100)
      .optional()
      .allow('')
      .noXss()
      .noSqlInjection()
  }),

  stockUpdate: Joi.object({
    operation_type: Joi.string()
      .valid('manual_adjustment', 'sale', 'purchase', 'damage', 'transfer', 'correction')
      .required(),
    quantity_change: Joi.number()
      .integer()
      .min(-999999)
      .max(999999)
      .required()
      .messages({
        'number.min': 'Quantity change cannot be less than -999,999',
        'number.max': 'Quantity change cannot exceed 999,999'
      }),
    reason: customJoi.string()
      .min(5)
      .max(500)
      .required()
      .noXss()
      .noSqlInjection()
      .messages({
        'string.min': 'Reason must be at least 5 characters long'
      })
  })
};

// Enhanced Notification Validation
const notificationValidationSchemas = {
  create: Joi.object({
    product_id: Joi.number()
      .integer()
      .positive()
      .required(),
    message: customJoi.string()
      .min(10)
      .max(500)
      .required()
      .noXss()
      .noSqlInjection()
      .trim(),
    type: Joi.string()
      .valid('low_stock', 'out_of_stock', 'reorder_required')
      .required()
  })
};

// Enhanced Bulk Operations Validation
const bulkValidationSchemas = {
  import: Joi.object({
    filePath: Joi.string()
      .pattern(/^[a-zA-Z0-9\/_\-\.\\:]+\.(csv|CSV)$/)
      .required()
      .messages({
        'string.pattern.base': 'File path must be a valid CSV file path'
      }),
    updateExisting: Joi.boolean().default(false),
    skipErrors: Joi.boolean().default(true),
    validateOnly: Joi.boolean().default(false),
    batchSize: Joi.number()
      .integer()
      .min(10)
      .max(500)
      .default(100)
  }),

  export: Joi.object({
    category: customJoi.string()
      .max(50)
      .optional()
      .noXss()
      .pattern(/^[a-zA-Z0-9\s&\-_]+$/),
    lowStockOnly: Joi.boolean().default(false),
    includeAuditData: Joi.boolean().default(false),
    format: Joi.string()
      .valid('standard', 'minimal', 'detailed')
      .default('standard')
  })
};

// Enhanced Report Validation
const reportValidationSchemas = {
  dateRange: Joi.object({
    dateFrom: Joi.date()
      .iso()
      .min('2020-01-01')
      .max('now')
      .optional()
      .messages({
        'date.min': 'Start date cannot be before 2020-01-01',
        'date.max': 'Start date cannot be in the future'
      }),
    dateTo: Joi.date()
      .iso()
      .min(Joi.ref('dateFrom'))
      .max('now')
      .optional()
      .messages({
        'date.min': 'End date must be after start date',
        'date.max': 'End date cannot be in the future'
      })
  }).custom((value, helpers) => {
    if (value.dateFrom && value.dateTo) {
      const daysDiff = Math.ceil((new Date(value.dateTo) - new Date(value.dateFrom)) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        return helpers.error('custom.dateRange', { message: 'Date range cannot exceed 365 days' });
      }
    }
    return value;
  })
};

/**
 * Business Logic Validators
 */

/**
 * Validate SKU uniqueness
 */
const validateSKUUniqueness = async (sku, excludeId = null) => {
  const { Product } = require('../models');

  try {
    const existingProduct = await Product.findBySku(sku);
    if (existingProduct && (!excludeId || existingProduct.id !== excludeId)) {
      throw new ValidationError(`Product with SKU '${sku}' already exists`);
    }
    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Unable to validate SKU uniqueness');
  }
};

/**
 * Validate username uniqueness
 */
const validateUsernameUniqueness = async (username, excludeId = null) => {
  const { User } = require('../models');

  try {
    const existingUser = await User.findByUsername(username);
    if (existingUser && (!excludeId || existingUser.id !== excludeId)) {
      throw new ValidationError(`Username '${username}' is already taken`);
    }
    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Unable to validate username uniqueness');
  }
};

/**
 * Validate email uniqueness
 */
const validateEmailUniqueness = async (email, excludeId = null) => {
  const { User } = require('../models');

  try {
    const existingUser = await User.findByEmail(email);
    if (existingUser && (!excludeId || existingUser.id !== excludeId)) {
      throw new ValidationError(`Email '${email}' is already registered`);
    }
    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Unable to validate email uniqueness');
  }
};

/**
 * Validate stock operation
 */
const validateStockOperation = async (productId, quantityChange, operationType) => {
  const { Product } = require('../models');

  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new ValidationError('Product not found');
    }

    const newQuantity = product.quantity + quantityChange;

    // Prevent negative stock unless it's a correction
    if (newQuantity < 0 && operationType !== 'correction') {
      throw new ValidationError(
        `Insufficient stock. Current quantity: ${product.quantity}, requested change: ${quantityChange}`
      );
    }

    // Warn about large stock reductions
    if (quantityChange < 0 && Math.abs(quantityChange) > product.quantity * 0.5) {
      console.warn(`Large stock reduction detected: ${Math.abs(quantityChange)} units from product ${product.sku}`);
    }

    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Unable to validate stock operation');
  }
};

/**
 * Validate file upload
 */
const validateFileUpload = (file) => {
  if (!file) {
    throw new ValidationError('No file uploaded');
  }

  // Check file type
  const allowedMimeTypes = ['text/csv', 'application/csv'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new ValidationError('Invalid file type. Only CSV files are allowed.');
  }

  // Check file size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new ValidationError('File size too large. Maximum size is 10MB.');
  }

  // Check filename
  const filename = file.originalname || file.filename;
  if (!/^[a-zA-Z0-9._\-\s]+\.(csv|CSV)$/.test(filename)) {
    throw new ValidationError('Invalid filename. Only alphanumeric characters, dots, hyphens, underscores, and spaces are allowed.');
  }

  return true;
};

/**
 * Advanced Validation Middleware Factory
 */
const createAdvancedValidator = (schemaName, options = {}) => {
  return async (req, res, next) => {
    try {
      const { validateUniqueness = false, validateBusinessLogic = false } = options;

      // Get the appropriate schema
      let schema;
      if (schemaName.includes('.')) {
        const [group, type] = schemaName.split('.');
        const schemaGroups = {
          user: userValidationSchemas,
          product: productValidationSchemas,
          notification: notificationValidationSchemas,
          bulk: bulkValidationSchemas,
          report: reportValidationSchemas
        };
        schema = schemaGroups[group]?.[type];
      }

      if (!schema) {
        throw new ValidationError(`Validation schema '${schemaName}' not found`);
      }

      // Validate against Joi schema
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'One or more fields contain invalid data',
          validation_errors: validationErrors
        });
      }

      // Apply validated and sanitized data
      req.body = value;

      // Perform uniqueness validation if required
      if (validateUniqueness) {
        await performUniquenessValidation(req, schemaName);
      }

      // Perform business logic validation if required
      if (validateBusinessLogic) {
        await performBusinessLogicValidation(req, schemaName);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Perform uniqueness validation
 * @private
 */
async function performUniquenessValidation(req, schemaName) {
  const userId = req.params.id ? parseInt(req.params.id) : null;
  const productId = req.params.id ? parseInt(req.params.id) : null;

  switch (schemaName) {
    case 'user.register':
      await validateUsernameUniqueness(req.body.username);
      await validateEmailUniqueness(req.body.email);
      break;
    case 'user.updateProfile':
      if (req.body.email) {
        await validateEmailUniqueness(req.body.email, userId);
      }
      break;
    case 'product.create':
      await validateSKUUniqueness(req.body.sku);
      break;
    case 'product.update':
      // SKU cannot be updated, so no uniqueness check needed
      break;
  }
}

/**
 * Perform business logic validation
 * @private
 */
async function performBusinessLogicValidation(req, schemaName) {
  switch (schemaName) {
    case 'product.stockUpdate':
      const productId = req.params.id ? parseInt(req.params.id) : req.body.product_id;
      await validateStockOperation(
        productId,
        req.body.quantity_change,
        req.body.operation_type
      );
      break;
  }
}

module.exports = {
  customJoi,
  userValidationSchemas,
  productValidationSchemas,
  notificationValidationSchemas,
  bulkValidationSchemas,
  reportValidationSchemas,
  validateSKUUniqueness,
  validateUsernameUniqueness,
  validateEmailUniqueness,
  validateStockOperation,
  validateFileUpload,
  createAdvancedValidator
};