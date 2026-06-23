import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITrialBooking extends Document {
  userId: Types.ObjectId;
  trialId: Types.ObjectId;
  merchantId: Types.ObjectId;
  qrHash: string;
  qrExpiresAt: Date;
  commitmentFeePaid: number;
  commitmentFeePaymentId: string;
  status: 'pending' | 'active' | 'completed' | 'expired' | 'fraud_rejected';
  geoAtBooking: { lat: number; lng: number };
  geoAtScan?: { lat: number; lng: number };
  completedAt?: Date;
  fraudSignals: string[];
  rewardCredited: boolean;
  upsellShown: boolean;
  // Review fields — populated after the trial is completed
  rating?: number;
  reviewText?: string;
  reviewedAt?: Date;
  reviewCoinsAwarded?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TrialBookingSchema = new Schema<ITrialBooking>(
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
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    qrHash: {
      type: String,
      required: true,
      trim: true,
    },
    qrExpiresAt: {
      type: Date,
      required: true,
    },
    commitmentFeePaid: {
      type: Number,
      required: true,
      min: 0,
    },
    commitmentFeePaymentId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'expired', 'fraud_rejected'],
      default: 'pending',
      index: true,
    },
    geoAtBooking: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    geoAtScan: {
      lat: Number,
      lng: Number,
    },
    completedAt: Date,
    fraudSignals: [
      {
        type: String,
        trim: true,
      },
    ],
    rewardCredited: {
      type: Boolean,
      default: false,
    },
    upsellShown: {
      type: Boolean,
      default: false,
    },
    // Review
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    reviewedAt: {
      type: Date,
    },
    reviewCoinsAwarded: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes - SCALEPILOT OPTIMIZED
TrialBookingSchema.index({ userId: 1, createdAt: -1 }); // User booking history
TrialBookingSchema.index({ trialId: 1, userId: 1 }); // Prevent duplicate bookings
TrialBookingSchema.index({ qrHash: 1 }, { unique: true }); // QR code lookups
TrialBookingSchema.index({ merchantId: 1, status: 1 }); // Merchant dashboard filtering

// Status and analytics
TrialBookingSchema.index({ userId: 1, status: 1 }); // For user history queries by status
TrialBookingSchema.index({ merchantId: 1, createdAt: -1 }); // For merchant analytics sorted by date
TrialBookingSchema.index({ status: 1, createdAt: -1 }); // System-level status queries

// Unique partial index: userId + trialId (only non-expired/fraud bookings)
TrialBookingSchema.index(
  { userId: 1, trialId: 1 },
  {
    unique: false,
    partialFilterExpression: {
      status: { $nin: ['expired', 'fraud_rejected'] },
    },
  },
);

export const TrialBooking = mongoose.model<ITrialBooking>('TrialBooking', TrialBookingSchema);
