const express = require('express');
const { body, param, validationResult } = require('express-validator');
const courseService = require('../services/courseService');
const {
     authenticateToken,
     requireLecturer,
     requireStudent,
     requireStudentOrLecturer
} = require('../middleware/auth');
const { cacheConfigs, createInvalidationMiddleware, invalidationPatterns } = require('../middleware/cache');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
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
     next();
};

// GET /api/courses - Get courses based on user role
router.get('/', [authenticateToken, requireStudentOrLecturer, cacheConfigs.courses], async (req, res) => {
     try {
          let result;
          if (req.user.role === 'Student') {
               result = await courseService.getAvailableCourses();
          } else if (req.user.role === 'Lecturer') {
               result = await courseService.getCoursesByLecturer(req.user.id);
          }

          if (!result.success) {
               return res.status(400).json({
                    error: {
                         code: 'COURSE_FETCH_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.json({
               success: true,
               courses: result.courses,
               count: result.courses.length,
               timestamp: new Date().toISOString()
          });
     } catch (error) {
          console.error('Get courses error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve courses',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// POST /api/courses - Create a new course
router.post('/', [
     authenticateToken,
     requireLecturer,
     createInvalidationMiddleware(invalidationPatterns.courseOperations),
     body('title').trim().isLength({ min: 3, max: 100 }).matches(/^[a-zA-Z0-9\s]+$/),
     body('description').trim().isLength({ min: 10, max: 500 }),
     body('capacity').isInt({ min: 1, max: 1000 })
], handleValidationErrors, async (req, res) => {
     try {
          const { title, description, capacity } = req.body;
          const result = await courseService.createCourse({ title, description, capacity }, req.user.id);

          if (!result.success) {
               return res.status(400).json({
                    error: {
                         code: 'COURSE_CREATION_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.status(201).json({
               success: true,
               message: 'Course created successfully',
               course: result.course,
               timestamp: new Date().toISOString()
          });
     } catch (error) {
          console.error('Create course error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create course',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/courses/enrolled - Get enrolled courses for students (MUST be before /:id route)
router.get('/enrolled', [authenticateToken, requireStudent, cacheConfigs.courses], async (req, res) => {
     try {
          const result = await courseService.getEnrolledCourses(req.user.id);

          if (!result.success) {
               return res.status(400).json({
                    error: {
                         code: 'ENROLLED_COURSES_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.json({
               success: true,
               courses: result.courses,
               count: result.courses.length,
               timestamp: new Date().toISOString()
          });
     } catch (error) {
          console.error('Get enrolled courses error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve enrolled courses',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// POST /api/courses/:id/enroll - Enroll student in course
router.post('/:id/enroll', [
     authenticateToken,
     requireStudent,
     param('id').isMongoId()
], handleValidationErrors, async (req, res) => {
     try {
          const result = await courseService.enrollStudent(req.params.id, req.user.id);

          if (!result.success) {
               const statusCode = result.error.includes('not found') ? 404 :
                    result.error.includes('already enrolled') ? 409 :
                         result.error.includes('capacity') ? 409 : 400;

               return res.status(statusCode).json({
                    error: {
                         code: statusCode === 404 ? 'COURSE_NOT_FOUND' : 'ENROLLMENT_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.status(201).json({
               success: true,
               message: result.message,
               course: result.course,
               timestamp: new Date().toISOString()
          });
     } catch (error) {
          console.error('Enroll student error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to enroll in course',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/courses/:id - Get course by ID
router.get('/:id', [
     authenticateToken,
     requireStudentOrLecturer,
     param('id').isMongoId()
], handleValidationErrors, async (req, res) => {
     try {
          const result = await courseService.getCourseById(req.params.id);

          if (!result.success) {
               return res.status(404).json({
                    error: {
                         code: 'COURSE_NOT_FOUND',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.json({
               success: true,
               course: result.course,
               timestamp: new Date().toISOString()
          });
     } catch (error) {
          console.error('Get course by ID error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve course',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// PUT /api/courses/:id - Update course
router.put('/:id', [
     authenticateToken,
     requireLecturer,
     param('id').isMongoId(),
     body('title').optional().trim().isLength({ min: 3, max: 100 }).matches(/^[a-zA-Z0-9\s]+$/),
     body('description').optional().trim().isLength({ min: 10, max: 500 }),
     body('capacity').optional().isInt({ min: 1, max: 1000 })
], handleValidationErrors, async (req, res) => {
     try {
          const result = await courseService.updateCourse(req.params.id, req.body, req.user.id);

          if (!result.success) {
               const statusCode = result.error.includes('not found') ? 404 :
                    result.error.includes('Unauthorized') ? 403 : 400;

               return res.status(statusCode).json({
                    error: {
                         code: statusCode === 404 ? 'COURSE_NOT_FOUND' :
                              statusCode === 403 ? 'UNAUTHORIZED' : 'COURSE_UPDATE_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.json({
               success: true,
               message: 'Course updated successfully',
               course: result.course,
               timestamp: new Date().toISOString()
          });
     } catch (error) {
          console.error('Update course error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update course',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// DELETE /api/courses/:id - Delete course
router.delete('/:id', [
     authenticateToken,
     requireLecturer,
     param('id').isMongoId()
], handleValidationErrors, async (req, res) => {
     try {
          const result = await courseService.deleteCourse(req.params.id, req.user.id);

          if (!result.success) {
               const statusCode = result.error.includes('not found') ? 404 :
                    result.error.includes('Unauthorized') ? 403 :
                         result.error.includes('active exams') ? 409 : 400;

               return res.status(statusCode).json({
                    error: {
                         code: statusCode === 404 ? 'COURSE_NOT_FOUND' :
                              statusCode === 403 ? 'UNAUTHORIZED' :
                                   statusCode === 409 ? 'REFERENTIAL_INTEGRITY_ERROR' : 'COURSE_DELETE_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.json({
               success: true,
               message: result.message,
               timestamp: new Date().toISOString()
          });
     } catch (error) {
          console.error('Delete course error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to delete course',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// DELETE /api/courses/:id/unenroll - Unenroll student from course
router.delete('/:id/unenroll', [
     authenticateToken,
     requireStudent,
     param('id').isMongoId()
], handleValidationErrors, async (req, res) => {
     try {
          const result = await courseService.unenrollStudent(req.params.id, req.user.id);

          if (!result.success) {
               const statusCode = result.error.includes('not found') ? 404 :
                    result.error.includes('not enrolled') ? 409 :
                         result.error.includes('active exam') ? 409 : 400;

               return res.status(statusCode).json({
                    error: {
                         code: statusCode === 404 ? 'COURSE_NOT_FOUND' :
                              statusCode === 409 ? 'UNENROLLMENT_CONFLICT' : 'UNENROLLMENT_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.json({
               success: true,
               message: result.message,
               course: result.course,
               timestamp: new Date().toISOString()
          });
     } catch (error) {
          console.error('Unenroll student error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to unenroll from course',
                    timestamp: new Date().toISOString()
               }
          });
     }
});

// GET /api/courses/:id/stats - Get course statistics
router.get('/:id/stats', [
     authenticateToken,
     requireLecturer,
     param('id').isMongoId()
], handleValidationErrors, async (req, res) => {
     try {
          const result = await courseService.getCourseStats(req.params.id, req.user.id);

          if (!result.success) {
               const statusCode = result.error.includes('not found') ? 404 :
                    result.error.includes('Unauthorized') ? 403 : 400;

               return res.status(statusCode).json({
                    error: {
                         code: statusCode === 404 ? 'COURSE_NOT_FOUND' :
                              statusCode === 403 ? 'UNAUTHORIZED' : 'STATS_ERROR',
                         message: result.error,
                         timestamp: new Date().toISOString()
                    }
               });
          }

          res.json({
               success: true,
               stats: result.stats,
               timestamp: new Date().toISOString()
          });
     } catch (error) {
          console.error('Get course stats error:', error);
          res.status(500).json({
               error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve course statistics',
                    timestamp: new Date().toISOString()
               }
          });
     }
});


module.exports = router;
