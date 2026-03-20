const mongoose = require('mongoose');

// Question subdocument schema
const questionSchema = new mongoose.Schema({
     questionText: {
          type: String,
          required: [true, 'Question text is required'],
          trim: true,
          minlength: [10, 'Question text must be at least 10 characters long'],
          maxlength: [1000, 'Question text cannot exceed 1000 characters']
     },
     options: {
          type: [String],
          required: [true, 'Question options are required'],
          validate: {
               validator: function (options) {
                    return Array.isArray(options) && options.length === 4 &&
                         options.every(option => option && option.trim().length > 0);
               },
               message: 'Each question must have exactly 4 non-empty options'
          }
     },
     correctAnswer: {
          type: Number,
          required: [true, 'Correct answer index is required'],
          min: [0, 'Correct answer index must be between 0 and 3'],
          max: [3, 'Correct answer index must be between 0 and 3'],
          validate: {
               validator: Number.isInteger,
               message: 'Correct answer index must be a whole number'
          }
     },
     points: {
          type: Number,
          default: 1,
          min: [0.1, 'Question points must be at least 0.1'],
          max: [10, 'Question points cannot exceed 10']
     }
}, { _id: true }); // Enable _id for questions

const examSchema = new mongoose.Schema({
     title: {
          type: String,
          required: [true, 'Exam title is required'],
          trim: true,
          minlength: [3, 'Exam title must be at least 3 characters long'],
          maxlength: [100, 'Exam title cannot exceed 100 characters']
     },
     courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Course',
          required: [true, 'Course ID is required'],
          validate: {
               validator: async function (courseId) {
                    const Course = mongoose.model('Course');
                    const course = await Course.findById(courseId);
                    return course && course.isActive;
               },
               message: 'Course ID must reference a valid active course'
          }
     },
     duration: {
          type: Number,
          required: [true, 'Exam duration is required'],
          min: [5, 'Exam duration must be at least 5 minutes'],
          max: [300, 'Exam duration cannot exceed 300 minutes (5 hours)'],
          validate: {
               validator: Number.isInteger,
               message: 'Exam duration must be a whole number of minutes'
          }
     },
     startTime: {
          type: Date,
          required: [true, 'Exam start time is required'],
          validate: {
               validator: function (startTime) {
                    // Allow past dates for testing, but in production you might want:
                    // return startTime > new Date();
                    return startTime instanceof Date && !isNaN(startTime);
               },
               message: 'Start time must be a valid date'
          }
     },
     endTime: {
          type: Date,
          required: [true, 'Exam end time is required'],
          validate: {
               validator: function (endTime) {
                    return endTime > this.startTime;
               },
               message: 'End time must be after start time'
          }
     },
     questions: {
          type: [questionSchema],
          required: [true, 'Exam must have at least one question'],
          validate: {
               validator: function (questions) {
                    return Array.isArray(questions) && questions.length >= 1 && questions.length <= 100;
               },
               message: 'Exam must have between 1 and 100 questions'
          }
     },
     totalPoints: {
          type: Number,
          default: 0
     },
     isActive: {
          type: Boolean,
          default: true
     }
}, {
     timestamps: true
});

// Indexes for better query performance
examSchema.index({ courseId: 1 });
examSchema.index({ startTime: 1, endTime: 1 });
examSchema.index({ isActive: 1 });

// Pre-save middleware to calculate total points
examSchema.pre('save', function (next) {
     if (this.isModified('questions')) {
          this.totalPoints = this.questions.reduce((total, question) => {
               return total + (question.points || 1);
          }, 0);
     }
     next();
});

// Virtual to check if exam is currently available
examSchema.virtual('isAvailable').get(function () {
     const now = new Date();
     return this.isActive && now >= this.startTime && now <= this.endTime;
});

// Virtual to check if exam is upcoming
examSchema.virtual('isUpcoming').get(function () {
     const now = new Date();
     return this.isActive && now < this.startTime;
});

// Virtual to check if exam has ended
examSchema.virtual('hasEnded').get(function () {
     const now = new Date();
     return now > this.endTime;
});

// Instance method to get question by ID
examSchema.methods.getQuestionById = function (questionId) {
     return this.questions.id(questionId);
};

// Instance method to validate answer
examSchema.methods.validateAnswer = function (questionId, selectedOption) {
     const question = this.getQuestionById(questionId);
     if (!question) {
          throw new Error('Question not found');
     }

     if (selectedOption < 0 || selectedOption > 3) {
          throw new Error('Selected option must be between 0 and 3');
     }

     return question.correctAnswer === selectedOption;
};

// Instance method to calculate score for given answers
examSchema.methods.calculateScore = function (answers) {
     let totalScore = 0;
     let correctAnswers = 0;

     answers.forEach(answer => {
          const question = this.getQuestionById(answer.questionId);
          if (question && question.correctAnswer === answer.selectedOption) {
               totalScore += question.points || 1;
               correctAnswers++;
          }
     });

     return {
          score: totalScore,
          totalPoints: this.totalPoints,
          correctAnswers,
          totalQuestions: this.questions.length,
          percentage: this.totalPoints > 0 ? (totalScore / this.totalPoints) * 100 : 0
     };
};

// Static method to find exams by course
examSchema.statics.findByCourse = function (courseId) {
     return this.find({ courseId, isActive: true })
          .populate('courseId', 'title lecturerId')
          .sort({ startTime: 1 });
};

// Static method to find available exams for a student
examSchema.statics.findAvailableForStudent = function (studentId) {
     const now = new Date();
     return this.find({
          isActive: true,
          startTime: { $lte: now },
          endTime: { $gte: now }
     })
          .populate({
               path: 'courseId',
               match: { enrolledStudents: studentId, isActive: true },
               select: 'title lecturerId'
          })
          .then(exams => exams.filter(exam => exam.courseId)); // Filter out exams where courseId is null (student not enrolled)
};

// Static method to find upcoming exams for a student
examSchema.statics.findUpcomingForStudent = function (studentId) {
     const now = new Date();
     return this.find({
          isActive: true,
          startTime: { $gt: now }
     })
          .populate({
               path: 'courseId',
               match: { enrolledStudents: studentId, isActive: true },
               select: 'title lecturerId'
          })
          .sort({ startTime: 1 })
          .then(exams => exams.filter(exam => exam.courseId));
};

// Pre-remove middleware to check for exam attempts
examSchema.pre('remove', async function (next) {
     const ExamAttempt = mongoose.model('ExamAttempt');
     const attempts = await ExamAttempt.find({ examId: this._id });

     if (attempts.length > 0) {
          const error = new Error('Cannot delete exam with existing attempts');
          error.name = 'ValidationError';
          return next(error);
     }

     next();
});

module.exports = mongoose.model('Exam', examSchema);