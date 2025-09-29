const { User } = require('../models');
const { Op } = require('sequelize');
const { generateToken } = require('../middleware/auth');
const { AuthenticationError, ConflictError, ValidationError, NotFoundError } = require('../middleware/errorHandler');
const authService = require('../services/authService');
const bcrypt = require('bcrypt');
const DataResponseDto = require('../shared/dto/DataResponseDto');
const PageOptionsDto = require('../shared/dto/PageOptionsDto');
const { ResponseMessages, HttpStatus } = require('../constants/constants');

/**
 * User Registration Controller
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password, role = 'staff' } = req.body;

    // Check if user already exists
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
      throw new ConflictError('Email address is already registered');
    }

    const existingUserByUsername = await User.findOne({ where: { username } });
    if (existingUserByUsername) {
      throw new ConflictError('Username is already taken');
    }

    // Validate role assignment
    if (role === 'manager') {
      // Only existing managers can create new manager accounts
      if (!req.user || req.user.role !== 'manager') {
        throw new ValidationError('Only managers can create manager accounts');
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await User.create({
      username,
      email,
      password_hash,
      role
    });

    // Generate JWT token
    const token = generateToken(newUser);

    // Prepare response
    const userResponse = newUser.toJSON();

    res.status(201).json(new DataResponseDto(
      { user: userResponse, expiresIn: '24h' },
      true,
      ResponseMessages.REGISTRATION_SUCCESS,
      token
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * User Login Controller
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Use the authService for authentication
    const authResult = await authService.authenticateUser(email, password);

    // Prepare response
    const userResponse = authResult.user;

    res.status(200).json(new DataResponseDto(
      { user: userResponse, expiresIn: authResult.expiresIn },
      true,
      ResponseMessages.LOGIN_SUCCESS,
      authResult.token
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get Current User Profile
 * GET /api/auth/profile
 */
const getProfile = async (req, res, next) => {
  try {
    // User is already available from auth middleware
    const userResponse = req.user.toJSON();

    res.status(200).json(new DataResponseDto(
      { user: userResponse },
      true,
      'Profile retrieved successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Update User Profile
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { username, email } = req.body;
    const userId = req.user.id;

    // Check if new email/username already exists (excluding current user)
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError('Email address is already in use');
      }
    }

    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError('Username is already taken');
      }
    }

    // Update user
    const [affectedRows] = await User.update(
      { username, email },
      { where: { id: userId } }
    );

    if (affectedRows === 0) {
      throw new Error('Failed to update user profile');
    }

    // Get updated user
    const updatedUser = await User.findByPk(userId);
    const userResponse = updatedUser.toJSON();

    res.status(200).json(new DataResponseDto(
      { user: userResponse },
      true,
      ResponseMessages.UPDATED
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Change Password
 * PUT /api/auth/password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Verify current password
    const isCurrentPasswordValid = await authService.verifyPassword(currentPassword, req.user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    const [affectedRows] = await User.update(
      { password_hash: newPasswordHash },
      { where: { id: userId } }
    );

    if (affectedRows === 0) {
      throw new Error('Failed to update password');
    }

    res.status(200).json(new DataResponseDto(
      null,
      true,
      'Password changed successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Logout (Client-side token invalidation)
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    // Since we're using stateless JWT, logout is handled client-side
    // In a production app, you might maintain a blacklist of revoked tokens

    res.status(200).json(new DataResponseDto(
      { note: 'Please remove the token from client storage' },
      true,
      'Logged out successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Token Refresh (extend token expiration)
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    // User is already authenticated via middleware
    const user = req.user;

    // Generate new token
    const newToken = generateToken(user);

    res.status(200).json(new DataResponseDto(
      { expiresIn: '24h' },
      true,
      'Token refreshed successfully',
      newToken
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get All Users (Manager only)
 * GET /api/auth/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const pageOptions = PageOptionsDto.fromQuery(req.query);
    const { role } = req.query;

    // Build where clause for role filtering
    const whereClause = {};
    if (role) {
      whereClause.role = role;
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit: pageOptions.limit,
      offset: pageOptions.offset,
      order: [['created_at', pageOptions.order]]
    });

    const usersResponse = users.map(user => user.toJSON());

    res.status(200).json(new DataResponseDto(
      usersResponse,
      true,
      'Users retrieved successfully',
      pageOptions,
      count
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get all staff members (for managers)
 * @route   GET /api/auth/staff
 * @desc    Get all staff members with pagination and search
 * @access  Manager only
 * @query   { limit?, offset?, search?, sortBy?, sortOrder?, active? }
 */
const getStaffMembers = async (req, res, next) => {
  try {
    const pageOptions = PageOptionsDto.fromQuery(req.query);
    const { search, active } = req.query;

    // Build where clause for staff role and optional filters
    const whereClause = { role: 'staff' };

    // Add search filter for username or email
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // Add active status filter if provided
    if (active !== undefined) {
      // Assuming there's an 'active' field or we use created_at as indicator
      // You can modify this based on your User model structure
      if (active === 'false') {
        // Could filter by last_login or other criteria for inactive users
        // For now, we'll include all staff
      }
    }

    const { count, rows: staffMembers } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'username', 'email', 'role', 'created_at', 'updated_at'],
      limit: pageOptions.limit,
      offset: pageOptions.offset,
      order: [['created_at', pageOptions.order]]
    });

    // Enhanced response with additional staff statistics
    const staffResponse = staffMembers.map(staff => {
      const staffData = staff.toJSON();
      // Remove sensitive information
      delete staffData.password_hash;
      return {
        ...staffData,
        member_since: staffData.created_at,
        status: 'active' // You can add logic to determine actual status
      };
    });

    // Add summary statistics
    const summary = {
      total_staff: count,
      active_staff: count, // Modify based on actual active/inactive logic
      new_this_month: staffMembers.filter(staff => {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return new Date(staff.created_at) > monthAgo;
      }).length
    };

    res.status(200).json({
      success: true,
      message: 'Staff members retrieved successfully',
      data: {
        staff_members: staffResponse,
        summary: summary,
        pagination: {
          current_page: Math.floor(pageOptions.offset / pageOptions.limit) + 1,
          per_page: pageOptions.limit,
          total_items: count,
          total_pages: Math.ceil(count / pageOptions.limit),
          has_next: pageOptions.offset + pageOptions.limit < count,
          has_prev: pageOptions.offset > 0
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update User Role (Manager only)
 * PUT /api/auth/users/:id/role
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['staff', 'manager'].includes(role)) {
      throw new ValidationError('Invalid role. Must be either "staff" or "manager"');
    }

    // Check if user exists
    const targetUser = await User.findByPk(parseInt(id));
    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // Prevent managers from demoting themselves
    if (targetUser.id === req.user.id && role === 'staff') {
      throw new ValidationError('You cannot change your own role');
    }

    // Update user role
    const [affectedRows] = await User.update(
      { role },
      { where: { id: parseInt(id) } }
    );

    if (affectedRows === 0) {
      throw new Error('Failed to update user role');
    }

    // Get updated user
    const updatedUser = await User.findByPk(parseInt(id));
    const userResponse = updatedUser.toJSON();

    res.status(200).json(new DataResponseDto(
      { user: userResponse },
      true,
      'User role updated successfully'
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Delete User Account (Manager only)
 * DELETE /api/auth/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const targetUser = await User.findByPk(parseInt(id));
    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // Prevent managers from deleting themselves
    if (targetUser.id === req.user.id) {
      throw new ValidationError('You cannot delete your own account');
    }

    // Delete user
    const affectedRows = await User.destroy({
      where: { id: parseInt(id) }
    });

    if (affectedRows === 0) {
      throw new Error('Failed to delete user');
    }

    res.status(200).json(new DataResponseDto(
      null,
      true,
      ResponseMessages.DELETED
    ));

  } catch (error) {
    next(error);
  }
};

/**
 * Get Authentication Statistics (Manager only)
 * GET /api/auth/stats
 */
const getAuthStats = async (req, res, next) => {
  try {
    const totalUsers = await User.count();
    const staffCount = await User.count({ where: { role: 'staff' } });
    const managerCount = await User.count({ where: { role: 'manager' } });

    const stats = {
      total_users: totalUsers,
      staff_count: staffCount,
      manager_count: managerCount,
      roles_distribution: {
        staff: totalUsers > 0 ? ((staffCount / totalUsers) * 100).toFixed(1) + '%' : '0%',
        manager: totalUsers > 0 ? ((managerCount / totalUsers) * 100).toFixed(1) + '%' : '0%'
      }
    };

    res.status(200).json(new DataResponseDto(
      stats,
      true,
      'Authentication statistics retrieved successfully'
    ));

  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
  getAllUsers,
  getStaffMembers,
  updateUserRole,
  deleteUser,
  getAuthStats
};