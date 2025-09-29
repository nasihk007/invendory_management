const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { AuthenticationError, ValidationError, ConflictError } = require('../middleware/errorHandler');

// Default configuration (can be overridden by ConfigService)
const defaultConfig = {
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  }
};

// Dynamic User model - will be set by the app initialization
let User = null;

/**
 * Authentication Service
 * Business logic for authentication operations
 */
class AuthService {
  /**
   * Set the User model (called during app initialization)
   * @param {Object} userModel - Sequelize User model
   */
  static setUserModel(userModel) {
    User = userModel;
  }

  /**
   * Get User model
   * @returns {Object} User model
   */
  static getUserModel() {
    if (!User) {
      throw new Error('User model not initialized. Please ensure database provider is set up correctly.');
    }
    return User;
  }
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email address
   * @param {string} userData.password - Plain text password
   * @param {string} userData.role - User role (staff/manager)
   * @param {Object} currentUser - Current authenticated user (for role validation)
   * @returns {Promise<Object>} Registration result with user and token
   */
  static async registerUser(userData, currentUser = null) {
    const { username, email, password, role = 'staff' } = userData;

    try {
      // Validate input
      await this.validateRegistrationData({ username, email, password, role });

      // Check role assignment permissions
      if (role === 'manager' && (!currentUser || currentUser.role !== 'manager')) {
        throw new ValidationError('Only managers can create manager accounts');
      }

      // Check for existing users
      await this.checkUserExists(email, username);

      // Validate password strength
      this.validatePasswordStrength(password);

      // Create user
      const newUser = await User.create({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password,
        role
      });

      // Generate token
      const token = this.generateToken(newUser);

      // Prepare response
      return {
        user: newUser.toJSON(),
        token,
        expiresIn: defaultConfig.jwt.expiresIn
      };

    } catch (error) {
      if (error.message.includes('already exists')) {
        throw new ConflictError(error.message);
      }
      throw error;
    }
  }

  /**
   * Authenticate user login
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<Object>} Login result with user and token
   */
  static async authenticateUser(email, password) {
    try {
      // Validate input
      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      // Find user by email
      const user = await User.findOne({
        where: { email: email.toLowerCase().trim() }
      });

      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Validate password
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Generate token
      const token = this.generateToken(user);

      return {
        user: user.toJSON(),
        token,
        expiresIn: defaultConfig.jwt.expiresIn
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh user token
   * @param {Object} user - Current user object
   * @returns {Promise<Object>} New token
   */
  static async refreshUserToken(user) {
    try {
      // Verify user still exists and is active
      const currentUser = await User.findByPk(user.id);
      if (!currentUser) {
        throw new AuthenticationError('User account no longer exists');
      }

      // Generate new token
      const token = this.generateToken(currentUser);

      return {
        token,
        expiresIn: defaultConfig.jwt.expiresIn
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user
      const user = await User.findByPk(userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Validate new password
      this.validatePasswordStrength(newPassword);

      // Update password - use Sequelize update
      await user.update({ password: newPassword });
      return true;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {number} userId - User ID
   * @param {Object} updateData - Profile update data
   * @returns {Promise<Object>} Updated user
   */
  static async updateUserProfile(userId, updateData) {
    try {
      const { username, email } = updateData;

      // Get current user
      const currentUser = await User.findByPk(userId);
      if (!currentUser) {
        throw new AuthenticationError('User not found');
      }

      // Check for conflicts if email/username is being changed
      if (email && email !== currentUser.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser && existingUser.id !== userId) {
          throw new ConflictError('Email address is already in use');
        }
      }

      if (username && username !== currentUser.username) {
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser && existingUser.id !== userId) {
          throw new ConflictError('Username is already taken');
        }
      }

      // Update user
      await currentUser.update({
        username: username?.trim(),
        email: email?.toLowerCase().trim()
      });

      return currentUser;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user statistics (for managers)
   * @returns {Promise<Object>} User statistics
   */
  static async getUserStatistics() {
    try {
      const totalUsers = await User.count();
      const staffCount = await User.count({ where: { role: 'staff' } });
      const managerCount = await User.count({ where: { role: 'manager' } });

      return {
        total_users: totalUsers,
        staff_count: staffCount,
        manager_count: managerCount,
        roles_distribution: {
          staff: totalUsers > 0 ? ((staffCount / totalUsers) * 100).toFixed(1) + '%' : '0%',
          manager: totalUsers > 0 ? ((managerCount / totalUsers) * 100).toFixed(1) + '%' : '0%'
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate registration data
   * @private
   */
  static async validateRegistrationData({ username, email, password, role }) {
    if (!username || username.trim().length < 3) {
      throw new ValidationError('Username must be at least 3 characters long');
    }

    if (!email || !this.isValidEmail(email)) {
      throw new ValidationError('Please provide a valid email address');
    }

    if (!password) {
      throw new ValidationError('Password is required');
    }

    if (role && !['staff', 'manager'].includes(role)) {
      throw new ValidationError('Role must be either "staff" or "manager"');
    }
  }

  /**
   * Check if user already exists
   * @private
   */
  static async checkUserExists(email, username) {
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
      throw new Error('Email address is already registered');
    }

    const existingUserByUsername = await User.findOne({ where: { username } });
    if (existingUserByUsername) {
      throw new Error('Username is already taken');
    }
  }

  /**
   * Validate password strength
   * @private
   */
  static validatePasswordStrength(password) {
    if (!password || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      throw new ValidationError('Password must contain at least one letter and one number');
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password', '12345678', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', '123456789', 'password1'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      throw new ValidationError('Password is too common. Please choose a stronger password');
    }
  }

  /**
   * Validate email format
   * @private
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate JWT token
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  static generateToken(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, defaultConfig.jwt.secret, {
      expiresIn: defaultConfig.jwt.expiresIn,
      issuer: 'inventory-management-api',
      audience: 'inventory-management-client'
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, defaultConfig.jwt.secret);
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  }

  /**
   * Hash password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password) {
    try {
      return await bcrypt.hash(password, defaultConfig.bcryptRounds);
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} Verification result
   */
  static async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Generate secure random password
   * @param {number} length - Password length
   * @returns {string} Random password
   */
  static generateRandomPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one of each required character type
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special

    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Validate user permissions for action
   * @param {Object} currentUser - Current user
   * @param {string} action - Action being performed
   * @param {Object} targetUser - Target user (optional)
   * @returns {boolean} Permission granted
   */
  static validatePermissions(currentUser, action, targetUser = null) {
    switch (action) {
      case 'view_users':
      case 'create_manager':
      case 'update_user_role':
      case 'delete_user':
        return currentUser.role === 'manager';

      case 'update_own_profile':
        return true; // All authenticated users can update their own profile

      case 'update_other_profile':
        return currentUser.role === 'manager' ||
               (targetUser && currentUser.id === targetUser.id);

      default:
        return false;
    }
  }
}

module.exports = AuthService;