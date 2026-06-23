/**
 * Privé Reputation Background Refresh Job
 *
 * Daily at 02:00 UTC — batch recalculates reputation for all active Prive members.
 * Processes in batches of 50 with 200ms delay between batches.
 * Creates PriveAuditLog entries for tier changes.
 */

import cron from 'node-cron';
import PriveAccess from '../models/PriveAccess';
import { reputationService } from '../services/reputationService';
import { PriveAuditLog } from '../models/PriveAuditLog';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

let isRunning = false;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const runPriveReputationRefresh = async (): Promise<{ processed: number; tierChanges: number }> => {
  if (isRunning) {
    logger.info('[PriveReputationRefresh] Job already running, skipping');
    return { processed: 0, tierChanges: 0 };
  }

  const lockKey = 'job:prive-reputation-refresh';
  const lockToken = await redisService.acquireLock(lockKey, 300);
  if (!lockToken) {
    logger.info('prive-reputation-refresh skipped — lock held by another instance');
    return { processed: 0, tierChanges: 0 };
  }

  isRunning = true;
  let processed = 0;
  let tierChanges = 0;

  try {
    logger.info('[PriveReputationRefresh] Starting batch reputation recalculation...');

    // Get all active Prive member user IDs
    const activeMembers = await PriveAccess.find(
      { status: 'active' },
      { userId: 1, tierOverride: 1 }
    ).lean();

    logger.info(`[PriveReputationRefresh] Found ${activeMembers.length} active members`);

    // Pre-fetch current tiers from UserReputation
    const userIds = activeMembers.map(m => m.userId);
    const currentReputations = await (await import('../models/UserReputation')).UserReputation
      .find({ userId: { $in: userIds } }, { userId: 1, tier: 1 })
      .lean();
    const tierMap = new Map(currentReputations.map(r => [r.userId.toString(), r.tier || 'none']));

    const BATCH_SIZE = 50;
    const BATCH_DELAY_MS = 200;

    for (let i = 0; i < activeMembers.length; i += BATCH_SIZE) {
      const batch = activeMembers.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (member) => {
        try {
          const userId = member.userId.toString();
          const previousTier = tierMap.get(userId) || 'none';

          // Recalculate reputation
          const result = await reputationService.recalculateReputation(userId);
          processed++;

          // Check for tier change
          const newTier = result?.tier || 'none';
          if (newTier !== previousTier) {
            tierChanges++;

            // Log tier change
            await PriveAuditLog.create({
              userId: member.userId,
              action: 'tier_change',
              details: `Tier changed from ${previousTier} to ${newTier} (background refresh)`,
              previousState: { tier: previousTier },
              newState: { tier: newTier, score: result?.totalScore },
              performedBy: 'system',
              performerType: 'system',
            });
          }
        } catch (err) {
          logger.error(`[PriveReputationRefresh] Error processing user ${member.userId}:`, err);
        }
      }));

      // Delay between batches to avoid overwhelming the DB
      if (i + BATCH_SIZE < activeMembers.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    logger.info(`[PriveReputationRefresh] Completed: ${processed} processed, ${tierChanges} tier changes`);
    return { processed, tierChanges };
  } catch (error) {
    logger.error('[PriveReputationRefresh] Job failed:', error);
    return { processed, tierChanges };
  } finally {
    isRunning = false;
    await redisService.releaseLock(lockKey, lockToken);
  }
};

/**
 * Initialize the cron job — runs daily at 02:00 UTC
 */
export const initializePriveReputationRefreshJob = () => {
  cron.schedule('0 2 * * *', () => {
    runPriveReputationRefresh();
  }, { timezone: 'UTC' });

  logger.info('✅ Privé reputation refresh job scheduled (daily at 2:00 AM UTC)');
};
