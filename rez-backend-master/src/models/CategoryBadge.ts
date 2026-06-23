import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICategoryBadge extends Document {
  userId: Types.ObjectId;
  category: string; // e.g. 'cafe', 'gym', 'salon', 'fitness'
  trialCount: number; // how many trials in this category
  badgeLevel: 'newcomer' | 'regular' | 'expert' | 'master';
  // newcomer=1, regular=3, expert=7, master=15
  earnedAt: Date;
  updatedAt: Date;
}

const CategoryBadgeSchema = new Schema<ICategoryBadge>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    trialCount: {
      type: Number,
      default: 0,
      min: 0
    },
    badgeLevel: {
      type: String,
      enum: ['newcomer', 'regular', 'expert', 'master'],
      required: true
    },
    earnedAt: {
      type: Date,
      default: Date.now
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

// Unique index: { userId, category }
CategoryBadgeSchema.index(
  { userId: 1, category: 1 },
  { unique: true }
);

export const CategoryBadge = mongoose.model<ICategoryBadge>(
  'CategoryBadge',
  CategoryBadgeSchema
);
