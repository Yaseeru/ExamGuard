require('dotenv').config();
const app = require('./app');
const databaseConfig = require('./config/database');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('='.repeat(50));
console.log('ExamGuard Backend Starting...');
console.log('='.repeat(50));
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);
console.log(`Host: ${HOST}`);
console.log(`MongoDB URI: ${process.env.MONGODB_URI ? 'Set' : 'NOT SET'}`);
console.log(`JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'NOT SET'}`);
console.log('='.repeat(50));

// Connect to database using the enhanced configuration
const initializeDatabase = async () => {
     try {
          console.log('Attempting to connect to MongoDB...');
          await databaseConfig.connect();
          console.log('✅ MongoDB connected successfully');

          // Create indexes for performance optimization
          console.log('Creating database indexes...');
          await databaseConfig.createIndexes();
          console.log('✅ Database indexes created');

          // Validate database setup
          console.log('Validating database setup...');
          const validation = await databaseConfig.validateDatabase();
          if (validation.isValid) {
               console.log('✅ Database validation successful');
               console.log(`📊 Collections: ${validation.collections.join(', ')}`);
          } else {
               console.warn('⚠️  Database validation issues:', validation.error);
          }
     } catch (error) {
          console.error('❌ Database initialization failed:', error.message);
          console.error('Full error:', error);
          // Don't exit - let the app start anyway for health checks
          console.warn('⚠️  Starting server without database connection...');
     }
};

// Initialize database
initializeDatabase();

// Start timer service for exam auto-submission
const timerService = require('./services/timerService');
const sessionService = require('./services/sessionService');

const server = app.listen(PORT, HOST, () => {
     console.log('='.repeat(50));
     console.log(`✅ Server running on ${HOST}:${PORT}`);
     console.log(`🌐 Health check: http://${HOST}:${PORT}/api/health`);
     console.log('='.repeat(50));

     // Start timer service after server starts
     try {
          timerService.start();
          console.log('✅ Timer service started');
     } catch (error) {
          console.error('❌ Timer service failed to start:', error.message);
     }

     // Session service starts automatically via constructor
     console.log('✅ Session service initialized');
});

// Handle server errors
server.on('error', (error) => {
     console.error('❌ Server error:', error);
     if (error.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use`);
     }
     process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
     console.log('SIGTERM received, shutting down gracefully');
     server.close(() => {
          console.log('Server closed');
     });
     timerService.stop();
     sessionService.shutdown();
     await databaseConfig.disconnect();
     process.exit(0);
});

process.on('SIGINT', async () => {
     console.log('SIGINT received, shutting down gracefully');
     server.close(() => {
          console.log('Server closed');
     });
     timerService.stop();
     sessionService.shutdown();
     await databaseConfig.disconnect();
     process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
     console.error('❌ Uncaught Exception:', error);
     process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
     console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;