import { Schema, model, Document, Types } from 'mongoose';

/**
 * TierLevel — sub-document for loyalty tier definitions.
 */
export interface ITierLevel {
  name: string; // "Bronze", "Silver", "Gold", "Platinum"
  minCumulativeSpend: number; // ₹0, ₹2000, ₹8000, ₹20000
  coinMultiplier: number;
  perks: string[];
  color: string;
  icon: string;
}

/**
 * MerchantLoyaltyTier — defines merchant's loyalty program structure.
 * Supports multi-tier progression with coin multipliers and benefits.
 */
export interface IMerchantLoyaltyTier extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  programName: string;
  isActive: boolean;
  tiers: ITierLevel[];
  createdAt: Date;
  updatedAt: Date;
}

const TierLevelSchema = new Schema<ITierLevel>(
  {
    name: { type: String, required: true },
    minCumulativeSpend: { type: Number, required: true },
    coinMultiplier: { type: Number, required: true, default: 1.0, min: 0.1, max: 10 },
    perks: { type: [String], default: [] },
    color: { type: String, default: '#CD7F32' },
    icon: { type: String, default: '🥉' },
  },
  { _id: false },
);

const MerchantLoyaltyTierSchema = new Schema<IMerchantLoyaltyTier>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    programName: { type: String, required: true, default: 'Rewards Program' },
    isActive: { type: Boolean, default: true },
    tiers: [TierLevelSchema],
  },
  { timestamps: true },
);

MerchantLoyaltyTierSchema.index({ merchantId: 1, storeId: 1 }, { unique: true });

/**
 * Static helper method to return default 4-tier setup.
 */
MerchantLoyaltyTierSchema.statics.getDefaultTiers = function (): ITierLevel[] {
  return [
    {
      name: 'Bronze',
      minCumulativeSpend: 0,
      coinMultiplier: 1.0,
      perks: ['Basic rewards'],
      color: '#CD7F32',
      icon: '🥉',
    },
    {
      name: 'Silver',
      minCumulativeSpend: 2000,
      coinMultiplier: 1.25,
      perks: ['1.25x coin multiplier', 'Birthday bonus'],
      color: '#C0C0C0',
      icon: '🥈',
    },
    {
      name: 'Gold',
      minCumulativeSpend: 8000,
      coinMultiplier: 1.5,
      perks: ['1.5x coin multiplier', 'Priority support', 'Exclusive offers'],
      color: '#FFD700',
      icon: '🥇',
    },
    {
      name: 'Platinum',
      minCumulativeSpend: 20000,
      coinMultiplier: 2.0,
      perks: ['2x coin multiplier', 'VIP perks', 'Free delivery', 'Dedicated support'],
      color: '#E5E4E2',
      icon: '👑',
    },
  ];
};

export const MerchantLoyaltyTier = model<IMerchantLoyaltyTier>('MerchantLoyaltyTier', MerchantLoyaltyTierSchema);

export default MerchantLoyaltyTier;
