/**
 * Common validation rules and sanitizers for API endpoints
 */
const { body, param, query } = require('express-validator');

/**
 * Common validation rules
 */
const ValidationRules = {
     // User validation
     userName: () => body('name')
          .trim()
          .isLength({ min: 2, max: 50 })
          .withMessage('Name must be between 2 and 50 characters')
          .matches(/^[a-zA-Z\s.'-]+$/)
          .withMessage('Name can only contain letters, spaces, periods, apostrophes, and hyphens'),

     userEmail: () => body('email')
          .isEmail()
          .normalizeEmail()
          .withMessage('Please provide a valid email address')
          .isLength({ max: 100 })
          .withMessage('Email must not exceed 100 characters'),

     userPassword: () => body('password')
          .isLength({ min: 8, max: 128 })
          .withMessage('Password must be between 8 and 128 characters')
          .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
          .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

     userRole: () => body('role')
          .isIn(['Admin', 'Lecturer', 'Student'])
          .withMessage('Role must be Admin, Lecturer, or Student'),

     // Course validation
     courseTitle: () => body('title')
          .trim()
          .isLength({ min: 3, max: 100 })
          .withMessage('Course title must be between 3 and 100 characters')
          .matches(/^[a-zA-Z0-9\s\-_.,()]+$/)
          .withMessage('Course title contains invalid characters'),

     courseDescription: () => body('description')
          .trim()
          .isLength({ min: 10, max: 1000 })
          .withMessage('Course description must be between 10 and 1000 characters'),

     courseCapacity: () => body('capacity')
          .isInt({ min: 1, max: 1000 })
          .withMessage('Course capacity must be between 1 and 1000'),

     // Exam validation
     examTitle: () => body('title')
          .trim()
          .isLength({ min: 3, max: 100 })
          .withMessage('Exam title must be between 3 and 100 characters')
          .matches(/^[a-zA-Z0-9\s\-_.,()]+$/)
          .withMessage('Exam title contains invalid characters'),

     examDuration: () => body('duration')
          .isInt({ min: 5, max: 300 })
          .withMessage('Exam duration must be between 5 and 300 minutes'),

     examStartTime: () => body('startTime')
          .isISO8601()
          .withMessage('Start time must be a valid ISO 8601 date')
          .custom((value) => {
               const startTime = new Date(value);
               const now = new Date();
               if (startTime <= now) {
                    throw new Error('Start time must be in the future');
               }
               return true;
          }),

     examEndTime: () => body('endTime')
          .isISO8601()
          .withMessage('End time must be a valid ISO 8601 date')
          .custom((value, { req }) => {
               const endTime = new Date(value);
               const startTime = new Date(req.body.startTime);
               if (endTime <= startTime) {
                    throw new Error('End time must be after start time');
               }
               return true;
          }),

     examQuestions: () => body('questions')
          .isArray({ min: 1, max: 100 })
          .withMessage('Exam must have between 1 and 100 questions')
          .custom((questions) => {
               for (let i = 0; i < questions.length; i++) {
                    const question = questions[i];

                    if (!question.questionText || typeof question.questionText !== 'string') {
                         throw new Error(`Question ${i + 1}: Question text is required`);
                    }

                    if (question.questionText.length < 10 || question.questionText.length > 500) {
                         throw new Error(`Question ${i + 1}: Question text must be between 10 and 500 characters`);
                    }

                    if (!Array.isArray(question.options) || question.options.length !== 4) {
                         throw new Error(`Question ${i + 1}: Must have exactly 4 options`);
                    }

                    for (let j = 0; j < question.options.length; j++) {
                         if (!question.options[j] || typeof question.options[j] !== 'string') {
                              throw new Error(`Question ${i + 1}, Option ${j + 1}: Option text is required`);
                         }
                         if (question.options[j].length < 1 || question.options[j].length > 200) {
                              throw new Error(`Question ${i + 1}, Option ${j + 1}: Option text must be between 1 and 200 characters`);
                         }
                    }

                    if (typeof question.correctAnswer !== 'number' || question.correctAnswer < 0 || question.correctAnswer > 3) {
                         throw new Error(`Question ${i + 1}: Correct answer must be a number between 0 and 3`);
                    }

                    if (question.points && (typeof question.points !== 'number' || question.points < 1 || question.points > 10)) {
                         throw new Error(`Question ${i + 1}: Points must be a number between 1 and 10`);
                    }
               }
               return true;
          }),

     // Exam attempt validation
     selectedOption: () => body('selectedOption')
          .isInt({ min: 0, max: 3 })
          .withMessage('Selected option must be between 0 and 3'),

     timeRemaining: () => body('timeRemaining')
          .isInt({ min: 0 })
          .withMessage('Time remaining must be a non-negative integer'),

     violationType: () => body('type')
          .isIn(['tab_switch', 'copy_attempt', 'paste_attempt', 'right_click', 'focus_loss', 'fullscreen_exit'])
          .withMessage('Invalid violation type'),

     violationDetails: () => body('details')
          .optional()
          .isLength({ max: 500 })
          .withMessage('Violation details must not exceed 500 characters'),

     // Parameter validation
     mongoId: (paramName = 'id') => param(paramName)
          .isMongoId()
          .withMessage(`Invalid ${paramName} format`),

     // Query parameter validation
     roleQuery: () => query('role')
          .optional()
          .isIn(['Admin', 'Lecturer', 'Student'])
          .withMessage('Role must be Admin, Lecturer, or Student'),

     statusQuery: () => query('status')
          .optional()
          .isIn(['in_progress', 'submitted', 'auto_submitted', 'expired'])
          .withMessage('Status must be in_progress, submitted, auto_submitted, or expired'),

     limitQuery: () => query('limit')
          .optional()
          .isInt({ min: 1, max: 100 })
          .withMessage('Limit must be between 1 and 100'),

     offsetQuery: () => query('offset')
          .optional()
          .isInt({ min: 0 })
          .withMessage('Offset must be a non-negative integer'),

     // Optional field validation (for updates)
     optionalUserName: () => body('name')
          .optional()
          .trim()
          .isLength({ min: 2, max: 50 })
          .withMessage('Name must be between 2 and 50 characters')
          .matches(/^[a-zA-Z\s.'-]+$/)
          .withMessage('Name can only contain letters, spaces, periods, apostrophes, and hyphens'),

     optionalUserEmail: () => body('email')
          .optional()
          .isEmail()
          .normalizeEmail()
          .withMessage('Please provide a valid email address')
          .isLength({ max: 100 })
          .withMessage('Email must not exceed 100 characters'),

     optionalUserRole: () => body('role')
          .optional()
          .isIn(['Admin', 'Lecturer', 'Student'])
          .withMessage('Role must be Admin, Lecturer, or Student'),

     optionalCourseTitle: () => body('title')
          .optional()
          .trim()
          .isLength({ min: 3, max: 100 })
          .withMessage('Course title must be between 3 and 100 characters')
          .matches(/^[a-zA-Z0-9\s\-_.,()]+$/)
          .withMessage('Course title contains invalid characters'),

     optionalCourseDescription: () => body('description')
          .optional()
          .trim()
          .isLength({ min: 10, max: 1000 })
          .withMessage('Course description must be between 10 and 1000 characters'),

     optionalCourseCapacity: () => body('capacity')
          .optional()
          .isInt({ min: 1, max: 1000 })
          .withMessage('Course capacity must be between 1 and 1000'),

     optionalExamTitle: () => body('title')
          .optional()
          .trim()
          .isLength({ min: 3, max: 100 })
          .withMessage('Exam title must be between 3 and 100 characters')
          .matches(/^[a-zA-Z0-9\s\-_.,()]+$/)
          .withMessage('Exam title contains invalid characters'),

     optionalExamDuration: () => body('duration')
          .optional()
          .isInt({ min: 5, max: 300 })
          .withMessage('Exam duration must be between 5 and 300 minutes'),

     optionalExamStartTime: () => body('startTime')
          .optional()
          .isISO8601()
          .withMessage('Start time must be a valid ISO 8601 date'),

     optionalExamEndTime: () => body('endTime')
          .optional()
          .isISO8601()
          .withMessage('End time must be a valid ISO 8601 date')
          .custom((value, { req }) => {
               if (value && req.body.startTime) {
                    const endTime = new Date(value);
                    const startTime = new Date(req.body.startTime);
                    if (endTime <= startTime) {
                         throw new Error('End time must be after start time');
                    }
               }
               return true;
          }),

     optionalExamQuestions: () => body('questions')
          .optional()
          .isArray({ min: 1, max: 100 })
          .withMessage('Exam must have between 1 and 100 questions')
          .custom((questions) => {
               if (!questions) return true;

               for (let i = 0; i < questions.length; i++) {
                    const question = questions[i];

                    if (!question.questionText || typeof question.questionText !== 'string') {
                         throw new Error(`Question ${i + 1}: Question text is required`);
                    }

                    if (question.questionText.length < 10 || question.questionText.length > 500) {
                         throw new Error(`Question ${i + 1}: Question text must be between 10 and 500 characters`);
                    }

                    if (!Array.isArray(question.options) || question.options.length !== 4) {
                         throw new Error(`Question ${i + 1}: Must have exactly 4 options`);
                    }

                    for (let j = 0; j < question.options.length; j++) {
                         if (!question.options[j] || typeof question.options[j] !== 'string') {
                              throw new Error(`Question ${i + 1}, Option ${j + 1}: Option text is required`);
                         }
                         if (question.options[j].length < 1 || question.options[j].length > 200) {
                              throw new Error(`Question ${i + 1}, Option ${j + 1}: Option text must be between 1 and 200 characters`);
                         }
                    }

                    if (typeof question.correctAnswer !== 'number' || question.correctAnswer < 0 || question.correctAnswer > 3) {
                         throw new Error(`Question ${i + 1}: Correct answer must be a number between 0 and 3`);
                    }

                    if (question.points && (typeof question.points !== 'number' || question.points < 1 || question.points > 10)) {
                         throw new Error(`Question ${i + 1}: Points must be a number between 1 and 10`);
                    }
               }
               return true;
          })
};

/**
 * Validation rule sets for common operations
 */
const ValidationSets = {
     // User operations
     createUser: [
          ValidationRules.userName(),
          ValidationRules.userEmail(),
          ValidationRules.userPassword(),
          ValidationRules.userRole()
     ],

     updateUser: [
          ValidationRules.mongoId(),
          ValidationRules.optionalUserName(),
          ValidationRules.optionalUserEmail(),
          ValidationRules.optionalUserRole()
     ],

     // Course operations
     createCourse: [
          ValidationRules.courseTitle(),
          ValidationRules.courseDescription(),
          ValidationRules.courseCapacity()
     ],

     updateCourse: [
          ValidationRules.mongoId(),
          ValidationRules.optionalCourseTitle(),
          ValidationRules.optionalCourseDescription(),
          ValidationRules.optionalCourseCapacity()
     ],

     // Exam operations
     createExam: [
          ValidationRules.examTitle(),
          ValidationRules.mongoId('courseId'),
          ValidationRules.examDuration(),
          ValidationRules.examStartTime(),
          ValidationRules.examEndTime(),
          ValidationRules.examQuestions()
     ],

     updateExam: [
          ValidationRules.mongoId(),
          ValidationRules.optionalExamTitle(),
          ValidationRules.optionalExamDuration(),
          ValidationRules.optionalExamStartTime(),
          ValidationRules.optionalExamEndTime(),
          ValidationRules.optionalExamQuestions()
     ],

     // Exam attempt operations
     recordAnswer: [
          ValidationRules.mongoId(),
          ValidationRules.mongoId('questionId'),
          ValidationRules.selectedOption()
     ],

     recordViolation: [
          ValidationRules.mongoId(),
          ValidationRules.violationType(),
          ValidationRules.violationDetails()
     ],

     updateTimer: [
          ValidationRules.mongoId(),
          ValidationRules.timeRemaining()
     ]
};

/**
 * Input sanitization functions
 */
const Sanitizers = {
     /**
      * Sanitize text input to prevent XSS
      * @param {string} text - Input text
      * @returns {string} Sanitized text
      */
     sanitizeText: (text) => {
          if (typeof text !== 'string') return text;
          return text
               .replace(/[<>]/g, '') // Remove potential HTML tags
               .trim();
     },

     /**
      * Sanitize HTML content (for rich text fields)
      * @param {string} html - HTML content
      * @returns {string} Sanitized HTML
      */
     sanitizeHtml: (html) => {
          if (typeof html !== 'string') return html;
          // Basic HTML sanitization - in production, use a library like DOMPurify
          return html
               .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
               .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
               .replace(/javascript:/gi, '')
               .replace(/on\w+\s*=/gi, '');
     },

     /**
      * Sanitize object by applying text sanitization to string properties
      * @param {Object} obj - Object to sanitize
      * @param {Array} fields - Fields to sanitize
      * @returns {Object} Sanitized object
      */
     sanitizeObject: (obj, fields) => {
          const sanitized = { ...obj };
          fields.forEach(field => {
               if (sanitized[field] && typeof sanitized[field] === 'string') {
                    sanitized[field] = Sanitizers.sanitizeText(sanitized[field]);
               }
          });
          return sanitized;
     }
};

module.exports = {
     ValidationRules,
     ValidationSets,
     Sanitizers
};