import mongoose, { Document, Schema } from 'mongoose';

interface ITierDetails {
  name: string;
  commissionRate: number;
  monthlyFee: number;
  maxProducts: number;
  maxStores: number;
  features: string[];
  analyticsAccess: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  apiAccess: boolean;
}

export interface IMerchantTierConfig extends Document {
  tiers: {
    free: ITierDetails;
    pro: ITierDetails;
    enterprise: ITierDetails;
  };
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const TierDetailsSchema = new Schema({
  name: { type: String, required: true },
  commissionRate: { type: Number, required: true, min: 0, max: 100 },
  monthlyFee: { type: Number, default: 0, min: 0 },
  maxProducts: { type: Number, default: 100 },
  maxStores: { type: Number, default: 1 },
  features: [{ type: String }],
  analyticsAccess: { type: Boolean, default: false },
  prioritySupport: { type: Boolean, default: false },
  customBranding: { type: Boolean, default: false },
  apiAccess: { type: Boolean, default: false },
}, { _id: false });

const MerchantTierConfigSchema = new Schema({
  tiers: {
    free: { type: TierDetailsSchema, required: true },
    pro: { type: TierDetailsSchema, required: true },
    enterprise: { type: TierDetailsSchema, required: true },
  },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

// Ensure singleton
MerchantTierConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      tiers: {
        free: {
          name: 'Free',
          commissionRate: 15,
          monthlyFee: 0,
          maxProducts: 50,
          maxStores: 1,
          features: ['basic_dashboard', 'order_management'],
          analyticsAccess: false,
          prioritySupport: false,
          customBranding: false,
          apiAccess: false,
        },
        pro: {
          name: 'Pro',
          commissionRate: 10,
          monthlyFee: 999,
          maxProducts: 500,
          maxStores: 3,
          features: ['basic_dashboard', 'order_management', 'analytics', 'offers', 'appointments'],
          analyticsAccess: true,
          prioritySupport: true,
          customBranding: false,
          apiAccess: false,
        },
        enterprise: {
          name: 'Enterprise',
          commissionRate: 7,
          monthlyFee: 4999,
          maxProducts: -1,
          maxStores: -1,
          features: ['basic_dashboard', 'order_management', 'analytics', 'offers', 'appointments', 'pos', 'api_access', 'custom_branding', 'white_label'],
          analyticsAccess: true,
          prioritySupport: true,
          customBranding: true,
          apiAccess: true,
        },
      },
    });
  }
  return config;
};

export default mongoose.model<IMerchantTierConfig>('MerchantTierConfig', MerchantTierConfigSchema);
