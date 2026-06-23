/**
 * DailyCheckIn Model
 *
 * Tracks user daily check-ins and streaks for Privé
 */

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface IDailyCheckIn extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: Date; // Date only (no time), stored as start of day UTC
  streak: number; // Current streak at time of check-in
  coinsEarned: number; // Base coins earned
  bonusEarned: number; // Streak bonus earned
  totalEarned: number; // coinsEarned + bonusEarned
  coinType: 'rez' | 'prive';
  createdAt: Date;
}

export interface IDailyCheckInModel extends Model<IDailyCheckIn> {
  getLastCheckIn(userId: Types.ObjectId): Promise<IDailyCheckIn | null>;
  hasCheckedInToday(userId: Types.ObjectId): Promise<boolean>;
  getCurrentStreak(userId: Types.ObjectId): Promise<number>;
  getCheckInHistory(userId: Types.ObjectId, days?: number): Promise<IDailyCheckIn[]>;
  getWeeklyEarnings(userId: Types.ObjectId): Promise<number>;
}

const DailyCheckInSchema = new Schema<IDailyCheckIn>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Check-in date is required'],
      index: true,
    },
    streak: {
      type: Number,
      required: true,
      min: [1, 'Streak must be at least 1'],
      default: 1,
    },
    coinsEarned: {
      type: Number,
      required: true,
      min: [0, 'Coins earned cannot be negative'],
      default: 10,
    },
    bonusEarned: {
      type: Number,
      required: true,
      min: [0, 'Bonus earned cannot be negative'],
      default: 0,
    },
    totalEarned: {
      type: Number,
      required: true,
      min: [0, 'Total earned cannot be negative'],
    },
    coinType: {
      type: String,
      enum: ['rez', 'prive'],
      default: 'rez',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
DailyCheckInSchema.index({ userId: 1, date: -1 });
// Unique constraint: one check-in per user per day
DailyCheckInSchema.index({ userId: 1, date: 1 }, { unique: true });
DailyCheckInSchema.index({ userId: 1, coinType: 1, date: -1 });

// Helper to get start of day in UTC
const getStartOfDayUTC = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Helper to get start of day yesterday in UTC
const getYesterdayStartUTC = (): Date => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Static methods
DailyCheckInSchema.statics.getLastCheckIn = async function (
  userId: Types.ObjectId
): Promise<IDailyCheckIn | null> {
  return this.findOne({ userId }).sort({ date: -1 }).limit(1);
};

DailyCheckInSchema.statics.hasCheckedInToday = async function (
  userId: Types.ObjectId
): Promise<boolean> {
  const today = getStartOfDayUTC();
  const checkIn = await this.findOne({ userId, date: today });
  return !!checkIn;
};

DailyCheckInSchema.statics.getCurrentStreak = async function (
  userId: Types.ObjectId
): Promise<number> {
  const today = getStartOfDayUTC();
  const yesterday = getYesterdayStartUTC();

  // Check if user checked in today
  const todayCheckIn = await this.findOne({ userId, date: today });
  if (todayCheckIn) {
    return todayCheckIn.streak;
  }

  // Check if user checked in yesterday (streak still valid)
  const yesterdayCheckIn = await this.findOne({ userId, date: yesterday });
  if (yesterdayCheckIn) {
    return yesterdayCheckIn.streak;
  }

  // Streak broken
  return 0;
};

DailyCheckInSchema.statics.getCheckInHistory = async function (
  userId: Types.ObjectId,
  days: number = 30
): Promise<IDailyCheckIn[]> {
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - days);
  startDate.setUTCHours(0, 0, 0, 0);

  return this.find({
    userId,
    date: { $gte: startDate },
  }).sort({ date: -1 });
};

DailyCheckInSchema.statics.getWeeklyEarnings = async function (
  userId: Types.ObjectId
): Promise<number> {
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  weekAgo.setUTCHours(0, 0, 0, 0);

  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: weekAgo },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalEarned' },
      },
    },
  ]);

  return result.length > 0 ? result[0].total : 0;
};

// Pre-save middleware
DailyCheckInSchema.pre('save', function (next) {
  // Normalize date to start of day UTC
  this.date = getStartOfDayUTC(this.date);

  // Calculate total earned
  this.totalEarned = this.coinsEarned + this.bonusEarned;

  next();
});

const DailyCheckIn = mongoose.model<IDailyCheckIn, IDailyCheckInModel>(
  'DailyCheckIn',
  DailyCheckInSchema
);

export default DailyCheckIn;

// Export streak bonus calculation helper
export const calculateStreakBonus = (streak: number): number => {
  const baseReward = 10; // ReZ coins

  if (streak >= 30) return 200;
  if (streak >= 14) return 100;
  if (streak >= 7) return 50;
  if (streak >= 3) return 20;
  return 0;
};

export const getStreakMessage = (streak: number): string => {
  if (streak >= 30) return '30-day streak! Maximum bonus!';
  if (streak >= 14) return '2-week streak! Keep it up!';
  if (streak >= 7) return '7-day streak! Nice work!';
  if (streak >= 3) return '3-day streak! You\'re on fire!';
  if (streak === 1) return 'Check-in complete! Start your streak!';
  return `${streak}-day streak! Keep going!`;
};
