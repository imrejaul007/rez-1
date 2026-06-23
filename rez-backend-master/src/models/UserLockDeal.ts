/**
 * User Lock Deal Model
 *
 * Tracks a user's locked deals through the lifecycle:
 * locked → paid_balance → picked_up (success)
 * locked → expired | cancelled | refunded (failure)
 */

import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import crypto from 'crypto';

export type UserLockDealStatus = 'locked' | 'paid_balance' | 'picked_up' | 'expired' | 'refunded' | 'cancelled';

export interface IUserLockDeal extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  lockDeal: Types.ObjectId;

  // Status
  status: UserLockDealStatus;

  // Deposit payment
  depositPaymentId?: string;
  depositStripePaymentIntentId?: string;
  depositPaidAt?: Date;
  depositAmount: number;

  // Balance payment
  balancePaymentId?: string;
  balanceStripePaymentIntentId?: string;
  balancePaidAt?: Date;
  balanceAmount: number;

  // Rewards
  lockRewardCredited: boolean;
  lockRewardAmount: number;
  pickupRewardCredited: boolean;
  pickupRewardAmount: number;
  earningsMultiplier: number;

  // Pickup
  pickupCode: string;
  pickedUpAt?: Date;
  pickedUpByMerchant?: Types.ObjectId;
  merchantNotes?: string;

  // Expiry & Cancellation
  expiresAt: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  refundedAt?: Date;
  refundAmount?: number;

  // Snapshot of deal at lock time (for historical accuracy)
  dealSnapshot: {
    title: string;
    image: string;
    originalPrice: number;
    lockedPrice: number;
    depositPercent: number;
    currency: string;
    storeName: string;
    storeId: string;
    lockReward: { type: string; amount: number };
    pickupReward: { type: string; amount: number };
    earningsMultiplier: number;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserLockDealModel extends Model<IUserLockDeal> {
  generatePickupCode(): string;
  hasUserLocked(userId: string, lockDealId: string): Promise<boolean>;
  getUserActiveLocks(userId: string, status?: string): Promise<IUserLockDeal[]>;
}

const UserLockDealSchema = new Schema<IUserLockDeal>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lockDeal: {
    type: Schema.Types.ObjectId,
    ref: 'LockPriceDeal',
    required: true,
  },

  status: {
    type: String,
    enum: ['locked', 'paid_balance', 'picked_up', 'expired', 'refunded', 'cancelled'],
    default: 'locked',
  },

  // Deposit
  depositPaymentId: { type: String, trim: true },
  depositStripePaymentIntentId: { type: String, trim: true },
  depositPaidAt: { type: Date },
  depositAmount: { type: Number, required: true, min: 0 },

  // Balance
  balancePaymentId: { type: String, trim: true },
  balanceStripePaymentIntentId: { type: String, trim: true },
  balancePaidAt: { type: Date },
  balanceAmount: { type: Number, required: true, min: 0 },

  // Rewards
  lockRewardCredited: { type: Boolean, default: false },
  lockRewardAmount: { type: Number, default: 0, min: 0 },
  pickupRewardCredited: { type: Boolean, default: false },
  pickupRewardAmount: { type: Number, default: 0, min: 0 },
  earningsMultiplier: { type: Number, default: 2, min: 1 },

  // Pickup
  pickupCode: {
    type: String,
    required: true,
    unique: true,
  },
  pickedUpAt: { type: Date },
  pickedUpByMerchant: { type: Schema.Types.ObjectId, ref: 'MerchantUser' },
  merchantNotes: { type: String, trim: true, maxlength: 500 },

  // Expiry & Cancellation
  expiresAt: { type: Date, required: true },
  cancelledAt: { type: Date },
  cancellationReason: { type: String, trim: true },
  refundedAt: { type: Date },
  refundAmount: { type: Number, min: 0 },

  // Snapshot
  dealSnapshot: {
    title: { type: String, required: true },
    image: { type: String, required: true },
    originalPrice: { type: Number, required: true },
    lockedPrice: { type: Number, required: true },
    depositPercent: { type: Number, required: true },
    currency: { type: String, required: true },
    storeName: { type: String, required: true },
    storeId: { type: String, required: true },
    lockReward: {
      type: { type: String },
      amount: { type: Number },
    },
    pickupReward: {
      type: { type: String },
      amount: { type: Number },
    },
    earningsMultiplier: { type: Number },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
// Prevent duplicate active locks per user per deal
UserLockDealSchema.index(
  { user: 1, lockDeal: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['locked', 'paid_balance'] },
    },
  }
);
UserLockDealSchema.index({ user: 1, status: 1 });
UserLockDealSchema.index({ expiresAt: 1, status: 1 });
UserLockDealSchema.index({ lockDeal: 1, status: 1 });

// Virtual: isExpired
UserLockDealSchema.virtual('isExpired').get(function (this: IUserLockDeal) {
  return this.expiresAt < new Date() && !['picked_up', 'refunded', 'cancelled'].includes(this.status);
});

// Virtual: daysUntilExpiry
UserLockDealSchema.virtual('daysUntilExpiry').get(function (this: IUserLockDeal) {
  const now = new Date();
  const diff = this.expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual: totalRewardEarned
UserLockDealSchema.virtual('totalRewardEarned').get(function (this: IUserLockDeal) {
  let total = 0;
  if (this.lockRewardCredited) total += this.lockRewardAmount;
  if (this.pickupRewardCredited) total += this.pickupRewardAmount;
  return total;
});

// Static: generate pickup code (RZ-LOCK-XXXXXXXX)
UserLockDealSchema.statics.generatePickupCode = function (): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `RZ-LOCK-${code}`;
};

// Static: check if user already has an active lock on this deal
UserLockDealSchema.statics.hasUserLocked = async function (userId: string, lockDealId: string): Promise<boolean> {
  const count = await this.countDocuments({
    user: userId,
    lockDeal: lockDealId,
    status: { $in: ['locked', 'paid_balance'] },
  });
  return count > 0;
};

// Static: get user's locks with optional status filter
UserLockDealSchema.statics.getUserActiveLocks = async function (userId: string, status?: string): Promise<IUserLockDeal[]> {
  const query: any = { user: userId };
  if (status) {
    query.status = status;
  } else {
    // By default show active locks
    query.status = { $in: ['locked', 'paid_balance'] };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('lockDeal', 'title image store storeName lockedPrice')
    .lean();
};

// Delete cached model if exists (for development)
if (mongoose.models.UserLockDeal) {
  delete (mongoose.models as any).UserLockDeal;
}

export const UserLockDeal = mongoose.model<IUserLockDeal, IUserLockDealModel>(
  'UserLockDeal',
  UserLockDealSchema
);
