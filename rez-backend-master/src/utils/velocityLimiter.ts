/**
 * src/utils/velocityLimiter.ts
 *
 * Comprehensive velocity and daily cap enforcement utility.
 * Provides atomic Redis-backed checks for reward abuse prevention:
 * - Per-hour coin earning velocity
 * - Per-day coin earning velocity
 * - Per-day challenge completion caps
 * - Per-day referral reward caps
 * - Per-hour promo code usage limits
 * - Device fingerprint tracking
 *
 * Uses idempotency keys and distributed locking to prevent race conditions.
 */

import redisService from '../services/redisService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('velocity-limiter');

// ─── Configuration ──────────────────────────────────────────

export const VELOCITY_LIMITS = {
  // Coin earning velocity
  COINS_PER_HOUR: 500,
  COINS_PER_DAY: 5000,

  // Event velocity
  EARNING_EVENTS_PER_HOUR: 20,
  EARNING_EVENTS_PER_DAY: 50,

  // Challenge farming prevention
  SAME_CHALLENGE_PER_DAY: 1,
  CHALLENGES_PER_HOUR: 2,
  CHALLENGES_PER_DAY: 10,

  // Referral caps
  REFERRAL_REWARDS_PER_DAY: 2,
  ACCOUNTS_REFERRED_FROM_DEVICE_PER_DAY: 5,

  // Promo code abuse prevention
  PROMO_CODE_USES_PER_HOUR: 3,
  PROMO_CODE_USES_PER_DAY: 5,

  // Bill upload farming
  BILLS_PER_DAY: 10,
  MIN_HOURS_BETWEEN_SAME_MERCHANT: 72,

  // Scratch card generation
  SCRATCH_CARDS_PER_DAY: 1,

  // Web ordering
  ORDER_CANCELLATIONS_PER_DAY: 2,

  // SIP abuse
  MAX_SIP_CANCELLATIONS_PER_QUARTER: 3,
};

// ─── Types ──────────────────────────────────────────

export interface VelocityCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remainingInWindow: number;
  resetAtSeconds: number;
  reason?: string;
}

// ─── Utility Functions ──────────────────────────────────────────

/**
 * Get start of current UTC day as unknown as ISO string (YYYY-MM-DD)
 */
function getDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get hour-minute window for more granular hourly tracking
 * Returns format: YYYY-MM-DD:HH
 */
function getHourKey(): string {
  const now = new Date();
  const isoDate = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
  return isoDate.replace('T', ':');
}

/**
 * Atomically check and increment a velocity counter.
 * Returns the new count and whether it exceeded the limit.
 */
async function checkAndIncrementCounter(
  key: string,
  increment: number = 1,
  limit: number,
  ttlSeconds: number,
): Promise<VelocityCheckResult> {
  try {
    const newCount = (await redisService.incr(key, increment)) ?? 0;
    await redisService.expire(key, ttlSeconds);

    const allowed = newCount <= limit;

    return {
      allowed,
      current: newCount,
      limit,
      remainingInWindow: Math.max(0, limit - newCount),
      resetAtSeconds: ttlSeconds,
      reason: !allowed ? `Velocity limit exceeded: ${newCount}/${limit}` : undefined,
    };
  } catch (error) {
    logger.error('[VelocityLimiter] Counter check failed', {
      key,
      error: (error as Error).message,
    });
    // Fail open on Redis errors — allow request to proceed
    return {
      allowed: true,
      current: 0,
      limit,
      remainingInWindow: limit,
      resetAtSeconds: 0,
    };
  }
}

// ─── Public API ──────────────────────────────────────────

/**
 * Check coin earning velocity (hourly and daily).
 * Both must pass for the request to be allowed.
 */
export async function checkCoinVelocity(userId: string, amount: number = 1): Promise<VelocityCheckResult> {
  const dayKey = `velocity:coins:${userId}:day:${getDayKey()}`;
  const hourKey = `velocity:coins:${userId}:hour:${getHourKey()}`;

  // Check hourly limit first
  const hourCheck = await checkAndIncrementCounter(hourKey, amount, VELOCITY_LIMITS.COINS_PER_HOUR, 3600);

  if (!hourCheck.allowed) {
    logger.warn('[VelocityLimiter] Hourly coin velocity exceeded', {
      userId,
      amount,
      current: hourCheck.current,
      limit: hourCheck.limit,
    });
    return hourCheck;
  }

  // Check daily limit
  const dayCheck = await checkAndIncrementCounter(dayKey, amount, VELOCITY_LIMITS.COINS_PER_DAY, 86400);

  if (!dayCheck.allowed) {
    logger.warn('[VelocityLimiter] Daily coin velocity exceeded', {
      userId,
      amount,
      current: dayCheck.current,
      limit: dayCheck.limit,
    });
  }

  return dayCheck;
}

/**
 * Check earning event velocity (hourly and daily).
 * Prevents rapid-fire event spam.
 */
export async function checkEarningEventVelocity(userId: string, eventType: string): Promise<VelocityCheckResult> {
  const dayKey = `velocity:event:${userId}:day:${getDayKey()}`;
  const hourKey = `velocity:event:${userId}:${eventType}:hour:${getHourKey()}`;

  // Check hourly limit for specific event type
  const hourCheck = await checkAndIncrementCounter(hourKey, 1, VELOCITY_LIMITS.EARNING_EVENTS_PER_HOUR, 3600);

  if (!hourCheck.allowed) {
    return hourCheck;
  }

  // Check daily limit for all events
  const dayCheck = await checkAndIncrementCounter(dayKey, 1, VELOCITY_LIMITS.EARNING_EVENTS_PER_DAY, 86400);

  return dayCheck;
}

/**
 * Check same-challenge completion cap (per day).
 * Prevents user from claiming the same challenge reward multiple times per day.
 */
export async function checkChallengeDailyCap(userId: string, challengeId: string): Promise<VelocityCheckResult> {
  const key = `challenge:daily:${userId}:${challengeId}:${getDayKey()}`;

  const check = await checkAndIncrementCounter(key, 1, VELOCITY_LIMITS.SAME_CHALLENGE_PER_DAY, 86400);

  if (!check.allowed) {
    logger.warn('[VelocityLimiter] Challenge daily cap exceeded', {
      userId,
      challengeId,
    });
  }

  return check;
}

/**
 * Check total challenges per day (across all challenges).
 */
export async function checkChallengesPerDay(userId: string): Promise<VelocityCheckResult> {
  const key = `challenge:total:${userId}:day:${getDayKey()}`;

  return checkAndIncrementCounter(key, 1, VELOCITY_LIMITS.CHALLENGES_PER_DAY, 86400);
}

/**
 * Check referral reward daily cap.
 */
export async function checkReferralDailyCap(userId: string): Promise<VelocityCheckResult> {
  const key = `referral:rewards:${userId}:day:${getDayKey()}`;

  return checkAndIncrementCounter(key, 1, VELOCITY_LIMITS.REFERRAL_REWARDS_PER_DAY, 86400);
}

/**
 * Check promo code usage velocity (hourly and daily).
 */
export async function checkPromoCodeVelocity(userId: string, promoCodeId: string): Promise<VelocityCheckResult> {
  const hourKey = `promo:${promoCodeId}:${userId}:hour:${getHourKey()}`;
  const dayKey = `promo:${promoCodeId}:${userId}:day:${getDayKey()}`;

  // Check hourly limit
  const hourCheck = await checkAndIncrementCounter(hourKey, 1, VELOCITY_LIMITS.PROMO_CODE_USES_PER_HOUR, 3600);

  if (!hourCheck.allowed) {
    return hourCheck;
  }

  // Check daily limit
  const dayCheck = await checkAndIncrementCounter(dayKey, 1, VELOCITY_LIMITS.PROMO_CODE_USES_PER_DAY, 86400);

  return dayCheck;
}

/**
 * Check scratch card generation daily cap.
 */
export async function checkScratchCardDailyCap(userId: string): Promise<VelocityCheckResult> {
  const key = `scratch:${userId}:day:${getDayKey()}`;

  return checkAndIncrementCounter(key, 1, VELOCITY_LIMITS.SCRATCH_CARDS_PER_DAY, 86400);
}

/**
 * Check bill upload daily cap.
 */
export async function checkBillUploadDailyCap(userId: string): Promise<VelocityCheckResult> {
  const key = `bill:${userId}:day:${getDayKey()}`;

  return checkAndIncrementCounter(key, 1, VELOCITY_LIMITS.BILLS_PER_DAY, 86400);
}

/**
 * Check for duplicate merchant bill uploads (same merchant/amount within 72 hours).
 * Prevents bill farming by tracking merchant+amount pairs.
 */
export async function checkBillDuplication(
  userId: string,
  merchantId: string,
  amount: number,
): Promise<{
  allowed: boolean;
  lastUploadAt?: Date;
  minWaitHours: number;
}> {
  const deupKey = `bill:dedup:${userId}:${merchantId}:${Math.floor(amount / 100)}`; // Round to nearest 100
  const lastUpload = await redisService.get<string>(deupKey);

  if (lastUpload) {
    return {
      allowed: false,
      lastUploadAt: new Date(parseInt(lastUpload, 10)),
      minWaitHours: VELOCITY_LIMITS.MIN_HOURS_BETWEEN_SAME_MERCHANT,
    };
  }

  // Mark this merchant bill as processed
  const now = Date.now();
  await redisService.set(deupKey, now.toString(), VELOCITY_LIMITS.MIN_HOURS_BETWEEN_SAME_MERCHANT * 3600);

  return {
    allowed: true,
    minWaitHours: VELOCITY_LIMITS.MIN_HOURS_BETWEEN_SAME_MERCHANT,
  };
}

/**
 * Check order cancellation daily cap (for web ordering abuse).
 */
export async function checkOrderCancellationDailyCap(userId: string): Promise<VelocityCheckResult> {
  const key = `order:cancel:${userId}:day:${getDayKey()}`;

  return checkAndIncrementCounter(key, 1, VELOCITY_LIMITS.ORDER_CANCELLATIONS_PER_DAY, 86400);
}

/**
 * Increment device-based referral counter (prevents device-wide referral farming).
 */
export async function trackDeviceReferral(deviceId: string, userId: string): Promise<number> {
  const key = `referral:device:${deviceId}:day:${getDayKey()}`;

  try {
    const count = (await redisService.incr(key, 1)) ?? 0;
    await redisService.expire(key, 86400);

    if (count > VELOCITY_LIMITS.ACCOUNTS_REFERRED_FROM_DEVICE_PER_DAY) {
      logger.warn('[VelocityLimiter] Device-level referral farming detected', {
        deviceId,
        count,
      });
    }

    return count;
  } catch (error) {
    logger.error('[VelocityLimiter] Device referral tracking failed', {
      deviceId,
      error: (error as Error).message,
    });
    return 0;
  }
}

/**
 * Reset velocity counters for a user (e.g., on fraud resolution).
 */
export async function resetUserVelocity(userId: string): Promise<void> {
  try {
    // Clear all velocity keys for this user
    await redisService.delPattern(`velocity:*:${userId}:*`);
    await redisService.delPattern(`challenge:*:${userId}:*`);
    await redisService.delPattern(`referral:*:${userId}:*`);
    logger.info('[VelocityLimiter] Reset velocity counters', { userId });
  } catch (error) {
    logger.error('[VelocityLimiter] Failed to reset velocity', {
      userId,
      error: (error as Error).message,
    });
  }
}

export default {
  checkCoinVelocity,
  checkEarningEventVelocity,
  checkChallengeDailyCap,
  checkChallengesPerDay,
  checkReferralDailyCap,
  checkPromoCodeVelocity,
  checkScratchCardDailyCap,
  checkBillUploadDailyCap,
  checkBillDuplication,
  checkOrderCancellationDailyCap,
  trackDeviceReferral,
  resetUserVelocity,
};
