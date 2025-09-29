const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryAudit = sequelize.define('InventoryAudit', {
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    },
    old_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
      // validate: {
      //   min: {
      //     args: 0,
      //     msg: 'Old quantity must be non-negative'
      //   }
      // }
    },
    new_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
      // validate: {
      //   min: {
      //     args: 0,
      //     msg: 'New quantity must be non-negative'
      //   }
      // }
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: {
          args: [3, 255],
          msg: 'Reason must be between 3 and 255 characters'
        },
        notEmpty: {
          msg: 'Reason cannot be empty'
        }
      }
    },
    operation_type: {
      type: DataTypes.ENUM('manual_adjustment', 'sale', 'purchase', 'damage', 'transfer', 'correction'),
      allowNull: false,
      defaultValue: 'manual_adjustment',
      validate: {
        isIn: {
          args: [['manual_adjustment', 'sale', 'purchase', 'damage', 'transfer', 'correction']],
          msg: 'Operation type must be one of: manual_adjustment, sale, purchase, damage, transfer, correction'
        }
      }
    }
  }, {
    tableName: 'inventory_audit',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        name: 'idx_product_id',
        fields: ['product_id']
      },
      {
        name: 'idx_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_created_at',
        fields: ['created_at']
      },
      {
        name: 'idx_operation_type',
        fields: ['operation_type']
      },
      {
        name: 'idx_product_date',
        fields: ['product_id', 'created_at']
      },
      {
        name: 'idx_user_date',
        fields: ['user_id', 'created_at']
      }
    ]
  });

  InventoryAudit.prototype.getQuantityChange = function() {
    return this.new_quantity - this.old_quantity;
  };

  InventoryAudit.prototype.isIncrease = function() {
    return this.getQuantityChange() > 0;
  };

  InventoryAudit.prototype.isDecrease = function() {
    return this.getQuantityChange() < 0;
  };

  InventoryAudit.prototype.getAbsoluteChange = function() {
    return Math.abs(this.getQuantityChange());
  };

  InventoryAudit.prototype.toDisplayFormat = function() {
    return {
      id: this.id,
      product: this.Product ? `${this.Product.sku} - ${this.Product.name}` : 'Unknown Product',
      user: this.User ? `${this.User.username} (${this.User.role})` : 'Unknown User',
      change: {
        from: this.old_quantity,
        to: this.new_quantity,
        difference: this.getQuantityChange(),
        type: this.isIncrease() ? 'increase' : 'decrease'
      },
      reason: this.reason,
      operation_type: this.operation_type,
      timestamp: this.created_at
    };
  };

  InventoryAudit.findWithFilters = async function(options = {}) {
    const {
      limit = 50,
      offset = 0,
      productId = null,
      userId = null,
      operationType = null,
      dateFrom = null,
      dateTo = null
    } = options;

    const where = {};

    if (productId) {
      where.product_id = productId;
    }

    if (userId) {
      where.user_id = userId;
    }

    if (operationType) {
      where.operation_type = operationType;
    }

    if (dateFrom) {
      where.created_at = { ...where.created_at, [Op.gte]: new Date(dateFrom) };
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.created_at = { ...where.created_at, [Op.lte]: endDate };
    }

    const result = await InventoryAudit.findAndCountAll({
      where,
      include: [
        {
          model: sequelize.models.Product,
          as: 'Product',
          attributes: ['name', 'sku', 'category']
        },
        {
          model: sequelize.models.User,
          as: 'User',
          attributes: ['username', 'email', 'role']
        }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return {
      audits: result.rows,
      total: result.count,
      limit,
      offset,
      filters: { productId, userId, operationType, dateFrom, dateTo }
    };
  };

  InventoryAudit.findByDateRange = async function(dateFrom, dateTo, limit = 1000) {
    const where = {};

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom);
      if (dateTo) where.created_at[Op.lte] = new Date(dateTo);
    }

    return await InventoryAudit.findAll({
      where,
      include: [
        {
          model: sequelize.models.Product,
          as: 'Product',
          attributes: ['id', 'sku', 'name', 'category']
        },
        {
          model: sequelize.models.User,
          as: 'User',
          attributes: ['id', 'username', 'role']
        }
      ],
      order: [['created_at', 'DESC']],
      limit
    });
  };

  InventoryAudit.getDailySummary = async function(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await InventoryAudit.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('COUNT', '*'), 'total_changes'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN (new_quantity - old_quantity) > 0 THEN (new_quantity - old_quantity) ELSE 0 END')), 'total_increases'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN (new_quantity - old_quantity) < 0 THEN ABS(new_quantity - old_quantity) ELSE 0 END')), 'total_decreases'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('product_id'))), 'products_affected'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'users_involved']
      ],
      where: {
        created_at: {
          [Op.gte]: startDate
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'DESC']]
    });
  };

  InventoryAudit.getStatsByOperationType = async function(days = null) {
    const where = {};

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      where.created_at = { [Op.gte]: startDate };
    }

    return await InventoryAudit.findAll({
      attributes: [
        'operation_type',
        [sequelize.fn('COUNT', '*'), 'total_operations'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN (new_quantity - old_quantity) > 0 THEN (new_quantity - old_quantity) ELSE 0 END')), 'total_increases'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN (new_quantity - old_quantity) < 0 THEN ABS(new_quantity - old_quantity) ELSE 0 END')), 'total_decreases'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('product_id'))), 'products_affected']
      ],
      where,
      group: ['operation_type'],
      order: [[sequelize.fn('COUNT', '*'), 'DESC']]
    });
  };

  InventoryAudit.getMostActiveUsers = async function(limit = 10, days = null) {
    const where = {};

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      where.created_at = { [Op.gte]: startDate };
    }

    return await InventoryAudit.findAll({
      attributes: [
        [sequelize.fn('COUNT', '*'), 'total_operations'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN (new_quantity - old_quantity) > 0 THEN (new_quantity - old_quantity) ELSE 0 END')), 'total_increases'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN (new_quantity - old_quantity) < 0 THEN ABS(new_quantity - old_quantity) ELSE 0 END')), 'total_decreases']
      ],
      include: [{
        model: sequelize.models.User,
        as: 'User',
        attributes: ['username', 'email', 'role']
      }],
      where,
      group: ['user_id'],
      order: [[sequelize.fn('COUNT', '*'), 'DESC']],
      limit
    });
  };

  InventoryAudit.getMostChangedProducts = async function(limit = 10, days = null) {
    const where = {};

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      where.created_at = { [Op.gte]: startDate };
    }

    return await InventoryAudit.findAll({
      attributes: [
        [sequelize.fn('COUNT', '*'), 'total_changes'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN (new_quantity - old_quantity) > 0 THEN (new_quantity - old_quantity) ELSE 0 END')), 'total_increases'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN (new_quantity - old_quantity) < 0 THEN ABS(new_quantity - old_quantity) ELSE 0 END')), 'total_decreases']
      ],
      include: [{
        model: sequelize.models.Product,
        as: 'Product',
        attributes: ['sku', 'name', 'category']
      }],
      where,
      group: ['product_id'],
      order: [[sequelize.fn('COUNT', '*'), 'DESC']],
      limit
    });
  };

  InventoryAudit.deleteOldRecords = async function(daysOld = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await InventoryAudit.destroy({
      where: {
        created_at: {
          [Op.lt]: cutoffDate
        }
      }
    });
  };

  InventoryAudit.associate = function(models) {
    InventoryAudit.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'Product',
      onDelete: 'CASCADE'
    });

    InventoryAudit.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'User',
      onDelete: 'RESTRICT'
    });
  };

  return InventoryAudit;
};