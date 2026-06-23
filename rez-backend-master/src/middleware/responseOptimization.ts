/**
 * Response Optimization Middleware
 * Phase 5: Week 1-2 - API Response Optimization
 *
 * Features:
 * - Response compression (gzip)
 * - Pagination support
 * - Field filtering (?fields=id,name,price)
 * - ETag caching
 * - Request deduplication
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { logger } from '../config/logger';

/**
 * Calculate ETag for response
 */
function calculateETag(data: any): string {
  const hash = createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

/**
 * Pagination helper
 * Usage: ?page=1&limit=20
 */
export function getPagination(req: Request): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20)); // Cap at 100
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Field filtering helper
 * Usage: ?fields=id,name,price
 */
export function getFieldProjection(req: Request): Record<string, number> | null {
  const fields = req.query.fields as string;
  if (!fields) return null;

  return fields.split(',').reduce(
    (acc, field) => {
      acc[field.trim()] = 1;
      return acc;
    },
    { _id: 1 } as Record<string, number>,
  );
}

/**
 * Response optimization middleware
 * Handles compression, ETag, and pagination
 */
export function responseOptimization(req: Request, res: Response, next: NextFunction) {
  // Store original json method
  const originalJson = res.json;

  res.json = function (data: any) {
    const startTime = Date.now();

    // Add pagination metadata if query includes pagination
    let responseData = data;
    if (req.query.page || req.query.limit) {
      const { page, limit, skip } = getPagination(req);

      // If data is array, add pagination metadata
      if (Array.isArray(data)) {
        responseData = {
          data,
          pagination: {
            page,
            limit,
            skip,
            total: data.length, // Replace with actual count from aggregate
          },
        };
      }
    }

    // Calculate ETag
    const etag = calculateETag(responseData);
    res.set('ETag', etag);
    res.set('X-Response-Time', `${Date.now() - startTime}ms`);

    // Check If-None-Match header
    if (req.get('If-None-Match') === etag) {
      logger.debug('[OPTIMIZATION] ETag match - returning 304', {
        path: req.path,
        etag,
      });
      return res.status(304).end();
    }

    // Add cache control headers
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes

    logger.debug('[OPTIMIZATION] Response optimized', {
      path: req.path,
      size: JSON.stringify(responseData).length,
      etag,
      responseTime: Date.now() - startTime,
    });

    return originalJson.call(this, responseData);
  };

  next();
}

/**
 * Compression configuration
 * Enable in server.ts:
 * import compression from 'compression';
 * app.use(compression({
 *   level: 6,
 *   threshold: 1024 // Only compress responses > 1KB
 * }));
 */
export const compressionConfig = {
  level: 6, // 0-9 (6 is good balance)
  threshold: 1024, // Only compress > 1KB
  types: ['application/json', 'application/javascript', 'text/plain', 'text/html', 'text/css'],
};

/**
 * Request deduplication using idempotency keys
 * Client sends: X-Idempotency-Key: unique-key
 */
export async function requestDeduplication(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.get('X-Idempotency-Key');

  if (!idempotencyKey) {
    return next();
  }

  // Check if request already processed
  const cacheKey = `dedup:${idempotencyKey}`;
  const cached = await (global as any).redis?.get(cacheKey);

  if (cached) {
    logger.info('[OPTIMIZATION] Request deduplication - cached', {
      idempotencyKey,
      path: req.path,
    });
    return res.json(JSON.parse(cached));
  }

  // Store original json method
  const originalJson = res.json;

  res.json = function (data: any) {
    // Cache response with 24 hour TTL
    (global as any).redis?.setex(cacheKey, 86400, JSON.stringify(data));

    logger.debug('[OPTIMIZATION] Request deduplication - cached result', {
      idempotencyKey,
      path: req.path,
    });

    return originalJson.call(this, data);
  };

  next();
}
