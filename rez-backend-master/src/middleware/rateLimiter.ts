/**
 * Rate Limiter with Redis Store
 *
 * Uses the shared Redis client from redisService.
 * Falls back to MemoryStore if Redis is unavailable.
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

// Extend Request interface to include rateLimit property
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number;
        current: number;
        remaining: number;
        resetTime: Date;
      };
    }
  }
}

// ─── Key generator: per-user when authenticated, per-IP otherwise ─────────────
// IMPORTANT: must use ipKeyGenerator helper for IPv6 addresses to prevent bypass.
const keyGenerator = (req: Request): string => {
  const userId = (req as any).user?.id || (req as any).userId;
  if (userId) return `user:${userId}`;
  return ipKeyGenerator(req.ip || 'unknown');
};

// ─── Check if disabled (dev override) ────────────────────────────────────────
// SECURITY: Rate limiting can NEVER be disabled in production.
// DISABLE_RATE_LIMIT=true is ignored when NODE_ENV=production.
const isProduction = process.env.NODE_ENV === 'production';
const isRateLimitDisabled = !isProduction && process.env.DISABLE_RATE_LIMIT === 'true';

if (isRateLimitDisabled) {
  logger.info('⚠️  Rate limiting is DISABLED (DISABLE_RATE_LIMIT=true, NODE_ENV !== production)');
} else if (process.env.DISABLE_RATE_LIMIT === 'true' && isProduction) {
  logger.warn('⚠️  Rate limiting DISABLE_RATE_LIMIT=true ignored in production');
}

const passthrough = (_req: Request, _res: Response, next: NextFunction) => next();

// ─── Lazy Store factory — defers RedisStore creation until Redis is ready ─────
// RedisStore's constructor fires async script-load commands immediately.
// If Redis isn't connected yet (common on Render/cloud where Redis is remote),
// those become unhandled rejections and crash Node >= 15.
// Solution: return a lazy wrapper that creates the real RedisStore on first use.
let redisStoreWarningLogged = false;

function makeStore(prefix: string, options?: { failOpen?: boolean }) {
  if (isRateLimitDisabled) return undefined; // MemoryStore fallback
  const failOpen = options?.failOpen ?? true;

  let innerStore: InstanceType<typeof RedisStore> | null = null;
  let initFailed = false;

  function getOrCreateStore(): InstanceType<typeof RedisStore> | null {
    if (innerStore) return innerStore;
    if (initFailed) return null;

    const client = redisService.getClient();
    if (!client) return null;

    try {
      innerStore = new RedisStore({
        sendCommand: async (...args: string[]) => {
          const c = redisService.getClient();
          if (!c) throw new Error('Redis disconnected');
          return (c as any).sendCommand(args);
        },
        prefix: `rl:${prefix}:`,
      });
      return innerStore;
    } catch (err) {
      initFailed = true;
      if (!redisStoreWarningLogged) {
        logger.warn('[RateLimit] Failed to create RedisStore — using MemoryStore fallback');
        redisStoreWarningLogged = true;
      }
      return null;
    }
  }

  // Return an object that satisfies the express-rate-limit Store interface
  // but lazily initializes the real RedisStore only when Redis is connected.
  return {
    init(options: any) {
      // Store options for later; the real store's init will be called on first use
      (this as any)._options = options;
    },
    async increment(key: string): Promise<{ totalHits: number; resetTime: Date | undefined }> {
      const store = getOrCreateStore();
      if (store) {
        // Ensure init is called once
        if ((this as any)._options && !(this as any)._inited) {
          (this as any)._inited = true;
          if (typeof store.init === 'function') {
            store.init((this as any)._options);
          }
        }
        return store.increment(key);
      }
      // No Redis. For critical routes, fail closed.
      if (!failOpen) {
        throw new Error('Rate limiter backend unavailable');
      }
      // No Redis — permit the request (legacy behavior for low-risk routes)
      if (!redisStoreWarningLogged) {
        logger.warn('[RateLimit] Redis not ready — rate limiting disabled until connected');
        redisStoreWarningLogged = true;
      }
      return { totalHits: 0, resetTime: undefined };
    },
    async decrement(key: string): Promise<void> {
      const store = getOrCreateStore();
      if (store && typeof store.decrement === 'function') {
        return store.decrement(key);
      }
    },
    async resetKey(key: string): Promise<void> {
      const store = getOrCreateStore();
      if (store && typeof store.resetKey === 'function') {
        return store.resetKey(key);
      }
    },
    async resetAll(): Promise<void> {
      const store = getOrCreateStore();
      if (store && typeof (store as any).resetAll === 'function') {
        return (store as any).resetAll();
      }
    },
  } as any;
}

// ─── Safe rate limiter factory — catches store errors, passes request through ─
function makeLimiter(options: Parameters<typeof rateLimit>[0], failOpen = true) {
  const limiter = rateLimit(options);
  return (req: Request, res: Response, next: NextFunction) => {
    limiter(req, res, (err?: any) => {
      if (err) {
        if (!failOpen) {
          return res.status(503).json({
            success: false,
            message: 'Rate limiter unavailable. Please try again later.',
          });
        }
        if (!redisStoreWarningLogged) {
          logger.warn('[RateLimit] Store error, passing request through:', err.message);
          redisStoreWarningLogged = true;
        }
        return next();
      }
      next();
    });
  };
}

// ─── Error response helper ────────────────────────────────────────────────────
const rateLimitResponse = (_req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later.',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// LIMITERS — Redis-backed, per-user key
// ─────────────────────────────────────────────────────────────────────────────

export const generalLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 15 * 60 * 1000,
      max: 500,
      keyGenerator,
      store: makeStore('general'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const authLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter(
      {
        windowMs: 15 * 60 * 1000,
        max: 5,
        keyGenerator,
        store: makeStore('auth', { failOpen: false }),
        message: (_req: Request, res: Response) => {
          res.status(429).json({
            success: false,
            error: 'Too many login attempts. Please try again after 15 minutes.',
            retryAfter: 15 * 60,
          });
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
      },
      false,
    );

export const adminAuthLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter(
      {
        windowMs: 15 * 60 * 1000,
        max: 3,
        keyGenerator,
        store: makeStore('admin-auth', { failOpen: false }),
        message: (_req: Request, res: Response) => {
          res.status(429).json({
            success: false,
            error: 'Too many admin login attempts. Please try again after 15 minutes.',
            retryAfter: 15 * 60,
          });
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
      },
      false,
    );

// Admin MFA verify/setup/disable: strict per-IP rate limit to prevent
// brute-forcing the 6-digit TOTP code (1M possibilities × no limit = trivial
// to crack). Note: this is per-IP, not per-user, so admin account lockouts
// should additionally be enforced at the user level (see adminAuthLimiter
// for the account-lockout path).
export const adminMfaLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter(
      {
        windowMs: 15 * 60 * 1000,
        max: 5,
        keyGenerator,
        store: makeStore('admin-mfa', { failOpen: false }),
        message: (_req: Request, res: Response) => {
          res.status(429).json({
            success: false,
            error: 'Too many admin MFA attempts. Please try again after 15 minutes.',
            retryAfter: 15 * 60,
          });
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
      },
      false,
    );

export const registrationLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 60 * 1000,
      max: 5,
      keyGenerator,
      store: makeStore('register'),
      message: (_req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: 60 * 60,
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

export const otpLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter(
      {
        windowMs: 30 * 1000,
        max: 3,
        keyGenerator,
        store: makeStore('otp', { failOpen: false }),
        message: (_req: Request, res: Response) => {
          res.status(429).json({
            success: false,
            message: 'Please wait 30 seconds before requesting another OTP.',
            retryAfter: 30,
          });
        },
        standardHeaders: true,
        legacyHeaders: false,
      },
      false,
    );

export const passwordResetLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter(
      {
        windowMs: 60 * 60 * 1000,
        max: 3,
        keyGenerator,
        store: makeStore('pwd-reset', { failOpen: false }),
        message: rateLimitResponse,
        standardHeaders: true,
        legacyHeaders: false,
      },
      false,
    );

export const securityLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter(
      {
        windowMs: 15 * 60 * 1000,
        max: 3,
        keyGenerator,
        store: makeStore('security', { failOpen: false }),
        message: rateLimitResponse,
        standardHeaders: true,
        legacyHeaders: false,
      },
      false,
    );

export const uploadLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 10,
      keyGenerator,
      store: makeStore('upload'),
      message: (_req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          message: 'Upload limit exceeded. Please wait before uploading more files.',
          retryAfter: 60,
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

export const searchLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 30,
      keyGenerator,
      store: makeStore('search'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const aiSearchLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 10,
      keyGenerator,
      store: makeStore('ai-search'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const strictLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 60 * 1000,
      max: 10,
      keyGenerator,
      store: makeStore('strict'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const reviewLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 5,
      keyGenerator,
      store: makeStore('review'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const analyticsLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 30,
      keyGenerator,
      store: makeStore('analytics'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const comparisonLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 10,
      keyGenerator,
      store: makeStore('comparison'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const profileUpdateLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 15 * 60 * 1000,
      max: 15,
      keyGenerator,
      store: makeStore('profile-update'),
      message: (_req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          message: 'Too many profile updates. Please try again later.',
          retryAfter: 15 * 60,
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

export const favoriteLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 20,
      keyGenerator,
      store: makeStore('favorite'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const recommendationLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 15,
      keyGenerator,
      store: makeStore('recommendation'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

// ─── Redemption limiter — strict, per-user, fail-closed ──────────────────────
export const redemptionLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter(
      {
        windowMs: 60 * 1000, // 1 minute
        max: 10, // max 10 redemptions per minute per user
        keyGenerator,
        store: makeStore('redemption', { failOpen: false }),
        message: (_req: Request, res: Response) => {
          res.status(429).json({
            success: false,
            error: 'RATE_LIMITED',
            message: 'Too many redemption attempts. Please wait 1 minute.',
            retryAfter: 60,
          });
        },
        standardHeaders: true,
        legacyHeaders: false,
      },
      false,
    ); // fail-closed: reject if Redis unavailable

// ─── Payment limiter — strict, per-user, fail-closed ─────────────────────────
export const paymentLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter(
      {
        windowMs: 60 * 1000, // 1 minute
        max: 5, // max 5 payment operations per minute per user
        keyGenerator,
        store: makeStore('payment', { failOpen: false }),
        message: (_req: Request, res: Response) => {
          res.status(429).json({
            success: false,
            error: 'RATE_LIMITED',
            message: 'Too many payment requests. Please wait 1 minute.',
            retryAfter: 60,
          });
        },
        standardHeaders: true,
        legacyHeaders: false,
      },
      false,
    ); // fail-closed: reject if Redis unavailable

// ─── Webhook global limiter — per-IP, strict ─────────────────────────────────
export const webhookLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter(
      {
        windowMs: 60 * 1000, // 1 minute
        max: 100, // max 100 webhook requests per IP per minute
        keyGenerator: (req: Request) => `ip:${req.ip || 'unknown'}`,
        store: makeStore('webhook-global', { failOpen: false }),
        message: (_req: Request, res: Response) => {
          res.status(429).json({
            success: false,
            error: 'RATE_LIMITED',
            message: 'Too many webhook requests. Please try again later.',
            retryAfter: 60,
          });
        },
        standardHeaders: true,
        legacyHeaders: false,
      },
      false,
    ); // fail-closed

export const referralLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 60 * 1000,
      max: 50,
      keyGenerator,
      store: makeStore('referral'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const referralShareLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 5,
      keyGenerator,
      store: makeStore('referral-share'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

// ================================================
// PRODUCT CRUD RATE LIMITERS
// ================================================

export const productGetLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 100,
      keyGenerator,
      store: makeStore('product-get'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const productWriteLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 30,
      keyGenerator,
      store: makeStore('product-write'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const productDeleteLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 10,
      keyGenerator,
      store: makeStore('product-delete'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const productBulkLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter({
      windowMs: 60 * 1000,
      max: 5,
      keyGenerator,
      store: makeStore('product-bulk'),
      message: rateLimitResponse,
      standardHeaders: true,
      legacyHeaders: false,
    });

// ─── Financial operations limiter — strict, per-user, fail-closed ────────────
export const financialLimiter = isRateLimitDisabled
  ? passthrough
  : makeLimiter(
      {
        windowMs: 60 * 1000, // 1 minute
        max: 10, // max 10 financial operations per minute
        keyGenerator,
        store: makeStore('financial', { failOpen: false }),
        message: (_req: Request, res: Response) => {
          res.status(429).json({
            success: false,
            error: 'RATE_LIMITED',
            message: 'Too many payment requests. Please wait 1 minute.',
            retryAfter: 60,
          });
        },
        standardHeaders: true,
        legacyHeaders: false,
      },
      false,
    ); // fail-closed: reject if Redis unavailable

export const createProductLimiter = (method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'BULK') => {
  if (isRateLimitDisabled) return passthrough;
  const configs = {
    GET: { max: 100, prefix: 'product-get' },
    POST: { max: 30, prefix: 'product-post' },
    PUT: { max: 30, prefix: 'product-put' },
    DELETE: { max: 10, prefix: 'product-del' },
    BULK: { max: 5, prefix: 'product-bulk2' },
  };
  const { max, prefix } = configs[method];
  return makeLimiter({
    windowMs: 60 * 1000,
    max,
    keyGenerator,
    store: makeStore(prefix),
    message: rateLimitResponse,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  prefix?: string;
}) => {
  if (isRateLimitDisabled) return passthrough;
  return makeLimiter({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    keyGenerator,
    store: makeStore(options.prefix || 'custom'),
    message: options.message
      ? (_req: Request, res: Response) => {
          res.status(429).json({ success: false, message: options.message });
        }
      : rateLimitResponse,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
  });
};
