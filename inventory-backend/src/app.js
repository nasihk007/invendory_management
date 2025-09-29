const express = require('express');
const helmet = require('helmet');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const {
  corsOptions,
  helmetConfig,
  generalRateLimit,
  // authRateLimit, // REMOVED - No longer needed
  bulkRateLimit,
  reportsRateLimit,
  speedLimiter,
  securityHeaders,
  ipValidation,
  securityLogging,
  // bruteForceProtection // REMOVED - No longer needed
} = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const reportRoutes = require('./routes/reportRoutes');
const bulkRoutes = require('./routes/bulkRoutes');

/**
 * Create and configure Express application with database provider
 * @param {Object} dbProvider - Database provider containing sequelize, models, and configService
 */
function createApp(dbProvider = null) {
  const app = express();

  // Store database provider in app for access in routes
  if (dbProvider) {
    app.locals.db = dbProvider;
    app.locals.config = dbProvider.configService;

    // Initialize AuthService with User model
    const AuthService = require('./services/authService');
    AuthService.setUserModel(dbProvider.models.User);
  }

  // Trust proxy for proper IP detection
  app.set('trust proxy', 1);

  // Security headers (Helmet)
  app.use(helmet(helmetConfig));

  // Custom security headers
  app.use(securityHeaders);

  // IP validation and blocking
  app.use(ipValidation);

  // Security logging
  app.use(securityLogging);

  // Brute force protection
  // app.use(bruteForceProtection); // DISABLED - No authentication limits needed

  // CORS with advanced configuration
  app.use(require('cors')(corsOptions));

  // Speed limiting (progressive delay)
  app.use(speedLimiter);

  // General rate limiting
  app.use(generalRateLimit);

  // Body parsing middleware with security limits
  app.use(express.json({
    limit: '1mb', // Reduced from 10mb for security
    strict: true,
    type: ['application/json', 'application/vnd.api+json']
  }));
  app.use(express.urlencoded({
    extended: true,
    limit: '1mb', // Reduced from 10mb for security
    parameterLimit: 100 // Limit number of parameters
  }));

  // Request logging middleware
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'development') {
    app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  // Health check endpoint with database provider
  app.get('/health', async (req, res) => {
    try {
      let dbConnected = false;
      let dbInfo = 'not connected';

      // Test database connection if provider is available
      if (app.locals.db && app.locals.db.sequelize) {
        try {
          await app.locals.db.sequelize.authenticate();
          dbConnected = true;
          const dbConfig = app.locals.config.getDatabaseConfig();
          dbInfo = `${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`;
        } catch (dbError) {
          dbConnected = false;
          dbInfo = 'connection failed';
        }
      }

      const appInfo = app.locals.config ? app.locals.config.getAppInfo() : {
        name: 'Inventory Management API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      const healthStatus = {
        status: dbConnected ? 'ok' : 'warning',
        timestamp: new Date().toISOString(),
        application: {
          name: appInfo.name,
          version: appInfo.version,
          environment: appInfo.environment,
          uptime: `${Math.floor(process.uptime())}s`,
          memoryUsage: {
            used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
          }
        },
        database: {
          status: dbConnected ? 'connected' : 'disconnected',
          info: dbInfo,
          models: app.locals.db ? Object.keys(app.locals.db.models).length : 0
        },
        system: {
          nodeVersion: process.version,
          platform: `${process.platform} ${process.arch}`
        }
      };

      res.status(dbConnected ? 200 : 503).json(healthStatus);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error.message
      });
    }
  });

  // API Documentation endpoint
  app.get('/', (req, res) => {
    const appInfo = app.locals.config ? app.locals.config.getAppInfo() : {
      name: 'Inventory Management API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      name: appInfo.name,
      version: appInfo.version,
      description: 'Production-ready inventory management system with JWT authentication and database provider pattern',
      environment: appInfo.environment,
      startTime: appInfo.startTime,
      endpoints: {
        health: 'GET /health',
        authentication: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login'
        },
        products: {
          list: 'GET /api/products',
          create: 'POST /api/products',
          get: 'GET /api/products/:id',
          update: 'PUT /api/products/:id',
          delete: 'DELETE /api/products/:id'
        },
        bulk: {
          import: 'POST /api/products/import (Manager only)',
          export: 'GET /api/products/export'
        },
        notifications: {
          list: 'GET /api/notifications',
          markRead: 'PUT /api/notifications/:id/read'
        },
        audit: {
          list: 'GET /api/audit'
        },
        reports: {
          inventory: 'GET /api/reports/inventory-valuation (Manager only)',
          sales: 'GET /api/reports/sales-performance (Manager only)',
          stockMovement: 'GET /api/reports/stock-movement (Manager only)',
          userActivity: 'GET /api/reports/user-activity (Manager only)',
          lowStockAlerts: 'GET /api/reports/low-stock-alerts (Manager only)',
          executiveSummary: 'GET /api/reports/executive-summary (Manager only)'
        }
      },
      documentation: 'API documentation available at /api-docs'
    });
  });

  // Static file serving for uploads
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Swagger API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Inventory Management API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true
    }
  }));

  // API Routes with specific rate limiting - Auth rate limiting DISABLED
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/reports', reportsRateLimit, reportRoutes);
  app.use('/api/bulk', bulkRateLimit, bulkRoutes);

  // 404 handler for unmatched routes
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      availableEndpoints: [
        'GET /',
        'GET /health',
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/products',
        'GET /api/notifications',
        'GET /api/audit',
        'GET /api/reports/low-stock'
      ]
    });
  });

  // Global error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

module.exports = createApp;