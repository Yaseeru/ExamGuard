const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
     getPerformanceMetrics,
     getDetailedMetrics,
     performanceHealthCheck
} = require('../middleware/performance');
const { cacheConfigs } = require('../middleware/cache');

const router = express.Router();

/**
 * @route   GET /api/performance/health
 * @desc    Get performance health status
 * @access  Public (for monitoring systems)
 */
router.get('/health', performanceHealthCheck);

/**
 * @route   GET /api/performance/metrics
 * @desc    Get performance metrics summary
 * @access  Admin only
 */
router.get('/metrics',
     authenticateToken,
     authorizeRoles(['Admin']),
     cacheConfigs.analytics,
     getPerformanceMetrics
);

/**
 * @route   GET /api/performance/detailed
 * @desc    Get detailed performance metrics
 * @access  Admin only
 */
router.get('/detailed',
     authenticateToken,
     authorizeRoles(['Admin']),
     getDetailedMetrics
);

module.exports = router;