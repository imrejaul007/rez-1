// @ts-nocheck
/**
 * dailyCheckinRoutes.ts
 *
 * Routes:
 *   POST /api/gamification/daily-checkin       — perform daily check-in, award coins per config
 *   GET  /api/gamification/daily-checkin/status — return current check-in state
 *
 * Redis idempotency key:  checkin:{userId}:{YYYY-MM-DD}   TTL 25 h
 * Streak tracking uses the existing DailyCheckIn model (MongoDB) so that
 * streak counts are consistent with the rest of the platform.
 *
 * Coin rewards are driven by DailyCheckInConfig (admin-configurable).
 * The config is cached in-memory for 5 minutes to avoid per-request DB reads.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import redisService from '../services/redisService';
import DailyCheckIn from '../models/DailyCheckIn';
import DailyCheckInConfig from '../models/DailyCheckInConfig';
import mongoose from 'mongoose';

// ─── Config cache (avoids per-request DB reads) ───────────────────────────────
const DEFAULT_DAY_REWARDS = [10, 15, 20, 25, 30, 40, 100];
const CONFIG_TTL_MS = 5 * 60 * 1000; // 5 minutes

let _configCache: {
  dayRewards: number[];
  milestoneRewards: Array<{ day: number; coins: number; badge?: string }>;
  isEnabled: boolean;
} | null = null;
let _configCachedAt = 0;

async function getCheckinConfig() {
  if (_configCache && Date.now() - _configCachedAt < CONFIG_TTL_MS) {
    return _configCache;
  }
  try {
    const config = await DailyCheckInConfig.getActiveConfig();
    _configCache = {
      dayRewards: config.dayRewards?.length === 7 ? config.dayRewards : DEFAULT_DAY_REWARDS,
      milestoneRewards: config.milestoneRewards || [],
      isEnabled: config.isEnabled,
    };
    _configCachedAt = Date.now();
  } catch {
    _configCache = { dayRewards: DEFAULT_DAY_REWARDS, milestoneRewards: [], isEnabled: true };
    _configCachedAt = Date.now();
  }
  return _configCache!;
}

/** Reward for a given streak day, using the 7-day cycle from config */
function getDayReward(streak: number, dayRewards: number[]): number {
  const idx = (streak - 1) % 7;
  return dayRewards[idx] ?? 10;
}

/** One-time milestone bonus if the streak exactly hits a configured milestone */
function getMilestoneBonus(streak: number, milestones: Array<{ day: number; coins: number }>): number {
  const hit = milestones.find((m) => m.day === streak);
  return hit ? hit.coins : 0;
}

const router = Router();

// 5 attempts per minute – the endpoint is idempotent but we cap abuse
const checkinLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  prefix: 'daily-checkin',
  message: 'Too many check-in attempts. Please wait a moment.',
});

// All routes require a valid JWT
router.use(authenticate);

// ─── helpers ──────────────────────────────────────────────────────────────────

/** UTC date string formatted as YYYY-MM-DD */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Redis key that gates one check-in per user per calendar day */
function checkinRedisKey(userId: string): string {
  return `checkin:${userId}:${todayKey()}`;
}

/** UTC midnight for today – used as the DailyCheckIn.date value */
function startOfTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── POST /api/gamification/daily-checkin ─────────────────────────────────────

router.post(
  '/',
  checkinLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id?.toString();

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const redisKey = checkinRedisKey(userId);

    // ── idempotency: check Redis first (fast path) ──────────────────────────
    const alreadyCheckedIn = await redisService.get<string>(redisKey);

    if (alreadyCheckedIn) {
      // Already checked in today – return current streak without awarding coins
      const currentStreak = await DailyCheckIn.getCurrentStreak(new mongoose.Types.ObjectId(userId));
      return res.json({
        success: true,
        data: {
          rewarded: false,
          coins: 0,
          streak: currentStreak,
        },
        message: 'Already checked in today',
      });
    }

    // ── first check-in for today ────────────────────────────────────────────
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const todayDate = startOfTodayUTC();

    // Double-check MongoDB to guard against Redis eviction
    const existingRecord = await DailyCheckIn.findOne({
      userId: userObjectId,
      date: todayDate,
    }).lean();

    if (existingRecord) {
      // Sync Redis and return no-reward response
      await redisService.set(redisKey, '1', 25 * 60 * 60);
      return res.json({
        success: true,
        data: {
          rewarded: false,
          coins: 0,
          streak: existingRecord.streak,
        },
        message: 'Already checked in today',
      });
    }

    // ── compute new streak ──────────────────────────────────────────────────
    const previousStreak = await DailyCheckIn.getCurrentStreak(userObjectId);
    const newStreak = previousStreak + 1;

    // Read admin-configured reward values (cached 5 min)
    const cfg = await getCheckinConfig();
    const BASE_COINS = getDayReward(newStreak, cfg.dayRewards);
    const bonusCoins = getMilestoneBonus(newStreak, cfg.milestoneRewards);
    const totalCoins = BASE_COINS + bonusCoins;

    // ── persist DailyCheckIn record ─────────────────────────────────────────
    const checkInDoc = await DailyCheckIn.create({
      userId: userObjectId,
      date: todayDate,
      streak: newStreak,
      coinsEarned: BASE_COINS,
      bonusEarned: bonusCoins,
      totalEarned: totalCoins,
      coinType: 'rez',
    });

    // ── set Redis idempotency key (25 h TTL) ────────────────────────────────
    await redisService.set(redisKey, '1', 25 * 60 * 60);

    // ── award coins via rewardEngine ────────────────────────────────────────
    try {
      const { rewardEngine } = await import('../core/rewardEngine');
      await rewardEngine.issue({
        userId,
        amount: totalCoins,
        coinType: 'rez',
        source: 'daily_login',
        rewardType: 'engagement',
        description: `Daily check-in reward (streak day ${newStreak})`,
        operationType: 'loyalty_credit',
        referenceId: `daily_checkin:${userId}:${todayKey()}`,
        referenceModel: 'DailyCheckIn',
        metadata: {
          streak: newStreak,
          baseCoins: BASE_COINS,
          bonusCoins,
          checkInId: checkInDoc._id.toString(),
        },
      });
    } catch (rewardErr) {
      // Non-blocking — log but do not fail the check-in
      logger.error('[DailyCheckin] rewardEngine.issue failed', {
        userId,
        error: (rewardErr as Error).message,
      });
    }

    logger.info('[DailyCheckin] Check-in recorded', {
      userId,
      streak: newStreak,
      totalCoins,
    });

    return res.status(201).json({
      success: true,
      data: {
        rewarded: true,
        coins: totalCoins,
        streak: newStreak,
        bonusCoins,
        baseCoins: BASE_COINS,
      },
      message: `Check-in complete! You earned ${totalCoins} coins.`,
    });
  }),
);

// ─── GET /api/gamification/daily-checkin/status ───────────────────────────────

router.get(
  '/status',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id?.toString();

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Check Redis first for today's flag
    const redisFlag = await redisService.get<string>(checkinRedisKey(userId));
    const checkedInToday = !!redisFlag || (await DailyCheckIn.hasCheckedInToday(userObjectId));

    const currentStreak = await DailyCheckIn.getCurrentStreak(userObjectId);

    // Compute nextReward using admin-configured day rewards + milestone bonuses
    // nextStreakDay is always currentStreak + 1: the upcoming day to earn rewards for
    const nextStreakDay = currentStreak + 1;
    const statusCfg = await getCheckinConfig();
    const nextReward =
      getDayReward(nextStreakDay, statusCfg.dayRewards) + getMilestoneBonus(nextStreakDay, statusCfg.milestoneRewards);

    return res.json({
      success: true,
      data: {
        checkedInToday,
        streak: currentStreak,
        nextReward,
      },
    });
  }),
);

export default router;
