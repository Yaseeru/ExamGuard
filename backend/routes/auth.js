const express = require('express');
const { body } = require('express-validator');
const authService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');
const { sendSuccess, sendError, handleServiceResponse, HTTP_STATUS, ERROR_CODES } = require('../utils/responseFormatter');
const { ValidationRules } = require('../utils/validators');
const { createValidationChain, sanitizeRequestBody } = require('../middleware/validation');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post('/login', [
     sanitizeRequestBody(['email', 'password']),
     ...createValidationChain([
          ValidationRules.userEmail(),
          body('password')
               .notEmpty()
               .withMessage('Password is required')
               .isLength({ min: 1, max: 128 })
               .withMessage('Password must not exceed 128 characters')
     ])
], async (req, res) => {
     try {
          const { email, password } = req.body;

          // Authenticate user
          const result = await authService.authenticateUser(email, password);

          if (!result.success) {
               // Map specific authentication errors to appropriate status codes
               if (result.error.includes('Invalid credentials')) {
                    return sendError(res, 'INVALID_CREDENTIALS', result.error, null, HTTP_STATUS.UNAUTHORIZED);
               } else if (result.error.includes('deactivated')) {
                    return sendError(res, 'ACCOUNT_DEACTIVATED', result.error, null, HTTP_STATUS.FORBIDDEN);
               } else {
                    return sendError(res, 'AUTHENTICATION_FAILED', result.error, null, HTTP_STATUS.UNAUTHORIZED);
               }
          }

          // Return success response
          sendSuccess(res, {
               token: result.token,
               user: result.user
          }, 'Login successful', HTTP_STATUS.OK);

     } catch (error) {
          console.error('Login error:', error);
          sendError(res, 'INTERNAL_SERVER_ERROR', 'Login failed due to server error', null, HTTP_STATUS.INTERNAL_SERVER_ERROR);
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
          sendSuccess(res, {
               valid: true,
               user: req.user
          }, 'Token is valid', HTTP_STATUS.OK);

     } catch (error) {
          console.error('Token validation error:', error);
          sendError(res, 'INTERNAL_SERVER_ERROR', 'Token validation failed', null, HTTP_STATUS.INTERNAL_SERVER_ERROR);
     }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
     try {
          sendSuccess(res, {
               user: req.user
          }, 'User profile retrieved successfully', HTTP_STATUS.OK);

     } catch (error) {
          console.error('Get profile error:', error);
          sendError(res, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve user profile', null, HTTP_STATUS.INTERNAL_SERVER_ERROR);
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
          sendSuccess(res, {}, 'Logout successful', HTTP_STATUS.OK);

     } catch (error) {
          console.error('Logout error:', error);
          sendError(res, 'INTERNAL_SERVER_ERROR', 'Logout failed', null, HTTP_STATUS.INTERNAL_SERVER_ERROR);
     }
});

module.exports = router;