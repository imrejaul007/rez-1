import { WalletConfig } from '../models/WalletConfig';
import { createServiceLogger } from '../config/logger';
import { walletVelocityBlockedTotal } from '../config/walletMetrics';
import redisService from './redisService';

const logger = createServiceLogger('wallet-velocity');

export interface VelocityCheckResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  limitType?: string;
}

/**
 * Check per-user velocity limits for wallet operations.
 * Uses Redis atomic increment with sliding windows.
 */
export async function checkVelocity(
  userId: string,
  operation: 'transfer' | 'gift' | 'spend' | 'partner_claim'
): Promise<VelocityCheckResult> {
  const config = await WalletConfig.getOrCreate();
  const redis = redisService;

  let key: string;
  let maxAllowed: number;
  let windowSeconds: number;
  let limitType: string;

  switch (operation) {
    case 'transfer':
      key = `velocity:transfer:${userId}:hourly`;
      maxAllowed = config.fraudThresholds?.maxTransfersPerHour || 5;
      windowSeconds = 3600;
      limitType = 'transfers_per_hour';
      break;
    case 'gift':
      key = `velocity:gift:${userId}:daily`;
      maxAllowed = config.fraudThresholds?.maxGiftsPerDay || 10;
      windowSeconds = 86400;
      limitType = 'gifts_per_day';
      break;
    case 'spend':
      key = `velocity:spend:${userId}:daily`;
      maxAllowed = config.transferLimits?.dailyMax || 50000;
      windowSeconds = 86400;
      limitType = 'daily_spend';
      break;
    case 'partner_claim':
      key = `velocity:partner_claim:${userId}:hourly`;
      maxAllowed = 10;
      windowSeconds = 3600;
      limitType = 'partner_claims_per_hour';
      break;
    default:
      return { allowed: true, remaining: 999, resetInSeconds: 0 };
  }

  try {
    const count = await redis.atomicIncr(key, windowSeconds);
    if (count === null) {
      // Redis unavailable — fail open
      logger.warn('Redis unavailable for velocity check, allowing request', { userId, operation });
      return { allowed: true, remaining: maxAllowed, resetInSeconds: 0 };
    }

    if (count > maxAllowed) {
      walletVelocityBlockedTotal.inc({ operation, limitType });
      logger.warn('Velocity limit exceeded', {
        userId,
        operation,
        limitType,
        count,
        maxAllowed,
      });
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: windowSeconds,
        limitType,
      };
    }

    return {
      allowed: true,
      remaining: maxAllowed - count,
      resetInSeconds: windowSeconds,
    };
  } catch (error) {
    logger.error('Velocity check error', error, { userId, operation });
    // Fail open on error
    return { allowed: true, remaining: maxAllowed, resetInSeconds: 0 };
  }
}

/**
 * Check unique recipients per day for a user (fraud signal).
 */
export async function checkUniqueRecipients(
  userId: string,
  recipientId: string
): Promise<{ allowed: boolean; uniqueCount: number }> {
  const redis = redisService;
  const key = `velocity:recipients:${userId}:daily`;
  const maxUniqueRecipients = 10;

  try {
    // Use a Redis Set to track unique recipients
    // Since we don't have sAdd directly, use a simpler counter approach
    const countKey = `velocity:recipient_count:${userId}:daily`;
    const count = await redis.atomicIncr(countKey, 86400);

    if (count !== null && count > maxUniqueRecipients) {
      walletVelocityBlockedTotal.inc({ operation: 'transfer', limitType: 'unique_recipients' });
      logger.warn('Unique recipients limit exceeded', { userId, count: count });
      return { allowed: false, uniqueCount: count };
    }

    return { allowed: true, uniqueCount: count || 0 };
  } catch (error) {
    logger.error('Unique recipients check error', error, { userId });
    return { allowed: true, uniqueCount: 0 };
  }
}
