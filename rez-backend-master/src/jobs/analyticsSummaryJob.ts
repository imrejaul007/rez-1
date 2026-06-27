/**
 * Analytics Summary Job
 *
 * Runs nightly at 2 AM to aggregate daily store metrics.
 * Creates DailySummary records from StorePayment, StoreVisit, and CoinTransaction data.
 *
 * Schedule: Daily at 2:00 AM
 * Lock: 60 minutes
 */

import mongoose from 'mongoose';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import StorePayment from '../models/StorePayment';
import { StoreVisit } from '../models/StoreVisit';
import { CoinTransaction } from '../models/CoinTransaction';
import { startOfDayIST, endOfDayIST } from '../utils/istTime';

const logger = createServiceLogger('analytics-summary-job');

const LOCK_KEY = 'job:analytics-summary';
const LOCK_TTL = 60 * 60; // 60 minutes

// Define DailySummary schema
interface IDailySummary extends mongoose.Document {
  date: Date;
  storeId: mongoose.Types.ObjectId;
  merchantId?: mongoose.Types.ObjectId;
  gmv: number; // Gross Merchandise Value
  txnCount: number; // Transaction count
  visitCount: number; // User visits
  coinsIssued: number; // Coins given to users
  newUsers?: number; // New users (optional)
  createdAt?: Date;
  updatedAt?: Date;
}

const DailySummarySchema = new mongoose.Schema<IDailySummary>(
  {
    date: { type: Date, required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    merchantId: { type: mongoose.Schema.Types.ObjectId },
    gmv: { type: Number, default: 0 },
    txnCount: { type: Number, default: 0 },
    visitCount: { type: Number, default: 0 },
    coinsIssued: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Create unique index on (date, storeId) to prevent duplicates
DailySummarySchema.index({ date: -1, storeId: 1 }, { unique: true });
DailySummarySchema.index({ date: -1 }); // For time-range queries

export const DailySummary =
  mongoose.models.DailySummary || mongoose.model<IDailySummary>('DailySummary', DailySummarySchema);

/**
 * Main analytics summary job function
 * Aggregates yesterday's data and creates summary records
 */
export const runAnalyticsSummaryJob = async (): Promise<void> => {
  let lockToken: string | null = null;

  try {
    // Acquire distributed lock to prevent concurrent runs
    lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.debug('[Analytics] Lock held by another instance — skipping');
      return;
    }

    logger.info('[Analytics] Job started');

    // Calculate yesterday's date range (midnight to 23:59:59)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayStart = startOfDayIST(yesterday);
    const yesterdayEnd = endOfDayIST(yesterday);

    const dateStr = yesterday.toISOString().split('T')[0];
    logger.info(`[Analytics] Aggregating data for ${dateStr}`);

    // MP-D002 OPTIMIZATION: Parallelize aggregation queries instead of sequential
    // Previously each aggregation awaited before starting the next — 3 round-trips
    // to MongoDB. Now all three queries run concurrently in a single round,
    // reducing total query time by ~66%.
    const [gmvData, visitData, coinData] = await Promise.all([
      // 1. Get GMV and transaction count per store
      (StorePayment as any).aggregate([
        {
          $match: {
            createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
            status: 'completed',
          },
        },
        {
          $group: {
            _id: { storeId: '$storeId', merchantId: '$merchantId' },
            gmv: { $sum: '$billAmount' },
            txnCount: { $sum: 1 },
          },
        },
      ]),

      // 2. Get visit counts per store
      (StoreVisit as any).aggregate([
        {
          $match: { createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } },
        },
        {
          $group: {
            _id: '$storeId',
            visitCount: { $sum: 1 },
          },
        },
      ]),

      // 3. Get coins issued per store
      (CoinTransaction as any).aggregate([
        {
          $match: {
            createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
            type: { $in: ['earned', 'reward'] },
          },
        },
        {
          $group: {
            _id: '$storeId',
            coinsIssued: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    logger.debug(`[Analytics] Found ${gmvData.length} stores with payments`);

    // Convert arrays to maps for O(1) lookup
    const visitMap = new Map(visitData.map((v: any) => [v._id?.toString?.() || '', v.visitCount]));

    const coinMap = new Map(coinData.map((c: any) => [c._id?.toString?.() || '', c.coinsIssued]));

    // 4. Build summary records and upsert
    const summaries = gmvData.map((g: any) => ({
      date: yesterday,
      storeId: g._id.storeId,
      merchantId: g._id.merchantId,
      gmv: g.gmv,
      txnCount: g.txnCount,
      visitCount: visitMap.get(g._id.storeId?.toString?.() || '') || 0,
      coinsIssued: coinMap.get(g._id.storeId?.toString?.() || '') || 0,
    }));

    if (summaries.length === 0) {
      logger.info('[Analytics] No transactions found for yesterday');
      return;
    }

    // Upsert all summaries
    const bulkOps = summaries.map((s: any) => ({
      updateOne: {
        filter: { date: s.date, storeId: s.storeId },
        update: { $set: s },
        upsert: true,
      },
    }));

    // MP-D002 OPTIMIZATION: Add ordered: false for error tolerance
    // If one upsert fails, others continue processing instead of aborting
    const result = await DailySummary.bulkWrite(bulkOps, { ordered: false });

    logger.info(`[Analytics] Job complete`, {
      date: dateStr,
      summariesCreated: result.upsertedCount,
      summariesUpdated: result.modifiedCount,
      totalStores: summaries.length,
    });
  } catch (err: any) {
    logger.error('[Analytics] Job failed:', err.message || err);
  } finally {
    if (lockToken) {
      try {
        await redisService.releaseLock(LOCK_KEY, lockToken);
      } catch (err) {
        logger.warn('[Analytics] Failed to release lock:', err);
      }
    }
  }
};

/**
 * Register the analytics summary job with node-cron
 * Runs daily at 2:00 AM (02:00:00)
 */
// BAK-GATEWAY-019 FIX: Wrap the exported function body in try/catch.
// Previously, if node-cron failed to load or cron.schedule() threw (e.g. invalid
// schedule expression), the error would propagate to initializeCronJobs() and could
// prevent all other jobs from starting.
export const scheduleAnalyticsSummary = (): void => {
  try {
    const cron = require('node-cron');

    // Daily at 2 AM: 0 2 * * *
    const task = cron.schedule('0 2 * * *', async () => {
      try {
        await runAnalyticsSummaryJob();
      } catch (err) {
        logger.error('[Analytics] Unexpected error in scheduled task:', err);
      }
    });

    logger.info('[Analytics] Summary job scheduled (daily at 2:00 AM)');
    return task;
  } catch (err) {
    logger.error('[Analytics] Failed to schedule analytics summary job:', err);
  }
};

export default {
  DailySummary,
  runAnalyticsSummaryJob,
  scheduleAnalyticsSummary,
};
