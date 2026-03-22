const performanceService = require('../services/performanceService');

/**
 * Performance monitoring middleware
 * Tracks request timing and performance metrics
 */
function performanceMiddleware(req, res, next) {
     const startTime = Date.now();

     // Override res.end to capture response time
     const originalEnd = res.end;
     res.end = function (...args) {
          const responseTime = Date.now() - startTime;

          // Record performance metrics
          performanceService.recordRequest(req, res, responseTime);

          // Add performance headers
          res.set('X-Response-Time', `${responseTime}ms`);

          // Call original end method
          originalEnd.apply(this, args);
     };

     next();
}

/**
 * Database query performance tracking wrapper
 */
function trackDbQuery(operation, collection) {
     return function (target, propertyKey, descriptor) {
          const originalMethod = descriptor.value;

          descriptor.value = async function (...args) {
               const startTime = Date.now();

               try {
                    const result = await originalMethod.apply(this, args);
                    const duration = Date.now() - startTime;

                    // Extract query from args if available
                    const query = args.length > 0 ? args[0] : null;

                    performanceService.recordDbQuery(operation, collection, duration, query);

                    return result;
               } catch (error) {
                    const duration = Date.now() - startTime;
                    performanceService.recordDbQuery(operation, collection, duration);
                    throw error;
               }
          };

          return descriptor;
     };
}

/**
 * Exam operation performance tracking
 */
function trackExamOperation(operation) {
     return function (req, res, next) {
          const startTime = Date.now();

          // Override res.json to capture completion time
          const originalJson = res.json;
          res.json = function (data) {
               const duration = Date.now() - startTime;
               const examId = req.params.examId || req.body.examId || 'unknown';

               performanceService.recordExamOperation(operation, examId, duration, {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    userId: req.user?.id
               });

               return originalJson.call(this, data);
          };

          next();
     };
}

/**
 * Performance monitoring route handler
 */
function getPerformanceMetrics(req, res) {
     try {
          const summary = performanceService.getPerformanceSummary();
          const health = performanceService.isPerformanceHealthy();
          const recommendations = performanceService.getRecommendations();

          res.json({
               success: true,
               data: {
                    summary,
                    health,
                    recommendations,
                    timestamp: new Date().toISOString()
               }
          });
     } catch (error) {
          res.status(500).json({
               success: false,
               error: 'Failed to retrieve performance metrics',
               message: error.message
          });
     }
}

/**
 * Detailed performance metrics for admin dashboard
 */
function getDetailedMetrics(req, res) {
     try {
          const metrics = performanceService.getDetailedMetrics();

          res.json({
               success: true,
               data: metrics
          });
     } catch (error) {
          res.status(500).json({
               success: false,
               error: 'Failed to retrieve detailed metrics',
               message: error.message
          });
     }
}

/**
 * Performance health check endpoint
 */
function performanceHealthCheck(req, res) {
     try {
          const health = performanceService.isPerformanceHealthy();
          const statusCode = health.healthy ? 200 : 503;

          res.status(statusCode).json({
               success: health.healthy,
               data: health,
               timestamp: new Date().toISOString()
          });
     } catch (error) {
          res.status(500).json({
               success: false,
               error: 'Performance health check failed',
               message: error.message
          });
     }
}

module.exports = {
     performanceMiddleware,
     trackDbQuery,
     trackExamOperation,
     getPerformanceMetrics,
     getDetailedMetrics,
     performanceHealthCheck
};