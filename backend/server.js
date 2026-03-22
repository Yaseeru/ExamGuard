require('dotenv').config();
const app = require('./app');
const databaseConfig = require('./config/database');

// Connect to database using the enhanced configuration
const initializeDatabase = async () => {
     try {
          await databaseConfig.connect();

          // Create indexes for performance optimization
          await databaseConfig.createIndexes();

          // Validate database setup
          const validation = await databaseConfig.validateDatabase();
          if (validation.isValid) {
               console.log('✅ Database validation successful');
               console.log(`📊 Collections: ${validation.collections.join(', ')}`);
          } else {
               console.warn('⚠️  Database validation issues:', validation.error);
          }
     } catch (error) {
          console.error('❌ Database initialization failed:', error);
          process.exit(1);
     }
};

// Initialize database
initializeDatabase();

// Health check endpoint (handled by app.js)

// API routes (handled by app.js)

// Error handling middleware (handled by app.js)

// 404 handler (handled by app.js)

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Start timer service for exam auto-submission
const timerService = require('./services/timerService');
const sessionService = require('./services/sessionService');

app.listen(PORT, HOST, () => {
     console.log(`Server running on ${HOST}:${PORT}`);

     // Start timer service after server starts
     timerService.start();

     // Session service starts automatically via constructor
     console.log('Session service initialized');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
     console.log('SIGTERM received, shutting down gracefully');
     timerService.stop();
     sessionService.shutdown();
     await databaseConfig.disconnect();
     process.exit(0);
});

process.on('SIGINT', async () => {
     console.log('SIGINT received, shutting down gracefully');
     timerService.stop();
     sessionService.shutdown();
     await databaseConfig.disconnect();
     process.exit(0);
});

module.exports = app;