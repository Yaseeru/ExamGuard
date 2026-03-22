const sessionService = require('../services/sessionService');
const {
     enforceSessionCapacity,
     detectSessionHijacking,
     sessionRateLimit,
     monitorSessionPerformance,
     gracefulDegradation,
     addSessionHealthHeaders
} = require('./concurrentSessionMiddleware');

/**
 * Middleware to validate and manage exam sessions
 */
const validateSession = async (req, res, next) => {
     try {
          const sessionId = req.headers['x-session-id'] || req.body.sessionId || req.params.sessionId;

          if (!sessionId) {
               return res.status(400).json({
                    error: {
                         code: 'SESSION_ID_REQUIRED',
                         message: 'Session ID is required',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Find session
          const session = sessionService.findSessionById(sessionId);
          if (!session) {
               return res.status(404).json({
                    error: {
                         code: 'SESSION_NOT_FOUND',
                         message: 'Session not found',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Verify session belongs to authenticated user
          if (session.studentId !== req.user.id) {
               return res.status(403).json({
                    error: {
                         code: 'SESSION_ACCESS_DENIED',
                         message: 'Unauthorized access to session',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check if session is still active
          if (!sessionService.isSessionActive(session)) {
               return res.status(409).json({
                    error: {
                         code: 'SESSION_EXPIRED',
                         message: 'Session has expired',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Attach session to request
          req.session = session;
          next();

     } catch (error) {
          console.error('Session validation error:', error);
          res.status(500).json({
               error: {
                    code: 'SESSION_VALIDATION_ERROR',
                    message: 'Failed to validate session',
                    timestamp: new Date().toISOString()
               }
          });
     }
};

/**
 * Middleware to prevent concurrent session access
 */
const preventConcurrentAccess = async (req, res, next) => {
     try {
          const sessionId = req.session?.sessionId;
          if (!sessionId) {
               return next();
          }

          const lockKey = `${sessionId}_access`;

          // Try to acquire lock with timeout
          const lockAcquired = await sessionService.acquireLock(lockKey);
          if (!lockAcquired) {
               return res.status(409).json({
                    error: {
                         code: 'CONCURRENT_ACCESS_DENIED',
                         message: 'Another request is currently processing for this session',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Store lock key for cleanup
          req.lockKey = lockKey;

          // Ensure lock is released after response
          res.on('finish', () => {
               sessionService.releaseLock(lockKey);
          });

          res.on('close', () => {
               sessionService.releaseLock(lockKey);
          });

          next();

     } catch (error) {
          console.error('Concurrent access prevention error:', error);
          if (req.lockKey) {
               sessionService.releaseLock(req.lockKey);
          }
          res.status(500).json({
               error: {
                    code: 'CONCURRENCY_ERROR',
                    message: 'Failed to prevent concurrent access',
                    timestamp: new Date().toISOString()
               }
          });
     }
};

/**
 * Middleware to update session activity
 */
const updateSessionActivity = (req, res, next) => {
     if (req.session) {
          req.session.lastActivity = new Date();
     }
     next();
};

/**
 * Middleware to log session events
 */
const logSessionEvent = (eventType) => {
     return (req, res, next) => {
          if (req.session) {
               console.log(`Session Event: ${eventType} - Session: ${req.session.sessionId}, Student: ${req.session.studentId}, Time: ${new Date().toISOString()}`);
          }
          next();
     };
};

/**
 * Middleware to check session timeout
 */
const checkSessionTimeout = async (req, res, next) => {
     try {
          if (!req.session) {
               return next();
          }

          const timeRemaining = await sessionService.calculateTimeRemaining(req.session);

          if (timeRemaining <= 0) {
               // Auto-submit expired session
               await sessionService.autoSubmitSession(req.session.sessionId, 'timeout');

               return res.status(409).json({
                    error: {
                         code: 'SESSION_TIMEOUT',
                         message: 'Session has timed out and been automatically submitted',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Add time remaining to response headers
          res.set('X-Time-Remaining', timeRemaining.toString());
          next();

     } catch (error) {
          console.error('Session timeout check error:', error);
          next(); // Continue processing even if timeout check fails
     }
};

/**
 * Middleware to validate exam session state
 */
const validateExamState = async (req, res, next) => {
     try {
          if (!req.session) {
               return next();
          }

          // Check if exam is still available
          const Exam = require('../models/Exam');
          const exam = await Exam.findById(req.session.examId);

          if (!exam || !exam.isActive) {
               return res.status(409).json({
                    error: {
                         code: 'EXAM_UNAVAILABLE',
                         message: 'Exam is no longer available',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check exam time window
          const now = new Date();
          if (now < exam.startTime || now > exam.endTime) {
               return res.status(409).json({
                    error: {
                         code: 'EXAM_TIME_WINDOW_CLOSED',
                         message: 'Exam is outside the allowed time window',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          req.exam = exam;
          next();

     } catch (error) {
          console.error('Exam state validation error:', error);
          res.status(500).json({
               error: {
                    code: 'EXAM_STATE_ERROR',
                    message: 'Failed to validate exam state',
                    timestamp: new Date().toISOString()
               }
          });
     }
};

module.exports = {
     validateSession,
     preventConcurrentAccess,
     updateSessionActivity,
     logSessionEvent,
     checkSessionTimeout,
     validateExamState,
     // Enhanced concurrent session middleware
     enforceSessionCapacity,
     detectSessionHijacking,
     sessionRateLimit,
     monitorSessionPerformance,
     gracefulDegradation,
     addSessionHealthHeaders
};