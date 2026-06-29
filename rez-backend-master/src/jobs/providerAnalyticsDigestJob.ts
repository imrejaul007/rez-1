/**
 * Provider Analytics Digest Email Job
 *
 * Sends daily analytics digest emails to active merchants/providers
 * with their store performance metrics (GMV, orders, visits, coins).
 *
 * Schedule: Daily at 9:00 AM with Redis distributed lock
 * Lock TTL: 30 minutes
 */

import cron from 'node-cron';
import mongoose from 'mongoose';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import { EmailService } from '../services/EmailService';
import { Merchant } from '../models/Merchant';
import StorePayment from '../models/StorePayment';
import { StoreVisit } from '../models/StoreVisit';
import { CoinTransaction } from '../models/CoinTransaction';
import { startOfDayIST, endOfDayIST } from '../utils/istTime';

const logger = createServiceLogger('provider-analytics-digest');

const LOCK_KEY = 'job:provider_analytics_digest';
const LOCK_TTL = 30 * 60; // 30 minutes
const BATCH_SIZE = 50;

/**
 * Format a date as a human-readable string in IST timezone
 */
function formatDateStr(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Get the merchant dashboard URL
 */
function getDashboardUrl(): string {
  return `${process.env.MERCHANT_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/analytics`;
}

/**
 * Send analytics digest to a single merchant via EmailService
 */
async function sendDigestToMerchant(
  merchant: { _id: mongoose.Types.ObjectId; email: string; ownerName: string; businessName: string },
  stats: { gmv: number; txnCount: number; visitCount: number; coinsIssued: number; newUsers: number },
  yesterday: Date
): Promise<void> {
  const dateStr = formatDateStr(yesterday);

  await EmailService.sendProviderAnalyticsDigest({
    email: merchant.email,
    merchantName: merchant.ownerName || merchant.businessName,
    businessName: merchant.businessName,
    gmv: stats.gmv,
    txnCount: stats.txnCount,
    visitCount: stats.visitCount,
    coinsIssued: stats.coinsIssued,
    newUsers: stats.newUsers,
    dateStr,
    dashboardUrl: getDashboardUrl(),
  });

  logger.debug(`Digest sent to ${merchant.email}`);
}

/**
 * Aggregate analytics for a merchant across all their stores
 */
async function aggregateMerchantStats(
  merchantId: mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date
): Promise<{ gmv: number; txnCount: number; visitCount: number; coinsIssued: number; newUsers: number }> {
  // Get GMV and transaction count
  const paymentAgg = await (StorePayment as any).aggregate([
    {
      $match: {
        merchantId: merchantId,
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: null,
        gmv: { $sum: '$billAmount' },
        txnCount: { $sum: 1 },
      },
    },
  ]);

  // Get visit count (distinct users as new users)
  const visitAgg = await (StoreVisit as any).aggregate([
    {
      $match: {
        merchantId: merchantId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        visitCount: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
      },
    },
  ]);

  // Get coins issued
  const coinAgg = await (CoinTransaction as any).aggregate([
    {
      $match: {
        merchantId: merchantId,
        createdAt: { $gte: startDate, $lte: endDate },
        type: { $in: ['earned', 'reward'] },
      },
    },
    {
      $group: {
        _id: null,
        coinsIssued: { $sum: '$amount' },
      },
    },
  ]);

  const gmv = paymentAgg[0]?.gmv || 0;
  const txnCount = paymentAgg[0]?.txnCount || 0;
  const visitCount = visitAgg[0]?.visitCount || 0;
  const uniqueUsers = visitAgg[0]?.uniqueUsers?.length || 0;
  const coinsIssued = coinAgg[0]?.coinsIssued || 0;

  // Estimate new users (simplified - would need user creation date tracking for accuracy)
  const newUsers = 0; // Placeholder: full implementation would track first-time visitors

  return { gmv, txnCount, visitCount, coinsIssued, newUsers };
}

/**
 * Main job function: send digest emails to all active merchants
 */
export async function runProviderAnalyticsDigest(): Promise<void> {
  let lockToken: string | null = null;

  try {
    // Acquire distributed lock
    lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.debug('[ProviderDigest] Lock held by another instance — skipping');
      return;
    }

    logger.info('[ProviderDigest] Job started');

    // Calculate yesterday's date range (IST)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startDate = startOfDayIST(yesterday);
    const endDate = endOfDayIST(yesterday);

    // Find all active merchants with verified email
    const merchants = await (Merchant as any).find(
      {
        isActive: true,
        emailVerified: true,
        email: { $exists: true, $ne: '' },
      },
      '_id email ownerName businessName'
    ).lean();

    logger.info(`[ProviderDigest] Found ${merchants.length} active merchants to notify`);

    if (merchants.length === 0) {
      logger.info('[ProviderDigest] No active merchants with verified emails');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // Process merchants in batches
    for (let i = 0; i < merchants.length; i += BATCH_SIZE) {
      const batch = merchants.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (merchant: any) => {
          try {
            const stats = await aggregateMerchantStats(merchant._id, startDate, endDate);

            // Only send if there's meaningful activity (at least 1 transaction or visit)
            if (stats.txnCount > 0 || stats.visitCount > 0) {
              await sendDigestToMerchant(merchant, stats, yesterday);
              successCount++;
            } else {
              logger.debug(`[ProviderDigest] Skipping ${merchant.email} — no activity yesterday`);
            }
          } catch (err: any) {
            logger.error(`[ProviderDigest] Failed to send digest to ${merchant.email}:`, err.message);
            failCount++;
          }
        })
      );
    }

    logger.info(`[ProviderDigest] Job complete. Sent: ${successCount}, Failed: ${failCount}`);
  } catch (err: any) {
    logger.error('[ProviderDigest] Job failed:', err.message || err);
  } finally {
    if (lockToken) {
      try {
        await redisService.releaseLock(LOCK_KEY, lockToken);
      } catch (err) {
        logger.warn('[ProviderDigest] Failed to release lock:', err);
      }
    }
  }
}

/**
 * Initialize the provider analytics digest cron job.
 * Runs daily at 9:00 AM IST with Redis distributed lock.
 */
export function initializeProviderAnalyticsDigestJob(): void {
  // Daily at 9:00 AM IST (4:30 UTC)
  // 0 4 * * * = 9:30 AM IST — use 0 3 * * * for 8:30 AM IST, adjust as needed
  cron.schedule('0 4 * * *', async () => {
    const lock = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lock) return;
    try {
      await runProviderAnalyticsDigest();
    } catch (err: any) {
      logger.error('[ProviderDigest] Scheduled job failed', { error: err.message });
    } finally {
      await redisService.releaseLock(LOCK_KEY, lock);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  logger.info('Provider analytics digest job initialized (runs daily at 9:00 AM IST)');
}

export default {
  runProviderAnalyticsDigest,
  initializeProviderAnalyticsDigestJob,
};
