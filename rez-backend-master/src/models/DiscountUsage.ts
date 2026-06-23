// DiscountUsage Model
// Tracks discount usage by users for analytics and limit enforcement

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface IDiscountUsage extends Document {
  _id: Types.ObjectId;
  discount: Types.ObjectId;
  user: Types.ObjectId;
  order: Types.ObjectId;
  discountAmount: number;
  orderValue: number;
  usedAt: Date;
  metadata: {
    discountCode?: string;
    discountType?: string;
    originalDiscountValue?: number;
  };
}

// Interface for static methods
export interface IDiscountUsageModel extends Model<IDiscountUsage> {
  getUserHistory(userId: Types.ObjectId, limit?: number): Promise<any[]>;
  getDiscountAnalytics(discountId: Types.ObjectId): Promise<{
    totalUsed: number;
    totalDiscountAmount: number;
    totalOrderValue: number;
    uniqueUsersCount: number;
    avgDiscountAmount: number;
    avgOrderValue: number;
  }>;
}

const DiscountUsageSchema = new Schema<IDiscountUsage>({
  discount: {
    type: Schema.Types.ObjectId,
    ref: 'Discount',
    required: [true, 'Discount reference is required'],
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order reference is required'],
    index: true
  },
  discountAmount: {
    type: Number,
    required: [true, 'Discount amount is required'],
    min: [0, 'Discount amount cannot be negative']
  },
  orderValue: {
    type: Number,
    required: [true, 'Order value is required'],
    min: [0, 'Order value cannot be negative']
  },
  usedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    discountCode: {
      type: String,
      trim: true
    },
    discountType: {
      type: String,
      trim: true
    },
    originalDiscountValue: {
      type: Number
    }
  }
}, {
  timestamps: false
});

// Compound indexes
DiscountUsageSchema.index({ discount: 1, user: 1 });
DiscountUsageSchema.index({ user: 1, usedAt: -1 });
DiscountUsageSchema.index({ discount: 1, usedAt: -1 });

// Static method to get user's usage history
DiscountUsageSchema.statics.getUserHistory = async function(
  userId: Types.ObjectId,
  limit: number = 10
) {
  return this.find({ user: userId })
    .populate('discount', 'name code type value')
    .populate('order', 'orderNumber')
    .sort({ usedAt: -1 })
    .limit(limit);
};

// Static method to get discount analytics
DiscountUsageSchema.statics.getDiscountAnalytics = async function(
  discountId: Types.ObjectId
) {
  const analytics = await this.aggregate([
    { $match: { discount: discountId } },
    {
      $group: {
        _id: '$discount',
        totalUsed: { $sum: 1 },
        totalDiscountAmount: { $sum: '$discountAmount' },
        totalOrderValue: { $sum: '$orderValue' },
        uniqueUsers: { $addToSet: '$user' },
        avgDiscountAmount: { $avg: '$discountAmount' },
        avgOrderValue: { $avg: '$orderValue' }
      }
    },
    {
      $project: {
        totalUsed: 1,
        totalDiscountAmount: 1,
        totalOrderValue: 1,
        uniqueUsersCount: { $size: '$uniqueUsers' },
        avgDiscountAmount: { $round: ['$avgDiscountAmount', 2] },
        avgOrderValue: { $round: ['$avgOrderValue', 2] }
      }
    }
  ]);

  return analytics[0] || {
    totalUsed: 0,
    totalDiscountAmount: 0,
    totalOrderValue: 0,
    uniqueUsersCount: 0,
    avgDiscountAmount: 0,
    avgOrderValue: 0
  };
};

const DiscountUsage = mongoose.model<IDiscountUsage, IDiscountUsageModel>('DiscountUsage', DiscountUsageSchema);
export default DiscountUsage;
