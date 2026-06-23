import * as crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

interface FinancialLimitConfig {
  windowMs: number;
  maxOps: number;
  maxAmountPaise?: number; // optional: max total amount in window
  keyBy: 'userId' | 'device' | 'both';
  /**
   * If `true`, return HTTP 503 when Redis is unavailable instead of allowing
   * the request through.  Use on money-movement endpoints (payment, topup,
   * withdraw) where silent rate-limit bypass is unacceptable.
   * Default: `false` (fail-open — safe for non-critical routes).
   */
  failClosed?: boolean;
}

function getDeviceId(req: Request): string {
  return (
    (req.headers['x-device-id'] as string) ||
    (req.headers['x-fingerprint'] as string) ||
    ipKeyGenerator(req.ip ?? '') ||
    'unknown'
  );
}

export function financialRateLimit(config: FinancialLimitConfig) {
  const failClosed = config.failClosed ?? false;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id || (req as any).userId;
      const deviceId = getDeviceId(req);
      const now = Date.now();
      const windowStart = now - config.windowMs;

      const client = redisService.getClient();
      if (!client) {
        if (failClosed) {
          logger.error('[FinancialRateLimit] Redis unavailable — rejecting request (fail-closed)', {
            path: req.path,
            userId,
          });
          return res.status(503).json({
            success: false,
            message: 'Service temporarily unavailable — please retry in a moment',
            code: 'RATE_LIMIT_STORE_UNAVAILABLE',
          });
        }
        logger.warn('[FinancialRateLimit] Redis unavailable — allowing request (fail-open)');
        return next();
      }

      const keys: string[] = [];
      if (config.keyBy === 'userId' || config.keyBy === 'both') {
        if (userId) {
          keys.push(`fin_rl:user:${userId}:${req.path}`);
        }
      }
      if (config.keyBy === 'device' || config.keyBy === 'both') {
        keys.push(`fin_rl:device:${deviceId}:${req.path}`);
      }

      for (const key of keys) {
        // Sliding window using sorted sets
        try {
          const pipe = (client as any).pipeline();
          pipe.zremrangebyscore(key, '-inf', windowStart);
          pipe.zcard(key);
          pipe.zadd(key, now, `${now}-${Math.random()}`);
          pipe.pexpire(key, config.windowMs);
          const results = await pipe.exec();

          const count = (results?.[1]?.[1] as number) || 0;

          if (count >= config.maxOps) {
            const retryAfter = Math.ceil(config.windowMs / 1000);
            res.setHeader('Retry-After', retryAfter);
            res.setHeader('X-RateLimit-Limit', config.maxOps);
            res.setHeader('X-RateLimit-Remaining', 0);
            return res.status(429).json({
              success: false,
              message: 'Too many financial operations. Please wait before trying again.',
              retryAfterSeconds: retryAfter,
            });
          }

          res.setHeader('X-RateLimit-Limit', config.maxOps);
          res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxOps - count - 1));
        } catch (err) {
          logger.warn('[FinancialRateLimit] Error checking key:', err);
          if (failClosed) {
            // A per-key Redis error on a money endpoint means we cannot enforce
            // the limit — reject rather than silently allow through.
            return res.status(503).json({
              success: false,
              message: 'Service temporarily unavailable — please retry in a moment',
              code: 'RATE_LIMIT_STORE_UNAVAILABLE',
            });
          }
          // Non-critical route — continue to next key / next middleware.
        }
      }

      next();
    } catch (err) {
      logger.error('[FinancialRateLimit] Unexpected error:', err);
      if (failClosed) {
        return res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable — please retry in a moment',
          code: 'RATE_LIMIT_STORE_UNAVAILABLE',
        });
      }
      next();
    }
  };
}

// Pre-configured financial limiters:

/** Wallet pay / debit — 10 per minute per user */
export const walletPayLimiter = financialRateLimit({
  windowMs: 60 * 1000,
  maxOps: 10,
  keyBy: 'userId',
  failClosed: true, // money-movement: reject if Redis is down
});

/** Wallet topup — 5 per hour per user and device */
export const walletTopupLimiter = financialRateLimit({
  windowMs: 60 * 60 * 1000,
  maxOps: 5,
  keyBy: 'both', // both user and device
  failClosed: true, // money-movement: reject if Redis is down
});

/** BBPS bill pay — 20 per day per user */
export const bbpsPayLimiter = financialRateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  maxOps: 20,
  keyBy: 'userId',
  failClosed: true, // money-movement: reject if Redis is down
});

/** Recharge — 15 per day per user and device */
export const rechargeLimiter = financialRateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  maxOps: 15,
  keyBy: 'both',
  failClosed: true, // money-movement: reject if Redis is down
});

/** Coin redemption — 10 per hour per user */
export const coinRedeemLimiter = financialRateLimit({
  windowMs: 60 * 60 * 1000,
  maxOps: 10,
  keyBy: 'userId',
  failClosed: true, // money-movement: reject if Redis is down
});

/** Referral code apply — 3 per day per device (prevents multi-account farming) */
export const referralApplyLimiter = financialRateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  maxOps: 3,
  keyBy: 'device', // device-based to catch multi-account
});
