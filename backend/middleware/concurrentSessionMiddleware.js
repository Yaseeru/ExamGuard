const sessionService = require('../services/sessionService');

/**
 * Enhanced middleware for concurrent session management
 * Provides additional protection and monitoring for high-concurrency scenarios
 */

/**
 * Middleware to enforce session capacity limits
 */
const enforceSessionCapacity = async (req, res, next) => {
     try {
          const stats = sessionService.getEnhancedStatistics();

          if (stats.capacity.utilizationPercent > 95) {
               return res.status(503).json({
                    error: {
                         code: 'CAPACITY_EXCEEDED',
                         message: 'System is at capacity. Please try again later.',
                         details: {
                              currentSessions: stats.capacity.current,
                              maxSessions: stats.capacity.maximum,
                              utilizationPercent: stats.capacity.utilizationPercent
                         },
                         timestamp: new Date().toISOString()
                    }
               });
          }

          next();

     } catch (error) {
          console.error('Session capacity check error:', error);
          next(); // Continue processing even if capacity check fails
     }
};

/**
 * Middleware to detect and prevent session hijacking attempts
 */
const detectSessionHijacking = async (req, res, next) => {
     try {
          if (!req.session) {
               return next();
          }

          const userAgent = req.headers['user-agent'];
          const ipAddress = req.ip || req.connection.remoteAddress;

          // Check if session metadata matches request
          if (req.session.metadata.userAgent && req.session.metadata.userAgent !== userAgent) {
               console.warn(`Potential session hijacking detected: Session ${req.session.sessionId}, User Agent mismatch`);

               return res.status(403).json({
                    error: {
                         code: 'SESSION_SECURITY_VIOLATION',
                         message: 'Session security violation detected',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          if (req.session.metadata.ipAddress && req.session.metadata.ipAddress !== ipAddress) {
               console.warn(`Potential session hijacking detected: Session ${req.session.sessionId}, IP address mismatch`);

               return res.status(403).json({
                    error: {
                         code: 'SESSION_SECURITY_VIOLATION',
                         message: 'Session security violation detected',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          next();

     } catch (error) {
          console.error('Session hijacking detection error:', error);
          next(); // Continue processing even if detection fails
     }
};

/**
 * Middleware to implement rate limiting per session
 */
const sessionRateLimit = (maxRequestsPerMinute = 60) => {
     const sessionRequestCounts = new Map();

     return (req, res, next) => {
          if (!req.session) {
               return next();
          }

          const sessionId = req.session.sessionId;
          const now = Date.now();
          const windowStart = now - 60000; // 1 minute window

          // Get or create request history for this session
          if (!sessionRequestCounts.has(sessionId)) {
               sessionRequestCounts.set(sessionId, []);
          }

          const requests = sessionRequestCounts.get(sessionId);

          // Remove old requests outside the window
          const recentRequests = requests.filter(timestamp => timestamp > windowStart);
          sessionRequestCounts.set(sessionId, recentRequests);

          // Check rate limit
          if (recentRequests.length >= maxRequestsPerMinute) {
               return res.status(429).json({
                    error: {
                         code: 'RATE_LIMIT_EXCEEDED',
                         message: 'Too many requests for this session. Please slow down.',
                         details: {
                              maxRequestsPerMinute,
                              currentRequests: recentRequests.length,
                              resetTime: new Date(windowStart + 60000).toISOString()
                         },
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Record this request
          recentRequests.push(now);

          next();
     };
};

/**
 * Middleware to monitor session performance
 */
const monitorSessionPerformance = (req, res, next) => {
     if (!req.session) {
          return next();
     }

     const startTime = Date.now();

     // Override res.end to capture response time
     const originalEnd = res.end;
     res.end = function (...args) {
          const responseTime = Date.now() - startTime;

          // Log slow requests
          if (responseTime > 1000) { // 1 second threshold
               console.warn(`Slow session request: ${req.method} ${req.path}, Session: ${req.session.sessionId}, Response time: ${responseTime}ms`);
          }

          // Emit performance event
          sessionService.emit('sessionPerformance', {
               sessionId: req.session.sessionId,
               method: req.method,
               path: req.path,
               responseTime,
               timestamp: new Date()
          });

          originalEnd.apply(this, args);
     };

     next();
};

/**
 * Middleware to handle graceful session degradation
 */
const gracefulDegradation = (req, res, next) => {
     // Override session service methods to handle failures gracefully
     const originalRecordAnswer = sessionService.recordAnswer;
     const originalRecordViolation = sessionService.recordViolation;

     // Wrap recordAnswer with fallback
     sessionService.recordAnswer = async (...args) => {
          try {
               return await originalRecordAnswer.apply(sessionService, args);
          } catch (error) {
               if (error.message.includes('Unable to acquire lock')) {
                    // Fallback: return success but log the issue
                    console.warn('Session answer recording degraded due to lock contention:', error.message);
                    return {
                         success: true,
                         degraded: true,
                         message: 'Answer recorded with degraded performance'
                    };
               }
               throw error;
          }
     };

     // Wrap recordViolation with fallback
     sessionService.recordViolation = async (...args) => {
          try {
               return await originalRecordViolation.apply(sessionService, args);
          } catch (error) {
               if (error.message.includes('Unable to acquire lock')) {
                    // Fallback: return success but log the issue
                    console.warn('Session violation recording degraded due to lock contention:', error.message);
                    return {
                         success: true,
                         degraded: true,
                         message: 'Violation recorded with degraded performance'
                    };
               }
               throw error;
          }
     };

     // Restore original methods after request
     res.on('finish', () => {
          sessionService.recordAnswer = originalRecordAnswer;
          sessionService.recordViolation = originalRecordViolation;
     });

     next();
};

/**
 * Middleware to add session health headers
 */
const addSessionHealthHeaders = (req, res, next) => {
     if (req.session) {
          const stats = sessionService.getEnhancedStatistics();

          res.set({
               'X-Session-Health': stats.health.activeHeartbeats > stats.health.staleHeartbeats ? 'healthy' : 'degraded',
               'X-Session-Capacity': `${stats.capacity.current}/${stats.capacity.maximum}`,
               'X-Session-Performance': stats.performance.sessionThroughput.toFixed(2)
          });
     }

     next();
};

module.exports = {
     enforceSessionCapacity,
     detectSessionHijacking,
     sessionRateLimit,
     monitorSessionPerformance,
     gracefulDegradation,
     addSessionHealthHeaders
};