import { Schema, model, Document, Types } from 'mongoose';

/**
 * MerchantFeatureFlag — per-merchant feature flag override.
 *
 * Layered on top of global FeatureFlag — merchant flag takes precedence.
 *
 * Priority (highest to lowest):
 *   1. MerchantFeatureFlag (per-merchant override)    ← this model
 *   2. FeatureFlag.allowedUserIds (beta users)
 *   3. FeatureFlag.rolloutPercentage (gradual rollout)
 *   4. FeatureFlag.enabled (global on/off)
 *
 * v3 Architecture: Enables safe feature rollout per merchant — beta access,
 * enterprise plan features, emergency rollbacks — without affecting others.
 */
export interface IMerchantFeatureFlag extends Document {
  merchantId: Types.ObjectId;
  flagKey: string;
  enabled: boolean; // overrides global flag for this merchant
  overrideReason: string; // 'beta merchant', 'enterprise plan', 'rollback'
  expiresAt?: Date; // auto-revert to global flag after date (null = permanent)
  setBy: string; // admin user ID or name who set this override
  createdAt: Date;
  updatedAt: Date;
}

const MerchantFeatureFlagSchema = new Schema<IMerchantFeatureFlag>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    flagKey: { type: String, required: true, trim: true },
    enabled: { type: Boolean, required: true },
    overrideReason: { type: String, required: true, trim: true },
    expiresAt: { type: Date, default: null },
    setBy: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

// One override per merchant per flag
MerchantFeatureFlagSchema.index({ merchantId: 1, flagKey: 1 }, { unique: true });
// For admin "show all overrides for a flag"
MerchantFeatureFlagSchema.index({ flagKey: 1 });
// For cleanup job — find expired overrides
MerchantFeatureFlagSchema.index({ expiresAt: 1 }, { sparse: true });

export const MerchantFeatureFlag = model<IMerchantFeatureFlag>('MerchantFeatureFlag', MerchantFeatureFlagSchema);

export default MerchantFeatureFlag;
