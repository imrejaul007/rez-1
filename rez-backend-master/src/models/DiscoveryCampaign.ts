import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDiscoveryCampaign extends Document {
  title: string;
  subtitle: string;
  type: 'mission_sprint' | 'festival' | 'category_push';
  targetCategory?: string;
  targetCity?: string;
  targetTrialCount: number;
  rewardCoins: number;
  rewardTryCoins: number;
  bonusBadge?: string;
  bannerImage?: string;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  participantCount: number;
  completionCount: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DiscoveryCampaignSchema = new Schema<IDiscoveryCampaign>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    subtitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    type: {
      type: String,
      enum: ['mission_sprint', 'festival', 'category_push'],
      required: true
    },
    targetCategory: {
      type: String,
      required: false,
      default: null
    },
    targetCity: {
      type: String,
      required: false,
      default: null
    },
    targetTrialCount: {
      type: Number,
      required: true,
      min: 1
    },
    rewardCoins: {
      type: Number,
      required: true,
      min: 0
    },
    rewardTryCoins: {
      type: Number,
      required: true,
      min: 0
    },
    bonusBadge: {
      type: String,
      required: false,
      default: null
    },
    bannerImage: {
      type: String,
      required: false,
      default: null
    },
    startsAt: {
      type: Date,
      required: true
    },
    endsAt: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true
    },
    participantCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    completionCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
DiscoveryCampaignSchema.index({ isActive: 1 });
DiscoveryCampaignSchema.index({ targetCity: 1 });
DiscoveryCampaignSchema.index({ endsAt: 1 });

export const DiscoveryCampaign = mongoose.model<IDiscoveryCampaign>(
  'DiscoveryCampaign',
  DiscoveryCampaignSchema
);
