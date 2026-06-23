import mongoose, { Schema, Document, Types } from 'mongoose';

export type LedgerAccountType = 'user_wallet' | 'platform_fees' | 'platform_float' | 'merchant_wallet' | 'expired_pool';
export type LedgerDirection = 'debit' | 'credit';
export type LedgerOperationType =
  | 'transfer' | 'gift' | 'topup' | 'withdrawal' | 'payment'
  | 'refund' | 'cashback' | 'loyalty_credit' | 'admin_adjustment'
  | 'expiry' | 'gift_card_purchase' | 'scratch_card_prize' | 'correction'
  | 'order_payment' | 'order_coin_deduction' | 'merchant_payout' | 'order_refund'
  | 'subscription_payment' | 'subscription_refund'
  | 'game_prize' | 'achievement_reward' | 'referral_bonus' | 'bonus_campaign'
  | 'daily_login' | 'review_reward' | 'tournament_prize' | 'learning_reward'
  | 'lock_fee' | 'lock_fee_refund' | 'social_impact' | 'creator_reward'
  | 'coin_expiry' | 'store_payment_reward' | 'travel_cashback' | 'mall_affiliate'
  | 'voucher_cashback' | 'offer_cashback' | 'cashback_reversal'
  | 'gift_refund'
  | 'merchant_liability_issuance'
  | 'merchant_liability_settlement';
export type LedgerCoinType = 'nuqta' | 'rez' | 'promo' | 'branded';

export interface ILedgerEntry extends Document {
  pairId: string;
  accountType: LedgerAccountType;
  accountId: Types.ObjectId;
  direction: LedgerDirection;
  amount: number;
  coinType: LedgerCoinType;
  runningBalance: number;
  operationType: LedgerOperationType;
  referenceId: string;
  referenceModel: string;
  reversalReferenceId?: string;  // pairId of the original ledger entry being reversed
  metadata: {
    requestId?: string;
    idempotencyKey?: string;
    adminUserId?: string;
    description?: string;
  };
  yearMonth: string; // e.g. "2026-03" — partition-like bucketing for efficient range queries
  createdAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>({
  pairId: { type: String, required: true, index: true },
  accountType: {
    type: String, required: true,
    enum: ['user_wallet', 'platform_fees', 'platform_float', 'merchant_wallet', 'expired_pool']
  },
  accountId: { type: Schema.Types.ObjectId, required: true, index: true },
  direction: { type: String, required: true, enum: ['debit', 'credit'] },
  amount: { type: Number, required: true, min: 0 },
  coinType: { type: String, required: true, enum: ['nuqta', 'promo', 'branded'], default: 'nuqta' },
  runningBalance: { type: Number, required: true },
  operationType: {
    type: String, required: true,
    enum: ['transfer', 'gift', 'topup', 'withdrawal', 'payment', 'refund', 'cashback', 'loyalty_credit', 'admin_adjustment', 'expiry', 'gift_card_purchase', 'scratch_card_prize', 'correction', 'order_payment', 'order_coin_deduction', 'merchant_payout', 'order_refund', 'subscription_payment', 'subscription_refund', 'game_prize', 'achievement_reward', 'referral_bonus', 'bonus_campaign', 'daily_login', 'review_reward', 'tournament_prize', 'learning_reward', 'lock_fee', 'lock_fee_refund', 'social_impact', 'creator_reward', 'coin_expiry', 'store_payment_reward', 'travel_cashback', 'mall_affiliate', 'voucher_cashback', 'offer_cashback', 'cashback_reversal', 'gift_refund', 'merchant_liability_issuance', 'merchant_liability_settlement']
  },
  referenceId: { type: String, required: true },
  referenceModel: { type: String, required: true },
  reversalReferenceId: { type: String, default: null },
  metadata: {
    requestId: String,
    idempotencyKey: String,
    adminUserId: String,
    description: String,
  },
  yearMonth: { type: String, index: true },
}, {
  timestamps: { createdAt: true, updatedAt: false } // Immutable — no updates
});

// Pre-save: auto-compute yearMonth from createdAt
LedgerEntrySchema.pre('save', function (next) {
  if (this.isNew && !this.yearMonth) {
    const d = this.createdAt || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    this.yearMonth = `${y}-${m}`;
  }
  next();
});

// Indexes for reconciliation and querying
LedgerEntrySchema.index({ accountId: 1, createdAt: -1 });
LedgerEntrySchema.index({ accountType: 1, operationType: 1 });
LedgerEntrySchema.index({ referenceId: 1, referenceModel: 1 });
LedgerEntrySchema.index({ accountId: 1, coinType: 1, createdAt: -1 });
LedgerEntrySchema.index({ pairId: 1, direction: 1 }, { unique: true }); // Each pair has exactly 1 debit + 1 credit
LedgerEntrySchema.index({ reversalReferenceId: 1 }, { sparse: true }); // Reversal chain lookups
LedgerEntrySchema.index({ yearMonth: 1, accountType: 1 }); // Month-based partition queries

export const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
