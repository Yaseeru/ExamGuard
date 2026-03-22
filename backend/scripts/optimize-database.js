/**
 * Database Optimization Script
 * Creates indexes and optimizes database performance for ExamGuard
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models to ensure schemas are registered
require('../models/User');
require('../models/Course');
require('../models/Exam');
require('../models/ExamAttempt');

class DatabaseOptimizer {
     constructor() {
          this.db = mongoose.connection;
     }

     async connect() {
          try {
               await mongoose.connect(process.env.MONGODB_URI);
               console.log('✅ Connected to MongoDB for optimization');
          } catch (error) {
               console.error('❌ Failed to connect to MongoDB:', error.message);
               throw error;
          }
     }

     async disconnect() {
          await mongoose.disconnect();
          console.log('🔌 Disconnected from MongoDB');
     }

     /**
      * Create performance indexes for User collection
      */
     async optimizeUserCollection() {
          console.log('🔍 Optimizing User collection...');

          const userCollection = this.db.collection('users');

          const indexes = [
               // Email lookup (already exists but ensure it's there)
               { email: 1 },

               // Role-based queries
               { role: 1 },

               // Active users lookup
               { isActive: 1 },

               // Compound index for role + active status
               { role: 1, isActive: 1 },

               // Created date for sorting/filtering
               { createdAt: -1 }
          ];

          for (const index of indexes) {
               try {
                    await userCollection.createIndex(index);
                    console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
               } catch (error) {
                    if (error.code === 85) { // Index already exists
                         console.log(`  ℹ️  Index already exists: ${JSON.stringify(index)}`);
                    } else {
                         console.error(`  ❌ Failed to create index ${JSON.stringify(index)}:`, error.message);
                    }
               }
          }
     }

     /**
      * Create performance indexes for Course collection
      */
     async optimizeCourseCollection() {
          console.log('🔍 Optimizing Course collection...');

          const courseCollection = this.db.collection('courses');

          const indexes = [
               // Lecturer's courses lookup
               { lecturerId: 1 },

               // Active courses
               { isActive: 1 },

               // Student enrollment lookup
               { enrolledStudents: 1 },

               // Compound index for lecturer + active
               { lecturerId: 1, isActive: 1 },

               // Course capacity queries
               { capacity: 1 },

               // Created date for sorting
               { createdAt: -1 },

               // Text search on title and description
               { title: 'text', description: 'text' }
          ];

          for (const index of indexes) {
               try {
                    await courseCollection.createIndex(index);
                    console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
               } catch (error) {
                    if (error.code === 85) {
                         console.log(`  ℹ️  Index already exists: ${JSON.stringify(index)}`);
                    } else {
                         console.error(`  ❌ Failed to create index ${JSON.stringify(index)}:`, error.message);
                    }
               }
          }
     }

     /**
      * Create performance indexes for Exam collection
      */
     async optimizeExamCollection() {
          console.log('🔍 Optimizing Exam collection...');

          const examCollection = this.db.collection('exams');

          const indexes = [
               // Course exams lookup
               { courseId: 1 },

               // Active exams
               { isActive: 1 },

               // Time-based queries for exam availability
               { startTime: 1 },
               { endTime: 1 },
               { startTime: 1, endTime: 1 },

               // Compound index for course + active
               { courseId: 1, isActive: 1 },

               // Compound index for time range queries
               { isActive: 1, startTime: 1, endTime: 1 },

               // Created date for sorting
               { createdAt: -1 },

               // Text search on title
               { title: 'text' }
          ];

          for (const index of indexes) {
               try {
                    await examCollection.createIndex(index);
                    console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
               } catch (error) {
                    if (error.code === 85) {
                         console.log(`  ℹ️  Index already exists: ${JSON.stringify(index)}`);
                    } else {
                         console.error(`  ❌ Failed to create index ${JSON.stringify(index)}:`, error.message);
                    }
               }
          }
     }

     /**
      * Create performance indexes for ExamAttempt collection
      */
     async optimizeExamAttemptCollection() {
          console.log('🔍 Optimizing ExamAttempt collection...');

          const examAttemptCollection = this.db.collection('examattempts');

          const indexes = [
               // Student's attempts lookup
               { studentId: 1 },

               // Exam attempts lookup
               { examId: 1 },

               // Status-based queries
               { status: 1 },

               // Compound index for exam + student (unique attempts)
               { examId: 1, studentId: 1 },

               // Compound index for student + status
               { studentId: 1, status: 1 },

               // Compound index for exam + status
               { examId: 1, status: 1 },

               // Time-based queries
               { startTime: -1 },
               { submittedAt: -1 },
               { createdAt: -1 },

               // Violation tracking
               { violationCount: 1 },

               // Performance monitoring queries
               { startTime: 1, endTime: 1 },

               // Compound index for lecturer viewing results
               { examId: 1, status: 1, submittedAt: -1 }
          ];

          for (const index of indexes) {
               try {
                    await examAttemptCollection.createIndex(index);
                    console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
               } catch (error) {
                    if (error.code === 85) {
                         console.log(`  ℹ️  Index already exists: ${JSON.stringify(index)}`);
                    } else {
                         console.error(`  ❌ Failed to create index ${JSON.stringify(index)}:`, error.message);
                    }
               }
          }
     }

     /**
      * Analyze collection statistics
      */
     async analyzeCollectionStats() {
          console.log('📊 Analyzing collection statistics...');

          const collections = ['users', 'courses', 'exams', 'examattempts'];

          for (const collectionName of collections) {
               try {
                    const collection = this.db.collection(collectionName);
                    const stats = await collection.stats();
                    const indexes = await collection.indexes();

                    console.log(`\n📋 ${collectionName.toUpperCase()} Collection Stats:`);
                    console.log(`  Documents: ${stats.count}`);
                    console.log(`  Average document size: ${Math.round(stats.avgObjSize)} bytes`);
                    console.log(`  Total size: ${Math.round(stats.size / 1024)} KB`);
                    console.log(`  Index count: ${indexes.length}`);
                    console.log(`  Index size: ${Math.round(stats.totalIndexSize / 1024)} KB`);

                    // List indexes
                    console.log('  Indexes:');
                    indexes.forEach(index => {
                         const keys = Object.keys(index.key).map(key =>
                              `${key}:${index.key[key]}`
                         ).join(', ');
                         console.log(`    - ${index.name}: {${keys}}`);
                    });

               } catch (error) {
                    console.error(`  ❌ Failed to get stats for ${collectionName}:`, error.message);
               }
          }
     }

     /**
      * Check for slow operations
      */
     async checkSlowOperations() {
          console.log('🐌 Checking for slow operations...');

          try {
               // Enable profiling for slow operations (>100ms)
               await this.db.db.runCommand({ profile: 2, slowms: 100 });
               console.log('  ✅ Enabled profiling for operations >100ms');

               // Get current slow operations
               const profileCollection = this.db.collection('system.profile');
               const slowOps = await profileCollection.find({}).sort({ ts: -1 }).limit(10).toArray();

               if (slowOps.length > 0) {
                    console.log('  📋 Recent slow operations:');
                    slowOps.forEach((op, index) => {
                         console.log(`    ${index + 1}. ${op.command?.find || op.command?.aggregate || 'Unknown'} - ${op.millis}ms`);
                    });
               } else {
                    console.log('  ✅ No recent slow operations found');
               }

          } catch (error) {
               console.error('  ❌ Failed to check slow operations:', error.message);
          }
     }

     /**
      * Run complete database optimization
      */
     async optimize() {
          console.log('🚀 Starting database optimization...\n');

          try {
               await this.connect();

               // Create indexes for all collections
               await this.optimizeUserCollection();
               await this.optimizeCourseCollection();
               await this.optimizeExamCollection();
               await this.optimizeExamAttemptCollection();

               // Analyze performance
               await this.analyzeCollectionStats();
               await this.checkSlowOperations();

               console.log('\n✅ Database optimization completed successfully!');

          } catch (error) {
               console.error('\n❌ Database optimization failed:', error.message);
               throw error;
          } finally {
               await this.disconnect();
          }
     }
}

// Run optimization if called directly
if (require.main === module) {
     const optimizer = new DatabaseOptimizer();

     optimizer.optimize()
          .then(() => {
               console.log('🎉 Optimization process completed');
               process.exit(0);
          })
          .catch((error) => {
               console.error('💥 Optimization process failed:', error);
               process.exit(1);
          });
}

module.exports = DatabaseOptimizer;