import { logger } from '../config/logger';
/**
 * MallAffiliateClick Model
 *
 * Tracks user clicks on mall brands for affiliate/cashback attribution.
 * Each click has a 30-day attribution window for conversion tracking.
 */

import mongoose, { Schema, Document, Types } from 'mongoose';
import crypto from 'crypto';

// Click status type
export type ClickStatus = 'clicked' | 'converted' | 'expired';

// Interface for MallAffiliateClick document
export interface IMallAffiliateClick extends Document {
  _id: Types.ObjectId;
  clickId: string;              // Unique tracking ID (e.g., "CLK_abc123xyz")
  user?: Types.ObjectId;        // User who clicked (optional for guests)
  brand: Types.ObjectId;        // MallBrand reference

  // Tracking data
  sessionId: string;            // Browser/app session
  deviceId?: string;            // Device fingerprint
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  platform: 'web' | 'ios' | 'android';

  // UTM parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;

  // Status tracking
  status: ClickStatus;
  clickedAt: Date;
  convertedAt?: Date;
  expiresAt: Date;              // 30 days attribution window

  // Conversion tracking (populated after purchase)
  purchase?: Types.ObjectId;    // MallPurchase reference
  cashback?: Types.ObjectId;    // UserCashback reference

  // Brand info snapshot (at time of click)
  brandSnapshot: {
    name: string;
    cashbackPercentage: number;
    maxCashback?: number;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  markAsConverted(purchaseId: Types.ObjectId, cashbackId?: Types.ObjectId): Promise<void>;
}

// Schema definition
const MallAffiliateClickSchema = new Schema<IMallAffiliateClick>({
  clickId: {
    type: String,
    unique: true,
    index: true,
    default: function () {
      const timestamp = Date.now().toString(36);
      const random = crypto.randomBytes(6).toString('hex');
      return `CLK_${timestamp}_${random}`;
    },
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'MallBrand',
    required: true,
    index: true,
  },

  // Tracking data
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  deviceId: {
    type: String,
    index: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  referrer: {
    type: String,
  },
  platform: {
    type: String,
    enum: ['web', 'ios', 'android'],
    default: 'web',
  },

  // UTM parameters
  utmSource: String,
  utmMedium: String,
  utmCampaign: String,
  utmContent: String,
  utmTerm: String,

  // Status tracking
  status: {
    type: String,
    enum: ['clicked', 'converted', 'expired'],
    default: 'clicked',
    index: true,
  },
  clickedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  convertedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
    default: function () {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      return expiry;
    },
  },

  // Conversion tracking
  purchase: {
    type: Schema.Types.ObjectId,
    ref: 'MallPurchase',
  },
  cashback: {
    type: Schema.Types.ObjectId,
    ref: 'UserCashback',
  },

  // Brand snapshot
  brandSnapshot: {
    name: {
      type: String,
      required: true,
    },
    cashbackPercentage: {
      type: Number,
      required: true,
    },
    maxCashback: {
      type: Number,
    },
  },
}, {
  timestamps: true,
});

// Compound indexes
MallAffiliateClickSchema.index({ user: 1, brand: 1, clickedAt: -1 });
MallAffiliateClickSchema.index({ status: 1, expiresAt: 1 });
MallAffiliateClickSchema.index({ sessionId: 1, brand: 1 });

// TTL index: auto-delete expired clicks after 90 days (30d attribution + 60d buffer)
MallAffiliateClickSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

// Note: clickId and expiresAt defaults are handled via schema default functions
// (runs before validation, unlike pre-save hooks which run after validation)

// Static method to generate a unique click ID
MallAffiliateClickSchema.statics.generateClickId = function(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex');
  return `CLK_${timestamp}_${random}`;
};

// Static method to find valid click by ID (not expired)
MallAffiliateClickSchema.statics.findValidClick = async function(
  clickId: string
): Promise<IMallAffiliateClick | null> {
  return this.findOne({
    clickId,
    status: 'clicked',
    expiresAt: { $gt: new Date() },
  }).populate('brand', 'name slug cashback externalUrl');
};

// Static method to find user's recent clicks
MallAffiliateClickSchema.statics.getUserClicks = async function(
  userId: Types.ObjectId,
  page: number = 1,
  limit: number = 20
): Promise<{ clicks: IMallAffiliateClick[]; total: number; pages: number }> {
  const skip = (page - 1) * limit;

  const [clicks, total] = await Promise.all([
    this.find({ user: userId })
      .sort({ clickedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('brand', 'name slug logo cashback')
      .lean(),
    this.countDocuments({ user: userId }),
  ]);

  return {
    clicks,
    total,
    pages: Math.ceil(total / limit),
  };
};

// Static method to mark expired clicks
MallAffiliateClickSchema.statics.markExpiredClicks = async function(): Promise<number> {
  const now = new Date();

  const result = await this.updateMany(
    {
      status: 'clicked',
      expiresAt: { $lt: now },
    },
    {
      $set: { status: 'expired' },
    }
  );

  logger.info(`⏰ [AFFILIATE] Marked ${result.modifiedCount} clicks as expired`);
  return result.modifiedCount;
};

// Static method to get click analytics for a brand
MallAffiliateClickSchema.statics.getBrandClickAnalytics = async function(
  brandId: Types.ObjectId,
  startDate: Date,
  endDate: Date
): Promise<{
  totalClicks: number;
  uniqueUsers: number;
  conversions: number;
  conversionRate: number;
}> {
  const stats = await this.aggregate([
    {
      $match: {
        brand: brandId,
        clickedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalClicks: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        conversions: {
          $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] },
        },
      },
    },
  ]);

  if (stats.length === 0) {
    return {
      totalClicks: 0,
      uniqueUsers: 0,
      conversions: 0,
      conversionRate: 0,
    };
  }

  const { totalClicks, uniqueUsers, conversions } = stats[0];
  const uniqueUserCount = uniqueUsers.filter((u: any) => u != null).length;

  return {
    totalClicks,
    uniqueUsers: uniqueUserCount,
    conversions,
    conversionRate: totalClicks > 0 ? (conversions / totalClicks) * 100 : 0,
  };
};

// Instance method to mark as converted
MallAffiliateClickSchema.methods.markAsConverted = async function(
  purchaseId: Types.ObjectId,
  cashbackId?: Types.ObjectId
): Promise<void> {
  this.status = 'converted';
  this.convertedAt = new Date();
  this.purchase = purchaseId;
  if (cashbackId) {
    this.cashback = cashbackId;
  }
  await this.save();
  logger.info(`✅ [AFFILIATE] Click ${this.clickId} marked as converted`);
};

// Virtual for time until expiry
MallAffiliateClickSchema.virtual('timeUntilExpiry').get(function(this: IMallAffiliateClick) {
  const now = new Date();
  const expiry = new Date(this.expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
});

// Virtual for is expired
MallAffiliateClickSchema.virtual('isExpired').get(function(this: IMallAffiliateClick) {
  return new Date() > new Date(this.expiresAt) || this.status === 'expired';
});

// Virtual for is convertible (can still be converted)
MallAffiliateClickSchema.virtual('isConvertible').get(function(this: IMallAffiliateClick) {
  return this.status === 'clicked' && new Date() <= new Date(this.expiresAt);
});

// Enable virtuals in JSON
MallAffiliateClickSchema.set('toJSON', { virtuals: true });
MallAffiliateClickSchema.set('toObject', { virtuals: true });

// Delete cached model if exists (for development)
if (mongoose.models.MallAffiliateClick) {
  delete (mongoose.models as any).MallAffiliateClick;
}

export const MallAffiliateClick = mongoose.model<IMallAffiliateClick>(
  'MallAffiliateClick',
  MallAffiliateClickSchema
);
