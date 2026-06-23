import { ClientSession, Types } from 'mongoose';
import { MerchantLiability, MerchantLiabilityCampaignType } from '../models/MerchantLiability';
import { MerchantWallet } from '../models/MerchantWallet';
import { ledgerService } from './ledgerService';
import { runFinancialTxn } from '../utils/financialTransactionWrapper';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('liability');

export interface RecordIssuanceParams {
  merchantId: string;
  storeId: string;
  campaignId?: string;
  campaignType: MerchantLiabilityCampaignType;
  amount: number;
  referenceId: string;
  referenceModel: string;
  session?: ClientSession;
}

export interface RecordRedemptionParams {
  merchantId: string;
  storeId: string;
  campaignId?: string;
  amount: number;
  referenceId: string;
  session?: ClientSession;
}

/**
 * Compute a cycleId string from a settlement cycle type and a date.
 */
export function computeCycleId(cycle: 'instant' | 'daily' | 'weekly' | 'monthly', date: Date = new Date()): string {
  switch (cycle) {
    case 'instant':
      return 'instant';
    case 'daily': {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    case 'weekly': {
      // ISO week number
      const jan1 = new Date(date.getFullYear(), 0, 1);
      const dayOfYear = Math.ceil((date.getTime() - jan1.getTime()) / 86400000);
      const weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
      return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }
    case 'monthly': {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }
    default:
      return 'instant';
  }
}

class LiabilityService {
  /**
   * Get the settlement cycle for a merchant from their MerchantWallet config.
   */
  private async getMerchantCycleId(merchantId: string): Promise<string> {
    const wallet = await MerchantWallet.findOne({ merchant: merchantId }).select('settlementCycle').lean();
    const cycle = wallet?.settlementCycle || 'instant';
    return computeCycleId(cycle);
  }

  /**
   * Record a reward issuance as merchant liability.
   * Upserts the aggregate row for this merchant+campaign+cycle using atomic $inc.
   */
  async recordIssuance(params: RecordIssuanceParams): Promise<void> {
    const { merchantId, storeId, campaignId, campaignType, amount, referenceId, referenceModel, session } = params;

    if (amount <= 0) return;

    const cycleId = await this.getMerchantCycleId(merchantId);

    const updateOpts: any = { upsert: true, new: true };
    if (session) updateOpts.session = session;

    await MerchantLiability.findOneAndUpdate(
      {
        merchant: new Types.ObjectId(merchantId),
        campaign: campaignId ? new Types.ObjectId(campaignId) : null,
        cycleId,
      },
      {
        $inc: {
          rewardIssued: amount,
          pendingAmount: amount,
          issuanceCount: 1,
        },
        $setOnInsert: {
          store: new Types.ObjectId(storeId),
          campaignType,
          status: 'active',
          currency: 'NC',
          rewardRedeemed: 0,
          settledAmount: 0,
          redemptionCount: 0,
        },
      },
      updateOpts,
    );

    // Record ledger entry for this issuance
    try {
      await ledgerService.recordEntry({
        debitAccount: { type: 'merchant_wallet', id: new Types.ObjectId(merchantId) },
        creditAccount: { type: 'platform_float', id: ledgerService.getPlatformAccountId('platform_float') },
        amount,
        operationType: 'merchant_liability_issuance',
        referenceId,
        referenceModel,
        metadata: {
          description: `Merchant liability issuance: ${campaignType}`,
          idempotencyKey: `ml-issuance:${referenceId}`,
        },
      }, session);
    } catch (err) {
      logger.error('Failed to record liability ledger entry', err as Error, { merchantId, referenceId });
    }

    // For instant settlement, settle immediately
    if (cycleId === 'instant') {
      await this.settleCycle(merchantId, cycleId, { autoDebit: true }).catch((err) => {
        logger.error('Instant settlement failed (non-blocking)', err as Error, { merchantId });
      });
    }

    logger.info('Liability issuance recorded', { merchantId, campaignType, amount, cycleId });
  }

  /**
   * Record a redemption against an existing merchant liability.
   */
  async recordRedemption(params: RecordRedemptionParams): Promise<void> {
    const { merchantId, storeId, campaignId, amount, referenceId, session } = params;

    if (amount <= 0) return;

    const filter: any = {
      merchant: new Types.ObjectId(merchantId),
      status: { $in: ['active', 'pending_settlement'] },
    };
    if (campaignId) filter.campaign = new Types.ObjectId(campaignId);

    const updateOpts: any = {};
    if (session) updateOpts.session = session;

    const result = await MerchantLiability.findOneAndUpdate(
      filter,
      { $inc: { rewardRedeemed: amount, redemptionCount: 1 } },
      { sort: { createdAt: -1 }, ...updateOpts },
    );

    if (!result) {
      logger.warn('No active liability found for redemption', { merchantId, campaignId, referenceId });
    }
  }

  /**
   * Get a paginated liability statement for a merchant.
   */
  async getStatement(
    merchantId: string,
    opts: { cycleId?: string; campaignId?: string; status?: string; page?: number; limit?: number },
  ) {
    const query: any = { merchant: new Types.ObjectId(merchantId) };
    if (opts.cycleId) query.cycleId = opts.cycleId;
    if (opts.campaignId) query.campaign = new Types.ObjectId(opts.campaignId);
    if (opts.status) query.status = opts.status;

    const page = opts.page || 1;
    const limit = Math.min(opts.limit || 20, 50);
    const skip = (page - 1) * limit;

    const [records, total, totals] = await Promise.all([
      MerchantLiability.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('store', 'name logo')
        .populate('campaign', 'title slug')
        .lean(),
      MerchantLiability.countDocuments(query),
      MerchantLiability.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalIssued: { $sum: '$rewardIssued' },
            totalRedeemed: { $sum: '$rewardRedeemed' },
            totalPending: { $sum: '$pendingAmount' },
            totalSettled: { $sum: '$settledAmount' },
          },
        },
      ]),
    ]);

    return {
      records,
      totals: totals[0] || { totalIssued: 0, totalRedeemed: 0, totalPending: 0, totalSettled: 0 },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Settle all active liabilities for a merchant in a given cycle.
   */
  async settleCycle(
    merchantId: string,
    cycleId: string,
    opts: { dryRun?: boolean; autoDebit?: boolean } = {},
  ): Promise<{ totalSettled: number; recordsSettled: number }> {
    const liabilities = await MerchantLiability.find({
      merchant: new Types.ObjectId(merchantId),
      cycleId,
      status: 'active',
      pendingAmount: { $gt: 0 },
    }).lean();

    if (liabilities.length === 0) {
      return { totalSettled: 0, recordsSettled: 0 };
    }

    const totalPending = liabilities.reduce((sum, l) => sum + l.pendingAmount, 0);

    if (opts.dryRun) {
      return { totalSettled: totalPending, recordsSettled: liabilities.length };
    }

    if (opts.autoDebit) {
      // Wrap in financial transaction: debit merchant wallet + settle records
      await runFinancialTxn(async ({ session, recordLedger }) => {
        const sessionOpt = session || undefined;
        // Debit merchant wallet
        const debitResult = await MerchantWallet.findOneAndUpdate(
          {
            merchant: new Types.ObjectId(merchantId),
            'balance.available': { $gte: totalPending },
          },
          {
            $inc: { 'balance.available': -totalPending },
          },
          { session: sessionOpt, new: true },
        );

        if (!debitResult) {
          logger.warn('Insufficient merchant wallet balance for settlement, marking pending_settlement', {
            merchantId, cycleId, totalPending,
          });
          // Mark as pending_settlement instead
          await MerchantLiability.updateMany(
            { merchant: new Types.ObjectId(merchantId), cycleId, status: 'active' },
            { $set: { status: 'pending_settlement' } },
            { session: sessionOpt },
          );
          return;
        }

        // Record settlement ledger entry
        const pairId = await recordLedger({
          debitAccount: { type: 'merchant_wallet', id: new Types.ObjectId(merchantId) },
          creditAccount: { type: 'platform_fees', id: ledgerService.getPlatformAccountId('platform_fees') },
          amount: totalPending,
          operationType: 'merchant_liability_settlement',
          referenceId: `settlement:${merchantId}:${cycleId}`,
          referenceModel: 'MerchantLiability',
          metadata: {
            description: `Settlement for cycle ${cycleId}: ${liabilities.length} liabilities`,
          },
        });

        // Mark all liability records as settled
        const liabilityIds = liabilities.map((l) => l._id);
        await MerchantLiability.updateMany(
          { _id: { $in: liabilityIds } },
          {
            $set: {
              status: 'settled',
              pendingAmount: 0,
              settlementDate: new Date(),
              settlementTransactionId: `settlement:${merchantId}:${cycleId}`,
              settlementLedgerPairId: pairId,
            },
            $inc: { settledAmount: totalPending },
          },
          { session: sessionOpt },
        );
      });
    } else {
      // Just mark as pending_settlement
      await MerchantLiability.updateMany(
        { merchant: new Types.ObjectId(merchantId), cycleId, status: 'active' },
        { $set: { status: 'pending_settlement' } },
      );
    }

    logger.info('Settlement cycle processed', { merchantId, cycleId, totalPending, records: liabilities.length });
    return { totalSettled: totalPending, recordsSettled: liabilities.length };
  }
}

export const liabilityService = new LiabilityService();
