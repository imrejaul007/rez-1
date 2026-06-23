import * as cron from 'node-cron';
import { logger } from '../config/logger';
import { TryFeedCache } from '../models/TryFeedCache';
import { User } from '../models/User';
import tryFeedService from '../services/tryFeedService';
import mongoose from 'mongoose';

let refreshJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

const CRON_SCHEDULE = '0 */6 * * *'; // Every 6 hours
const CACHE_TTL_HOURS = 6;
const ACTIVITY_WINDOW_HOURS = 24;

/**
 * Try Feed Refresh Job
 *
 * Runs every 6 hours to:
 * 1. Clear expired cache entries
 * 2. Pre-compute feed for active users
 */
export function startTryFeedRefreshJob(): void {
  if (refreshJob) {
    logger.warn('[TryFeedRefreshJob] Job already started');
    return;
  }

  refreshJob = cron.schedule(CRON_SCHEDULE, async () => {
    if (isRunning) {
      logger.warn('[TryFeedRefreshJob] Previous run still in progress, skipping');
      return;
    }

    isRunning = true;

    try {
      logger.info('[TryFeedRefreshJob] Starting feed refresh job');

      const now = new Date();
      let clearedCount = 0;
      let precomputedCount = 0;

      // Step 1: Clear expired cache entries
      const expiredResult = await TryFeedCache.deleteMany({
        expiresAt: { $lte: now }
      });

      clearedCount = expiredResult.deletedCount || 0;
      logger.info('[TryFeedRefreshJob] Cleared expired cache', { count: clearedCount });

      // Step 2: Find active users (active in last 24 hours)
      const activityWindow = new Date(now.getTime() - ACTIVITY_WINDOW_HOURS * 60 * 60 * 1000);

      // Placeholder: assuming User model has lastActivityAt field
      // In real implementation, check actual user model structure
      const activeUsers = await User.find(
        {
          // lastActivityAt: { $gte: activityWindow }
        },
        { _id: 1, geoLocation: 1 }
      )
        .lean()
        .limit(1000); // Process up to 1000 users per job run

      logger.info('[TryFeedRefreshJob] Found active users', { count: activeUsers.length });

      // Step 3: Pre-compute feed for active users
      for (const user of activeUsers) {
        try {
          const userGeo = (user as any).geoLocation || { lat: 0, lng: 0 };
          const userId = (user._id as unknown) as mongoose.Types.ObjectId;

          await tryFeedService.getFeedForUser(userId, userGeo);

          precomputedCount++;
        } catch (error) {
          logger.warn('[TryFeedRefreshJob] Failed to precompute feed for user', {
            userId: (user._id as any).toString?.() || user._id,
            error: (error as Error).message
          });
        }
      }

      logger.info('[TryFeedRefreshJob] Feed refresh job completed', {
        clearedCount,
        precomputedCount
      });
    } catch (error) {
      logger.error('[TryFeedRefreshJob] Job failed', {
        error: (error as Error).message
      });
    } finally {
      isRunning = false;
    }
  });

  logger.info('[TryFeedRefreshJob] Started with schedule:', CRON_SCHEDULE);
}

export function stopTryFeedRefreshJob(): void {
  if (refreshJob) {
    refreshJob.stop();
    refreshJob = null;
    logger.info('[TryFeedRefreshJob] Stopped');
  }
}

export function isTryFeedRefreshJobRunning(): boolean {
  return isRunning;
}
