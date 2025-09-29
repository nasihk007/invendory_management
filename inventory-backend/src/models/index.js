const { Sequelize } = require('sequelize');
const ConfigService = require('../config/config.service');

// Initialize ConfigService
const configService = new ConfigService();

// Create Sequelize instance
const sequelize = new Sequelize(configService.getDatabaseConfig());

// Import model definitions
const UserModel = require('./User');
const ProductModel = require('./Product');
const NotificationModel = require('./Notification');
const InventoryAuditModel = require('./Audit');

// Initialize models
const User = UserModel(sequelize);
const Product = ProductModel(sequelize);
const Notification = NotificationModel(sequelize);
const InventoryAudit = InventoryAuditModel(sequelize);

// Set up associations
const models = {
  User,
  Product,
  Notification,
  InventoryAudit
};

// Set up model associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Sync database
sequelize.sync().catch(error => {
  console.error('Database sync error:', error);
});

module.exports = {
  sequelize,
  User,
  Product,
  Notification,
  InventoryAudit
};