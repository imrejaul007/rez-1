import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITrialOffer extends Document {
  merchantId: Types.ObjectId;
  title: string;
  category: 'service' | 'sample_pickup' | 'experience' | 'd2c_kit';
  coinPrice: number;
  commitmentFee: 9 | 19 | 29;
  originalPrice: number;
  slotConfig: {
    dailySlots: number;
    qrWindowMinutes: number;
    windowType: 'relative' | 'fixed' | 'auto';
  };
  rewardConfig: {
    rezCoins: number;
    brandedCoins: number;
    brandedCoinLabel?: string;
  };
  upsellLinks: Array<{ title: string; url: string }>;
  images: string[];
  terms: string;
  status: 'pending_approval' | 'active' | 'paused' | 'rejected' | 'suspended';
  featuredUntil?: Date;
  campaignBoost: number;
  freshnessBoostedUntil: Date;
  totalBookings: number;
  totalCompletions: number;
  avgRating: number;
  createdAt: Date;
  updatedAt: Date;
}

const TrialOfferSchema = new Schema<ITrialOffer>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    category: {
      type: String,
      enum: ['service', 'sample_pickup', 'experience', 'd2c_kit'],
      required: true,
    },
    coinPrice: {
      type: Number,
      required: true,
      min: 10,
      max: 200,
    },
    commitmentFee: {
      type: Number,
      enum: [9, 19, 29],
      required: true,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    slotConfig: {
      dailySlots: {
        type: Number,
        required: true,
        min: 1,
      },
      qrWindowMinutes: {
        type: Number,
        required: true,
        min: 5,
      },
      windowType: {
        type: String,
        enum: ['relative', 'fixed', 'auto'],
        required: true,
      },
    },
    rewardConfig: {
      rezCoins: {
        type: Number,
        required: true,
        min: 0,
      },
      brandedCoins: {
        type: Number,
        required: true,
        min: 0,
      },
      brandedCoinLabel: {
        type: String,
        trim: true,
      },
    },
    upsellLinks: [
      {
        title: {
          type: String,
          trim: true,
        },
        url: {
          type: String,
          trim: true,
        },
      },
    ],
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    terms: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending_approval', 'active', 'paused', 'rejected', 'suspended'],
      default: 'pending_approval',
      index: true,
    },
    featuredUntil: Date,
    campaignBoost: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
    freshnessBoostedUntil: {
      type: Date,
      required: true,
    },
    totalBookings: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCompletions: {
      type: Number,
      default: 0,
      min: 0,
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
TrialOfferSchema.index({ category: 1 });
TrialOfferSchema.index({ status: 1, category: 1 });

export const TrialOffer = mongoose.model<ITrialOffer>('TrialOffer', TrialOfferSchema);
