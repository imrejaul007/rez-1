import { Request, Response, NextFunction } from 'express';
import { WalletConfig } from '../models/WalletConfig';
import { sendError } from '../utils/response';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';

const logger = createServiceLogger('re-auth');

/**
 * Middleware that requires recent OTP verification for sensitive wallet operations.
 * Checks Redis key `reauth:{userId}:verified` (5min TTL set after OTP verification).
 *
 * Usage:
 *   router.post('/withdraw', requireReAuth(), withdrawFunds);
 *   router.post('/transfer/initiate', requireReAuthAbove('transfer'), initiateTransfer);
 */
export function requireReAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    if (!userId) return sendError(res, 'User not authenticated', 401);

    try {
      const redis = redisService;
      const verified = await redis.get(`reauth:${userId}:verified`);

      if (!verified) {
        logger.info('Re-auth required for sensitive operation', {
          userId,
          path: req.path,
        });
        return res.status(403).json({
          success: false,
          message: 'Re-authentication required for this operation',
          requiresReAuth: true,
        });
      }

      next();
    } catch (error) {
      logger.error('Re-auth check failed', error, { userId });
      // Fail closed for security — require re-auth if check fails
      return res.status(403).json({
        success: false,
        message: 'Re-authentication required for this operation',
        requiresReAuth: true,
      });
    }
  };
}

/**
 * Middleware that requires re-auth only for amounts above the configured threshold.
 * For amounts below the threshold, the request passes through.
 */
export function requireReAuthAbove(operationType: 'transfer' | 'gift') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    if (!userId) return sendError(res, 'User not authenticated', 401);

    const amount = req.body.amount || 0;
    const config = await WalletConfig.getOrCreate();

    let threshold: number;
    if (operationType === 'transfer') {
      threshold = config.transferLimits?.requireOtpAbove || 5000;
    } else {
      threshold = config.giftLimits?.requireOtpAbove || 5000;
    }

    if (amount <= threshold) {
      return next();
    }

    // Amount exceeds threshold — check re-auth
    try {
      const redis = redisService;
      const verified = await redis.get(`reauth:${userId}:verified`);

      if (!verified) {
        logger.info('Re-auth required for high-value operation', {
          userId,
          operationType,
          amount,
          threshold,
        });
        return res.status(403).json({
          success: false,
          message: `Re-authentication required for ${operationType}s above ${threshold} NC`,
          requiresReAuth: true,
          threshold,
        });
      }

      next();
    } catch (error) {
      logger.error('Re-auth check failed', error, { userId });
      return res.status(403).json({
        success: false,
        message: 'Re-authentication required for this operation',
        requiresReAuth: true,
      });
    }
  };
}

/**
 * Middleware that requires re-auth for coin redemptions above the configured threshold.
 * Reads coinAmount from req.body and threshold from WalletConfig.redemptionConfig.reAuthThreshold.
 */
export function requireReAuthForRedemption() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    if (!userId) return sendError(res, 'User not authenticated', 401);

    const coinAmount = req.body.coinAmount || 0;
    const config = await WalletConfig.getOrCreate();
    const threshold = config.redemptionConfig?.reAuthThreshold || 5000;

    if (coinAmount <= threshold) {
      return next();
    }

    // Amount exceeds threshold — check re-auth
    try {
      const redis = redisService;
      const verified = await redis.get(`reauth:${userId}:verified`);

      if (!verified) {
        logger.info('Re-auth required for high-value redemption', {
          userId,
          coinAmount,
          threshold,
        });
        return res.status(403).json({
          success: false,
          message: `Re-authentication required for redemptions above ${threshold} coins`,
          requiresReAuth: true,
          threshold,
        });
      }

      next();
    } catch (error) {
      logger.error('Re-auth check failed for redemption', error, { userId });
      return res.status(403).json({
        success: false,
        message: 'Re-authentication required for this operation',
        requiresReAuth: true,
      });
    }
  };
}

/**
 * Mark a user as re-authenticated (call after successful OTP verification).
 * Sets a Redis key with 5-minute TTL.
 */
export async function markReAuthenticated(userId: string): Promise<void> {
  try {
    const redis = redisService;
    await redis.set(`reauth:${userId}:verified`, { verified: true, timestamp: Date.now() }, 300);
    logger.info('User re-authenticated', { userId });
  } catch (error) {
    logger.error('Failed to mark re-authenticated', error, { userId });
  }
}
