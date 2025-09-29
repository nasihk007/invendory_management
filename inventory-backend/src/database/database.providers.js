const { Sequelize } = require('sequelize');
const ConfigService = require('../config/config.service');

// Import all models
const User = require('../models/User');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const InventoryAudit = require('../models/Audit');

/**
 * Database providers configuration following dependency injection pattern
 * Similar to NestJS/TypeScript providers pattern but adapted for Node.js/Express
 */
const databaseProviders = [
  {
    provide: 'SEQUELIZE',
    useFactory: async (configService) => {
      const sequelize = new Sequelize(configService.getDatabaseConfig());

      // Add all models to Sequelize instance
      const models = {
        User: User(sequelize),
        Product: Product(sequelize),
        Notification: Notification(sequelize),
        InventoryAudit: InventoryAudit(sequelize)
      };

      // Set up model associations
      Object.keys(models).forEach(modelName => {
        if (models[modelName].associate) {
          models[modelName].associate(models);
        }
      });

      // Test connection and sync database silently
      await sequelize.authenticate();
      try {
      await sequelize.sync();
      } catch (error) {
        console.error('❌ Database synchronization failed:', error);
        throw error;
      }

      return sequelize;
    },
    inject: ['ConfigService']
  },
  {
    provide: 'ConfigService',
    useFactory: () => {
      const configService = new ConfigService();

      // Validate configuration silently
      try {
        configService.validateConfig();
      } catch (error) {
        console.error('❌ Configuration validation failed:', error);
        throw error;
      }

      return configService;
    }
  }
];

/**
 * Database provider factory function
 * Creates and initializes database connection with all models
 */
async function createDatabaseProvider() {
  const providers = new Map();

  // Create ConfigService first
  const configProvider = databaseProviders.find(p => p.provide === 'ConfigService');
  const configService = configProvider.useFactory();
  providers.set('ConfigService', configService);

  // Create Sequelize instance
  const sequelizeProvider = databaseProviders.find(p => p.provide === 'SEQUELIZE');
  const sequelize = await sequelizeProvider.useFactory(configService);
  providers.set('SEQUELIZE', sequelize);

  // Return both providers
  return {
    sequelize,
    configService,
    models: sequelize.models,
    providers
  };
}

/**
 * Initialize database and return all models
 * This is the main function to be called from the application
 */
async function initializeDatabase() {
  const { sequelize, configService, models } = await createDatabaseProvider();

  return {
    sequelize,
    configService,
    models,
    // Export individual models for convenience
    User: models.User,
    Product: models.Product,
    Notification: models.Notification,
    InventoryAudit: models.InventoryAudit
  };
}

/**
 * Graceful database cleanup
 */
async function closeDatabaseConnection(sequelize) {
  if (sequelize) {
    await sequelize.close();
  }
}

module.exports = {
  databaseProviders,
  createDatabaseProvider,
  initializeDatabase,
  closeDatabaseConnection
};