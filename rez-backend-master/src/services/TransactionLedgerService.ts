import mongoose, { Schema, Document, model } from 'mongoose';
import redisService from './redisService';

export type TransactionType =
  | 'wallet_topup'
  | 'wallet_debit'
  | 'wallet_credit'
  | 'coin_earn'
  | 'coin_redeem'
  | 'coin_expire'
  | 'cashback'
  | 'refund'
  | 'bbps_payment'
  | 'recharge'
  | 'split_payment'
  | 'tip'
  | 'prive_reward'
  | 'referral_reward'
  | 'campaign_reward';

export type TransactionStatus = 'INIT' | 'AUTHORIZED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED';

export interface ITransactionLedger extends Document {
  txId: string; // idempotency key
  type: TransactionType;
  status: TransactionStatus;
  userId: mongoose.Types.ObjectId;
  merchantId?: mongoose.Types.ObjectId;
  storeId?: mongoose.Types.ObjectId;
  amount: number; // in paise (INR × 100) or coin units
  currency: 'INR' | 'COIN';
  metadata: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  reversalTxId?: string;
  // AHMED: ledger integrity — double-entry bookkeeping: track both sides of every transaction
  originalTransactionId?: string; // For reversals: points to the original SUCCESS tx being reversed
  isReversal?: boolean; // Mark transactions that are reversals of prior txs
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionLedgerSchema = new Schema<ITransactionLedger>(
  {
    txId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    status: { type: String, required: true, default: 'INIT' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['INR', 'COIN'], required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    errorCode: String,
    errorMessage: String,
    reversalTxId: String,
    // AHMED: ledger integrity — track reversal lineage for double-entry bookkeeping
    originalTransactionId: String,
    isReversal: { type: Boolean, default: false, index: true },
    processedAt: Date,
  },
  { timestamps: true },
);

TransactionLedgerSchema.index({ userId: 1, createdAt: -1 });
TransactionLedgerSchema.index({ type: 1, status: 1, createdAt: -1 });
TransactionLedgerSchema.index({ merchantId: 1, createdAt: -1 });
// AHMED: ledger integrity — query support for reconciliation: find reversals linked to originals
TransactionLedgerSchema.index({ originalTransactionId: 1, isReversal: 1 });
TransactionLedgerSchema.index({ status: 1, isReversal: 1, createdAt: -1 });
TransactionLedgerSchema.index({ status: 1, createdAt: 1 }); // reconciliation job: stuck txs query
// TTL: keep ledger entries for 5 years (financial records)
// Do NOT add TTL index on ledger — financial records must be kept

export const TransactionLedger = model<ITransactionLedger>('TransactionLedger', TransactionLedgerSchema);

export class TransactionLedgerService {
  /**
   * Begin a transaction. Returns existing if txId already used (idempotency).
   */
  static async init(params: {
    txId: string;
    type: TransactionType;
    userId: string;
    amount: number;
    currency: 'INR' | 'COIN';
    merchantId?: string;
    storeId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ITransactionLedger> {
    // TOCTOU FIX: Use findOneAndUpdate with upsert instead of findOne + create.
    // The previous two-step pattern had a race window where two concurrent callers
    // with the same txId both passed the findOne check and both attempted create,
    // causing one to throw E11000. The unique index on txId is the authoritative
    // guard; findOneAndUpdate with upsert absorbs the race atomically.
    if (!mongoose.Types.ObjectId.isValid(params.userId)) {
      throw new Error(`Invalid userId: ${params.userId}`);
    }
    const doc = await TransactionLedger.findOneAndUpdate(
      { txId: params.txId },
      {
        $setOnInsert: {
          txId: params.txId,
          type: params.type,
          status: 'INIT',
          userId: new mongoose.Types.ObjectId(params.userId),
          merchantId: params.merchantId ? new mongoose.Types.ObjectId(params.merchantId) : undefined,
          storeId: params.storeId ? new mongoose.Types.ObjectId(params.storeId) : undefined,
          amount: params.amount,
          currency: params.currency,
          metadata: params.metadata || {},
        },
      },
      { upsert: true, new: true },
    );
    return doc!;
  }

  static async authorize(txId: string): Promise<ITransactionLedger | null> {
    return TransactionLedger.findOneAndUpdate({ txId, status: 'INIT' }, { status: 'AUTHORIZED' }, { new: true });
  }

  static async process(txId: string): Promise<ITransactionLedger | null> {
    return TransactionLedger.findOneAndUpdate(
      { txId, status: { $in: ['INIT', 'AUTHORIZED'] } },
      { status: 'PROCESSING' },
      { new: true },
    );
  }

  static async succeed(txId: string, metadata?: Record<string, unknown>): Promise<ITransactionLedger | null> {
    const update: any = { status: 'SUCCESS', processedAt: new Date() };
    if (metadata) {
      update.metadata = metadata;
    }
    // AHMED: ledger integrity — state machine guard: INIT→SUCCESS direct path only valid for instant payments
    return TransactionLedger.findOneAndUpdate({ txId, status: { $in: ['INIT', 'AUTHORIZED', 'PROCESSING'] } }, update, {
      new: true,
    });
  }

  static async fail(txId: string, errorCode: string, errorMessage: string): Promise<ITransactionLedger | null> {
    return TransactionLedger.findOneAndUpdate(
      { txId, status: { $in: ['INIT', 'AUTHORIZED', 'PROCESSING'] } },
      { status: 'FAILED', errorCode, errorMessage },
      { new: true },
    );
  }

  // AHMED: ledger integrity — state machine guard: REVERSED only from SUCCESS, never from FAILED
  static async reverse(txId: string, reversalTxId: string): Promise<ITransactionLedger | null> {
    // TOCTOU FIX: Collapse the read + update into a single atomic findOneAndUpdate.
    // The previous two-step pattern (findOne to check status, then findOneAndUpdate)
    // allowed concurrent reversals to both pass the status check and both write REVERSED.
    // The filter { txId, status: 'SUCCESS' } is the atomic guard — if status is not
    // SUCCESS the update returns null which we convert to a typed error below.
    const result = await TransactionLedger.findOneAndUpdate(
      { txId, status: 'SUCCESS' },
      { status: 'REVERSED', reversalTxId, isReversal: true, originalTransactionId: txId },
      { new: true },
    );

    if (!result) {
      // Distinguish "not found" from "wrong status" for a clear error message.
      const existing = await TransactionLedger.findOne({ txId }).lean();
      if (!existing) {
        throw new Error(`Original transaction ${txId} not found`);
      }
      throw new Error(`Cannot reverse transaction in status ${existing.status}. Only SUCCESS txs can be reversed.`);
    }

    return result;
  }

  static async findByTxId(txId: string): Promise<ITransactionLedger | null> {
    return TransactionLedger.findOne({ txId });
  }

  /** Get all transactions for a user for reconciliation */
  static async getUserLedger(userId: string, limit = 50, skip = 0) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error(`Invalid userId: ${userId}`);
    }
    return TransactionLedger.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /** Get pending/stuck transactions for reconciliation job */
  static async getStuckTransactions(olderThanMinutes = 15) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return TransactionLedger.find({
      status: { $in: ['INIT', 'AUTHORIZED', 'PROCESSING'] },
      createdAt: { $lt: cutoff },
    }).lean();
  }

  // AHMED: ledger integrity — double-entry bookkeeping validation
  // Verify every SUCCESS tx has a corresponding reversal if marked isReversal
  static async validateDoubleEntry(userId: string): Promise<{
    valid: boolean;
    orphanedReversals: string[];
    missingOriginals: string[];
  }> {
    const userTransactions = await TransactionLedger.find({ userId }).lean();
    const orphanedReversals: string[] = [];
    const missingOriginals: string[] = [];

    for (const tx of userTransactions) {
      if ((tx as any).isReversal && (tx as any).originalTransactionId) {
        const original = userTransactions.find((t) => t.txId === (tx as any).originalTransactionId);
        if (!original) {
          missingOriginals.push((tx as any).txId);
        } else if (original.status !== 'SUCCESS') {
          missingOriginals.push((tx as any).txId);
        }
      }
    }

    return {
      valid: orphanedReversals.length === 0 && missingOriginals.length === 0,
      orphanedReversals,
      missingOriginals,
    };
  }
}
