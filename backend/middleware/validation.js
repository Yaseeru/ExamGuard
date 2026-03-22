/**
 * Validation middleware for handling express-validator results
 */
const { validationResult } = require('express-validator');
const { sendValidationError } = require('../utils/responseFormatter');

/**
 * Middleware to handle validation errors from express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleValidationErrors = (req, res, next) => {
     const errors = validationResult(req);

     if (!errors.isEmpty()) {
          return sendValidationError(res, errors.array());
     }

     next();
};

/**
 * Create validation middleware chain
 * @param {Array} validationRules - Array of express-validator rules
 * @returns {Array} Middleware chain with validation rules and error handler
 */
const createValidationChain = (validationRules) => {
     return [...validationRules, handleValidationErrors];
};

/**
 * Middleware to validate request body size
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {Function} Express middleware function
 */
const validateRequestSize = (maxSize = 10 * 1024 * 1024) => { // 10MB default
     return (req, res, next) => {
          const contentLength = parseInt(req.get('Content-Length') || '0');

          if (contentLength > maxSize) {
               return res.status(413).json({
                    error: {
                         code: 'PAYLOAD_TOO_LARGE',
                         message: `Request body too large. Maximum size is ${maxSize} bytes`,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          next();
     };
};

/**
 * Middleware to validate content type
 * @param {Array} allowedTypes - Array of allowed content types
 * @returns {Function} Express middleware function
 */
const validateContentType = (allowedTypes = ['application/json']) => {
     return (req, res, next) => {
          const contentType = req.get('Content-Type');

          if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
               return res.status(415).json({
                    error: {
                         code: 'UNSUPPORTED_MEDIA_TYPE',
                         message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          next();
     };
};

/**
 * Middleware to sanitize request body
 * @param {Array} fieldsToSanitize - Array of field names to sanitize
 * @returns {Function} Express middleware function
 */
const sanitizeRequestBody = (fieldsToSanitize = []) => {
     return (req, res, next) => {
          if (req.body && typeof req.body === 'object') {
               fieldsToSanitize.forEach(field => {
                    if (req.body[field] && typeof req.body[field] === 'string') {
                         // Basic sanitization - remove potential XSS vectors
                         req.body[field] = req.body[field]
                              .replace(/[<>]/g, '')
                              .trim();
                    }
               });
          }
          next();
     };
};

/**
 * Middleware to validate pagination parameters
 * @param {Object} options - Pagination options
 * @param {number} options.maxLimit - Maximum allowed limit
 * @param {number} options.defaultLimit - Default limit if not provided
 * @returns {Function} Express middleware function
 */
const validatePagination = (options = {}) => {
     const { maxLimit = 100, defaultLimit = 20 } = options;

     return (req, res, next) => {
          // Validate and set limit
          let limit = parseInt(req.query.limit) || defaultLimit;
          if (limit > maxLimit) {
               limit = maxLimit;
          }
          if (limit < 1) {
               limit = 1;
          }
          req.query.limit = limit;

          // Validate and set offset
          let offset = parseInt(req.query.offset) || 0;
          if (offset < 0) {
               offset = 0;
          }
          req.query.offset = offset;

          next();
     };
};

/**
 * Middleware to validate date range parameters
 * @param {string} startDateParam - Name of start date parameter
 * @param {string} endDateParam - Name of end date parameter
 * @returns {Function} Express middleware function
 */
const validateDateRange = (startDateParam = 'startDate', endDateParam = 'endDate') => {
     return (req, res, next) => {
          const startDate = req.query[startDateParam];
          const endDate = req.query[endDateParam];

          if (startDate && !Date.parse(startDate)) {
               return res.status(400).json({
                    error: {
                         code: 'INVALID_DATE_FORMAT',
                         message: `${startDateParam} must be a valid date`,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          if (endDate && !Date.parse(endDate)) {
               return res.status(400).json({
                    error: {
                         code: 'INVALID_DATE_FORMAT',
                         message: `${endDateParam} must be a valid date`,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
               return res.status(400).json({
                    error: {
                         code: 'INVALID_DATE_RANGE',
                         message: `${startDateParam} must be before ${endDateParam}`,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          next();
     };
};

/**
 * Middleware to validate file upload parameters
 * @param {Object} options - Upload options
 * @param {Array} options.allowedMimeTypes - Allowed MIME types
 * @param {number} options.maxFileSize - Maximum file size in bytes
 * @returns {Function} Express middleware function
 */
const validateFileUpload = (options = {}) => {
     const {
          allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'],
          maxFileSize = 5 * 1024 * 1024 // 5MB default
     } = options;

     return (req, res, next) => {
          if (!req.file && !req.files) {
               return next(); // No file uploaded, continue
          }

          const files = req.files || [req.file];

          for (const file of files) {
               if (!allowedMimeTypes.includes(file.mimetype)) {
                    return res.status(415).json({
                         error: {
                              code: 'UNSUPPORTED_FILE_TYPE',
                              message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               if (file.size > maxFileSize) {
                    return res.status(413).json({
                         error: {
                              code: 'FILE_TOO_LARGE',
                              message: `File size ${file.size} bytes exceeds maximum allowed size of ${maxFileSize} bytes`,
                              timestamp: new Date().toISOString()
                         }
                    });
               }
          }

          next();
     };
};

module.exports = {
     handleValidationErrors,
     createValidationChain,
     validateRequestSize,
     validateContentType,
     sanitizeRequestBody,
     validatePagination,
     validateDateRange,
     validateFileUpload
};