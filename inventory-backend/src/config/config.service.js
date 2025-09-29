const path = require('path');
require('dotenv').config();

/**
 * Configuration service for centralized application configuration
 * Provides database configuration and other application settings
 */
class ConfigService {
  constructor() {
    this.nodeEnv = process.env.NODE_ENV || 'development';
    this.port = parseInt(process.env.PORT) || 3000;
    this.appName = 'Inventory Management API';
    this.version = '1.0.0';
  }

  /**
   * Get database configuration for Sequelize
   * @returns {Object} Sequelize configuration object
   */
  getDatabaseConfig() {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME || 'inventory_management',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      dialect: 'mysql',
      logging: false,
      pool: {
        min: parseInt(process.env.CONNECTION_POOL_MIN) || 5,
        max: parseInt(process.env.CONNECTION_POOL_MAX) || 20,
        acquire: parseInt(process.env.QUERY_TIMEOUT) || 30000,
        idle: 10000,
        evict: 10000,
        handleDisconnects: true
      },
      define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        underscored: true,
        timestamps: true
      },
      timezone: '+00:00'
    };
  }

  /**
   * Get JWT configuration
   * @returns {Object} JWT configuration
   */
  getJwtConfig() {
    return {
      secret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    };
  }

  /**
   * Get bcrypt configuration
   * @returns {Object} Bcrypt configuration
   */
  getBcryptConfig() {
    return {
      rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
    };
  }

  /**
   * Get CORS configuration
   * @returns {Object} CORS configuration
   */
  getCorsConfig() {
    return {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
      credentials: process.env.CORS_CREDENTIALS === 'true'
    };
  }

  /**
   * Get rate limiting configuration
   * @returns {Object} Rate limiting configuration
   */
  getRateLimitConfig() {
    return {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5
    };
  }

  /**
   * Get file upload configuration
   * @returns {Object} Upload configuration
   */
  getUploadConfig() {
    return {
      maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760, // 10MB
      path: process.env.UPLOAD_PATH || './uploads'
    };
  }

  /**
   * Get application information
   * @returns {Object} Application info
   */
  getAppInfo() {
    return {
      name: this.appName,
      version: this.version,
      environment: this.nodeEnv,
      port: this.port,
      startTime: new Date().toISOString()
    };
  }

  /**
   * Check if running in development mode
   * @returns {boolean}
   */
  isDevelopment() {
    return this.nodeEnv === 'development';
  }

  /**
   * Check if running in production mode
   * @returns {boolean}
   */
  isProduction() {
    return this.nodeEnv === 'production';
  }

  /**
   * Check if running in test mode
   * @returns {boolean}
   */
  isTest() {
    return this.nodeEnv === 'test';
  }

  /**
   * Get business rules configuration
   * @returns {Object} Business rules
   */
  getBusinessRules() {
    return {
      defaultReorderLevel: parseInt(process.env.DEFAULT_REORDER_LEVEL) || 10,
      lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD) || 5,
      autoGenerateSku: process.env.AUTO_GENERATE_SKU === 'true'
    };
  }

  /**
   * Get audit configuration
   * @returns {Object} Audit configuration
   */
  getAuditConfig() {
    return {
      retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS) || 365,
      logEnabled: process.env.AUDIT_LOG_ENABLED !== 'false'
    };
  }

  /**
   * Validate critical environment variables
   * @throws {Error} If critical variables are missing
   */
  validateConfig() {
    const required = [
      'DB_HOST',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'JWT_SECRET'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate JWT secret length in production
    if (this.isProduction() && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long in production');
    }
  }
}

module.exports = ConfigService;