#!/usr/bin/env node

/**
 * Database Migration Script for ExamGuard
 * 
 * This script handles database migrations, data transformations,
 * and initial setup for production deployments.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const DatabaseConfig = require('../config/database');

// Import models
require('../models/User');
require('../models/Course');
require('../models/Exam');
require('../models/ExamAttempt');

class DatabaseMigrator {
     constructor() {
          this.migrations = [
               { version: '1.0.0', name: 'Initial Setup', handler: this.migration_1_0_0.bind(this) },
               { version: '1.0.1', name: 'Create Admin User', handler: this.migration_1_0_1.bind(this) },
               { version: '1.0.2', name: 'Update Indexes', handler: this.migration_1_0_2.bind(this) }
          ];
     }

     /**
      * Run all pending migrations
      */
     async migrate() {
          console.log('🚀 Starting ExamGuard Database Migration...\n');

          try {
               await DatabaseConfig.connect();

               // Check current migration version
               const currentVersion = await this.getCurrentVersion();
               console.log(`📊 Current database version: ${currentVersion || 'None'}`);

               // Run pending migrations
               const pendingMigrations = this.getPendingMigrations(currentVersion);

               if (pendingMigrations.length === 0) {
                    console.log('✅ Database is up to date. No migrations needed.');
                    return;
               }

               console.log(`🔄 Running ${pendingMigrations.length} pending migrations...\n`);

               for (const migration of pendingMigrations) {
                    await this.runMigration(migration);
               }

               console.log('\n🎉 All migrations completed successfully!');

          } catch (error) {
               console.error('❌ Migration failed:', error.message);
               throw error;
          } finally {
               await DatabaseConfig.disconnect();
          }
     }

     /**
      * Get current database version
      */
     async getCurrentVersion() {
          try {
               const db = mongoose.connection.db;
               const migrationCollection = db.collection('migrations');
               const latestMigration = await migrationCollection
                    .findOne({}, { sort: { createdAt: -1 } });

               return latestMigration ? latestMigration.version : null;
          } catch (error) {
               // Collection doesn't exist yet
               return null;
          }
     }

     /**
      * Get pending migrations
      */
     getPendingMigrations(currentVersion) {
          if (!currentVersion) {
               return this.migrations;
          }

          const currentIndex = this.migrations.findIndex(m => m.version === currentVersion);
          return this.migrations.slice(currentIndex + 1);
     }

     /**
      * Run a single migration
      */
     async runMigration(migration) {
          console.log(`🔄 Running migration ${migration.version}: ${migration.name}`);

          try {
               await migration.handler();
               await this.recordMigration(migration);
               console.log(`✅ Migration ${migration.version} completed`);
          } catch (error) {
               console.error(`❌ Migration ${migration.version} failed:`, error.message);
               throw error;
          }
     }

     /**
      * Record completed migration
      */
     async recordMigration(migration) {
          const db = mongoose.connection.db;
          const migrationCollection = db.collection('migrations');

          await migrationCollection.insertOne({
               version: migration.version,
               name: migration.name,
               createdAt: new Date()
          });
     }

     /**
      * Migration 1.0.0: Initial database setup
      */
     async migration_1_0_0() {
          console.log('  📋 Creating initial database structure...');

          // Create indexes
          await DatabaseConfig.createIndexes();
          console.log('  ✅ Database indexes created');

          // Validate database structure
          const validation = await DatabaseConfig.validateDatabase();
          if (!validation.isValid) {
               throw new Error('Database validation failed');
          }
          console.log('  ✅ Database structure validated');
     }

     /**
      * Migration 1.0.1: Create default admin user
      */
     async migration_1_0_1() {
          console.log('  👤 Creating default admin user...');

          const User = mongoose.model('User');

          // Check if admin user already exists
          const existingAdmin = await User.findOne({ role: 'Admin' });
          if (existingAdmin) {
               console.log('  ℹ️  Admin user already exists, skipping creation');
               return;
          }

          // Create default admin user
          const adminPassword = process.env.ADMIN_PASSWORD || 'ExamGuard2024!';
          const hashedPassword = await bcrypt.hash(adminPassword, 12);

          const adminUser = new User({
               name: 'System Administrator',
               email: process.env.ADMIN_EMAIL || 'admin@examguard.com',
               password: hashedPassword,
               role: 'Admin',
               isActive: true
          });

          await adminUser.save();
          console.log('  ✅ Default admin user created');
          console.log(`  📧 Email: ${adminUser.email}`);

          if (!process.env.ADMIN_PASSWORD) {
               console.log(`  🔑 Password: ${adminPassword}`);
               console.log('  ⚠️  Please change the default password after first login!');
          }
     }

     /**
      * Migration 1.0.2: Update database indexes
      */
     async migration_1_0_2() {
          console.log('  🔍 Updating database indexes...');

          const db = mongoose.connection.db;

          // Add text search indexes for better search functionality
          try {
               await db.collection('courses').createIndex(
                    { title: 'text', description: 'text' },
                    { name: 'course_text_search' }
               );
               console.log('  ✅ Course text search index created');
          } catch (error) {
               if (error.code !== 85) { // Index already exists
                    throw error;
               }
               console.log('  ℹ️  Course text search index already exists');
          }

          try {
               await db.collection('exams').createIndex(
                    { title: 'text' },
                    { name: 'exam_text_search' }
               );
               console.log('  ✅ Exam text search index created');
          } catch (error) {
               if (error.code !== 85) { // Index already exists
                    throw error;
               }
               console.log('  ℹ️  Exam text search index already exists');
          }

          // Add compound indexes for better query performance
          try {
               await db.collection('examattempts').createIndex(
                    { examId: 1, studentId: 1, status: 1 },
                    { name: 'exam_student_status_compound' }
               );
               console.log('  ✅ ExamAttempt compound index created');
          } catch (error) {
               if (error.code !== 85) { // Index already exists
                    throw error;
               }
               console.log('  ℹ️  ExamAttempt compound index already exists');
          }
     }

     /**
      * Rollback last migration (for development/testing)
      */
     async rollback() {
          console.log('🔄 Rolling back last migration...');

          try {
               await DatabaseConfig.connect();

               const db = mongoose.connection.db;
               const migrationCollection = db.collection('migrations');

               const lastMigration = await migrationCollection
                    .findOne({}, { sort: { createdAt: -1 } });

               if (!lastMigration) {
                    console.log('ℹ️  No migrations to rollback');
                    return;
               }

               console.log(`🔄 Rolling back migration ${lastMigration.version}: ${lastMigration.name}`);

               // Remove migration record
               await migrationCollection.deleteOne({ _id: lastMigration._id });

               console.log('✅ Migration rollback completed');
               console.log('⚠️  Note: Data changes are not automatically reverted');

          } catch (error) {
               console.error('❌ Rollback failed:', error.message);
               throw error;
          } finally {
               await DatabaseConfig.disconnect();
          }
     }

     /**
      * Reset database (DANGER: removes all data)
      */
     async reset() {
          console.log('⚠️  WARNING: This will delete ALL database data!');

          // In production, require explicit confirmation
          if (process.env.NODE_ENV === 'production') {
               if (process.env.CONFIRM_RESET !== 'YES_DELETE_ALL_DATA') {
                    console.log('❌ Database reset cancelled. Set CONFIRM_RESET=YES_DELETE_ALL_DATA to proceed.');
                    return;
               }
          }

          try {
               await DatabaseConfig.connect();

               const db = mongoose.connection.db;

               // Drop all collections
               const collections = await db.listCollections().toArray();
               for (const collection of collections) {
                    await db.collection(collection.name).drop();
                    console.log(`🗑️  Dropped collection: ${collection.name}`);
               }

               console.log('✅ Database reset completed');

          } catch (error) {
               console.error('❌ Database reset failed:', error.message);
               throw error;
          } finally {
               await DatabaseConfig.disconnect();
          }
     }
}

// Command line interface
if (require.main === module) {
     const command = process.argv[2] || 'migrate';
     const migrator = new DatabaseMigrator();

     switch (command) {
          case 'migrate':
               migrator.migrate().catch(error => {
                    console.error('💥 Migration failed:', error);
                    process.exit(1);
               });
               break;

          case 'rollback':
               migrator.rollback().catch(error => {
                    console.error('💥 Rollback failed:', error);
                    process.exit(1);
               });
               break;

          case 'reset':
               migrator.reset().catch(error => {
                    console.error('💥 Reset failed:', error);
                    process.exit(1);
               });
               break;

          default:
               console.log('Usage: node migrate-database.js [migrate|rollback|reset]');
               process.exit(1);
     }
}

module.exports = DatabaseMigrator;