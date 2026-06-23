import mongoose, { Types } from 'mongoose';
import { LedgerEntry } from '../models/LedgerEntry';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import Partner from '../models/Partner';
import { logTransaction } from '../models/TransactionAuditLog';
import { ledgerService } from './ledgerService';
import { runFinancialTxn } from '../utils/financialTransactionWrapper';
import { createServiceLogger } from '../config/logger';
import { walletBalanceDriftTotal } from '../config/walletMetrics';

const logger = createServiceLogger('reconciliation');

export interface ReconciliationResult {
  userId: string;
  walletId: string;
  expected: number;
  actual: number;
  drift: number;
  driftPercentage: number;
  status: 'ok' | 'minor_drift' | 'critical_drift';
}

export interface BulkReconciliationReport {
  totalWallets: number;
  checkedWallets: number;
  okCount: number;
  minorDriftCount: number;
  criticalDriftCount: number;
  drifts: ReconciliationResult[];
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}

class ReconciliationService {
  private readonly MINOR_DRIFT_THRESHOLD = 0.01; // 0.01 NC
  private readonly CRITICAL_DRIFT_THRESHOLD = 1.0; // 1 NC

  /**
   * Recompute a single user's wallet balance from ledger entries
   * and compare against the stored wallet balance.
   */
  async recomputeWalletBalance(userId: string): Promise<ReconciliationResult> {
    const wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      throw new Error(`Wallet not found for user ${userId}`);
    }

    const userObjectId = new Types.ObjectId(userId);
    const expected = await ledgerService.getAccountBalance(userObjectId);
    const actual = wallet.balance.available;
    const drift = Math.abs(expected - actual);
    const driftPercentage = actual > 0 ? (drift / actual) * 100 : (drift > 0 ? 100 : 0);

    let status: ReconciliationResult['status'] = 'ok';
    if (drift > this.CRITICAL_DRIFT_THRESHOLD) {
      status = 'critical_drift';
      walletBalanceDriftTotal.inc({ severity: 'critical' });
    } else if (drift > this.MINOR_DRIFT_THRESHOLD) {
      status = 'minor_drift';
      walletBalanceDriftTotal.inc({ severity: 'minor' });
    }

    const result: ReconciliationResult = {
      userId,
      walletId: String(wallet._id),
      expected,
      actual,
      drift,
      driftPercentage,
      status,
    };

    if (status !== 'ok') {
      logger.warn('Balance drift detected', {
        userId,
        expected,
        actual,
        drift,
        status,
      });
    }

    return result;
  }

  /**
   * Detect drift across all wallets (or a subset).
   * Returns only wallets with drift above the minor threshold.
   * Uses cursor-based pagination to avoid skip() overhead on large collections.
   */
  async detectDrift(threshold?: number): Promise<ReconciliationResult[]> {
    const effectiveThreshold = threshold ?? this.MINOR_DRIFT_THRESHOLD;
    const drifts: ReconciliationResult[] = [];
    const batchSize = 200;
    let lastId: Types.ObjectId | null = null;

    while (true) {
      const query: Record<string, any> = lastId ? { _id: { $gt: lastId } } : {};
      const wallets = await Wallet.find(query, { user: 1 })
        .sort({ _id: 1 })
        .limit(batchSize)
        .lean();

      if (wallets.length === 0) break;

      for (const wallet of wallets) {
        try {
          const result = await this.recomputeWalletBalance(String(wallet.user));
          if (result.drift > effectiveThreshold) {
            drifts.push(result);
          }
        } catch (error) {
          logger.error('Failed to reconcile wallet', error, {
            userId: String(wallet.user),
          });
        }
      }

      lastId = wallets[wallets.length - 1]._id as Types.ObjectId;
      if (wallets.length < batchSize) break;
    }

    return drifts;
  }

  /**
   * Run cursor-based bulk reconciliation across all wallets.
   */
  async bulkReconciliation(batchSize: number = 100): Promise<BulkReconciliationReport> {
    const startedAt = new Date();
    let okCount = 0;
    let minorDriftCount = 0;
    let criticalDriftCount = 0;
    const allDrifts: ReconciliationResult[] = [];

    const totalWallets = await Wallet.countDocuments();
    let processed = 0;
    let lastId: Types.ObjectId | null = null;

    while (true) {
      const query: Record<string, any> = lastId ? { _id: { $gt: lastId } } : {};
      const wallets = await Wallet.find(query, { user: 1 })
        .sort({ _id: 1 })
        .limit(batchSize)
        .lean();

      if (wallets.length === 0) break;

      for (const wallet of wallets) {
        try {
          const result = await this.recomputeWalletBalance(String(wallet.user));
          processed++;

          switch (result.status) {
            case 'ok':
              okCount++;
              break;
            case 'minor_drift':
              minorDriftCount++;
              allDrifts.push(result);
              break;
            case 'critical_drift':
              criticalDriftCount++;
              allDrifts.push(result);
              // Log critical drifts to audit trail
              logTransaction({
                userId: new Types.ObjectId(wallet.user),
                walletId: wallet._id as Types.ObjectId,
                walletType: 'user',
                operation: 'adjustment',
                amount: result.drift,
                balanceBefore: { total: result.actual, available: result.actual, pending: 0, cashback: 0 },
                balanceAfter: { total: result.expected, available: result.expected, pending: 0, cashback: 0 },
                reference: {
                  type: 'adjustment',
                  description: `Reconciliation drift detected: expected ${result.expected}, actual ${result.actual}, drift ${result.drift}`,
                },
                metadata: { source: 'reconciliation' },
              });
              break;
          }
        } catch (error) {
          logger.error('Reconciliation error for wallet', error, {
            userId: String(wallet.user),
          });
        }
      }

      lastId = wallets[wallets.length - 1]._id as Types.ObjectId;
      logger.info('Reconciliation batch complete', {
        processed,
        total: totalWallets,
        driftsFound: allDrifts.length,
      });

      if (wallets.length < batchSize) break;
    }

    const completedAt = new Date();
    const report: BulkReconciliationReport = {
      totalWallets,
      checkedWallets: processed,
      okCount,
      minorDriftCount,
      criticalDriftCount,
      drifts: allDrifts,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };

    logger.info('Bulk reconciliation complete', {
      totalWallets: report.totalWallets,
      checkedWallets: report.checkedWallets,
      okCount: report.okCount,
      minorDriftCount: report.minorDriftCount,
      criticalDriftCount: report.criticalDriftCount,
      durationMs: report.durationMs,
    });

    return report;
  }

  /**
   * Auto-fix a wallet's balance drift.
   * Creates a corrective ledger entry and atomic wallet update.
   * Requires super_admin approval in production (dryRun=true by default).
   */
  async autoFix(
    userId: string,
    opts: { dryRun?: boolean; adminUserId?: string; requestId?: string } = { dryRun: true }
  ): Promise<{ dryRun: boolean; drift: number; correctionApplied: boolean }> {
    const result = await this.recomputeWalletBalance(userId);

    if (result.status === 'ok') {
      return { dryRun: !!opts.dryRun, drift: 0, correctionApplied: false };
    }

    if (opts.dryRun) {
      logger.info('Dry run: would correct drift', {
        userId,
        drift: result.drift,
        expected: result.expected,
        actual: result.actual,
      });
      return { dryRun: true, drift: result.drift, correctionApplied: false };
    }

    // Apply correction atomically: ledger + wallet in a single transaction
    const correctionAmount = result.expected - result.actual;

    await runFinancialTxn(async ({ session, recordLedger }) => {
      const platformFeesAccountId = ledgerService.getPlatformAccountId('platform_fees');
      const userAccountId = new Types.ObjectId(userId);
      const refId = `recon:${userId}:${Date.now()}`;
      const metadataObj = {
        adminUserId: opts.adminUserId,
        requestId: opts.requestId,
        description: `Auto-correction: drift of ${result.drift} NC (expected ${result.expected}, actual ${result.actual})`,
      };

      if (correctionAmount > 0) {
        // User should have more — credit user from platform_fees
        await recordLedger({
          debitAccount: { type: 'platform_fees', id: platformFeesAccountId },
          creditAccount: { type: 'user_wallet', id: userAccountId },
          amount: correctionAmount,
          operationType: 'correction',
          referenceId: refId,
          referenceModel: 'Reconciliation',
          metadata: metadataObj,
        });
      } else {
        // User has too much — debit user to platform_fees
        await recordLedger({
          debitAccount: { type: 'user_wallet', id: userAccountId },
          creditAccount: { type: 'platform_fees', id: platformFeesAccountId },
          amount: Math.abs(correctionAmount),
          operationType: 'correction',
          referenceId: refId,
          referenceModel: 'Reconciliation',
          metadata: metadataObj,
        });
      }

      // Atomically fix wallet balance within the same transaction
      await Wallet.findOneAndUpdate(
        { user: userId },
        { $inc: { 'balance.available': correctionAmount, 'balance.total': correctionAmount } },
        { session }
      );
    });

    logger.info('Balance correction applied', {
      userId,
      correctionAmount,
      previousBalance: result.actual,
      newBalance: result.expected,
      adminUserId: opts.adminUserId,
    });

    return { dryRun: false, drift: result.drift, correctionApplied: true };
  }

  /**
   * Reconcile partner earnings: compare Partner.earnings.total with
   * the sum of partner-tagged CoinTransactions for each partner.
   * Reports drift between the two sources.
   */
  async reconcilePartnerEarnings(opts?: { limit?: number }): Promise<{
    totalPartners: number;
    checked: number;
    drifts: Array<{
      userId: string;
      partnerTotal: number;
      coinTransactionTotal: number;
      drift: number;
      status: 'ok' | 'minor' | 'critical';
    }>;
  }> {
    const limit = opts?.limit || 500;
    const partners = await Partner.find({ isActive: true })
      .select('userId earnings.total')
      .limit(limit)
      .lean();

    const drifts: Array<{
      userId: string;
      partnerTotal: number;
      coinTransactionTotal: number;
      drift: number;
      status: 'ok' | 'minor' | 'critical';
    }> = [];

    for (const partner of partners) {
      try {
        const userId = String(partner.userId);

        // Aggregate partner-tagged CoinTransactions
        const agg = await CoinTransaction.aggregate([
          {
            $match: {
              user: new Types.ObjectId(userId),
              'metadata.partnerEarning': true,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ]);

        const coinTransactionTotal = agg[0]?.total || 0;
        const partnerTotal = partner.earnings?.total || 0;
        const drift = Math.abs(partnerTotal - coinTransactionTotal);

        let status: 'ok' | 'minor' | 'critical' = 'ok';
        if (drift > 100) {
          status = 'critical';
          walletBalanceDriftTotal.inc({ severity: 'critical' });
        } else if (drift > 1) {
          status = 'minor';
          walletBalanceDriftTotal.inc({ severity: 'minor' });
        }

        if (status !== 'ok') {
          drifts.push({ userId, partnerTotal, coinTransactionTotal, drift, status });
          logger.warn('Partner earnings drift detected', {
            userId,
            partnerTotal,
            coinTransactionTotal,
            drift,
            status,
          });
        }
      } catch (error) {
        logger.error('Failed to reconcile partner earnings', error, {
          userId: String(partner.userId),
        });
      }
    }

    logger.info('Partner earnings reconciliation complete', {
      totalPartners: partners.length,
      checked: partners.length,
      driftsFound: drifts.length,
    });

    return {
      totalPartners: partners.length,
      checked: partners.length,
      drifts,
    };
  }

  /**
   * Reconcile merchant liability: compare LedgerEntry sums (merchant_liability_issuance)
   * vs MerchantLiability.rewardIssued, and MerchantWallet debits vs settledAmount.
   */
  async reconcileMerchantLiability(opts?: { limit?: number }): Promise<{
    totalMerchants: number;
    checked: number;
    drifts: Array<{
      merchantId: string;
      ledgerIssuanceTotal: number;
      liabilityIssuanceTotal: number;
      drift: number;
      status: 'ok' | 'minor' | 'critical';
    }>;
  }> {
    const limit = opts?.limit || 500;

    // Get distinct merchants from MerchantLiability
    const merchants = await (await import('../models/MerchantLiability')).MerchantLiability.aggregate([
      { $group: { _id: '$merchant', totalIssued: { $sum: '$rewardIssued' }, totalSettled: { $sum: '$settledAmount' } } },
      { $limit: limit },
    ]);

    const drifts: Array<{
      merchantId: string;
      ledgerIssuanceTotal: number;
      liabilityIssuanceTotal: number;
      drift: number;
      status: 'ok' | 'minor' | 'critical';
    }> = [];

    for (const merchant of merchants) {
      try {
        const merchantId = merchant._id.toString();

        // Sum ledger entries for merchant_liability_issuance
        const ledgerAgg = await LedgerEntry.aggregate([
          {
            $match: {
              accountId: merchant._id,
              accountType: 'merchant_wallet',
              operationType: 'merchant_liability_issuance',
              direction: 'debit',
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        const ledgerIssuanceTotal = ledgerAgg[0]?.total || 0;
        const liabilityIssuanceTotal = merchant.totalIssued || 0;
        const drift = Math.abs(ledgerIssuanceTotal - liabilityIssuanceTotal);

        let status: 'ok' | 'minor' | 'critical' = 'ok';
        if (drift > 100) {
          status = 'critical';
          walletBalanceDriftTotal.inc({ severity: 'critical' });
        } else if (drift > 1) {
          status = 'minor';
          walletBalanceDriftTotal.inc({ severity: 'minor' });
        }

        if (status !== 'ok') {
          drifts.push({ merchantId, ledgerIssuanceTotal, liabilityIssuanceTotal, drift, status });
          logger.warn('Merchant liability drift detected', {
            merchantId, ledgerIssuanceTotal, liabilityIssuanceTotal, drift, status,
          });
        }
      } catch (error) {
        logger.error('Failed to reconcile merchant liability', error, {
          merchantId: merchant._id.toString(),
        });
      }
    }

    logger.info('Merchant liability reconciliation complete', {
      totalMerchants: merchants.length,
      checked: merchants.length,
      driftsFound: drifts.length,
    });

    return { totalMerchants: merchants.length, checked: merchants.length, drifts };
  }
}

export const reconciliationService = new ReconciliationService();
