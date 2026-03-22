const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { sendSuccess } = require('./utils/responseFormatter');
const { performanceMiddleware } = require('./middleware/performance');

const app = express();

// Security middleware - Configure helmet for serving frontend
app.use(helmet({
     contentSecurityPolicy: false, // Disable CSP for React app
     crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
     message: 'Too many requests from this IP, please try again later.',
     standardHeaders: true,
     legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
     origin: process.env.FRONTEND_URL || 'http://localhost:5173',
     credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Performance monitoring middleware
app.use(performanceMiddleware);

// Health check endpoint
app.get('/api/health', (req, res) => {
     sendSuccess(res, {
          status: 'OK',
          message: 'ExamGuard API is running',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
     }, 'API is healthy');
});

// Health check routes (detailed monitoring)
app.use('/health', require('./routes/health'));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/exam-attempts', require('./routes/examAttempts'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/results', require('./routes/results'));
app.use('/api/performance', require('./routes/performance'));

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
     const frontendPath = path.join(__dirname, '../frontend/dist');

     // Serve static files
     app.use(express.static(frontendPath));

     // Handle React routing - send all non-API requests to index.html
     app.get('*', (req, res) => {
          res.sendFile(path.join(frontendPath, 'index.html'));
     });
} else {
     // 404 handler for undefined routes in development
     app.use('*', notFoundHandler);
}

// Global error handling middleware
app.use(globalErrorHandler);

module.exports = app;