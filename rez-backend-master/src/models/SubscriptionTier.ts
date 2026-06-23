import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionTier extends Document {
  tier: 'free' | 'premium' | 'vip';
  name: string;
  pricing: {
    monthly: number;
    yearly: number;
    yearlyDiscount: number;
  };
  benefits: {
    cashbackMultiplier: number;
    // Legacy numeric fields (kept for backward compat)
    freeDeliveries: number;
    maxWishlists: number;
    // Boolean benefit flags (aligned with ISubscriptionBenefits)
    freeDelivery: boolean;
    prioritySupport: boolean;
    exclusiveDeals: boolean;
    earlyAccess: boolean;
    unlimitedWishlists: boolean;
    earlyFlashSaleAccess: boolean;
    personalShopper: boolean;
    premiumEvents: boolean;
    conciergeService: boolean;
    birthdayOffer: boolean;
    anniversaryOffer: boolean;
  };
  description: string;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  trialDays: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionTierSchema = new Schema<ISubscriptionTier>(
  {
    tier: {
      type: String,
      required: true,
      unique: true,
      enum: ['free', 'premium', 'vip'],
      index: true
    },
    name: {
      type: String,
      required: true
    },
    pricing: {
      monthly: {
        type: Number,
        required: true,
        min: 0
      },
      yearly: {
        type: Number,
        required: true,
        min: 0
      },
      yearlyDiscount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    benefits: {
      cashbackMultiplier: {
        type: Number,
        required: true,
        default: 1,
        min: 1
      },
      freeDeliveries: {
        type: Number,
        required: true,
        default: 0
        // No min constraint - use -1 for unlimited
      },
      maxWishlists: {
        type: Number,
        required: true,
        default: 5
        // No min constraint - use -1 for unlimited
      },
      prioritySupport: {
        type: Boolean,
        default: false
      },
      exclusiveDeals: {
        type: Boolean,
        default: false
      },
      earlyAccess: {
        type: Boolean,
        default: false
      },
      freeDelivery: {
        type: Boolean,
        default: false
      },
      unlimitedWishlists: {
        type: Boolean,
        default: false
      },
      earlyFlashSaleAccess: {
        type: Boolean,
        default: false
      },
      personalShopper: {
        type: Boolean,
        default: false
      },
      premiumEvents: {
        type: Boolean,
        default: false
      },
      conciergeService: {
        type: Boolean,
        default: false
      },
      birthdayOffer: {
        type: Boolean,
        default: false
      },
      anniversaryOffer: {
        type: Boolean,
        default: false
      }
    },
    description: {
      type: String,
      required: true
    },
    features: [
      {
        type: String,
        required: true
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    trialDays: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
SubscriptionTierSchema.index({ isActive: 1, sortOrder: 1 });

export const SubscriptionTier = mongoose.model<ISubscriptionTier>('SubscriptionTier', SubscriptionTierSchema);
