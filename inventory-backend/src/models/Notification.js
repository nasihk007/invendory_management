const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Message cannot be empty'
        }
      }
    },
    type: {
      type: DataTypes.ENUM('low_stock', 'out_of_stock', 'reorder_required'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['low_stock', 'out_of_stock', 'reorder_required']],
          msg: 'Type must be low_stock, out_of_stock, or reorder_required'
        }
      }
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_product_id',
        fields: ['product_id']
      },
      {
        name: 'idx_type',
        fields: ['type']
      },
      {
        name: 'idx_is_read',
        fields: ['is_read']
      },
      {
        name: 'idx_created_at',
        fields: ['created_at']
      },
      {
        name: 'idx_product_type',
        fields: ['product_id', 'type']
      }
    ]
  });

  Notification.prototype.isUnread = function() {
    return !this.is_read;
  };

  Notification.prototype.isCritical = function() {
    return this.type === 'out_of_stock';
  };

  Notification.prototype.getFormattedMessage = function() {
    const productInfo = this.Product ? ` (${this.Product.sku} - ${this.Product.name})` : '';
    return `${this.message}${productInfo}`;
  };

  Notification.findWithFilters = async function(options = {}) {
    const {
      limit = 50,
      offset = 0,
      unreadOnly = false,
      type = null,
      productId = null
    } = options;

    const where = {};

    if (unreadOnly) {
      where.is_read = false;
    }

    if (type) {
      where.type = type;
    }

    if (productId) {
      where.product_id = productId;
    }

    const result = await Notification.findAndCountAll({
      where,
      include: [{
        model: sequelize.models.Product,
        as: 'Product',
        attributes: ['name', 'sku', 'category', 'quantity', 'reorder_level']
      }],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      notifications: result.rows,
      total: result.count,
      limit,
      offset,
      filters: { unreadOnly, type, productId }
    };
  };

  Notification.getUnreadCount = async function(type = null) {
    const where = { is_read: false };

    if (type) {
      where.type = type;
    }

    return await Notification.count({ where });
  };

  Notification.markAsRead = async function(id) {
    const [updatedRowsCount] = await Notification.update(
      { is_read: true },
      { where: { id } }
    );
    return updatedRowsCount > 0;
  };

  Notification.markMultipleAsRead = async function(ids) {
    if (ids.length === 0) return 0;

    const [updatedRowsCount] = await Notification.update(
      { is_read: true },
      { where: { id: { [Op.in]: ids } } }
    );
    return updatedRowsCount;
  };

  Notification.markAllAsRead = async function(type = null) {
    const where = {};

    if (type) {
      where.type = type;
    }

    const [updatedRowsCount] = await Notification.update(
      { is_read: true },
      { where }
    );
    return updatedRowsCount;
  };

  Notification.deleteOldRead = async function(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deletedCount = await Notification.destroy({
      where: {
        is_read: true,
        created_at: {
          [Op.lt]: cutoffDate
        }
      }
    });
    return deletedCount;
  };

  Notification.createLowStockIfNotExists = async function(productId, currentQuantity, reorderLevel) {
    const existing = await Notification.findOne({
      where: {
        product_id: productId,
        type: { [Op.in]: ['low_stock', 'out_of_stock'] },
        is_read: false
      }
    });

    if (existing) {
      return null;
    }

    const type = currentQuantity === 0 ? 'out_of_stock' : 'low_stock';
    const message = currentQuantity === 0
      ? 'Product is out of stock and needs immediate attention'
      : `Product quantity (${currentQuantity}) is below reorder level (${reorderLevel})`;

    return await Notification.create({
      product_id: productId,
      message,
      type
    });
  };

  Notification.getStatsByType = async function() {
    const stats = await Notification.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', '*'), 'total'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN is_read = FALSE THEN 1 ELSE 0 END')), 'unread']
      ],
      group: ['type'],
      order: [['type', 'ASC']]
    });

    const result = {
      low_stock: { total: 0, unread: 0 },
      out_of_stock: { total: 0, unread: 0 },
      reorder_required: { total: 0, unread: 0 }
    };

    stats.forEach(stat => {
      result[stat.type] = {
        total: parseInt(stat.getDataValue('total')),
        unread: parseInt(stat.getDataValue('unread'))
      };
    });

    return result;
  };

  Notification.getRecent = async function(limit = 10, unreadOnly = false) {
    const where = unreadOnly ? { is_read: false } : {};

    return await Notification.findAll({
      where,
      include: [{
        model: sequelize.models.Product,
        as: 'Product',
        attributes: ['name', 'sku', 'category']
      }],
      order: [['created_at', 'DESC']],
      limit
    });
  };

  Notification.associate = function(models) {
    Notification.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'Product',
      onDelete: 'CASCADE'
    });
  };

  return Notification;
};