import mongoose, { Document, Schema, Model } from 'mongoose';

// DoubleCashbackCampaign interface
export interface IDoubleCashbackCampaign extends Document {
  title: string;
  subtitle: string;
  description?: string;
  multiplier: number; // 2x, 3x, 5x etc.
  startTime: Date;
  endTime: Date;
  eligibleStores: mongoose.Types.ObjectId[];
  eligibleStoreNames: string[]; // Cached store names for display
  eligibleCategories?: string[];
  terms: string[];
  minOrderValue?: number;
  maxCashback?: number;
  backgroundColor: string;
  bannerImage?: string;
  icon?: string;
  isActive: boolean;
  priority: number;
  usageCount: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DoubleCashbackCampaignSchema = new Schema<IDoubleCashbackCampaign>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    subtitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    multiplier: {
      type: Number,
      required: true,
      min: 1.5,
      max: 10,
      default: 2,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
      index: true,
    },
    eligibleStores: [{
      type: Schema.Types.ObjectId,
      ref: 'Store',
    }],
    eligibleStoreNames: [{
      type: String,
      trim: true,
    }],
    eligibleCategories: [{
      type: String,
      trim: true,
    }],
    terms: [{
      type: String,
      trim: true,
    }],
    minOrderValue: {
      type: Number,
      min: 0,
    },
    maxCashback: {
      type: Number,
      min: 0,
    },
    backgroundColor: {
      type: String,
      default: '#FEF3C7',
    },
    bannerImage: {
      type: String,
    },
    icon: {
      type: String,
      default: 'flash',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active campaigns
DoubleCashbackCampaignSchema.index({ isActive: 1, startTime: 1, endTime: 1 });

// Virtual to check if campaign is currently running
DoubleCashbackCampaignSchema.virtual('isRunning').get(function () {
  const now = new Date();
  return this.isActive && this.startTime <= now && this.endTime >= now;
});

const DoubleCashbackCampaign = mongoose.model<IDoubleCashbackCampaign>(
  'DoubleCashbackCampaign',
  DoubleCashbackCampaignSchema
);

export default DoubleCashbackCampaign;
