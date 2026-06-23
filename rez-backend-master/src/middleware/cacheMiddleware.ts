/**
 * Cache Middleware
 *
 * Middleware for automatic response caching on GET requests
 */

import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redisService';
import { CacheTTL } from '../config/redis';
import { generateQueryCacheKey } from '../utils/cacheHelper';
import { cacheCounter } from '../config/prometheus';
import { logger } from '../config/logger';

/**
 * Cache middleware configuration options
 */
interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  addCacheHeaders?: boolean;
}

/**
 * Create cache middleware for GET requests
 *
 * @param options - Cache configuration options
 * @returns Express middleware function
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = CacheTTL.SHORT_CACHE,
    keyPrefix = 'response',
    keyGenerator,
    condition,
    addCacheHeaders = true,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check if Redis is ready
    if (!redisService.isReady()) {
      return next();
    }

    // Check condition if provided
    if (condition && !condition(req)) {
      return next();
    }

    // Skip cache for authenticated requests (unless specifically allowed)
    // This prevents caching user-specific data
    if (req.userId && !options.condition) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator
        ? `${keyPrefix}:${keyGenerator(req)}`
        : generateCacheKey(req, keyPrefix);

      // Try to get from cache
      const cachedResponse = await redisService.get<any>(cacheKey);

      if (cachedResponse) {
        cacheCounter.inc({ operation: 'get', result: 'hit' });
        logger.info(`📦 Cache HIT (middleware): ${cacheKey}`);

        // Add cache headers
        if (addCacheHeaders) {
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Key', cacheKey);
        }

        // Return cached response
        return res.status(200).json(cachedResponse);
      }

      cacheCounter.inc({ operation: 'get', result: 'miss' });
      logger.info(`📦 Cache MISS (middleware): ${cacheKey}`);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function (data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache the response asynchronously (don't block the response)
          // P-13: Log as warning — cache write failures are non-critical
          redisService.set(cacheKey, data, ttl).catch((err) => {
            logger.warn(`[CACHE-WRITE-WARN] Failed to cache response for key ${cacheKey}:`, err);
          });
        }

        // Add cache headers
        if (addCacheHeaders) {
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Cache-Key', cacheKey);
        }

        // Call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, prefix: string): string {
  const path = req.path;
  const query = generateQueryCacheKey(req.query);
  return `${prefix}:${path}:${query}`;
}

/**
 * Middleware to add Cache-Control headers for client-side caching
 */
export function cacheControlMiddleware(maxAge: number = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only add cache control for GET requests
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    }
    next();
  };
}

/**
 * Middleware to prevent caching
 */
export function noCacheMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  };
}

/**
 * Create a custom cache key generator based on request params
 */
export function createKeyGenerator(...params: string[]) {
  return (req: Request): string => {
    const parts = params.map((param) => {
      // Check params first
      if (req.params[param]) {
        return `${param}:${req.params[param]}`;
      }
      // Then check query
      if (req.query[param]) {
        return `${param}:${req.query[param]}`;
      }
      // Then check body
      if (req.body && req.body[param]) {
        return `${param}:${req.body[param]}`;
      }
      return '';
    });

    return parts.filter(Boolean).join(':');
  };
}

/**
 * Cache invalidation middleware
 * Automatically invalidate cache on write operations (POST, PUT, DELETE, PATCH)
 */
export function cacheInvalidationMiddleware(
  patternGenerator: (req: Request) => string | string[]
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only invalidate on write operations
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to invalidate cache after successful response
    res.json = function (data: any) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Invalidate cache asynchronously (don't block the response)
        const patterns = patternGenerator(req);
        const patternArray = Array.isArray(patterns) ? patterns : [patterns];

        // P-13: Log invalidation failures as warnings — cache is best-effort
        Promise.all(
          patternArray.map((pattern) => redisService.delPattern(pattern))
        ).catch((err) => {
          logger.warn('[CACHE-INVALIDATION-WARN] cacheInvalidationMiddleware — pattern invalidation failed:', err);
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
}

export default {
  cacheMiddleware,
  cacheControlMiddleware,
  noCacheMiddleware,
  createKeyGenerator,
  cacheInvalidationMiddleware,
};