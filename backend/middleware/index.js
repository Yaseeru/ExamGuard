/**
 * Middleware functions for the ExamGuard API
 */

module.exports = {
     // Authentication and authorization middleware
     auth: require('./auth'),

     // Validation middleware
     validation: require('./validation'),

     // Error handling middleware
     errorHandler: require('./errorHandler'),

     // Input sanitization middleware
     sanitization: require('./sanitization')
};