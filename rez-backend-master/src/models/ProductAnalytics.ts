import mongoose, { Schema, Document, Types } from 'mongoose';

// Product Analytics interface for tracking product interactions
export interface IProductAnalytics extends Document {
  product: Types.ObjectId;
  user?: Types.ObjectId;

  // View analytics
  views: {
    total: number;
    unique: number;
    lastViewed: Date;
  };

  // Purchase analytics
  purchases: {
    total: number;
    revenue: number;
    avgOrderValue: number;
  };

  // Cart analytics
  cartAdditions: number;
  cartRemovals: number;

  // Wishlist analytics
  wishlistAdds: number;

  // Engagement analytics
  shares: number;
  reviews: number;

  // Conversion metrics
  conversionRate: number;
  bounceRate: number;

  // Time tracking
  avgTimeOnPage: number; // in seconds

  // Related products clicked
  relatedProductClicks: number;

  // Search analytics
  searchAppearances: number;
  searchClicks: number;
  searchPosition: number;

  createdAt: Date;
  updatedAt: Date;
}

// Product Analytics Schema
const ProductAnalyticsSchema = new Schema<IProductAnalytics>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  views: {
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    unique: {
      type: Number,
      default: 0,
      min: 0
    },
    lastViewed: {
      type: Date,
      default: Date.now
    }
  },
  purchases: {
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    revenue: {
      type: Number,
      default: 0,
      min: 0
    },
    avgOrderValue: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  cartAdditions: {
    type: Number,
    default: 0,
    min: 0
  },
  cartRemovals: {
    type: Number,
    default: 0,
    min: 0
  },
  wishlistAdds: {
    type: Number,
    default: 0,
    min: 0
  },
  shares: {
    type: Number,
    default: 0,
    min: 0
  },
  reviews: {
    type: Number,
    default: 0,
    min: 0
  },
  conversionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  bounceRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  avgTimeOnPage: {
    type: Number,
    default: 0,
    min: 0
  },
  relatedProductClicks: {
    type: Number,
    default: 0,
    min: 0
  },
  searchAppearances: {
    type: Number,
    default: 0,
    min: 0
  },
  searchClicks: {
    type: Number,
    default: 0,
    min: 0
  },
  searchPosition: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ProductAnalyticsSchema.index({ product: 1, user: 1 });
ProductAnalyticsSchema.index({ 'views.total': -1 });
ProductAnalyticsSchema.index({ 'purchases.total': -1 });
ProductAnalyticsSchema.index({ conversionRate: -1 });
ProductAnalyticsSchema.index({ createdAt: -1 });

// Compound indexes
ProductAnalyticsSchema.index({ product: 1, 'views.lastViewed': -1 });
ProductAnalyticsSchema.index({ product: 1, 'purchases.total': -1 });

// Pre-save hook to calculate conversion rate
ProductAnalyticsSchema.pre('save', function(next) {
  // Calculate conversion rate
  if (this.views.unique > 0) {
    this.conversionRate = (this.purchases.total / this.views.unique) * 100;
  }

  // Calculate average order value
  if (this.purchases.total > 0) {
    this.purchases.avgOrderValue = this.purchases.revenue / this.purchases.total;
  }

  next();
});

// Static method to track product view
ProductAnalyticsSchema.statics.trackView = async function(productId: string, userId?: string) {
  const analytics = await this.findOneAndUpdate(
    { product: productId, user: userId },
    {
      $inc: {
        'views.total': 1,
        'views.unique': userId ? 1 : 0
      },
      $set: { 'views.lastViewed': new Date() }
    },
    { upsert: true, new: true }
  );

  return analytics;
};

// Static method to track purchase
ProductAnalyticsSchema.statics.trackPurchase = async function(
  productId: string,
  userId: string,
  amount: number
) {
  const analytics = await this.findOneAndUpdate(
    { product: productId, user: userId },
    {
      $inc: {
        'purchases.total': 1,
        'purchases.revenue': amount
      }
    },
    { upsert: true, new: true }
  );

  return analytics;
};

// Static method to get popular products
ProductAnalyticsSchema.statics.getPopularProducts = async function(options: {
  limit?: number;
  timeRange?: Date;
}) {
  const { limit = 10, timeRange } = options;

  const query: any = {};
  if (timeRange) {
    query.createdAt = { $gte: timeRange };
  }

  return this.find(query)
    .sort({ 'views.total': -1, 'purchases.total': -1 })
    .limit(limit)
    .populate('product');
};

// Static method to get trending products
ProductAnalyticsSchema.statics.getTrendingProducts = async function(options: {
  limit?: number;
  days?: number;
}) {
  const { limit = 10, days = 7 } = options;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return this.find({
    'views.lastViewed': { $gte: startDate }
  })
    .sort({ 'views.total': -1, conversionRate: -1 })
    .limit(limit)
    .populate('product');
};

export const ProductAnalytics =
  mongoose.models.ProductAnalytics ||
  mongoose.model<IProductAnalytics>('ProductAnalytics', ProductAnalyticsSchema);
