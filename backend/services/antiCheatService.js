const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const Course = require('../models/Course');

/**
 * Anti-Cheating Service
 * Handles violation tracking, three-strike enforcement, and violation reporting
 */
class AntiCheatService {
     /**
      * Record a violation for an exam attempt
      * @param {string} attemptId - The exam attempt ID
      * @param {string} violationType - Type of violation (tab_switch, copy_attempt, etc.)
      * @param {string} details - Additional details about the violation
      * @returns {Promise<Object>} Violation recording result
      */
     static async recordViolation(attemptId, violationType, details = '') {
          try {
               const attempt = await ExamAttempt.findById(attemptId);

               if (!attempt) {
                    throw new Error('Exam attempt not found');
               }

               if (attempt.status !== 'in_progress') {
                    return {
                         success: false,
                         message: 'Cannot record violation for completed attempt',
                         violationCount: attempt.violationCount,
                         autoSubmitted: false
                    };
               }

               // Record the violation using the model method
               await attempt.recordViolation(violationType, details);

               // Get updated attempt to check if it was auto-submitted
               const updatedAttempt = await ExamAttempt.findById(attemptId);
               const wasAutoSubmitted = updatedAttempt.status === 'auto_submitted';

               return {
                    success: true,
                    message: 'Violation recorded successfully',
                    violationCount: updatedAttempt.violationCount,
                    warningLevel: Math.min(updatedAttempt.violationCount, 3),
                    autoSubmitted: wasAutoSubmitted,
                    violation: updatedAttempt.violations[updatedAttempt.violations.length - 1]
               };
          } catch (error) {
               throw new Error(`Failed to record violation: ${error.message}`);
          }
     }

     /**
      * Check if an attempt has reached the violation limit
      * @param {string} attemptId - The exam attempt ID
      * @returns {Promise<Object>} Violation limit check result
      */
     static async checkViolationLimit(attemptId) {
          try {
               const attempt = await ExamAttempt.findById(attemptId);

               if (!attempt) {
                    throw new Error('Exam attempt not found');
               }

               const hasReachedLimit = attempt.violationCount >= 3;
               const isAutoSubmitted = attempt.status === 'auto_submitted';

               return {
                    hasReachedLimit,
                    isAutoSubmitted,
                    violationCount: attempt.violationCount,
                    status: attempt.status
               };
          } catch (error) {
               throw new Error(`Failed to check violation limit: ${error.message}`);
          }
     }

     /**
      * Get violation report for a specific exam attempt
      * @param {string} attemptId - The exam attempt ID
      * @returns {Promise<Object>} Detailed violation report
      */
     static async getViolationReport(attemptId) {
          try {
               const attempt = await ExamAttempt.findById(attemptId)
                    .populate('examId', 'title duration')
                    .populate('studentId', 'name email')
                    .populate({
                         path: 'examId',
                         populate: {
                              path: 'courseId',
                              select: 'title'
                         }
                    });

               if (!attempt) {
                    throw new Error('Exam attempt not found');
               }

               const violationSummary = attempt.getViolationSummary();

               return {
                    attemptId: attempt._id,
                    student: {
                         id: attempt.studentId._id,
                         name: attempt.studentId.name,
                         email: attempt.studentId.email
                    },
                    exam: {
                         id: attempt.examId._id,
                         title: attempt.examId.title,
                         course: attempt.examId.courseId.title,
                         duration: attempt.examId.duration
                    },
                    attempt: {
                         startTime: attempt.startTime,
                         endTime: attempt.endTime,
                         status: attempt.status,
                         submittedAt: attempt.submittedAt
                    },
                    violations: {
                         total: violationSummary.total,
                         byType: violationSummary.byType,
                         details: attempt.violations.map(v => ({
                              id: v._id,
                              type: v.type,
                              timestamp: v.timestamp,
                              details: v.details
                         }))
                    },
                    autoSubmitted: attempt.status === 'auto_submitted'
               };
          } catch (error) {
               throw new Error(`Failed to get violation report: ${error.message}`);
          }
     }

     /**
      * Get violation analytics for an exam (lecturer view)
      * @param {string} examId - The exam ID
      * @returns {Promise<Object>} Violation analytics for the exam
      */
     static async getExamViolationAnalytics(examId) {
          try {
               const exam = await Exam.findById(examId).populate('courseId', 'title');

               if (!exam) {
                    throw new Error('Exam not found');
               }

               const attempts = await ExamAttempt.find({ examId })
                    .populate('studentId', 'name email');

               const analytics = {
                    exam: {
                         id: exam._id,
                         title: exam.title,
                         course: exam.courseId.title
                    },
                    totalAttempts: attempts.length,
                    attemptsWithViolations: 0,
                    autoSubmittedAttempts: 0,
                    violationsByType: {},
                    violationTimeline: [],
                    studentViolations: []
               };

               attempts.forEach(attempt => {
                    if (attempt.violationCount > 0) {
                         analytics.attemptsWithViolations++;
                    }

                    if (attempt.status === 'auto_submitted') {
                         analytics.autoSubmittedAttempts++;
                    }

                    const studentViolation = {
                         student: {
                              id: attempt.studentId._id,
                              name: attempt.studentId.name,
                              email: attempt.studentId.email
                         },
                         violationCount: attempt.violationCount,
                         violations: attempt.violations,
                         autoSubmitted: attempt.status === 'auto_submitted'
                    };

                    analytics.studentViolations.push(studentViolation);

                    // Count violations by type
                    attempt.violations.forEach(violation => {
                         analytics.violationsByType[violation.type] =
                              (analytics.violationsByType[violation.type] || 0) + 1;

                         analytics.violationTimeline.push({
                              timestamp: violation.timestamp,
                              type: violation.type,
                              student: attempt.studentId.name,
                              details: violation.details
                         });
                    });
               });

               // Sort timeline by timestamp
               analytics.violationTimeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

               return analytics;
          } catch (error) {
               throw new Error(`Failed to get exam violation analytics: ${error.message}`);
          }
     }

     /**
      * Get violation history for a student across all exams
      * @param {string} studentId - The student ID
      * @returns {Promise<Object>} Student's violation history
      */
     static async getStudentViolationHistory(studentId) {
          try {
               const attempts = await ExamAttempt.find({
                    studentId,
                    violationCount: { $gt: 0 }
               })
                    .populate('examId', 'title')
                    .populate({
                         path: 'examId',
                         populate: {
                              path: 'courseId',
                              select: 'title'
                         }
                    })
                    .sort({ startTime: -1 });

               const history = {
                    studentId,
                    totalViolations: 0,
                    autoSubmittedExams: 0,
                    violationsByType: {},
                    examHistory: []
               };

               attempts.forEach(attempt => {
                    history.totalViolations += attempt.violationCount;

                    if (attempt.status === 'auto_submitted') {
                         history.autoSubmittedExams++;
                    }

                    const examRecord = {
                         exam: {
                              id: attempt.examId._id,
                              title: attempt.examId.title,
                              course: attempt.examId.courseId.title
                         },
                         attempt: {
                              id: attempt._id,
                              startTime: attempt.startTime,
                              status: attempt.status,
                              violationCount: attempt.violationCount
                         },
                         violations: attempt.violations.map(v => ({
                              type: v.type,
                              timestamp: v.timestamp,
                              details: v.details
                         }))
                    };

                    history.examHistory.push(examRecord);

                    // Count violations by type
                    attempt.violations.forEach(violation => {
                         history.violationsByType[violation.type] =
                              (history.violationsByType[violation.type] || 0) + 1;
                    });
               });

               return history;
          } catch (error) {
               throw new Error(`Failed to get student violation history: ${error.message}`);
          }
     }

     /**
      * Get system-wide violation statistics (admin view)
      * @returns {Promise<Object>} System-wide violation statistics
      */
     static async getSystemViolationStats() {
          try {
               const totalAttempts = await ExamAttempt.countDocuments();
               const attemptsWithViolations = await ExamAttempt.countDocuments({
                    violationCount: { $gt: 0 }
               });
               const autoSubmittedAttempts = await ExamAttempt.countDocuments({
                    status: 'auto_submitted'
               });

               // Get violation type distribution
               const violationPipeline = [
                    { $match: { violationCount: { $gt: 0 } } },
                    { $unwind: '$violations' },
                    {
                         $group: {
                              _id: '$violations.type',
                              count: { $sum: 1 }
                         }
                    },
                    { $sort: { count: -1 } }
               ];

               const violationsByType = await ExamAttempt.aggregate(violationPipeline);

               // Get recent violations (last 24 hours)
               const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
               const recentViolations = await ExamAttempt.find({
                    'violations.timestamp': { $gte: yesterday }
               })
                    .populate('studentId', 'name email')
                    .populate('examId', 'title')
                    .select('violations studentId examId')
                    .sort({ 'violations.timestamp': -1 })
                    .limit(50);

               return {
                    overview: {
                         totalAttempts,
                         attemptsWithViolations,
                         autoSubmittedAttempts,
                         violationRate: totalAttempts > 0 ?
                              (attemptsWithViolations / totalAttempts * 100).toFixed(2) : 0,
                         autoSubmissionRate: totalAttempts > 0 ?
                              (autoSubmittedAttempts / totalAttempts * 100).toFixed(2) : 0
                    },
                    violationsByType: violationsByType.reduce((acc, item) => {
                         acc[item._id] = item.count;
                         return acc;
                    }, {}),
                    recentViolations: recentViolations.flatMap(attempt =>
                         attempt.violations
                              .filter(v => v.timestamp >= yesterday)
                              .map(v => ({
                                   type: v.type,
                                   timestamp: v.timestamp,
                                   details: v.details,
                                   student: attempt.studentId.name,
                                   exam: attempt.examId.title
                              }))
                    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
               };
          } catch (error) {
               throw new Error(`Failed to get system violation stats: ${error.message}`);
          }
     }
}

module.exports = AntiCheatService;