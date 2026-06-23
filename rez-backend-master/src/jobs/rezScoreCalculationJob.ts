/**
 * RezScoreCalculationJob
 *
 * Runs daily at 2 AM IST.
 * Batch recalculates REZ Scores for all active users who have had
 * any activity in the last 30 days.
 * After all scores are recalculated, updates percentile rankings.
 *
 * Processing is done in batches of BATCH_SIZE to limit memory usage.
 * Individual user failures are caught and logged without aborting the batch.
 *
 * Schedule (cron): `30 20 * * *` (UTC) = 2:00 AM IST (UTC+5:30)
 */

import mongoose from 'mongoose';
import { createServiceLogger } from '../config/logger';
import rezScoreService from '../services/rezScoreService';

const logger = createServiceLogger('rez-score-calculation-job');

const BATCH_SIZE = 50; // Users processed concurrently per batch

// ─── Job ─────────────────────────────────────────────────────────────────────

export async function runRezScoreCalculationJob(): Promise<void> {
  logger.info('[RezScoreCalculationJob] Starting daily score recalculation');
  const startTime = Date.now();

  let processedUsers = 0;
  let successCount = 0;
  let failedCount = 0;

  try {
    const User = mongoose.model('User');
    const CoinTransaction = mongoose.model('CoinTransaction');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Union of: users with CoinTransactions in last 30 days OR users who logged in
    // in last 30 days. CoinTransaction alone misses users on cashback-only flows.
    const [txUserIds, loginUserDocs] = await Promise.all([
      CoinTransaction.distinct('user', { createdAt: { $gte: thirtyDaysAgo } }),
      User.find({ 'auth.lastLogin': { $gte: thirtyDaysAgo } }, { _id: 1 }).lean(),
    ]);

    const loginUserIds = loginUserDocs.map((u: any) => u._id);
    const allIds = new Map<string, any>();
    [...txUserIds, ...loginUserIds].forEach((id: any) => allIds.set(id.toString(), id));
    const activeUserIds = [...allIds.values()];

    logger.info(`[RezScoreCalculationJob] Found ${activeUserIds.length} active users to process`, {
      fromTransactions: txUserIds.length,
      fromLogins: loginUserIds.length,
    });

    // Process in concurrent batches
    for (let i = 0; i < activeUserIds.length; i += BATCH_SIZE) {
      const batch = activeUserIds.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((userId: any) => rezScoreService.calculateScore(userId.toString())),
      );

      results.forEach((result, idx) => {
        processedUsers++;
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failedCount++;
          logger.warn('[RezScoreCalculationJob] Score calculation failed for user', {
            userId: batch[idx]?.toString(),
            error: (result.reason as Error)?.message,
          });
        }
      });

      // Log progress every 10 batches
      if (Math.floor(i / BATCH_SIZE) % 10 === 0) {
        logger.info('[RezScoreCalculationJob] Progress', {
          processed: processedUsers,
          total: activeUserIds.length,
          successCount,
          failedCount,
        });
      }
    }

    // After all scores are updated, recalculate percentile rankings
    logger.info('[RezScoreCalculationJob] Updating percentile rankings');
    await rezScoreService.updateAllPercentiles();

    const elapsedMs = Date.now() - startTime;
    logger.info('[RezScoreCalculationJob] Completed', {
      processedUsers,
      successCount,
      failedCount,
      elapsedMs,
    });
  } catch (err) {
    logger.error('[RezScoreCalculationJob] Fatal error', {
      error: (err as Error).message,
      processedUsers,
      successCount,
      failedCount,
    });
    throw err;
  }
}

export default runRezScoreCalculationJob;
