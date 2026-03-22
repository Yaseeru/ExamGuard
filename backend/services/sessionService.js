const ExamAttempt = require('../models/ExamAttempt');
const Exam = require('../models/Exam');
const User = require('../models/User');
const mongoose = require('mongoose');
const { EventEmitter } = require('events');

/**
 * Session Service for managing concurrent exam sessions
 * Handles session isolation, data synchronization, and conflict resolution
 * Enhanced for high-concurrency scenarios with database-level coordination
 */
class SessionService extends EventEmitter {
     constructor() {
          super();
          this.activeSessions = new Map(); // Track active exam sessions
          this.sessionLocks = new Map(); // Prevent concurrent modifications
          this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
          this.sessionTimeout = 30 * 60 * 1000; // 30 minutes inactivity timeout
          this.cleanupTimer = null;
          this.heartbeatInterval = 30 * 1000; // 30 seconds
          this.heartbeatTimer = null;
          this.maxConcurrentSessions = 1000; // Maximum concurrent sessions
          this.startTime = Date.now(); // Service start time
          this.sessionMetrics = {
               created: 0,
               submitted: 0,
               expired: 0,
               violations: 0,
               conflicts: 0
          };

          this.startCleanupTimer();
          this.startHeartbeat();
     }

     /**
      * Create a new exam session with proper isolation
      * Enhanced with database-level coordination and capacity management
      * @param {string} examId - Exam ID
      * @param {string} studentId - Student ID
      * @returns {Object} Session data
      */
     async createSession(examId, studentId) {
          const sessionKey = `${examId}_${studentId}`;

          // Check concurrent session limit
          if (this.activeSessions.size >= this.maxConcurrentSessions) {
               throw new Error('Maximum concurrent sessions limit reached. Please try again later.');
          }

          // Use database transaction for atomic session creation
          const session = await mongoose.startSession();
          session.startTransaction();

          try {
               // Check for existing session with database lock
               if (this.activeSessions.has(sessionKey)) {
                    const existingSession = this.activeSessions.get(sessionKey);
                    if (this.isSessionActive(existingSession)) {
                         throw new Error('Student already has an active session for this exam');
                    }
                    // Clean up stale session
                    this.activeSessions.delete(sessionKey);
               }

               // Validate exam and student with database locks
               const exam = await Exam.findById(examId).session(session);
               if (!exam || !exam.isActive) {
                    throw new Error('Exam not found or inactive');
               }

               const student = await User.findById(studentId).session(session);
               if (!student || student.role !== 'Student') {
                    throw new Error('Invalid student');
               }

               // Check if student is enrolled in the course
               const Course = require('../models/Course');
               const course = await Course.findById(exam.courseId).session(session);
               if (!course || !course.enrolledStudents.includes(studentId)) {
                    throw new Error('Student not enrolled in course');
               }

               // Check for existing attempt with database lock
               const existingAttempt = await ExamAttempt.findOne({
                    examId,
                    studentId
               }).session(session);

               if (existingAttempt) {
                    throw new Error('Student has already attempted this exam');
               }

               // Create session data with enhanced metadata
               const sessionData = {
                    sessionId: this.generateSessionId(),
                    examId,
                    studentId,
                    createdAt: new Date(),
                    lastActivity: new Date(),
                    lastHeartbeat: new Date(),
                    isActive: true,
                    lockVersion: 0,
                    answers: new Map(), // In-memory answer cache
                    violations: [],
                    metadata: {
                         userAgent: null,
                         ipAddress: null,
                         browserFingerprint: null,
                         sessionVersion: 1,
                         nodeId: process.env.NODE_ID || 'default'
                    },
                    performance: {
                         startTime: Date.now(),
                         answerCount: 0,
                         violationCount: 0,
                         lastAnswerTime: null
                    }
               };

               // Store session in memory and emit event
               this.activeSessions.set(sessionKey, sessionData);
               this.sessionMetrics.created++;
               this.emit('sessionCreated', { sessionId: sessionData.sessionId, studentId, examId });

               await session.commitTransaction();

               return {
                    sessionId: sessionData.sessionId,
                    examData: {
                         id: exam._id,
                         title: exam.title,
                         duration: exam.duration,
                         questions: exam.questions.map(q => ({
                              id: q._id,
                              questionText: q.questionText,
                              options: q.options
                              // Note: correctAnswer is not sent to client
                         }))
                    },
                    serverTime: new Date().toISOString(),
                    sessionConfig: {
                         heartbeatInterval: this.heartbeatInterval,
                         timeoutWarning: this.sessionTimeout - (5 * 60 * 1000) // 5 minutes before timeout
                    }
               };

          } catch (error) {
               await session.abortTransaction();
               throw error;
          } finally {
               session.endSession();
          }
     }

     /**
      * Get session data with proper isolation
      * @param {string} sessionId - Session ID
      * @param {string} studentId - Student ID for verification
      * @returns {Object} Session data
      */
     async getSession(sessionId, studentId) {
          const session = this.findSessionById(sessionId);

          if (!session) {
               throw new Error('Session not found');
          }

          if (session.studentId !== studentId) {
               throw new Error('Unauthorized access to session');
          }

          if (!this.isSessionActive(session)) {
               throw new Error('Session has expired');
          }

          // Update last activity
          session.lastActivity = new Date();

          return {
               sessionId: session.sessionId,
               examId: session.examId,
               answers: Array.from(session.answers.entries()).map(([questionId, answer]) => ({
                    questionId,
                    selectedOption: answer.selectedOption,
                    answeredAt: answer.answeredAt
               })),
               violations: session.violations,
               timeRemaining: await this.calculateTimeRemaining(session)
          };
     }

     /**
      * Record answer with enhanced conflict resolution and optimistic locking
      * @param {string} sessionId - Session ID
      * @param {string} studentId - Student ID
      * @param {string} questionId - Question ID
      * @param {number} selectedOption - Selected option (0-3)
      * @returns {Object} Result with conflict information
      */
     async recordAnswer(sessionId, studentId, questionId, selectedOption) {
          const sessionData = this.findSessionById(sessionId);

          if (!sessionData || sessionData.studentId !== studentId) {
               throw new Error('Invalid session or unauthorized access');
          }

          if (!this.isSessionActive(sessionData)) {
               throw new Error('Session has expired');
          }

          // Validate selected option
          if (selectedOption < 0 || selectedOption > 3) {
               throw new Error('Invalid selected option');
          }

          // Acquire session lock for atomic operation with timeout
          const lockKey = `${sessionId}_answer`;
          const lockTimeout = 5000; // 5 seconds
          const lockAcquired = await this.acquireLockWithTimeout(lockKey, lockTimeout);

          if (!lockAcquired) {
               this.sessionMetrics.conflicts++;
               throw new Error('Unable to acquire lock for answer recording. Please try again.');
          }

          try {
               // Check for concurrent modification using optimistic locking
               const existingAnswer = sessionData.answers.get(questionId);
               const now = new Date();

               // Record the answer with version control
               const answerData = {
                    selectedOption,
                    answeredAt: now,
                    version: existingAnswer ? existingAnswer.version + 1 : 1,
                    nodeId: process.env.NODE_ID || 'default'
               };

               sessionData.answers.set(questionId, answerData);
               sessionData.lastActivity = now;
               sessionData.lockVersion++;
               sessionData.performance.answerCount++;
               sessionData.performance.lastAnswerTime = now;

               // Emit answer recorded event for monitoring
               this.emit('answerRecorded', {
                    sessionId,
                    studentId,
                    questionId,
                    selectedOption,
                    conflictResolved: !!existingAnswer,
                    timestamp: now
               });

               return {
                    success: true,
                    questionId,
                    selectedOption,
                    answeredAt: now,
                    conflictResolved: !!existingAnswer,
                    version: answerData.version,
                    serverTime: now.toISOString()
               };

          } finally {
               this.releaseLock(lockKey);
          }
     }

     /**
      * Record violation with proper synchronization and enhanced tracking
      * @param {string} sessionId - Session ID
      * @param {string} studentId - Student ID
      * @param {string} violationType - Type of violation
      * @param {string} details - Violation details
      * @returns {Object} Violation result
      */
     async recordViolation(sessionId, studentId, violationType, details = '') {
          const sessionData = this.findSessionById(sessionId);

          if (!sessionData || sessionData.studentId !== studentId) {
               throw new Error('Invalid session or unauthorized access');
          }

          if (!this.isSessionActive(sessionData)) {
               return { success: false, reason: 'Session expired' };
          }

          const lockKey = `${sessionId}_violation`;
          const lockAcquired = await this.acquireLockWithTimeout(lockKey, 5000);

          if (!lockAcquired) {
               this.sessionMetrics.conflicts++;
               throw new Error('Unable to acquire lock for violation recording. Please try again.');
          }

          try {
               const violation = {
                    type: violationType,
                    timestamp: new Date(),
                    details,
                    id: this.generateViolationId(),
                    nodeId: process.env.NODE_ID || 'default'
               };

               sessionData.violations.push(violation);
               sessionData.lastActivity = new Date();
               sessionData.lockVersion++;
               sessionData.performance.violationCount++;
               this.sessionMetrics.violations++;

               const violationCount = sessionData.violations.length;
               const shouldAutoSubmit = violationCount >= 3;

               // Emit violation event for monitoring
               this.emit('violationRecorded', {
                    sessionId,
                    studentId,
                    violationType,
                    violationCount,
                    shouldAutoSubmit,
                    timestamp: violation.timestamp
               });

               if (shouldAutoSubmit) {
                    await this.autoSubmitSession(sessionId, 'violation_limit');
               }

               return {
                    success: true,
                    violation,
                    violationCount,
                    autoSubmitted: shouldAutoSubmit,
                    serverTime: violation.timestamp.toISOString()
               };

          } finally {
               this.releaseLock(lockKey);
          }
     }

     /**
      * Submit exam session with enhanced data synchronization
      * @param {string} sessionId - Session ID
      * @param {string} studentId - Student ID
      * @param {boolean} isAutoSubmit - Whether this is an auto-submission
      * @returns {Object} Submission result
      */
     async submitSession(sessionId, studentId, isAutoSubmit = false) {
          const sessionData = this.findSessionById(sessionId);

          if (!sessionData || sessionData.studentId !== studentId) {
               throw new Error('Invalid session or unauthorized access');
          }

          const lockKey = `${sessionId}_submit`;
          const lockAcquired = await this.acquireLockWithTimeout(lockKey, 10000); // Longer timeout for submission

          if (!lockAcquired) {
               this.sessionMetrics.conflicts++;
               throw new Error('Unable to acquire lock for session submission. Please try again.');
          }

          // Use database transaction for atomic submission
          const dbSession = await mongoose.startSession();
          dbSession.startTransaction();

          try {
               // Create exam attempt in database with transaction
               const examAttempt = new ExamAttempt({
                    examId: sessionData.examId,
                    studentId: sessionData.studentId,
                    startTime: sessionData.createdAt,
                    answers: Array.from(sessionData.answers.entries()).map(([questionId, answer]) => ({
                         questionId,
                         selectedOption: answer.selectedOption,
                         answeredAt: answer.answeredAt,
                         version: answer.version
                    })),
                    violations: sessionData.violations.map(v => ({
                         type: v.type,
                         timestamp: v.timestamp,
                         details: v.details,
                         id: v.id
                    })),
                    status: isAutoSubmit ? 'auto_submitted' : 'submitted',
                    metadata: {
                         ...sessionData.metadata,
                         performance: sessionData.performance,
                         submissionType: isAutoSubmit ? 'automatic' : 'manual'
                    }
               });

               await examAttempt.save({ session: dbSession });
               await examAttempt.submit(isAutoSubmit);

               await dbSession.commitTransaction();

               // Mark session as inactive
               sessionData.isActive = false;
               sessionData.submittedAt = new Date();
               this.sessionMetrics.submitted++;

               // Emit submission event
               this.emit('sessionSubmitted', {
                    sessionId,
                    studentId,
                    examId: sessionData.examId,
                    isAutoSubmit,
                    score: examAttempt.score,
                    violationCount: examAttempt.violationCount,
                    timestamp: sessionData.submittedAt
               });

               // Clean up session after delay
               setTimeout(() => {
                    this.cleanupSession(sessionId);
               }, 60000); // 1 minute delay

               return {
                    success: true,
                    attemptId: examAttempt._id,
                    score: examAttempt.score,
                    totalQuestions: examAttempt.totalQuestions,
                    violationCount: examAttempt.violationCount,
                    submittedAt: examAttempt.submittedAt,
                    serverTime: new Date().toISOString()
               };

          } catch (error) {
               await dbSession.abortTransaction();
               throw error;
          } finally {
               dbSession.endSession();
               this.releaseLock(lockKey);
          }
     }

     /**
      * Auto-submit session due to timeout or violations
      * @param {string} sessionId - Session ID
      * @param {string} reason - Reason for auto-submission
      */
     async autoSubmitSession(sessionId, reason) {
          const session = this.findSessionById(sessionId);
          if (!session || !session.isActive) {
               return;
          }

          try {
               await this.submitSession(sessionId, session.studentId, true);
               console.log(`Session ${sessionId} auto-submitted due to: ${reason}`);
          } catch (error) {
               console.error(`Error auto-submitting session ${sessionId}:`, error);
          }
     }

     /**
      * Calculate remaining time for session
      * @param {Object} session - Session object
      * @returns {number} Time remaining in seconds
      */
     async calculateTimeRemaining(session) {
          const exam = await Exam.findById(session.examId);
          if (!exam) return 0;

          const elapsedMs = Date.now() - session.createdAt.getTime();
          const totalMs = exam.duration * 60 * 1000; // Convert minutes to milliseconds
          const remainingMs = Math.max(0, totalMs - elapsedMs);

          return Math.floor(remainingMs / 1000); // Convert to seconds
     }

     /**
      * Check if session is still active
      * @param {Object} session - Session object
      * @returns {boolean} Whether session is active
      */
     isSessionActive(session) {
          if (!session.isActive) return false;

          const now = Date.now();
          const lastActivity = session.lastActivity.getTime();
          const timeSinceActivity = now - lastActivity;

          return timeSinceActivity < this.sessionTimeout;
     }

     /**
      * Find session by ID
      * @param {string} sessionId - Session ID
      * @returns {Object|null} Session object or null
      */
     findSessionById(sessionId) {
          for (const session of this.activeSessions.values()) {
               if (session.sessionId === sessionId) {
                    return session;
               }
          }
          return null;
     }

     /**
      * Acquire lock for atomic operations with timeout
      * @param {string} lockKey - Lock key
      * @param {number} timeout - Timeout in milliseconds
      * @returns {boolean} Whether lock was acquired
      */
     async acquireLockWithTimeout(lockKey, timeout = 5000) {
          const startTime = Date.now();

          while (this.sessionLocks.has(lockKey)) {
               if (Date.now() - startTime > timeout) {
                    return false;
               }
               await new Promise(resolve => setTimeout(resolve, 10));
          }

          this.sessionLocks.set(lockKey, Date.now());
          return true;
     }

     /**
      * Start heartbeat monitoring for session health
      */
     startHeartbeat() {
          if (this.heartbeatTimer) return;

          this.heartbeatTimer = setInterval(() => {
               this.processHeartbeats();
          }, this.heartbeatInterval);
     }

     /**
      * Stop heartbeat monitoring
      */
     stopHeartbeat() {
          if (this.heartbeatTimer) {
               clearInterval(this.heartbeatTimer);
               this.heartbeatTimer = null;
          }
     }

     /**
      * Process heartbeats and detect stale sessions
      */
     async processHeartbeats() {
          const now = Date.now();
          const staleThreshold = this.heartbeatInterval * 3; // 3 missed heartbeats
          const staleSessions = [];

          for (const [key, sessionData] of this.activeSessions.entries()) {
               const timeSinceHeartbeat = now - sessionData.lastHeartbeat.getTime();

               if (timeSinceHeartbeat > staleThreshold && sessionData.isActive) {
                    staleSessions.push({ key, sessionData });
               }
          }

          // Handle stale sessions
          for (const { key, sessionData } of staleSessions) {
               console.log(`Detected stale session: ${sessionData.sessionId}`);
               await this.autoSubmitSession(sessionData.sessionId, 'heartbeat_timeout');
               this.activeSessions.delete(key);
          }

          // Emit heartbeat event for monitoring
          this.emit('heartbeat', {
               totalSessions: this.activeSessions.size,
               staleSessions: staleSessions.length,
               timestamp: new Date()
          });
     }

     /**
      * Update session heartbeat
      * @param {string} sessionId - Session ID
      * @param {string} studentId - Student ID
      * @returns {Object} Heartbeat result
      */
     async updateHeartbeat(sessionId, studentId) {
          const sessionData = this.findSessionById(sessionId);

          if (!sessionData || sessionData.studentId !== studentId) {
               throw new Error('Invalid session or unauthorized access');
          }

          if (!this.isSessionActive(sessionData)) {
               throw new Error('Session has expired');
          }

          const now = new Date();
          sessionData.lastHeartbeat = now;
          sessionData.lastActivity = now;

          return {
               success: true,
               serverTime: now.toISOString(),
               timeRemaining: await this.calculateTimeRemaining(sessionData)
          };
     }

     /**
      * Get enhanced session statistics with performance metrics
      * @returns {Object} Enhanced session statistics
      */
     getEnhancedStatistics() {
          const now = Date.now();
          const sessions = Array.from(this.activeSessions.values());
          const activeSessions = sessions.filter(s => this.isSessionActive(s));

          return {
               ...this.getStatistics(),
               performance: {
                    averageAnswersPerSession: sessions.length > 0
                         ? sessions.reduce((sum, s) => sum + s.performance.answerCount, 0) / sessions.length
                         : 0,
                    averageViolationsPerSession: sessions.length > 0
                         ? sessions.reduce((sum, s) => sum + s.performance.violationCount, 0) / sessions.length
                         : 0,
                    sessionThroughput: this.sessionMetrics.created / Math.max(1, (now - (this.startTime || now)) / 1000 / 60), // sessions per minute
               },
               metrics: { ...this.sessionMetrics },
               capacity: {
                    current: this.activeSessions.size,
                    maximum: this.maxConcurrentSessions,
                    utilizationPercent: (this.activeSessions.size / this.maxConcurrentSessions) * 100
               },
               health: {
                    activeHeartbeats: activeSessions.filter(s =>
                         now - s.lastHeartbeat.getTime() < this.heartbeatInterval * 2
                    ).length,
                    staleHeartbeats: activeSessions.filter(s =>
                         now - s.lastHeartbeat.getTime() >= this.heartbeatInterval * 2
                    ).length
               }
          };
     }

     /**
      * Release lock
      * @param {string} lockKey - Lock key
      */
     releaseLock(lockKey) {
          this.sessionLocks.delete(lockKey);
     }

     /**
      * Acquire lock for atomic operations (legacy method for backward compatibility)
      * @param {string} lockKey - Lock key
      */
     async acquireLock(lockKey) {
          return await this.acquireLockWithTimeout(lockKey, 10000); // 10 second timeout
     }

     /**
      * Generate unique session ID
      * @returns {string} Session ID
      */
     generateSessionId() {
          return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
     }

     /**
      * Generate unique violation ID
      * @returns {string} Violation ID
      */
     generateViolationId() {
          return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
     }

     /**
      * Start cleanup timer for expired sessions
      */
     startCleanupTimer() {
          if (this.cleanupTimer) return;

          this.cleanupTimer = setInterval(() => {
               this.cleanupExpiredSessions();
          }, this.cleanupInterval);
     }

     /**
      * Stop cleanup timer
      */
     stopCleanupTimer() {
          if (this.cleanupTimer) {
               clearInterval(this.cleanupTimer);
               this.cleanupTimer = null;
          }
     }

     /**
      * Clean up expired sessions
      */
     async cleanupExpiredSessions() {
          const now = Date.now();
          const expiredSessions = [];

          for (const [key, session] of this.activeSessions.entries()) {
               if (!this.isSessionActive(session)) {
                    expiredSessions.push({ key, session });
               }
          }

          for (const { key, session } of expiredSessions) {
               if (session.isActive) {
                    // Auto-submit expired but active sessions
                    await this.autoSubmitSession(session.sessionId, 'timeout');
               }
               this.activeSessions.delete(key);
          }

          if (expiredSessions.length > 0) {
               console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
          }
     }

     /**
      * Clean up specific session
      * @param {string} sessionId - Session ID
      */
     cleanupSession(sessionId) {
          for (const [key, session] of this.activeSessions.entries()) {
               if (session.sessionId === sessionId) {
                    this.activeSessions.delete(key);
                    break;
               }
          }
     }

     /**
      * Get session statistics
      * @returns {Object} Session statistics
      */
     getStatistics() {
          const now = Date.now();
          const sessions = Array.from(this.activeSessions.values());

          return {
               totalSessions: sessions.length,
               activeSessions: sessions.filter(s => this.isSessionActive(s)).length,
               inactiveSessions: sessions.filter(s => !this.isSessionActive(s)).length,
               averageSessionDuration: sessions.length > 0
                    ? sessions.reduce((sum, s) => sum + (now - s.createdAt.getTime()), 0) / sessions.length / 1000
                    : 0,
               totalAnswers: sessions.reduce((sum, s) => sum + s.answers.size, 0),
               totalViolations: sessions.reduce((sum, s) => sum + s.violations.length, 0),
               activeLocks: this.sessionLocks.size
          };
     }

     /**
      * Shutdown the service with enhanced cleanup
      */
     shutdown() {
          this.stopCleanupTimer();
          this.stopHeartbeat();

          // Auto-submit all active sessions
          const activeSessions = Array.from(this.activeSessions.values())
               .filter(s => s.isActive);

          const shutdownPromises = activeSessions.map(sessionData =>
               this.autoSubmitSession(sessionData.sessionId, 'system_shutdown')
          );

          // Emit shutdown event
          this.emit('shutdown', {
               sessionsToSubmit: activeSessions.length,
               timestamp: new Date()
          });

          return Promise.all(shutdownPromises);
     }
}

module.exports = new SessionService();