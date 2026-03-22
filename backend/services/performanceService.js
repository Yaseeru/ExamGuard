/**
 * Performance Service for ExamGuard
 * Handles performance monitoring, metrics collection, and optimization
 */

class PerformanceService {
     constructor() {
          this.metrics = {
               requests: new Map(),
               dbQueries: new Map(),
               examOperations: new Map(),
               responseTimeHistory: []
          };

          this.thresholds = {
               slowRequest: 2000, // 2 seconds as per requirement 13.5
               slowQuery: 500,    // 500ms
               maxHistorySize: 1000
          };

          this.startTime = Date.now();
          this.setupCleanupInterval();
     }

     /**
      * Setup periodic cleanup of old metrics
      */
     setupCleanupInterval() {
          setInterval(() => {
               this.cleanupOldMetrics();
          }, 300000); // Every 5 minutes
     }

     /**
      * Record request performance metrics
      */
     recordRequest(req, res, responseTime) {
          const endpoint = `${req.method} ${req.route?.path || req.path}`;
          const timestamp = Date.now();

          // Record response time
          this.recordResponseTime(endpoint, responseTime, timestamp);

          // Track slow requests
          if (responseTime > this.thresholds.slowRequest) {
               this.recordSlowRequest(endpoint, responseTime, req);
          }

          // Update request counters
          this.updateRequestCounters(endpoint, res.statusCode);
     }

     /**
      * Record database query performance
      */
     recordDbQuery(operation, collection, duration, query = null) {
          const key = `${operation}:${collection}`;
          const timestamp = Date.now();

          if (!this.metrics.dbQueries.has(key)) {
               this.metrics.dbQueries.set(key, {
                    count: 0,
                    totalDuration: 0,
                    avgDuration: 0,
                    slowQueries: [],
                    lastExecuted: timestamp
               });
          }

          const metric = this.metrics.dbQueries.get(key);
          metric.count++;
          metric.totalDuration += duration;
          metric.avgDuration = metric.totalDuration / metric.count;
          metric.lastExecuted = timestamp;

          // Track slow queries
          if (duration > this.thresholds.slowQuery) {
               metric.slowQueries.push({
                    duration,
                    timestamp,
                    query: query ? JSON.stringify(query) : null
               });

               // Keep only last 10 slow queries
               if (metric.slowQueries.length > 10) {
                    metric.slowQueries.shift();
               }
          }
     }

     /**
      * Record exam-specific operations
      */
     recordExamOperation(operation, examId, duration, metadata = {}) {
          const key = `exam:${operation}`;
          const timestamp = Date.now();

          if (!this.metrics.examOperations.has(key)) {
               this.metrics.examOperations.set(key, {
                    count: 0,
                    totalDuration: 0,
                    avgDuration: 0,
                    recentOperations: []
               });
          }

          const metric = this.metrics.examOperations.get(key);
          metric.count++;
          metric.totalDuration += duration;
          metric.avgDuration = metric.totalDuration / metric.count;

          // Track recent operations
          metric.recentOperations.push({
               examId,
               duration,
               timestamp,
               metadata
          });

          // Keep only last 50 operations
          if (metric.recentOperations.length > 50) {
               metric.recentOperations.shift();
          }
     }

     /**
      * Record response time for trending analysis
      */
     recordResponseTime(endpoint, responseTime, timestamp) {
          this.metrics.responseTimeHistory.push({
               endpoint,
               responseTime,
               timestamp
          });

          // Keep history size manageable
          if (this.metrics.responseTimeHistory.length > this.thresholds.maxHistorySize) {
               this.metrics.responseTimeHistory.shift();
          }
     }

     /**
      * Record slow request details
      */
     recordSlowRequest(endpoint, responseTime, req) {
          console.warn(`🐌 Slow request detected: ${endpoint} took ${responseTime}ms`, {
               url: req.originalUrl,
               method: req.method,
               userAgent: req.get('User-Agent'),
               ip: req.ip,
               userId: req.user?.id
          });
     }

     /**
      * Update request counters
      */
     updateRequestCounters(endpoint, statusCode) {
          if (!this.metrics.requests.has(endpoint)) {
               this.metrics.requests.set(endpoint, {
                    total: 0,
                    success: 0,
                    error: 0,
                    statusCodes: new Map()
               });
          }

          const metric = this.metrics.requests.get(endpoint);
          metric.total++;

          if (statusCode >= 200 && statusCode < 400) {
               metric.success++;
          } else {
               metric.error++;
          }

          // Track status codes
          const statusKey = Math.floor(statusCode / 100) * 100; // Group by 2xx, 4xx, 5xx
          metric.statusCodes.set(statusKey, (metric.statusCodes.get(statusKey) || 0) + 1);
     }

     /**
      * Get performance summary
      */
     getPerformanceSummary() {
          const uptime = Date.now() - this.startTime;
          const recentRequests = this.getRecentRequests(300000); // Last 5 minutes

          return {
               uptime: Math.floor(uptime / 1000), // in seconds
               requests: {
                    total: Array.from(this.metrics.requests.values())
                         .reduce((sum, metric) => sum + metric.total, 0),
                    recent: recentRequests.length,
                    avgResponseTime: this.getAverageResponseTime(),
                    slowRequests: this.getSlowRequestsCount()
               },
               database: {
                    totalQueries: Array.from(this.metrics.dbQueries.values())
                         .reduce((sum, metric) => sum + metric.count, 0),
                    avgQueryTime: this.getAverageQueryTime(),
                    slowQueries: this.getSlowQueriesCount()
               },
               examOperations: {
                    total: Array.from(this.metrics.examOperations.values())
                         .reduce((sum, metric) => sum + metric.count, 0),
                    avgDuration: this.getAverageExamOperationTime()
               },
               memory: process.memoryUsage(),
               cpu: process.cpuUsage()
          };
     }

     /**
      * Get detailed metrics for monitoring dashboard
      */
     getDetailedMetrics() {
          return {
               requests: Object.fromEntries(this.metrics.requests),
               dbQueries: Object.fromEntries(this.metrics.dbQueries),
               examOperations: Object.fromEntries(this.metrics.examOperations),
               responseTimeHistory: this.metrics.responseTimeHistory.slice(-100), // Last 100 requests
               thresholds: this.thresholds
          };
     }

     /**
      * Get recent requests within time window
      */
     getRecentRequests(timeWindow) {
          const cutoff = Date.now() - timeWindow;
          return (this.metrics.responseTimeHistory || []).filter(entry => entry.timestamp > cutoff);
     }

     /**
      * Calculate average response time
      */
     getAverageResponseTime() {
          if (!this.metrics.responseTimeHistory || this.metrics.responseTimeHistory.length === 0) return 0;

          const total = this.metrics.responseTimeHistory.reduce((sum, entry) => sum + entry.responseTime, 0);
          return Math.round(total / this.metrics.responseTimeHistory.length);
     }

     /**
      * Get count of slow requests
      */
     getSlowRequestsCount() {
          if (!this.metrics.responseTimeHistory) return 0;
          return this.metrics.responseTimeHistory.filter(
               entry => entry.responseTime > this.thresholds.slowRequest
          ).length;
     }

     /**
      * Calculate average database query time
      */
     getAverageQueryTime() {
          const queries = Array.from(this.metrics.dbQueries.values());
          if (queries.length === 0) return 0;

          const totalAvg = queries.reduce((sum, metric) => sum + metric.avgDuration, 0);
          return Math.round(totalAvg / queries.length);
     }

     /**
      * Get count of slow database queries
      */
     getSlowQueriesCount() {
          return Array.from(this.metrics.dbQueries.values())
               .reduce((sum, metric) => sum + metric.slowQueries.length, 0);
     }

     /**
      * Calculate average exam operation time
      */
     getAverageExamOperationTime() {
          const operations = Array.from(this.metrics.examOperations.values());
          if (operations.length === 0) return 0;

          const totalAvg = operations.reduce((sum, metric) => sum + metric.avgDuration, 0);
          return Math.round(totalAvg / operations.length);
     }

     /**
      * Clean up old metrics to prevent memory leaks
      */
     cleanupOldMetrics() {
          const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

          // Clean response time history
          this.metrics.responseTimeHistory = this.metrics.responseTimeHistory.filter(
               entry => entry.timestamp > cutoff
          );

          // Clean slow queries from database metrics
          for (const metric of this.metrics.dbQueries.values()) {
               metric.slowQueries = metric.slowQueries.filter(
                    query => query.timestamp > cutoff
               );
          }

          // Clean recent operations from exam metrics
          for (const metric of this.metrics.examOperations.values()) {
               metric.recentOperations = metric.recentOperations.filter(
                    op => op.timestamp > cutoff
               );
          }
     }

     /**
      * Check if system is performing within acceptable limits
      */
     isPerformanceHealthy() {
          const summary = this.getPerformanceSummary();

          return {
               healthy: summary.requests.avgResponseTime < this.thresholds.slowRequest &&
                    summary.database.avgQueryTime < this.thresholds.slowQuery,
               avgResponseTime: summary.requests.avgResponseTime,
               avgQueryTime: summary.database.avgQueryTime,
               thresholds: this.thresholds
          };
     }

     /**
      * Get performance recommendations
      */
     getRecommendations() {
          const recommendations = [];
          const summary = this.getPerformanceSummary();

          if (summary.requests.avgResponseTime > this.thresholds.slowRequest) {
               recommendations.push({
                    type: 'response_time',
                    severity: 'high',
                    message: `Average response time (${summary.requests.avgResponseTime}ms) exceeds threshold (${this.thresholds.slowRequest}ms)`,
                    suggestion: 'Consider implementing additional caching or optimizing slow endpoints'
               });
          }

          if (summary.database.avgQueryTime > this.thresholds.slowQuery) {
               recommendations.push({
                    type: 'database',
                    severity: 'medium',
                    message: `Average query time (${summary.database.avgQueryTime}ms) exceeds threshold (${this.thresholds.slowQuery}ms)`,
                    suggestion: 'Review database indexes and optimize slow queries'
               });
          }

          const memoryUsage = summary.memory.heapUsed / summary.memory.heapTotal;
          if (memoryUsage > 0.8) {
               recommendations.push({
                    type: 'memory',
                    severity: 'medium',
                    message: `High memory usage detected (${Math.round(memoryUsage * 100)}%)`,
                    suggestion: 'Consider implementing memory cleanup or increasing server resources'
               });
          }

          return recommendations;
     }
}

// Create singleton instance
const performanceService = new PerformanceService();

module.exports = performanceService;