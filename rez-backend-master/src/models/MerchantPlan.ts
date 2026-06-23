import mongoose, { Schema, Document } from 'mongoose';

export type MerchantPlanTier = 'starter' | 'growth' | 'pro';

export interface IMerchantPlan extends Document {
  plan: MerchantPlanTier;
  monthlyPrice: number;
  maxProducts: number;
  maxStores: number;
  smsPerMonth: number;
  whatsappPerMonth: number;
  pushPerMonth: number;
  analyticsRetentionDays: number;
  isActive: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const MerchantPlanSchema = new Schema<IMerchantPlan>(
  {
    plan: {
      type: String,
      required: true,
      unique: true,
      enum: ['starter', 'growth', 'pro'],
      index: true,
    },
    monthlyPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    maxProducts: {
      type: Number,
      required: true,
      min: 1,
      default: 50,
    },
    maxStores: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    smsPerMonth: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    whatsappPerMonth: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    pushPerMonth: {
      type: Number,
      required: true,
      min: 0,
      default: 500,
    },
    analyticsRetentionDays: {
      type: Number,
      required: true,
      min: 1,
      default: 7,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Add indexes for query optimization
MerchantPlanSchema.index({ merchantId: 1 }, { unique: true });
MerchantPlanSchema.index({ planName: 1 });
MerchantPlanSchema.index({ status: 1, renewsAt: 1 });

/**
 * Seed defaults if the collection is empty.
 * Called once at application startup via ensureDefaults().
 */
MerchantPlanSchema.statics.ensureDefaults = async function () {
  const count = await this.countDocuments();
  if (count > 0) return;

  await this.insertMany([
    {
      plan: 'starter',
      monthlyPrice: 0,
      maxProducts: 50,
      maxStores: 1,
      smsPerMonth: 0,
      whatsappPerMonth: 0,
      pushPerMonth: 500,
      analyticsRetentionDays: 7,
    },
    {
      plan: 'growth',
      monthlyPrice: 1999,
      maxProducts: 500,
      maxStores: 3,
      smsPerMonth: 500,
      whatsappPerMonth: 200,
      pushPerMonth: 5000,
      analyticsRetentionDays: 30,
    },
    {
      plan: 'pro',
      monthlyPrice: 4999,
      maxProducts: 9999,
      maxStores: 10,
      smsPerMonth: 5000,
      whatsappPerMonth: 2000,
      pushPerMonth: 50000,
      analyticsRetentionDays: 90,
    },
  ]);
};

export interface IMerchantPlanModel extends mongoose.Model<IMerchantPlan> {
  ensureDefaults(): Promise<void>;
}

export const MerchantPlan = mongoose.model<IMerchantPlan, IMerchantPlanModel>('MerchantPlan', MerchantPlanSchema);
