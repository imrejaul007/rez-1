import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITrialCoinWallet extends Document {
  userId: Types.ObjectId;
  balance: number;
  expiryBuckets: Array<{
    amount: number;
    expiresAt: Date;
    source: 'subscription' | 'purchase';
    warningSent: boolean;
  }>;
  totalEarned: number;
  totalSpent: number;
  totalExpired: number;
  lastUpdated: Date;
}

const TrialCoinWalletSchema = new Schema<ITrialCoinWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiryBuckets: [
      {
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
        source: {
          type: String,
          enum: ['subscription', 'purchase'],
          required: true,
        },
        warningSent: {
          type: Boolean,
          default: false,
        },
      },
    ],
    totalEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalExpired: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

// Index on userId for fast lookup

export const TrialCoinWallet = mongoose.model<ITrialCoinWallet>('TrialCoinWallet', TrialCoinWalletSchema);
