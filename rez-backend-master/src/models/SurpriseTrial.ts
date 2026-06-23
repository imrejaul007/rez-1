import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISurpriseTrial extends Document {
  userId: Types.ObjectId;
  trialId: Types.ObjectId;
  weekKey: string; // "2024-W12" — one per user per week
  revealed: boolean;
  revealedAt?: Date;
  booked: boolean;
  bookedAt?: Date;
  expiresAt: Date; // end of the week
  createdAt: Date;
  updatedAt: Date;
}

const SurpriseTrialSchema = new Schema<ISurpriseTrial>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    trialId: {
      type: Schema.Types.ObjectId,
      ref: 'TrialOffer',
      required: true,
      index: true,
    },
    weekKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    revealed: {
      type: Boolean,
      default: false,
    },
    revealedAt: Date,
    booked: {
      type: Boolean,
      default: false,
      index: true,
    },
    bookedAt: Date,
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Unique index: { userId, weekKey }
SurpriseTrialSchema.index({ userId: 1, weekKey: 1 }, { unique: true });

// Expiry queries
SurpriseTrialSchema.index({ expiresAt: 1 });

export const SurpriseTrial = mongoose.model<ISurpriseTrial>('SurpriseTrial', SurpriseTrialSchema);
