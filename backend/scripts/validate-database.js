#!/usr/bin/env node

/**
 * Database Validation and Setup Script for ExamGuard
 * 
 * This script validates the MongoDB connection, creates necessary indexes,
 * and performs database health checks for production deployment.
 */

const mongoose = require('mongoose');
const DatabaseConfig = require('../config/database');

// Import models to ensure they're registered
require('../models/User');
require('../models/Course');
require('../models/Exam');
require('../models/ExamAttempt');

class DatabaseValidator {
     constructor() {
          this.results = {
               connection: false,
               indexes: false,
               collections: false,
               validation: false,
               performance: false
          };
     }

     /**
      * Run complete database validation
      */
     async validate() {
          console.log('🔍 Starting ExamGuard Database Validation...\n');

          try {
               // Test database connection
               await this.testConnection();

               // Validate collections and schemas
               await this.validateCollections();

               // Create and verify indexes
               await this.validateIndexes();

               // Run performance tests
               await this.testPerformance();

               // Generate validation report
               this.generateReport();

          } catch (error) {
               console.error('❌ Database validation failed:', error.message);
               process.exit(1);
          } finally {
               await DatabaseConfig.disconnect();
          }
     }

     /**
      * Test database connection
      */
     async testConnection() {
          console.log('📡 Testing database connection...');

          try {
               await DatabaseConfig.connect();

               const status = DatabaseConfig.getStatus();
               console.log(`✅ Connected to: ${status.host}`);
               console.log(`📊 Database: ${status.name}`);
               console.log(`🔗 Connection state: ${this.getConnectionState(status.readyState)}`);

               this.results.connection = true;
          } catch (error) {
               console.error('❌ Connection failed:', error.message);
               throw error;
          }
     }

     /**
      * Validate database collections and schemas
      */
     async validateCollections() {
          console.log('\n📋 Validating collections and schemas...');

          try {
               const db = mongoose.connection.db;
               const collections = await db.listCollections().toArray();
               const collectionNames = collections.map(c => c.name);

               console.log(`📁 Found ${collections.length} collections:`, collectionNames);

               // Expected collections
               const expectedCollections = ['users', 'courses', 'exams', 'examattempts'];
               const missingCollections = expectedCollections.filter(
                    name => !collectionNames.includes(name)
               );

               if (missingCollections.length > 0) {
                    console.log(`⚠️  Missing collections: ${missingCollections.join(', ')}`);
                    console.log('💡 Collections will be created automatically when data is inserted');
               } else {
                    console.log('✅ All expected collections exist');
               }

               // Validate schema by testing model operations
               await this.validateSchemas();

               this.results.collections = true;
          } catch (error) {
               console.error('❌ Collection validation failed:', error.message);
               throw error;
          }
     }

     /**
      * Validate Mongoose schemas
      */
     async validateSchemas() {
          console.log('🔍 Validating Mongoose schemas...');

          const User = mongoose.model('User');
          const Course = mongoose.model('Course');
          const Exam = mongoose.model('Exam');
          const ExamAttempt = mongoose.model('ExamAttempt');

          // Test schema validation without saving
          try {
               // Test User schema
               const testUser = new User({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'hashedpassword',
                    role: 'Student'
               });
               await testUser.validate();

               // Test Course schema
               const testCourse = new Course({
                    title: 'Test Course',
                    description: 'Test course description',
                    lecturerId: new mongoose.Types.ObjectId(),
                    capacity: 50
               });
               await testCourse.validate();

               // Test Exam schema
               const testExam = new Exam({
                    title: 'Test Exam',
                    courseId: new mongoose.Types.ObjectId(),
                    duration: 60,
                    startTime: new Date(),
                    endTime: new Date(Date.now() + 3600000),
                    questions: [{
                         questionText: 'Test question?',
                         options: ['A', 'B', 'C', 'D'],
                         correctAnswer: 0
                    }]
               });
               await testExam.validate();

               // Test ExamAttempt schema
               const testAttempt = new ExamAttempt({
                    examId: new mongoose.Types.ObjectId(),
                    studentId: new mongoose.Types.ObjectId(),
                    timeRemaining: 3600
               });
               await testAttempt.validate();

               console.log('✅ All schemas validated successfully');
          } catch (error) {
               console.error('❌ Schema validation failed:', error.message);
               throw error;
          }
     }

     /**
      * Create and validate database indexes
      */
     async validateIndexes() {
          console.log('\n🔍 Creating and validating database indexes...');

          try {
               // Create indexes using DatabaseConfig
               await DatabaseConfig.createIndexes();

               // Verify indexes were created
               const db = mongoose.connection.db;
               const collections = ['users', 'courses', 'exams', 'examattempts'];

               for (const collectionName of collections) {
                    try {
                         const indexes = await db.collection(collectionName).indexes();
                         console.log(`📊 ${collectionName}: ${indexes.length} indexes`);

                         // Log index details for verification
                         indexes.forEach(index => {
                              const keys = Object.keys(index.key).join(', ');
                              const unique = index.unique ? ' (unique)' : '';
                              console.log(`   - ${keys}${unique}`);
                         });
                    } catch (error) {
                         console.log(`⚠️  Collection ${collectionName} not found (will be created on first use)`);
                    }
               }

               this.results.indexes = true;
          } catch (error) {
               console.error('❌ Index validation failed:', error.message);
               throw error;
          }
     }

     /**
      * Test database performance
      */
     async testPerformance() {
          console.log('\n⚡ Testing database performance...');

          try {
               const db = mongoose.connection.db;

               // Test connection latency
               const startTime = Date.now();
               await db.admin().ping();
               const latency = Date.now() - startTime;

               console.log(`📊 Connection latency: ${latency}ms`);

               // Get database stats
               const stats = await db.stats();
               console.log(`💾 Database size: ${this.formatBytes(stats.dataSize)}`);
               console.log(`🗂️  Storage size: ${this.formatBytes(stats.storageSize)}`);
               console.log(`📈 Collections: ${stats.collections}`);
               console.log(`🔍 Indexes: ${stats.indexes}`);

               // Performance thresholds
               if (latency > 1000) {
                    console.warn('⚠️  High latency detected (>1000ms)');
               } else if (latency > 500) {
                    console.warn('⚠️  Moderate latency detected (>500ms)');
               } else {
                    console.log('✅ Good connection performance');
               }

               this.results.performance = true;
          } catch (error) {
               console.error('❌ Performance test failed:', error.message);
               throw error;
          }
     }

     /**
      * Generate validation report
      */
     generateReport() {
          console.log('\n📋 Database Validation Report');
          console.log('================================');

          const checks = [
               { name: 'Database Connection', status: this.results.connection },
               { name: 'Collections & Schemas', status: this.results.collections },
               { name: 'Database Indexes', status: this.results.indexes },
               { name: 'Performance Tests', status: this.results.performance }
          ];

          checks.forEach(check => {
               const status = check.status ? '✅ PASS' : '❌ FAIL';
               console.log(`${status} ${check.name}`);
          });

          const allPassed = checks.every(check => check.status);

          console.log('\n================================');
          if (allPassed) {
               console.log('🎉 All database validation checks passed!');
               console.log('💡 Your database is ready for production use.');
          } else {
               console.log('❌ Some validation checks failed.');
               console.log('💡 Please review the errors above and fix them before deployment.');
               process.exit(1);
          }

          this.results.validation = allPassed;
     }

     /**
      * Get human-readable connection state
      */
     getConnectionState(readyState) {
          const states = {
               0: 'Disconnected',
               1: 'Connected',
               2: 'Connecting',
               3: 'Disconnecting'
          };
          return states[readyState] || 'Unknown';
     }

     /**
      * Format bytes to human-readable format
      */
     formatBytes(bytes) {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
     }
}

// Run validation if script is executed directly
if (require.main === module) {
     const validator = new DatabaseValidator();
     validator.validate().catch(error => {
          console.error('💥 Validation script failed:', error);
          process.exit(1);
     });
}

module.exports = DatabaseValidator;