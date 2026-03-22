const mongoose = require('mongoose');

/**
 * Database Configuration for ExamGuard
 * Supports both local development and MongoDB Atlas production environments
 */

class DatabaseConfig {
     constructor() {
          this.connectionOptions = {
               useNewUrlParser: true,
               useUnifiedTopology: true,
               maxPoolSize: 10, // Maintain up to 10 socket connections
               serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
               socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
               family: 4, // Use IPv4, skip trying IPv6
               retryWrites: true,
               w: 'majority' // Write concern for data safety
          };

          // Production-specific options for MongoDB Atlas
          if (process.env.NODE_ENV === 'production') {
               this.connectionOptions = {
                    ...this.connectionOptions,
                    maxPoolSize: 20, // Higher connection pool for production
                    minPoolSize: 5, // Minimum connections to maintain
                    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
                    serverSelectionTimeoutMS: 10000, // Longer timeout for production
                    heartbeatFrequencyMS: 10000, // Check server status every 10 seconds
                    compressors: ['zlib'] // Enable compression for network traffic
               };
          }
     }

     /**
      * Connect to MongoDB database
      * @returns {Promise<mongoose.Connection>}
      */
     async connect() {
          try {
               const mongoUri = this.getConnectionString();

               console.log(`Connecting to MongoDB...`);
               console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
               console.log(`Database: ${this.getDatabaseName()}`);

               const connection = await mongoose.connect(mongoUri, this.connectionOptions);

               console.log(`✅ MongoDB Connected: ${connection.connection.host}`);
               console.log(`📊 Database: ${connection.connection.name}`);

               // Set up connection event listeners
               this.setupEventListeners();

               return connection;
          } catch (error) {
               console.error('❌ Database connection error:', error.message);

               // Log additional details for debugging
               if (error.name === 'MongoServerSelectionError') {
                    console.error('💡 Check your MongoDB connection string and network connectivity');
               }

               process.exit(1);
          }
     }

     /**
      * Get the appropriate connection string based on environment
      * @returns {string}
      */
     getConnectionString() {
          const mongoUri = process.env.MONGODB_URI;

          if (!mongoUri) {
               throw new Error('MONGODB_URI environment variable is not defined');
          }

          // Validate MongoDB Atlas connection string format
          if (process.env.NODE_ENV === 'production' && !mongoUri.includes('mongodb+srv://')) {
               console.warn('⚠️  Production environment detected but not using MongoDB Atlas (mongodb+srv://)');
          }

          return mongoUri;
     }

     /**
      * Extract database name from connection string
      * @returns {string}
      */
     getDatabaseName() {
          const mongoUri = this.getConnectionString();

          try {
               if (mongoUri.includes('mongodb+srv://')) {
                    // Atlas connection string format
                    const match = mongoUri.match(/\/([^?]+)/);
                    return match ? match[1] : 'examguard';
               } else {
                    // Local MongoDB format
                    const match = mongoUri.match(/\/([^?]+)$/);
                    return match ? match[1] : 'examguard';
               }
          } catch (error) {
               return 'examguard';
          }
     }

     /**
      * Set up database connection event listeners
      */
     setupEventListeners() {
          const connection = mongoose.connection;

          connection.on('connected', () => {
               console.log('📡 Mongoose connected to MongoDB');
          });

          connection.on('error', (error) => {
               console.error('❌ Mongoose connection error:', error);
          });

          connection.on('disconnected', () => {
               console.log('📡 Mongoose disconnected from MongoDB');
          });

          connection.on('reconnected', () => {
               console.log('🔄 Mongoose reconnected to MongoDB');
          });

          // Handle application termination
          process.on('SIGINT', async () => {
               await this.disconnect();
               process.exit(0);
          });

          process.on('SIGTERM', async () => {
               await this.disconnect();
               process.exit(0);
          });
     }

     /**
      * Disconnect from MongoDB
      * @returns {Promise<void>}
      */
     async disconnect() {
          try {
               await mongoose.connection.close();
               console.log('🔌 MongoDB connection closed');
          } catch (error) {
               console.error('❌ Error closing MongoDB connection:', error);
          }
     }

     /**
      * Get connection status
      * @returns {object}
      */
     getStatus() {
          const connection = mongoose.connection;

          return {
               readyState: connection.readyState,
               host: connection.host,
               port: connection.port,
               name: connection.name,
               collections: Object.keys(connection.collections),
               isConnected: connection.readyState === 1
          };
     }

     /**
      * Create database indexes for performance optimization
      * @returns {Promise<void>}
      */
     async createIndexes() {
          try {
               console.log('🔍 Creating database indexes...');

               const db = mongoose.connection.db;

               // User collection indexes
               await this.createIndexSafely(db, 'users', { email: 1 }, { unique: true, name: 'email_unique' });
               await this.createIndexSafely(db, 'users', { role: 1 }, { name: 'role_index' });
               await this.createIndexSafely(db, 'users', { isActive: 1 }, { name: 'active_index' });
               await this.createIndexSafely(db, 'users', { createdAt: 1 }, { name: 'created_date_index' });

               // Course collection indexes
               await this.createIndexSafely(db, 'courses', { lecturerId: 1 }, { name: 'lecturer_index' });
               await this.createIndexSafely(db, 'courses', { isActive: 1 }, { name: 'course_active_index' });
               await this.createIndexSafely(db, 'courses', { enrolledStudents: 1 }, { name: 'enrolled_students_index' });
               await this.createIndexSafely(db, 'courses', { title: 'text', description: 'text' }, { name: 'course_text_search' });
               await this.createIndexSafely(db, 'courses', { lecturerId: 1, isActive: 1 }, { name: 'lecturer_active_compound' });

               // Exam collection indexes
               await this.createIndexSafely(db, 'exams', { courseId: 1 }, { name: 'exam_course_index' });
               await this.createIndexSafely(db, 'exams', { startTime: 1, endTime: 1 }, { name: 'exam_time_range' });
               await this.createIndexSafely(db, 'exams', { isActive: 1 }, { name: 'exam_active_index' });
               await this.createIndexSafely(db, 'exams', { title: 'text' }, { name: 'exam_text_search' });
               await this.createIndexSafely(db, 'exams', { courseId: 1, isActive: 1 }, { name: 'exam_course_active_compound' });

               // ExamAttempt collection indexes
               await this.createIndexSafely(db, 'examattempts', { examId: 1, studentId: 1 }, { unique: true, name: 'exam_student_unique' });
               await this.createIndexSafely(db, 'examattempts', { studentId: 1, status: 1 }, { name: 'student_status_index' });
               await this.createIndexSafely(db, 'examattempts', { examId: 1, status: 1 }, { name: 'exam_status_index' });
               await this.createIndexSafely(db, 'examattempts', { startTime: 1 }, { name: 'attempt_start_time' });
               await this.createIndexSafely(db, 'examattempts', { submittedAt: 1 }, { name: 'attempt_submit_time' });
               await this.createIndexSafely(db, 'examattempts', { examId: 1, studentId: 1, status: 1 }, { name: 'exam_student_status_compound' });

               // Performance optimization indexes
               await this.createIndexSafely(db, 'examattempts', { 'violations.timestamp': 1 }, { name: 'violation_timestamp_index' });
               await this.createIndexSafely(db, 'examattempts', { violationCount: 1 }, { name: 'violation_count_index' });

               console.log('✅ Database indexes created successfully');
          } catch (error) {
               console.error('❌ Error creating database indexes:', error);
               throw error;
          }
     }

     /**
      * Create index safely (ignore if already exists)
      * @param {object} db - Database connection
      * @param {string} collection - Collection name
      * @param {object} keys - Index keys
      * @param {object} options - Index options
      */
     async createIndexSafely(db, collection, keys, options = {}) {
          try {
               await db.collection(collection).createIndex(keys, options);
               const keyNames = Object.keys(keys).join(', ');
               console.log(`  ✅ Created index on ${collection}: ${keyNames}`);
          } catch (error) {
               if (error.code === 85) {
                    // Index already exists
                    const keyNames = Object.keys(keys).join(', ');
                    console.log(`  ℹ️  Index already exists on ${collection}: ${keyNames}`);
               } else {
                    console.error(`  ❌ Failed to create index on ${collection}:`, error.message);
                    throw error;
               }
          }
     }

     /**
      * Validate database connection and collections
      * @returns {Promise<object>}
      */
     async validateDatabase() {
          try {
               const db = mongoose.connection.db;

               // Check database stats
               const stats = await db.stats();

               // List collections
               const collections = await db.listCollections().toArray();

               // Check indexes
               const indexInfo = {};
               for (const collection of collections) {
                    const indexes = await db.collection(collection.name).indexes();
                    indexInfo[collection.name] = indexes.length;
               }

               return {
                    isValid: true,
                    stats: {
                         collections: stats.collections,
                         dataSize: stats.dataSize,
                         storageSize: stats.storageSize,
                         indexes: stats.indexes
                    },
                    collections: collections.map(c => c.name),
                    indexCounts: indexInfo
               };
          } catch (error) {
               console.error('❌ Database validation error:', error);
               return {
                    isValid: false,
                    error: error.message
               };
          }
     }
}

module.exports = new DatabaseConfig();