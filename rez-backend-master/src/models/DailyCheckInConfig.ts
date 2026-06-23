import mongoose, { Schema, Document } from 'mongoose';

/**
 * DailyCheckInConfig Model
 *
 * Stores admin-configurable settings for the daily check-in system.
 * Only one active config document should exist (singleton pattern).
 */
export interface IDailyCheckInConfig extends Document {
  /** 7-day cycle reward values (index 0 = Day 1, index 6 = Day 7) */
  dayRewards: number[];

  /** Milestone rewards: { day, coins, badge? } */
  milestoneRewards: Array<{
    day: number;
    coins: number;
    badge?: string;
  }>;

  /** Pro tips shown on the daily check-in page */
  proTips: string[];

  /** Affiliate info tip text */
  affiliateTip: string;

  /** Expected review timeframe text */
  reviewTimeframe: string;

  /** Whether the daily check-in feature is enabled */
  isEnabled: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const DailyCheckInConfigSchema = new Schema<IDailyCheckInConfig>({
  dayRewards: {
    type: [Number],
    default: [10, 15, 20, 25, 30, 40, 100],
    validate: {
      validator: (v: number[]) => v.length === 7 && v.every(n => n > 0),
      message: 'dayRewards must be an array of 7 positive numbers',
    },
  },
  milestoneRewards: {
    type: [{
      day: { type: Number, required: true },
      coins: { type: Number, required: true },
      badge: { type: String },
    }],
    default: [
      { day: 7, coins: 200 },
      { day: 30, coins: 2000 },
      { day: 100, coins: 10000 },
    ],
  },
  proTips: {
    type: [String],
    default: [
      'Check in at the same time daily to build a habit',
      'Share posters daily to maximize your affiliate earnings',
      'Track your affiliate performance to see which posters work best',
      'Missing even one day resets your streak to zero',
    ],
  },
  affiliateTip: {
    type: String,
    default: 'Share posters → Friends download the app → Earn 100 coins/download + 5% commission on their first 3 purchases!',
  },
  reviewTimeframe: {
    type: String,
    default: 'within 24 hours',
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

/**
 * Get the active config (creates default if none exists)
 */
DailyCheckInConfigSchema.statics.getActiveConfig = async function(): Promise<IDailyCheckInConfig> {
  let config = await this.findOne().sort({ updatedAt: -1 });
  if (!config) {
    config = await this.create({});
  }
  return config;
};

export interface IDailyCheckInConfigModel extends mongoose.Model<IDailyCheckInConfig> {
  getActiveConfig(): Promise<IDailyCheckInConfig>;
}

const DailyCheckInConfig = mongoose.model<IDailyCheckInConfig, IDailyCheckInConfigModel>(
  'DailyCheckInConfig',
  DailyCheckInConfigSchema
);

export default DailyCheckInConfig;
