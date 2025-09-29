const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'SKU cannot be empty'
        },
        is: {
          args: /^[A-Z0-9-]+$/,
          msg: 'SKU must contain only uppercase letters, numbers, and hyphens'
        }
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: {
          args: [2, 255],
          msg: 'Product name must be between 2 and 255 characters'
        },
        notEmpty: {
          msg: 'Product name cannot be empty'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Category cannot be empty'
        }
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
      // validate: {
      //   min: {
      //     args: 0,
      //     msg: 'Quantity must be non-negative'
      //   }
      // }
    },
    reorder_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10
      // validate: {
      //   min: {
      //     args: 0,
      //     msg: 'Reorder level must be non-negative'
      //   }
      // }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
      // validate: {
      //   min: {
      //     args: 0,
      //     msg: 'Price must be non-negative'
      //   }
      // }
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_sku',
        fields: ['sku']
      },
      {
        name: 'idx_name',
        fields: ['name']
      },
      {
        name: 'idx_category',
        fields: ['category']
      },
      {
        name: 'idx_quantity',
        fields: ['quantity']
      },
      {
        name: 'idx_reorder_level',
        fields: ['reorder_level']
      },
      {
        name: 'idx_created_at',
        fields: ['created_at']
      }
    ],
    hooks: {
      afterUpdate: async (product, options) => {
        if (product.changed('quantity')) {
          const oldQuantity = product._previousDataValues.quantity;
          const newQuantity = product.quantity;

          if (newQuantity <= product.reorder_level && oldQuantity > product.reorder_level) {
            await product.createLowStockNotification();
          }
        }
      }
    }
  });

  Product.prototype.isLowStock = function() {
    return this.quantity <= this.reorder_level;
  };

  Product.prototype.isOutOfStock = function() {
    return this.quantity === 0;
  };

  Product.prototype.getTotalValue = function() {
    return this.quantity * this.price;
  };

  Product.prototype.createLowStockNotification = async function() {
    const { Notification } = sequelize.models;

    const notificationType = this.quantity === 0 ? 'out_of_stock' : 'low_stock';
    const message = this.quantity === 0
      ? 'Product is out of stock'
      : `Product quantity (${this.quantity}) is below reorder level (${this.reorder_level})`;

    const existingNotification = await Notification.findOne({
      where: {
        product_id: this.id,
        type: notificationType,
        is_read: false
      }
    });

    if (!existingNotification) {
      await Notification.create({
        product_id: this.id,
        message,
        type: notificationType
      });
    }
  };

  Product.updateStock = async function(id, newQuantity, userId, reason, operationType = 'manual_adjustment') {
    const { InventoryAudit } = sequelize.models;

    return await sequelize.transaction(async (t) => {
      const product = await Product.findByPk(id, {
        lock: true,
        transaction: t
      });

      if (!product) {
        throw new Error('Product not found');
      }

      const oldQuantity = product.quantity;

      await product.update({ quantity: newQuantity }, { transaction: t });

      await InventoryAudit.create({
        product_id: id,
        user_id: userId,
        old_quantity: oldQuantity,
        new_quantity: newQuantity,
        reason,
        operation_type: operationType
      }, { transaction: t });

      return product;
    });
  };

  Product.findWithFilters = async function(options = {}) {
    const {
      limit = 50,
      offset = 0,
      search = null,
      category = null,
      lowStock = false,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (lowStock) {
      where[Op.and] = sequelize.literal('quantity <= reorder_level');
    }

    const allowedSortFields = ['name', 'sku', 'category', 'quantity', 'price', 'created_at'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const result = await Product.findAndCountAll({
      where,
      limit,
      offset,
      order: [[validSortBy, validSortOrder]]
    });

    return {
      products: result.rows,
      total: result.count,
      limit,
      offset,
      filters: { search, category, lowStock },
      sort: { sortBy: validSortBy, sortOrder: validSortOrder }
    };
  };

  Product.findLowStock = async function(limit = 10) {
    return await Product.findAll({
      where: sequelize.literal('quantity <= reorder_level'),
      order: [['quantity', 'ASC'], ['reorder_level', 'DESC']],
      limit
    });
  };

  Product.getLowStockProducts = async function(limit = 100) {
    return await Product.findAll({
      where: sequelize.literal('quantity <= reorder_level'),
      order: [['quantity', 'ASC'], ['reorder_level', 'DESC']],
      limit
    });
  };

  Product.getCategories = async function() {
    const results = await Product.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      order: [['category', 'ASC']],
      raw: true
    });
    return results.map(result => result.category);
  };

  // Custom finder methods
  Product.findById = async function(id) {
    return await Product.findByPk(id);
  };

  Product.findBySku = async function(sku) {
    return await Product.findOne({ where: { sku } });
  };

  Product.findAllWithFilters = async function(options = {}) {
    const {
      limit = 50,
      offset = 0,
      search = null,
      category = null,
      ...otherOptions
    } = options;

    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category) {
      where.category = category;
    }

    const result = await Product.findAndCountAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      ...otherOptions
    });

    return {
      products: result.rows,
      total: result.count
    };
  };

  Product.update = async function(id, updateData) {
    const product = await Product.findByPk(id);
    if (!product) {
      throw new Error('Product not found');
    }

    await product.update(updateData);
    return product;
  };

  Product.delete = async function(id) {
    const product = await Product.findByPk(id);
    if (!product) {
      return false;
    }

    await product.destroy();
    return true;
  };

  Product.associate = function(models) {
    Product.hasMany(models.Notification, {
      foreignKey: 'product_id',
      as: 'notifications',
      onDelete: 'CASCADE'
    });

    Product.hasMany(models.InventoryAudit, {
      foreignKey: 'product_id',
      as: 'auditLogs',
      onDelete: 'CASCADE'
    });
  };

  return Product;
};