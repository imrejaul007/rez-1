import mongoose, { Schema, Document, Types } from 'mongoose';

export type MerchantLiabilityCampaignType =
  | 'branded_coin_award'
  | 'bonus_campaign'
  | 'deal_redemption'
  | 'creator_reward';

export type MerchantLiabilityStatus =
  | 'active'
  | 'pending_settlement'
  | 'settled'
  | 'disputed'
  | 'void';

export interface IMerchantLiability extends Document {
  merchant: Types.ObjectId;
  store: Types.ObjectId;
  campaign: Types.ObjectId | null;
  campaignType: MerchantLiabilityCampaignType;
  cycleId: string;
  rewardIssued: number;
  rewardRedeemed: number;
  pendingAmount: number;
  settledAmount: number;
  issuanceCount: number;
  redemptionCount: number;
  status: MerchantLiabilityStatus;
  settlementDate: Date | null;
  settlementTransactionId: string | null;
  settlementLedgerPairId: string | null;
  currency: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantLiabilitySchema = new Schema<IMerchantLiability>({
  merchant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  campaign: { type: Schema.Types.ObjectId, ref: 'BonusCampaign', default: null },
  campaignType: {
    type: String,
    required: true,
    enum: ['branded_coin_award', 'bonus_campaign', 'deal_redemption', 'creator_reward'],
  },
  cycleId: { type: String, required: true },
  rewardIssued: { type: Number, default: 0, min: 0 },
  rewardRedeemed: { type: Number, default: 0, min: 0 },
  pendingAmount: { type: Number, default: 0, min: 0 },
  settledAmount: { type: Number, default: 0, min: 0 },
  issuanceCount: { type: Number, default: 0, min: 0 },
  redemptionCount: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    required: true,
    enum: ['active', 'pending_settlement', 'settled', 'disputed', 'void'],
    default: 'active',
  },
  settlementDate: { type: Date, default: null },
  settlementTransactionId: { type: String, default: null },
  settlementLedgerPairId: { type: String, default: null },
  currency: { type: String, default: 'NC' },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
});

// One aggregate row per merchant+campaign+cycle
MerchantLiabilitySchema.index({ merchant: 1, cycleId: 1, campaign: 1 }, { unique: true });
// Settlement queries
MerchantLiabilitySchema.index({ merchant: 1, status: 1 });
// Per-store reporting
MerchantLiabilitySchema.index({ store: 1, cycleId: 1 });
// Settlement job batching
MerchantLiabilitySchema.index({ status: 1, cycleId: 1 });

export const MerchantLiability = mongoose.model<IMerchantLiability>('MerchantLiability', MerchantLiabilitySchema);
export default MerchantLiability;
