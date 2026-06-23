import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserBundlePurchase extends Document {
  userId: Types.ObjectId;
  bundleId: Types.ObjectId;
  paymentId: string;
  amountPaid: number;
  trialSlotsTotal: number;
  trialSlotsUsed: number;
  trialSlotsRemaining: number;
  trialCoinsGranted: number;
  expiresAt: Date;
  usedTrialIds: Types.ObjectId[];
  status: 'active' | 'exhausted' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

const UserBundlePurchaseSchema = new Schema<IUserBundlePurchase>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bundleId: {
      type: Schema.Types.ObjectId,
      ref: 'TrialBundle',
      required: true,
    },
    paymentId: {
      type: String,
      required: true,
      trim: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    trialSlotsTotal: {
      type: Number,
      required: true,
      min: 1,
    },
    trialSlotsUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    trialSlotsRemaining: {
      type: Number,
      required: true,
      min: 0,
    },
    trialCoinsGranted: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedTrialIds: {
      type: [Schema.Types.ObjectId],
      ref: 'TrialBooking',
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'exhausted', 'expired'],
      required: true,
      default: 'active',
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
UserBundlePurchaseSchema.index({ userId: 1, status: 1 });
UserBundlePurchaseSchema.index({ expiresAt: 1 });

export const UserBundlePurchase = mongoose.model<IUserBundlePurchase>('UserBundlePurchase', UserBundlePurchaseSchema);
