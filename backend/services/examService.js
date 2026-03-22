const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const Course = require('../models/Course');

class ExamService {
     /**
      * Create a new exam with validation
      * @param {Object} examData - Exam data
      * @param {string} lecturerId - ID of the lecturer creating the exam
      * @returns {Object} Created exam
      */
     async createExam(examData, lecturerId) {
          try {
               const { title, courseId, duration, startTime, endTime, questions } = examData;

               // Verify lecturer owns the course
               const course = await Course.findById(courseId);
               if (!course || course.lecturerId.toString() !== lecturerId) {
                    throw new Error('Not authorized to create exams for this course');
               }

               // Validate questions
               if (!Array.isArray(questions) || questions.length === 0) {
                    throw new Error('Exam must have at least one question');
               }

               // Validate each question
               for (const question of questions) {
                    if (!question.questionText || !Array.isArray(question.options) || question.options.length !== 4) {
                         throw new Error('Each question must have text and exactly 4 options');
                    }
                    if (question.correctAnswer < 0 || question.correctAnswer > 3) {
                         throw new Error('Correct answer must be between 0 and 3');
                    }
               }

               const exam = new Exam({
                    title,
                    courseId,
                    duration,
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    questions
               });

               await exam.save();
               return await Exam.findById(exam._id).populate('courseId', 'title lecturerId');
          } catch (error) {
               throw error;
          }
     }

     /**
      * Update an existing exam
      * @param {string} examId - ID of the exam to update
      * @param {Object} updateData - Data to update
      * @param {string} lecturerId - ID of the lecturer updating the exam
      * @returns {Object} Updated exam
      */
     async updateExam(examId, updateData, lecturerId) {
          try {
               const exam = await Exam.findById(examId).populate('courseId');

               if (!exam || !exam.isActive) {
                    throw new Error('Exam not found');
               }

               // Verify lecturer owns the course
               if (exam.courseId.lecturerId.toString() !== lecturerId) {
                    throw new Error('Not authorized to update this exam');
               }

               // Check if exam has attempts - prevent modification if it does
               const existingAttempts = await ExamAttempt.find({ examId });
               if (existingAttempts.length > 0) {
                    throw new Error('Cannot modify exam with existing attempts');
               }

               // Update fields
               const { title, duration, startTime, endTime, questions } = updateData;
               if (title) exam.title = title;
               if (duration) exam.duration = duration;
               if (startTime) exam.startTime = new Date(startTime);
               if (endTime) exam.endTime = new Date(endTime);
               if (questions) {
                    // Validate questions
                    for (const question of questions) {
                         if (!question.questionText || !Array.isArray(question.options) || question.options.length !== 4) {
                              throw new Error('Each question must have text and exactly 4 options');
                         }
                         if (question.correctAnswer < 0 || question.correctAnswer > 3) {
                              throw new Error('Correct answer must be between 0 and 3');
                         }
                    }
                    exam.questions = questions;
               }

               await exam.save();
               return await Exam.findById(exam._id).populate('courseId', 'title lecturerId');
          } catch (error) {
               throw error;
          }
     }

     /**
      * Delete an exam (soft delete)
      * @param {string} examId - ID of the exam to delete
      * @param {string} lecturerId - ID of the lecturer deleting the exam
      * @returns {boolean} Success status
      */
     async deleteExam(examId, lecturerId) {
          try {
               const exam = await Exam.findById(examId).populate('courseId');

               if (!exam || !exam.isActive) {
                    throw new Error('Exam not found');
               }

               // Verify lecturer owns the course
               if (exam.courseId.lecturerId.toString() !== lecturerId) {
                    throw new Error('Not authorized to delete this exam');
               }

               // Check if exam has attempts - prevent deletion if it does
               const existingAttempts = await ExamAttempt.find({ examId });
               if (existingAttempts.length > 0) {
                    throw new Error('Cannot delete exam with existing attempts');
               }

               // Soft delete
               exam.isActive = false;
               await exam.save();

               return true;
          } catch (error) {
               throw error;
          }
     }

     /**
      * Get exams for a student (enrolled courses only)
      * @param {string} studentId - ID of the student
      * @param {string} courseId - Optional course ID filter
      * @returns {Array} Array of exams with attempt status
      */
     async getExamsForStudent(studentId, courseId = null) {
          try {
               let query = { isActive: true };

               if (courseId) {
                    const course = await Course.findById(courseId);
                    if (!course || !course.enrolledStudents.includes(studentId)) {
                         throw new Error('Not enrolled in this course');
                    }
                    query.courseId = courseId;
               } else {
                    // Get all courses student is enrolled in
                    const enrolledCourses = await Course.find({
                         enrolledStudents: studentId,
                         isActive: true
                    }).select('_id');

                    query.courseId = { $in: enrolledCourses.map(c => c._id) };
               }

               const exams = await Exam.find(query)
                    .populate('courseId', 'title lecturerId')
                    .sort({ startTime: 1 });

               // Add attempt status for each exam
               const examsWithAttempts = await Promise.all(
                    exams.map(async (exam) => {
                         const attempt = await ExamAttempt.findOne({
                              examId: exam._id,
                              studentId
                         });

                         return {
                              ...exam.toObject(),
                              hasAttempt: !!attempt,
                              attemptStatus: attempt?.status || null,
                              isAvailable: exam.isAvailable && !attempt
                         };
                    })
               );

               return examsWithAttempts;
          } catch (error) {
               throw error;
          }
     }

     /**
      * Get exams for a lecturer (owned courses only)
      * @param {string} lecturerId - ID of the lecturer
      * @param {string} courseId - Optional course ID filter
      * @returns {Array} Array of exams
      */
     async getExamsForLecturer(lecturerId, courseId = null) {
          try {
               let query = { isActive: true };

               if (courseId) {
                    const course = await Course.findById(courseId);
                    if (!course || course.lecturerId.toString() !== lecturerId) {
                         throw new Error('Not authorized to access this course');
                    }
                    query.courseId = courseId;
               } else {
                    // Get all courses lecturer owns
                    const ownedCourses = await Course.find({
                         lecturerId,
                         isActive: true
                    }).select('_id');

                    query.courseId = { $in: ownedCourses.map(c => c._id) };
               }

               const exams = await Exam.find(query)
                    .populate('courseId', 'title lecturerId')
                    .sort({ startTime: 1 });

               return exams;
          } catch (error) {
               throw error;
          }
     }

     /**
      * Start a new exam attempt
      * @param {string} examId - ID of the exam
      * @param {string} studentId - ID of the student
      * @returns {Object} Created exam attempt
      */
     async startExamAttempt(examId, studentId) {
          try {
               // Check if exam exists and is available
               const exam = await Exam.findById(examId).populate('courseId');
               if (!exam || !exam.isActive) {
                    throw new Error('Exam not found');
               }

               // Check if student is enrolled in the course
               if (!exam.courseId.enrolledStudents.includes(studentId)) {
                    throw new Error('Not enrolled in this course');
               }

               // Check if exam is currently available
               if (!exam.isAvailable) {
                    throw new Error('Exam is not currently available');
               }

               // Check if student already has an attempt for this exam
               const existingAttempt = await ExamAttempt.findOne({
                    examId,
                    studentId
               });

               if (existingAttempt) {
                    throw new Error('Student already has an attempt for this exam');
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

               return await ExamAttempt.findById(attempt._id)
                    .populate('examId', 'title duration questions')
                    .populate('studentId', 'name email');
          } catch (error) {
               throw error;
          }
     }

     /**
      * Calculate and update exam score
      * @param {string} attemptId - ID of the exam attempt
      * @returns {Object} Score calculation result
      */
     async calculateExamScore(attemptId) {
          try {
               const attempt = await ExamAttempt.findById(attemptId);
               if (!attempt) {
                    throw new Error('Exam attempt not found');
               }

               const exam = await Exam.findById(attempt.examId);
               if (!exam) {
                    throw new Error('Exam not found');
               }

               const scoreResult = exam.calculateScore(attempt.answers);

               // Update attempt with calculated score
               attempt.score = scoreResult.score;
               await attempt.save();

               return scoreResult;
          } catch (error) {
               throw error;
          }
     }

     /**
      * Auto-submit exam when timer expires
      * @param {string} attemptId - ID of the exam attempt
      * @returns {Object} Submission result
      */
     async autoSubmitExam(attemptId) {
          try {
               const attempt = await ExamAttempt.findById(attemptId);
               if (!attempt) {
                    throw new Error('Exam attempt not found');
               }

               if (attempt.status !== 'in_progress') {
                    throw new Error('Exam attempt is not in progress');
               }

               await attempt.submit(true); // true = auto submission

               return {
                    success: true,
                    score: attempt.score,
                    totalQuestions: attempt.totalQuestions,
                    submittedAt: attempt.submittedAt
               };
          } catch (error) {
               throw error;
          }
     }

     /**
      * Get exam statistics for lecturer
      * @param {string} examId - ID of the exam
      * @param {string} lecturerId - ID of the lecturer
      * @returns {Object} Exam statistics
      */
     async getExamStatistics(examId, lecturerId) {
          try {
               const exam = await Exam.findById(examId).populate('courseId');
               if (!exam || !exam.isActive) {
                    throw new Error('Exam not found');
               }

               // Verify lecturer owns the course
               if (exam.courseId.lecturerId.toString() !== lecturerId) {
                    throw new Error('Not authorized to access this exam');
               }

               const attempts = await ExamAttempt.find({ examId })
                    .populate('studentId', 'name email');

               const completedAttempts = attempts.filter(a => a.isCompleted);
               const scores = completedAttempts.map(a => a.score || 0);

               const statistics = {
                    totalAttempts: attempts.length,
                    completedAttempts: completedAttempts.length,
                    inProgressAttempts: attempts.filter(a => a.status === 'in_progress').length,
                    autoSubmittedAttempts: attempts.filter(a => a.status === 'auto_submitted').length,
                    averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
                    highestScore: scores.length > 0 ? Math.max(...scores) : 0,
                    lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
                    totalViolations: attempts.reduce((total, attempt) => total + attempt.violationCount, 0)
               };

               return {
                    exam,
                    attempts,
                    statistics
               };
          } catch (error) {
               throw error;
          }
     }
}

module.exports = new ExamService();