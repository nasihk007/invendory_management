const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and adds user information to request object
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get JWT config from app locals
    const jwtConfig = req.app.locals.config ? req.app.locals.config.getJwtConfig() : {
      secret: process.env.JWT_SECRET || 'default_secret',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    };

    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7) // Remove 'Bearer ' prefix
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'Access token is missing. Please provide a valid JWT token in Authorization header.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token Expired',
          message: 'Your session has expired. Please log in again.'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid Token',
          message: 'The provided token is invalid or malformed.'
        });
      } else {
        throw error;
      }
    }

    // Get user from database using models from app locals
    const User = req.app.locals.db ? req.app.locals.db.models.User : null;
    if (!User) {
      return res.status(500).json({
        error: 'Database Error',
        message: 'User model not available.'
      });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: 'User Not Found',
        message: 'The user associated with this token no longer exists.'
      });
    }

    // Add user to request object
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role;

    next();

  } catch (error) {
    return res.status(500).json({
      error: 'Authentication Error',
      message: 'An error occurred during authentication.'
    });
  }
};

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has required role
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'You must be logged in to access this resource.'
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        error: 'Insufficient Permissions',
        message: `This action requires ${requiredRole} role. Your current role: ${req.user.role}`
      });
    }

    next();
  };
};

/**
 * Manager role requirement middleware
 * Shorthand for requireRole('manager')
 */
const requireManager = requireRole('manager');

/**
 * Staff or Manager role requirement middleware
 * Allows both staff and manager roles
 */
const requireStaffOrManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'You must be logged in to access this resource.'
    });
  }

  const allowedRoles = ['staff', 'manager'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Insufficient Permissions',
      message: `This action requires staff or manager role. Your current role: ${req.user.role}`
    });
  }

  next();
};

/**
 * Optional authentication middleware
 * Adds user info to request if token is provided, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (token) {
      try {
        const jwtConfig = req.app.locals.config ? req.app.locals.config.getJwtConfig() : {
          secret: process.env.JWT_SECRET || 'default_secret'
        };
        const decoded = jwt.verify(token, jwtConfig.secret);
        const User = req.app.locals.db ? req.app.locals.db.models.User : null;
        const user = User ? await User.findByPk(decoded.userId) : null;

        if (user) {
          req.user = user;
          req.userId = user.id;
          req.userRole = user.role;
        }
      } catch (error) {
        // Ignore token errors in optional auth
      }
    }

    next();

  } catch (error) {
    next(); // Continue even on error
  }
};

/**
 * Generate JWT token for user
 */
const generateToken = (user, jwtConfig = null) => {
  if (!jwtConfig) {
    jwtConfig = {
      secret: process.env.JWT_SECRET || 'default_secret',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    };
  }

  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
    issuer: 'inventory-management-api',
    audience: 'inventory-management-client'
  });
};

/**
 * Verify JWT token (utility function)
 */
const verifyToken = (token, jwtConfig = null) => {
  if (!jwtConfig) {
    jwtConfig = {
      secret: process.env.JWT_SECRET || 'default_secret'
    };
  }

  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    throw error;
  }
};

/**
 * Middleware to check if user owns resource or is manager
 * Useful for user-specific resources
 */
const requireOwnershipOrManager = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'You must be logged in to access this resource.'
      });
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    const isOwner = req.user.id === parseInt(resourceUserId);
    const isManager = req.user.role === 'manager';

    if (!isOwner && !isManager) {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'You can only access your own resources unless you are a manager.'
      });
    }

    next();
  };
};

/**
 * Rate limiting middleware for authentication endpoints
 */
const authRateLimit = () => {
  const attempts = new Map(); // Simple in-memory store (use Redis in production)

  return (req, res, next) => {
    const clientId = req.ip;
    const now = Date.now();
    const rateLimitConfig = req.app.locals.config ? req.app.locals.config.getRateLimitConfig() : {
      windowMs: 900000, // 15 minutes
      authMax: 5
    };
    const windowMs = rateLimitConfig.windowMs;
    const maxAttempts = rateLimitConfig.authMax;

    if (!attempts.has(clientId)) {
      attempts.set(clientId, []);
    }

    const clientAttempts = attempts.get(clientId);

    // Remove expired attempts
    const validAttempts = clientAttempts.filter(timestamp => now - timestamp < windowMs);
    attempts.set(clientId, validAttempts);

    if (validAttempts.length >= maxAttempts) {
      return res.status(429).json({
        error: 'Too Many Attempts',
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil((validAttempts[0] + windowMs - now) / 1000)
      });
    }

    // Add current attempt
    validAttempts.push(now);
    attempts.set(clientId, validAttempts);

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireManager,
  requireStaffOrManager,
  optionalAuth,
  generateToken,
  verifyToken,
  requireOwnershipOrManager,
  authRateLimit
};