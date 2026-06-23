import mongoose, { Schema, Document } from 'mongoose';

export interface IFollowerAnalytics extends Document {
  store: mongoose.Types.ObjectId;
  date: Date;
  followersCount: number;
  newFollowers: number;
  unfollows: number;
  // Engagement metrics
  clicksFromFollowers: number;
  ordersFromFollowers: number;
  revenueFromFollowers: number;
  // Offer metrics
  exclusiveOffersViewed: number;
  exclusiveOffersRedeemed: number;
  // Additional analytics
  avgEngagementRate: number; // Percentage
  topFollowerLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FollowerAnalyticsSchema = new Schema<IFollowerAnalytics>({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  followersCount: {
    type: Number,
    default: 0,
    min: 0
  },
  newFollowers: {
    type: Number,
    default: 0,
    min: 0
  },
  unfollows: {
    type: Number,
    default: 0,
    min: 0
  },
  clicksFromFollowers: {
    type: Number,
    default: 0,
    min: 0
  },
  ordersFromFollowers: {
    type: Number,
    default: 0,
    min: 0
  },
  revenueFromFollowers: {
    type: Number,
    default: 0,
    min: 0
  },
  exclusiveOffersViewed: {
    type: Number,
    default: 0,
    min: 0
  },
  exclusiveOffersRedeemed: {
    type: Number,
    default: 0,
    min: 0
  },
  avgEngagementRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  topFollowerLocation: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries by store and date range
FollowerAnalyticsSchema.index({ store: 1, date: -1 });

// Unique constraint to prevent duplicate records
FollowerAnalyticsSchema.index({ store: 1, date: 1 }, { unique: true });

// Static method to get or create today's analytics
FollowerAnalyticsSchema.statics.getOrCreateToday = async function(storeId: mongoose.Types.ObjectId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let analytics = await this.findOne({ store: storeId, date: today });

  if (!analytics) {
    analytics = await this.create({
      store: storeId,
      date: today,
      followersCount: 0,
      newFollowers: 0,
      unfollows: 0,
      clicksFromFollowers: 0,
      ordersFromFollowers: 0,
      revenueFromFollowers: 0,
      exclusiveOffersViewed: 0,
      exclusiveOffersRedeemed: 0,
      avgEngagementRate: 0
    });
  }

  return analytics;
};

export const FollowerAnalytics = mongoose.model<IFollowerAnalytics>('FollowerAnalytics', FollowerAnalyticsSchema);
