/**
 * Health Check Routes for ExamGuard API
 * 
 * Provides comprehensive health monitoring endpoints for production deployment
 */

const express = require('express');
const mongoose = require('mongoose');
const { sendSuccess, sendError } = require('../utils/responseFormatter');

const router = express.Router();

/**
 * Basic health check endpoint
 * Returns simple OK status for load balancers
 */
router.get('/', async (req, res) => {
     try {
          const health = {
               status: 'OK',
               timestamp: new Date().toISOString(),
               uptime: process.uptime(),
               environment: process.env.NODE_ENV || 'development',
               version: '1.0.0'
          };

          sendSuccess(res, health, 'Service is healthy');
     } catch (error) {
          sendError(res, 'HEALTH_CHECK_FAILED', 'Health check failed', 503);
     }
});

/**
 * Detailed health check endpoint
 * Returns comprehensive system status
 */
router.get('/detailed', async (req, res) => {
     try {
          const startTime = Date.now();

          // Check database connectivity
          const dbHealth = await checkDatabaseHealth();

          // Check memory usage
          const memoryHealth = checkMemoryHealth();

          // Check system resources
          const systemHealth = checkSystemHealth();

          // Calculate response time
          const responseTime = Date.now() - startTime;

          const health = {
               status: 'OK',
               timestamp: new Date().toISOString(),
               responseTime: `${responseTime}ms`,
               checks: {
                    database: dbHealth,
                    memory: memoryHealth,
                    system: systemHealth
               },
               metadata: {
                    environment: process.env.NODE_ENV || 'development',
                    version: '1.0.0',
                    uptime: formatUptime(process.uptime()),
                    nodeVersion: process.version,
                    platform: process.platform,
                    arch: process.arch
               }
          };

          // Determine overall status
          const allChecksHealthy = Object.values(health.checks)
               .every(check => check.status === 'healthy');

          if (!allChecksHealthy) {
               health.status = 'DEGRADED';
               return sendError(res, 'HEALTH_CHECK_DEGRADED', 'Some health checks failed', 503, health);
          }

          sendSuccess(res, health, 'All systems healthy');
     } catch (error) {
          console.error('Detailed health check failed:', error);
          sendError(res, 'HEALTH_CHECK_FAILED', 'Health check failed', 503, {
               error: error.message,
               timestamp: new Date().toISOString()
          });
     }
});

/**
 * Database-specific health check
 */
router.get('/database', async (req, res) => {
     try {
          const dbHealth = await checkDatabaseHealth();

          if (dbHealth.status === 'healthy') {
               sendSuccess(res, dbHealth, 'Database is healthy');
          } else {
               sendError(res, 'DATABASE_UNHEALTHY', 'Database health check failed', 503, dbHealth);
          }
     } catch (error) {
          sendError(res, 'DATABASE_CHECK_FAILED', 'Database check failed', 503, {
               error: error.message
          });
     }
});

/**
 * Readiness probe endpoint
 * Checks if the service is ready to accept traffic
 */
router.get('/ready', async (req, res) => {
     try {
          // Check critical dependencies
          const dbHealth = await checkDatabaseHealth();

          if (dbHealth.status !== 'healthy') {
               return sendError(res, 'SERVICE_NOT_READY', 'Service not ready', 503, {
                    reason: 'Database not available'
               });
          }

          sendSuccess(res, {
               status: 'READY',
               timestamp: new Date().toISOString()
          }, 'Service is ready');
     } catch (error) {
          sendError(res, 'READINESS_CHECK_FAILED', 'Readiness check failed', 503);
     }
});

/**
 * Liveness probe endpoint
 * Checks if the service is alive and should not be restarted
 */
router.get('/live', async (req, res) => {
     try {
          // Basic liveness check - if we can respond, we're alive
          sendSuccess(res, {
               status: 'ALIVE',
               timestamp: new Date().toISOString(),
               uptime: process.uptime()
          }, 'Service is alive');
     } catch (error) {
          sendError(res, 'LIVENESS_CHECK_FAILED', 'Liveness check failed', 503);
     }
});

/**
 * Check database health
 */
async function checkDatabaseHealth() {
     const startTime = Date.now();

     try {
          // Check connection state
          const connectionState = mongoose.connection.readyState;
          const stateNames = {
               0: 'disconnected',
               1: 'connected',
               2: 'connecting',
               3: 'disconnecting'
          };

          if (connectionState !== 1) {
               return {
                    status: 'unhealthy',
                    message: `Database ${stateNames[connectionState]}`,
                    responseTime: `${Date.now() - startTime}ms`
               };
          }

          // Ping database
          const adminDb = mongoose.connection.db.admin();
          const pingResult = await adminDb.ping();

          if (pingResult.ok !== 1) {
               return {
                    status: 'unhealthy',
                    message: 'Database ping failed',
                    responseTime: `${Date.now() - startTime}ms`
               };
          }

          // Get database stats
          const stats = await mongoose.connection.db.stats();

          return {
               status: 'healthy',
               message: 'Database connected and responsive',
               responseTime: `${Date.now() - startTime}ms`,
               details: {
                    state: stateNames[connectionState],
                    host: mongoose.connection.host,
                    port: mongoose.connection.port,
                    database: mongoose.connection.name,
                    collections: stats.collections,
                    dataSize: formatBytes(stats.dataSize),
                    storageSize: formatBytes(stats.storageSize)
               }
          };
     } catch (error) {
          return {
               status: 'unhealthy',
               message: `Database check failed: ${error.message}`,
               responseTime: `${Date.now() - startTime}ms`,
               error: error.message
          };
     }
}

/**
 * Check memory health
 */
function checkMemoryHealth() {
     const memUsage = process.memoryUsage();
     const totalMemory = memUsage.heapTotal;
     const usedMemory = memUsage.heapUsed;
     const memoryUsagePercent = (usedMemory / totalMemory) * 100;

     const status = memoryUsagePercent > 90 ? 'unhealthy' :
          memoryUsagePercent > 80 ? 'warning' : 'healthy';

     return {
          status,
          message: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
          details: {
               heapUsed: formatBytes(memUsage.heapUsed),
               heapTotal: formatBytes(memUsage.heapTotal),
               external: formatBytes(memUsage.external),
               rss: formatBytes(memUsage.rss),
               usagePercent: `${memoryUsagePercent.toFixed(2)}%`
          }
     };
}

/**
 * Check system health
 */
function checkSystemHealth() {
     const loadAverage = process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0];
     const cpuCount = require('os').cpus().length;
     const freeMemory = require('os').freemem();
     const totalMemory = require('os').totalmem();
     const systemMemoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

     const status = systemMemoryUsage > 95 ? 'unhealthy' :
          systemMemoryUsage > 85 ? 'warning' : 'healthy';

     return {
          status,
          message: `System memory usage: ${systemMemoryUsage.toFixed(2)}%`,
          details: {
               platform: process.platform,
               arch: process.arch,
               nodeVersion: process.version,
               cpuCount,
               loadAverage: loadAverage.map(load => load.toFixed(2)),
               freeMemory: formatBytes(freeMemory),
               totalMemory: formatBytes(totalMemory),
               systemMemoryUsage: `${systemMemoryUsage.toFixed(2)}%`
          }
     };
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
     if (bytes === 0) return '0 Bytes';

     const k = 1024;
     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
     const i = Math.floor(Math.log(bytes) / Math.log(k));

     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format uptime to human readable format
 */
function formatUptime(seconds) {
     const days = Math.floor(seconds / 86400);
     const hours = Math.floor((seconds % 86400) / 3600);
     const minutes = Math.floor((seconds % 3600) / 60);
     const secs = Math.floor(seconds % 60);

     const parts = [];
     if (days > 0) parts.push(`${days}d`);
     if (hours > 0) parts.push(`${hours}h`);
     if (minutes > 0) parts.push(`${minutes}m`);
     if (secs > 0) parts.push(`${secs}s`);

     return parts.join(' ') || '0s';
}

module.exports = router;