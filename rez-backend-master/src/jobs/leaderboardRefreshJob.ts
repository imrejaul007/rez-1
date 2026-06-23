import * as cron from 'node-cron';
import redisService from '../services/redisService';
import leaderboardService from '../services/leaderboardService';
import LeaderboardConfig, { ILeaderboardConfig } from '../models/LeaderboardConfig';
import { logger } from '../config/logger';

/**
 * Leaderboard Refresh Background Job (Config-Driven)
 *
 * This module schedules a background job that recalculates leaderboard aggregations
 * based on active LeaderboardConfig documents and caches results in Redis.
 *
 * - Runs every 5 minutes via cron
 * - Loads all active LeaderboardConfig documents
 * - For each config, runs the CoinTransaction aggregation pipeline
 *   filtered by config.coinTransactionSources and date range based on config.period
 * - Caches the full top-N list at: leaderboard:{slug}:full
 * - Caches metadata at: leaderboard:{slug}:meta
 * - Uses Redis distributed locks with owner tokens for multi-instance safety
 */

// Job instance
let leaderboardRefreshJob: ReturnType<typeof cron.schedule> | null = null;

// Configuration
const LEADERBOARD_REFRESH_SCHEDULE = '*/15 * * * *'; // Every 15 minutes
const LEADERBOARD_CACHE_TTL = 900; // 15 minutes (matches refresh interval)
const LEADERBOARD_LOCK_TTL = 120; // 2 minutes (should finish well within this)

interface RefreshStats {
  slug: string;
  period: string;
  entriesCount: number;
  duration: number;
}

/**
 * Refresh a single leaderboard based on its config
 */
async function refreshLeaderboardForConfig(config: ILeaderboardConfig): Promise<RefreshStats> {
  const startTime = Date.now();

  // Run the full aggregation via the unified service
  const entries = await leaderboardService.runFullAggregation(config);

  // Cache the full top-N list
  const fullCacheKey = `leaderboard:${config.slug}:full`;
  await redisService.set(fullCacheKey, entries, LEADERBOARD_CACHE_TTL);

  // Cache metadata (total count, last updated, config info)
  const metaCacheKey = `leaderboard:${config.slug}:meta`;
  await redisService.set(metaCacheKey, {
    totalEntries: entries.length,
    lastUpdated: new Date().toISOString(),
    slug: config.slug,
    period: config.period,
    leaderboardType: config.leaderboardType,
    title: config.title
  }, LEADERBOARD_CACHE_TTL);

  // Pre-cache page 1 with default limit of 20
  const page1CacheKey = `leaderboard:${config.slug}:page:1:limit:20`;
  const page1Entries = entries.slice(0, 20);
  await redisService.set(page1CacheKey, {
    entries: page1Entries,
    pagination: {
      page: 1,
      limit: 20,
      total: entries.length,
      pages: Math.ceil(entries.length / 20)
    },
    config: {
      slug: config.slug,
      title: config.title,
      subtitle: config.subtitle,
      leaderboardType: config.leaderboardType,
      period: config.period,
      topN: config.topN
    },
    lastUpdated: new Date().toISOString()
  }, LEADERBOARD_CACHE_TTL);

  // Invalidate any stale page-specific caches for this config
  // (they will be re-populated on demand)
  await redisService.delPattern(`leaderboard:${config.slug}:rank:*`);

  const duration = Date.now() - startTime;

  return {
    slug: config.slug,
    period: config.period,
    entriesCount: entries.length,
    duration
  };
}

/**
 * Run all leaderboard refreshes based on active configs
 */
async function runLeaderboardRefresh(): Promise<void> {
  const startTime = Date.now();

  logger.info('[LEADERBOARD JOB] Running config-driven leaderboard refresh...');

  // Load all active configs
  const activeConfigs = await LeaderboardConfig.find({ status: 'active' });

  if (activeConfigs.length === 0) {
    logger.info('[LEADERBOARD JOB] No active leaderboard configs found, skipping refresh');
    return;
  }

  logger.info(`[LEADERBOARD JOB] Found ${activeConfigs.length} active configs to refresh`);

  // Refresh all configs in parallel
  const results = await Promise.allSettled(
    activeConfigs.map(config => refreshLeaderboardForConfig(config))
  );

  const succeeded: RefreshStats[] = [];
  const failed: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      succeeded.push(result.value);
    } else {
      failed.push(`${activeConfigs[index].slug}: ${result.reason?.message || 'Unknown error'}`);
    }
  });

  const totalDuration = Date.now() - startTime;

  logger.info('[LEADERBOARD JOB] Refresh completed:', {
    succeeded: succeeded.map(r => `${r.slug}(${r.entriesCount} entries, ${r.duration}ms)`),
    failed: failed.length > 0 ? failed : 'none',
    totalDuration: `${totalDuration}ms`,
    timestamp: new Date().toISOString()
  });
}

/**
 * Start the leaderboard refresh job
 */
export function startLeaderboardRefreshJob(): void {
  if (leaderboardRefreshJob) {
    logger.info('[LEADERBOARD JOB] Leaderboard refresh job already running');
    return;
  }

  logger.info('[LEADERBOARD JOB] Starting config-driven leaderboard refresh job (runs every 15 minutes)');

  leaderboardRefreshJob = cron.schedule(LEADERBOARD_REFRESH_SCHEDULE, async () => {
    // Acquire distributed lock with owner token -- only one instance runs the job
    const lockToken = await redisService.acquireLock('leaderboard_refresh_job', LEADERBOARD_LOCK_TTL);
    if (!lockToken) {
      logger.info('[LEADERBOARD JOB] Another instance is running the refresh job, skipping');
      return;
    }

    try {
      await runLeaderboardRefresh();
    } catch (error: any) {
      logger.error('[LEADERBOARD JOB] Error:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      await redisService.releaseLock('leaderboard_refresh_job', lockToken);
    }
  });

  logger.info('[LEADERBOARD JOB] Leaderboard refresh job started');
}

/**
 * Stop the leaderboard refresh job
 */
export function stopLeaderboardRefreshJob(): void {
  if (leaderboardRefreshJob) {
    leaderboardRefreshJob.stop();
    leaderboardRefreshJob = null;
    logger.info('[LEADERBOARD JOB] Leaderboard refresh job stopped');
  }
}

/**
 * Manually trigger leaderboard refresh (for testing/maintenance)
 */
export async function triggerManualLeaderboardRefresh(): Promise<void> {
  const lockToken = await redisService.acquireLock('leaderboard_refresh_job', LEADERBOARD_LOCK_TTL);
  if (!lockToken) {
    throw new Error('Leaderboard refresh already in progress (locked by another instance)');
  }

  logger.info('[LEADERBOARD JOB] Manual leaderboard refresh triggered');

  try {
    await runLeaderboardRefresh();
  } finally {
    await redisService.releaseLock('leaderboard_refresh_job', lockToken);
  }
}

/**
 * Get leaderboard job status
 */
export function getLeaderboardJobStatus(): {
  running: boolean;
  schedule: string;
} {
  return {
    running: leaderboardRefreshJob !== null,
    schedule: LEADERBOARD_REFRESH_SCHEDULE
  };
}

/**
 * Initialize the leaderboard refresh job
 * Called from server startup after database connection
 */
export function initializeLeaderboardRefreshJob(): void {
  startLeaderboardRefreshJob();
}

export default {
  initialize: initializeLeaderboardRefreshJob,
  start: startLeaderboardRefreshJob,
  stop: stopLeaderboardRefreshJob,
  triggerManual: triggerManualLeaderboardRefresh,
  getStatus: getLeaderboardJobStatus
};
