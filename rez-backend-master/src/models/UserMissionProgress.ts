import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserMissionProgress extends Document {
  userId: Types.ObjectId;
  missionId: Types.ObjectId;
  completedTrialIds: Types.ObjectId[]; // trial booking IDs that count
  currentCount: number;
  completed: boolean;
  completedAt?: Date;
  rewardCredited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserMissionProgressSchema = new Schema<IUserMissionProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    missionId: {
      type: Schema.Types.ObjectId,
      ref: 'WeeklyMission',
      required: true,
      index: true
    },
    completedTrialIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'TrialBooking'
      }
    ],
    currentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    completed: {
      type: Boolean,
      default: false,
      index: true
    },
    completedAt: Date,
    rewardCredited: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Unique index: { userId, missionId }
UserMissionProgressSchema.index(
  { userId: 1, missionId: 1 },
  { unique: true }
);

export const UserMissionProgress = mongoose.model<IUserMissionProgress>(
  'UserMissionProgress',
  UserMissionProgressSchema
);
