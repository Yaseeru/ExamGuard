const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post('/login', [
     // Validation middleware
     body('email')
          .isEmail()
          .normalizeEmail()
          .withMessage('Please provide a valid email address'),
     body('password')
          .notEmpty()
          .withMessage('Password is required')
          .isLength({ min: 8 })
          .withMessage('Password must be at least 8 characters long')
], async (req, res) => {
     try {
          // Check validation errors
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Invalid input data',
                         details: errors.array(),
                         timestamp: new Date().toISOString()
                    }
               });
          }

          const { email, password } = req.body;

          // Authenticate user
          const result = await authService.authenticateUser(email, password);

          if (!result.success) {
               return res.status(401).json({
                    error: {
                         code: 'AUTHENTICATION_FAILED',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Return success response
          res.json({
               success: true,
               message: 'Login successful',
               token: result.token,
               user: result.user,
               timestamp: new Date().toISOString()
          });

     } catch (error) {
          console.error('Login error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Login failed due to server error',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

/**
 * @route   POST /api/auth/validate
 * @desc    Validate JWT token and return user data
 * @access  Private
 */
router.post('/validate', authenticateToken, async (req, res) => {
     try {
          // Token is already validated by middleware
          // User data is available in req.user
          res.json({
               valid: true,
               user: req.user,
               timestamp: new Date().toISOString()
          });

     } catch (error) {
          console.error('Token validation error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Token validation failed',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
     try {
          res.json({
               success: true,
               user: req.user,
               timestamp: new Date().toISOString()
          });

     } catch (error) {
          console.error('Get profile error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve user profile',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
     try {
          // JWT tokens are stateless, so logout is handled client-side
          // This endpoint confirms successful logout
          res.json({
               success: true,
               message: 'Logout successful',
               timestamp: new Date().toISOString()
          });

     } catch (error) {
          console.error('Logout error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Logout failed',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

module.exports = router;