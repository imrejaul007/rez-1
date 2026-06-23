/**
 * src/utils/referralSecurityHelper.ts
 *
 * Referral system abuse prevention and deduplication helpers.
 * Prevents:
 * - Multiple accounts from same device farming referrals
 * - Self-referral loops
 * - Cross-referral circles
 * - Device cluster referral farming
 * - IP-based referral farming
 */

import redisService from '../services/redisService';
import { createServiceLogger } from '../config/logger';
import { IReferral, ReferralStatus } from '../models/Referral';
import Referral from '../models/Referral';
import { User } from '../models/User';
import mongoose from 'mongoose';

const logger = createServiceLogger('referral-security');

// ─── Configuration ──────────────────────────────────────────

export const REFERRAL_SECURITY_CONFIG = {
  // Device clustering
  MAX_ACCOUNTS_PER_DEVICE: 3,
  MAX_REFERRAL_REWARDS_PER_DEVICE_PER_DAY: 5,

  // IP clustering
  MAX_ACCOUNTS_PER_IP: 5,
  MAX_REFERRAL_REWARDS_PER_IP_PER_DAY: 10,

  // Cross-referral detection
  // REZ-036 fix: Increased from 3 to 4 to detect 4-hop circular rings (A→B→C→D→A).
  // The BFS condition uses > (not >=), so maxDepth=4 explores depths 0,1,2,3 and
  // stops before depth 4 — catching any circular pattern within 4 hops.
  CIRCULAR_REFERRAL_DEPTH: 4,

  // Time windows
  REFERRAL_WINDOW_DAYS: 30,
};

// ─── Types ──────────────────────────────────────────

export interface ReferralSecurityCheck {
  allowed: boolean;
  reason?: string;
  riskScore: number;
  signals: string[];
}

export interface DeviceReferralInfo {
  deviceId: string;
  accountCount: number;
  referralCount: number;
  isProbableCluster: boolean;
}

// ─── Device Fingerprinting & Validation ──────────────────────────────────────────

/**
 * Validate that a new referral signup is not from a device with excessive referral activity.
 * Checks:
 * 1. Number of accounts on device (max 3)
 * 2. Number of referral rewards from device today (max 5)
 * 3. IP-based account clustering (max 5 accounts per IP)
 */
export async function validateReferralDevice(
  userId: string,
  deviceId: string | undefined,
  ipAddress: string | undefined,
): Promise<ReferralSecurityCheck> {
  const signals: string[] = [];
  let riskScore = 0;

  // ─── Check 1: Device-based account clustering ───────────────────────────────────

  if (deviceId) {
    try {
      const deviceReferrals = await Referral.countDocuments({
        'metadata.deviceId': deviceId,
        status: { $in: [ReferralStatus.REGISTERED, ReferralStatus.ACTIVE, ReferralStatus.COMPLETED] },
        createdAt: {
          $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000), // Last 30 days
        },
      });

      if (deviceReferrals > REFERRAL_SECURITY_CONFIG.MAX_ACCOUNTS_PER_DEVICE) {
        signals.push(
          `Device cluster detected: ${deviceReferrals} active referrals on device (max: ${REFERRAL_SECURITY_CONFIG.MAX_ACCOUNTS_PER_DEVICE})`,
        );
        riskScore += 40;
      }

      // Check daily cap for this device
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const rewardsToday = await Referral.countDocuments({
        'metadata.deviceId': deviceId,
        referrerRewarded: true,
        createdAt: { $gte: startOfDay },
      });

      if (rewardsToday >= REFERRAL_SECURITY_CONFIG.MAX_REFERRAL_REWARDS_PER_DEVICE_PER_DAY) {
        signals.push(`Device daily referral cap exceeded: ${rewardsToday} rewards today`);
        riskScore += 35;
      }
    } catch (error) {
      logger.error('[ReferralSecurity] Device clustering check failed', {
        userId,
        deviceId,
        error: (error as Error).message,
      });
    }
  }

  // ─── Check 2: IP-based account clustering ───────────────────────────────────

  if (ipAddress) {
    try {
      const ipReferrals = await Referral.countDocuments({
        'metadata.ipAddress': ipAddress,
        status: { $in: [ReferralStatus.REGISTERED, ReferralStatus.ACTIVE, ReferralStatus.COMPLETED] },
        createdAt: {
          $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000), // Last 30 days
        },
      });

      if (ipReferrals > REFERRAL_SECURITY_CONFIG.MAX_ACCOUNTS_PER_IP) {
        signals.push(
          `IP cluster detected: ${ipReferrals} active referrals from IP (max: ${REFERRAL_SECURITY_CONFIG.MAX_ACCOUNTS_PER_IP})`,
        );
        riskScore += 30;
      }

      // Check daily cap for this IP
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const rewardsToday = await Referral.countDocuments({
        'metadata.ipAddress': ipAddress,
        referrerRewarded: true,
        createdAt: { $gte: startOfDay },
      });

      if (rewardsToday >= REFERRAL_SECURITY_CONFIG.MAX_REFERRAL_REWARDS_PER_IP_PER_DAY) {
        signals.push(`IP daily referral cap exceeded: ${rewardsToday} rewards today`);
        riskScore += 25;
      }
    } catch (error) {
      logger.error('[ReferralSecurity] IP clustering check failed', {
        userId,
        ipAddress,
        error: (error as Error).message,
      });
    }
  }

  const allowed = riskScore < 60; // Score >= 60 is too risky

  if (!allowed) {
    logger.warn('[ReferralSecurity] High-risk referral device detected', {
      userId,
      deviceId,
      ipAddress,
      riskScore,
      signals,
    });
  }

  return {
    allowed,
    reason: allowed ? undefined : `Referral blocked due to device/IP clustering risk (score: ${riskScore})`,
    riskScore,
    signals,
  };
}

// ─── Self-Referral Prevention ──────────────────────────────────────────

/**
 * Check for self-referral and circular referral patterns.
 * Prevents users from creating multiple accounts to refer themselves.
 */
export async function checkCircularReferral(referrerId: string, refereeId: string): Promise<ReferralSecurityCheck> {
  const signals: string[] = [];
  let riskScore = 0;

  // ─── Check 1: Direct self-referral ───────────────────────────────────

  if (referrerId === refereeId) {
    signals.push('Direct self-referral attempt');
    riskScore = 100; // Block immediately
  }

  // ─── Check 2: Circular referral (User A → User B → User A) ───────────────────────────────────

  if (riskScore === 0) {
    try {
      const existingReferral = await Referral.findOne({
        referrer: new mongoose.Types.ObjectId(refereeId),
        referee: new mongoose.Types.ObjectId(referrerId),
      });

      if (existingReferral) {
        signals.push('Circular referral detected (2-hop loop)');
        riskScore += 80;
      }
    } catch (error) {
      logger.error('[ReferralSecurity] Circular referral check failed', {
        referrerId,
        refereeId,
        error: (error as Error).message,
      });
    }
  }

  // ─── Check 3: Multi-hop circular referral (A → B → C → A) ───────────────────────────────────

  if (riskScore === 0) {
    try {
      // Find if referrer is in any referral chain from referee going back CIRCULAR_REFERRAL_DEPTH hops
      const chain = await findReferralChain(refereeId, referrerId, REFERRAL_SECURITY_CONFIG.CIRCULAR_REFERRAL_DEPTH);

      if (chain) {
        signals.push(`Circular referral detected (${chain.depth}-hop loop): ${chain.path.join(' → ')}`);
        riskScore += 75;
      }
    } catch (error) {
      logger.error('[ReferralSecurity] Multi-hop circular referral check failed', {
        referrerId,
        refereeId,
        error: (error as Error).message,
      });
    }
  }

  const allowed = riskScore < 50;

  if (!allowed) {
    logger.warn('[ReferralSecurity] Circular referral detected', {
      referrerId,
      refereeId,
      riskScore,
      signals,
    });
  }

  return {
    allowed,
    reason: allowed ? undefined : `Referral blocked due to circular pattern (score: ${riskScore})`,
    riskScore,
    signals,
  };
}

/**
 * Helper: Find circular referral chain.
 * Uses BFS to detect if targetId is reachable from startId within maxDepth hops.
 */
async function findReferralChain(
  startId: string,
  targetId: string,
  maxDepth: number,
): Promise<{ depth: number; path: string[] } | null> {
  const visited = new Set<string>();
  const queue: { id: string; depth: number; path: string[] }[] = [{ id: startId, depth: 0, path: [startId] }];

  while (queue.length > 0) {
    const current = queue.shift()!;

    // REZ-036 fix: Use > (not >=) so depth 3 nodes are explored.
    // With >, maxDepth=4 explores depths 0,1,2,3 and stops before 4 —
    // catching 4-hop rings (A→B→C→D→A) while still preventing runaway traversal.
    if (current.depth > maxDepth) continue;
    if (visited.has(current.id)) continue;

    visited.add(current.id);

    // Find all referrals where this user is the referrer
    const referrals = await Referral.find({
      referrer: new mongoose.Types.ObjectId(current.id),
      status: { $in: [ReferralStatus.REGISTERED, ReferralStatus.ACTIVE, ReferralStatus.COMPLETED] },
    })
      .select('referee')
      .lean();

    for (const ref of referrals) {
      const nextId = ref.referee.toString();

      if (nextId === targetId) {
        return {
          depth: current.depth + 1,
          path: [...current.path, nextId],
        };
      }

      if (!visited.has(nextId)) {
        queue.push({
          id: nextId,
          depth: current.depth + 1,
          path: [...current.path, nextId],
        });
      }
    }
  }

  return null;
}

// ─── Device Fingerprint Tracking ──────────────────────────────────────────

/**
 * Update or create device fingerprint record.
 * Called during signup to track device usage.
 */
export async function trackDeviceFingerprint(
  userId: string,
  deviceId: string,
  ipAddress: string,
  userAgent: string,
): Promise<void> {
  try {
    const key = `device:${deviceId}`;
    const devices = await redisService.get<string>(key);

    const deviceUsers = devices ? JSON.parse(devices) : [];

    if (!deviceUsers.includes(userId)) {
      deviceUsers.push(userId);
      await redisService.set(key, JSON.stringify(deviceUsers), 30 * 24 * 3600); // 30 days
    }

    logger.debug('[ReferralSecurity] Device fingerprint tracked', {
      userId,
      deviceId,
      accountsOnDevice: deviceUsers.length,
    });
  } catch (error) {
    logger.error('[ReferralSecurity] Device fingerprint tracking failed', {
      userId,
      deviceId,
      error: (error as Error).message,
    });
  }
}

// ─── Referral Deduplication ──────────────────────────────────────────

/**
 * Ensure referrer doesn't create multiple active referral relationships
 * with the same or different referees on the same day.
 */
export async function checkReferrerDailyNewReferrals(
  referrerId: string,
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  try {
    const count = await Referral.countDocuments({
      referrer: new mongoose.Types.ObjectId(referrerId),
      status: { $in: [ReferralStatus.PENDING, ReferralStatus.REGISTERED, ReferralStatus.ACTIVE] },
      createdAt: { $gte: startOfDay },
    });

    // Allow max 10 new referral relationships per day per user
    const limit = 10;
    return {
      allowed: count < limit,
      count,
      limit,
    };
  } catch (error) {
    logger.error('[ReferralSecurity] Referrer daily new referrals check failed', {
      referrerId,
      error: (error as Error).message,
    });
    return { allowed: true, count: 0, limit: 10 };
  }
}

export default {
  validateReferralDevice,
  checkCircularReferral,
  trackDeviceFingerprint,
  checkReferrerDailyNewReferrals,
};
