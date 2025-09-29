const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const cors = require('cors');
const { ValidationError } = require('./errorHandler');

/**
 * Security Configuration
 * Advanced security middleware for production deployment
 */

/**
 * CORS Configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from specified origins
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3005',
      'http://localhost:3001',
      'http://localhost:3000',
      'http://127.0.0.1:3005',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3000',
      'http://localhost:5175',  
      'http://localhost:5176',
      'http://localhost:5177'
    ].filter(Boolean);

    // In development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      // Allow requests with no origin (mobile apps, postman, etc.)
      if (!origin) return callback(null, true);

      // Allow any localhost origin in development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-User-Agent',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ]
};

/**
 * Helmet Security Headers Configuration
 */
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // Allows file downloads
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
};

/**
 * Rate Limiting Configuration
 */

// General API rate limit
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Authentication endpoints rate limit (stricter)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit authentication attempts
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    console.warn(`Authentication rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Authentication rate limit exceeded',
      message: 'Too many login attempts from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Bulk operations rate limit (moderate)
const bulkRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit bulk operations per hour
  message: {
    error: 'Too many bulk operations, please try again later.',
    retryAfter: '1 hour'
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Bulk operations rate limit exceeded',
      message: 'Too many bulk operations from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Reports rate limit (moderate)
const reportsRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit report generation per hour
  message: {
    error: 'Too many report requests, please try again later.',
    retryAfter: '1 hour'
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Reports rate limit exceeded',
      message: 'Too many report requests from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Slow Down Configuration (Progressive delay)
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter (v2.0.0 format)
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  validate: { delayMs: false } // Disable warning message
});

/**
 * Input Sanitization Middleware
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    next(new ValidationError('Invalid input data format'));
  }
};

/**
 * Sanitize object recursively
 * @private
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeValue(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }

  return sanitized;
}

/**
 * Sanitize individual values
 * @private
 */
function sanitizeValue(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    // Remove potential XSS attempts
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove potential SQL injection attempts
    .replace(/(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi, '')
    // Remove potential NoSQL injection attempts
    .replace(/\$\w+/g, '')
    // Trim whitespace
    .trim();
}

/**
 * Security Headers Middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
  res.setHeader('X-Request-ID', req.id || generateRequestId());
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Add cache control for sensitive endpoints
  if (req.path.includes('/auth/') || req.path.includes('/reports/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

/**
 * Request ID Generator
 * @private
 */
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * IP Validation and Blocking
 */
const ipValidation = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  // Block known bad IPs (in production, this would come from a database or external service)
  const blockedIPs = (process.env.BLOCKED_IPS || '').split(',').filter(Boolean);

  if (blockedIPs.includes(clientIP)) {
    console.warn(`Blocked request from IP: ${clientIP}`);
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Your IP address has been blocked'
    });
  }

  // Log suspicious patterns
  if (req.path.includes('..') || req.path.includes('/etc/')) {
    console.warn(`Suspicious path access from IP ${clientIP}: ${req.path}`);
  }

  next();
};

/**
 * File Upload Security
 */
const fileUploadSecurity = (req, res, next) => {
  if (req.file || req.files) {
    const file = req.file || (req.files && req.files[0]);

    if (file) {
      // Validate file type
      const allowedMimeTypes = [
        'text/csv',
        'application/csv',
        'text/plain'
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return next(new ValidationError('Invalid file type. Only CSV files are allowed.'));
      }

      // Validate file size (already handled by multer, but double-check)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return next(new ValidationError('File size too large. Maximum size is 10MB.'));
      }

      // Validate filename
      const filename = file.originalname || file.filename;
      if (!/^[a-zA-Z0-9._-]+\.(csv|CSV)$/.test(filename)) {
        return next(new ValidationError('Invalid filename. Only alphanumeric characters, dots, hyphens, and underscores are allowed.'));
      }
    }
  }

  next();
};

/**
 * API Key Validation (Optional)
 */
const apiKeyValidation = (req, res, next) => {
  // Skip if API key is not required
  if (!process.env.REQUIRE_API_KEY || process.env.REQUIRE_API_KEY === 'false') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  const validApiKeys = (process.env.VALID_API_KEYS || '').split(',').filter(Boolean);

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'X-API-Key header is required'
    });
  }

  if (!validApiKeys.includes(apiKey)) {
    console.warn(`Invalid API key used: ${apiKey.substring(0, 8)}...`);
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }

  next();
};

/**
 * Request Logging for Security
 */
const securityLogging = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const method = req.method;
  const path = req.path;
  const userId = req.user ? req.user.id : 'anonymous';

  // Log security-relevant requests
  if (
    method !== 'GET' ||
    path.includes('/auth/') ||
    path.includes('/admin/') ||
    path.includes('/bulk/') ||
    path.includes('/reports/')
  ) {
    console.log(`[SECURITY] ${timestamp} - ${ip} - ${userId} - ${method} ${path} - ${userAgent}`);
  }

  // Log potential security threats
  if (
    path.includes('..') ||
    path.includes('/etc/') ||
    path.includes('/var/') ||
    path.includes('passwd') ||
    userAgent.toLowerCase().includes('bot') ||
    userAgent.toLowerCase().includes('crawler')
  ) {
    console.warn(`[SECURITY ALERT] ${timestamp} - ${ip} - ${method} ${path} - ${userAgent}`);
  }

  next();
};

/**
 * Brute Force Protection
 */
const bruteForceProtection = (req, res, next) => {
  // This is a simplified version. In production, use Redis or a database
  // to track failed attempts across multiple server instances

  if (!req.session) {
    req.session = {};
  }

  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  if (!global.bruteForceAttempts) {
    global.bruteForceAttempts = new Map();
  }

  const attempts = global.bruteForceAttempts.get(ip) || { count: 0, resetTime: now + windowMs };

  // Reset if window has expired
  if (now > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = now + windowMs;
  }

  // Check if IP is blocked
  if (attempts.count >= maxAttempts) {
    const remainingTime = Math.ceil((attempts.resetTime - now) / 1000);
    return res.status(429).json({
      success: false,
      error: 'Too many failed attempts',
      message: `Account temporarily locked. Try again in ${remainingTime} seconds.`,
      retryAfter: remainingTime
    });
  }

  // Increment counter on authentication failures
  res.on('finish', () => {
    if (req.path.includes('/auth/') && res.statusCode === 401) {
      attempts.count += 1;
      global.bruteForceAttempts.set(ip, attempts);
      console.warn(`Failed authentication attempt ${attempts.count}/${maxAttempts} from IP: ${ip}`);
    }
  });

  next();
};

module.exports = {
  corsOptions,
  helmetConfig,
  generalRateLimit,
  authRateLimit,
  bulkRateLimit,
  reportsRateLimit,
  speedLimiter,
  sanitizeInput,
  securityHeaders,
  ipValidation,
  fileUploadSecurity,
  apiKeyValidation,
  securityLogging,
  bruteForceProtection
};