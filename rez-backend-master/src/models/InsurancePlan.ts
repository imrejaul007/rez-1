import mongoose, { Document, Schema } from 'mongoose';

export type InsuranceType = 'health' | 'life' | 'vehicle' | 'travel' | 'home' | 'business';

export interface IInsurancePlan extends Document {
  name: string;
  provider: string;
  providerLogo: string;
  type: InsuranceType;
  coverage: string;
  premium: {
    monthly: number;
    annual: number;
    currency: string;
  };
  cashbackPercent: number;
  features: string[];
  rating: number;
  claimSettlementRatio: number;
  isActive: boolean;
  isFeatured: boolean;
  region: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const InsurancePlanSchema = new Schema<IInsurancePlan>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    providerLogo: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      required: true,
      enum: ['health', 'life', 'vehicle', 'travel', 'home', 'business'],
      index: true,
    },
    coverage: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    premium: {
      monthly: { type: Number, required: true, min: 0 },
      annual: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'INR', trim: true },
    },
    cashbackPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    features: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    claimSettlementRatio: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    region: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
InsurancePlanSchema.index({ type: 1, isActive: 1, region: 1, sortOrder: 1 });
InsurancePlanSchema.index({ isFeatured: 1, isActive: 1, sortOrder: 1 });

const InsurancePlan = mongoose.model<IInsurancePlan>('InsurancePlan', InsurancePlanSchema);

export default InsurancePlan;
