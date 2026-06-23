import { Schema, model, Document, Types } from 'mongoose';

/**
 * MerchantLoyaltyConfig — per-store points-earn configuration for salon loyalty.
 *
 * CANONICAL SOURCE OF TRUTH for this schema.
 * Mirror: rez-merchant-service/src/models/MerchantLoyaltyConfig.ts (must stay in sync)
 * Shared type: @rez/shared — MerchantLoyaltyConfig (packages/rez-shared/src/types/merchant.types.ts)
 *
 * pointsPerRupee: how many points a customer earns per ₹1 spent (default 0.1 = 1 pt per ₹10)
 * expiryDays: how long points remain valid after being earned (default 365)
 * bonusCategories: service category slugs that earn 2x points
 */
export interface IMerchantLoyaltyConfig extends Document {
  storeId: Types.ObjectId;
  merchantId: Types.ObjectId;
  pointsPerRupee: number;
  expiryDays: number;
  bonusCategories: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantLoyaltyConfigSchema = new Schema<IMerchantLoyaltyConfig>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    pointsPerRupee: { type: Number, required: true, min: 0, default: 0.1 },
    expiryDays: { type: Number, required: true, min: 1, default: 365 },
    bonusCategories: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

MerchantLoyaltyConfigSchema.index({ storeId: 1 }, { unique: true });

export const MerchantLoyaltyConfig = model<IMerchantLoyaltyConfig>(
  'MerchantLoyaltyConfig',
  MerchantLoyaltyConfigSchema,
);

export default MerchantLoyaltyConfig;
