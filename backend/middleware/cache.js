const NodeCache = require('node-cache');

/**
 * Caching Middleware for ExamGuard API
 * Implements intelligent caching strategies for frequently accessed data
 * Supports TTL, cache invalidation, and role-based caching
 */

class CacheManager {
     constructor() {
          // Main cache instance with default TTL of 5 minutes
          this.cache = new NodeCache({
               stdTTL: 300, // 5 minutes default
               checkperiod: 60, // Check for expired keys every minute
               useClones: false, // Better performance, but be careful with object mutations
               deleteOnExpire: true,
               maxKeys: 1000 // Prevent memory overflow
          });

          // Short-term cache for frequently changing data (1 minute)
          this.shortCache = new NodeCache({
               stdTTL: 60,
               checkperiod: 30,
               useClones: false,
               maxKeys: 500
          });

          // Long-term cache for rarely changing data (30 minutes)
          this.longCache = new NodeCache({
               stdTTL: 1800,
               checkperiod: 300,
               useClones: false,
               maxKeys: 200
          });

          this.setupEventListeners();
     }

     setupEventListeners() {
          // Log cache statistics periodically
          setInterval(() => {
               const stats = this.getStats();
               if (process.env.NODE_ENV === 'development') {
                    console.log('📊 Cache Stats:', {
                         main: `${stats.main.keys} keys, ${stats.main.hits} hits, ${stats.main.misses} misses`,
                         short: `${stats.short.keys} keys, ${stats.short.hits} hits, ${stats.short.misses} misses`,
                         long: `${stats.long.keys} keys, ${stats.long.hits} hits, ${stats.long.misses} misses`
                    });
               }
          }, 300000); // Every 5 minutes
     }

     /**
      * Generate cache key based on request parameters
      */
     generateKey(prefix, userId, role, params = {}) {
          const paramString = Object.keys(params)
               .sort()
               .map(key => `${key}:${params[key]}`)
               .join('|');

          return `${prefix}:${role}:${userId}:${paramString}`;
     }

     /**
      * Get cached data
      */
     get(key, cacheType = 'main') {
          const cache = this.getCacheInstance(cacheType);
          return cache.get(key);
     }

     /**
      * Set cached data
      */
     set(key, data, ttl = null, cacheType = 'main') {
          const cache = this.getCacheInstance(cacheType);
          if (ttl) {
               return cache.set(key, data, ttl);
          }
          return cache.set(key, data);
     }

     /**
      * Delete cached data
      */
     del(key, cacheType = 'main') {
          const cache = this.getCacheInstance(cacheType);
          return cache.del(key);
     }

     /**
      * Clear cache by pattern
      */
     clearPattern(pattern) {
          const allCaches = [this.cache, this.shortCache, this.longCache];
          let deletedCount = 0;

          allCaches.forEach(cache => {
               const keys = cache.keys();
               const matchingKeys = keys.filter(key => key.includes(pattern));
               matchingKeys.forEach(key => {
                    cache.del(key);
                    deletedCount++;
               });
          });

          return deletedCount;
     }

     /**
      * Get cache instance by type
      */
     getCacheInstance(type) {
          switch (type) {
               case 'short': return this.shortCache;
               case 'long': return this.longCache;
               default: return this.cache;
          }
     }

     /**
      * Get cache statistics
      */
     getStats() {
          return {
               main: this.cache.getStats(),
               short: this.shortCache.getStats(),
               long: this.longCache.getStats()
          };
     }

     /**
      * Flush all caches
      */
     flushAll() {
          this.cache.flushAll();
          this.shortCache.flushAll();
          this.longCache.flushAll();
     }
}

// Global cache manager instance
const cacheManager = new CacheManager();

/**
 * Middleware factory for caching responses
 */
function createCacheMiddleware(options = {}) {
     const {
          ttl = 300, // 5 minutes default
          cacheType = 'main',
          keyGenerator = null,
          condition = null,
          invalidatePatterns = []
     } = options;

     return (req, res, next) => {
          // Skip caching for non-GET requests
          if (req.method !== 'GET') {
               return next();
          }

          // Skip caching if condition is not met
          if (condition && !condition(req)) {
               return next();
          }

          // Generate cache key
          const key = keyGenerator
               ? keyGenerator(req)
               : cacheManager.generateKey(
                    req.route.path,
                    req.user?.id || 'anonymous',
                    req.user?.role || 'guest',
                    { ...req.query, ...req.params }
               );

          // Try to get cached response
          const cachedResponse = cacheManager.get(key, cacheType);
          if (cachedResponse) {
               // Add cache hit header
               res.set('X-Cache', 'HIT');
               res.set('X-Cache-Key', key);
               return res.json(cachedResponse);
          }

          // Store original json method
          const originalJson = res.json;

          // Override json method to cache response
          res.json = function (data) {
               // Only cache successful responses
               if (res.statusCode >= 200 && res.statusCode < 300) {
                    cacheManager.set(key, data, ttl, cacheType);
               }

               // Add cache miss header
               res.set('X-Cache', 'MISS');
               res.set('X-Cache-Key', key);

               // Call original json method
               return originalJson.call(this, data);
          };

          next();
     };
}

/**
 * Cache invalidation middleware
 */
function createInvalidationMiddleware(patterns) {
     return (req, res, next) => {
          // Store original methods
          const originalJson = res.json;
          const originalSend = res.send;

          // Override response methods to invalidate cache on successful operations
          const invalidateCache = () => {
               if (res.statusCode >= 200 && res.statusCode < 300) {
                    patterns.forEach(pattern => {
                         const deletedCount = cacheManager.clearPattern(pattern);
                         if (process.env.NODE_ENV === 'development' && deletedCount > 0) {
                              console.log(`🗑️  Invalidated ${deletedCount} cache entries matching: ${pattern}`);
                         }
                    });
               }
          };

          res.json = function (data) {
               invalidateCache();
               return originalJson.call(this, data);
          };

          res.send = function (data) {
               invalidateCache();
               return originalSend.call(this, data);
          };

          next();
     };
}

/**
 * Predefined cache configurations for common endpoints
 */
const cacheConfigs = {
     // Course listings - cache for 5 minutes
     courses: createCacheMiddleware({
          ttl: 300,
          cacheType: 'main',
          condition: (req) => !req.query.search // Don't cache search results
     }),

     // Course details - cache for 10 minutes
     courseDetails: createCacheMiddleware({
          ttl: 600,
          cacheType: 'main'
     }),

     // Exam listings - cache for 2 minutes (more dynamic)
     exams: createCacheMiddleware({
          ttl: 120,
          cacheType: 'short'
     }),

     // Exam details for students - cache for 5 minutes
     examDetails: createCacheMiddleware({
          ttl: 300,
          cacheType: 'main',
          condition: (req) => req.user?.role === 'Student' // Only cache for students
     }),

     // Results - cache for 15 minutes
     results: createCacheMiddleware({
          ttl: 900,
          cacheType: 'main'
     }),

     // User profiles - cache for 30 minutes
     userProfiles: createCacheMiddleware({
          ttl: 1800,
          cacheType: 'long'
     }),

     // Statistics and analytics - cache for 10 minutes
     analytics: createCacheMiddleware({
          ttl: 600,
          cacheType: 'main'
     })
};

/**
 * Cache invalidation patterns for different operations
 */
const invalidationPatterns = {
     courseOperations: ['courses:', 'exams:', 'results:'],
     examOperations: ['exams:', 'results:'],
     userOperations: ['users:', 'courses:', 'exams:'],
     attemptOperations: ['results:', 'analytics:']
};

module.exports = {
     cacheManager,
     createCacheMiddleware,
     createInvalidationMiddleware,
     cacheConfigs,
     invalidationPatterns
};