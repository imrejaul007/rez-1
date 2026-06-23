import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAdCampaign extends Document {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  title: string;
  headline: string;
  description: string;
  ctaText: string;
  ctaUrl?: string;
  imageUrl: string;
  placement: 'home_banner' | 'explore_feed' | 'store_listing' | 'search_result';
  // Targeting
  targetSegment: 'all' | 'new' | 'loyal' | 'lapsed' | 'nearby';
  targetLocation?: {
    city?: string;
    radiusKm?: number;
  };
  targetInterests?: string[];
  // Budget
  bidType: 'CPC' | 'CPM';
  bidAmount: number;
  dailyBudget: number;
  totalBudget: number;
  totalSpent: number;
  // Schedule
  startDate: Date;
  endDate?: Date;
  // Status
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'rejected' | 'completed';
  rejectionReason?: string;
  // Metrics
  impressions: number;
  clicks: number;
  ctr: number; // virtual
  // Admin
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdCampaignSchema = new Schema<IAdCampaign>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    headline: {
      type: String,
      required: true,
      trim: true,
      maxlength: 90,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    ctaText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    ctaUrl: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    placement: {
      type: String,
      enum: ['home_banner', 'explore_feed', 'store_listing', 'search_result'],
      required: true,
      index: true,
    },
    targetSegment: {
      type: String,
      enum: ['all', 'new', 'loyal', 'lapsed', 'nearby'],
      default: 'all',
    },
    targetLocation: {
      city: { type: String, trim: true },
      radiusKm: { type: Number, min: 0 },
    },
    targetInterests: [{ type: String, trim: true }],
    bidType: {
      type: String,
      enum: ['CPC', 'CPM'],
      required: true,
    },
    bidAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    dailyBudget: {
      type: Number,
      required: true,
      min: 0,
    },
    totalBudget: {
      type: Number,
      required: true,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'active', 'paused', 'rejected', 'completed'],
      default: 'draft',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    impressions: {
      type: Number,
      default: 0,
      min: 0,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes
AdCampaignSchema.index({ startDate: 1, endDate: 1 });
AdCampaignSchema.index({ merchantId: 1, status: 1 });
AdCampaignSchema.index({ status: 1, placement: 1, startDate: 1, endDate: 1 });

// BAK-MKT-012 FIX: Round CTR to 4 decimal places to avoid floating-point artifacts
AdCampaignSchema.virtual('ctr').get(function () {
  if (!this.impressions || this.impressions === 0) return 0;
  return Math.round((this.clicks / this.impressions) * 10000) / 100;
});

const AdCampaign = mongoose.model<IAdCampaign>('AdCampaign', AdCampaignSchema);

export default AdCampaign;
