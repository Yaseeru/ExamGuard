const ExamAttempt = require('../models/ExamAttempt');
const examService = require('./examService');
const sessionService = require('./sessionService');

class TimerService {
     constructor() {
          this.activeTimers = new Map(); // Store active exam timers
          this.checkInterval = 30000; // Check every 30 seconds
          this.intervalId = null;
     }

     /**
      * Start the timer service
      */
     start() {
          if (this.intervalId) {
               return; // Already running
          }

          console.log('Timer service started');
          this.intervalId = setInterval(() => {
               this.checkExpiredExams();
               this.checkExpiredSessions();
          }, this.checkInterval);

          // Initial check
          this.checkExpiredExams();
          this.checkExpiredSessions();
     }

     /**
      * Stop the timer service
      */
     stop() {
          if (this.intervalId) {
               clearInterval(this.intervalId);
               this.intervalId = null;
               console.log('Timer service stopped');
          }
     }

     /**
      * Register an exam attempt for timer tracking
      * @param {string} attemptId - ID of the exam attempt
      * @param {number} duration - Duration in seconds
      */
     registerAttempt(attemptId, duration) {
          const expiryTime = Date.now() + (duration * 1000);
          this.activeTimers.set(attemptId, {
               expiryTime,
               duration,
               registered: Date.now()
          });

          console.log(`Timer registered for attempt ${attemptId}, expires at ${new Date(expiryTime)}`);
     }

     /**
      * Unregister an exam attempt from timer tracking
      * @param {string} attemptId - ID of the exam attempt
      */
     unregisterAttempt(attemptId) {
          if (this.activeTimers.has(attemptId)) {
               this.activeTimers.delete(attemptId);
               console.log(`Timer unregistered for attempt ${attemptId}`);
          }
     }

     /**
      * Get remaining time for an exam attempt
      * @param {string} attemptId - ID of the exam attempt
      * @returns {number} Remaining time in seconds
      */
     getRemainingTime(attemptId) {
          const timer = this.activeTimers.get(attemptId);
          if (!timer) {
               return 0;
          }

          const remaining = Math.max(0, Math.floor((timer.expiryTime - Date.now()) / 1000));
          return remaining;
     }

     /**
      * Update timer for an exam attempt
      * @param {string} attemptId - ID of the exam attempt
      * @param {number} timeRemaining - Time remaining in seconds
      */
     updateTimer(attemptId, timeRemaining) {
          const timer = this.activeTimers.get(attemptId);
          if (timer) {
               timer.expiryTime = Date.now() + (timeRemaining * 1000);
               console.log(`Timer updated for attempt ${attemptId}, new expiry: ${new Date(timer.expiryTime)}`);
          }
     }

     /**
      * Check for expired exams and auto-submit them
      */
     async checkExpiredExams() {
          try {
               // Get all in-progress attempts
               const inProgressAttempts = await ExamAttempt.find({
                    status: 'in_progress'
               }).select('_id startTime timeRemaining');

               for (const attempt of inProgressAttempts) {
                    const attemptId = attempt._id.toString();

                    // Check if timer is registered
                    if (!this.activeTimers.has(attemptId)) {
                         // Register timer for untracked attempts
                         if (attempt.timeRemaining > 0) {
                              this.registerAttempt(attemptId, attempt.timeRemaining);
                         } else {
                              // Time already expired, auto-submit
                              await this.autoSubmitExpiredAttempt(attemptId);
                         }
                         continue;
                    }

                    // Check if timer has expired
                    const remainingTime = this.getRemainingTime(attemptId);
                    if (remainingTime <= 0) {
                         await this.autoSubmitExpiredAttempt(attemptId);
                    } else {
                         // Update database with current remaining time
                         attempt.timeRemaining = remainingTime;
                         await attempt.save();
                    }
               }
          } catch (error) {
               console.error('Error checking expired exams:', error);
          }
     }

     /**
      * Auto-submit an expired exam attempt
      * @param {string} attemptId - ID of the exam attempt
      */
     async autoSubmitExpiredAttempt(attemptId) {
          try {
               console.log(`Auto-submitting expired attempt: ${attemptId}`);

               const attempt = await ExamAttempt.findById(attemptId);
               if (!attempt || attempt.status !== 'in_progress') {
                    this.unregisterAttempt(attemptId);
                    return;
               }

               // Submit the attempt
               await attempt.submit(true); // true = auto submission

               // Unregister from timer tracking
               this.unregisterAttempt(attemptId);

               console.log(`Attempt ${attemptId} auto-submitted successfully`);
          } catch (error) {
               console.error(`Error auto-submitting attempt ${attemptId}:`, error);
          }
     }

     /**
      * Check for expired sessions and auto-submit them
      */
     async checkExpiredSessions() {
          try {
               // Get session statistics to check for active sessions
               const stats = sessionService.getStatistics();

               if (stats.activeSessions > 0) {
                    // Trigger session cleanup which handles expired sessions
                    await sessionService.cleanupExpiredSessions();
               }
          } catch (error) {
               console.error('Error checking expired sessions:', error);
          }
     }

     /**
      * Get timer statistics including session data
      * @returns {Object} Enhanced timer service statistics
      */
     getStatistics() {
          const sessionStats = sessionService.getStatistics();

          return {
               activeTimers: this.activeTimers.size,
               checkInterval: this.checkInterval,
               isRunning: !!this.intervalId,
               sessionStats,
               timers: Array.from(this.activeTimers.entries()).map(([id, timer]) => ({
                    attemptId: id,
                    expiryTime: new Date(timer.expiryTime),
                    remainingSeconds: Math.max(0, Math.floor((timer.expiryTime - Date.now()) / 1000))
               }))
          };
     }

     /**
      * Force check for expired exams (for testing)
      */
     async forceCheck() {
          await this.checkExpiredExams();
     }
}

module.exports = new TimerService();