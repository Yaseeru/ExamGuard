/**
 * Production Environment Configuration for ExamGuard
 * 
 * This module provides production-specific configurations including
 * database settings, security options, and performance optimizations.
 */

const DatabaseConfig = require('./database');

class ProductionConfig {
     constructor() {
          this.environment = 'production';
          this.validateEnvironment();
     }

     /**
      * Validate required environment variables for production
      */
     validateEnvironment() {
          const requiredVars = [
               'MONGODB_URI',
               'JWT_SECRET',
               'FRONTEND_URL'
          ];

          const missingVars = requiredVars.filter(varName => !process.env[varName]);

          if (missingVars.length > 0) {
               console.error('❌ Missing required environment variables for production:');
               missingVars.forEach(varName => {
                    console.error(`   - ${varName}`);
               });
               throw new Error('Production environment validation failed');
          }

          // Validate MongoDB Atlas connection string
          if (!process.env.MONGODB_URI.includes('mongodb+srv://')) {
               console.warn('⚠️  Production should use MongoDB Atlas (mongodb+srv://) connection string');
          }

          // Validate JWT secret strength
          if (process.env.JWT_SECRET.length < 32) {
               console.warn('⚠️  JWT_SECRET should be at least 32 characters for production');
          }

          console.log('✅ Production environment variables validated');
     }

     /**
      * Get production database configuration
      */
     getDatabaseConfig() {
          return {
               uri: process.env.MONGODB_URI,
               options: {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    maxPoolSize: 20, // Higher connection pool for production
                    minPoolSize: 5, // Minimum connections to maintain
                    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
                    serverSelectionTimeoutMS: 10000, // Longer timeout for production
                    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                    heartbeatFrequencyMS: 10000, // Check server status every 10 seconds
                    retryWrites: true,
                    w: 'majority', // Write concern for data safety
                    compressors: ['zlib'], // Enable compression for network traffic
                    bufferMaxEntries: 0, // Disable mongoose buffering
                    bufferCommands: false, // Disable mongoose buffering
                    family: 4 // Use IPv4, skip trying IPv6
               }
          };
     }

     /**
      * Get production security configuration
      */
     getSecurityConfig() {
          return {
               jwt: {
                    secret: process.env.JWT_SECRET,
                    expiresIn: process.env.JWT_EXPIRE || '7d',
                    algorithm: 'HS256',
                    issuer: 'examguard-api',
                    audience: 'examguard-client'
               },
               cors: {
                    origin: process.env.FRONTEND_URL,
                    credentials: true,
                    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                    allowedHeaders: ['Content-Type', 'Authorization'],
                    maxAge: 86400 // 24 hours
               },
               helmet: {
                    contentSecurityPolicy: {
                         directives: {
                              defaultSrc: ["'self'"],
                              styleSrc: ["'self'", "'unsafe-inline'"],
                              scriptSrc: ["'self'"],
                              imgSrc: ["'self'", "data:", "https:"],
                              connectSrc: ["'self'", process.env.FRONTEND_URL],
                              fontSrc: ["'self'"],
                              objectSrc: ["'none'"],
                              mediaSrc: ["'self'"],
                              frameSrc: ["'none'"]
                         }
                    },
                    crossOriginEmbedderPolicy: false,
                    hsts: {
                         maxAge: 31536000,
                         includeSubDomains: true,
                         preload: true
                    }
               },
               rateLimit: {
                    windowMs: 15 * 60 * 1000, // 15 minutes
                    max: 100, // Limit each IP to 100 requests per windowMs
                    message: 'Too many requests from this IP, please try again later',
                    standardHeaders: true,
                    legacyHeaders: false,
                    // Skip rate limiting for health checks
                    skip: (req) => req.path === '/health'
               }
          };
     }

     /**
      * Get production logging configuration
      */
     getLoggingConfig() {
          return {
               level: process.env.LOG_LEVEL || 'info',
               format: 'json',
               transports: [
                    {
                         type: 'console',
                         colorize: false,
                         timestamp: true
                    }
               ],
               // Log database operations in production
               database: {
                    logQueries: false, // Set to true for debugging
                    logConnections: true,
                    logErrors: true
               }
          };
     }

     /**
      * Get production performance configuration
      */
     getPerformanceConfig() {
          return {
               compression: {
                    level: 6,
                    threshold: 1024,
                    filter: (req, res) => {
                         // Don't compress responses with this request header
                         if (req.headers['x-no-compression']) {
                              return false;
                         }
                         // Fallback to standard filter function
                         return true;
                    }
               },
               cache: {
                    // Cache static responses for 1 hour
                    maxAge: 3600,
                    // Cache control headers
                    cacheControl: 'public, max-age=3600'
               },
               // Request timeout (30 seconds)
               timeout: 30000
          };
     }

     /**
      * Get production monitoring configuration
      */
     getMonitoringConfig() {
          return {
               healthCheck: {
                    path: '/health',
                    interval: 30000, // 30 seconds
                    timeout: 5000, // 5 seconds
                    checks: [
                         'database',
                         'memory',
                         'disk'
                    ]
               },
               metrics: {
                    enabled: true,
                    path: '/metrics',
                    collectDefaultMetrics: true,
                    requestDuration: true,
                    requestTotal: true,
                    databaseMetrics: true
               }
          };
     }

     /**
      * Initialize production database connection
      */
     async initializeDatabase() {
          console.log('🚀 Initializing production database...');

          try {
               // Connect to database
               await DatabaseConfig.connect();

               // Create indexes for performance
               await DatabaseConfig.createIndexes();

               // Validate database setup
               const validation = await DatabaseConfig.validateDatabase();
               if (!validation.isValid) {
                    throw new Error('Database validation failed');
               }

               console.log('✅ Production database initialized successfully');
               return true;

          } catch (error) {
               console.error('❌ Production database initialization failed:', error.message);
               throw error;
          }
     }

     /**
      * Get complete production configuration
      */
     getConfig() {
          return {
               environment: this.environment,
               port: process.env.PORT || 5000,
               database: this.getDatabaseConfig(),
               security: this.getSecurityConfig(),
               logging: this.getLoggingConfig(),
               performance: this.getPerformanceConfig(),
               monitoring: this.getMonitoringConfig()
          };
     }

     /**
      * Validate production readiness
      */
     async validateProductionReadiness() {
          console.log('🔍 Validating production readiness...');

          const checks = [];

          try {
               // Check environment variables
               this.validateEnvironment();
               checks.push({ name: 'Environment Variables', status: true });

               // Check database connection
               await DatabaseConfig.connect();
               checks.push({ name: 'Database Connection', status: true });

               // Validate database structure
               const dbValidation = await DatabaseConfig.validateDatabase();
               checks.push({ name: 'Database Structure', status: dbValidation.isValid });

               // Check required indexes
               await DatabaseConfig.createIndexes();
               checks.push({ name: 'Database Indexes', status: true });

               // Generate readiness report
               console.log('\n📋 Production Readiness Report');
               console.log('================================');

               checks.forEach(check => {
                    const status = check.status ? '✅ READY' : '❌ NOT READY';
                    console.log(`${status} ${check.name}`);
               });

               const allReady = checks.every(check => check.status);

               console.log('\n================================');
               if (allReady) {
                    console.log('🎉 System is ready for production deployment!');
               } else {
                    console.log('❌ System is not ready for production.');
                    console.log('💡 Please fix the issues above before deploying.');
                    throw new Error('Production readiness validation failed');
               }

               return allReady;

          } catch (error) {
               console.error('❌ Production readiness check failed:', error.message);
               throw error;
          } finally {
               await DatabaseConfig.disconnect();
          }
     }
}

module.exports = new ProductionConfig();