/**
 * Coin Expiry Job — Sprint 8 / Branded Coin Expiry Enforcement
 *
 * 1. Tiered warnings: 7-day (informational), 3-day (urgency), 24-hour (loss-aversion)
 *    — non-overlapping windows enqueued via BullMQ notificationQueue.
 * 2. Expire coins: mark CoinTransaction records where expiresAt < now and
 *    coinStatus is not 'consumed'/'reversed' as status expired, deduct from
 *    user coin balance.
 * 3. Branded coin expiry: mark brandedCoins/coins array elements in Wallet
 *    documents as isActive=false when their expiresAt has passed.
 * 4. Both jobs run daily at 1–2 AM. Registered via scheduleCronJob so they
 *    are tracked in activeCronJobs and stopped cleanly during shutdown.
 */

import mongoose from 'mongoose';
import { CoinTransaction } from '../models/CoinTransaction';
import { Wallet } from '../models/Wallet';
import { User } from '../models/User';
import { notificationQueue } from '../config/bullmq-queues';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
// @ts-ignore
import { Queue } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';

const logger = createServiceLogger('coin-expiry');

const LOCK_KEY = 'job:coin-expiry';
const LOCK_TTL = 3600; // 1 hour

const BRANDED_LOCK_KEY = 'job:branded-coin-expiry';
const BRANDED_LOCK_TTL = 3600; // 1 hour

const notificationEventsQueue = new Queue('notification-events', { connection: bullmqRedis });

/**
 * Send tiered expiry warnings for coins expiring soon.
 *
 * Three non-overlapping windows (all evaluated against the same `now`):
 *   7-day  : expiresAt in (3 days, 7 days]  — informational nudge
 *   3-day  : expiresAt in (24 hours, 3 days] — urgency escalation
 *   24-hour: expiresAt in (0, 24 hours]      — loss-aversion ("expires TOMORROW")
 *
 * Each window fires a separate job type so the notification worker can render
 * tier-specific copy and priority.
 */
async function sendExpiryWarnings(): Promise<void> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Helper: aggregate coins expiring within a given [from, to) window
  async function aggregateWindow(from: Date, to: Date) {
    return CoinTransaction.aggregate([
      {
        $match: {
          expiresAt: { $gt: from, $lte: to },
          coinStatus: { $in: ['active', 'locked'] },
          type: { $in: ['earned', 'bonus', 'branded_award'] },
        },
      },
      {
        $group: {
          _id: '$user',
          totalAmount: { $sum: '$amount' },
          earliestExpiry: { $min: '$expiresAt' },
        },
      },
    ]);
  }

  // ── 7-day warning (coins expiring in more than 3 days but within 7 days) ──
  const sevenDayUsers = await aggregateWindow(in3d, in7d);
  logger.info(`[CoinExpiry] 7-day warning: ${sevenDayUsers.length} users`);
  if (sevenDayUsers.length > 0) {
    const sevenDayJobs = sevenDayUsers.map((entry) => ({
      name: `coin_expiry_7d_${entry._id}`,
      data: {
        userId: entry._id.toString(),
        coinAmount: entry.totalAmount,
        expiresAt: entry.earliestExpiry,
        daysLeft: Math.ceil((entry.earliestExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        warningTier: '7d',
        body: `₹${entry.totalAmount} coins expire in 7 days — use them before they're gone.`,
      },
    }));
    for (let i = 0; i < sevenDayJobs.length; i += 500) {
      try {
        await notificationQueue.addBulk(sevenDayJobs.slice(i, i + 500));
      } catch (err) {
        logger.error(`[CoinExpiry] Failed to enqueue 7-day bulk (chunk ${i / 500}):`, err);
      }
    }
  }

  // ── 3-day warning (coins expiring in more than 24h but within 3 days) ────
  const threeDayUsers = await aggregateWindow(in24h, in3d);
  logger.info(`[CoinExpiry] 3-day warning: ${threeDayUsers.length} users`);
  if (threeDayUsers.length > 0) {
    const threeDayJobs = threeDayUsers.map((entry) => ({
      name: `coin_expiry_3d_${entry._id}`,
      data: {
        userId: entry._id.toString(),
        coinAmount: entry.totalAmount,
        expiresAt: entry.earliestExpiry,
        daysLeft: Math.ceil((entry.earliestExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        warningTier: '3d',
        body: `₹${entry.totalAmount} coins expire in 3 days — don't let them vanish.`,
      },
    }));
    for (let i = 0; i < threeDayJobs.length; i += 500) {
      try {
        await notificationQueue.addBulk(threeDayJobs.slice(i, i + 500));
      } catch (err) {
        logger.error(`[CoinExpiry] Failed to enqueue 3-day bulk (chunk ${i / 500}):`, err);
      }
    }
  }

  // ── 24-hour warning (coins expiring within the next 24 hours) ────────────
  const oneDayUsers = await aggregateWindow(now, in24h);
  logger.info(`[CoinExpiry] 24-hour warning: ${oneDayUsers.length} users`);
  if (oneDayUsers.length > 0) {
    const oneDayJobs = oneDayUsers.map((entry) => ({
      name: `coin_expiry_24h_${entry._id}`,
      data: {
        userId: entry._id.toString(),
        coinAmount: entry.totalAmount,
        expiresAt: entry.earliestExpiry,
        daysLeft: 0,
        warningTier: '24h',
        body: `₹${entry.totalAmount} coins expire TOMORROW — use them or lose them.`,
      },
    }));
    for (let i = 0; i < oneDayJobs.length; i += 500) {
      try {
        await notificationQueue.addBulk(oneDayJobs.slice(i, i + 500));
      } catch (err) {
        logger.error(`[CoinExpiry] Failed to enqueue 24h bulk (chunk ${i / 500}):`, err);
      }
    }
  }
}

/**
 * Mark expired CoinTransaction records and deduct from user coin balance.
 */
async function expireCoins(): Promise<void> {
  const now = new Date();

  // Find transactions that have passed expiresAt and are still active
  const expired = await CoinTransaction.find({
    expiresAt: { $lt: now },
    coinStatus: { $nin: ['consumed', 'reversed'] },
    type: { $in: ['earned', 'bonus', 'branded_award'] },
  })
    .select('_id user amount coinStatus')
    .limit(1000)
    .lean();

  if (expired.length === 0) {
    logger.info('[CoinExpiry] No coins to expire');
    return;
  }

  logger.info(`[CoinExpiry] Expiring ${expired.length} coin transaction records`);

  // Group by user to batch balance deductions
  const byUser = new Map<string, number>();
  const ids: mongoose.Types.ObjectId[] = [];

  for (const tx of expired) {
    const uid = tx.user.toString();
    byUser.set(uid, (byUser.get(uid) ?? 0) + tx.amount);
    ids.push(tx._id as mongoose.Types.ObjectId);
  }

  // Batch-update all expired transactions in one round-trip.
  // The status guard (coinStatus not already 'consumed'/'reversed'/'expired') is
  // the atomic protection: if two job instances race, the second write is a no-op
  // because the first already changed the coinStatus, preventing double-processing.
  await CoinTransaction.bulkWrite(
    ids.map((id) => ({
      updateOne: {
        filter: { _id: id, coinStatus: { $nin: ['consumed', 'reversed', 'expired'] } },
        update: { $set: { coinStatus: 'consumed', type: 'expired' } },
      },
    })),
  );

  // Deduct coin balance from the Wallet model (balance.available + balance.total).
  // NOTE: User.wallet.balance is the fiat wallet — do NOT touch it here.
  // Coin balances live in the separate Wallet collection.
  for (const [userId, amount] of byUser.entries()) {
    try {
      await Wallet.findOneAndUpdate(
        { user: userId, 'balance.available': { $gte: amount } },
        { $inc: { 'balance.available': -amount, 'balance.total': -amount } },
      );
    } catch (err) {
      logger.error(`[CoinExpiry] Failed to deduct coin balance for user ${userId}:`, err);
    }
  }

  logger.info(`[CoinExpiry] Expired coins for ${byUser.size} users`);
}

/**
 * Main entry point — runs both warning and expiry phases.
 */
export async function runCoinExpiry(): Promise<void> {
  const lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
  if (!lockToken) {
    logger.info('[CoinExpiry] Skipped — lock held by another pod');
    return;
  }

  try {
    await sendExpiryWarnings();
    await expireCoins();
    logger.info('[CoinExpiry] Job completed successfully');
  } catch (err) {
    logger.error('[CoinExpiry] Job failed:', err);
  } finally {
    await redisService.releaseLock(LOCK_KEY, lockToken);
  }
}

/**
 * Schedule the coin expiry job to run daily at 1 AM.
 * Uses the shared scheduleCronJob helper so the task is tracked in
 * activeCronJobs and stopped cleanly during SIGTERM/SIGINT shutdown.
 */
export function scheduleCoinExpiry(
  scheduleCronJob: (schedule: string, cb: () => Promise<void>, desc?: string) => void,
): void {
  scheduleCronJob(
    '0 1 * * *',
    async () => {
      logger.info('[CoinExpiry] Scheduled run triggered');
      await runCoinExpiry();
    },
    'coin_expiry',
  );
  logger.info('[CoinExpiry] Registered — daily at 1:00 AM');
}

// ─── Branded Coin Expiry Enforcement ──────────────────────────────────────────

/**
 * Mark expired brandedCoins and coins array elements as isActive=false.
 *
 * Uses MongoDB arrayFilters for atomic in-place updates so no document
 * needs to be loaded into memory. Affected user IDs are collected for
 * best-effort BullMQ notifications.
 */
export async function runBrandedCoinExpiryJob(): Promise<void> {
  const lockToken = await redisService.acquireLock(BRANDED_LOCK_KEY, BRANDED_LOCK_TTL);
  if (!lockToken) {
    logger.info('[BrandedCoinExpiry] Skipped — lock held by another pod');
    return;
  }

  try {
    const now = new Date();

    // ── 1. Expire brandedCoins elements ──────────────────────────────────────
    const brandedResult = await (Wallet as any).updateMany(
      { brandedCoins: { $elemMatch: { expiresAt: { $lte: now }, isActive: true } } },
      { $set: { 'brandedCoins.$[elem].isActive': false } },
      { arrayFilters: [{ 'elem.expiresAt': { $lte: now }, 'elem.isActive': true }] },
    );

    logger.info(
      `[BrandedCoinExpiry] brandedCoins: matched=${brandedResult.matchedCount}, modified=${brandedResult.modifiedCount}`,
    );

    // ── 2. Expire coins array elements (prive/promo types have expiresAt) ────
    const coinsResult = await (Wallet as any).updateMany(
      { coins: { $elemMatch: { expiresAt: { $lte: now }, isActive: true } } },
      { $set: { 'coins.$[elem].isActive': false } },
      { arrayFilters: [{ 'elem.expiresAt': { $lte: now }, 'elem.isActive': true }] },
    );

    logger.info(
      `[BrandedCoinExpiry] coins: matched=${coinsResult.matchedCount}, modified=${coinsResult.modifiedCount}`,
    );

    const totalWalletsAffected = brandedResult.modifiedCount + coinsResult.modifiedCount;
    if (totalWalletsAffected === 0) {
      logger.info('[BrandedCoinExpiry] No coins to expire — nothing modified');
      return;
    }

    // ── 3. Notify affected users (best-effort, non-fatal) ────────────────────
    // Fetch wallets including branded coin details so we can construct
    // brand-specific notification content and merchant deep-link data.
    const affectedWallets = await (Wallet as any)
      .find(
        {
          $or: [
            { brandedCoins: { $elemMatch: { expiresAt: { $lte: now }, isActive: false } } },
            { coins: { $elemMatch: { expiresAt: { $lte: now }, isActive: false } } },
          ],
        },
        { user: 1, brandedCoins: 1 },
      )
      .lean();

    logger.info(`[BrandedCoinExpiry] Enqueueing notifications for ${affectedWallets.length} users`);

    for (const wallet of affectedWallets) {
      // Identify the most recently expired branded coin to personalise the message.
      // If multiple branded coins expired, pick the one with the latest expiresAt.
      const expiredBrandedCoins: Array<{
        merchantId?: { toString(): string };
        merchantName?: string;
        amount?: number;
        expiresAt?: Date;
        isActive?: boolean;
      }> = (wallet.brandedCoins ?? []).filter(
        (c: { expiresAt?: Date; isActive?: boolean }) => c.expiresAt && c.expiresAt <= now && c.isActive === false,
      );

      const representativeCoin = expiredBrandedCoins.sort(
        (a, b) => (b.expiresAt?.getTime() ?? 0) - (a.expiresAt?.getTime() ?? 0),
      )[0];

      const brandName: string =
        representativeCoin?.merchantName || representativeCoin?.merchantId?.toString() || 'a partner brand';

      const merchantId: string | undefined = representativeCoin?.merchantId?.toString();

      const coinsExpired: number = expiredBrandedCoins.reduce((sum, c) => sum + (c.amount ?? 0), 0);

      try {
        await notificationEventsQueue.add('branded_coin_expired', {
          eventId: `branded-coin-expiry-${String(wallet.user)}-${now.getTime()}`,
          eventType: 'branded_coin_expired',
          channels: ['push'],
          userId: String(wallet.user),
          payload: {
            title: `${brandName} coins expired`,
            body:
              coinsExpired > 0
                ? `Your ${coinsExpired} ${brandName} coins have expired. Visit the app to earn more rewards.`
                : `Some of your ${brandName} coins have expired. Visit the app to earn more rewards.`,
            data: {
              coinType: 'branded',
              brandName,
              coinsExpired,
              ...(merchantId ? { merchantId } : {}),
            },
            channelId: 'coin_expiry',
            priority: 'normal' as const,
          },
          source: 'automated' as const,
          category: 'coin_expiry',
          createdAt: now.toISOString(),
        });
      } catch (notifErr) {
        // Non-fatal: log and continue
        logger.warn(`[BrandedCoinExpiry] Failed to enqueue notification for user ${wallet.user}:`, notifErr);
      }
    }

    logger.info('[BrandedCoinExpiry] Job completed successfully');
  } catch (err) {
    logger.error('[BrandedCoinExpiry] Job failed:', err);
  } finally {
    await redisService.releaseLock(BRANDED_LOCK_KEY, lockToken);
  }
}

/**
 * Register the branded coin expiry job. Called from cronJobs.ts during startup.
 * Runs daily at 2:00 AM (offset from the 1 AM CoinTransaction expiry job).
 */
export function initializeCoinExpiryJob(
  _cron: any,
  scheduleCronJob: (schedule: string, cb: () => Promise<void>, desc?: string) => void,
): void {
  scheduleCronJob(
    '0 2 * * *',
    async () => {
      logger.info('[BrandedCoinExpiry] Scheduled run triggered');
      await runBrandedCoinExpiryJob();
    },
    'branded_coin_expiry',
  );
  logger.info('[BrandedCoinExpiry] Registered — daily at 2:00 AM');
}
