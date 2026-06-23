import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITrialCoinLedger extends Document {
  userId: Types.ObjectId;
  type: 'subscription_allocation' | 'purchase' | 'spend' | 'expired' | 'refund' | 'admin_grant' | 'admin_clawback';
  amount: number;
  balanceAfter: number;
  referenceId?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const TrialCoinLedgerSchema = new Schema<ITrialCoinLedger>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['subscription_allocation', 'purchase', 'spend', 'expired', 'refund', 'admin_grant', 'admin_clawback'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    referenceId: {
      type: String,
      trim: true,
    },
    expiresAt: Date,
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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

// Indexes
TrialCoinLedgerSchema.index({ userId: 1, createdAt: -1 });
TrialCoinLedgerSchema.index({ type: 1, createdAt: -1 }); // For breakage stats queries

export const TrialCoinLedger = mongoose.model<ITrialCoinLedger>('TrialCoinLedger', TrialCoinLedgerSchema);
