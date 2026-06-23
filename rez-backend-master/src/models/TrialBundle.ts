import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITrialBundle extends Document {
  name: string;
  description: string;
  slug: string;
  category?: string;
  bundleType: 'pass' | 'pack';
  price: number;
  originalPrice: number;
  trialCoinsIncluded: number;
  bonusRewardCoins: number;
  trialSlots: number;
  validityDays: number;
  eligibleCategories: string[];
  maxUsesPerMerchant: number;
  images: string[];
  isActive: boolean;
  featured: boolean;
  sortOrder: number;
  totalPurchases: number;
  createdAt: Date;
  updatedAt: Date;
}

const TrialBundleSchema = new Schema<ITrialBundle>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    category: {
      type: String,
      required: false,
      default: null,
      index: true
    },
    bundleType: {
      type: String,
      enum: ['pass', 'pack'],
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    trialCoinsIncluded: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    bonusRewardCoins: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    trialSlots: {
      type: Number,
      required: true,
      min: 1
    },
    validityDays: {
      type: Number,
      required: true,
      min: 1
    },
    eligibleCategories: {
      type: [String],
      default: []
    },
    maxUsesPerMerchant: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    images: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true
    },
    featured: {
      type: Boolean,
      required: true,
      default: false
    },
    sortOrder: {
      type: Number,
      required: true,
      default: 0
    },
    totalPurchases: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexes
TrialBundleSchema.index({ slug: 1 });
TrialBundleSchema.index({ isActive: 1 });
TrialBundleSchema.index({ category: 1 });
TrialBundleSchema.index({ featured: 1, sortOrder: 1 });

export const TrialBundle = mongoose.model<ITrialBundle>('TrialBundle', TrialBundleSchema);
