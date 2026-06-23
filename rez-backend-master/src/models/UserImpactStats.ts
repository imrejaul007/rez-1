import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserImpactStats extends Document {
  user: mongoose.Types.ObjectId;
  totalEventsRegistered: number;
  totalEventsCompleted: number;
  totalEventsAttended: number;
  totalEventsCancelled: number;
  // Impact metrics
  livesImpacted: number;
  treesPlanted: number;
  hoursContributed: number;
  mealsServed: number;
  studentsEducated: number;
  beachAreaCleaned: number; // in square meters
  bloodDonated: number; // number of times
  // Coins
  totalRezCoinsEarned: number;
  totalBrandCoinsEarned: number;
  // Sponsors interacted with
  sponsorsEngaged: mongoose.Types.ObjectId[];
  // Achievement tracking
  currentStreak: number;
  longestStreak: number;
  lastEventCompletedAt?: Date;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserImpactStatsModel extends Model<IUserImpactStats> {
  getOrCreateStats(userId: string): Promise<IUserImpactStats>;
  updateStatsOnCompletion(
    userId: string,
    eventType: string,
    impactMetric: string,
    impactValue: number,
    rezCoins: number,
    brandCoins: number,
    sponsorId?: string
  ): Promise<IUserImpactStats>;
}

const UserImpactStatsSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    totalEventsRegistered: {
      type: Number,
      default: 0,
      min: 0
    },
    totalEventsCompleted: {
      type: Number,
      default: 0,
      min: 0
    },
    totalEventsAttended: {
      type: Number,
      default: 0,
      min: 0
    },
    totalEventsCancelled: {
      type: Number,
      default: 0,
      min: 0
    },
    // Impact metrics
    livesImpacted: {
      type: Number,
      default: 0,
      min: 0
    },
    treesPlanted: {
      type: Number,
      default: 0,
      min: 0
    },
    hoursContributed: {
      type: Number,
      default: 0,
      min: 0
    },
    mealsServed: {
      type: Number,
      default: 0,
      min: 0
    },
    studentsEducated: {
      type: Number,
      default: 0,
      min: 0
    },
    beachAreaCleaned: {
      type: Number,
      default: 0,
      min: 0
    },
    bloodDonated: {
      type: Number,
      default: 0,
      min: 0
    },
    // Coins
    totalRezCoinsEarned: {
      type: Number,
      default: 0,
      min: 0
    },
    totalBrandCoinsEarned: {
      type: Number,
      default: 0,
      min: 0
    },
    // Sponsors
    sponsorsEngaged: [{
      type: Schema.Types.ObjectId,
      ref: 'Sponsor'
    }],
    // Achievement tracking
    currentStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    lastEventCompletedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes for leaderboard queries
UserImpactStatsSchema.index({ totalEventsCompleted: -1 });
UserImpactStatsSchema.index({ livesImpacted: -1 });
UserImpactStatsSchema.index({ treesPlanted: -1 });
UserImpactStatsSchema.index({ totalRezCoinsEarned: -1 });

// Static method to get or create user stats
UserImpactStatsSchema.statics.getOrCreateStats = async function(userId: string) {
  let stats = await this.findOne({ user: userId });
  if (!stats) {
    stats = await this.create({ user: userId });
  }
  return stats;
};

// Static method to update stats on event completion
UserImpactStatsSchema.statics.updateStatsOnCompletion = async function(
  userId: string,
  eventType: string,
  impactMetric: string,
  impactValue: number,
  rezCoins: number,
  brandCoins: number,
  sponsorId?: string
) {
  const stats = await (this as unknown as IUserImpactStatsModel).getOrCreateStats(userId);

  // Update event counts
  stats.totalEventsCompleted += 1;
  stats.totalEventsAttended += 1;

  // Update coins
  stats.totalRezCoinsEarned += rezCoins;
  stats.totalBrandCoinsEarned += brandCoins;

  // Update impact metric based on event type
  switch (impactMetric.toLowerCase()) {
    case 'lives':
    case 'lives_saved':
    case 'lives_impacted':
      stats.livesImpacted += impactValue;
      break;
    case 'trees':
    case 'trees_planted':
      stats.treesPlanted += impactValue;
      break;
    case 'hours':
    case 'hours_contributed':
      stats.hoursContributed += impactValue;
      break;
    case 'meals':
    case 'meals_served':
      stats.mealsServed += impactValue;
      break;
    case 'students':
    case 'students_educated':
      stats.studentsEducated += impactValue;
      break;
    case 'beach_area':
    case 'area_cleaned':
      stats.beachAreaCleaned += impactValue;
      break;
    case 'blood':
    case 'blood_donated':
      stats.bloodDonated += 1; // Each blood donation counts as 1
      break;
  }

  // Add sponsor if not already tracked
  if (sponsorId && !stats.sponsorsEngaged.includes(new mongoose.Types.ObjectId(sponsorId))) {
    stats.sponsorsEngaged.push(new mongoose.Types.ObjectId(sponsorId));
  }

  // Update streak
  const now = new Date();
  const lastCompletion = stats.lastEventCompletedAt;

  if (lastCompletion) {
    const daysDiff = Math.floor((now.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 30) { // Streak continues if within 30 days
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
  } else {
    stats.currentStreak = 1;
  }

  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }

  stats.lastEventCompletedAt = now;

  await stats.save();
  return stats;
};

export default mongoose.model<IUserImpactStats, IUserImpactStatsModel>('UserImpactStats', UserImpactStatsSchema);
