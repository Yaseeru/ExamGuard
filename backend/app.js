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

// CORS configuration
app.use(cors({
     origin: process.env.FRONTEND_URL || 'http://localhost:5173',
     credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files in production BEFORE rate limiting
if (process.env.NODE_ENV === 'production') {
     const fs = require('fs');
     const frontendPath = path.join(__dirname, '../frontend/dist');
     const indexPath = path.join(frontendPath, 'index.html');

     console.log('Production mode: Checking frontend build...');
     console.log('Frontend path:', frontendPath);
     console.log('Index.html path:', indexPath);

     // Check if frontend build exists
     if (fs.existsSync(frontendPath)) {
          console.log('✅ Frontend dist folder found');

          if (fs.existsSync(indexPath)) {
               console.log('✅ index.html found');

               // Serve static files with caching
               app.use(express.static(frontendPath, {
                    maxAge: '1d', // Cache static assets for 1 day
                    etag: true,
                    lastModified: true
               }));
          } else {
               console.error('❌ index.html NOT found at:', indexPath);
          }
     } else {
          console.error('❌ Frontend dist folder NOT found at:', frontendPath);
     }
}

// Rate limiting - ONLY for API routes
const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: process.env.NODE_ENV === 'production' ? 500 : 1000, // Increased for production
     message: 'Too many requests from this IP, please try again later.',
     standardHeaders: true,
     legacyHeaders: false,
     skip: (req) => {
          // Skip rate limiting for static files
          return !req.path.startsWith('/api') && !req.path.startsWith('/health');
     }
});
app.use(limiter);

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

// Handle React routing - send all non-API requests to index.html
if (process.env.NODE_ENV === 'production') {
     const indexPath = path.join(__dirname, '../frontend/dist/index.html');
     app.get('*', (req, res) => {
          res.sendFile(indexPath, (err) => {
               if (err) {
                    console.error('Error sending index.html:', err);
                    res.status(500).json({
                         error: 'Failed to load application',
                         message: 'Frontend build not found or corrupted'
                    });
               }
          });
     });
} else {
     // 404 handler for undefined routes in development
     app.use('*', notFoundHandler);
}

// Global error handling middleware
app.use(globalErrorHandler);

module.exports = app;