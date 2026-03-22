const Course = require('../models/Course');
const User = require('../models/User');

class CourseService {
     /**
      * Create a new course
      * @param {Object} courseData - Course data (title, description, capacity)
      * @param {string} lecturerId - ID of the lecturer creating the course
      * @returns {Object} Created course data
      */
     async createCourse(courseData, lecturerId) {
          try {
               const { title, description, capacity } = courseData;

               // Verify lecturer exists and has correct role
               const lecturer = await User.findById(lecturerId);
               if (!lecturer || lecturer.role !== 'Lecturer') {
                    throw new Error('Invalid lecturer ID or lecturer not found');
               }

               // Create new course
               const course = new Course({
                    title,
                    description,
                    capacity,
                    lecturerId
               });

               await course.save();
               await course.populate('lecturerId', 'name email');

               return {
                    success: true,
                    course
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Get courses by lecturer
      * @param {string} lecturerId - Lecturer ID
      * @returns {Object} List of courses owned by lecturer
      */
     async getCoursesByLecturer(lecturerId) {
          try {
               const courses = await Course.findByLecturer(lecturerId);

               return {
                    success: true,
                    courses
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Get available courses for student enrollment
      * @returns {Object} List of available courses
      */
     async getAvailableCourses() {
          try {
               const courses = await Course.find({ isActive: true })
                    .populate('lecturerId', 'name email')
                    .sort({ createdAt: -1 });

               // Filter courses that have available spots
               const availableCourses = courses.filter(course =>
                    course.enrolledStudents.length < course.capacity
               );

               return {
                    success: true,
                    courses: availableCourses
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Get courses a student is enrolled in
      * @param {string} studentId - Student ID
      * @returns {Object} List of enrolled courses
      */
     async getEnrolledCourses(studentId) {
          try {
               const courses = await Course.findByStudent(studentId);

               return {
                    success: true,
                    courses
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Get course by ID
      * @param {string} courseId - Course ID
      * @returns {Object} Course data
      */
     async getCourseById(courseId) {
          try {
               const course = await Course.findById(courseId)
                    .populate('lecturerId', 'name email')
                    .populate('enrolledStudents', 'name email');

               if (!course || !course.isActive) {
                    throw new Error('Course not found');
               }

               return {
                    success: true,
                    course
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Update course information
      * @param {string} courseId - Course ID
      * @param {Object} updateData - Data to update
      * @param {string} lecturerId - ID of lecturer making the update
      * @returns {Object} Updated course data
      */
     async updateCourse(courseId, updateData, lecturerId) {
          try {
               const course = await Course.findById(courseId);

               if (!course || !course.isActive) {
                    throw new Error('Course not found');
               }

               // Verify lecturer owns the course
               if (course.lecturerId.toString() !== lecturerId) {
                    throw new Error('Unauthorized: You can only update your own courses');
               }

               // Fields that can be updated
               const allowedUpdates = ['title', 'description', 'capacity'];
               const updates = {};

               // Filter updates
               for (const field of allowedUpdates) {
                    if (updateData[field] !== undefined) {
                         updates[field] = updateData[field];
                    }
               }

               // Validate capacity if being updated
               if (updates.capacity && updates.capacity < course.enrolledStudents.length) {
                    throw new Error(`Cannot reduce capacity below current enrollment count (${course.enrolledStudents.length})`);
               }

               // Update course
               Object.assign(course, updates);
               await course.save();
               await course.populate('lecturerId', 'name email');

               return {
                    success: true,
                    course
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Delete course with referential integrity checks
      * @param {string} courseId - Course ID
      * @param {string} lecturerId - ID of lecturer making the deletion
      * @returns {Object} Deletion result
      */
     async deleteCourse(courseId, lecturerId) {
          try {
               const course = await Course.findById(courseId);

               if (!course || !course.isActive) {
                    throw new Error('Course not found');
               }

               // Verify lecturer owns the course
               if (course.lecturerId.toString() !== lecturerId) {
                    throw new Error('Unauthorized: You can only delete your own courses');
               }

               // Check for active exams (referential integrity)
               const Exam = require('../models/Exam');
               const activeExams = await Exam.find({ courseId, isActive: true });

               if (activeExams.length > 0) {
                    throw new Error('Cannot delete course with active exams. Please delete or deactivate all exams first.');
               }

               // Soft delete by setting isActive to false
               course.isActive = false;
               await course.save();

               return {
                    success: true,
                    message: 'Course deleted successfully'
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Enroll student in course
      * @param {string} courseId - Course ID
      * @param {string} studentId - Student ID
      * @returns {Object} Enrollment result
      */
     async enrollStudent(courseId, studentId) {
          try {
               // Verify student exists and has correct role
               const student = await User.findById(studentId);
               if (!student || student.role !== 'Student') {
                    throw new Error('Invalid student ID or student not found');
               }

               const course = await Course.findById(courseId);
               if (!course || !course.isActive) {
                    throw new Error('Course not found');
               }

               // Check if student is already enrolled
               if (course.isStudentEnrolled(studentId)) {
                    throw new Error('Student is already enrolled in this course');
               }

               // Check capacity
               if (course.enrolledStudents.length >= course.capacity) {
                    throw new Error('Course has reached maximum capacity');
               }

               // Enroll student
               await course.enrollStudent(studentId);
               await course.populate('lecturerId', 'name email');

               return {
                    success: true,
                    message: 'Student enrolled successfully',
                    course
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Unenroll student from course
      * @param {string} courseId - Course ID
      * @param {string} studentId - Student ID
      * @returns {Object} Unenrollment result
      */
     async unenrollStudent(courseId, studentId) {
          try {
               const course = await Course.findById(courseId);
               if (!course || !course.isActive) {
                    throw new Error('Course not found');
               }

               // Check if student is enrolled
               if (!course.isStudentEnrolled(studentId)) {
                    throw new Error('Student is not enrolled in this course');
               }

               // Check for active exam attempts (prevent unenrollment if student has ongoing exams)
               const ExamAttempt = require('../models/ExamAttempt');
               const Exam = require('../models/Exam');

               const courseExams = await Exam.find({ courseId, isActive: true });
               const examIds = courseExams.map(exam => exam._id);

               const activeAttempts = await ExamAttempt.find({
                    examId: { $in: examIds },
                    studentId,
                    status: 'in_progress'
               });

               if (activeAttempts.length > 0) {
                    throw new Error('Cannot unenroll student with active exam attempts');
               }

               // Unenroll student
               await course.unenrollStudent(studentId);
               await course.populate('lecturerId', 'name email');

               return {
                    success: true,
                    message: 'Student unenrolled successfully',
                    course
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }

     /**
      * Get course statistics
      * @param {string} courseId - Course ID
      * @param {string} lecturerId - Lecturer ID (for authorization)
      * @returns {Object} Course statistics
      */
     async getCourseStats(courseId, lecturerId) {
          try {
               const course = await Course.findById(courseId);
               if (!course || !course.isActive) {
                    throw new Error('Course not found');
               }

               // Verify lecturer owns the course
               if (course.lecturerId.toString() !== lecturerId) {
                    throw new Error('Unauthorized: You can only view statistics for your own courses');
               }

               const stats = {
                    courseId: course._id,
                    title: course.title,
                    capacity: course.capacity,
                    currentEnrollment: course.enrolledStudents.length,
                    availableSpots: course.capacity - course.enrolledStudents.length,
                    enrollmentPercentage: Math.round((course.enrolledStudents.length / course.capacity) * 100)
               };

               return {
                    success: true,
                    stats
               };
          } catch (error) {
               return {
                    success: false,
                    error: error.message
               };
          }
     }
}

module.exports = new CourseService();