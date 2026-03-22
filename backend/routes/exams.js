const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Course = require('../models/Course');
const ExamAttempt = require('../models/ExamAttempt');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { cacheConfigs, createInvalidationMiddleware, invalidationPatterns } = require('../middleware/cache');

// GET /api/exams - Get exams (filtered by role and course)
router.get('/', [authenticateToken, cacheConfigs.exams], async (req, res) => {
     try {
          const { courseId } = req.query;
          const { role, id: userId } = req.user;
          let query = { isActive: true };

          if (role === 'Student') {
               // Students can only see exams from courses they're enrolled in
               if (courseId) {
                    const course = await Course.findById(courseId);
                    if (!course || !course.enrolledStudents.includes(userId)) {
                         return res.status(403).json({
                              error: {
                                   code: 'FORBIDDEN',
                                   message: 'Not enrolled in this course',
                                   timestamp: new Date().toISOString()
                              }
                         });
                    }
                    query.courseId = courseId;
               } else {
                    // Get all courses student is enrolled in
                    const enrolledCourses = await Course.find({
                         enrolledStudents: userId,
                         isActive: true
                    }).select('_id');

                    query.courseId = { $in: enrolledCourses.map(c => c._id) };
               }
          } else if (role === 'Lecturer') {
               // Lecturers can only see exams from their courses
               if (courseId) {
                    const course = await Course.findById(courseId);
                    if (!course || course.lecturerId.toString() !== userId) {
                         return res.status(403).json({
                              error: {
                                   code: 'FORBIDDEN',
                                   message: 'Not authorized to access this course',
                                   timestamp: new Date().toISOString()
                              }
                         });
                    }
                    query.courseId = courseId;
               } else {
                    // Get all courses lecturer owns
                    const ownedCourses = await Course.find({
                         lecturerId: userId,
                         isActive: true
                    }).select('_id');

                    query.courseId = { $in: ownedCourses.map(c => c._id) };
               }
          }

          const exams = await Exam.find(query)
               .populate('courseId', 'title lecturerId')
               .sort({ startTime: 1 });

          // For students, add attempt status
          if (role === 'Student') {
               const examsWithAttempts = await Promise.all(
                    exams.map(async (exam) => {
                         const attempt = await ExamAttempt.findOne({
                              examId: exam._id,
                              studentId: userId
                         });

                         return {
                              ...exam.toObject(),
                              hasAttempt: !!attempt,
                              attemptStatus: attempt?.status || null,
                              isAvailable: exam.isAvailable && !attempt
                         };
                    })
               );

               return res.json({ exams: examsWithAttempts });
          }

          res.json({ exams });
     } catch (error) {
          console.error('Error fetching exams:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch exams',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// POST /api/exams - Create new exam (Lecturers only)
router.post('/', [authenticateToken, authorizeRoles(['Lecturer']), createInvalidationMiddleware(invalidationPatterns.examOperations)], async (req, res) => {
     try {
          const { title, courseId, duration, startTime, endTime, questions } = req.body;
          const { id: userId } = req.user;

          // Verify lecturer owns the course
          const course = await Course.findById(courseId);
          if (!course || course.lecturerId.toString() !== userId) {
               return res.status(403).json({
                    error: {
                         code: 'FORBIDDEN',
                         message: 'Not authorized to create exams for this course',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Validate required fields
          if (!title || !courseId || !duration || !startTime || !endTime || !questions) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Missing required fields',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Validate questions format
          if (!Array.isArray(questions) || questions.length === 0) {
               return res.status(400).json({
                    error: {
                         code: 'VALIDATION_ERROR',
                         message: 'Exam must have at least one question',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Create exam
          const exam = new Exam({
               title,
               courseId,
               duration,
               startTime: new Date(startTime),
               endTime: new Date(endTime),
               questions
          });

          await exam.save();

          const populatedExam = await Exam.findById(exam._id)
               .populate('courseId', 'title lecturerId');

          res.status(201).json({
               message: 'Exam created successfully',
               exam: populatedExam
          });
     } catch (error) {
          console.error('Error creating exam:', error);

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
                    message: 'Failed to create exam',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/exams/:id - Get specific exam
router.get('/:id', [authenticateToken, cacheConfigs.examDetails], async (req, res) => {
     try {
          const { id } = req.params;
          const { role, id: userId } = req.user;

          const exam = await Exam.findById(id)
               .populate('courseId', 'title lecturerId enrolledStudents');

          if (!exam || !exam.isActive) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: 'Exam not found',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check access permissions
          if (role === 'Student') {
               if (!exam.courseId.enrolledStudents.includes(userId)) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Not enrolled in this course',
                              timestamp: new Date().toISOString()
                         }
                    });
               }

               // For students, don't include correct answers
               const studentExam = exam.toObject();
               studentExam.questions = studentExam.questions.map(q => ({
                    _id: q._id,
                    questionText: q.questionText,
                    options: q.options,
                    points: q.points
               }));

               return res.json({ exam: studentExam });
          } else if (role === 'Lecturer') {
               if (exam.courseId.lecturerId.toString() !== userId) {
                    return res.status(403).json({
                         error: {
                              code: 'FORBIDDEN',
                              message: 'Not authorized to access this exam',
                              timestamp: new Date().toISOString()
                         }
                    });
               }
          }

          res.json({ exam });
     } catch (error) {
          console.error('Error fetching exam:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch exam',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// PUT /api/exams/:id - Update exam (Lecturers only)
router.put('/:id', authenticateToken, authorizeRoles(['Lecturer']), async (req, res) => {
     try {
          const { id } = req.params;
          const { title, duration, startTime, endTime, questions } = req.body;
          const { id: userId } = req.user;

          const exam = await Exam.findById(id).populate('courseId');

          if (!exam || !exam.isActive) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: 'Exam not found',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Verify lecturer owns the course
          if (exam.courseId.lecturerId.toString() !== userId) {
               return res.status(403).json({
                    error: {
                         code: 'FORBIDDEN',
                         message: 'Not authorized to update this exam',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check if exam has attempts - prevent modification if it does
          const existingAttempts = await ExamAttempt.find({ examId: id });
          if (existingAttempts.length > 0) {
               return res.status(409).json({
                    error: {
                         code: 'CONFLICT',
                         message: 'Cannot modify exam with existing attempts',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Update exam fields
          if (title) exam.title = title;
          if (duration) exam.duration = duration;
          if (startTime) exam.startTime = new Date(startTime);
          if (endTime) exam.endTime = new Date(endTime);
          if (questions) exam.questions = questions;

          await exam.save();

          const populatedExam = await Exam.findById(exam._id)
               .populate('courseId', 'title lecturerId');

          res.json({
               message: 'Exam updated successfully',
               exam: populatedExam
          });
     } catch (error) {
          console.error('Error updating exam:', error);

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
                    message: 'Failed to update exam',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// DELETE /api/exams/:id - Delete exam (Lecturers only)
router.delete('/:id', authenticateToken, authorizeRoles(['Lecturer']), async (req, res) => {
     try {
          const { id } = req.params;
          const { id: userId } = req.user;

          const exam = await Exam.findById(id).populate('courseId');

          if (!exam || !exam.isActive) {
               return res.status(404).json({
                    error: {
                         code: 'NOT_FOUND',
                         message: 'Exam not found',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Verify lecturer owns the course
          if (exam.courseId.lecturerId.toString() !== userId) {
               return res.status(403).json({
                    error: {
                         code: 'FORBIDDEN',
                         message: 'Not authorized to delete this exam',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Check if exam has attempts - prevent deletion if it does
          const existingAttempts = await ExamAttempt.find({ examId: id });
          if (existingAttempts.length > 0) {
               return res.status(409).json({
                    error: {
                         code: 'CONFLICT',
                         message: 'Cannot delete exam with existing attempts',
                         timestamp: new Date().toISOString()
                    }
               });
          }

          // Soft delete by setting isActive to false
          exam.isActive = false;
          await exam.save();

          res.json({
               message: 'Exam deleted successfully'
          });
     } catch (error) {
          console.error('Error deleting exam:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to delete exam',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

module.exports = router;