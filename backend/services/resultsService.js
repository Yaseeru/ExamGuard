const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const Course = require('../models/Course');
const User = require('../models/User');

class ResultsService {
     /**
      * Get exam results for a specific student
      * @param {string} studentId - ID of the student
      * @param {string} examId - Optional exam ID filter
      * @returns {Array} Array of exam attempt results
      */
     async getStudentResults(studentId, examId = null) {
          try {
               let query = {
                    studentId,
                    status: { $in: ['submitted', 'auto_submitted', 'expired'] }
               };

               if (examId) {
                    query.examId = examId;
               }

               const attempts = await ExamAttempt.find(query)
                    .populate({
                         path: 'examId',
                         select: 'title duration totalPoints questions',
                         populate: {
                              path: 'courseId',
                              select: 'title'
                         }
                    })
                    .populate('studentId', 'name email')
                    .sort({ submittedAt: -1 });

               // Format results for student view
               const results = attempts
                    .filter(attempt => attempt.examId && attempt.examId.courseId) // Filter out attempts with deleted exams/courses
                    .map(attempt => {
                         const result = {
                              attemptId: attempt._id,
                              exam: {
                                   id: attempt.examId._id,
                                   title: attempt.examId.title,
                                   duration: attempt.examId.duration,
                                   totalPoints: attempt.examId.totalPoints,
                                   totalQuestions: attempt.examId.questions.length,
                                   course: attempt.examId.courseId.title
                              },
                              score: attempt.score,
                              totalQuestions: attempt.totalQuestions,
                              answeredQuestions: attempt.answers.length,
                              percentage: attempt.examId.totalPoints > 0 ?
                                   Math.round((attempt.score / attempt.examId.totalPoints) * 100) : 0,
                              status: attempt.status,
                              startTime: attempt.startTime,
                              endTime: attempt.endTime,
                              submittedAt: attempt.submittedAt,
                              duration: attempt.durationMinutes,
                              violationCount: attempt.violationCount,
                              violationSummary: attempt.getViolationSummary()
                         };

                         return result;
                    });

               return results;
          } catch (error) {
               throw error;
          }
     }

     /**
      * Get detailed results for a specific exam attempt (student view)
      * @param {string} attemptId - ID of the exam attempt
      * @param {string} studentId - ID of the student (for authorization)
      * @returns {Object} Detailed exam attempt result
      */
     async getStudentAttemptDetails(attemptId, studentId) {
          try {
               const attempt = await ExamAttempt.findById(attemptId)
                    .populate({
                         path: 'examId',
                         select: 'title duration totalPoints questions',
                         populate: {
                              path: 'courseId',
                              select: 'title'
                         }
                    })
                    .populate('studentId', 'name email');

               if (!attempt) {
                    throw new Error('Exam attempt not found');
               }

               // Verify student owns this attempt
               if (attempt.studentId._id.toString() !== studentId) {
                    throw new Error('Not authorized to access this attempt');
               }

               // Only show results for completed attempts
               if (!attempt.isCompleted) {
                    throw new Error('Exam attempt is not yet completed');
               }

               // Format detailed results with correct answers for learning purposes
               const questionsWithAnswers = attempt.examId.questions.map(question => {
                    const studentAnswer = attempt.answers.find(
                         a => a.questionId.toString() === question._id.toString()
                    );

                    return {
                         _id: question._id,
                         questionText: question.questionText,
                         options: question.options,
                         correctAnswer: question.correctAnswer,
                         points: question.points || 1,
                         studentAnswer: studentAnswer ? studentAnswer.selectedOption : null,
                         isCorrect: studentAnswer ? studentAnswer.selectedOption === question.correctAnswer : false
                    };
               });

               const result = {
                    attemptId: attempt._id,
                    exam: {
                         id: attempt.examId._id,
                         title: attempt.examId.title,
                         duration: attempt.examId.duration,
                         totalPoints: attempt.examId.totalPoints,
                         totalQuestions: attempt.examId.questions.length,
                         course: attempt.examId.courseId.title,
                         questions: questionsWithAnswers
                    },
                    score: attempt.score,
                    totalQuestions: attempt.totalQuestions,
                    answeredQuestions: attempt.answers.length,
                    percentage: attempt.examId.totalPoints > 0 ?
                         Math.round((attempt.score / attempt.examId.totalPoints) * 100) : 0,
                    status: attempt.status,
                    startTime: attempt.startTime,
                    endTime: attempt.endTime,
                    submittedAt: attempt.submittedAt,
                    duration: attempt.durationMinutes,
                    violationCount: attempt.violationCount,
                    violationSummary: attempt.getViolationSummary(),
                    answers: attempt.answers.map(answer => ({
                         questionId: answer.questionId,
                         selectedOption: answer.selectedOption,
                         answeredAt: answer.answeredAt
                    })),
                    violations: attempt.violations
               };

               return result;
          } catch (error) {
               throw error;
          }
     }

     /**
      * Get exam results for all students in a lecturer's exam
      * @param {string} examId - ID of the exam
      * @param {string} lecturerId - ID of the lecturer (for authorization)
      * @returns {Object} Exam results with statistics
      */
     async getExamResults(examId, lecturerId) {
          try {
               const exam = await Exam.findById(examId).populate('courseId');

               if (!exam || !exam.isActive) {
                    throw new Error('Exam not found');
               }

               // Verify lecturer owns the course
               if (exam.courseId.lecturerId.toString() !== lecturerId.toString()) {
                    throw new Error('Not authorized to access this exam');
               }

               const attempts = await ExamAttempt.find({
                    examId,
                    status: { $in: ['submitted', 'auto_submitted', 'expired'] }
               })
                    .populate('studentId', 'name email')
                    .sort({ submittedAt: -1 });

               // Calculate statistics
               const scores = attempts.map(a => a.score || 0);
               const statistics = {
                    totalAttempts: attempts.length,
                    averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
                    highestScore: scores.length > 0 ? Math.max(...scores) : 0,
                    lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
                    averagePercentage: exam.totalPoints > 0 && scores.length > 0 ?
                         (scores.reduce((a, b) => a + b, 0) / scores.length / exam.totalPoints) * 100 : 0,
                    passRate: scores.length > 0 ?
                         (scores.filter(s => (s / exam.totalPoints) >= 0.6).length / scores.length) * 100 : 0,
                    totalViolations: attempts.reduce((total, attempt) => total + attempt.violationCount, 0),
                    autoSubmittedCount: attempts.filter(a => a.status === 'auto_submitted').length
               };

               // Format results for lecturer view
               const results = attempts.map(attempt => ({
                    attemptId: attempt._id,
                    student: {
                         id: attempt.studentId._id,
                         name: attempt.studentId.name,
                         email: attempt.studentId.email
                    },
                    score: attempt.score,
                    totalQuestions: attempt.totalQuestions,
                    answeredQuestions: attempt.answers.length,
                    percentage: exam.totalPoints > 0 ?
                         Math.round((attempt.score / exam.totalPoints) * 100) : 0,
                    status: attempt.status,
                    startTime: attempt.startTime,
                    endTime: attempt.endTime,
                    submittedAt: attempt.submittedAt,
                    duration: attempt.durationMinutes,
                    violationCount: attempt.violationCount,
                    violationSummary: attempt.getViolationSummary()
               }));

               return {
                    exam: {
                         id: exam._id,
                         title: exam.title,
                         duration: exam.duration,
                         totalPoints: exam.totalPoints,
                         totalQuestions: exam.questions.length,
                         course: exam.courseId.title
                    },
                    statistics,
                    results
               };
          } catch (error) {
               throw error;
          }
     }

     /**
      * Get detailed results for a specific exam attempt (lecturer view)
      * @param {string} attemptId - ID of the exam attempt
      * @param {string} lecturerId - ID of the lecturer (for authorization)
      * @returns {Object} Detailed exam attempt result with correct answers
      */
     async getLecturerAttemptDetails(attemptId, lecturerId) {
          try {
               const attempt = await ExamAttempt.findById(attemptId)
                    .populate({
                         path: 'examId',
                         populate: {
                              path: 'courseId',
                              select: 'title lecturerId'
                         }
                    })
                    .populate('studentId', 'name email');

               if (!attempt) {
                    throw new Error('Exam attempt not found');
               }

               // Verify lecturer owns the course
               if (attempt.examId.courseId.lecturerId.toString() !== lecturerId) {
                    throw new Error('Not authorized to access this attempt');
               }

               // Only show results for completed attempts
               if (!attempt.isCompleted) {
                    throw new Error('Exam attempt is not yet completed');
               }

               // Format detailed results with correct answers for lecturer
               const questionsWithAnswers = attempt.examId.questions.map(question => {
                    const studentAnswer = attempt.answers.find(
                         a => a.questionId.toString() === question._id.toString()
                    );

                    return {
                         questionId: question._id,
                         questionText: question.questionText,
                         options: question.options,
                         correctAnswer: question.correctAnswer,
                         points: question.points || 1,
                         studentAnswer: studentAnswer ? {
                              selectedOption: studentAnswer.selectedOption,
                              answeredAt: studentAnswer.answeredAt,
                              isCorrect: studentAnswer.selectedOption === question.correctAnswer
                         } : null
                    };
               });

               const result = {
                    attemptId: attempt._id,
                    student: {
                         id: attempt.studentId._id,
                         name: attempt.studentId.name,
                         email: attempt.studentId.email
                    },
                    exam: {
                         id: attempt.examId._id,
                         title: attempt.examId.title,
                         duration: attempt.examId.duration,
                         totalPoints: attempt.examId.totalPoints,
                         totalQuestions: attempt.examId.questions.length,
                         course: attempt.examId.courseId.title
                    },
                    score: attempt.score,
                    totalQuestions: attempt.totalQuestions,
                    answeredQuestions: attempt.answers.length,
                    percentage: attempt.examId.totalPoints > 0 ?
                         Math.round((attempt.score / attempt.examId.totalPoints) * 100) : 0,
                    status: attempt.status,
                    startTime: attempt.startTime,
                    endTime: attempt.endTime,
                    submittedAt: attempt.submittedAt,
                    duration: attempt.durationMinutes,
                    violationCount: attempt.violationCount,
                    violationSummary: attempt.getViolationSummary(),
                    violations: attempt.violations,
                    questionsWithAnswers
               };

               return result;
          } catch (error) {
               throw error;
          }
     }

     /**
      * Get results summary for all exams in lecturer's courses
      * @param {string} lecturerId - ID of the lecturer
      * @returns {Array} Array of exam results summaries
      */
     async getLecturerResultsSummary(lecturerId) {
          try {
               // Get all courses owned by the lecturer
               const courses = await Course.find({
                    lecturerId,
                    isActive: true
               }).select('_id title');

               // Get all exams for these courses
               const exams = await Exam.find({
                    courseId: { $in: courses.map(c => c._id) },
                    isActive: true
               }).populate('courseId', 'title');

               // Get results summary for each exam
               const examSummaries = await Promise.all(
                    exams.map(async (exam) => {
                         const attempts = await ExamAttempt.find({
                              examId: exam._id,
                              status: { $in: ['submitted', 'auto_submitted', 'expired'] }
                         });

                         const scores = attempts.map(a => a.score || 0);

                         return {
                              examId: exam._id,
                              examTitle: exam.title,
                              course: exam.courseId.title,
                              totalPoints: exam.totalPoints,
                              totalQuestions: exam.questions.length,
                              totalAttempts: attempts.length,
                              averageScore: scores.length > 0 ?
                                   scores.reduce((a, b) => a + b, 0) / scores.length : 0,
                              averagePercentage: exam.totalPoints > 0 && scores.length > 0 ?
                                   (scores.reduce((a, b) => a + b, 0) / scores.length / exam.totalPoints) * 100 : 0,
                              highestScore: scores.length > 0 ? Math.max(...scores) : 0,
                              lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
                              totalViolations: attempts.reduce((total, attempt) => total + attempt.violationCount, 0),
                              autoSubmittedCount: attempts.filter(a => a.status === 'auto_submitted').length
                         };
                    })
               );

               return examSummaries;
          } catch (error) {
               throw error;
          }
     }
}

module.exports = new ResultsService();