import mongoose, { Document, Schema, Model } from 'mongoose';

// LoyaltyMilestone interface (User loyalty progress milestones)
export interface ILoyaltyMilestone extends Document {
  title: string;
  description: string;
  targetType: 'orders' | 'spend' | 'referrals' | 'reviews' | 'checkins' | 'purchases';
  targetValue: number;
  reward: string; // e.g., "Gold Member", "Free Delivery"
  rewardType: 'coins' | 'badge' | 'discount' | 'freebie' | 'tier_upgrade';
  rewardCoins?: number;
  rewardDiscount?: number; // Percentage
  icon: string; // Ionicon name
  color: string;
  badgeImage?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  order: number; // Display order
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyMilestoneSchema = new Schema<ILoyaltyMilestone>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    targetType: {
      type: String,
      required: true,
      enum: ['orders', 'spend', 'referrals', 'reviews', 'checkins', 'purchases'],
      index: true,
    },
    targetValue: {
      type: Number,
      required: true,
      min: 1,
    },
    reward: {
      type: String,
      required: true,
      trim: true,
    },
    rewardType: {
      type: String,
      required: true,
      enum: ['coins', 'badge', 'discount', 'freebie', 'tier_upgrade'],
    },
    rewardCoins: {
      type: Number,
      min: 0,
    },
    rewardDiscount: {
      type: Number,
      min: 0,
      max: 100,
    },
    icon: {
      type: String,
      required: true,
      default: 'trophy',
    },
    color: {
      type: String,
      required: true,
      default: '#F59E0B',
    },
    badgeImage: {
      type: String,
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const LoyaltyMilestone = mongoose.model<ILoyaltyMilestone>('LoyaltyMilestone', LoyaltyMilestoneSchema);

export default LoyaltyMilestone;
