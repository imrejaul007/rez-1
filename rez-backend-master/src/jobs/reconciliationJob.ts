import * as cron from 'node-cron';
import mongoose from 'mongoose';
import { MallPurchase } from '../models/MallPurchase';
import { UserCashback } from '../models/UserCashback';
import { Wallet } from '../models/Wallet';
import { Order } from '../models/Order';
import { MerchantWallet } from '../models/MerchantWallet';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Daily Reconciliation Job
 *
 * Runs at 3:00 AM (after credit and expire jobs) to detect discrepancies:
 * 1. MallPurchase credited amounts vs UserCashback credited amounts per user
 * 2. Wallet statistics.totalCashback vs sum of cashback CoinTransactions
 *
 * Persists results to Redis for admin dashboard consumption.
 * Emits structured events for alerting (console.error for critical, console.warn for minor).
 * Uses Redis distributed lock with owner token for multi-instance safety.
 */

const RECONCILIATION_SCHEDULE = '0 3 * * *'; // Daily at 3:00 AM
const LOCK_TTL = 7200; // 2 hours
const RESULT_TTL = 7 * 24 * 60 * 60; // Keep results for 7 days

let reconciliationJob: ReturnType<typeof cron.schedule> | null = null;

interface DiscrepancyRecord {
  userId: string;
  type: 'purchase_vs_cashback' | 'wallet_vs_transactions' | 'order_vs_wallet_deduction' | 'order_vs_merchant_settlement';
  expected: number;
  actual: number;
  difference: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ReconciliationResult {
  discrepancies: DiscrepancyRecord[];
  usersChecked: number;
  duration: number;
  timestamp: Date;
  summary: {
    totalDiscrepancies: number;
    criticalCount: number;
    highCount: number;
    totalDifferenceAmount: number;
  };
}

/**
 * Classify discrepancy severity based on the difference amount
 */
function classifySeverity(diff: number): 'low' | 'medium' | 'high' | 'critical' {
  if (diff > 10000) return 'critical';  // > ₹10,000
  if (diff > 1000) return 'high';       // > ₹1,000
  if (diff > 100) return 'medium';      // > ₹100
  return 'low';                          // ₹1-100
}

/**
 * Run the reconciliation check
 */
async function runReconciliation(): Promise<ReconciliationResult> {
  const startTime = Date.now();
  const discrepancies: DiscrepancyRecord[] = [];

  logger.info('🔍 [RECONCILIATION] Starting daily reconciliation...');

  try {
    // Step 1: Compare MallPurchase credited amounts vs UserCashback amounts per user
    const purchaseSums = await MallPurchase.aggregate([
      { $match: { status: 'credited' } },
      {
        $group: {
          _id: '$user',
          totalPurchaseCashback: { $sum: '$actualCashback' },
          purchaseCount: { $sum: 1 },
        },
      },
    ]);

    for (const ps of purchaseSums) {
      const cashbackSum = await UserCashback.aggregate([
        {
          $match: {
            user: ps._id,
            source: 'special_offer',
            status: { $in: ['credited', 'redeemed'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      const cashbackTotal = cashbackSum[0]?.total || 0;
      const diff = Math.abs(ps.totalPurchaseCashback - cashbackTotal);

      if (diff > 1) { // Allow ₹1 rounding tolerance
        discrepancies.push({
          userId: ps._id.toString(),
          type: 'purchase_vs_cashback',
          expected: ps.totalPurchaseCashback,
          actual: cashbackTotal,
          difference: diff,
          severity: classifySeverity(diff),
        });
      }
    }

    // Step 2: Compare wallet totalCashback vs CoinTransaction cashback totals
    const { CoinTransaction } = await import('../models/CoinTransaction');

    const walletCashbackSums = await Wallet.aggregate([
      { $match: { 'statistics.totalCashback': { $gt: 0 } } },
      {
        $project: {
          user: 1,
          walletCashback: '$statistics.totalCashback',
        },
      },
    ]);

    for (const ws of walletCashbackSums) {
      const txSum = await CoinTransaction.aggregate([
        {
          $match: {
            user: ws.user.toString(),
            source: 'cashback',
            type: 'earned',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);

      const txTotal = txSum[0]?.total || 0;
      const diff = Math.abs(ws.walletCashback - txTotal);

      if (diff > 1) {
        discrepancies.push({
          userId: ws.user.toString(),
          type: 'wallet_vs_transactions',
          expected: ws.walletCashback,
          actual: txTotal,
          difference: diff,
          severity: classifySeverity(diff),
        });
      }
    }

    // Step 3: Compare completed order totals vs wallet deductions per user
    // Ensures every delivered/completed order had a matching wallet deduction
    const orderSums = await Order.aggregate([
      { $match: { 'status.current': { $in: ['delivered', 'completed'] }, 'payment.method': 'wallet' } },
      {
        $group: {
          _id: '$user',
          totalOrderAmount: { $sum: '$totals.total' },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    for (const os of orderSums) {
      const walletDebits = await CoinTransaction.aggregate([
        {
          $match: {
            user: os._id,
            type: 'spent',
            source: { $in: ['order', 'payment'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      const debitTotal = walletDebits[0]?.total || 0;
      const diff = Math.abs(os.totalOrderAmount - debitTotal);

      if (diff > 5) { // Allow ₹5 tolerance for rounding/fees
        discrepancies.push({
          userId: os._id.toString(),
          type: 'order_vs_wallet_deduction',
          expected: os.totalOrderAmount,
          actual: debitTotal,
          difference: diff,
          severity: classifySeverity(diff),
        });
      }
    }

    // Step 4: Compare delivered orders vs merchant settlement amounts
    const merchantOrderSums = await Order.aggregate([
      { $match: { 'status.current': { $in: ['delivered', 'completed'] }, store: { $exists: true } } },
      {
        $group: {
          _id: '$store',
          totalOrderRevenue: { $sum: '$totals.subtotal' },
          orderCount: { $sum: 1 },
        },
      },
      { $limit: 500 }, // Cap to prevent excessive processing
    ]);

    for (const ms of merchantOrderSums) {
      try {
        const merchantWallet = await MerchantWallet.findOne({ storeId: ms._id }).lean();
        if (merchantWallet) {
          const settledAmount = (merchantWallet as any).balance?.totalSettled || (merchantWallet as any).statistics?.totalCredited || 0;
          const diff = Math.abs(ms.totalOrderRevenue - settledAmount);

          if (diff > 10) { // Allow ₹10 tolerance for platform fees
            discrepancies.push({
              userId: ms._id.toString(),
              type: 'order_vs_merchant_settlement',
              expected: ms.totalOrderRevenue,
              actual: settledAmount,
              difference: diff,
              severity: classifySeverity(diff),
            });
          }
        }
      } catch {
        // Skip if merchant wallet lookup fails
      }
    }

    const duration = Date.now() - startTime;

    // Build summary
    const criticalCount = discrepancies.filter(d => d.severity === 'critical').length;
    const highCount = discrepancies.filter(d => d.severity === 'high').length;
    const totalDifferenceAmount = discrepancies.reduce((sum, d) => sum + d.difference, 0);

    const result: ReconciliationResult = {
      discrepancies,
      usersChecked: purchaseSums.length + walletCashbackSums.length + orderSums.length + merchantOrderSums.length,
      duration,
      timestamp: new Date(),
      summary: {
        totalDiscrepancies: discrepancies.length,
        criticalCount,
        highCount,
        totalDifferenceAmount,
      },
    };

    // Persist results to Redis for admin dashboard
    const resultKey = `reconciliation:latest`;
    const historyKey = `reconciliation:history:${new Date().toISOString().split('T')[0]}`;
    await redisService.set(resultKey, result, RESULT_TTL);
    await redisService.set(historyKey, result, RESULT_TTL);

    // Structured alerting based on severity
    if (criticalCount > 0) {
      logger.error(`🚨 [RECONCILIATION] CRITICAL: ${criticalCount} critical discrepancies found (total ₹${totalDifferenceAmount.toFixed(2)}). Immediate investigation required.`, {
        event: 'reconciliation_critical',
        criticalCount,
        highCount,
        totalDifferenceAmount,
        discrepancies: discrepancies.filter(d => d.severity === 'critical'),
      });
    } else if (highCount > 0) {
      logger.warn(`⚠️ [RECONCILIATION] HIGH: ${highCount} high-severity discrepancies found (total ₹${totalDifferenceAmount.toFixed(2)}).`, {
        event: 'reconciliation_high',
        highCount,
        totalDifferenceAmount,
        discrepancies: discrepancies.filter(d => d.severity === 'high'),
      });
    } else if (discrepancies.length > 0) {
      logger.warn(`⚠️ [RECONCILIATION] Found ${discrepancies.length} minor discrepancies (total ₹${totalDifferenceAmount.toFixed(2)}).`);
    } else {
      logger.info(`✅ [RECONCILIATION] No discrepancies found. Checked ${result.usersChecked} user records in ${duration}ms`);
    }

    return result;
  } catch (error) {
    logger.error('❌ [RECONCILIATION] Job failed:', error);
    throw error;
  }
}

/**
 * Start the reconciliation job
 */
export function startReconciliationJob(): void {
  if (reconciliationJob) {
    logger.info('⚠️ [RECONCILIATION] Job already scheduled');
    return;
  }

  logger.info('🔍 [RECONCILIATION] Starting daily reconciliation job (runs at 3:00 AM)');

  reconciliationJob = cron.schedule(RECONCILIATION_SCHEDULE, async () => {
    const lockToken = await redisService.acquireLock('reconciliation_job', LOCK_TTL);
    if (!lockToken) {
      logger.info('⏭️ [RECONCILIATION] Another instance is running, skipping');
      return;
    }

    try {
      await runReconciliation();
    } catch (error) {
      // Already logged
    } finally {
      await redisService.releaseLock('reconciliation_job', lockToken);
    }
  });

  logger.info('✅ [RECONCILIATION] Job started');
}

/**
 * Stop the reconciliation job
 */
export function stopReconciliationJob(): void {
  if (reconciliationJob) {
    reconciliationJob.stop();
    reconciliationJob = null;
    logger.info('🛑 [RECONCILIATION] Job stopped');
  }
}

/**
 * Manually trigger reconciliation (for admin/testing)
 */
export async function triggerManualReconciliation(): Promise<ReconciliationResult> {
  const lockToken = await redisService.acquireLock('reconciliation_job', LOCK_TTL);
  if (!lockToken) {
    throw new Error('Reconciliation job already in progress');
  }

  try {
    return await runReconciliation();
  } finally {
    await redisService.releaseLock('reconciliation_job', lockToken);
  }
}

/**
 * Get the latest reconciliation results (from Redis)
 */
export async function getLatestReconciliationResult(): Promise<ReconciliationResult | null> {
  return redisService.get<ReconciliationResult>('reconciliation:latest');
}

export default {
  start: startReconciliationJob,
  stop: stopReconciliationJob,
  triggerManual: triggerManualReconciliation,
  getLatest: getLatestReconciliationResult,
};
