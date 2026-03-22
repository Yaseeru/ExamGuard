#!/usr/bin/env node

/**
 * Production Deployment Script for ExamGuard Backend
 * 
 * This script handles the production deployment process including:
 * - Environment validation
 * - Database setup and migration
 * - Health checks
 * - Post-deployment verification
 */

const mongoose = require('mongoose');
const ProductionConfig = require('../config/production');
const DatabaseConfig = require('../config/database');
require('dotenv').config({ path: '.env.production' });

class DeploymentManager {
     constructor() {
          this.config = ProductionConfig;
          this.deploymentSteps = [
               { name: 'Environment Validation', fn: this.validateEnvironment },
               { name: 'Database Connection', fn: this.connectDatabase },
               { name: 'Database Migration', fn: this.runMigrations },
               { name: 'Index Creation', fn: this.createIndexes },
               { name: 'Admin User Setup', fn: this.setupAdminUser },
               { name: 'Health Check', fn: this.performHealthCheck },
               { name: 'Cleanup', fn: this.cleanup }
          ];
     }

     /**
      * Run the complete deployment process
      */
     async deploy() {
          console.log('🚀 Starting ExamGuard Backend Production Deployment');
          console.log('='.repeat(60));

          let currentStep = 0;
          const totalSteps = this.deploymentSteps.length;

          try {
               for (const step of this.deploymentSteps) {
                    currentStep++;
                    console.log(`\n[${currentStep}/${totalSteps}] ${step.name}...`);

                    await step.fn.call(this);
                    console.log(`✅ ${step.name} completed successfully`);
               }

               console.log('\n' + '='.repeat(60));
               console.log('🎉 Deployment completed successfully!');
               console.log('🌐 Your ExamGuard API is ready for production use.');

               this.printDeploymentSummary();

          } catch (error) {
               console.error(`\n❌ Deployment failed at step: ${this.deploymentSteps[currentStep - 1]?.name}`);
               console.error('Error:', error.message);

               if (error.stack) {
                    console.error('\nStack trace:');
                    console.error(error.stack);
               }

               console.log('\n💡 Troubleshooting tips:');
               console.log('1. Check your environment variables in .env.production');
               console.log('2. Verify MongoDB Atlas connection string and network access');
               console.log('3. Ensure all required dependencies are installed');
               console.log('4. Check the deployment logs for more details');

               process.exit(1);
          }
     }

     /**
      * Validate environment variables and configuration
      */
     async validateEnvironment() {
          // Check if we're in production mode
          if (process.env.NODE_ENV !== 'production') {
               console.warn('⚠️  NODE_ENV is not set to "production"');
          }

          // Validate required environment variables
          const requiredVars = [
               'MONGODB_URI',
               'JWT_SECRET',
               'FRONTEND_URL'
          ];

          const missingVars = requiredVars.filter(varName => !process.env[varName]);

          if (missingVars.length > 0) {
               throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
          }

          // Validate MongoDB Atlas connection string
          if (!process.env.MONGODB_URI.includes('mongodb+srv://')) {
               console.warn('⚠️  Consider using MongoDB Atlas (mongodb+srv://) for production');
          }

          // Validate JWT secret strength
          if (process.env.JWT_SECRET.length < 32) {
               console.warn('⚠️  JWT_SECRET should be at least 32 characters for production security');
          }

          // Validate frontend URL format
          if (!process.env.FRONTEND_URL.startsWith('https://')) {
               console.warn('⚠️  Frontend URL should use HTTPS in production');
          }

          console.log('   Environment variables validated');
     }

     /**
      * Connect to the production database
      */
     async connectDatabase() {
          try {
               await DatabaseConfig.connect();
               console.log('   Connected to MongoDB Atlas');

               // Test the connection
               const adminDb = mongoose.connection.db.admin();
               const result = await adminDb.ping();

               if (result.ok !== 1) {
                    throw new Error('Database ping failed');
               }

               console.log('   Database connection verified');
          } catch (error) {
               throw new Error(`Database connection failed: ${error.message}`);
          }
     }

     /**
      * Run database migrations
      */
     async runMigrations() {
          try {
               // Import migration script
               const migrationScript = require('./migrate-database');

               console.log('   Running database migrations...');
               await migrationScript.migrate();

               console.log('   Database schema updated');
          } catch (error) {
               throw new Error(`Migration failed: ${error.message}`);
          }
     }

     /**
      * Create database indexes for performance
      */
     async createIndexes() {
          try {
               await DatabaseConfig.createIndexes();
               console.log('   Database indexes created');
          } catch (error) {
               throw new Error(`Index creation failed: ${error.message}`);
          }
     }

     /**
      * Set up admin user if it doesn't exist
      */
     async setupAdminUser() {
          try {
               const User = require('../models/User');

               const adminEmail = process.env.ADMIN_EMAIL || 'admin@examguard.com';
               const adminPassword = process.env.ADMIN_PASSWORD || 'ExamGuard2024!';

               // Check if admin user already exists
               const existingAdmin = await User.findOne({ email: adminEmail });

               if (existingAdmin) {
                    console.log('   Admin user already exists');
                    return;
               }

               // Create admin user
               const adminUser = new User({
                    name: 'System Administrator',
                    email: adminEmail,
                    password: adminPassword,
                    role: 'Admin'
               });

               await adminUser.save();
               console.log(`   Admin user created: ${adminEmail}`);
               console.log('   ⚠️  Please change the default password after first login');

          } catch (error) {
               throw new Error(`Admin user setup failed: ${error.message}`);
          }
     }

     /**
      * Perform health check to verify deployment
      */
     async performHealthCheck() {
          try {
               // Test database operations
               const User = require('../models/User');
               const userCount = await User.countDocuments();
               console.log(`   Database operational (${userCount} users)`);

               // Test JWT functionality
               const jwt = require('jsonwebtoken');
               const testToken = jwt.sign({ test: true }, process.env.JWT_SECRET, { expiresIn: '1m' });
               const decoded = jwt.verify(testToken, process.env.JWT_SECRET);

               if (!decoded.test) {
                    throw new Error('JWT verification failed');
               }
               console.log('   JWT authentication system operational');

               // Test model validations
               const Course = require('../models/Course');
               const Exam = require('../models/Exam');
               const ExamAttempt = require('../models/ExamAttempt');

               console.log('   All models loaded successfully');

          } catch (error) {
               throw new Error(`Health check failed: ${error.message}`);
          }
     }

     /**
      * Cleanup and close connections
      */
     async cleanup() {
          try {
               await DatabaseConfig.disconnect();
               console.log('   Database connections closed');
          } catch (error) {
               console.warn('   Warning: Could not close database connections cleanly');
          }
     }

     /**
      * Print deployment summary
      */
     printDeploymentSummary() {
          console.log('\n📋 Deployment Summary');
          console.log('='.repeat(30));
          console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
          console.log(`Database: MongoDB Atlas`);
          console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
          console.log(`Admin Email: ${process.env.ADMIN_EMAIL || 'admin@examguard.com'}`);
          console.log(`JWT Expiration: ${process.env.JWT_EXPIRE || '7d'}`);

          console.log('\n🔗 Important URLs:');
          console.log(`Health Check: ${process.env.RENDER_EXTERNAL_URL || 'https://your-app.onrender.com'}/api/health`);
          console.log(`API Base: ${process.env.RENDER_EXTERNAL_URL || 'https://your-app.onrender.com'}/api`);

          console.log('\n⚠️  Post-Deployment Tasks:');
          console.log('1. Update frontend environment variables with API URL');
          console.log('2. Test API endpoints from frontend');
          console.log('3. Change default admin password');
          console.log('4. Set up monitoring and alerts');
          console.log('5. Configure backup schedule');
     }
}

// Run deployment if called directly
if (require.main === module) {
     const deployment = new DeploymentManager();
     deployment.deploy().catch(error => {
          console.error('Deployment failed:', error.message);
          process.exit(1);
     });
}

module.exports = DeploymentManager;