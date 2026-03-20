const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const userService = require('../services/userService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users with optional role filtering
 * @access  Admin only
 */
router.get('/', [
     authenticateToken,
     requireAdmin,
     query('role')
          .optional()
          .isIn(['Admin', 'Lecturer', 'Student'])
          .withMessage('Role must be Admin, Lecturer, or Student')
], async (req, res) => {
     try {
          // Check validation errors
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Invalid query parameters',
                         details: errors.array(),
                         timestamp: new Date().toISOString()
                    }
               });
          }

          const { role } = req.query;
          const result = await userService.getUsers(role);

          if (!result.success) {
               return res.status(400).json({
                    error: {
                         code: 'USER_FETCH_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.json({
               success: true,
               users: result.users,
               count: result.users.length,
               timestamp: new Date().toISOString()
          });

     } catch (error) {
          console.error('Get users error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve users',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics by role
 * @access  Admin only
 */
router.get('/stats', [
     authenticateToken,
     requireAdmin
], async (req, res) => {
     try {
          const result = await userService.getUserStats();

          if (!result.success) {
               return res.status(400).json({
                    error: {
                         code: 'STATS_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.json({
               success: true,
               stats: result.stats,
               timestamp: new Date().toISOString()
          });

     } catch (error) {
          console.error('Get user stats error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve user statistics',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Admin only
 */
router.get('/:id', [
     authenticateToken,
     requireAdmin,
     param('id')
          .isMongoId()
          .withMessage('Invalid user ID format')
], async (req, res) => {
     try {
          // Check validation errors
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Invalid user ID',
                         details: errors.array(),
                         timestamp: new Date().toISOString()
                    }
               });
          }

          const { id } = req.params;
          const result = await userService.getUserById(id);

          if (!result.success) {
               return res.status(404).json({
                    error: {
                         code: 'USER_NOT_FOUND',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.json({
               success: true,
               user: result.user,
               timestamp: new Date().toISOString()
          });

     } catch (error) {
          console.error('Get user by ID error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve user',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

/**
 * @route   POST /api/users
 * @desc    Create new user with role assignment
 * @access  Admin only
 */
router.post('/', [
     authenticateToken,
     requireAdmin,
     body('name')
          .trim()
          .isLength({ min: 2, max: 50 })
          .withMessage('Name must be between 2 and 50 characters')
          .matches(/^[a-zA-Z\s.]+$/)
          .withMessage('Name can only contain letters, spaces, and periods'),
     body('email')
          .isEmail()
          .normalizeEmail()
          .withMessage('Please provide a valid email address'),
     body('password')
          .isLength({ min: 8 })
          .withMessage('Password must be at least 8 characters long')
          .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
          .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
     body('role')
          .isIn(['Admin', 'Lecturer', 'Student'])
          .withMessage('Role must be Admin, Lecturer, or Student')
], async (req, res) => {
     try {
          // Check validation errors
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Invalid user data',
                         details: errors.array(),
                         timestamp: new Date().toISOString()
                    }
               });
          }

          const { name, email, password, role } = req.body;
          const result = await userService.createUser({ name, email, password, role });

          if (!result.success) {
               return res.status(400).json({
                    error: {
                         code: 'USER_CREATION_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.status(201).json({
               success: true,
               message: 'User created successfully',
               user: result.user,
               timestamp: new Date().toISOString()
          });

     } catch (error) {
          console.error('Create user error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create user',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user information
 * @access  Admin only
 */
router.put('/:id', [
     authenticateToken,
     requireAdmin,
     param('id')
          .isMongoId()
          .withMessage('Invalid user ID format'),
     body('name')
          .optional()
          .trim()
          .isLength({ min: 2, max: 50 })
          .withMessage('Name must be between 2 and 50 characters')
          .matches(/^[a-zA-Z\s.]+$/)
          .withMessage('Name can only contain letters, spaces, and periods'),
     body('email')
          .optional()
          .isEmail()
          .normalizeEmail()
          .withMessage('Please provide a valid email address'),
     body('role')
          .optional()
          .isIn(['Admin', 'Lecturer', 'Student'])
          .withMessage('Role must be Admin, Lecturer, or Student')
], async (req, res) => {
     try {
          // Check validation errors
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Invalid update data',
                         details: errors.array(),
                         timestamp: new Date().toISOString()
                    }
               });
          }

          const { id } = req.params;
          const updateData = req.body;

          const result = await userService.updateUser(id, updateData);

          if (!result.success) {
               const statusCode = result.error.includes('not found') ? 404 : 400;
               return res.status(statusCode).json({
                    error: {
                         code: 'USER_UPDATE_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.json({
               success: true,
               message: 'User updated successfully',
               user: result.user,
               timestamp: new Date().toISOString()
          });

     } catch (error) {
          console.error('Update user error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update user',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user account (soft delete)
 * @access  Admin only
 */
router.delete('/:id', [
     authenticateToken,
     requireAdmin,
     param('id')
          .isMongoId()
          .withMessage('Invalid user ID format')
], async (req, res) => {
     try {
          // Check validation errors
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Invalid user ID',
                         details: errors.array(),
                         timestamp: new Date().toISOString()
                    }
               });
          }

          const { id } = req.params;

          // Prevent admin from deleting themselves
          if (id === req.user.id) {
               return res.status(400).json({
                    error: {
                         code: 'SELF_DELETE_ERROR',
                         message: 'Cannot delete your own account',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          const result = await userService.deleteUser(id);

          if (!result.success) {
               const statusCode = result.error.includes('not found') ? 404 : 400;
               return res.status(statusCode).json({
                    error: {
                         code: 'USER_DELETE_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.json({
               success: true,
               message: result.message,
               timestamp: new Date().toISOString()
          });

     } catch (error) {
          console.error('Delete user error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to delete user',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

module.exports = router;