/**
 * Comprehensive error handling middleware
 */
const { sendError, HTTP_STATUS } = require('../utils/responseFormatter');

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (err, req, res, next) => {
     // Log error details
     console.error('Global error handler:', {
          message: err.message,
          stack: err.stack,
          url: req.url,
          method: req.method,
          body: req.body,
          params: req.params,
          query: req.query,
          user: req.user?.id || 'anonymous',
          timestamp: new Date().toISOString()
     });

     // Handle specific error types
     if (err.name === 'ValidationError') {
          // Mongoose validation error
          const validationErrors = Object.values(err.errors).map(error => ({
               field: error.path,
               message: error.message,
               value: error.value
          }));

          return sendError(res, 'VALIDATION_ERROR', 'Invalid input data', validationErrors, HTTP_STATUS.BAD_REQUEST);
     }

     if (err.name === 'CastError') {
          // Mongoose cast error (invalid ObjectId, etc.)
          return sendError(res, 'INVALID_ID', 'Invalid ID format', null, HTTP_STATUS.BAD_REQUEST);
     }

     if (err.code === 11000) {
          // MongoDB duplicate key error
          const field = Object.keys(err.keyPattern)[0];
          return sendError(res, 'DUPLICATE_ENTRY', `${field} already exists`, null, HTTP_STATUS.CONFLICT);
     }

     if (err.name === 'JsonWebTokenError') {
          // JWT error
          return sendError(res, 'INVALID_TOKEN', 'Invalid token', null, HTTP_STATUS.UNAUTHORIZED);
     }

     if (err.name === 'TokenExpiredError') {
          // JWT expired error
          return sendError(res, 'TOKEN_EXPIRED', 'Token has expired', null, HTTP_STATUS.UNAUTHORIZED);
     }

     if (err.name === 'MulterError') {
          // File upload error
          if (err.code === 'LIMIT_FILE_SIZE') {
               return sendError(res, 'FILE_TOO_LARGE', 'File size exceeds limit', null, HTTP_STATUS.PAYLOAD_TOO_LARGE);
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
               return sendError(res, 'TOO_MANY_FILES', 'Too many files uploaded', null, HTTP_STATUS.BAD_REQUEST);
          }
          return sendError(res, 'FILE_UPLOAD_ERROR', err.message, null, HTTP_STATUS.BAD_REQUEST);
     }

     if (err.type === 'entity.parse.failed') {
          // JSON parsing error
          return sendError(res, 'INVALID_JSON', 'Invalid JSON format', null, HTTP_STATUS.BAD_REQUEST);
     }

     if (err.type === 'entity.too.large') {
          // Request entity too large
          return sendError(res, 'PAYLOAD_TOO_LARGE', 'Request body too large', null, HTTP_STATUS.PAYLOAD_TOO_LARGE);
     }

     // Handle database connection errors
     if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
          return sendError(res, 'DATABASE_ERROR', 'Database connection error', null, HTTP_STATUS.SERVICE_UNAVAILABLE);
     }

     // Handle rate limiting errors
     if (err.status === 429) {
          return sendError(res, 'RATE_LIMIT_EXCEEDED', 'Too many requests', null, HTTP_STATUS.TOO_MANY_REQUESTS);
     }

     // Default to internal server error
     sendError(res, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred', null, HTTP_STATUS.INTERNAL_SERVER_ERROR);
};

/**
 * Async error wrapper to catch async errors in route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function that catches async errors
 */
const asyncErrorHandler = (fn) => {
     return (req, res, next) => {
          Promise.resolve(fn(req, res, next)).catch(next);
     };
};

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
     sendError(res, 'NOT_FOUND', `API endpoint ${req.method} ${req.path} not found`, null, HTTP_STATUS.NOT_FOUND);
};

/**
 * Validation error handler for express-validator
 * @param {Array} errors - Validation errors array
 * @param {Object} res - Express response object
 */
const handleValidationErrors = (errors, res) => {
     const formattedErrors = errors.map(error => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value
     }));

     sendError(res, 'VALIDATION_ERROR', 'Invalid input data', formattedErrors, HTTP_STATUS.BAD_REQUEST);
};

/**
 * Database error handler
 * @param {Error} error - Database error
 * @param {Object} res - Express response object
 */
const handleDatabaseError = (error, res) => {
     console.error('Database error:', error);

     if (error.name === 'MongoNetworkError') {
          return sendError(res, 'DATABASE_CONNECTION_ERROR', 'Unable to connect to database', null, HTTP_STATUS.SERVICE_UNAVAILABLE);
     }

     if (error.name === 'MongoTimeoutError') {
          return sendError(res, 'DATABASE_TIMEOUT', 'Database operation timed out', null, HTTP_STATUS.SERVICE_UNAVAILABLE);
     }

     if (error.code === 11000) {
          const field = Object.keys(error.keyPattern)[0];
          return sendError(res, 'DUPLICATE_ENTRY', `${field} already exists`, null, HTTP_STATUS.CONFLICT);
     }

     sendError(res, 'DATABASE_ERROR', 'Database operation failed', null, HTTP_STATUS.INTERNAL_SERVER_ERROR);
};

/**
 * Authentication error handler
 * @param {Error} error - Authentication error
 * @param {Object} res - Express response object
 */
const handleAuthError = (error, res) => {
     if (error.name === 'JsonWebTokenError') {
          return sendError(res, 'INVALID_TOKEN', 'Invalid authentication token', null, HTTP_STATUS.UNAUTHORIZED);
     }

     if (error.name === 'TokenExpiredError') {
          return sendError(res, 'TOKEN_EXPIRED', 'Authentication token has expired', null, HTTP_STATUS.UNAUTHORIZED);
     }

     sendError(res, 'AUTHENTICATION_ERROR', 'Authentication failed', null, HTTP_STATUS.UNAUTHORIZED);
};

/**
 * Business logic error handler
 * @param {Error} error - Business logic error
 * @param {Object} res - Express response object
 */
const handleBusinessLogicError = (error, res) => {
     const message = error.message.toLowerCase();

     if (message.includes('not found')) {
          return sendError(res, 'NOT_FOUND', error.message, null, HTTP_STATUS.NOT_FOUND);
     }

     if (message.includes('already exists') || message.includes('duplicate')) {
          return sendError(res, 'ALREADY_EXISTS', error.message, null, HTTP_STATUS.CONFLICT);
     }

     if (message.includes('unauthorized') || message.includes('access denied')) {
          return sendError(res, 'FORBIDDEN', error.message, null, HTTP_STATUS.FORBIDDEN);
     }

     if (message.includes('capacity') || message.includes('limit')) {
          return sendError(res, 'CAPACITY_EXCEEDED', error.message, null, HTTP_STATUS.CONFLICT);
     }

     sendError(res, 'BUSINESS_LOGIC_ERROR', error.message, null, HTTP_STATUS.BAD_REQUEST);
};

module.exports = {
     globalErrorHandler,
     asyncErrorHandler,
     notFoundHandler,
     handleValidationErrors,
     handleDatabaseError,
     handleAuthError,
     handleBusinessLogicError
};