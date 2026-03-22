/**
 * Utility functions and helpers for the ExamGuard API
 */

// Response formatting utilities
const responseFormatter = require('./responseFormatter');

// Validation utilities
const validators = require('./validators');

// API testing utilities
const apiTester = require('./apiTester');

// API documentation
const apiDocumentation = require('./apiDocumentation');

module.exports = {
     // Response formatting
     ...responseFormatter,

     // Validation
     ...validators,

     // Testing
     ...apiTester,

     // Documentation
     ...apiDocumentation
};