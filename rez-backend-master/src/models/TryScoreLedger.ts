import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITryScoreLedger extends Document {
  userId: Types.ObjectId;
  component: 'new_category' | 'new_merchant' | 'streak' | 'review' | 'referral';
  points: number;
  referenceId?: string;
  createdAt: Date;
}

export interface IUserTryScore extends Document {
  userId: Types.ObjectId;
  totalScore: number;
  tier: 'curious' | 'explorer' | 'adventurer' | 'pioneer';
  categoriesTried: string[];
  merchantsDiscovered: Types.ObjectId[];
  currentStreak: number;
  lastTrialDate?: Date;
  updatedAt: Date;
}

const TryScoreLedgerSchema = new Schema<ITryScoreLedger>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    component: {
      type: String,
      enum: ['new_category', 'new_merchant', 'streak', 'review', 'referral'],
      required: true,
    },
    points: {
      type: Number,
      required: true,
      min: 0,
    },
    referenceId: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: false,
  },
);

const UserTryScoreSchema = new Schema<IUserTryScore>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    totalScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    tier: {
      type: String,
      enum: ['curious', 'explorer', 'adventurer', 'pioneer'],
      default: 'curious',
    },
    categoriesTried: [
      {
        type: String,
        trim: true,
      },
    ],
    merchantsDiscovered: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Merchant',
      },
    ],
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastTrialDate: Date,
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

export const TryScoreLedger = mongoose.model<ITryScoreLedger>('TryScoreLedger', TryScoreLedgerSchema);

export const UserTryScore = mongoose.model<IUserTryScore>('UserTryScore', UserTryScoreSchema);
