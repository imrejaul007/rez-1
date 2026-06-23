import { logger } from '../config/logger';
import * as cron from 'node-cron';
import OfferRedemption from '../models/OfferRedemption';
import { UserVoucher } from '../models/Voucher';
import PriveVoucher from '../models/PriveVoucher';
import redisService from '../services/redisService';

/**
 * Voucher & Offer Redemption Expiry Job
 *
 * This background job runs every hour to manage voucher expiration.
 *
 * What it does:
 * 1. Expires OfferRedemption records past their expiryDate
 * 2. Expires UserVoucher records past their expiryDate
 * 3. Logs expiry statistics for monitoring
 *
 * This ensures voucher codes cannot be used after their expiration date.
 */

let expiryJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

// Configuration
const CRON_SCHEDULE = '30 * * * *'; // Every hour at minute 30 (offset from deal expiry job)

interface ExpiryStats {
  offerRedemptions: {
    totalExpired: number;
    activeExpired: number;
    pendingExpired: number;
  };
  userVouchers: {
    totalExpired: number;
  };
  priveVouchers: {
    totalExpired: number;
  };
  errors: Array<{ type: string; error: string }>;
}

/**
 * Process expired offer redemptions
 */
async function processExpiredOfferRedemptions(): Promise<ExpiryStats['offerRedemptions']> {
  const stats = {
    totalExpired: 0,
    activeExpired: 0,
    pendingExpired: 0
  };

  const now = new Date();

  // Expire 'active' offer redemptions
  const activeResult = await OfferRedemption.updateMany(
    {
      status: 'active',
      expiryDate: { $lt: now }
    },
    {
      $set: { status: 'expired' }
    }
  );
  stats.activeExpired = activeResult.modifiedCount;

  // Expire 'pending' offer redemptions
  const pendingResult = await OfferRedemption.updateMany(
    {
      status: 'pending',
      expiryDate: { $lt: now }
    },
    {
      $set: { status: 'expired' }
    }
  );
  stats.pendingExpired = pendingResult.modifiedCount;

  stats.totalExpired = stats.activeExpired + stats.pendingExpired;

  return stats;
}

/**
 * Process expired user vouchers (gift card style)
 */
async function processExpiredUserVouchers(): Promise<ExpiryStats['userVouchers']> {
  const stats = {
    totalExpired: 0
  };

  const now = new Date();

  // Expire 'active' user vouchers
  const result = await UserVoucher.updateMany(
    {
      status: 'active',
      expiryDate: { $lt: now }
    },
    {
      $set: { status: 'expired' }
    }
  );
  stats.totalExpired = result.modifiedCount;

  return stats;
}

/**
 * Process expired Privé vouchers
 */
async function processExpiredPriveVouchers(): Promise<ExpiryStats['priveVouchers']> {
  const stats = {
    totalExpired: 0
  };

  const now = new Date();

  const result = await PriveVoucher.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: now }
    },
    {
      $set: { status: 'expired' }
    }
  );
  stats.totalExpired = result.modifiedCount;

  return stats;
}

/**
 * Run all expiry processes
 */
async function runExpiryProcesses(): Promise<ExpiryStats> {
  const stats: ExpiryStats = {
    offerRedemptions: { totalExpired: 0, activeExpired: 0, pendingExpired: 0 },
    userVouchers: { totalExpired: 0 },
    priveVouchers: { totalExpired: 0 },
    errors: []
  };

  // Process offer redemptions
  try {
    stats.offerRedemptions = await processExpiredOfferRedemptions();
  } catch (error: any) {
    logger.error('❌ [VOUCHER EXPIRY] Error expiring offer redemptions:', error);
    stats.errors.push({ type: 'offerRedemptions', error: error.message || 'Unknown error' });
  }

  // Process user vouchers
  try {
    stats.userVouchers = await processExpiredUserVouchers();
  } catch (error: any) {
    logger.error('❌ [VOUCHER EXPIRY] Error expiring user vouchers:', error);
    stats.errors.push({ type: 'userVouchers', error: error.message || 'Unknown error' });
  }

  // Process Privé vouchers
  try {
    stats.priveVouchers = await processExpiredPriveVouchers();
  } catch (error: any) {
    logger.error('❌ [VOUCHER EXPIRY] Error expiring Privé vouchers:', error);
    stats.errors.push({ type: 'priveVouchers', error: error.message || 'Unknown error' });
  }

  const totalExpired = stats.offerRedemptions.totalExpired + stats.userVouchers.totalExpired + stats.priveVouchers.totalExpired;

  if (totalExpired > 0) {
    logger.info(`🎟️ [VOUCHER EXPIRY] Expired ${totalExpired} items:`, {
      offerRedemptions: stats.offerRedemptions.totalExpired,
      userVouchers: stats.userVouchers.totalExpired,
      priveVouchers: stats.priveVouchers.totalExpired
    });
  }

  return stats;
}

/**
 * Initialize and start the expiry job
 */
export function startVoucherExpiryJob(): void {
  if (expiryJob) {
    logger.info('⚠️ [VOUCHER EXPIRY] Job already running');
    return;
  }

  logger.info(`🎟️ [VOUCHER EXPIRY] Starting voucher expiry job (runs every hour at :30)`);

  expiryJob = cron.schedule(CRON_SCHEDULE, async () => {
    // Prevent concurrent executions
    if (isRunning) {
      logger.info('⏭️ [VOUCHER EXPIRY] Previous expiry job still running, skipping');
      return;
    }

    const lockKey = 'job:voucher-expiry';
    const lockToken = await redisService.acquireLock(lockKey, 300);
    if (!lockToken) {
      logger.info('voucher-expiry skipped — lock held by another instance');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      const stats = await runExpiryProcesses();
      const duration = Date.now() - startTime;

      const totalExpired = stats.offerRedemptions.totalExpired + stats.userVouchers.totalExpired + stats.priveVouchers.totalExpired;

      if (totalExpired > 0 || stats.errors.length > 0) {
        logger.info('✅ [VOUCHER EXPIRY] Job completed:', {
          duration: `${duration}ms`,
          offerRedemptions: stats.offerRedemptions,
          userVouchers: stats.userVouchers,
          priveVouchers: stats.priveVouchers,
          errorCount: stats.errors.length,
          timestamp: new Date().toISOString()
        });
      }

      if (stats.errors.length > 0) {
        logger.error('❌ [VOUCHER EXPIRY] Errors during expiry:');
        stats.errors.forEach((error, index) => {
          logger.error(`   ${index + 1}. [${error.type}] ${error.error}`);
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ [VOUCHER EXPIRY] Job failed:', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      isRunning = false;
      await redisService.releaseLock(lockKey, lockToken);
    }
  });

  logger.info('✅ [VOUCHER EXPIRY] Voucher expiry job started successfully');
}

/**
 * Stop the expiry job
 */
export function stopVoucherExpiryJob(): void {
  if (expiryJob) {
    expiryJob.stop();
    expiryJob = null;
    logger.info('🛑 [VOUCHER EXPIRY] Voucher expiry job stopped');
  } else {
    logger.info('⚠️ [VOUCHER EXPIRY] No job running to stop');
  }
}

/**
 * Get expiry job status
 */
export function getVoucherExpiryJobStatus(): {
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
 * Manually trigger voucher expiry (for testing or maintenance)
 */
export async function triggerManualVoucherExpiry(): Promise<ExpiryStats> {
  if (isRunning) {
    logger.info('⚠️ [VOUCHER EXPIRY] Expiry already running, please wait');
    throw new Error('Expiry already in progress');
  }

  logger.info('🎟️ [VOUCHER EXPIRY] Manual expiry triggered');

  isRunning = true;
  const startTime = Date.now();

  try {
    const stats = await runExpiryProcesses();
    const duration = Date.now() - startTime;

    const totalExpired = stats.offerRedemptions.totalExpired + stats.userVouchers.totalExpired + stats.priveVouchers.totalExpired;

    logger.info('✅ [VOUCHER EXPIRY] Manual expiry completed:', {
      duration: `${duration}ms`,
      totalExpired
    });

    return stats;
  } catch (error) {
    logger.error('❌ [VOUCHER EXPIRY] Manual expiry failed:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * Preview upcoming expirations (without processing)
 */
export async function previewUpcomingVoucherExpirations(hoursAhead: number = 24): Promise<{
  offerRedemptions: { total: number; byHour: Array<{ hour: string; count: number }> };
  userVouchers: { total: number; byHour: Array<{ hour: string; count: number }> };
}> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + hoursAhead);

  // Offer redemptions
  const offerExpirations = await OfferRedemption.aggregate([
    {
      $match: {
        status: { $in: ['active', 'pending'] },
        expiryDate: {
          $gt: now,
          $lte: futureDate
        }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$expiryDate' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // User vouchers
  const voucherExpirations = await UserVoucher.aggregate([
    {
      $match: {
        status: 'active',
        expiryDate: {
          $gt: now,
          $lte: futureDate
        }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$expiryDate' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return {
    offerRedemptions: {
      total: offerExpirations.reduce((sum, item) => sum + item.count, 0),
      byHour: offerExpirations.map(item => ({ hour: item._id, count: item.count }))
    },
    userVouchers: {
      total: voucherExpirations.reduce((sum, item) => sum + item.count, 0),
      byHour: voucherExpirations.map(item => ({ hour: item._id, count: item.count }))
    }
  };
}

/**
 * Initialize the job (called from server startup)
 */
export function initializeVoucherExpiryJob(): void {
  startVoucherExpiryJob();
}

export default {
  start: startVoucherExpiryJob,
  stop: stopVoucherExpiryJob,
  getStatus: getVoucherExpiryJobStatus,
  triggerManual: triggerManualVoucherExpiry,
  previewUpcoming: previewUpcomingVoucherExpirations,
  initialize: initializeVoucherExpiryJob
};
