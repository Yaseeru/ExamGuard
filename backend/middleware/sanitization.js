/**
 * Input sanitization middleware for security
 */
const validator = require('validator');

/**
 * Sanitize string input to prevent XSS and injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (input) => {
     if (typeof input !== 'string') return input;

     return validator.escape(input.trim());
};

/**
 * Sanitize HTML content while preserving safe tags
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
const sanitizeHtml = (html) => {
     if (typeof html !== 'string') return html;

     // Remove dangerous tags and attributes
     return html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
          .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
          .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
          .replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/vbscript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/style\s*=/gi, '');
};

/**
 * Sanitize email input
 * @param {string} email - Email to sanitize
 * @returns {string} Sanitized email
 */
const sanitizeEmail = (email) => {
     if (typeof email !== 'string') return email;

     return validator.normalizeEmail(email.trim().toLowerCase()) || email;
};

/**
 * Sanitize numeric input
 * @param {any} num - Number to sanitize
 * @returns {number|null} Sanitized number or null if invalid
 */
const sanitizeNumber = (num) => {
     const parsed = parseFloat(num);
     return isNaN(parsed) ? null : parsed;
};

/**
 * Sanitize integer input
 * @param {any} num - Integer to sanitize
 * @returns {number|null} Sanitized integer or null if invalid
 */
const sanitizeInteger = (num) => {
     const parsed = parseInt(num, 10);
     return isNaN(parsed) ? null : parsed;
};

/**
 * Sanitize boolean input
 * @param {any} bool - Boolean to sanitize
 * @returns {boolean} Sanitized boolean
 */
const sanitizeBoolean = (bool) => {
     if (typeof bool === 'boolean') return bool;
     if (typeof bool === 'string') {
          return bool.toLowerCase() === 'true' || bool === '1';
     }
     return Boolean(bool);
};

/**
 * Sanitize array input
 * @param {any} arr - Array to sanitize
 * @param {Function} itemSanitizer - Function to sanitize each item
 * @returns {Array} Sanitized array
 */
const sanitizeArray = (arr, itemSanitizer = sanitizeString) => {
     if (!Array.isArray(arr)) return [];

     return arr.map(item => itemSanitizer(item)).filter(item => item !== null && item !== undefined);
};

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @param {Object} fieldSanitizers - Map of field names to sanitizer functions
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj, fieldSanitizers = {}) => {
     if (!obj || typeof obj !== 'object') return obj;

     const sanitized = {};

     for (const [key, value] of Object.entries(obj)) {
          const sanitizer = fieldSanitizers[key] || sanitizeString;

          if (Array.isArray(value)) {
               sanitized[key] = sanitizeArray(value, sanitizer);
          } else if (value && typeof value === 'object') {
               sanitized[key] = sanitizeObject(value, fieldSanitizers);
          } else {
               sanitized[key] = sanitizer(value);
          }
     }

     return sanitized;
};

/**
 * Middleware to sanitize request body
 * @param {Object} fieldSanitizers - Map of field names to sanitizer functions
 * @returns {Function} Express middleware function
 */
const sanitizeRequestBody = (fieldSanitizers = {}) => {
     return (req, res, next) => {
          if (req.body && typeof req.body === 'object') {
               req.body = sanitizeObject(req.body, fieldSanitizers);
          }
          next();
     };
};

/**
 * Middleware to sanitize query parameters
 * @param {Object} fieldSanitizers - Map of field names to sanitizer functions
 * @returns {Function} Express middleware function
 */
const sanitizeQueryParams = (fieldSanitizers = {}) => {
     return (req, res, next) => {
          if (req.query && typeof req.query === 'object') {
               req.query = sanitizeObject(req.query, fieldSanitizers);
          }
          next();
     };
};

/**
 * Middleware to sanitize route parameters
 * @param {Object} fieldSanitizers - Map of field names to sanitizer functions
 * @returns {Function} Express middleware function
 */
const sanitizeParams = (fieldSanitizers = {}) => {
     return (req, res, next) => {
          if (req.params && typeof req.params === 'object') {
               req.params = sanitizeObject(req.params, fieldSanitizers);
          }
          next();
     };
};

/**
 * Comprehensive sanitization middleware for all request data
 * @param {Object} options - Sanitization options
 * @param {Object} options.body - Body field sanitizers
 * @param {Object} options.query - Query field sanitizers
 * @param {Object} options.params - Params field sanitizers
 * @returns {Function} Express middleware function
 */
const sanitizeRequest = (options = {}) => {
     const { body = {}, query = {}, params = {} } = options;

     return (req, res, next) => {
          // Sanitize body
          if (req.body && typeof req.body === 'object') {
               req.body = sanitizeObject(req.body, body);
          }

          // Sanitize query parameters
          if (req.query && typeof req.query === 'object') {
               req.query = sanitizeObject(req.query, query);
          }

          // Sanitize route parameters
          if (req.params && typeof req.params === 'object') {
               req.params = sanitizeObject(req.params, params);
          }

          next();
     };
};

/**
 * Predefined sanitizer configurations for common use cases
 */
const SanitizerConfigs = {
     // User data sanitization
     user: {
          body: {
               name: sanitizeString,
               email: sanitizeEmail,
               password: (val) => val, // Don't sanitize passwords, just validate
               role: sanitizeString
          }
     },

     // Course data sanitization
     course: {
          body: {
               title: sanitizeString,
               description: sanitizeHtml,
               capacity: sanitizeInteger
          }
     },

     // Exam data sanitization
     exam: {
          body: {
               title: sanitizeString,
               duration: sanitizeInteger,
               startTime: sanitizeString,
               endTime: sanitizeString,
               questions: (questions) => {
                    if (!Array.isArray(questions)) return [];
                    return questions.map(q => ({
                         questionText: sanitizeString(q.questionText),
                         options: sanitizeArray(q.options, sanitizeString),
                         correctAnswer: sanitizeInteger(q.correctAnswer),
                         points: sanitizeInteger(q.points) || 1
                    }));
               }
          }
     },

     // Exam attempt data sanitization
     examAttempt: {
          body: {
               examId: sanitizeString,
               questionId: sanitizeString,
               selectedOption: sanitizeInteger,
               timeRemaining: sanitizeInteger,
               type: sanitizeString,
               details: sanitizeString
          }
     },

     // Query parameters sanitization
     query: {
          query: {
               role: sanitizeString,
               status: sanitizeString,
               courseId: sanitizeString,
               examId: sanitizeString,
               studentId: sanitizeString,
               limit: sanitizeInteger,
               offset: sanitizeInteger,
               startDate: sanitizeString,
               endDate: sanitizeString
          }
     }
};

module.exports = {
     sanitizeString,
     sanitizeHtml,
     sanitizeEmail,
     sanitizeNumber,
     sanitizeInteger,
     sanitizeBoolean,
     sanitizeArray,
     sanitizeObject,
     sanitizeRequestBody,
     sanitizeQueryParams,
     sanitizeParams,
     sanitizeRequest,
     SanitizerConfigs
};