/**
 * Production Monitoring and Alerting Configuration
 * 
 * This module provides monitoring, logging, and alerting configurations
 * for the ExamGuard production environment.
 */

class MonitoringConfig {
     constructor() {
          this.environment = process.env.NODE_ENV || 'development';
          this.isProduction = this.environment === 'production';
     }

     /**
      * Get health check configuration
      */
     getHealthCheckConfig() {
          return {
               enabled: true,
               path: '/health',
               interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000,
               timeout: 5000,
               checks: {
                    database: {
                         enabled: true,
                         timeout: 3000,
                         critical: true
                    },
                    memory: {
                         enabled: true,
                         threshold: 0.9, // 90% memory usage
                         critical: false
                    },
                    disk: {
                         enabled: true,
                         threshold: 0.85, // 85% disk usage
                         critical: false
                    },
                    responseTime: {
                         enabled: true,
                         threshold: 2000, // 2 seconds
                         critical: false
                    }
               }
          };
     }

     /**
      * Get logging configuration
      */
     getLoggingConfig() {
          return {
               level: process.env.LOG_LEVEL || 'info',
               format: this.isProduction ? 'json' : 'simple',
               timestamp: true,
               colorize: !this.isProduction,
               transports: {
                    console: {
                         enabled: true,
                         level: process.env.LOG_LEVEL || 'info'
                    },
                    file: {
                         enabled: this.isProduction,
                         filename: 'logs/application.log',
                         maxSize: '10m',
                         maxFiles: 5,
                         level: 'info'
                    },
                    error: {
                         enabled: this.isProduction,
                         filename: 'logs/error.log',
                         maxSize: '10m',
                         maxFiles: 5,
                         level: 'error'
                    }
               },
               // Log categories
               categories: {
                    auth: {
                         enabled: true,
                         level: 'info',
                         includeUserInfo: false // For privacy
                    },
                    database: {
                         enabled: true,
                         level: 'warn',
                         logQueries: false // Set to true for debugging
                    },
                    security: {
                         enabled: true,
                         level: 'warn',
                         logViolations: true
                    },
                    performance: {
                         enabled: this.isProduction,
                         level: 'info',
                         logSlowRequests: true,
                         slowRequestThreshold: 1000 // 1 second
                    }
               }
          };
     }

     /**
      * Get metrics collection configuration
      */
     getMetricsConfig() {
          return {
               enabled: process.env.ENABLE_METRICS === 'true',
               path: '/metrics',
               collectDefaultMetrics: true,
               defaultMetricsInterval: 10000, // 10 seconds
               metrics: {
                    httpRequests: {
                         enabled: true,
                         buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
                    },
                    httpDuration: {
                         enabled: true,
                         buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
                    },
                    databaseOperations: {
                         enabled: true,
                         buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5]
                    },
                    examAttempts: {
                         enabled: true,
                         trackActive: true,
                         trackCompleted: true,
                         trackViolations: true
                    },
                    userSessions: {
                         enabled: true,
                         trackActive: true,
                         trackLogins: true
                    }
               }
          };
     }

     /**
      * Get alerting configuration
      */
     getAlertingConfig() {
          return {
               enabled: this.isProduction,
               channels: {
                    email: {
                         enabled: false, // Configure with your email service
                         recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
                         smtp: {
                              host: process.env.SMTP_HOST,
                              port: process.env.SMTP_PORT || 587,
                              secure: false,
                              auth: {
                                   user: process.env.SMTP_USER,
                                   pass: process.env.SMTP_PASS
                              }
                         }
                    },
                    webhook: {
                         enabled: !!process.env.ALERT_WEBHOOK_URL,
                         url: process.env.ALERT_WEBHOOK_URL,
                         timeout: 5000
                    },
                    console: {
                         enabled: true // Always log alerts to console
                    }
               },
               rules: {
                    highErrorRate: {
                         enabled: true,
                         threshold: 0.05, // 5% error rate
                         window: 300000, // 5 minutes
                         severity: 'high'
                    },
                    databaseConnectionFailure: {
                         enabled: true,
                         threshold: 1, // Any failure
                         window: 60000, // 1 minute
                         severity: 'critical'
                    },
                    highResponseTime: {
                         enabled: true,
                         threshold: 2000, // 2 seconds
                         window: 300000, // 5 minutes
                         severity: 'medium'
                    },
                    highMemoryUsage: {
                         enabled: true,
                         threshold: 0.9, // 90%
                         window: 300000, // 5 minutes
                         severity: 'medium'
                    },
                    examViolationSpike: {
                         enabled: true,
                         threshold: 10, // 10 violations per minute
                         window: 60000, // 1 minute
                         severity: 'medium'
                    }
               }
          };
     }

     /**
      * Get performance monitoring configuration
      */
     getPerformanceConfig() {
          return {
               enabled: this.isProduction,
               sampling: {
                    rate: 0.1, // Sample 10% of requests
                    maxSamples: 1000 // Maximum samples to keep in memory
               },
               tracking: {
                    requestDuration: true,
                    databaseQueries: true,
                    memoryUsage: true,
                    cpuUsage: true,
                    examOperations: true
               },
               thresholds: {
                    slowRequest: 1000, // 1 second
                    slowQuery: 500, // 500ms
                    highMemory: 0.8, // 80%
                    highCpu: 0.8 // 80%
               }
          };
     }

     /**
      * Get security monitoring configuration
      */
     getSecurityConfig() {
          return {
               enabled: true,
               monitoring: {
                    failedLogins: {
                         enabled: true,
                         threshold: 5, // 5 failed attempts
                         window: 300000, // 5 minutes
                         action: 'log' // or 'block'
                    },
                    suspiciousActivity: {
                         enabled: true,
                         patterns: [
                              'rapid_requests',
                              'unusual_user_agent',
                              'multiple_violations'
                         ]
                    },
                    examViolations: {
                         enabled: true,
                         trackTypes: [
                              'tab_switch',
                              'copy_attempt',
                              'paste_attempt',
                              'right_click'
                         ],
                         alertThreshold: 3 // Alert after 3 violations
                    }
               },
               logging: {
                    authEvents: true,
                    securityViolations: true,
                    suspiciousActivity: true,
                    includeIpAddress: true,
                    includeUserAgent: true
               }
          };
     }

     /**
      * Get complete monitoring configuration
      */
     getConfig() {
          return {
               environment: this.environment,
               healthCheck: this.getHealthCheckConfig(),
               logging: this.getLoggingConfig(),
               metrics: this.getMetricsConfig(),
               alerting: this.getAlertingConfig(),
               performance: this.getPerformanceConfig(),
               security: this.getSecurityConfig()
          };
     }

     /**
      * Initialize monitoring system
      */
     async initialize() {
          console.log('🔍 Initializing monitoring system...');

          const config = this.getConfig();

          // Initialize logging
          if (config.logging.enabled !== false) {
               this.initializeLogging(config.logging);
          }

          // Initialize metrics collection
          if (config.metrics.enabled) {
               this.initializeMetrics(config.metrics);
          }

          // Initialize health checks
          if (config.healthCheck.enabled) {
               this.initializeHealthChecks(config.healthCheck);
          }

          // Initialize alerting
          if (config.alerting.enabled) {
               this.initializeAlerting(config.alerting);
          }

          console.log('✅ Monitoring system initialized');
          return config;
     }

     /**
      * Initialize logging system
      */
     initializeLogging(config) {
          // This would integrate with your logging library (winston, pino, etc.)
          console.log('📝 Logging system initialized');
          console.log(`   Level: ${config.level}`);
          console.log(`   Format: ${config.format}`);
     }

     /**
      * Initialize metrics collection
      */
     initializeMetrics(config) {
          // This would integrate with your metrics library (prometheus, etc.)
          console.log('📊 Metrics collection initialized');
          console.log(`   Path: ${config.path}`);
          console.log(`   Default metrics: ${config.collectDefaultMetrics}`);
     }

     /**
      * Initialize health checks
      */
     initializeHealthChecks(config) {
          console.log('🏥 Health checks initialized');
          console.log(`   Path: ${config.path}`);
          console.log(`   Interval: ${config.interval}ms`);
     }

     /**
      * Initialize alerting system
      */
     initializeAlerting(config) {
          console.log('🚨 Alerting system initialized');

          const enabledChannels = Object.keys(config.channels)
               .filter(channel => config.channels[channel].enabled);

          console.log(`   Channels: ${enabledChannels.join(', ')}`);
     }
}

module.exports = new MonitoringConfig();