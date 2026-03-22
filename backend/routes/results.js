const express = require('express');
const router = express.Router();
const resultsService = require('../services/resultsService');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { cacheConfigs } = require('../middleware/cache');

// GET /api/results/student - Get results for authenticated student
router.get('/student', [authenticateToken, authorizeRoles(['Student']), cacheConfigs.results], async (req, res) => {
     try {
          const { id: studentId } = req.user;
          const { examId } = req.query;

          const results = await resultsService.getStudentResults(studentId, examId);

          res.json({
               message: 'Student results retrieved successfully',
               results
          });
     } catch (error) {
          console.error('Error fetching student results:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch student results',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/results/student/:studentId - Get results for specific student (Lecturers and Admins only)
router.get('/student/:studentId', authenticateToken, authorizeRoles(['Lecturer', 'Admin']), async (req, res) => {
     try {
          const { studentId } = req.params;
          const { examId } = req.query;
          const { role, id: userId } = req.user;

          // For lecturers, verify they have access to this student's data
          if (role === 'Lecturer') {
               const Course = require('../models/Course');
               const courses = await Course.find({ lecturerId: userId, isActive: true });
               const hasAccess = await Course.findOne({
                    _id: { $in: courses.map(c => c._id) },
                    enrolledStudents: studentId
               });

               if (!hasAccess) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Not authorized to access this student\'s results',
                              timestamp: new Date().toISOString()
                         }
                    });
               }
          }

          const results = await resultsService.getStudentResults(studentId, examId);

          res.json({
               message: 'Student results retrieved successfully',
               results
          });
     } catch (error) {
          console.error('Error fetching student results:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch student results',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/results/attempt/:attemptId - Get detailed results for specific attempt
router.get('/attempt/:attemptId', authenticateToken, async (req, res) => {
     try {
          const { attemptId } = req.params;
          const { role, id: userId } = req.user;

          let result;

          if (role === 'Student') {
               result = await resultsService.getStudentAttemptDetails(attemptId, userId);
          } else if (role === 'Lecturer') {
               result = await resultsService.getLecturerAttemptDetails(attemptId, userId);
          } else if (role === 'Admin') {
               // Admins can view any attempt details (use lecturer view for full details)
               const ExamAttempt = require('../models/ExamAttempt');
               const attempt = await ExamAttempt.findById(attemptId).populate({
                    path: 'examId',
                    populate: {
                         path: 'courseId',
                         select: 'lecturerId'
                    }
               });

               if (!attempt) {
                    return res.status(404).json({
                         error: {
                              code: 'NOT_FOUND',
                              message: 'Exam attempt not found',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               result = await resultsService.getLecturerAttemptDetails(attemptId, attempt.examId.courseId.lecturerId);
          }

          res.json({
               message: 'Attempt details retrieved successfully',
               result
          });
     } catch (error) {
          console.error('Error fetching attempt details:', error);

          if (error.message.includes('not found')) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: error.message,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          if (error.message.includes('Not authorized')) {
               return res.status(403).json({
                    error: {
                         code: 'FORBIDDEN',
                         message: error.message,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          if (error.message.includes('not yet completed')) {
               return res.status(400).json({
                    error: {
                         code: 'ATTEMPT_NOT_COMPLETED',
                         message: error.message,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch attempt details',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/results/exam/:examId - Get all results for specific exam (Lecturers and Admins only)
router.get('/exam/:examId', [authenticateToken, authorizeRoles(['Lecturer', 'Admin']), cacheConfigs.analytics], async (req, res) => {
     try {
          const { examId } = req.params;
          const { role, id: userId } = req.user;

          let lecturerId = userId;

          // For admins, get the lecturer ID from the exam
          if (role === 'Admin') {
               const Exam = require('../models/Exam');
               const exam = await Exam.findById(examId).populate('courseId', 'lecturerId');
               if (!exam) {
                    return res.status(404).json({
                         error: {
                              code: 'NOT_FOUND',
                              message: 'Exam not found',
                              timestamp: new Date().toISOString()
                         }
                    });
               }
               lecturerId = exam.courseId.lecturerId;
          }

          const examResults = await resultsService.getExamResults(examId, lecturerId);

          res.json({
               message: 'Exam results retrieved successfully',
               ...examResults
          });
     } catch (error) {
          console.error('Error fetching exam results:', error);

          if (error.message.includes('not found')) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: error.message,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          if (error.message.includes('Not authorized')) {
               return res.status(403).json({
                    error: {
                         code: 'FORBIDDEN',
                         message: error.message,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch exam results',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/results/lecturer - Get results summary for authenticated lecturer
router.get('/lecturer', authenticateToken, authorizeRoles(['Lecturer']), async (req, res) => {
     try {
          const { id: lecturerId } = req.user;

          const summary = await resultsService.getLecturerResultsSummary(lecturerId);

          res.json({
               message: 'Lecturer results summary retrieved successfully',
               summary
          });
     } catch (error) {
          console.error('Error fetching lecturer results summary:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch lecturer results summary',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/results/lecturer/:lecturerId - Get results summary for specific lecturer (Admins only)
router.get('/lecturer/:lecturerId', authenticateToken, authorizeRoles(['Admin']), async (req, res) => {
     try {
          const { lecturerId } = req.params;

          const summary = await resultsService.getLecturerResultsSummary(lecturerId);

          res.json({
               message: 'Lecturer results summary retrieved successfully',
               summary
          });
     } catch (error) {
          console.error('Error fetching lecturer results summary:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch lecturer results summary',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

module.exports = router;