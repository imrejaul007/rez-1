import { logger } from '../config/logger';
// UserCoupon Model
// Tracks user-claimed coupons

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserCouponNotifications {
  expiryReminder: boolean;
  expiryReminderSent: Date | null;
}

export interface IUserCoupon extends Document {
  user: Types.ObjectId;
  coupon: Types.ObjectId;
  claimedDate: Date;
  expiryDate: Date;
  usedDate: Date | null;
  usedInOrder: Types.ObjectId | null;
  status: 'available' | 'used' | 'expired';
  notifications: IUserCouponNotifications;
  createdAt: Date;
  updatedAt: Date;
}

const UserCouponSchema = new Schema<IUserCoupon>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    coupon: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
      index: true,
    },
    claimedDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    usedDate: {
      type: Date,
      default: null,
    },
    usedInOrder: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    status: {
      type: String,
      enum: ['available', 'used', 'expired'],
      default: 'available',
      index: true,
    },
    notifications: {
      expiryReminder: {
        type: Boolean,
        default: true,
      },
      expiryReminderSent: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
UserCouponSchema.index({ user: 1, status: 1 });
UserCouponSchema.index({ user: 1, coupon: 1 }, { unique: true });
UserCouponSchema.index({ status: 1, expiryDate: 1 });

// Virtual for days until expiry
UserCouponSchema.virtual('daysUntilExpiry').get(function(this: IUserCoupon) {
  const now = new Date();
  const diff = this.expiryDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for is expiring soon (within 3 days)
UserCouponSchema.virtual('isExpiringSoon').get(function(this: IUserCoupon) {
  const daysLeft = (this as any).daysUntilExpiry;
  return daysLeft >= 0 && daysLeft <= 3;
});

// Instance method to mark as used
UserCouponSchema.methods.markAsUsed = async function(orderId: Types.ObjectId) {
  this.status = 'used';
  this.usedDate = new Date();
  this.usedInOrder = orderId;
  await this.save();
  logger.info(`✅ [USER_COUPON] Coupon ${this._id} marked as used`);
};

// Instance method to check expiry
UserCouponSchema.methods.checkExpiry = function(): boolean {
  const now = new Date();
  if (this.expiryDate < now && this.status === 'available') {
    this.status = 'expired';
    this.save();
    return true;
  }
  return false;
};

// Static method to mark expired user coupons
UserCouponSchema.statics.markExpiredCoupons = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      status: 'available',
      expiryDate: { $lt: now },
    },
    {
      $set: { status: 'expired' },
    }
  );

  logger.info(`⏰ [USER_COUPON] Marked ${result.modifiedCount} user coupons as expired`);
  return result.modifiedCount || 0;
};

// Static method to get user's available coupons
UserCouponSchema.statics.getUserAvailableCoupons = async function(userId: Types.ObjectId) {
  const now = new Date();
  return this.find({
    user: userId,
    status: 'available',
    expiryDate: { $gte: now },
  })
    .populate('coupon')
    .sort({ expiryDate: 1 })
    .lean();
};

// Static method to get coupons expiring soon (for notifications)
UserCouponSchema.statics.getExpiringSoonCoupons = async function(days: number = 3) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return this.find({
    status: 'available',
    expiryDate: { $gte: now, $lte: futureDate },
    'notifications.expiryReminder': true,
    'notifications.expiryReminderSent': null,
  })
    .populate('user', 'phoneNumber profile.firstName')
    .populate('coupon', 'couponCode title')
    .lean();
};

// Static method to check if user has already claimed a coupon
UserCouponSchema.statics.hasUserClaimedCoupon = async function(
  userId: Types.ObjectId,
  couponId: Types.ObjectId
): Promise<boolean> {
  const count = await this.countDocuments({
    user: userId,
    coupon: couponId,
  });
  return count > 0;
};

// Static method to count user's coupon usage for a specific coupon
UserCouponSchema.statics.getUserCouponUsageCount = async function(
  userId: Types.ObjectId,
  couponId: Types.ObjectId
): Promise<number> {
  return this.countDocuments({
    user: userId,
    coupon: couponId,
    status: 'used',
  });
};

export const UserCoupon = mongoose.model<IUserCoupon>('UserCoupon', UserCouponSchema);
