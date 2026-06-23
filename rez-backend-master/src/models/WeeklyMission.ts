import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWeeklyMission extends Document {
  title: string;
  description: string;
  category?: string | null; // optional filter (e.g. 'cafe', 'gym') — null = any category
  targetCount: number; // e.g. 3
  rewardCoins: number; // ReZ coins on completion
  rewardTryCoins: number; // Trial coins bonus
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  createdBy: 'admin' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyMissionSchema = new Schema<IWeeklyMission>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    category: {
      type: String,
      trim: true,
      default: null
    },
    targetCount: {
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
    startsAt: {
      type: Date,
      required: true,
      index: true
    },
    endsAt: {
      type: Date,
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: String,
      enum: ['admin', 'system'],
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
WeeklyMissionSchema.index({ isActive: 1, endsAt: 1 });
WeeklyMissionSchema.index({ category: 1, isActive: 1 });

export const WeeklyMission = mongoose.model<IWeeklyMission>(
  'WeeklyMission',
  WeeklyMissionSchema
);
