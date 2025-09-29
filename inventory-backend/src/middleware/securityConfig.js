/**
 * Security Configuration
 * Centralized security settings and configurations
 */

/**
 * Environment-based Security Configuration
 */
const getSecurityConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  return {
    // JWT Configuration
    jwt: {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: process.env.JWT_ISSUER || 'inventory-management-api',
      audience: process.env.JWT_AUDIENCE || 'inventory-management-client'
    },

    // Password Security
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      passwordHistory: 5 // Remember last 5 passwords
    },

    // Rate Limiting
    rateLimiting: {
      general: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: isProduction ? 500 : 1000, // Stricter in production
        skipSuccessfulRequests: false
      },
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: isProduction ? 10 : 20, // Stricter in production
        skipSuccessfulRequests: true
      },
      bulk: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: isProduction ? 25 : 50, // Stricter in production
        skipSuccessfulRequests: false
      },
      reports: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: isProduction ? 50 : 100, // Stricter in production
        skipSuccessfulRequests: false
      }
    },

    // Session Configuration
    session: {
      secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: isProduction, // HTTPS only in production
      httpOnly: true,
      sameSite: isProduction ? 'strict' : 'lax'
    },

    // File Upload Security
    fileUpload: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['text/csv', 'application/csv'],
      allowedExtensions: ['.csv'],
      uploadPath: './uploads/temp',
      retentionDays: 1 // Keep temp files for 1 day
    },

    // Input Validation
    validation: {
      maxStringLength: 1000,
      maxArrayLength: 1000,
      maxObjectDepth: 10,
      sanitizeHtml: true,
      stripTags: true
    },

    // Security Headers
    headers: {
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      }
    },

    // CORS Configuration
    cors: {
      allowedOrigins: isProduction
        ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
        : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
      credentials: true,
      maxAge: 86400 // 24 hours
    },

    // API Security
    api: {
      requireApiKey: process.env.REQUIRE_API_KEY === 'true',
      validApiKeys: (process.env.VALID_API_KEYS || '').split(',').filter(Boolean),
      enableSwagger: !isProduction, // Disable API docs in production
      enableDebugMode: !isProduction
    },

    // Database Security
    database: {
      connectionTimeout: 30000, // 30 seconds
      queryTimeout: 60000, // 60 seconds
      maxConnections: 10,
      ssl: isProduction,
      logQueries: !isProduction
    },

    // Logging Configuration
    logging: {
      level: isProduction ? 'warn' : 'debug',
      logSensitiveData: false,
      enableRequestLogging: !isProduction,
      enableSecurityLogging: true,
      logRetentionDays: 30
    },

    // IP Security
    ipSecurity: {
      blockedIPs: (process.env.BLOCKED_IPS || '').split(',').filter(Boolean),
      allowedIPs: (process.env.ALLOWED_IPS || '').split(',').filter(Boolean),
      enableGeoBlocking: isProduction,
      blockedCountries: (process.env.BLOCKED_COUNTRIES || '').split(',').filter(Boolean)
    },

    // Monitoring and Alerting
    monitoring: {
      enableHealthChecks: true,
      enableMetrics: true,
      alertThresholds: {
        errorRate: 0.05, // 5%
        responseTime: 5000, // 5 seconds
        failedLogins: 10 // per 15 minutes
      }
    }
  };
};

/**
 * Security Validation Rules
 */
const securityValidationRules = {
  // Username validation
  username: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
    blacklist: [
      'admin', 'administrator', 'root', 'system', 'user', 'test',
      'guest', 'anonymous', 'null', 'undefined', 'api', 'service'
    ]
  },

  // Email validation
  email: {
    maxLength: 254,
    pattern: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    allowedDomains: [], // Empty array means all domains allowed
    blockedDomains: ['10minutemail.com', 'tempmail.org', 'guerrillamail.com']
  },

  // Product SKU validation
  sku: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[A-Z0-9-_]+$/,
    requirePrefix: false,
    allowedPrefixes: []
  },

  // File validation
  file: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['text/csv', 'application/csv'],
    allowedExtensions: ['.csv'],
    scanForVirus: false, // Set to true if antivirus scanning is available
    quarantineSuspicious: true
  },

  // Input sanitization patterns
  sanitization: {
    removeHtml: true,
    removeSql: true,
    removeJs: true,
    trimWhitespace: true,
    normalizeUnicode: true
  }
};

/**
 * Security Error Messages
 */
const securityErrorMessages = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  ACCOUNT_LOCKED: 'Account temporarily locked due to multiple failed login attempts',
  TOKEN_EXPIRED: 'Authentication token has expired',
  TOKEN_INVALID: 'Invalid authentication token',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to access this resource',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
  INVALID_INPUT: 'Invalid input data provided',
  FILE_TOO_LARGE: 'File size exceeds maximum allowed limit',
  INVALID_FILE_TYPE: 'File type not allowed',
  SUSPICIOUS_ACTIVITY: 'Suspicious activity detected',
  IP_BLOCKED: 'Access denied from your IP address',
  MAINTENANCE_MODE: 'System is currently under maintenance',
  API_KEY_REQUIRED: 'API key is required for this request',
  API_KEY_INVALID: 'Invalid API key provided'
};

/**
 * Security Event Types for Logging
 */
const securityEventTypes = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  ACCOUNT_LOCKED: 'account_locked',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  RATE_LIMIT_HIT: 'rate_limit_hit',
  INVALID_TOKEN: 'invalid_token',
  PERMISSION_DENIED: 'permission_denied',
  FILE_UPLOAD: 'file_upload',
  DATA_EXPORT: 'data_export',
  ADMIN_ACTION: 'admin_action'
};

/**
 * Get environment-specific configuration
 */
const config = getSecurityConfig();

/**
 * Validate security configuration
 */
const validateSecurityConfig = () => {
  const errors = [];

  // Check required environment variables in production
  if (config.jwt.secret === 'your-super-secret-jwt-key-change-in-production' && process.env.NODE_ENV === 'production') {
    errors.push('JWT_SECRET must be set in production');
  }

  if (config.session.secret === 'your-session-secret-change-in-production' && process.env.NODE_ENV === 'production') {
    errors.push('SESSION_SECRET must be set in production');
  }

  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    errors.push('DATABASE_URL must be set in production');
  }

  if (errors.length > 0) {
    throw new Error(`Security configuration errors: ${errors.join(', ')}`);
  }

  return true;
};

module.exports = {
  config,
  securityValidationRules,
  securityErrorMessages,
  securityEventTypes,
  validateSecurityConfig
};