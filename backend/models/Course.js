const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
     title: {
          type: String,
          required: [true, 'Course title is required'],
          trim: true,
          minlength: [3, 'Course title must be at least 3 characters long'],
          maxlength: [100, 'Course title cannot exceed 100 characters'],
          match: [/^[a-zA-Z0-9\s]+$/, 'Course title can only contain letters, numbers, and spaces']
     },
     description: {
          type: String,
          required: [true, 'Course description is required'],
          trim: true,
          minlength: [10, 'Course description must be at least 10 characters long'],
          maxlength: [500, 'Course description cannot exceed 500 characters']
     },
     lecturerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: [true, 'Lecturer ID is required'],
          validate: {
               validator: async function (lecturerId) {
                    const User = mongoose.model('User');
                    const lecturer = await User.findById(lecturerId);
                    return lecturer && lecturer.role === 'Lecturer';
               },
               message: 'Lecturer ID must reference a valid user with Lecturer role'
          }
     },
     capacity: {
          type: Number,
          required: [true, 'Course capacity is required'],
          min: [1, 'Course capacity must be at least 1'],
          max: [1000, 'Course capacity cannot exceed 1000'],
          validate: {
               validator: Number.isInteger,
               message: 'Course capacity must be a whole number'
          }
     },
     enrolledStudents: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          validate: {
               validator: async function (studentId) {
                    const User = mongoose.model('User');
                    const student = await User.findById(studentId);
                    return student && student.role === 'Student';
               },
               message: 'Enrolled student must reference a valid user with Student role'
          }
     }],
     isActive: {
          type: Boolean,
          default: true
     }
}, {
     timestamps: true
});

// Indexes for better query performance
courseSchema.index({ lecturerId: 1 });
courseSchema.index({ isActive: 1 });
courseSchema.index({ 'enrolledStudents': 1 });

// Virtual for current enrollment count
courseSchema.virtual('currentEnrollment').get(function () {
     return this.enrolledStudents.length;
});

// Virtual for available spots
courseSchema.virtual('availableSpots').get(function () {
     return this.capacity - this.enrolledStudents.length;
});

// Pre-save middleware to validate enrollment capacity
courseSchema.pre('save', function (next) {
     if (this.enrolledStudents.length > this.capacity) {
          const error = new Error(`Enrollment count (${this.enrolledStudents.length}) exceeds course capacity (${this.capacity})`);
          error.name = 'ValidationError';
          return next(error);
     }
     next();
});

// Instance method to check if student is enrolled
courseSchema.methods.isStudentEnrolled = function (studentId) {
     return this.enrolledStudents.some(id => id.toString() === studentId.toString());
};

// Instance method to enroll student
courseSchema.methods.enrollStudent = function (studentId) {
     if (this.isStudentEnrolled(studentId)) {
          throw new Error('Student is already enrolled in this course');
     }

     if (this.enrolledStudents.length >= this.capacity) {
          throw new Error('Course has reached maximum capacity');
     }

     this.enrolledStudents.push(studentId);
     return this.save();
};

// Instance method to unenroll student
courseSchema.methods.unenrollStudent = function (studentId) {
     if (!this.isStudentEnrolled(studentId)) {
          throw new Error('Student is not enrolled in this course');
     }

     this.enrolledStudents = this.enrolledStudents.filter(
          id => id.toString() !== studentId.toString()
     );
     return this.save();
};

// Static method to find courses by lecturer
courseSchema.statics.findByLecturer = function (lecturerId) {
     return this.find({ lecturerId, isActive: true }).populate('lecturerId', 'name email');
};

// Static method to find available courses for enrollment
courseSchema.statics.findAvailableForEnrollment = function () {
     return this.find({ isActive: true })
          .populate('lecturerId', 'name email')
          .where('enrolledStudents')
          .size()
          .lt(this.capacity);
};

// Static method to find courses a student is enrolled in
courseSchema.statics.findByStudent = function (studentId) {
     return this.find({
          enrolledStudents: studentId,
          isActive: true
     }).populate('lecturerId', 'name email');
};

// Pre-remove middleware to check for active exams
courseSchema.pre('remove', async function (next) {
     const Exam = mongoose.model('Exam');
     const activeExams = await Exam.find({ courseId: this._id, isActive: true });

     if (activeExams.length > 0) {
          const error = new Error('Cannot delete course with active exams');
          error.name = 'ValidationError';
          return next(error);
     }

     next();
});

module.exports = mongoose.model('Course', courseSchema);