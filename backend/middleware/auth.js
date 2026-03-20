const authService = require('../services/authService');

/**
 * Middleware to authenticate JWT tokens
 * Validates token and adds user data to request object
 */
const authenticateToken = async (req, res, next) => {
     try {
          const authHeader = req.headers.authorization;
          const token = authService.extractTokenFromHeader(authHeader);

          if (!token) {
               return res.status(401).json({
                    error: {
                         code: 'MISSING_TOKEN',
                         message: 'Access token is required',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          const validation = await authService.validateToken(token);

          if (!validation.valid) {
               return res.status(401).json({
                    error: {
                         code: 'INVALID_TOKEN',
                         message: validation.error || 'Invalid or expired token',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Add user data to request object
          req.user = validation.user;
          next();
     } catch (error) {
          console.error('Authentication middleware error:', error);
          return res.status(500).json({
               error: {
                    code: 'AUTHENTICATION_ERROR',
                    message: 'Authentication failed',
                    timestamp: new Date().toISOString()
               }
          });
     }
};

/**
 * Middleware to authorize users based on roles
 * @param {string|Array} allowedRoles - Single role or array of allowed roles
 * @returns {Function} Express middleware function
 */
const authorizeRoles = (allowedRoles) => {
     return (req, res, next) => {
          try {
               if (!req.user) {
                    return res.status(401).json({
                         error: {
                              code: 'UNAUTHORIZED',
                              message: 'User authentication required',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               const userRole = req.user.role;
               const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

               if (!roles.includes(userRole)) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: `Access denied. Required role(s): ${roles.join(', ')}`,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               next();
          } catch (error) {
               console.error('Authorization middleware error:', error);
               return res.status(500).json({
                    error: {
                         code: 'AUTHORIZATION_ERROR',
                         message: 'Authorization failed',
                         timestamp: new Date().toISOString()
                    }
               });
          }
     };
};

/**
 * Middleware for Admin-only routes
 */
const requireAdmin = authorizeRoles('Admin');

/**
 * Middleware for Lecturer-only routes
 */
const requireLecturer = authorizeRoles('Lecturer');

/**
 * Middleware for Student-only routes
 */
const requireStudent = authorizeRoles('Student');

/**
 * Middleware for Lecturer or Admin routes
 */
const requireLecturerOrAdmin = authorizeRoles(['Lecturer', 'Admin']);

/**
 * Middleware for Student or Lecturer routes
 */
const requireStudentOrLecturer = authorizeRoles(['Student', 'Lecturer']);

/**
 * Middleware to check if user owns the resource or is admin
 * Expects userId parameter in route or user ID in request body
 */
const requireOwnershipOrAdmin = (userIdField = 'userId') => {
     return (req, res, next) => {
          try {
               if (!req.user) {
                    return res.status(401).json({
                         error: {
                              code: 'UNAUTHORIZED',
                              message: 'User authentication required',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               const currentUserId = req.user.id;
               const targetUserId = req.params[userIdField] || req.body[userIdField];

               // Admin can access any resource
               if (req.user.role === 'Admin') {
                    return next();
               }

               // User can only access their own resources
               if (currentUserId !== targetUserId) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Access denied. You can only access your own resources',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               next();
          } catch (error) {
               console.error('Ownership authorization error:', error);
               return res.status(500).json({
                    error: {
                         code: 'AUTHORIZATION_ERROR',
                         message: 'Authorization failed',
                         timestamp: new Date().toISOString()
                    }
               });
          }
     };
};

module.exports = {
     authenticateToken,
     authorizeRoles,
     requireAdmin,
     requireLecturer,
     requireStudent,
     requireLecturerOrAdmin,
     requireStudentOrLecturer,
     requireOwnershipOrAdmin
};