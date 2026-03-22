const express = require('express');
const router = express.Router();
const sessionService = require('../services/sessionService');
const { authenticateToken } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

// Import enhanced middleware functions directly
// Temporarily commented out to fix routing issues
// const {
//      enforceSessionCapacity,
//      sessionRateLimit,
//      monitorSessionPerformance,
//      addSessionHealthHeaders
// } = require('../middleware/concurrentSessionMiddleware');

/**
 * @route POST /api/sessions
 * @desc Create a new exam session
 * @access Private (Student only)
 */
router.post('/',
     authenticateToken,
     // enforceSessionCapacity,
     // addSessionHealthHeaders,
     [
          body('examId')
               .isMongoId()
               .withMessage('Valid exam ID is required'),
          body('metadata.userAgent')
               .optional()
               .isString()
               .withMessage('User agent must be a string'),
          body('metadata.ipAddress')
               .optional()
               .isIP()
               .withMessage('Valid IP address required'),
          body('metadata.browserFingerprint')
               .optional()
               .isString()
               .withMessage('Browser fingerprint must be a string')
     ],
     async (req, res) => {
          try {
               // Check validation errors
               const errors = validationResult(req);
               if (!errors.isEmpty()) {
                    return res.status(400).json({
                         error: {
                              code: 'VALIDATION_ERROR',
                              message: 'Invalid input data',
                              details: errors.array(),
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               // Only students can create exam sessions
               if (req.user.role !== 'Student') {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Only students can create exam sessions',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               const { examId, metadata = {} } = req.body;
               const studentId = req.user.id;

               // Create session
               const sessionData = await sessionService.createSession(examId, studentId);

               // Update session metadata if provided
               if (Object.keys(metadata).length > 0) {
                    const session = sessionService.findSessionById(sessionData.sessionId);
                    if (session) {
                         session.metadata = { ...session.metadata, ...metadata };
                    }
               }

               res.status(201).json({
                    success: true,
                    data: sessionData,
                    timestamp: new Date().toISOString()
               });

          } catch (error) {
               console.error('Error creating session:', error);

               // Handle specific error types
               if (error.message.includes('already has an active session')) {
                    return res.status(409).json({
                         error: {
                              code: 'SESSION_EXISTS',
                              message: error.message,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               if (error.message.includes('not enrolled') || error.message.includes('Invalid student')) {
                    return res.status(403).json({
                         error: {
                              code: 'NOT_AUTHORIZED',
                              message: error.message,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               if (error.message.includes('already attempted')) {
                    return res.status(409).json({
                         error: {
                              code: 'ATTEMPT_EXISTS',
                              message: error.message,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               res.status(500).json({
                    error: {
                         code: 'INTERNAL_ERROR',
                         message: 'Failed to create exam session',
                         timestamp: new Date().toISOString()
                    }
               });
          }
     }
);

/**
 * @route GET /api/sessions/:sessionId
 * @desc Get session data
 * @access Private (Student only - own session)
 */
router.get('/:sessionId',
     authenticateToken,
     [
          param('sessionId')
               .isString()
               .withMessage('Valid session ID is required')
     ],
     async (req, res) => {
          try {
               const errors = validationResult(req);
               if (!errors.isEmpty()) {
                    return res.status(400).json({
                         error: {
                              code: 'VALIDATION_ERROR',
                              message: 'Invalid session ID',
                              details: errors.array(),
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               if (req.user.role !== 'Student') {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Only students can access session data',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               const { sessionId } = req.params;
               const studentId = req.user.id;

               const sessionData = await sessionService.getSession(sessionId, studentId);

               res.json({
                    success: true,
                    data: sessionData,
                    timestamp: new Date().toISOString()
               });

          } catch (error) {
               console.error('Error getting session:', error);

               if (error.message.includes('not found')) {
                    return res.status(404).json({
                         error: {
                              code: 'SESSION_NOT_FOUND',
                              message: error.message,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               if (error.message.includes('Unauthorized') || error.message.includes('expired')) {
                    return res.status(403).json({
                         error: {
                              code: 'SESSION_ACCESS_DENIED',
                              message: error.message,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               res.status(500).json({
                    error: {
                         code: 'INTERNAL_ERROR',
                         message: 'Failed to retrieve session data',
                         timestamp: new Date().toISOString()
                    }
               });
          }
     }
);

/**
 * @route PUT /api/sessions/:sessionId/answer
 * @desc Record answer for a question
 * @access Private (Student only - own session)
 */
router.put('/:sessionId/answer',
     authenticateToken,
     // sessionRateLimit(30), // 30 requests per minute for answer recording
     // monitorSessionPerformance,
     [
          param('sessionId')
               .isString()
               .withMessage('Valid session ID is required'),
          body('questionId')
               .isMongoId()
               .withMessage('Valid question ID is required'),
          body('selectedOption')
               .isInt({ min: 0, max: 3 })
               .withMessage('Selected option must be between 0 and 3')
     ],
     async (req, res) => {
          try {
               const errors = validationResult(req);
               if (!errors.isEmpty()) {
                    return res.status(400).json({
                         error: {
                              code: 'VALIDATION_ERROR',
                              message: 'Invalid input data',
                              details: errors.array(),
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               if (req.user.role !== 'Student') {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Only students can record answers',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               const { sessionId } = req.params;
               const { questionId, selectedOption } = req.body;
               const studentId = req.user.id;

               const result = await sessionService.recordAnswer(
                    sessionId,
                    studentId,
                    questionId,
                    selectedOption
               );

               res.json({
                    success: true,
                    data: result,
                    timestamp: new Date().toISOString()
               });

          } catch (error) {
               console.error('Error recording answer:', error);

               if (error.message.includes('Invalid session') || error.message.includes('unauthorized')) {
                    return res.status(403).json({
                         error: {
                              code: 'SESSION_ACCESS_DENIED',
                              message: error.message,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               if (error.message.includes('expired')) {
                    return res.status(409).json({
                         error: {
                              code: 'SESSION_EXPIRED',
                              message: error.message,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               res.status(500).json({
                    error: {
                         code: 'INTERNAL_ERROR',
                         message: 'Failed to record answer',
                         timestamp: new Date().toISOString()
                    }
               });
          }
     }
);

/**
 * @route POST /api/sessions/:sessionId/violation
 * @desc Record a violation
 * @access Private (Student only - own session)
 */
router.post('/:sessionId/violation',
     authenticateToken,
     // sessionRateLimit(10), // 10 violations per minute max
     // monitorSessionPerformance,
     [
          param('sessionId')
               .isString()
               .withMessage('Valid session ID is required'),
          body('type')
               .isIn(['tab_switch', 'copy_attempt', 'paste_attempt', 'right_click', 'focus_loss', 'suspicious_activity'])
               .withMessage('Invalid violation type'),
          body('details')
               .optional()
               .isString()
               .isLength({ max: 500 })
               .withMessage('Details must be a string with max 500 characters')
     ],
     async (req, res) => {
          try {
               const errors = validationResult(req);
               if (!errors.isEmpty()) {
                    return res.status(400).json({
                         error: {
                              code: 'VALIDATION_ERROR',
                              message: 'Invalid input data',
                              details: errors.array(),
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               if (req.user.role !== 'Student') {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Only students can record violations',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               const { sessionId } = req.params;
               const { type, details = '' } = req.body;
               const studentId = req.user.id;

               const result = await sessionService.recordViolation(
                    sessionId,
                    studentId,
                    type,
                    details
               );

               res.json({
                    success: true,
                    data: result,
                    timestamp: new Date().toISOString()
               });

          } catch (error) {
               console.error('Error recording violation:', error);

               if (error.message.includes('Invalid session') || error.message.includes('unauthorized')) {
                    return res.status(403).json({
                         error: {
                              code: 'SESSION_ACCESS_DENIED',
                              message: error.message,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               res.status(500).json({
                    error: {
                         code: 'INTERNAL_ERROR',
                         message: 'Failed to record violation',
                         timestamp: new Date().toISOString()
                    }
               });
          }
     }
);

/**
 * @route POST /api/sessions/:sessionId/submit
 * @desc Submit exam session
 * @access Private (Student only - own session)
 */
router.post('/:sessionId/submit',
     authenticateToken,
     [
          param('sessionId')
               .isString()
               .withMessage('Valid session ID is required')
     ],
     async (req, res) => {
          try {
               const errors = validationResult(req);
               if (!errors.isEmpty()) {
                    return res.status(400).json({
                         error: {
                              code: 'VALIDATION_ERROR',
                              message: 'Invalid session ID',
                              details: errors.array(),
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               if (req.user.role !== 'Student') {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Only students can submit sessions',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               const { sessionId } = req.params;
               const studentId = req.user.id;

               const result = await sessionService.submitSession(sessionId, studentId, false);

               res.json({
                    success: true,
                    data: result,
                    timestamp: new Date().toISOString()
               });

          } catch (error) {
               console.error('Error submitting session:', error);

               if (error.message.includes('Invalid session') || error.message.includes('unauthorized')) {
                    return res.status(403).json({
                         error: {
                              code: 'SESSION_ACCESS_DENIED',
                              message: error.message,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               res.status(500).json({
                    error: {
                         code: 'INTERNAL_ERROR',
                         message: 'Failed to submit session',
                         timestamp: new Date().toISOString()
                    }
               });
          }
     }
);

/**
 * @route PUT /api/sessions/:sessionId/heartbeat
 * @desc Update session heartbeat
 * @access Private (Student only - own session)
 */
router.put('/:sessionId/heartbeat',
     authenticateToken,
     [
          param('sessionId')
               .isString()
               .withMessage('Valid session ID is required')
     ],
     async (req, res) => {
          try {
               const errors = validationResult(req);
               if (!errors.isEmpty()) {
                    return res.status(400).json({
                         error: {
                              code: 'VALIDATION_ERROR',
                              message: 'Invalid session ID',
                              details: errors.array(),
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               if (req.user.role !== 'Student') {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Only students can update heartbeat',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               const { sessionId } = req.params;
               const studentId = req.user.id;

               const result = await sessionService.updateHeartbeat(sessionId, studentId);

               res.json({
                    success: true,
                    data: result,
                    timestamp: new Date().toISOString()
               });

          } catch (error) {
               console.error('Error updating heartbeat:', error);

               if (error.message.includes('Invalid session') || error.message.includes('unauthorized')) {
                    return res.status(403).json({
                         error: {
                              code: 'SESSION_ACCESS_DENIED',
                              message: error.message,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               if (error.message.includes('expired')) {
                    return res.status(409).json({
                         error: {
                              code: 'SESSION_EXPIRED',
                              message: error.message,
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               res.status(500).json({
                    error: {
                         code: 'INTERNAL_ERROR',
                         message: 'Failed to update heartbeat',
                         timestamp: new Date().toISOString()
                    }
               });
          }
     }
);

/**
 * @route GET /api/sessions/statistics/enhanced
 * @desc Get enhanced session statistics (Admin/Lecturer only)
 * @access Private (Admin/Lecturer only)
 */
router.get('/statistics/enhanced',
     authenticateToken,
     async (req, res) => {
          try {
               if (!['Admin', 'Lecturer'].includes(req.user.role)) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Only admins and lecturers can view enhanced session statistics',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               const statistics = sessionService.getEnhancedStatistics();

               res.json({
                    success: true,
                    data: statistics,
                    timestamp: new Date().toISOString()
               });

          } catch (error) {
               console.error('Error getting enhanced session statistics:', error);
               res.status(500).json({
                    error: {
                         code: 'INTERNAL_ERROR',
                         message: 'Failed to retrieve enhanced session statistics',
                         timestamp: new Date().toISOString()
                    }
               });
          }
     }
);

/**
 * @route GET /api/sessions/statistics
 * @desc Get session statistics (Admin/Lecturer only)
 * @access Private (Admin/Lecturer only)
 */
router.get('/statistics',
     authenticateToken,
     async (req, res) => {
          try {
               if (!['Admin', 'Lecturer'].includes(req.user.role)) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Only admins and lecturers can view session statistics',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               const statistics = sessionService.getStatistics();

               res.json({
                    success: true,
                    data: statistics,
                    timestamp: new Date().toISOString()
               });

          } catch (error) {
               console.error('Error getting session statistics:', error);
               res.status(500).json({
                    error: {
                         code: 'INTERNAL_ERROR',
                         message: 'Failed to retrieve session statistics',
                         timestamp: new Date().toISOString()
                    }
               });
          }
     }
);

module.exports = router;