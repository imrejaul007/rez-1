/**
 * src/services/rewardAbuseDetector.ts
 *
 * Comprehensive reward abuse prevention system.
 * Detects and blocks:
 * - Velocity abuse (rapid-fire coin earning)
 * - Device clustering (multi-account farms)
 * - Referral self-cycling
 * - Bill upload duplication
 * - Challenge farming (multiple completions)
 * - SIP cancellation loops
 * - Web order loyalty abuse
 *
 * Uses Redis for fast, distributed rate limiting and anomaly tracking.
 */

import redisService from './redisService';
import { createServiceLogger } from '../config/logger';
import { User } from '../models/User';
import { DeviceFingerprint } from '../models/DeviceFingerprint';
import { CoinTransaction } from '../models/CoinTransaction';
import { Types } from 'mongoose';

const logger = createServiceLogger('reward-abuse-detector');

// ─── Lean Document Interfaces ────────────────────────────────────────────────

/** BED-007: Typed lean doc for DeviceFingerprint — replaces (d: any) cast */
interface DeviceFingerprintLeanDoc {
  _id: Types.ObjectId;
  deviceHash: string;
  users: Array<{ userId: string; addedAt?: Date }>;
}

/** BED-007: Typed lean doc for CoinTransaction (createdAt access on bill dup check) */
interface CoinTransactionLeanDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId | string;
  amount: number;
  balance: number;
  type: string;
  source?: string;
  description?: string;
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

// ─── Thresholds ──────────────────────────────────────────

// Velocity: max coins per window
const VELOCITY_THRESHOLDS = {
  coins_per_hour: 500, // Legitimate users earn 1-50/tx, max ~10 tx/day
  coins_per_day: 5000, // Hard daily cap
  earning_events_per_hour: 20, // Events per hour
  earning_events_per_day: 50, // Events per day
};

// Device clustering: same device across multiple accounts
const DEVICE_CLUSTERING_THRESHOLDS = {
  max_accounts_per_device: 3, // Allow 1-2 family accounts max
  max_devices_per_account: 5, // Allow reasonable device switching
};

// Referral abuse
const REFERRAL_THRESHOLDS = {
  max_referral_rewards_per_day: 2, // Can't process unlimited first-order bonuses
  max_accounts_referred_from_device: 5, // Device-wide referral farming cap
};

// Bill upload farming
const BILL_UPLOAD_THRESHOLDS = {
  min_hours_between_duplicate_bills: 72, // 3 days between same merchant+amount
  max_bills_per_day: 10, // Daily bill upload limit
  max_duplicate_uploads_per_week: 2, // Allow 2 retries max per week
};

// Challenge farming
const CHALLENGE_THRESHOLDS = {
  max_same_challenge_completions_per_day: 1, // One completion per challenge per day
  max_challenge_rewards_per_hour: 2, // 2 challenges/hour max
  max_challenge_rewards_per_day: 10, // 10 challenges/day max
};

// SIP abuse
const SIP_THRESHOLDS = {
  min_days_before_reactivation: 30, // Must wait 30 days before re-creating same SIP
  max_sip_cancellations_per_quarter: 3, // Max 3 cancellations per 90 days
};

// Web ordering abuse
const WEB_ORDER_THRESHOLDS = {
  min_minutes_order_to_cancellation: 30, // Must keep order for 30+ minutes
  max_order_cancellations_per_day: 2, // Max 2 cancellations/day
  min_days_between_suspicion_orders: 7, // Orders on same day = suspicious
};

// ─── Types ──────────────────────────────────────────

export interface VelocityCheckResult {
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
  timeWindowSeconds: number;
}

export interface AbuseSignal {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface DeviceClusterResult {
  clustered: boolean;
  accountsOnDevice: number;
  otherAccounts?: string[];
  flagged: boolean;
}

// ─── Velocity Checks ──────────────────────────────────────────

/**
 * Check if user is earning coins too rapidly (velocity abuse).
 * Uses Redis atomic increment with TTL.
 */
export async function checkCoinVelocity(
  userId: string,
  amount: number = 1,
  action: string = 'generic',
): Promise<VelocityCheckResult> {
  const now = new Date();
  const hourKey = `velocity:coins:${userId}:hourly:${now.getHours()}:${now.getDate()}`;
  const dayKey = `velocity:coins:${userId}:daily:${now.toISOString().slice(0, 10)}`;

  try {
    // Hourly increment
    const hourCount = (await redisService.incr(hourKey, amount)) ?? 0;
    await redisService.expire(hourKey, 3600);

    if (hourCount > VELOCITY_THRESHOLDS.coins_per_hour) {
      logger.warn('[AbuseDetector] Coin velocity exceeded (hourly)', {
        userId,
        amount,
        action,
        current: hourCount,
        limit: VELOCITY_THRESHOLDS.coins_per_hour,
      });

      return {
        allowed: false,
        reason: `Coin earning rate limit (${VELOCITY_THRESHOLDS.coins_per_hour}/hour) exceeded`,
        current: hourCount,
        limit: VELOCITY_THRESHOLDS.coins_per_hour,
        timeWindowSeconds: 3600,
      };
    }

    // Daily increment
    const dayCount = (await redisService.incr(dayKey, amount)) ?? 0;
    await redisService.expire(dayKey, 86400);

    if (dayCount > VELOCITY_THRESHOLDS.coins_per_day) {
      logger.warn('[AbuseDetector] Coin velocity exceeded (daily)', {
        userId,
        amount,
        action,
        current: dayCount,
        limit: VELOCITY_THRESHOLDS.coins_per_day,
      });

      return {
        allowed: false,
        reason: `Daily coin earning limit (${VELOCITY_THRESHOLDS.coins_per_day}/day) exceeded`,
        current: dayCount,
        limit: VELOCITY_THRESHOLDS.coins_per_day,
        timeWindowSeconds: 86400,
      };
    }

    return {
      allowed: true,
      current: hourCount,
      limit: VELOCITY_THRESHOLDS.coins_per_hour,
      timeWindowSeconds: 3600,
    };
  } catch (error) {
    logger.error('[AbuseDetector] Velocity check error', { error: (error as Error).message, userId });
    // Fail open on Redis error, but log it
    return {
      allowed: true,
      current: 0,
      limit: VELOCITY_THRESHOLDS.coins_per_hour,
      timeWindowSeconds: 3600,
    };
  }
}

/**
 * Check if user is triggering earning events too frequently.
 */
export async function checkEarningEventVelocity(userId: string, source: string): Promise<VelocityCheckResult> {
  const now = new Date();
  const hourKey = `velocity:events:${userId}:hourly:${now.getHours()}:${now.getDate()}`;
  const dayKey = `velocity:events:${userId}:daily:${now.toISOString().slice(0, 10)}`;

  try {
    const hourCount = (await redisService.incr(hourKey, 1)) ?? 0;
    await redisService.expire(hourKey, 3600);

    if (hourCount > VELOCITY_THRESHOLDS.earning_events_per_hour) {
      logger.warn('[AbuseDetector] Event velocity exceeded (hourly)', {
        userId,
        source,
        current: hourCount,
        limit: VELOCITY_THRESHOLDS.earning_events_per_hour,
      });

      return {
        allowed: false,
        reason: `Event rate limit (${VELOCITY_THRESHOLDS.earning_events_per_hour}/hour) exceeded`,
        current: hourCount,
        limit: VELOCITY_THRESHOLDS.earning_events_per_hour,
        timeWindowSeconds: 3600,
      };
    }

    const dayCount = (await redisService.incr(dayKey, 1)) ?? 0;
    await redisService.expire(dayKey, 86400);

    if (dayCount > VELOCITY_THRESHOLDS.earning_events_per_day) {
      return {
        allowed: false,
        reason: `Daily event limit (${VELOCITY_THRESHOLDS.earning_events_per_day}/day) exceeded`,
        current: dayCount,
        limit: VELOCITY_THRESHOLDS.earning_events_per_day,
        timeWindowSeconds: 86400,
      };
    }

    return {
      allowed: true,
      current: hourCount,
      limit: VELOCITY_THRESHOLDS.earning_events_per_hour,
      timeWindowSeconds: 3600,
    };
  } catch (error) {
    logger.error('[AbuseDetector] Event velocity check error', { error: (error as Error).message, userId });
    return {
      allowed: true,
      current: 0,
      limit: VELOCITY_THRESHOLDS.earning_events_per_hour,
      timeWindowSeconds: 3600,
    };
  }
}

// ─── Device Clustering Checks ──────────────────────────────────────────

/**
 * Detect if multiple accounts are operating from the same device.
 * Flags device clustering (farming).
 */
export async function checkDeviceCluster(userId: string): Promise<DeviceClusterResult> {
  try {
    // Get user's device fingerprints
    // FIX: DeviceFingerprint uses users.userId array, not a top-level user field
    const userDevices = await DeviceFingerprint.find({ 'users.userId': userId }).select('deviceHash').lean() as unknown as unknown as unknown as DeviceFingerprintLeanDoc[];
    const userDeviceHashes = userDevices.map((d) => d.deviceHash);

    if (userDeviceHashes.length === 0) {
      return { clustered: false, accountsOnDevice: 1, flagged: false };
    }

    // For each device, find how many accounts use it
    const maxCluster = await Promise.all(
      userDeviceHashes.map(async (hash: string) => {
        const devicesWithHash = await DeviceFingerprint.countDocuments({
          deviceHash: hash,
        });
        return devicesWithHash;
      }),
    );

    const maxAccountsOnDevice = Math.max(...maxCluster, 1);

    const flagged = maxAccountsOnDevice > DEVICE_CLUSTERING_THRESHOLDS.max_accounts_per_device;

    if (flagged) {
      logger.warn('[AbuseDetector] Device clustering detected', {
        userId,
        accountsOnDevice: maxAccountsOnDevice,
        threshold: DEVICE_CLUSTERING_THRESHOLDS.max_accounts_per_device,
      });
    }

    return {
      clustered: maxAccountsOnDevice > 1,
      accountsOnDevice: maxAccountsOnDevice,
      flagged,
    };
  } catch (error) {
    logger.error('[AbuseDetector] Device cluster check error', {
      error: (error as Error).message,
      userId,
    });
    return { clustered: false, accountsOnDevice: 1, flagged: false };
  }
}

// ─── Referral Abuse Checks ──────────────────────────────────────────

/**
 * Check if user is self-referring via multiple accounts (same device).
 */
export async function checkReferralAbuse(
  referrerId: string,
  refereeId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Get referrer's devices
    const referrerDevices = await DeviceFingerprint.find({ 'users.userId': referrerId }).select('deviceHash').lean() as unknown as unknown as unknown as DeviceFingerprintLeanDoc[];

    // Get referee's devices
    const refereeDevices = await DeviceFingerprint.find({ 'users.userId': refereeId }).select('deviceHash').lean() as unknown as unknown as unknown as DeviceFingerprintLeanDoc[];

    const referrerHashes = new Set(referrerDevices.map((d) => d.deviceHash));
    const refereeHashes = new Set(refereeDevices.map((d) => d.deviceHash));

    // Check for overlap (same device = self-referral)
    const overlap = [...referrerHashes].filter((hash) => refereeHashes.has(hash));
    if (overlap.length > 0) {
      logger.warn('[AbuseDetector] Self-referral detected (device overlap)', {
        referrerId,
        refereeId,
        sharedDevices: overlap.length,
      });

      return {
        allowed: false,
        reason: 'Referral rejected: accounts appear to be controlled by same user',
      };
    }

    // Check daily referral reward count
    const today = new Date().toISOString().slice(0, 10);
    const dailyRefKey = `referral:rewards:${referrerId}:daily:${today}`;
    const rewardCount = await redisService.get(dailyRefKey);

    if (rewardCount && parseInt(rewardCount as string, 10) >= REFERRAL_THRESHOLDS.max_referral_rewards_per_day) {
      logger.warn('[AbuseDetector] Referral reward velocity exceeded', {
        referrerId,
        count: rewardCount,
        limit: REFERRAL_THRESHOLDS.max_referral_rewards_per_day,
      });

      return {
        allowed: false,
        reason: `Referral reward limit (${REFERRAL_THRESHOLDS.max_referral_rewards_per_day}/day) reached`,
      };
    }

    return { allowed: true };
  } catch (error) {
    logger.error('[AbuseDetector] Referral abuse check error', {
      error: (error as Error).message,
      referrerId,
      refereeId,
    });
    return { allowed: true }; // Fail open
  }
}

// ─── Bill Upload Farming Checks ──────────────────────────────────────────

/**
 * Detect duplicate bill uploads (same merchant + amount within short time).
 */
export async function checkBillDuplication(
  userId: string,
  merchantId: string,
  amount: number,
): Promise<{ allowed: boolean; reason?: string; lastUploadDate?: Date }> {
  try {
    // Find recent bills from same merchant + similar amount (±5%)
    const minAmount = amount * 0.95;
    const maxAmount = amount * 1.05;
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    const recentBill = await CoinTransaction.findOne({
      user: userId,
      'metadata.merchantId': merchantId,
      amount: { $gte: minAmount, $lte: maxAmount },
      source: 'bill_upload',
      createdAt: { $gte: threeHoursAgo },
    })
      .select('createdAt')
      .lean() as unknown as unknown as CoinTransactionLeanDoc | null;

    if (recentBill?.createdAt) {
      const hoursSinceLastUpload = (Date.now() - recentBill.createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastUpload < BILL_UPLOAD_THRESHOLDS.min_hours_between_duplicate_bills) {
        logger.warn('[AbuseDetector] Duplicate bill upload detected', {
          userId,
          merchantId,
          hoursSinceLastUpload,
          minHoursRequired: BILL_UPLOAD_THRESHOLDS.min_hours_between_duplicate_bills,
        });

        return {
          allowed: false,
          reason: `Please wait ${BILL_UPLOAD_THRESHOLDS.min_hours_between_duplicate_bills} hours before uploading bills from this merchant again`,
          lastUploadDate: recentBill.createdAt,
        };
      }
    }

    // Check daily bill upload limit
    const today = new Date().toISOString().slice(0, 10);
    const dailyBillKey = `bills:${userId}:daily:${today}`;
    const billCount = (await redisService.incr(dailyBillKey, 1)) ?? 0;
    await redisService.expire(dailyBillKey, 86400);

    if (billCount > BILL_UPLOAD_THRESHOLDS.max_bills_per_day) {
      logger.warn('[AbuseDetector] Daily bill upload limit exceeded', {
        userId,
        count: billCount,
        limit: BILL_UPLOAD_THRESHOLDS.max_bills_per_day,
      });

      return {
        allowed: false,
        reason: `Daily bill upload limit (${BILL_UPLOAD_THRESHOLDS.max_bills_per_day}/day) reached`,
      };
    }

    return { allowed: true };
  } catch (error) {
    logger.error('[AbuseDetector] Bill duplication check error', {
      error: (error as Error).message,
      userId,
      merchantId,
    });
    return { allowed: true };
  }
}

// ─── Challenge Farming Checks ──────────────────────────────────────────

/**
 * Check if user completed the same challenge multiple times today (farming).
 */
export async function checkChallengeFarming(
  userId: string,
  challengeId: string,
): Promise<{ allowed: boolean; reason?: string; completionCount?: number }> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const challengeCompletionKey = `challenge:${challengeId}:${userId}:daily:${today}`;

    const count = (await redisService.incr(challengeCompletionKey, 1)) ?? 0;
    await redisService.expire(challengeCompletionKey, 86400);

    if (count > CHALLENGE_THRESHOLDS.max_same_challenge_completions_per_day) {
      logger.warn('[AbuseDetector] Challenge farming detected (same challenge)', {
        userId,
        challengeId,
        completionCount: count,
        limit: CHALLENGE_THRESHOLDS.max_same_challenge_completions_per_day,
      });

      return {
        allowed: false,
        reason: 'Each challenge can only be completed once per day',
        completionCount: count,
      };
    }

    // Also check total challenge rewards per hour
    const now = new Date();
    const hourKey = `challenge:rewards:${userId}:hourly:${now.getHours()}:${now.getDate()}`;
    const hourCount = (await redisService.incr(hourKey, 1)) ?? 0;
    await redisService.expire(hourKey, 3600);

    if (hourCount > CHALLENGE_THRESHOLDS.max_challenge_rewards_per_hour) {
      logger.warn('[AbuseDetector] Challenge farming detected (hourly velocity)', {
        userId,
        hourCount,
        limit: CHALLENGE_THRESHOLDS.max_challenge_rewards_per_hour,
      });

      return {
        allowed: false,
        reason: `Challenge completion rate (${CHALLENGE_THRESHOLDS.max_challenge_rewards_per_hour}/hour) exceeded`,
      };
    }

    return { allowed: true };
  } catch (error) {
    logger.error('[AbuseDetector] Challenge farming check error', {
      error: (error as Error).message,
      userId,
      challengeId,
    });
    return { allowed: true };
  }
}

// ─── SIP Abuse Checks ──────────────────────────────────────────────────────

/**
 * Check if user is cancelling and re-creating SIP to exploit bonuses.
 */
export async function checkSIPAbusePattern(
  userId: string,
  sipId: string,
): Promise<{ allowed: boolean; reason?: string; cancellationCount?: number }> {
  try {
    const quarterKey = `sip:cancellations:${userId}:quarter`;
    const quarterValue = await redisService.get(quarterKey);

    if (!quarterValue) {
      // Initialize with current quarter expiry (90 days)
      await redisService.set(quarterKey, '1', 90 * 24 * 60 * 60);
    } else {
      const count = parseInt(quarterValue as string, 10) + 1;

      if (count > SIP_THRESHOLDS.max_sip_cancellations_per_quarter) {
        logger.warn('[AbuseDetector] SIP abuse pattern detected', {
          userId,
          sipId,
          cancellationCount: count,
          limit: SIP_THRESHOLDS.max_sip_cancellations_per_quarter,
        });

        return {
          allowed: false,
          reason: `SIP cancellation limit (${SIP_THRESHOLDS.max_sip_cancellations_per_quarter}/quarter) reached`,
          cancellationCount: count,
        };
      }

      await redisService.set(quarterKey, String(count), 90 * 24 * 60 * 60);
    }

    return { allowed: true };
  } catch (error) {
    logger.error('[AbuseDetector] SIP abuse check error', {
      error: (error as Error).message,
      userId,
      sipId,
    });
    return { allowed: true };
  }
}

// ─── Web Ordering Abuse Checks ──────────────────────────────────────────

/**
 * Check if user is placing and cancelling orders to farm loyalty points.
 */
export async function checkWebOrderAbusePattern(
  userId: string,
  orderAmount: number,
): Promise<{ allowed: boolean; reason?: string; cancellationCount?: number }> {
  try {
    // Check daily cancellation count
    const today = new Date().toISOString().slice(0, 10);
    const dailyCancelKey = `orders:cancellations:${userId}:daily:${today}`;

    const cancelCount = await redisService.incr(dailyCancelKey, 1);
    await redisService.expire(dailyCancelKey, 86400);

    if ((cancelCount ?? 0) > WEB_ORDER_THRESHOLDS.max_order_cancellations_per_day) {
      logger.warn('[AbuseDetector] Order cancellation abuse detected', {
        userId,
        cancelCount,
        limit: WEB_ORDER_THRESHOLDS.max_order_cancellations_per_day,
      });

      return {
        allowed: false,
        reason: `Order cancellation limit (${WEB_ORDER_THRESHOLDS.max_order_cancellations_per_day}/day) exceeded`,
        cancellationCount: cancelCount ?? 0,
      };
    }

    // Check for suspicious order patterns (same amount, same day)
    const dayOrderKey = `orders:amount:${userId}:daily:${today}:${Math.floor(orderAmount)}`;
    const sameAmountCount = await redisService.incr(dayOrderKey, 1);
    await redisService.expire(dayOrderKey, 86400);

    if ((sameAmountCount ?? 0) > 2) {
      logger.warn('[AbuseDetector] Suspicious web order pattern', {
        userId,
        orderAmount,
        sameAmountCount,
      });

      return {
        allowed: false,
        reason: 'Multiple orders with same amount detected. Please space out your orders.',
      };
    }

    return { allowed: true };
  } catch (error) {
    logger.error('[AbuseDetector] Web order abuse check error', {
      error: (error as Error).message,
      userId,
    });
    return { allowed: true };
  }
}

// ─── Comprehensive Abuse Signal Reporting ──────────────────────────────

/**
 * Collect all abuse signals for a user and flag if pattern emerges.
 */
export async function collectAbuseSignals(userId: string): Promise<AbuseSignal[]> {
  const signals: AbuseSignal[] = [];

  try {
    // Check coin velocity
    const velResult = await checkCoinVelocity(userId);
    if (!velResult.allowed) {
      signals.push({
        type: 'coin_velocity',
        severity: 'high',
        reason: velResult.reason || 'High coin earning rate',
        userId,
        metadata: { current: velResult.current, limit: velResult.limit },
      });
    }

    // Check event velocity
    const eventVelResult = await checkEarningEventVelocity(userId, 'audit');
    if (!eventVelResult.allowed) {
      signals.push({
        type: 'event_velocity',
        severity: 'high',
        reason: eventVelResult.reason || 'High event rate',
        userId,
        metadata: { current: eventVelResult.current, limit: eventVelResult.limit },
      });
    }

    // Check device clustering
    const deviceCluster = await checkDeviceCluster(userId);
    if (deviceCluster.flagged) {
      signals.push({
        type: 'device_clustering',
        severity: 'critical',
        reason: `${deviceCluster.accountsOnDevice} accounts on same device`,
        userId,
        metadata: { accountsOnDevice: deviceCluster.accountsOnDevice },
      });
    }

    if (signals.length > 0) {
      logger.warn('[AbuseDetector] Multiple abuse signals detected', {
        userId,
        signalCount: signals.length,
        types: signals.map((s) => s.type),
      });
    }
  } catch (error) {
    logger.error('[AbuseDetector] Error collecting abuse signals', {
      error: (error as Error).message,
      userId,
    });
  }

  return signals;
}

export default {
  checkCoinVelocity,
  checkEarningEventVelocity,
  checkDeviceCluster,
  checkReferralAbuse,
  checkBillDuplication,
  checkChallengeFarming,
  checkSIPAbusePattern,
  checkWebOrderAbusePattern,
  collectAbuseSignals,
};
