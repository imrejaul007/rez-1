import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITryFeedCache extends Document {
  userId: Types.ObjectId;
  rankedTrialIds: Types.ObjectId[];
  generatedAt: Date;
  expiresAt: Date;
}

const TryFeedCacheSchema = new Schema<ITryFeedCache>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    rankedTrialIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'TrialOffer',
      },
    ],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index
    },
  },
  {
    timestamps: false,
  },
);

export const TryFeedCache = mongoose.model<ITryFeedCache>('TryFeedCache', TryFeedCacheSchema);
