/**
 * expireWalletCoinBuckets.ts — M1
 *
 * Wallet-bucket coin expiry job.
 *
 * The existing expireCoins.ts job expires CoinTransaction records (the
 * audit log of individual earn events). This job is complementary: it
 * sweeps the Wallet.coins[] subdocuments directly, zeroes any bucket
 * whose expiryDate has passed, writes a double-entry LedgerEntry pair
 * (debit user_wallet / credit expired_pool), and records a CoinTransaction
 * of type='expired' so the user's history is complete.
 *
 * It also surfaces a 7-day advance warning query (exported for use by
 * notification workers or direct cron invocation).
 *
 * Schedule: daily at 02:30 AM (staggered 90 min after the existing 01:00
 * job to avoid concurrent Wallet document contention).
 *
 * Usage (standalone):
 *   npx ts-node -r tsconfig-paths/register src/jobs/expireWalletCoinBuckets.ts
 */

import cron from 'node-cron';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { ledgerService } from '../services/ledgerService';
import { logger } from '../config/logger';

dotenv.config();

// Stable ObjectId for the expired_pool platform account (matches LedgerEntry seeding).
const EXPIRED_POOL_ID = new Types.ObjectId('000000000000000000000003');

const CRON_SCHEDULE = '30 2 * * *'; // 02:30 AM daily
const BATCH_SIZE = 200; // wallets processed per iteration

interface BucketExpiryResult {
  walletsScanned: number;
  walletsUpdated: number;
  bucketsExpired: number;
  coinsExpired: number;
  ledgerEntriesCreated: number;
  coinTxCreated: number;
  errors: number;
}

/**
 * Finds wallets with coin buckets expiring within the next 7 days.
 * Returns a lightweight projection — caller is responsible for
 * downstream notification logic.
 */
export async function findBucketsExpiringWithinDays(days: number): Promise<
  Array<{
    walletId: string;
    userId: string;
    expiringBuckets: Array<{ type: string; amount: number; expiryDate: Date }>;
  }>
> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const wallets = await Wallet.find({
    'coins.expiryDate': { $gt: now, $lte: cutoff },
    'coins.amount': { $gt: 0 },
    isActive: true,
    isFrozen: false,
  })
    .select('user coins')
    .lean();

  return wallets.map((w) => ({
    walletId: String(w._id),
    userId: String(w.user),
    expiringBuckets: (w.coins || [])
      .filter(
        (c: any) => c.expiryDate && c.amount > 0 && new Date(c.expiryDate) > now && new Date(c.expiryDate) <= cutoff,
      )
      .map((c: any) => ({
        type: c.type,
        amount: c.amount,
        expiryDate: new Date(c.expiryDate),
      })),
  }));
}

/**
 * Core expiry sweep: finds all wallets with expired coin buckets,
 * zeroes them, writes ledger entries, and creates CoinTransaction records.
 */
export async function expireWalletCoinBuckets(): Promise<BucketExpiryResult> {
  const result: BucketExpiryResult = {
    walletsScanned: 0,
    walletsUpdated: 0,
    bucketsExpired: 0,
    coinsExpired: 0,
    ledgerEntriesCreated: 0,
    coinTxCreated: 0,
    errors: 0,
  };

  const now = new Date();
  logger.info('[expireWalletCoinBuckets] Starting wallet bucket expiry sweep', { now });

  let lastId: Types.ObjectId | null = null;

  // Paginate with cursor-based iteration to avoid loading all wallets at once.
  while (true) {
    const query: Record<string, any> = {
      'coins.expiryDate': { $lt: now },
      'coins.amount': { $gt: 0 },
      isActive: true,
    };
    if (lastId) {
      query['_id'] = { $gt: lastId };
    }

    const wallets = await Wallet.find(query).sort({ _id: 1 }).limit(BATCH_SIZE).select('user coins balance');

    if (wallets.length === 0) break;

    result.walletsScanned += wallets.length;
    lastId = wallets[wallets.length - 1]._id as Types.ObjectId;

    for (const wallet of wallets) {
      try {
        let walletDirty = false;
        let totalExpiredThisWallet = 0;
        let bucketsThisWallet = 0;

        for (const bucket of wallet.coins) {
          // Only process buckets that have expired and still hold coins.
          if (!bucket.expiryDate || bucket.amount <= 0) continue;
          if (new Date(bucket.expiryDate) >= now) continue;

          const expiredAmount = bucket.amount;
          const coinType = bucket.type;

          // 1. Zero the bucket.
          bucket.amount = 0;
          bucket.isActive = false;
          walletDirty = true;
          totalExpiredThisWallet += expiredAmount;
          bucketsThisWallet++;

          // 2. Write CoinTransaction (type='expired', source='expiry').
          try {
            const currentBalance = wallet.balance?.available ?? 0;
            const balanceAfter = Math.max(0, currentBalance - expiredAmount);
            const tx = new CoinTransaction({
              user: wallet.user,
              type: 'expired',
              amount: expiredAmount,
              coinType: coinType,
              balance: balanceAfter,
              balanceBefore: currentBalance,
              balanceAfter: balanceAfter,
              source: 'expiry',
              description: `${expiredAmount} ${coinType} coins expired (wallet bucket)`,
              expiresAt: bucket.expiryDate,
              metadata: {
                walletId: String(wallet._id),
                expiredAt: now.toISOString(),
              },
            });
            await tx.save();
            result.coinTxCreated++;

            // 3. Write double-entry LedgerEntry pair.
            const userAccountId = new Types.ObjectId(wallet.user.toString());
            try {
              await ledgerService.recordEntry({
                debitAccount: { type: 'user_wallet', id: userAccountId },
                creditAccount: { type: 'expired_pool', id: EXPIRED_POOL_ID },
                amount: expiredAmount,
                coinType: 'rez',
                operationType: 'coin_expiry',
                referenceId: String(tx._id),
                referenceModel: 'CoinTransaction',
                metadata: {
                  description: `Wallet bucket expiry: ${expiredAmount} ${coinType} coins`,
                  walletId: String(wallet._id),
                },
              });
              result.ledgerEntriesCreated++;
            } catch (err: any) {
              logger.error('[expireWalletCoinBuckets] Ledger entry failed', {
                walletId: String(wallet._id),
                err: err?.message,
              });
              result.errors++;
            }
          } catch (txErr: any) {
            logger.error('[expireWalletCoinBuckets] CoinTransaction write failed', {
              walletId: String(wallet._id),
              coinType,
              expiredAmount,
              err: txErr?.message,
            });
            result.errors++;
          }
        }

        if (walletDirty) {
          // Adjust balance.available (clamp to 0).
          wallet.balance.available = Math.max(0, wallet.balance.available - totalExpiredThisWallet);
          wallet.balance.total = Math.max(0, wallet.balance.total - totalExpiredThisWallet);
          await wallet.save();

          result.walletsUpdated++;
          result.bucketsExpired += bucketsThisWallet;
          result.coinsExpired += totalExpiredThisWallet;

          logger.info('[expireWalletCoinBuckets] Wallet updated', {
            walletId: String(wallet._id),
            userId: String(wallet.user),
            bucketsExpired: bucketsThisWallet,
            coinsExpired: totalExpiredThisWallet,
          });
        }
      } catch (walletErr: any) {
        result.errors++;
        logger.error('[expireWalletCoinBuckets] Error processing wallet', {
          walletId: String(wallet._id),
          err: walletErr?.message,
        });
      }
    }

    // If we got fewer documents than BATCH_SIZE we've reached the end.
    if (wallets.length < BATCH_SIZE) break;
  }

  logger.info('[expireWalletCoinBuckets] Sweep complete', result);
  return result;
}

/**
 * Schedule the job with node-cron.
 * Returns the scheduled task so callers can stop it cleanly.
 */
export function scheduleExpireWalletCoinBuckets(): ReturnType<typeof cron.schedule> {
  logger.info(`[expireWalletCoinBuckets] Scheduling at "${CRON_SCHEDULE}"`);

  return cron.schedule(CRON_SCHEDULE, async () => {
    logger.info('[expireWalletCoinBuckets] Cron triggered');
    try {
      await expireWalletCoinBuckets();
    } catch (err: any) {
      logger.error('[expireWalletCoinBuckets] Unhandled error in scheduled run', { err: err?.message });
    }
  });
}

// ─── Standalone entry-point ──────────────────────────────────────────────────
// Allows running via: npx ts-node -r tsconfig-paths/register src/jobs/expireWalletCoinBuckets.ts

if (require.main === module) {
  (async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      logger.error('MONGODB_URI is not set');
      process.exit(1);
    }

    await mongoose.connect(uri);
    logger.info('[expireWalletCoinBuckets] Connected to MongoDB');

    try {
      const result = await expireWalletCoinBuckets();
      logger.info('[expireWalletCoinBuckets] Result:', JSON.stringify(result, null, 2));

      // Also log 7-day advance warning stats.
      const upcomingBuckets = await findBucketsExpiringWithinDays(7);
      logger.info(`[expireWalletCoinBuckets] Wallets with buckets expiring in 7 days: ${upcomingBuckets.length}`);
    } finally {
      await mongoose.disconnect();
    }
  })().catch((err) => {
    logger.error('[expireWalletCoinBuckets] Fatal:', err);
    process.exit(1);
  });
}
