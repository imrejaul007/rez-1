import mongoose, { ClientSession, Types } from 'mongoose';
import { LedgerEntry, LedgerAccountType, LedgerDirection, LedgerOperationType, LedgerCoinType } from '../models/LedgerEntry';
import { createServiceLogger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createServiceLogger('ledger');

// Well-known platform account IDs (deterministic ObjectIds from fixed strings)
const PLATFORM_ACCOUNT_IDS = {
  platform_fees: new Types.ObjectId('000000000000000000000001'),
  platform_float: new Types.ObjectId('000000000000000000000002'),
  expired_pool: new Types.ObjectId('000000000000000000000003'),
};

export interface RecordEntryParams {
  debitAccount: { type: LedgerAccountType; id: Types.ObjectId };
  creditAccount: { type: LedgerAccountType; id: Types.ObjectId };
  amount: number;
  coinType?: LedgerCoinType;
  operationType: LedgerOperationType;
  referenceId: string;
  referenceModel: string;
  reversalReferenceId?: string;  // pairId of the original entry being reversed
  metadata?: {
    requestId?: string;
    idempotencyKey?: string;
    adminUserId?: string;
    description?: string;
    walletId?: string; // added during Phase 2H merge
  };
}

class LedgerService {
  /**
   * Record a double-entry ledger pair (debit + credit) within an optional session.
   * Returns the pairId linking both entries.
   */
  async recordEntry(params: RecordEntryParams, session?: ClientSession): Promise<string> {
    const { debitAccount, creditAccount, amount, coinType = 'nuqta', operationType, referenceId, referenceModel, reversalReferenceId, metadata } = params;

    if (amount <= 0) {
      throw new Error('Ledger entry amount must be positive');
    }

    const pairId = uuidv4();
    const now = new Date();

    // Get running balances for both accounts
    const [debitRunning, creditRunning] = await Promise.all([
      this.getAccountBalance(debitAccount.id, coinType),
      this.getAccountBalance(creditAccount.id, coinType),
    ]);

    const entries = [
      {
        pairId,
        accountType: debitAccount.type,
        accountId: debitAccount.id,
        direction: 'debit' as LedgerDirection,
        amount,
        coinType,
        runningBalance: debitRunning - amount,
        operationType,
        referenceId,
        referenceModel,
        ...(reversalReferenceId && { reversalReferenceId }),
        metadata: metadata || {},
        createdAt: now,
      },
      {
        pairId,
        accountType: creditAccount.type,
        accountId: creditAccount.id,
        direction: 'credit' as LedgerDirection,
        amount,
        coinType,
        runningBalance: creditRunning + amount,
        operationType,
        referenceId,
        referenceModel,
        ...(reversalReferenceId && { reversalReferenceId }),
        metadata: metadata || {},
        createdAt: now,
      }
    ];

    const insertOptions = session ? { session } : {};
    await LedgerEntry.insertMany(entries, insertOptions);

    logger.info('Ledger entry recorded', {
      pairId,
      operationType,
      amount,
      coinType,
      debitAccount: `${debitAccount.type}:${debitAccount.id}`,
      creditAccount: `${creditAccount.type}:${creditAccount.id}`,
      referenceId,
    });

    return pairId;
  }

  /**
   * Get the computed balance for an account by summing all ledger entries.
   * credits - debits = balance
   */
  async getAccountBalance(accountId: Types.ObjectId, coinType?: LedgerCoinType): Promise<number> {
    const matchStage: any = { accountId };
    if (coinType) matchStage.coinType = coinType;

    const result = await LedgerEntry.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalCredits: {
            $sum: { $cond: [{ $eq: ['$direction', 'credit'] }, '$amount', 0] }
          },
          totalDebits: {
            $sum: { $cond: [{ $eq: ['$direction', 'debit'] }, '$amount', 0] }
          }
        }
      }
    ]);

    if (result.length === 0) return 0;
    return result[0].totalCredits - result[0].totalDebits;
  }

  /**
   * Get paginated ledger history for an account
   */
  async getAccountHistory(
    accountId: Types.ObjectId,
    filters?: { coinType?: LedgerCoinType; operationType?: LedgerOperationType; direction?: LedgerDirection },
    pagination?: { page?: number; limit?: number }
  ) {
    const query: any = { accountId };
    if (filters?.coinType) query.coinType = filters.coinType;
    if (filters?.operationType) query.operationType = filters.operationType;
    if (filters?.direction) query.direction = filters.direction;

    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 20, 50);
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      LedgerEntry.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      LedgerEntry.countDocuments(query),
    ]);

    return {
      entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a ledger entry pair by pairId
   */
  async getEntryPair(pairId: string) {
    return LedgerEntry.find({ pairId }).lean();
  }

  /**
   * Get platform account ID for a given type
   */
  getPlatformAccountId(type: 'platform_fees' | 'platform_float' | 'expired_pool'): Types.ObjectId {
    return PLATFORM_ACCOUNT_IDS[type];
  }
}

export const ledgerService = new LedgerService();
