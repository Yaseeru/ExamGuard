const express = require('express');
const router = express.Router();
const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const Course = require('../models/Course');
const timerService = require('../services/timerService');
const AntiCheatService = require('../services/antiCheatService');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { trackExamOperation } = require('../middleware/performance');

// POST /api/exam-attempts - Start new exam attempt (Students only)
router.post('/', [
     authenticateToken,
     authorizeRoles(['Student']),
     trackExamOperation('start_attempt')
], async (req, res) => {
     try {
          const { examId } = req.body;
          const { id: studentId } = req.user;

          if (!examId) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Exam ID is required',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check if exam exists and is available
          const exam = await Exam.findById(examId).populate('courseId');
          if (!exam || !exam.isActive) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: 'Exam not found',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check if student is enrolled in the course
          if (!exam.courseId.enrolledStudents.includes(studentId)) {
               return res.status(403).json({
                    error: {
                         code: 'FORBIDDEN',
                         message: 'Not enrolled in this course',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check if exam is currently available
          if (!exam.isAvailable) {
               return res.status(400).json({
                    error: {
                         code: 'EXAM_NOT_AVAILABLE',
                         message: 'Exam is not currently available',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check if student already has an attempt for this exam
          const existingAttempt = await ExamAttempt.findOne({
               examId,
               studentId
          });

          if (existingAttempt) {
               return res.status(409).json({
                    error: {
                         code: 'ATTEMPT_EXISTS',
                         message: 'Student already has an attempt for this exam',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Create new exam attempt
          const attempt = new ExamAttempt({
               examId,
               studentId,
               startTime: new Date(),
               timeRemaining: exam.duration * 60, // Convert minutes to seconds
               totalQuestions: exam.questions.length
          });

          await attempt.save();

          // Register with timer service
          timerService.registerAttempt(attempt._id.toString(), attempt.timeRemaining);

          const populatedAttempt = await ExamAttempt.findById(attempt._id)
               .populate('examId', 'title duration questions')
               .populate('studentId', 'name email');

          res.status(201).json({
               message: 'Exam attempt started successfully',
               attempt: populatedAttempt
          });
     } catch (error) {
          console.error('Error starting exam attempt:', error);

          if (error.name === 'ValidationError') {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: error.message,
                         details: Object.values(error.errors).map(e => e.message),
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to start exam attempt',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/exam-attempts - Get exam attempts (filtered by role) - MUST be before /:id
router.get('/', authenticateToken, async (req, res) => {
     try {
          const { role, id: userId } = req.user;
          const { examId, studentId, status } = req.query;

          let query = {};

          if (role === 'Student') {
               // Students can only see their own attempts
               query.studentId = userId;
               if (examId) query.examId = examId;
               if (status) query.status = status;
          } else if (role === 'Lecturer') {
               // Lecturers can see attempts for their exams
               if (examId) {
                    // Verify lecturer owns the exam
                    const exam = await Exam.findById(examId).populate('courseId');
                    if (!exam || exam.courseId.lecturerId.toString() !== userId) {
                         return res.status(403).json({
                              error: {
                                   code: 'FORBIDDEN',
                                   message: 'Not authorized to access attempts for this exam',
                                   timestamp: new Date().toISOString()
                              }
                         });
                    }
                    query.examId = examId;
               } else {
                    // Get all exams from lecturer's courses
                    const courses = await Course.find({ lecturerId: userId, isActive: true });
                    const exams = await Exam.find({
                         courseId: { $in: courses.map(c => c._id) },
                         isActive: true
                    });
                    query.examId = { $in: exams.map(e => e._id) };
               }

               if (studentId) query.studentId = studentId;
               if (status) query.status = status;
          } else if (role === 'Admin') {
               // Admins can see all attempts
               if (examId) query.examId = examId;
               if (studentId) query.studentId = studentId;
               if (status) query.status = status;
          }

          const attempts = await ExamAttempt.find(query)
               .populate('examId', 'title duration totalPoints')
               .populate('studentId', 'name email')
               .populate({
                    path: 'examId',
                    populate: {
                         path: 'courseId',
                         select: 'title'
                    }
               })
               .sort({ startTime: -1 });

          res.json({ attempts });
     } catch (error) {
          console.error('Error fetching exam attempts:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch exam attempts',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/exam-attempts/violations/exam/:examId - Get violation analytics for exam (Lecturers only) - MUST be before /:id
router.get('/violations/exam/:examId', authenticateToken, authorizeRoles(['Lecturer', 'Admin']), async (req, res) => {
     try {
          const { examId } = req.params;
          const { role, id: userId } = req.user;

          if (role === 'Lecturer') {
               // Verify lecturer owns the exam
               const exam = await Exam.findById(examId).populate('courseId');
               if (!exam || exam.courseId.lecturerId.toString() !== userId) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Not authorized to access violation analytics for this exam',
                              timestamp: new Date().toISOString()
                         }
                    });
               }
          }

          const analytics = await AntiCheatService.getExamViolationAnalytics(examId);
          res.json({ analytics });
     } catch (error) {
          console.error('Error fetching exam violation analytics:', error);

          if (error.message.includes('Exam not found')) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: 'Exam not found',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch exam violation analytics',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/exam-attempts/violations/student/:studentId - Get student violation history (Lecturers and Admins only) - MUST be before /:id
router.get('/violations/student/:studentId', authenticateToken, authorizeRoles(['Lecturer', 'Admin']), async (req, res) => {
     try {
          const { studentId } = req.params;
          const { role, id: userId } = req.user;

          if (role === 'Lecturer') {
               // Verify lecturer has access to this student's data (student must be in lecturer's courses)
               const courses = await Course.find({ lecturerId: userId, isActive: true });
               const courseIds = courses.map(c => c._id);

               // Check if student is enrolled in any of the lecturer's courses
               const hasAccess = await Course.findOne({
                    _id: { $in: courseIds },
                    enrolledStudents: studentId
               });

               if (!hasAccess) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Not authorized to access this student\'s violation history',
                              timestamp: new Date().toISOString()
                         }
                    });
               }
          }

          const history = await AntiCheatService.getStudentViolationHistory(studentId);
          res.json({ history });
     } catch (error) {
          console.error('Error fetching student violation history:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch student violation history',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/exam-attempts/violations/system-stats - Get system-wide violation statistics (Admins only) - MUST be before /:id
router.get('/violations/system-stats', authenticateToken, authorizeRoles(['Admin']), async (req, res) => {
     try {
          const stats = await AntiCheatService.getSystemViolationStats();
          res.json({ stats });
     } catch (error) {
          console.error('Error fetching system violation stats:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch system violation statistics',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/exam-attempts/:id - Get specific exam attempt
router.get('/:id', authenticateToken, async (req, res) => {
     try {
          const { id } = req.params;
          const { role, id: userId } = req.user;

          const attempt = await ExamAttempt.findById(id)
               .populate('examId', 'title duration questions')
               .populate('studentId', 'name email');

          if (!attempt) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: 'Exam attempt not found',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check access permissions
          if (role === 'Student') {
               if (attempt.studentId._id.toString() !== userId) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Not authorized to access this attempt',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               // For students, don't include correct answers in questions
               const studentAttempt = attempt.toObject();
               if (studentAttempt.examId && studentAttempt.examId.questions) {
                    studentAttempt.examId.questions = studentAttempt.examId.questions.map(q => ({
                         _id: q._id,
                         questionText: q.questionText,
                         options: q.options,
                         points: q.points
                    }));
               }

               return res.json({ attempt: studentAttempt });
          } else if (role === 'Lecturer') {
               // Verify lecturer owns the course
               const exam = await Exam.findById(attempt.examId._id).populate('courseId');
               if (exam.courseId.lecturerId.toString() !== userId) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Not authorized to access this attempt',
                              timestamp: new Date().toISOString()
                         }
                    });
               }
          }

          res.json({ attempt });
     } catch (error) {
          console.error('Error fetching exam attempt:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch exam attempt',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// PUT /api/exam-attempts/:id/answer - Record answer for a question
router.put('/:id/answer', authenticateToken, authorizeRoles(['Student']), async (req, res) => {
     try {
          const { id } = req.params;
          const { questionId, selectedOption } = req.body;
          const { id: studentId } = req.user;

          if (!questionId || selectedOption === undefined) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Question ID and selected option are required',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          const attempt = await ExamAttempt.findById(id);

          if (!attempt) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: 'Exam attempt not found',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Verify student owns this attempt
          if (attempt.studentId.toString() !== studentId) {
               return res.status(403).json({
                    error: {
                         code: 'FORBIDDEN',
                         message: 'Not authorized to modify this attempt',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check if attempt is still active
          if (attempt.status !== 'in_progress') {
               return res.status(409).json({
                    error: {
                         code: 'ATTEMPT_COMPLETED',
                         message: 'Cannot modify completed exam attempt',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Validate selected option
          if (selectedOption < 0 || selectedOption > 3) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Selected option must be between 0 and 3',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Record the answer
          await attempt.recordAnswer(questionId, selectedOption);

          res.json({
               message: 'Answer recorded successfully',
               answeredQuestions: attempt.answers.length,
               totalQuestions: attempt.totalQuestions
          });
     } catch (error) {
          console.error('Error recording answer:', error);

          if (error.message.includes('Selected option must be between 0 and 3')) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: error.message,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to record answer',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// POST /api/exam-attempts/:id/submit - Submit exam attempt
router.post('/:id/submit', authenticateToken, authorizeRoles(['Student']), async (req, res) => {
     try {
          const { id } = req.params;
          const { id: studentId } = req.user;

          const attempt = await ExamAttempt.findById(id);

          if (!attempt) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: 'Exam attempt not found',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Verify student owns this attempt
          if (attempt.studentId.toString() !== studentId) {
               return res.status(403).json({
                    error: {
                         code: 'FORBIDDEN',
                         message: 'Not authorized to submit this attempt',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check if attempt is still active
          if (attempt.status !== 'in_progress') {
               return res.status(409).json({
                    error: {
                         code: 'ATTEMPT_ALREADY_SUBMITTED',
                         message: 'Exam attempt is already submitted',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Submit the attempt
          await attempt.submit(false); // false = manual submission

          // Unregister from timer service
          timerService.unregisterAttempt(id);

          res.json({
               message: 'Exam submitted successfully',
               score: attempt.score,
               totalQuestions: attempt.totalQuestions,
               answeredQuestions: attempt.answers.length,
               submittedAt: attempt.submittedAt
          });
     } catch (error) {
          console.error('Error submitting exam:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to submit exam',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// POST /api/exam-attempts/:id/violation - Record violation
router.post('/:id/violation', authenticateToken, authorizeRoles(['Student']), async (req, res) => {
     try {
          const { id } = req.params;
          const { type, details } = req.body;
          const { id: studentId } = req.user;

          if (!type) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Violation type is required',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          const attempt = await ExamAttempt.findById(id);

          if (!attempt) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: 'Exam attempt not found',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Verify student owns this attempt
          if (attempt.studentId.toString() !== studentId) {
               return res.status(403).json({
                    error: {
                         code: 'FORBIDDEN',
                         message: 'Not authorized to record violation for this attempt',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Use AntiCheatService to record the violation
          const result = await AntiCheatService.recordViolation(id, type, details || '');

          if (!result.success) {
               return res.status(409).json({
                    error: {
                         code: 'ATTEMPT_COMPLETED',
                         message: result.message,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // If auto-submitted due to violation limit, unregister from timer service
          if (result.autoSubmitted) {
               timerService.unregisterAttempt(id);
          }

          res.json({
               message: result.message,
               violationCount: result.violationCount,
               warningLevel: result.warningLevel,
               autoSubmitted: result.autoSubmitted,
               violation: result.violation
          });
     } catch (error) {
          console.error('Error recording violation:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to record violation',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// PUT /api/exam-attempts/:id/timer - Update timer (for synchronization)
router.put('/:id/timer', authenticateToken, authorizeRoles(['Student']), async (req, res) => {
     try {
          const { id } = req.params;
          const { timeRemaining } = req.body;
          const { id: studentId } = req.user;

          if (timeRemaining === undefined || timeRemaining < 0) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Valid time remaining is required',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          const attempt = await ExamAttempt.findById(id);

          if (!attempt) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: 'Exam attempt not found',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Verify student owns this attempt
          if (attempt.studentId.toString() !== studentId) {
               return res.status(403).json({
                    error: {
                         code: 'FORBIDDEN',
                         message: 'Not authorized to update timer for this attempt',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check if attempt is still active
          if (attempt.status !== 'in_progress') {
               return res.status(409).json({
                    error: {
                         code: 'ATTEMPT_COMPLETED',
                         message: 'Cannot update timer for completed attempt',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Auto-submit if time has expired
          if (timeRemaining <= 0) {
               await attempt.submit(true); // true = auto submission
               timerService.unregisterAttempt(id);
               return res.json({
                    message: 'Exam auto-submitted due to time expiry',
                    timeRemaining: 0,
                    autoSubmitted: true,
                    score: attempt.score
               });
          }

          // Update time remaining
          attempt.timeRemaining = timeRemaining;
          await attempt.save();

          // Update timer service
          timerService.updateTimer(id, timeRemaining);

          res.json({
               message: 'Timer updated successfully',
               timeRemaining: attempt.timeRemaining,
               autoSubmitted: false
          });
     } catch (error) {
          console.error('Error updating timer:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update timer',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/exam-attempts/:id/violations - Get violation report for specific attempt
router.get('/:id/violations', authenticateToken, async (req, res) => {
     try {
          const { id } = req.params;
          const { role, id: userId } = req.user;

          const attempt = await ExamAttempt.findById(id)
               .populate('examId')
               .populate('studentId', 'name email');

          if (!attempt) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: 'Exam attempt not found',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check access permissions
          if (role === 'Student') {
               if (attempt.studentId._id.toString() !== userId) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Not authorized to access this violation report',
                              timestamp: new Date().toISOString()
                         }
                    });
               }
          } else if (role === 'Lecturer') {
               // Verify lecturer owns the course
               const exam = await Exam.findById(attempt.examId._id).populate('courseId');
               if (exam.courseId.lecturerId.toString() !== userId) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Not authorized to access this violation report',
                              timestamp: new Date().toISOString()
                         }
                    });
               }
          }

          const violationReport = await AntiCheatService.getViolationReport(id);
          res.json({ report: violationReport });
     } catch (error) {
          console.error('Error fetching violation report:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch violation report',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

module.exports = router;