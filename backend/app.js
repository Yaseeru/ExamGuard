const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
     message: 'Too many requests from this IP, please try again later.'
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

// Health check endpoint
app.get('/api/health', (req, res) => {
     res.json({
          status: 'OK',
          message: 'ExamGuard API is running',
          timestamp: new Date().toISOString()
     });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));

// Error handling middleware
app.use((err, req, res, next) => {
     console.error(err.stack);
     res.status(500).json({
          error: {
               code: 'INTERNAL_SERVER_ERROR',
               message: 'Something went wrong!',
               timestamp: new Date().toISOString()
          }
     });
});

// 404 handler
app.use('*', (req, res) => {
     res.status(404).json({
          error: {
               code: 'NOT_FOUND',
               message: 'API endpoint not found',
               timestamp: new Date().toISOString()
          }
     });
});

module.exports = app;