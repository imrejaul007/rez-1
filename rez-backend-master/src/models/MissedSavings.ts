/**
 * MissedSavings Model
 *
 * Records instances where a user made a payment outside of REZ
 * (detected via bill upload or bank statement import) and tracks
 * what they could have earned if they had used a REZ merchant.
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IAlternativeMerchant {
  storeId: Types.ObjectId;
  name: string;
  distance: number; // meters from user's location at time of transaction
  potentialSavings: number; // coins that could have been earned
}

export interface IMissedSavings extends Document {
  userId: Types.ObjectId;
  estimatedSavings: number; // coins that could have been earned
  merchantCategory: string; // e.g., 'food-dining', 'grocery-essentials'
  date: Date; // when the missed spend occurred
  billAmount?: number; // original bill amount in INR (if available)
  nonRezMerchantName?: string; // name of the non-REZ merchant (if known)
  alternativeMerchants: IAlternativeMerchant[];
  source: 'bill_upload' | 'location_detected' | 'manual';
  isRead: boolean; // whether user has seen this missed savings notification
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const AlternativeMerchantSchema = new Schema(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    distance: {
      type: Number,
      default: 0,
      min: 0,
    },
    potentialSavings: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const MissedSavingsSchema = new Schema<IMissedSavings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    estimatedSavings: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    merchantCategory: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    billAmount: {
      type: Number,
      min: 0,
    },
    nonRezMerchantName: {
      type: String,
      trim: true,
    },
    alternativeMerchants: {
      type: [AlternativeMerchantSchema],
      default: () => [],
    },
    source: {
      type: String,
      required: true,
      enum: ['bill_upload', 'location_detected', 'manual'],
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

MissedSavingsSchema.index({ userId: 1, date: -1 });
MissedSavingsSchema.index({ userId: 1, isRead: 1 });
MissedSavingsSchema.index({ userId: 1, source: 1, date: -1 });
MissedSavingsSchema.index({ date: -1, estimatedSavings: -1 });

// ─── Model ───────────────────────────────────────────────────────────────────

export const MissedSavings = mongoose.model<IMissedSavings>('MissedSavings', MissedSavingsSchema);
export default MissedSavings;
