/**
 * Utility functions for consistent API response formatting
 */

/**
 * Format success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Formatted success response
 */
const formatSuccess = (data = {}, message = 'Operation successful', statusCode = 200) => {
     return {
          success: true,
          message,
          ...data,
          timestamp: new Date().toISOString()
     };
};

/**
 * Format error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Array|Object} details - Additional error details
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted error response
 */
const formatError = (code, message, details = null, statusCode = 400) => {
     const errorResponse = {
          error: {
               code,
               message,
               timestamp: new Date().toISOString()
          }
     };

     if (details) {
          errorResponse.error.details = details;
     }

     return errorResponse;
};

/**
 * Format validation error response
 * @param {Array} validationErrors - Array of validation errors from express-validator
 * @returns {Object} Formatted validation error response
 */
const formatValidationError = (validationErrors) => {
     return formatError(
          'VALIDATION_ERROR',
          'Invalid input data',
          validationErrors.map(err => ({
               field: err.path || err.param,
               message: err.msg,
               value: err.value
          })),
          400
     );
};

/**
 * Common error codes and messages
 */
const ERROR_CODES = {
     // Authentication & Authorization
     MISSING_TOKEN: 'Access token is required',
     INVALID_TOKEN: 'Invalid or expired token',
     AUTHENTICATION_FAILED: 'Authentication failed',
     FORBIDDEN: 'Access denied',
     UNAUTHORIZED: 'Authentication required',

     // Validation
     VALIDATION_ERROR: 'Invalid input data',
     INVALID_ID: 'Invalid ID format',
     MISSING_REQUIRED_FIELD: 'Required field is missing',

     // Resource Management
     NOT_FOUND: 'Resource not found',
     ALREADY_EXISTS: 'Resource already exists',
     CONFLICT: 'Resource conflict',
     REFERENTIAL_INTEGRITY_ERROR: 'Cannot perform operation due to existing dependencies',

     // User Management
     USER_NOT_FOUND: 'User not found',
     USER_ALREADY_EXISTS: 'User with this email already exists',
     INVALID_CREDENTIALS: 'Invalid email or password',
     ACCOUNT_DEACTIVATED: 'Account is deactivated',
     SELF_DELETE_ERROR: 'Cannot delete your own account',

     // Course Management
     COURSE_NOT_FOUND: 'Course not found',
     ENROLLMENT_ERROR: 'Enrollment failed',
     CAPACITY_EXCEEDED: 'Course capacity exceeded',
     ALREADY_ENROLLED: 'Already enrolled in this course',
     NOT_ENROLLED: 'Not enrolled in this course',

     // Exam Management
     EXAM_NOT_FOUND: 'Exam not found',
     EXAM_NOT_AVAILABLE: 'Exam is not currently available',
     EXAM_ALREADY_TAKEN: 'Exam has already been taken',
     EXAM_IN_PROGRESS: 'Exam is currently in progress',
     EXAM_COMPLETED: 'Exam has been completed',

     // Exam Attempts
     ATTEMPT_NOT_FOUND: 'Exam attempt not found',
     ATTEMPT_EXISTS: 'Exam attempt already exists',
     ATTEMPT_COMPLETED: 'Exam attempt is already completed',
     ATTEMPT_NOT_COMPLETED: 'Exam attempt is not yet completed',
     INVALID_ANSWER: 'Invalid answer format',

     // Anti-Cheating
     VIOLATION_LIMIT_EXCEEDED: 'Maximum violations exceeded',
     AUTO_SUBMITTED: 'Exam auto-submitted due to violations',

     // System Errors
     INTERNAL_SERVER_ERROR: 'Internal server error',
     DATABASE_ERROR: 'Database operation failed',
     SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
     RATE_LIMIT_EXCEEDED: 'Too many requests'
};

/**
 * HTTP Status Codes
 */
const HTTP_STATUS = {
     OK: 200,
     CREATED: 201,
     NO_CONTENT: 204,
     BAD_REQUEST: 400,
     UNAUTHORIZED: 401,
     FORBIDDEN: 403,
     NOT_FOUND: 404,
     CONFLICT: 409,
     UNPROCESSABLE_ENTITY: 422,
     TOO_MANY_REQUESTS: 429,
     INTERNAL_SERVER_ERROR: 500,
     SERVICE_UNAVAILABLE: 503
};

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const sendSuccess = (res, data = {}, message = 'Operation successful', statusCode = HTTP_STATUS.OK) => {
     res.status(statusCode).json(formatSuccess(data, message, statusCode));
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Array|Object} details - Additional error details
 * @param {number} statusCode - HTTP status code
 */
const sendError = (res, code, message, details = null, statusCode = HTTP_STATUS.BAD_REQUEST) => {
     res.status(statusCode).json(formatError(code, message, details, statusCode));
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Array} validationErrors - Array of validation errors
 */
const sendValidationError = (res, validationErrors) => {
     res.status(HTTP_STATUS.BAD_REQUEST).json(formatValidationError(validationErrors));
};

/**
 * Handle service response and send appropriate HTTP response
 * @param {Object} res - Express response object
 * @param {Object} serviceResult - Result from service layer
 * @param {string} successMessage - Message for successful operations
 * @param {number} successStatusCode - Status code for successful operations
 */
const handleServiceResponse = (res, serviceResult, successMessage = 'Operation successful', successStatusCode = HTTP_STATUS.OK) => {
     if (serviceResult.success) {
          const responseData = { ...serviceResult };
          delete responseData.success;
          sendSuccess(res, responseData, successMessage, successStatusCode);
     } else {
          // Determine appropriate status code based on error message
          let statusCode = HTTP_STATUS.BAD_REQUEST;
          let errorCode = 'OPERATION_FAILED';

          if (serviceResult.error.includes('not found')) {
               statusCode = HTTP_STATUS.NOT_FOUND;
               errorCode = 'NOT_FOUND';
          } else if (serviceResult.error.includes('already exists')) {
               statusCode = HTTP_STATUS.CONFLICT;
               errorCode = 'ALREADY_EXISTS';
          } else if (serviceResult.error.includes('unauthorized') || serviceResult.error.includes('access denied')) {
               statusCode = HTTP_STATUS.FORBIDDEN;
               errorCode = 'FORBIDDEN';
          } else if (serviceResult.error.includes('capacity')) {
               statusCode = HTTP_STATUS.CONFLICT;
               errorCode = 'CAPACITY_EXCEEDED';
          }

          sendError(res, errorCode, serviceResult.error, null, statusCode);
     }
};

module.exports = {
     formatSuccess,
     formatError,
     formatValidationError,
     sendSuccess,
     sendError,
     sendValidationError,
     handleServiceResponse,
     ERROR_CODES,
     HTTP_STATUS
};