const mongoose = require('mongoose');

// Answer subdocument schema
const answerSchema = new mongoose.Schema({
     questionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: [true, 'Question ID is required']
     },
     selectedOption: {
          type: Number,
          required: [true, 'Selected option is required'],
          min: [0, 'Selected option must be between 0 and 3'],
          max: [3, 'Selected option must be between 0 and 3'],
          validate: {
               validator: Number.isInteger,
               message: 'Selected option must be a whole number'
          }
     },
     answeredAt: {
          type: Date,
          default: Date.now
     }
}, { _id: false });

// Violation subdocument schema
const violationSchema = new mongoose.Schema({
     type: {
          type: String,
          required: [true, 'Violation type is required'],
          enum: {
               values: [
                    'tab_switch',
                    'window_blur',
                    'copy_attempt',
                    'paste_attempt',
                    'cut_attempt',
                    'select_all_attempt',
                    'right_click',
                    'right_mouse_button',
                    'drag_attempt',
                    'clipboard_copy',
                    'clipboard_paste',
                    'clipboard_cut',
                    'dev_tools_attempt',
                    'dev_tools_detected',
                    'refresh_attempt',
                    'print_screen_attempt',
                    'alt_tab_attempt',
                    'reopen_tab_attempt',
                    'new_tab_attempt',
                    'new_window_attempt',
                    'focus_loss',
                    'suspicious_activity'
               ],
               message: 'Invalid violation type'
          }
     },
     timestamp: {
          type: Date,
          default: Date.now,
          required: [true, 'Violation timestamp is required']
     },
     details: {
          type: String,
          maxlength: [500, 'Violation details cannot exceed 500 characters'],
          default: ''
     }
}, { _id: true });

const examAttemptSchema = new mongoose.Schema({
     examId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Exam',
          required: [true, 'Exam ID is required'],
          validate: {
               validator: async function (examId) {
                    const Exam = mongoose.model('Exam');
                    const exam = await Exam.findById(examId);
                    return exam && exam.isActive;
               },
               message: 'Exam ID must reference a valid active exam'
          }
     },
     studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: [true, 'Student ID is required'],
          validate: {
               validator: async function (studentId) {
                    const User = mongoose.model('User');
                    const student = await User.findById(studentId);
                    return student && student.role === 'Student';
               },
               message: 'Student ID must reference a valid user with Student role'
          }
     },
     startTime: {
          type: Date,
          default: Date.now,
          required: [true, 'Start time is required']
     },
     endTime: {
          type: Date,
          validate: {
               validator: function (endTime) {
                    return !endTime || endTime > this.startTime;
               },
               message: 'End time must be after start time'
          }
     },
     timeRemaining: {
          type: Number,
          min: [0, 'Time remaining cannot be negative'],
          validate: {
               validator: Number.isInteger,
               message: 'Time remaining must be a whole number of seconds'
          }
     },
     answers: {
          type: [answerSchema],
          default: []
     },
     score: {
          type: Number,
          min: [0, 'Score cannot be negative'],
          default: null
     },
     totalQuestions: {
          type: Number,
          min: [1, 'Total questions must be at least 1'],
          validate: {
               validator: Number.isInteger,
               message: 'Total questions must be a whole number'
          }
     },
     violations: {
          type: [violationSchema],
          default: []
     },
     violationCount: {
          type: Number,
          default: 0,
          min: [0, 'Violation count cannot be negative'],
          max: [3, 'Violation count cannot exceed 3'],
          validate: {
               validator: Number.isInteger,
               message: 'Violation count must be a whole number'
          }
     },
     status: {
          type: String,
          required: [true, 'Status is required'],
          enum: {
               values: ['in_progress', 'submitted', 'auto_submitted', 'expired'],
               message: 'Invalid exam attempt status'
          },
          default: 'in_progress'
     },
     submittedAt: {
          type: Date,
          validate: {
               validator: function (submittedAt) {
                    return !submittedAt || submittedAt >= this.startTime;
               },
               message: 'Submitted time must be after start time'
          }
     }
}, {
     timestamps: true
});

// Compound indexes for better query performance
examAttemptSchema.index({ examId: 1, studentId: 1 });
examAttemptSchema.index({ studentId: 1, status: 1 });
examAttemptSchema.index({ examId: 1, status: 1 });
examAttemptSchema.index({ startTime: 1 });

// Pre-save middleware to sync violation count
examAttemptSchema.pre('save', function (next) {
     if (this.isModified('violations')) {
          this.violationCount = this.violations.length;

          // Auto-submit if violation limit reached
          if (this.violationCount >= 3 && this.status === 'in_progress') {
               this.status = 'auto_submitted';
               this.submittedAt = new Date();
               this.endTime = new Date();
          }
     }
     next();
});

// Pre-save middleware to set totalQuestions from exam
examAttemptSchema.pre('save', async function (next) {
     if (this.isNew && !this.totalQuestions) {
          try {
               const Exam = mongoose.model('Exam');
               const exam = await Exam.findById(this.examId);
               if (exam) {
                    this.totalQuestions = exam.questions.length;
                    // Set initial time remaining based on exam duration
                    this.timeRemaining = exam.duration * 60; // Convert minutes to seconds
               }
          } catch (error) {
               return next(error);
          }
     }
     next();
});

// Virtual to check if attempt is active
examAttemptSchema.virtual('isActive').get(function () {
     return this.status === 'in_progress';
});

// Virtual to check if attempt is completed
examAttemptSchema.virtual('isCompleted').get(function () {
     return ['submitted', 'auto_submitted', 'expired'].includes(this.status);
});

// Virtual to get duration in minutes
examAttemptSchema.virtual('durationMinutes').get(function () {
     if (this.endTime && this.startTime) {
          return Math.round((this.endTime - this.startTime) / (1000 * 60));
     }
     return null;
});

// Instance method to record answer
examAttemptSchema.methods.recordAnswer = function (questionId, selectedOption) {
     if (this.status !== 'in_progress') {
          throw new Error('Cannot record answer for completed exam attempt');
     }

     // Validate selected option
     if (selectedOption < 0 || selectedOption > 3) {
          throw new Error('Selected option must be between 0 and 3');
     }

     // Find existing answer or create new one
     const existingAnswerIndex = this.answers.findIndex(
          answer => answer.questionId.toString() === questionId.toString()
     );

     if (existingAnswerIndex >= 0) {
          // Update existing answer
          this.answers[existingAnswerIndex].selectedOption = selectedOption;
          this.answers[existingAnswerIndex].answeredAt = new Date();
     } else {
          // Add new answer
          this.answers.push({
               questionId,
               selectedOption,
               answeredAt: new Date()
          });
     }

     return this.save();
};

// Instance method to record violation
examAttemptSchema.methods.recordViolation = function (type, details = '') {
     if (this.status !== 'in_progress') {
          return this; // Don't record violations for completed attempts
     }

     const violation = {
          type,
          timestamp: new Date(),
          details
     };

     this.violations.push(violation);

     // The pre-save middleware will handle violation count and auto-submission
     return this.save();
};

// Instance method to submit attempt
examAttemptSchema.methods.submit = async function (autoSubmit = false) {
     if (this.status !== 'in_progress') {
          throw new Error('Exam attempt is already completed');
     }

     // Calculate score
     const Exam = mongoose.model('Exam');
     const exam = await Exam.findById(this.examId);

     if (exam) {
          const scoreResult = exam.calculateScore(this.answers);
          this.score = scoreResult.score;
     }

     // Update status and timestamps
     this.status = autoSubmit ? 'auto_submitted' : 'submitted';
     this.submittedAt = new Date();
     this.endTime = new Date();

     return this.save();
};

// Instance method to expire attempt
examAttemptSchema.methods.expire = function () {
     if (this.status === 'in_progress') {
          this.status = 'expired';
          this.submittedAt = new Date();
          this.endTime = new Date();
          return this.save();
     }
     return this;
};

// Instance method to get answer for specific question
examAttemptSchema.methods.getAnswerForQuestion = function (questionId) {
     return this.answers.find(
          answer => answer.questionId.toString() === questionId.toString()
     );
};

// Instance method to get violation summary
examAttemptSchema.methods.getViolationSummary = function () {
     const summary = {
          total: this.violationCount,
          byType: {}
     };

     this.violations.forEach(violation => {
          summary.byType[violation.type] = (summary.byType[violation.type] || 0) + 1;
     });

     return summary;
};

// Static method to find attempts by student
examAttemptSchema.statics.findByStudent = function (studentId, status = null) {
     const query = { studentId };
     if (status) {
          query.status = status;
     }

     return this.find(query)
          .populate('examId', 'title duration totalPoints')
          .populate({
               path: 'examId',
               populate: {
                    path: 'courseId',
                    select: 'title'
               }
          })
          .sort({ startTime: -1 });
};

// Static method to find attempts by exam
examAttemptSchema.statics.findByExam = function (examId, status = null) {
     const query = { examId };
     if (status) {
          query.status = status;
     }

     return this.find(query)
          .populate('studentId', 'name email')
          .sort({ startTime: -1 });
};

// Static method to check if student has existing attempt
examAttemptSchema.statics.hasExistingAttempt = function (examId, studentId) {
     return this.findOne({ examId, studentId });
};

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);