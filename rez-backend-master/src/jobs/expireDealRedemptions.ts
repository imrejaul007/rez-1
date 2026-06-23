import * as cron from 'node-cron';
import DealRedemption from '../models/DealRedemption';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Deal Redemption Expiry Job
 *
 * This background job runs every hour to manage deal redemption expiration.
 *
 * What it does:
 * 1. Finds all deal redemptions with expiresAt date in the past
 * 2. Updates their status from 'active' or 'pending' to 'expired'
 * 3. Logs expiry statistics for monitoring
 *
 * This ensures deal codes cannot be used after their expiration date.
 */

let expiryJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

// Configuration
const CRON_SCHEDULE = '0 * * * *'; // Every hour at minute 0

interface ExpiryStats {
  totalExpired: number;
  activeExpired: number;
  pendingExpired: number;
  errors: Array<{ error: string }>;
}

/**
 * Process expired deal redemptions
 */
async function processExpiredDealRedemptions(): Promise<ExpiryStats> {
  const stats: ExpiryStats = {
    totalExpired: 0,
    activeExpired: 0,
    pendingExpired: 0,
    errors: []
  };

  try {
    const now = new Date();

    // Find and update all expired 'active' redemptions
    const activeResult = await DealRedemption.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: now }
      },
      {
        $set: { status: 'expired' }
      }
    );
    stats.activeExpired = activeResult.modifiedCount;

    // Find and update all expired 'pending' redemptions (paid deals that never got confirmed)
    const pendingResult = await DealRedemption.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: now }
      },
      {
        $set: { status: 'expired' }
      }
    );
    stats.pendingExpired = pendingResult.modifiedCount;

    stats.totalExpired = stats.activeExpired + stats.pendingExpired;

    if (stats.totalExpired > 0) {
      logger.info(`🎫 [DEAL EXPIRY] Expired ${stats.totalExpired} deal redemptions (${stats.activeExpired} active, ${stats.pendingExpired} pending)`);
    }

  } catch (error: any) {
    logger.error('❌ [DEAL EXPIRY] Error processing expired deals:', error);
    stats.errors.push({ error: error.message || 'Unknown error' });
  }

  return stats;
}

/**
 * Initialize and start the expiry job
 */
export function startDealExpiryJob(): void {
  if (expiryJob) {
    logger.info('⚠️ [DEAL EXPIRY] Job already running');
    return;
  }

  logger.info(`🎫 [DEAL EXPIRY] Starting deal expiry job (runs every hour)`);

  expiryJob = cron.schedule(CRON_SCHEDULE, async () => {
    // Prevent concurrent executions
    if (isRunning) {
      logger.info('⏭️ [DEAL EXPIRY] Previous expiry job still running, skipping this execution');
      return;
    }

    // Acquire Redis distributed lock to prevent cross-instance overlap
    const lockKey = 'job:deal-expiry';
    const lockToken = await redisService.acquireLock(lockKey, 300);
    if (!lockToken) {
      logger.info('deal-expiry skipped — lock held by another instance');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      const stats = await processExpiredDealRedemptions();

      const duration = Date.now() - startTime;

      if (stats.totalExpired > 0 || stats.errors.length > 0) {
        logger.info('✅ [DEAL EXPIRY] Expiry job completed:', {
          duration: `${duration}ms`,
          totalExpired: stats.totalExpired,
          activeExpired: stats.activeExpired,
          pendingExpired: stats.pendingExpired,
          errorCount: stats.errors.length,
          timestamp: new Date().toISOString()
        });
      }

      if (stats.errors.length > 0) {
        logger.error('❌ [DEAL EXPIRY] Errors during expiry:');
        stats.errors.forEach((error, index) => {
          logger.error(`   ${index + 1}. ${error.error}`);
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ [DEAL EXPIRY] Expiry job failed:', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      await redisService.releaseLock(lockKey, lockToken);
      isRunning = false;
    }
  });

  logger.info('✅ [DEAL EXPIRY] Deal expiry job started successfully');
}

/**
 * Stop the expiry job
 */
export function stopDealExpiryJob(): void {
  if (expiryJob) {
    expiryJob.stop();
    expiryJob = null;
    logger.info('🛑 [DEAL EXPIRY] Deal expiry job stopped');
  } else {
    logger.info('⚠️ [DEAL EXPIRY] No job running to stop');
  }
}

/**
 * Get expiry job status
 */
export function getDealExpiryJobStatus(): {
  running: boolean;
  executing: boolean;
  schedule: string;
} {
  return {
    running: expiryJob !== null,
    executing: isRunning,
    schedule: CRON_SCHEDULE
  };
}

/**
 * Manually trigger deal expiry (for testing or maintenance)
 */
export async function triggerManualDealExpiry(): Promise<ExpiryStats> {
  if (isRunning) {
    logger.info('⚠️ [DEAL EXPIRY] Expiry already running, please wait');
    throw new Error('Expiry already in progress');
  }

  logger.info('🎫 [DEAL EXPIRY] Manual expiry triggered');

  isRunning = true;
  const startTime = Date.now();

  try {
    const stats = await processExpiredDealRedemptions();
    const duration = Date.now() - startTime;

    logger.info('✅ [DEAL EXPIRY] Manual expiry completed:', {
      duration: `${duration}ms`,
      totalExpired: stats.totalExpired
    });

    return stats;
  } catch (error) {
    logger.error('❌ [DEAL EXPIRY] Manual expiry failed:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * Preview upcoming expirations (without processing)
 */
export async function previewUpcomingDealExpirations(hoursAhead: number = 24): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byHour: Array<{ hour: string; count: number }>;
}> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + hoursAhead);

  const upcomingExpirations = await DealRedemption.aggregate([
    {
      $match: {
        status: { $in: ['active', 'pending'] },
        expiresAt: {
          $gt: now,
          $lte: futureDate
        }
      }
    },
    {
      $group: {
        _id: {
          hour: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$expiresAt' } },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.hour': 1 }
    }
  ]);

  const byStatus: Record<string, number> = {};
  const hourMap: Record<string, number> = {};

  for (const item of upcomingExpirations) {
    const status = item._id.status;
    const hour = item._id.hour;

    byStatus[status] = (byStatus[status] || 0) + item.count;
    hourMap[hour] = (hourMap[hour] || 0) + item.count;
  }

  const byHour = Object.entries(hourMap).map(([hour, count]) => ({ hour, count }));

  return {
    total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
    byStatus,
    byHour
  };
}

/**
 * Initialize the job (called from server startup)
 */
export function initializeDealExpiryJob(): void {
  startDealExpiryJob();
}

export default {
  start: startDealExpiryJob,
  stop: stopDealExpiryJob,
  getStatus: getDealExpiryJobStatus,
  triggerManual: triggerManualDealExpiry,
  previewUpcoming: previewUpcomingDealExpirations,
  initialize: initializeDealExpiryJob
};
