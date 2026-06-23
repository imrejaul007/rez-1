import mongoose, { Schema, Document, Types } from 'mongoose';

export type UpgradeStatus = 'pending_payment' | 'processing' | 'completed' | 'failed' | 'expired';

export interface ISubscriptionUpgrade extends Document {
  userId: Types.ObjectId;
  subscriptionId?: Types.ObjectId;
  fromTier: 'free' | 'premium' | 'vip';
  toTier: 'premium' | 'vip';
  billingCycle: 'monthly' | 'yearly';
  proratedAmount: number;
  newTierPrice: number;
  creditFromCurrentPlan: number;
  paymentGateway: 'stripe' | 'razorpay';
  paymentId?: string;
  paymentIntentId?: string;
  status: UpgradeStatus;
  idempotencyKey: string;
  expiresAt: Date;
  completedAt?: Date;
  failureReason?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionUpgradeSchema = new Schema<ISubscriptionUpgrade>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    fromTier: {
      type: String,
      required: true,
      enum: ['free', 'premium', 'vip'],
    },
    toTier: {
      type: String,
      required: true,
      enum: ['premium', 'vip'],
    },
    billingCycle: {
      type: String,
      required: true,
      enum: ['monthly', 'yearly'],
    },
    proratedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    newTierPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    creditFromCurrentPlan: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentGateway: {
      type: String,
      required: true,
      enum: ['stripe', 'razorpay'],
      default: 'stripe',
    },
    paymentId: {
      type: String,
    },
    paymentIntentId: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending_payment', 'processing', 'completed', 'failed', 'expired'],
      default: 'pending_payment',
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      source: String,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate upgrade initiations per user
SubscriptionUpgradeSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true }
);

// Find pending upgrades efficiently
SubscriptionUpgradeSchema.index({ status: 1, expiresAt: 1 });

// TTL index: auto-delete expired records after 7 days
SubscriptionUpgradeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);

export const SubscriptionUpgrade = mongoose.model<ISubscriptionUpgrade>(
  'SubscriptionUpgrade',
  SubscriptionUpgradeSchema
);
