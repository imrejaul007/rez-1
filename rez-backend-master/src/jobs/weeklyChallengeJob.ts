/**
 * WeeklyChallengeJob
 * Phase 3.3 — Habit Reinforcement
 *
 * Runs every Monday at 6:00 AM.
 * - Creates personalized weekly challenges for active users
 * - Sends push: "Your weekly challenge is ready!"
 */

import * as cron from 'node-cron';
import mongoose from 'mongoose';
import weeklyChallengeService from '../services/weeklyChallengeService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

// Schedule: every Monday at 06:00 AM (server time)
const WEEKLY_CHALLENGE_SCHEDULE = '0 6 * * 1';

let jobInstance: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

/**
 * Find user IDs that have been active in the last 30 days.
 * "Active" = has at least 1 store visit, order, or coin transaction in that window.
 */
async function getActiveUserIds(): Promise<string[]> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const StoreVisit = mongoose.model('StoreVisit');
    const activeUsers = await StoreVisit.distinct('user', {
      createdAt: { $gte: cutoff },
    });

    return activeUsers.map(String);
  } catch (err) {
    logger.warn('[WeeklyChallengeJob] Could not fetch active users, skipping notification:', err);
    return [];
  }
}

/**
 * Core job logic.
 */
async function runWeeklyChallengeJob(): Promise<void> {
  const lockKey = 'job:weekly-challenge';
  let lockToken: string | null = null;

  try {
    // Distributed lock to prevent duplicate runs across instances
    try {
      lockToken = await redisService.acquireLock(lockKey, 600); // 10 min TTL
      if (!lockToken) {
        logger.info('[WeeklyChallengeJob] Skipped — lock held by another instance');
        return;
      }
    } catch {
      // Redis unavailable — proceed without lock (safe to run idempotent logic)
    }

    const startTime = Date.now();
    logger.info('[WeeklyChallengeJob] Starting weekly challenge generation...');

    // 1. Generate weekly challenges (idempotent — no-ops if already created)
    const challenges = await weeklyChallengeService.generateWeeklyChallenges();
    logger.info(`[WeeklyChallengeJob] ${challenges.length} challenges ready for the week`);

    // 2. Get active user IDs to notify
    const activeUserIds = await getActiveUserIds();
    logger.info(`[WeeklyChallengeJob] Found ${activeUserIds.length} active users to notify`);

    // 3. Send push notifications
    if (activeUserIds.length > 0) {
      await weeklyChallengeService.notifyActiveUsers(activeUserIds);
    }

    const duration = Date.now() - startTime;
    logger.info(
      `[WeeklyChallengeJob] Completed in ${duration}ms — ${challenges.length} challenges, ${activeUserIds.length} users notified`,
    );
  } catch (err) {
    logger.error('[WeeklyChallengeJob] Error:', err);
  } finally {
    if (lockToken) {
      try {
        await redisService.releaseLock(lockKey, lockToken);
      } catch {
        // Redis unavailable
      }
    }
    isRunning = false;
  }
}

/**
 * Initialize and start the weekly challenge job.
 */
export function initWeeklyChallengeJob(): void {
  if (jobInstance) {
    logger.info('[WeeklyChallengeJob] Already running');
    return;
  }

  logger.info(`[WeeklyChallengeJob] Starting — schedule: ${WEEKLY_CHALLENGE_SCHEDULE}`);

  jobInstance = cron.schedule(WEEKLY_CHALLENGE_SCHEDULE, async () => {
    if (isRunning) {
      logger.info('[WeeklyChallengeJob] Previous run still in progress, skipping');
      return;
    }
    isRunning = true;
    await runWeeklyChallengeJob();
  });

  logger.info('[WeeklyChallengeJob] Started — runs every Monday at 6:00 AM');
}

/**
 * Stop the job.
 */
export function stopWeeklyChallengeJob(): void {
  if (jobInstance) {
    jobInstance.stop();
    jobInstance = null;
    logger.info('[WeeklyChallengeJob] Stopped');
  }
}

/**
 * Manually trigger the job (for testing / admin use).
 */
export async function triggerWeeklyChallengeJob(): Promise<void> {
  if (isRunning) {
    logger.info('[WeeklyChallengeJob] Already running, trigger ignored');
    return;
  }
  isRunning = true;
  await runWeeklyChallengeJob();
}

export default {
  initialize: initWeeklyChallengeJob,
  stop: stopWeeklyChallengeJob,
  trigger: triggerWeeklyChallengeJob,
};
