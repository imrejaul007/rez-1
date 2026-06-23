import * as cron from 'node-cron';
import mongoose from 'mongoose';
import redisService from '../services/redisService';
import leaderboardService, { LeaderboardEntry } from '../services/leaderboardService';
import leaderboardSecurityService from '../services/leaderboardSecurityService';
import LeaderboardConfig, { ILeaderboardConfig, LeaderboardPeriod } from '../models/LeaderboardConfig';
import LeaderboardPrizeDistribution, { ILeaderboardPrizeDistribution, IPrizeEntry } from '../models/LeaderboardPrizeDistribution';
import { CoinTransaction } from '../models/CoinTransaction';
import { awardCoins } from '../services/coinService';
import { invalidateWalletCache } from '../services/walletCacheService';
import { logger } from '../config/logger';

/**
 * Leaderboard Prize Distribution Job
 *
 * Distributes prizes at the end of each leaderboard period:
 * - Daily: distributes at midnight
 * - Weekly: distributes Sunday midnight
 * - Monthly: distributes 1st of month midnight
 *
 * Schedule: Checks every hour. Compares current time against period boundaries.
 *
 * For each active config where the period just ended:
 * 1. Check if a LeaderboardPrizeDistribution record already exists for this cycle (idempotency)
 * 2. If not, create a 'pending' distribution record
 * 3. Get the final leaderboard snapshot
 * 4. Run anti-fraud checks
 * 5. For each prize slot, for each user in that rank range:
 *    - Award coins via coinService.awardCoins (source: 'leaderboard_prize')
 *    - Set entry status to 'distributed'
 * 6. Update distribution record to 'completed'
 * 7. Set totalDistributed and totalFlagged counts
 */

// Job instance
let prizeDistributionJob: ReturnType<typeof cron.schedule> | null = null;

// Configuration
const PRIZE_DISTRIBUTION_SCHEDULE = '0 * * * *'; // Every hour at minute 0
const PRIZE_DISTRIBUTION_LOCK_TTL = 300; // 5 minutes

/**
 * Check if a period boundary was crossed within the last hour.
 * Returns true if we should distribute prizes for this period.
 */
function shouldDistribute(period: LeaderboardPeriod): boolean {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  switch (period) {
    case 'daily': {
      // Distribute at midnight (00:00)
      const todayMidnight = new Date(now);
      todayMidnight.setHours(0, 0, 0, 0);
      return todayMidnight >= oneHourAgo && todayMidnight <= now;
    }
    case 'weekly': {
      // Distribute Sunday midnight
      const todayMidnight = new Date(now);
      todayMidnight.setHours(0, 0, 0, 0);
      return now.getDay() === 0 && todayMidnight >= oneHourAgo && todayMidnight <= now;
    }
    case 'monthly': {
      // Distribute 1st of month midnight
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      firstOfMonth.setHours(0, 0, 0, 0);
      return now.getDate() === 1 && firstOfMonth >= oneHourAgo && firstOfMonth <= now;
    }
    case 'all-time': {
      // All-time leaderboards don't have periodic distribution
      return false;
    }
    default:
      return false;
  }
}

/**
 * Distribute prizes for a single leaderboard config.
 */
async function distributeForConfig(config: ILeaderboardConfig): Promise<{
  slug: string;
  distributed: number;
  flagged: number;
  skipped: boolean;
}> {
  const slug = config.slug;

  // Skip if no prize pool defined
  if (!config.prizePool || config.prizePool.length === 0) {
    logger.info(`[PRIZE DIST] ${slug}: No prize pool configured, skipping`);
    return { slug, distributed: 0, flagged: 0, skipped: true };
  }

  // Get the cycle boundaries for the period that just ended
  const { start: cycleStartDate, end: cycleEndDate } = leaderboardService.getCycleBoundaries(config.period);

  // Idempotency check: see if distribution already exists for this cycle
  const existingDistribution = await LeaderboardPrizeDistribution.findOne({
    leaderboardConfigId: config._id,
    cycleStartDate,
    cycleEndDate
  });

  if (existingDistribution) {
    logger.info(`[PRIZE DIST] ${slug}: Distribution already exists for cycle ${cycleStartDate.toISOString()} - ${cycleEndDate.toISOString()} (status: ${existingDistribution.status})`);
    return { slug, distributed: 0, flagged: 0, skipped: true };
  }

  // Create a pending distribution record
  let distribution: ILeaderboardPrizeDistribution;
  try {
    distribution = await LeaderboardPrizeDistribution.create({
      leaderboardConfigId: config._id,
      cycleStartDate,
      cycleEndDate,
      period: config.period,
      status: 'pending',
      entries: [],
      totalDistributed: 0,
      totalFlagged: 0
    });
  } catch (error: any) {
    // Handle duplicate key error (race condition between instances)
    if (error.code === 11000) {
      logger.info(`[PRIZE DIST] ${slug}: Duplicate distribution record (another instance handled it)`);
      return { slug, distributed: 0, flagged: 0, skipped: true };
    }
    throw error;
  }

  logger.info(`[PRIZE DIST] ${slug}: Processing prize distribution for cycle ${cycleStartDate.toISOString()} - ${cycleEndDate.toISOString()}`);

  // Update status to processing
  distribution.status = 'processing';
  await distribution.save();

  try {
    // Get the final leaderboard snapshot
    // Use the cycle-specific date range for the aggregation
    const entries = await leaderboardService.runFullAggregation(config);

    if (entries.length === 0) {
      logger.info(`[PRIZE DIST] ${slug}: No entries in leaderboard, marking as completed`);
      distribution.status = 'completed';
      distribution.totalDistributed = 0;
      distribution.totalFlagged = 0;
      await distribution.save();
      return { slug, distributed: 0, flagged: 0, skipped: false };
    }

    // Run anti-fraud checks
    let flaggedUserIds: Set<string> = new Set();
    try {
      const fraudResults = await leaderboardSecurityService.runAntifraudChecks(entries, config);
      flaggedUserIds = new Set(fraudResults.flaggedEntries.map(e => e.userId));
      logger.info(`[PRIZE DIST] ${slug}: Anti-fraud flagged ${flaggedUserIds.size} entries`);
    } catch (fraudError: any) {
      logger.error(`[PRIZE DIST] ${slug}: Anti-fraud check failed (proceeding with caution):`, fraudError.message);
    }

    // Build all prize entries first, then process awards with controlled concurrency
    const prizeEntries: IPrizeEntry[] = [];
    let totalDistributed = 0;
    let totalFlagged = 0;

    // Collect all entries to award (separating flagged from awardable)
    const awardTasks: Array<{ prizeEntry: IPrizeEntry; entry: LeaderboardEntry; prizeSlot: any }> = [];

    for (const prizeSlot of config.prizePool) {
      const slotEntries = entries.filter(
        e => e.rank >= prizeSlot.rankStart && e.rank <= prizeSlot.rankEnd
      );

      for (const entry of slotEntries) {
        const userId = entry.user.id;
        const isFlagged = flaggedUserIds.has(userId);

        const prizeEntry: IPrizeEntry = {
          userId: new mongoose.Types.ObjectId(userId),
          rank: entry.rank,
          score: entry.value,
          prizeAmount: prizeSlot.prizeAmount,
          status: 'pending'
        };

        if (isFlagged) {
          prizeEntry.status = 'flagged';
          prizeEntry.flagReason = 'Flagged by anti-fraud checks';
          totalFlagged++;
          prizeEntries.push(prizeEntry);
          continue;
        }

        awardTasks.push({ prizeEntry, entry, prizeSlot });
      }
    }

    // Process awards with controlled concurrency (5 at a time instead of sequential)
    const CONCURRENCY = 5;
    const MAX_RETRIES = 2;

    for (let i = 0; i < awardTasks.length; i += CONCURRENCY) {
      const batch = awardTasks.slice(i, i + CONCURRENCY);

      const results = await Promise.allSettled(
        batch.map(async ({ prizeEntry, entry, prizeSlot }) => {
          const userId = entry.user.id;

          for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
              const idempotencyKey = `leaderboard_prize:${config._id}:${cycleStartDate.toISOString()}:${userId}`;

              const result = await awardCoins(
                userId,
                prizeSlot.prizeAmount,
                'leaderboard_prize',
                `${config.title} - Rank #${entry.rank} prize (${prizeSlot.prizeLabel})`,
                {
                  leaderboardConfigId: (config._id as any).toString(),
                  cycleStartDate: cycleStartDate.toISOString(),
                  cycleEndDate: cycleEndDate.toISOString(),
                  rank: entry.rank,
                  score: entry.value,
                  prizeLabel: prizeSlot.prizeLabel,
                  idempotencyKey
                }
              );

              prizeEntry.coinTransactionId = result.transactionId
                ? new mongoose.Types.ObjectId(result.transactionId)
                : undefined;
              prizeEntry.status = 'distributed';
              return true;
            } catch (awardError: any) {
              if (attempt < MAX_RETRIES) {
                logger.warn(`[PRIZE DIST] ${slug}: Retry ${attempt + 1}/${MAX_RETRIES} for user ${userId}: ${awardError.message}`);
                await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
              } else {
                logger.error(`[PRIZE DIST] ${slug}: Failed to award prize to user ${userId} after ${MAX_RETRIES + 1} attempts:`, awardError.message);
                prizeEntry.status = 'failed';
                prizeEntry.flagReason = `Award failed after ${MAX_RETRIES + 1} attempts: ${awardError.message}`;
                return false;
              }
            }
          }
          return false;
        })
      );

      // Count results and collect entries
      for (let j = 0; j < batch.length; j++) {
        const result = results[j];
        const { prizeEntry } = batch[j];
        if (result.status === 'fulfilled' && result.value) {
          totalDistributed++;
        } else {
          if (prizeEntry.status !== 'distributed') totalFlagged++;
        }
        prizeEntries.push(prizeEntry);
      }
    }

    // Batch invalidate wallet caches for all distributed winners
    const distributedUserIds = awardTasks
      .filter(t => t.prizeEntry.status === 'distributed')
      .map(t => t.entry.user.id);
    await Promise.all(distributedUserIds.map(uid => invalidateWalletCache(uid)));

    // Update distribution record
    distribution.entries = prizeEntries;
    distribution.totalDistributed = totalDistributed;
    distribution.totalFlagged = totalFlagged;
    distribution.distributedAt = new Date();

    if (totalFlagged > 0 && totalDistributed > 0) {
      distribution.status = 'partial';
    } else if (totalFlagged > 0 && totalDistributed === 0) {
      distribution.status = 'partial';
    } else {
      distribution.status = 'completed';
    }

    await distribution.save();

    logger.info(`[PRIZE DIST] ${slug}: Distribution complete - ${totalDistributed} distributed, ${totalFlagged} flagged`);

    return { slug, distributed: totalDistributed, flagged: totalFlagged, skipped: false };
  } catch (error: any) {
    // Mark as partial on failure
    distribution.status = 'partial';
    await distribution.save();
    throw error;
  }
}

/**
 * Run prize distribution check for all active configs
 */
async function runPrizeDistribution(): Promise<void> {
  const startTime = Date.now();

  logger.info('[PRIZE DIST] Running prize distribution check...');

  // Load all active configs
  const activeConfigs = await LeaderboardConfig.find({ status: 'active' });

  if (activeConfigs.length === 0) {
    logger.info('[PRIZE DIST] No active leaderboard configs found');
    return;
  }

  // Filter configs whose period just ended
  const configsToDistribute = activeConfigs.filter(config => shouldDistribute(config.period));

  if (configsToDistribute.length === 0) {
    logger.info('[PRIZE DIST] No period boundaries crossed in the last hour, nothing to distribute');
    return;
  }

  logger.info(`[PRIZE DIST] ${configsToDistribute.length} configs have periods that just ended`);

  // Process each config sequentially to avoid overloading
  const results: Array<{ slug: string; distributed: number; flagged: number; skipped: boolean; error?: string }> = [];

  for (const config of configsToDistribute) {
    try {
      const result = await distributeForConfig(config);
      results.push(result);
    } catch (error: any) {
      logger.error(`[PRIZE DIST] Error distributing for ${config.slug}:`, error.message);
      results.push({
        slug: config.slug,
        distributed: 0,
        flagged: 0,
        skipped: false,
        error: error.message
      });
    }
  }

  const totalDuration = Date.now() - startTime;

  logger.info('[PRIZE DIST] Distribution check completed:', {
    results: results.map(r =>
      r.error
        ? `${r.slug}(ERROR: ${r.error})`
        : r.skipped
          ? `${r.slug}(skipped)`
          : `${r.slug}(${r.distributed} distributed, ${r.flagged} flagged)`
    ),
    totalDuration: `${totalDuration}ms`,
    timestamp: new Date().toISOString()
  });
}

/**
 * Start the prize distribution job
 */
export function startPrizeDistributionJob(): void {
  if (prizeDistributionJob) {
    logger.info('[PRIZE DIST] Prize distribution job already running');
    return;
  }

  logger.info('[PRIZE DIST] Starting prize distribution job (runs every hour)');

  prizeDistributionJob = cron.schedule(PRIZE_DISTRIBUTION_SCHEDULE, async () => {
    // Acquire distributed lock
    const lockToken = await redisService.acquireLock('leaderboard_prize_distribution_job', PRIZE_DISTRIBUTION_LOCK_TTL);
    if (!lockToken) {
      logger.info('[PRIZE DIST] Another instance is running the distribution job, skipping');
      return;
    }

    try {
      await runPrizeDistribution();
    } catch (error: any) {
      logger.error('[PRIZE DIST] Error:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      await redisService.releaseLock('leaderboard_prize_distribution_job', lockToken);
    }
  });

  logger.info('[PRIZE DIST] Prize distribution job started');
}

/**
 * Stop the prize distribution job
 */
export function stopPrizeDistributionJob(): void {
  if (prizeDistributionJob) {
    prizeDistributionJob.stop();
    prizeDistributionJob = null;
    logger.info('[PRIZE DIST] Prize distribution job stopped');
  }
}

/**
 * Manually trigger prize distribution (for testing/maintenance)
 */
export async function triggerManualPrizeDistribution(): Promise<void> {
  const lockToken = await redisService.acquireLock('leaderboard_prize_distribution_job', PRIZE_DISTRIBUTION_LOCK_TTL);
  if (!lockToken) {
    throw new Error('Prize distribution already in progress (locked by another instance)');
  }

  logger.info('[PRIZE DIST] Manual prize distribution triggered');

  try {
    await runPrizeDistribution();
  } finally {
    await redisService.releaseLock('leaderboard_prize_distribution_job', lockToken);
  }
}

/**
 * Get prize distribution job status
 */
export function getPrizeDistributionJobStatus(): {
  running: boolean;
  schedule: string;
} {
  return {
    running: prizeDistributionJob !== null,
    schedule: PRIZE_DISTRIBUTION_SCHEDULE
  };
}

/**
 * Initialize the prize distribution job
 * Called from server startup after database connection
 */
export function initializePrizeDistributionJob(): void {
  startPrizeDistributionJob();
}

export default {
  initialize: initializePrizeDistributionJob,
  start: startPrizeDistributionJob,
  stop: stopPrizeDistributionJob,
  triggerManual: triggerManualPrizeDistribution,
  getStatus: getPrizeDistributionJobStatus
};
