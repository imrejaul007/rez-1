import { Schema, model, Document, Types } from 'mongoose';

/**
 * MerchantRewardJournal — append-only log of every reward decision.
 *
 * Immutable: records are never updated, only created.
 * Links: sessionId → TransactionAuditLog → LedgerEntry
 *
 * Answers: "Why did this customer receive (or not receive) a reward?"
 *
 * v3 Architecture: Required by Second CTO Review — every reward decision
 * must have a journal entry for dispute debugging and fraud analytics.
 */
export interface IMerchantRewardJournal extends Document {
  // Context
  sessionId: string; // POS bill ID / appointment ID (idempotency key)
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  userId: Types.ObjectId;
  eventType: 'payment' | 'visit' | 'appointment' | 'table_pay';
  transactionAmount: number;

  // Decision
  decision: {
    coinsIssued: number;
    coinType: string;
    stampAdded: boolean;
    stampCardId?: Types.ObjectId;
    tierUpgraded: boolean;
    newTier?: string;
    campaignFired?: string; // campaign name
    skippedReasons: string[]; // why certain rewards were skipped
    ruleTriggered?: string; // which campaign rule fired
  };

  // Balances (denormalised for dispute resolution without joins)
  balanceBefore: {
    rezCoins: number;
    promoCoins: number;
    stampCount?: number;
  };
  balanceAfter: {
    rezCoins: number;
    promoCoins: number;
    stampCount?: number;
  };

  // Audit trail links
  ledgerPairId?: string; // links to LedgerEntry.pairId
  auditLogId?: Types.ObjectId; // links to TransactionAuditLog

  createdAt: Date;
}

const schema = new Schema<IMerchantRewardJournal>(
  {
    sessionId: { type: String, required: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventType: { type: String, enum: ['payment', 'visit', 'appointment', 'table_pay'], required: true },
    transactionAmount: { type: Number, required: true },

    decision: {
      coinsIssued: { type: Number, default: 0 },
      coinType: { type: String, default: 'rez' },
      stampAdded: { type: Boolean, default: false },
      stampCardId: { type: Schema.Types.ObjectId },
      tierUpgraded: { type: Boolean, default: false },
      newTier: { type: String },
      campaignFired: { type: String },
      skippedReasons: [{ type: String }],
      ruleTriggered: { type: String },
    },

    balanceBefore: {
      rezCoins: { type: Number },
      promoCoins: { type: Number },
      stampCount: { type: Number },
    },
    balanceAfter: {
      rezCoins: { type: Number },
      promoCoins: { type: Number },
      stampCount: { type: Number },
    },

    ledgerPairId: { type: String },
    auditLogId: { type: Schema.Types.ObjectId },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // append-only — no updatedAt
  },
);

// ── Append-only guard: never allow updates ────────────────────────────────
schema.pre('save', function (next) {
  if (!this.isNew) {
    next(new Error('MerchantRewardJournal is append-only — records cannot be updated'));
  } else {
    next();
  }
});

// ── Indexes ──────────────────────────────────────────────────────────────
schema.index({ sessionId: 1 }, { unique: true }); // prevent duplicate rewards for same session
schema.index({ merchantId: 1, createdAt: -1 });
schema.index({ userId: 1, merchantId: 1, createdAt: -1 });

export const MerchantRewardJournal = model<IMerchantRewardJournal>('MerchantRewardJournal', schema);

export default MerchantRewardJournal;
