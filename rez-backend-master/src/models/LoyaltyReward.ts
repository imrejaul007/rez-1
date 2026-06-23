import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILoyaltyReward extends Document {
  customerPhone: string;
  // M6: ObjectId ref alongside phone for proper relational queries — use userId going forward
  userId?: Types.ObjectId;
  storeSlug: string;
  // M6: ObjectId ref alongside slug for proper relational queries — use merchantId going forward
  merchantId?: Types.ObjectId;
  rewardCode: string;
  description: string;
  issuedAt: Date;
  expiresAt: Date;
  redeemedAt?: Date;
  isRedeemed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyRewardSchema = new Schema<ILoyaltyReward>(
  {
    customerPhone: { type: String, required: true, index: true },
    // M6: ObjectId ref for User — populated alongside customerPhone for backwards compat
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    storeSlug: { type: String, required: true, index: true },
    // M6: ObjectId ref for Merchant — populated alongside storeSlug for backwards compat
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', index: true },
    rewardCode: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, required: true },
    issuedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    redeemedAt: { type: Date },
    isRedeemed: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// Compound index: look up active reward for a customer at a store (legacy phone/slug path)
LoyaltyRewardSchema.index(
  { customerPhone: 1, storeSlug: 1, isRedeemed: 1, expiresAt: 1 },
  { name: 'loyalty_active_reward_idx' },
);

// M6: ObjectId-based compound index for efficient relational lookups
LoyaltyRewardSchema.index(
  { userId: 1, merchantId: 1, isRedeemed: 1, expiresAt: 1 },
  { name: 'loyalty_active_reward_objectid_idx', sparse: true },
);

export const LoyaltyReward = mongoose.model<ILoyaltyReward>('LoyaltyReward', LoyaltyRewardSchema);
