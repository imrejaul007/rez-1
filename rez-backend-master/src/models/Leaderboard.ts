import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILeaderboardEntry extends Document {
  userId: Types.ObjectId;
  city: string;
  period: 'weekly' | 'monthly' | 'alltime';
  periodKey: string; // e.g. "2024-W12", "2024-03", "alltime"
  score: number;
  rank: number;
  trialCount: number;
  categoriesExplored: number;
  updatedAt: Date;
}

const LeaderboardSchema = new Schema<ILeaderboardEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    period: {
      type: String,
      enum: ['weekly', 'monthly', 'alltime'],
      required: true,
      index: true
    },
    periodKey: {
      type: String,
      required: true,
      index: true
    },
    score: {
      type: Number,
      default: 0,
      min: 0
    },
    rank: {
      type: Number,
      default: 0,
      min: 0
    },
    trialCount: {
      type: Number,
      default: 0,
      min: 0
    },
    categoriesExplored: {
      type: Number,
      default: 0,
      min: 0
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

// Indexes for efficient querying
LeaderboardSchema.index({ city: 1, period: 1, periodKey: 1, score: -1 });
LeaderboardSchema.index({ userId: 1, period: 1, periodKey: 1 });

export const Leaderboard = mongoose.model<ILeaderboardEntry>(
  'Leaderboard',
  LeaderboardSchema
);
