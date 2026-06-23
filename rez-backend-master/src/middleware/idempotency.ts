/**
 * TASK-26: Idempotency middleware for financial endpoints.
 *
 * Clients send an `Idempotency-Key` header (UUID v4) with every mutating
 * request.  If the same key is seen again within the TTL window, the
 * middleware returns the **cached response** from the first call instead of
 * executing the handler a second time.
 *
 * This prevents duplicate charges / double payments caused by:
 *  - Client retry logic after a network timeout
 *  - User double-tapping "Pay" on a slow connection
 *  - Load-balancer retries during a pod restart
 *
 * Storage: Redis (key `idempotency:{userId}:{idempotencyKey}`).
 * By default, falls back gracefully (i.e. allows the request through) when
 * Redis is unavailable — preventing an outage cascade on non-critical routes.
 * For financial endpoints pass `{ failClosed: true }` to return HTTP 503
 * instead, so a Redis outage cannot silently bypass idempotency protection.
 *
 * Usage:
 * ```ts
 * import { idempotencyMiddleware } from '../middleware/idempotency';
 *
 * router.post('/pay', authMiddleware, idempotencyMiddleware(), billPayController);
 * router.post('/wallet/transfer', authMiddleware, idempotencyMiddleware({ ttlSeconds: 3600 }), transferController);
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redisService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('idempotency');

/** Default TTL: 24 hours — enough to cover the longest retry window. */
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

/** Maximum allowed idempotency key length (UUID v4 = 36 chars; be generous). */
const MAX_KEY_LENGTH = 128;

export interface IdempotencyOptions {
  /** Seconds to retain a cached response. Default: 86400 (24 h). */
  ttlSeconds?: number;
  /**
   * If `true`, skip idempotency check for unauthenticated requests instead of
   * blocking them.  Default: `false` (block without auth).
   */
  allowAnonymous?: boolean;
  /**
   * If `true`, return HTTP 503 when Redis is unavailable instead of allowing
   * the request through.  Use on all financial/payment endpoints so a Redis
   * outage cannot silently disable duplicate-payment protection.
   * Default: `false` (fail-open — safe for non-critical routes).
   */
  failClosed?: boolean;
  /**
   * If `true`, reject the request with HTTP 400 when the `Idempotency-Key`
   * header is absent entirely.  Use on financial endpoints where the client
   * MUST supply a key so that duplicate-payment protection is never silently
   * skipped.  When combined with `failClosed: true` this closes both gaps:
   * missing-key and Redis-unavailable.
   * Default: `false` (warn only — safe for non-critical routes).
   */
  requireKey?: boolean;
}

interface CachedResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  cachedAt: string;
}

/**
 * Returns Express middleware that enforces idempotency for the route it is
 * applied to.
 */
export function idempotencyMiddleware(options: IdempotencyOptions = {}) {
  const ttl = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const allowAnonymous = options.allowAnonymous ?? false;
  const failClosed = options.failClosed ?? false;
  const requireKey = options.requireKey ?? false;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    // ── No key provided ──
    if (!idempotencyKey) {
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (requireKey) {
          // Financial/fail-closed routes must supply a key so duplicate-payment
          // protection is never silently bypassed.
          logger.warn('Mutable request rejected — Idempotency-Key header is required', {
            method: req.method,
            path: req.path,
            ip: req.ip,
          });
          res.status(400).json({
            success: false,
            message: 'Idempotency-Key header is required for this endpoint',
            code: 'IDEMPOTENCY_KEY_REQUIRED',
          });
          return;
        }
        // Non-critical routes — warn and proceed.
        logger.warn('Mutable request missing Idempotency-Key', {
          method: req.method,
          path: req.path,
          ip: req.ip,
        });
      }
      return next();
    }

    // ── Validate key format ──
    if (idempotencyKey.length > MAX_KEY_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Idempotency-Key must be at most ${MAX_KEY_LENGTH} characters`,
      });
      return;
    }

    // ── Resolve per-user scope ──
    const userId: string | undefined =
      (req as any).user?.id || (req as any).user?._id?.toString() || (req as any).userId;

    if (!userId) {
      if (!allowAnonymous) {
        res.status(401).json({
          success: false,
          message: 'Authentication required for idempotent requests',
        });
        return;
      }
      // Anonymous fallback — skip idempotency (no user to scope the key to)
      return next();
    }

    // Include method and path so the same key cannot be replayed across different
    // endpoints or HTTP methods (e.g. a POST /pay key cannot match a POST /transfer).
    const cacheKey = `idempotency:${userId}:${req.method}:${req.baseUrl}${req.path}:${idempotencyKey}`;

    // LF-D003 FIX: In-flight lock to close the concurrent-duplicate window.
    //
    // PROBLEM: The original code checked the cache, found nothing (cache miss),
    // then let the request proceed.  The cache is only written fire-and-forget AFTER
    // the response is sent.  Under concurrent retries (e.g. double-tap "Pay" or
    // client retry within milliseconds) both requests pass the cache-miss check
    // before either one has populated the cache, causing the handler to execute twice.
    //
    // FIX: After the cache miss, acquire a short-lived Redis lock keyed to this
    // idempotency key before calling next().  If a concurrent request already holds
    // the lock, poll the cache once per 50 ms for up to 2 s — by then the first
    // request will have completed and the response will be cached.  If it still isn't,
    // fall through (same behaviour as before: allow through with a log warning).
    //
    // The lock TTL matches the expected maximum handler latency (10 s).  It is
    // released in the response interceptor so the second request (polling) can
    // immediately read the cached result.
    const inFlightKey = `idempotency:inflight:${userId}:${req.method}:${req.baseUrl}${req.path}:${idempotencyKey}`;
    let inFlightLockToken: string | null = null;

    // ── Check cache ──
    try {
      const cached = await redisService.get<CachedResponse>(cacheKey);

      if (cached) {
        logger.info('Idempotency cache hit — returning cached response', {
          userId,
          idempotencyKey,
          cachedAt: cached.cachedAt,
          statusCode: cached.statusCode,
          path: req.path,
        });

        // Replay original headers (content-type, x-request-id, etc.)
        for (const [header, value] of Object.entries(cached.headers)) {
          res.setHeader(header, value);
        }

        res.setHeader('X-Idempotency-Replayed', 'true');
        res.setHeader('X-Idempotency-Cached-At', cached.cachedAt);
        res.status(cached.statusCode).json(cached.body);
        return;
      }

      // Cache miss — try to acquire the in-flight lock.
      // BE-PAY-010: TTL increased from 10 s to 30 s to exceed the max Razorpay
      // axios timeout (10 s) plus pre/post axios overhead, preventing duplicate
      // orders from being created on slow network paths.
      inFlightLockToken = await redisService.acquireLock(inFlightKey, 30).catch(() => null);

      if (!inFlightLockToken) {
        // Another request holds the lock — this is a concurrent duplicate.
        // Poll the cache up to 40 times × 50 ms = 2 s waiting for the first
        // request to finish and populate the cache.
        logger.info('Idempotency in-flight lock contention — polling for cached response', {
          userId,
          idempotencyKey,
          path: req.path,
        });

        for (let attempt = 0; attempt < 40; attempt++) {
          await new Promise<void>((resolve) => setTimeout(resolve, 50));
          const polledCache = await redisService.get<CachedResponse>(cacheKey).catch(() => null);
          if (polledCache) {
            for (const [header, value] of Object.entries(polledCache.headers)) {
              res.setHeader(header, value);
            }
            res.setHeader('X-Idempotency-Replayed', 'true');
            res.setHeader('X-Idempotency-Cached-At', polledCache.cachedAt);
            res.status(polledCache.statusCode).json(polledCache.body);
            return;
          }
        }

        // Timed out waiting — fall through and allow the request through as a
        // safety valve (same behaviour as before this fix).
        logger.warn('Idempotency in-flight poll timed out — allowing duplicate through', {
          userId,
          idempotencyKey,
          path: req.path,
        });
      }
    } catch (redisErr: any) {
      if (failClosed) {
        // Financial endpoints: refuse the request so a Redis outage cannot
        // silently disable duplicate-payment protection.
        logger.error('Redis error during idempotency read — rejecting request (fail-closed)', {
          error: redisErr.message,
          userId,
          cacheKey,
        });
        res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable — please retry in a moment',
          code: 'IDEMPOTENCY_STORE_UNAVAILABLE',
        });
        return;
      }
      // Non-financial endpoints: allow through to avoid blocking on Redis outage.
      logger.error('Redis error during idempotency read — allowing request through (fail-open)', {
        error: redisErr.message,
        userId,
        cacheKey,
      });
      return next();
    }

    // ── Intercept response to store it ──
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Only cache successful (2xx) and client-error (4xx) responses.
      // Do NOT cache 5xx errors — those indicate a transient server failure
      // and the client should be able to retry with the same key.
      const statusCode = res.statusCode;
      if (statusCode >= 200 && statusCode < 500) {
        const headersToCache: Record<string, string> = {};
        const contentType = res.getHeader('content-type');
        if (contentType) headersToCache['content-type'] = String(contentType);
        const xRequestId = res.getHeader('x-request-id');
        if (xRequestId) headersToCache['x-request-id'] = String(xRequestId);

        const toCache: CachedResponse = {
          statusCode,
          body,
          headers: headersToCache,
          cachedAt: new Date().toISOString(),
        };

        // LF-D003 FIX: Write cache THEN release the in-flight lock so that any
        // concurrent request that is polling (see above) reads the populated cache
        // instead of falling through.  We await the SET so the lock is only
        // released after the entry is durably written to Redis.
        redisService
          .set(cacheKey, toCache, ttl)
          .then(() => {
            if (inFlightLockToken) {
              return redisService.releaseLock(inFlightKey, inFlightLockToken).catch((err: any) => {
                logger.warn('Failed to release idempotency in-flight lock', {
                  error: err.message,
                  userId,
                  inFlightKey,
                });
              });
            }
          })
          .catch((err: any) => {
            logger.error('Failed to cache idempotency response', {
              error: err.message,
              userId,
              cacheKey,
            });
            // Release lock even on cache failure so the next request isn't blocked forever
            if (inFlightLockToken) {
              redisService.releaseLock(inFlightKey, inFlightLockToken).catch(() => {});
            }
          });

        logger.info('Idempotency response cached', {
          userId,
          idempotencyKey,
          statusCode,
          path: req.path,
          ttlSeconds: ttl,
        });
      } else {
        // Non-cacheable (5xx) — still release the lock so retries aren't blocked
        if (inFlightLockToken) {
          redisService.releaseLock(inFlightKey, inFlightLockToken).catch(() => {});
        }
      }

      return originalJson(body);
    };

    next();
  };
}

export default idempotencyMiddleware;
