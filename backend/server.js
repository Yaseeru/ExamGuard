const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

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

// MongoDB connection
const connectDB = async () => {
     try {
          const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/examguard', {
               useNewUrlParser: true,
               useUnifiedTopology: true,
          });
          console.log(`MongoDB Connected: ${conn.connection.host}`);
     } catch (error) {
          console.error('Database connection error:', error);
          process.exit(1);
     }
};

// Connect to database
connectDB();

// Health check endpoint
app.get('/api/health', (req, res) => {
     res.json({
          status: 'OK',
          message: 'ExamGuard API is running',
          timestamp: new Date().toISOString()
     });
});

// API routes will be added here
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));
// app.use('/api/exams', require('./routes/exams'));
// app.use('/api/exam-attempts', require('./routes/examAttempts'));

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
});

module.exports = app;