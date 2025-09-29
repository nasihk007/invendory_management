const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: {
          args: [3, 50],
          msg: 'Username must be between 3 and 50 characters'
        },
        notEmpty: {
          msg: 'Username cannot be empty'
        }
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address'
        },
        notEmpty: {
          msg: 'Email cannot be empty'
        }
      }
    },
    password: {
      type: DataTypes.VIRTUAL,
      allowNull: true,
      validate: {
        len: {
          args: [8, 100],
          msg: 'Password must be between 8 and 100 characters'
        }
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Password hash cannot be empty'
        }
      }
    },
    role: {
      type: DataTypes.ENUM('staff', 'manager'),
      allowNull: false,
      defaultValue: 'staff',
      validate: {
        isIn: {
          args: [['staff', 'manager']],
          msg: 'Role must be either staff or manager'
        }
      }
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_username',
        fields: ['username']
      },
      {
        name: 'idx_email',
        fields: ['email']
      },
      {
        name: 'idx_role',
        fields: ['role']
      }
    ],
    hooks: {
      beforeCreate: async (user) => {
        if (user.dataValues.password) {
          user.dataValues.password_hash = await bcrypt.hash(user.dataValues.password, 12);
          delete user.dataValues.password;
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password') && user.dataValues.password) {
          user.dataValues.password_hash = await bcrypt.hash(user.dataValues.password, 12);
          delete user.dataValues.password;
        }
      }
    }
  });

  User.prototype.validatePassword = async function(password) {
    return await bcrypt.compare(password, this.password_hash);
  };

  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password_hash;
    return values;
  };

  User.prototype.hasRole = function(requiredRole) {
    return this.role === requiredRole;
  };

  User.prototype.isManager = function() {
    return this.role === 'manager';
  };

  User.associate = function(models) {
    User.hasMany(models.InventoryAudit, {
      foreignKey: 'user_id',
      as: 'auditLogs'
    });
  };

  return User;
};