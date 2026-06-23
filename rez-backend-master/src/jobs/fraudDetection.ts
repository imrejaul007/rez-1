/**
 * fraudDetection.ts — Coin velocity fraud detection job
 *
 * runFraudDetection(): scans CoinTransaction from last 24h,
 * computes z-scores per user, flags outliers (z > 3) on the User model.
 *
 * scheduleFraudDetection(): schedules runFraudDetection() every 24h
 * using node-cron.
 */

import mongoose from 'mongoose';
import { logger } from '../config/logger';
import redisService from '../services/redisService';

const FRAUD_Z_SCORE_THRESHOLD = 3;
const LOOKBACK_HOURS = 24;

// D4: Distributed lock — scan+flag runs exactly once per window regardless of pod count.
const LOCK_KEY = 'cron:fraud-detection:daily';
const LOCK_TTL_SECONDS = 30 * 60;

export async function runFraudDetection(): Promise<void> {
  logger.info('[FraudDetection] Starting coin velocity check...');

  try {
    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

    // Aggregate earned coins per user in the last 24h
    const CoinTransaction = mongoose.model('CoinTransaction');
    const results: Array<{ _id: mongoose.Types.ObjectId; earnedLast24h: number }> = await CoinTransaction.aggregate([
      {
        $match: {
          type: 'earned',
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: '$user',
          earnedLast24h: { $sum: '$amount' },
        },
      },
    ]);

    if (results.length === 0) {
      logger.info('[FraudDetection] No transactions in last 24h. Skipping.');
      return;
    }

    // Compute mean and standard deviation
    const values = results.map((r) => r.earnedLast24h);
    const n = values.length;
    const mean = values.reduce((acc, v) => acc + v, 0) / n;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
      logger.info('[FraudDetection] Standard deviation is 0 — all users earned the same amount. No flags.');
      return;
    }

    // Find users where earned > mean + 3*stdDev (z-score > 3)
    const flaggedUsers: Array<{ userId: string; earnedLast24h: number; zScore: number }> = [];

    for (const row of results) {
      const zScore = (row.earnedLast24h - mean) / stdDev;
      if (zScore > FRAUD_Z_SCORE_THRESHOLD) {
        flaggedUsers.push({
          userId: row._id.toString(),
          earnedLast24h: row.earnedLast24h,
          zScore: Math.round(zScore * 100) / 100,
        });
      }
    }

    if (flaggedUsers.length === 0) {
      logger.info('[FraudDetection] No users flagged. mean=%d stdDev=%d', mean, stdDev);
      return;
    }

    logger.warn('[FraudDetection] Flagging %d users for coin velocity', flaggedUsers.length, {
      flaggedUserIds: flaggedUsers.map((f) => f.userId),
    });

    // Update User model with fraud flag
    const User = mongoose.model('User');
    const flaggedAt = new Date();

    await Promise.all(
      flaggedUsers.map((f) =>
        User.updateOne(
          { _id: new mongoose.Types.ObjectId(f.userId) },
          {
            $set: {
              'fraudFlags.coinVelocity': {
                flaggedAt,
                earnedLast24h: f.earnedLast24h,
                zScore: f.zScore,
              },
            },
          },
        ).catch((err: Error) => {
          logger.error('[FraudDetection] Failed to flag user %s: %s', f.userId, err.message);
        }),
      ),
    );

    logger.info('[FraudDetection] Done. Flagged %d users. mean=%d stdDev=%d', flaggedUsers.length, mean, stdDev);
  } catch (err: any) {
    logger.error('[FraudDetection] Job error:', err);
  }
}

/**
 * Schedule fraud detection to run every 24h using node-cron.
 * Falls back to setInterval if cron is unavailable.
 */
export function scheduleFraudDetection(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cron = require('node-cron');
    // Run at midnight every day: "0 0 * * *"
    cron.schedule('0 0 * * *', async () => {
      // D4: Only one pod runs the scan; others skip.
      const lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
      if (!lockToken) {
        logger.info('[FraudDetection] Already running on another pod — skipping');
        return;
      }
      try {
        await runFraudDetection();
      } finally {
        await redisService.releaseLock(LOCK_KEY, lockToken);
      }
    });
    logger.info('[FraudDetection] Scheduled via node-cron (daily at midnight)');
  } catch (err: any) {
    logger.warn('[FraudDetection] node-cron unavailable, falling back to setInterval (24h): %s', err.message);
    setInterval(
      async () => {
        // D4: Same lock guard on fallback path.
        const lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
        if (!lockToken) {
          logger.info('[FraudDetection] Already running on another pod — skipping');
          return;
        }
        try {
          await runFraudDetection();
        } finally {
          await redisService.releaseLock(LOCK_KEY, lockToken);
        }
      },
      LOOKBACK_HOURS * 60 * 60 * 1000,
    );
  }
}
