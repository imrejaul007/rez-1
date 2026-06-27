import * as cron from 'node-cron';
import mongoose from 'mongoose';
import { CoinTransaction, ICoinTransaction } from '../models/CoinTransaction';
import { Wallet } from '../models/Wallet';
import { User } from '../models/User';
import PushNotificationService from '../services/pushNotificationService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';
import { getCachedWalletConfig, invalidateWalletCache } from '../services/walletCacheService';
import { CURRENCY_RULES } from '../config/currencyRules';
import { ledgerService } from '../services/ledgerService';

/**
 * Coin Expiry Job
 *
 * This background job runs daily at 1:00 AM to manage coin expiration.
 *
 * What it does:
 * 1. Finds all coin transactions with expiresAt date in the past
 * 2. Creates expiry transactions to deduct expired coins
 * 3. Updates user coin balances
 * 4. Sends notifications to affected users
 * 5. Logs expiry statistics for monitoring
 *
 * This ensures coins don't accumulate indefinitely and encourages users
 * to use their earned coins within a reasonable timeframe.
 */

let expiryJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

// Configuration
const CRON_SCHEDULE = '0 1 * * *'; // Daily at 1:00 AM
const NOTIFICATION_BATCH_SIZE = 50; // Send notifications in batches to avoid overwhelming the system

interface ExpiryStats {
  usersAffected: number;
  totalCoinsExpired: number;
  transactionsCreated: number;
  notificationsSent: number;
  notificationsFailed: number;
  errors: Array<{
    userId: string;
    error: string;
  }>;
}

interface UserExpiryData {
  userId: string;
  expiredAmount: number;
  newBalance: number;
  expiredTransactions: Array<{
    id: string;
    source: string;
    amount: number;
    earnedDate: Date;
  }>;
}

/**
 * Send pre-expiry notifications for coins expiring within 48 hours.
 * Runs before the actual expiry processing to give users a chance to use their coins.
 */
async function sendPreExpiryNotifications(): Promise<{ notified: number; failed: number }> {
  const stats = { notified: 0, failed: 0 };

  try {
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Find earned/branded transactions expiring within 48 hours that haven't been notified
    const soonExpiringTransactions = await CoinTransaction.find({
      type: { $in: ['earned', 'branded_award'] },
      expiresAt: { $gt: now, $lte: fortyEightHoursFromNow },
      $or: [
        { 'metadata.isExpired': { $ne: true } },
        { metadata: { $exists: false } }
      ],
      'metadata.expiryWarningNotified': { $ne: true }
    }).sort({ user: 1, expiresAt: 1 });

    if (soonExpiringTransactions.length === 0) {
      logger.info('✨ [COIN EXPIRY] No coins expiring within 48h');
      return stats;
    }

    // Group by user
    const userExpiryMap = new Map<string, { totalAmount: number; earliestExpiry: Date; txIds: string[] }>();

    for (const tx of soonExpiringTransactions) {
      const userId = tx.user.toString();
      if (!userExpiryMap.has(userId)) {
        userExpiryMap.set(userId, { totalAmount: 0, earliestExpiry: tx.expiresAt!, txIds: [] });
      }
      const data = userExpiryMap.get(userId)!;
      data.totalAmount += tx.amount;
      data.txIds.push(String(tx._id));
      if (tx.expiresAt! < data.earliestExpiry) {
        data.earliestExpiry = tx.expiresAt!;
      }
    }

    logger.info(`⏰ [COIN EXPIRY] Sending pre-expiry notifications to ${userExpiryMap.size} users`);

    // Batch fetch all users to avoid N+1 queries
    const expiryUserIds = Array.from(userExpiryMap.keys());
    const expiryUsers = await User.find({ _id: { $in: expiryUserIds } })
      .select('_id phoneNumber')
      .lean();
    const expiryUserMap = new Map(expiryUsers.map(u => [String(u._id), u]));

    // Batch notification sends and transaction updates using bulkWrite for better performance
    for (const [userId, data] of userExpiryMap.entries()) {
      try {
        const user = expiryUserMap.get(userId);
        if (!user?.phoneNumber) continue;

        const expiryDateStr = data.earliestExpiry.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        await PushNotificationService.sendCoinsExpiringSoon(
          user.phoneNumber,
          data.totalAmount,
          expiryDateStr
        );

        stats.notified++;
      } catch (notifErr) {
        stats.failed++;
        if (process.env.NODE_ENV === 'development') {
          logger.info(`[COIN EXPIRY] Failed to send pre-expiry notification for user ${userId}:`, notifErr);
        }
      }
    }

    // Bulk update all notified transactions to mark them as warned (single operation instead of N updates)
    if (userExpiryMap.size > 0) {
      const bulkOps = Array.from(userExpiryMap.values()).map(data => ({
        updateMany: {
          filter: { _id: { $in: data.txIds } },
          update: { $set: { 'metadata.expiryWarningNotified': true } }
        }
      }));
      try {
        await CoinTransaction.bulkWrite(bulkOps, { ordered: false });
      } catch (err) {
        logger.error('[COIN EXPIRY] Bulk update for expiry warning notifications failed:', err);
      }
    }
  } catch (error) {
    logger.error('❌ [COIN EXPIRY] Error in pre-expiry notifications:', error);
  }

  return stats;
}

/**
 * Find and process expired coins for all users
 */
async function processExpiredCoins(): Promise<ExpiryStats> {
  const stats: ExpiryStats = {
    usersAffected: 0,
    totalCoinsExpired: 0,
    transactionsCreated: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
    errors: []
  };
  const affectedUserIds = new Set<string>();

  try {
    const now = new Date();

    // Backfill: Find branded coin transactions without expiresAt and set it based on config
    try {
      let brandedExpiryDays: number;
      try {
        const config = await getCachedWalletConfig();
        brandedExpiryDays = config?.coinExpiryConfig?.branded?.expiryDays ?? CURRENCY_RULES.branded.expiryDays;
      } catch {
        brandedExpiryDays = CURRENCY_RULES.branded.expiryDays;
      }

      if (brandedExpiryDays > 0) {
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - brandedExpiryDays);

        // Find branded_award transactions created before cutoff that have no expiresAt
        const backfillResult = await CoinTransaction.updateMany(
          {
            type: 'branded_award',
            expiresAt: { $exists: false },
            createdAt: { $lte: cutoffDate },
            $or: [
              { 'metadata.isExpired': { $ne: true } },
              { metadata: { $exists: false } }
            ]
          },
          [
            {
              $set: {
                expiresAt: {
                  $add: ['$createdAt', brandedExpiryDays * 24 * 60 * 60 * 1000]
                }
              }
            }
          ]
        );
        if (backfillResult.modifiedCount > 0) {
          logger.info(`[COIN EXPIRY] Backfilled expiresAt on ${backfillResult.modifiedCount} branded coin transactions`);
        }

        // Also backfill newer branded coins that don't have expiresAt yet (not expired but need the field)
        await CoinTransaction.updateMany(
          {
            type: 'branded_award',
            expiresAt: { $exists: false },
            createdAt: { $gt: cutoffDate },
            $or: [
              { 'metadata.isExpired': { $ne: true } },
              { metadata: { $exists: false } }
            ]
          },
          [
            {
              $set: {
                expiresAt: {
                  $add: ['$createdAt', brandedExpiryDays * 24 * 60 * 60 * 1000]
                }
              }
            }
          ]
        );
      }
    } catch (backfillErr) {
      logger.error('[COIN EXPIRY] Branded coin backfill error:', backfillErr);
    }

    // Find all earned/branded_award transactions that have expired
    const expiredTransactions = await CoinTransaction.find({
      type: { $in: ['earned', 'branded_award'] },
      expiresAt: { $lte: now, $ne: null },
      // Only process transactions that haven't been marked as expired yet
      $or: [
        { metadata: { $exists: false } },
        { 'metadata.isExpired': { $ne: true } }
      ]
    })
      .populate('user', 'phoneNumber email profile.firstName')
      .sort({ user: 1, expiresAt: 1 });

    logger.info(`💰 [COIN EXPIRY] Found ${expiredTransactions.length} expired coin transactions`);

    if (expiredTransactions.length === 0) {
      return stats;
    }

    // Separate branded_award from earned/bonus transactions — branded coins don't affect ReZ balance
    const brandedTransactions = expiredTransactions.filter(t => (t as any).type === 'branded_award');
    const rezTransactions = expiredTransactions.filter(t => (t as any).type !== 'branded_award');

    // --- Process branded coin expirations (wallet.brandedCoins only, no ReZ balance impact) ---
    if (brandedTransactions.length > 0) {
      const brandedByUser = new Map<string, Array<{ id: string; amount: number; merchantId?: string }>>();
      for (const tx of brandedTransactions) {
        const userId = tx.user.toString();
        if (!brandedByUser.has(userId)) brandedByUser.set(userId, []);
        brandedByUser.get(userId)!.push({
          id: String(tx._id),
          amount: tx.amount,
          merchantId: (tx as any).metadata?.storeId?.toString() || (tx as any).metadata?.merchantId?.toString(),
        });
      }

      // Calculate total deduction per user per merchant for bulk update
      const brandedDeductions = new Map<string, Map<string, number>>();
      for (const [userId, txs] of brandedByUser.entries()) {
        if (!brandedDeductions.has(userId)) {
          brandedDeductions.set(userId, new Map());
        }
        const userDeductions = brandedDeductions.get(userId)!;
        for (const tx of txs) {
          if (tx.merchantId) {
            userDeductions.set(tx.merchantId, (userDeductions.get(tx.merchantId) || 0) + tx.amount);
          }
        }
      }

      // OPTIMIZATION: Build bulkWrite operations for wallet branded coin deductions
      // Batch fetch all affected wallets once, then use atomic $inc updates
      const brandedUserIds = Array.from(brandedDeductions.keys()).map(id => new mongoose.Types.ObjectId(id));
      await Wallet.find({ user: { $in: brandedUserIds } }).then(wallets => {
        const walletBulkOps: any[] = [];
        for (const [userId, deductions] of brandedDeductions.entries()) {
          for (const [merchantId, amount] of deductions.entries()) {
            walletBulkOps.push({
              updateOne: {
                filter: {
                  user: new mongoose.Types.ObjectId(userId),
                  'brandedCoins.merchantId': new mongoose.Types.ObjectId(merchantId)
                },
                update: {
                  $max: { 'brandedCoins.$.amount': 0 },  // Ensure non-negative floor
                  $inc: { 'brandedCoins.$.amount': -amount }  // Deduct expired amount
                }
              }
            });
          }
        }
        // Execute wallet bulkWrite with error tolerance (ordered: false continues on failure)
        if (walletBulkOps.length > 0) {
          return Wallet.bulkWrite(walletBulkOps, { ordered: false }).catch(
            (err: any) => logger.error(`[COIN EXPIRY] Branded wallet bulkWrite partial failure: ${err.message}`)
          );
        }
      });

      // Mark all branded transactions as expired in a single bulkWrite operation
      // OPTIMIZATION: Single bulkWrite instead of N sequential updateMany calls per user
      const allBrandedTxIds = brandedTransactions.map(t => t._id);
      await CoinTransaction.bulkWrite(
        allBrandedTxIds.map(txId => ({
          updateOne: {
            filter: { _id: txId },
            update: { $set: { 'metadata.isExpired': true, 'metadata.expiredAt': now } }
          }
        })),
        { ordered: false }  // Error tolerance: continue processing even if individual updates fail
      );

      // Update stats for all processed branded users
      for (const [userId, txs] of brandedByUser.entries()) {
        const totalBranded = txs.reduce((s, t) => s + t.amount, 0);
        affectedUserIds.add(userId);
        stats.totalCoinsExpired += totalBranded;
        logger.info(`   ✓ User ${userId}: ${totalBranded} branded coins expired`);
      }
    }

    // --- Process ReZ/promo coin expirations (affects ReZ balance via CoinTransaction) ---

    // Group by user
    const userExpiryMap = new Map<string, UserExpiryData>();

    for (const transaction of rezTransactions) {
      const typedTransaction = transaction as unknown as ICoinTransaction;
      const userId = typedTransaction.user.toString();

      if (!userExpiryMap.has(userId)) {
        userExpiryMap.set(userId, {
          userId,
          expiredAmount: 0,
          newBalance: 0,
          expiredTransactions: []
        });
      }

      const userData = userExpiryMap.get(userId)!;
      userData.expiredAmount += typedTransaction.amount;
      userData.expiredTransactions.push({
        id: String(typedTransaction._id),
        source: typedTransaction.source,
        amount: typedTransaction.amount,
        earnedDate: typedTransaction.createdAt
      });
    }

    logger.info(`👥 [COIN EXPIRY] Processing expiry for ${userExpiryMap.size} users (ReZ/promo) + ${brandedTransactions.length} branded txns`);

    // OPTIMIZATION: Collect all expiry transactions, then batch Wallet and CoinTransaction updates
    // Step 1: Create all expiry transactions (must be sequential to capture _id for each)
    const expiryTransactionResults: Map<string, { _id: any; balance: number }> = new Map();
    for (const [userId, expiryData] of userExpiryMap.entries()) {
      try {
        const expiryTransaction = await CoinTransaction.createTransaction(
          userId,
          'expired',
          expiryData.expiredAmount,
          'expiry',
          `${expiryData.expiredAmount} coins expired from ${expiryData.expiredTransactions.length} transaction(s)`,
          {
            expiredTransactionIds: expiryData.expiredTransactions.map(t => t.id),
            expiredSources: [...new Set(expiryData.expiredTransactions.map(t => t.source))],
            expiryDate: now
          }
        );
        expiryTransactionResults.set(userId, { _id: expiryTransaction._id, balance: expiryTransaction.balance });
        stats.transactionsCreated++;
      } catch (error: any) {
        logger.error(`   ✗ Failed to create expiry transaction for user ${userId}:`, error.message);
        stats.errors.push({ userId, error: error.message || 'Expiry transaction creation failed' });
      }
    }

    // Step 2: Build and execute bulk Wallet updates (OPTIMIZATION: single bulkWrite instead of N findOneAndUpdate calls)
    const walletBulkOps: any[] = [];
    const usersToInvalidate: string[] = [];
    for (const [userId, expiryData] of userExpiryMap.entries()) {
      if (expiryTransactionResults.has(userId)) {
        walletBulkOps.push({
          updateOne: {
            filter: { user: new mongoose.Types.ObjectId(userId) },
            update: { $inc: { 'balance.available': -expiryData.expiredAmount, 'balance.total': -expiryData.expiredAmount } }
          }
        });
        usersToInvalidate.push(userId);
      }
    }

    // Execute Wallet bulkWrite with error tolerance
    if (walletBulkOps.length > 0) {
      try {
        await Wallet.bulkWrite(walletBulkOps, { ordered: false });
      } catch (bulkErr: any) {
        logger.error(`[COIN EXPIRY] Wallet bulkWrite partial failure: ${bulkErr.message}`);
      }
      // Batch cache invalidation for all affected users
      await Promise.allSettled(
        usersToInvalidate.map(userId =>
          invalidateWalletCache(userId).catch((err) => logger.error('[ExpireCoins] Cache invalidation failed', { error: err.message, userId }))
        )
      );
    }

    // Step 3: Build and execute bulk CoinTransaction updates (OPTIMIZATION: single bulkWrite instead of N updateMany calls)
    const coinTxBulkOps: any[] = [];
    for (const [userId, expiryData] of userExpiryMap.entries()) {
      const txResult = expiryTransactionResults.get(userId);
      if (!txResult) continue;

      for (const expiredTx of expiryData.expiredTransactions) {
        coinTxBulkOps.push({
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(expiredTx.id) },
            update: {
              $set: {
                'metadata.isExpired': true,
                'metadata.expiredAt': now,
                'metadata.expiryTransactionId': txResult._id
              }
            }
          }
        });
      }
    }

    // Execute CoinTransaction bulkWrite with error tolerance
    if (coinTxBulkOps.length > 0) {
      try {
        await CoinTransaction.bulkWrite(coinTxBulkOps, { ordered: false });
      } catch (bulkErr: any) {
        logger.error(`[COIN EXPIRY] CoinTransaction bulkWrite partial failure: ${bulkErr.message}`);
      }
    }

    // Step 4: Create ledger entries (fire-and-forget, already have all transaction IDs)
    const expiredPoolId = ledgerService.getPlatformAccountId('expired_pool');
    await Promise.allSettled(
      Array.from(expiryTransactionResults.entries()).map(([userId, txResult]) => {
        const expiryData = userExpiryMap.get(userId)!;
        return ledgerService.recordEntry({
          debitAccount: { type: 'user_wallet', id: new mongoose.Types.ObjectId(userId) },
          creditAccount: { type: 'expired_pool', id: expiredPoolId },
          amount: expiryData.expiredAmount,
          coinType: 'nuqta',
          operationType: 'coin_expiry',
          referenceId: String(txResult._id),
          referenceModel: 'CoinTransaction',
          metadata: { description: `${expiryData.expiredAmount} coins expired` },
        });
      })
    ).then(results => {
      results.forEach((result, idx) => {
        if (result.status === 'rejected') {
          logger.error('[COIN EXPIRY] Ledger entry failed:', result.reason);
        }
      });
    });

    // Step 5: Update stats and log results
    for (const [userId, expiryData] of userExpiryMap.entries()) {
      const txResult = expiryTransactionResults.get(userId);
      if (!txResult) continue;

      expiryData.newBalance = txResult.balance;
      affectedUserIds.add(userId);
      stats.totalCoinsExpired += expiryData.expiredAmount;
      logger.info(`   ✓ User ${userId}: ${expiryData.expiredAmount} coins expired, new balance: ${expiryData.newBalance}`);
    }

    // Build combined notification list: ReZ/promo expirations + branded expirations
    const allExpiryData: UserExpiryData[] = Array.from(userExpiryMap.values());

    // Add branded coin users to notification list
    if (brandedTransactions.length > 0) {
      const brandedByUserForNotif = new Map<string, number>();
      for (const tx of brandedTransactions) {
        const uid = tx.user.toString();
        brandedByUserForNotif.set(uid, (brandedByUserForNotif.get(uid) || 0) + tx.amount);
      }
      for (const [uid, amt] of brandedByUserForNotif.entries()) {
        // Only add if not already in the ReZ list (avoid duplicate notifications)
        if (!userExpiryMap.has(uid)) {
          allExpiryData.push({
            userId: uid,
            expiredAmount: amt,
            newBalance: 0, // branded coins have separate balance
            expiredTransactions: [],
          });
        } else {
          // Merge branded amount into existing entry for combined notification
          const existing = allExpiryData.find(e => e.userId === uid);
          if (existing) existing.expiredAmount += amt;
        }
      }
    }

    // Send notifications in batches
    for (let i = 0; i < allExpiryData.length; i += NOTIFICATION_BATCH_SIZE) {
      const batch = allExpiryData.slice(i, i + NOTIFICATION_BATCH_SIZE);
      await sendExpiryNotifications(batch, stats);

      // Small delay between batches
      if (i + NOTIFICATION_BATCH_SIZE < allExpiryData.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Set final unique user count
    stats.usersAffected = affectedUserIds.size;

  } catch (error: any) {
    logger.error('❌ [COIN EXPIRY] Error processing expired coins:', error);
    stats.errors.push({
      userId: 'SYSTEM',
      error: error.message || 'Unknown error'
    });
  }

  return stats;
}

/**
 * Send expiry notifications to users
 */
async function sendExpiryNotifications(
  userExpiryData: UserExpiryData[],
  stats: ExpiryStats
): Promise<void> {
  const notificationService = PushNotificationService;

  // Batch fetch all users to avoid N+1 queries
  const notifUserIds = userExpiryData.map(d => d.userId);
  const notifUsers = await User.find({ _id: { $in: notifUserIds } })
    .select('_id phoneNumber profile.firstName email')
    .lean();
  const notifUserMap = new Map(notifUsers.map(u => [String(u._id), u]));

  for (const userData of userExpiryData) {
    try {
      // Get user details for notification (batch-fetched)
      const user = notifUserMap.get(String(userData.userId));

      if (!user) {
        logger.warn(`⚠️ [COIN EXPIRY] User ${userData.userId} not found for notification`);
        continue;
      }

      const firstName = user.profile?.firstName || 'Valued Customer';

      // Prepare notification message
      const title = 'Coins Expired';
      const message = `Hi ${firstName}, ${userData.expiredAmount} coins have expired from your account. Your new balance is ${userData.newBalance} coins. Earn and use coins before they expire!`;

      // Try to send notification
      try {
        await notificationService.sendOrderUpdate(
          'COIN_EXPIRY',
          user.phoneNumber,
          title,
          message
        );
        stats.notificationsSent++;
        logger.info(`   📧 Notification sent to user ${userData.userId}`);
      } catch (notifError: any) {
        logger.error(`   ✗ Failed to send notification to ${userData.userId}:`, notifError.message);
        stats.notificationsFailed++;
      }

    } catch (error: any) {
      logger.error(`❌ [COIN EXPIRY] Error sending notification to ${userData.userId}:`, error.message);
      stats.notificationsFailed++;
    }
  }
}

/**
 * Initialize and start the expiry job
 */
export function startCoinExpiryJob(): void {
  if (expiryJob) {
    logger.info('⚠️ [COIN EXPIRY] Job already running');
    return;
  }

  logger.info(`💰 [COIN EXPIRY] Starting coin expiry job (runs daily at 1:00 AM)`);

  expiryJob = cron.schedule(CRON_SCHEDULE, async () => {
    // Prevent concurrent executions (local flag)
    if (isRunning) {
      logger.info('⏭️ [COIN EXPIRY] Previous expiry job still running, skipping this execution');
      return;
    }

    // Distributed lock: prevents multiple server instances from running simultaneously
    let lockToken: string | null = null;
    try {
      lockToken = await redisService.acquireLock('job:coin-expiry', 3600); // 1 hour TTL (daily job processes all users + notifications)
    } catch {
      // Redis unavailable — fall through to local-only guard
    }
    if (!lockToken) {
      logger.info('⏭️ [COIN EXPIRY] Another instance holds the lock, skipping');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('💰 [COIN EXPIRY] Running coin expiry job...');

      // Phase 1: Send pre-expiry notifications (48h warning)
      const preExpiryStats = await sendPreExpiryNotifications();
      if (preExpiryStats.notified > 0) {
        logger.info(`⏰ [COIN EXPIRY] Pre-expiry: ${preExpiryStats.notified} notified, ${preExpiryStats.failed} failed`);
      }

      // Phase 2: Process actual expired coins
      const stats = await processExpiredCoins();

      const duration = Date.now() - startTime;

      logger.info('✅ [COIN EXPIRY] Expiry job completed:', {
        duration: `${duration}ms`,
        usersAffected: stats.usersAffected,
        totalCoinsExpired: stats.totalCoinsExpired,
        transactionsCreated: stats.transactionsCreated,
        notificationsSent: stats.notificationsSent,
        notificationsFailed: stats.notificationsFailed,
        errorCount: stats.errors.length,
        timestamp: new Date().toISOString()
      });

      if (stats.errors.length > 0) {
        logger.error('❌ [COIN EXPIRY] Errors during expiry:');
        stats.errors.slice(0, 10).forEach((error, index) => {
          logger.error(`   ${index + 1}. User: ${error.userId}, Error: ${error.error}`);
        });
        if (stats.errors.length > 10) {
          logger.error(`   ... and ${stats.errors.length - 10} more errors`);
        }
      }

      // Summary message
      if (stats.usersAffected > 0) {
        logger.info(`📈 [COIN EXPIRY] ${stats.totalCoinsExpired} coins expired from ${stats.usersAffected} users, ${stats.notificationsSent} notifications sent`);
      } else {
        logger.info('✨ [COIN EXPIRY] No coins expired today');
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ [COIN EXPIRY] Expiry job failed:', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      isRunning = false;
      // Release distributed lock
      if (lockToken) {
        try { await redisService.releaseLock('job:coin-expiry', lockToken); } catch { /* lock auto-expires */ }
      }
    }
  });

  logger.info('✅ [COIN EXPIRY] Coin expiry job started successfully');
}

/**
 * Stop the expiry job
 */
export function stopCoinExpiryJob(): void {
  if (expiryJob) {
    expiryJob.stop();
    expiryJob = null;
    logger.info('🛑 [COIN EXPIRY] Coin expiry job stopped');
  } else {
    logger.info('⚠️ [COIN EXPIRY] No job running to stop');
  }
}

/**
 * Get expiry job status
 */
export function getCoinExpiryJobStatus(): {
  running: boolean;
  executing: boolean;
  schedule: string;
  config: {
    notificationBatchSize: number;
  };
} {
  return {
    running: expiryJob !== null,
    executing: isRunning,
    schedule: CRON_SCHEDULE,
    config: {
      notificationBatchSize: NOTIFICATION_BATCH_SIZE
    }
  };
}

/**
 * Manually trigger coin expiry (for testing or maintenance)
 */
export async function triggerManualCoinExpiry(): Promise<ExpiryStats> {
  if (isRunning) {
    logger.info('⚠️ [COIN EXPIRY] Expiry already running, please wait');
    throw new Error('Expiry already in progress');
  }

  logger.info('💰 [COIN EXPIRY] Manual expiry triggered');

  isRunning = true;
  const startTime = Date.now();

  try {
    const stats = await processExpiredCoins();
    const duration = Date.now() - startTime;

    logger.info('✅ [COIN EXPIRY] Manual expiry completed:', {
      duration: `${duration}ms`,
      usersAffected: stats.usersAffected,
      totalCoinsExpired: stats.totalCoinsExpired,
      notificationsSent: stats.notificationsSent
    });

    return stats;
  } catch (error) {
    logger.error('❌ [COIN EXPIRY] Manual expiry failed:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * Preview upcoming expirations (without processing)
 */
export async function previewUpcomingExpirations(daysAhead: number = 7): Promise<{
  totalCoins: number;
  usersAffected: number;
  expirationsByDate: Array<{
    date: Date;
    coins: number;
    users: number;
  }>;
}> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const upcomingExpirations = await CoinTransaction.aggregate([
    {
      $match: {
        type: { $in: ['earned', 'branded_award'] },
        expiresAt: {
          $gt: now,
          $lte: futureDate
        },
        $or: [
          { 'metadata.isExpired': { $ne: true } },
          { metadata: { $exists: false } }
        ]
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$expiresAt' } },
          user: '$user'
        },
        totalAmount: { $sum: '$amount' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        totalCoins: { $sum: '$totalAmount' },
        uniqueUsers: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  const totalStats = upcomingExpirations.reduce(
    (acc, item) => ({
      totalCoins: acc.totalCoins + item.totalCoins,
      usersAffected: acc.usersAffected + item.uniqueUsers
    }),
    { totalCoins: 0, usersAffected: 0 }
  );

  return {
    totalCoins: totalStats.totalCoins,
    usersAffected: totalStats.usersAffected,
    expirationsByDate: upcomingExpirations.map(item => ({
      date: new Date(item._id),
      coins: item.totalCoins,
      users: item.uniqueUsers
    }))
  };
}

/**
 * Initialize the job (called from server startup)
 */
export function initializeCoinExpiryJob(): void {
  startCoinExpiryJob();
}

export default {
  start: startCoinExpiryJob,
  stop: stopCoinExpiryJob,
  getStatus: getCoinExpiryJobStatus,
  triggerManual: triggerManualCoinExpiry,
  previewUpcoming: previewUpcomingExpirations,
  initialize: initializeCoinExpiryJob
};
