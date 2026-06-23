import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================
// TYPES
// ============================================

export type PickStatus = 'draft' | 'pending_merchant' | 'pending_review' | 'approved' | 'rejected' | 'archived';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type MerchantApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ICreatorPick extends Document {
  creator: Types.ObjectId;
  video?: Types.ObjectId;
  product: Types.ObjectId;
  store?: Types.ObjectId;

  title: string;
  description?: string;
  image?: string;
  videoUrl?: string;
  tags: string[];

  // Engagement
  engagement: {
    views: number;
    likes: Types.ObjectId[];
    bookmarks: Types.ObjectId[];
    shares: number;
    clicks: number;
  };

  // Conversion Tracking (aggregated)
  conversions: {
    totalPurchases: number;
    totalRevenue: number;
    totalCommissionEarned: number;
  };

  commissionRate: number;

  status: PickStatus;
  moderationStatus: ModerationStatus;
  moderatedBy?: Types.ObjectId;
  rejectionReason?: string;

  // Merchant Approval (for picks linked to merchant stores)
  merchantApproval?: {
    status: MerchantApprovalStatus;
    merchantId: Types.ObjectId;
    storeId: Types.ObjectId;
    reviewedAt?: Date;
    rejectionReason?: string;
    reward?: {
      type: 'rez_coins' | 'branded_coins' | 'none';
      amount: number;
      coinTransactionId?: Types.ObjectId;
      awardedAt: Date;
    };
  };

  isPublished: boolean;
  isTrending: boolean;
  trendingScore: number;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  incrementViews(): Promise<void>;
  incrementClicks(): Promise<void>;
  toggleLike(userId: Types.ObjectId): Promise<boolean>;
  toggleBookmark(userId: Types.ObjectId): Promise<boolean>;
  incrementShares(): Promise<void>;
}

// ============================================
// SCHEMA
// ============================================

const CreatorPickSchema = new Schema<ICreatorPick>(
  {
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'CreatorProfile',
      required: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    image: String,
    videoUrl: String,
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 10,
        message: 'Maximum 10 tags allowed',
      },
    },

    // Engagement
    engagement: {
      views: { type: Number, default: 0 },
      likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      bookmarks: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      shares: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
    },

    // Conversion Tracking
    conversions: {
      totalPurchases: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      totalCommissionEarned: { type: Number, default: 0 },
    },

    commissionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 50,
    },

    // Merchant Approval
    merchantApproval: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
      },
      merchantId: {
        type: Schema.Types.ObjectId,
        ref: 'Merchant',
      },
      storeId: {
        type: Schema.Types.ObjectId,
        ref: 'Store',
      },
      reviewedAt: Date,
      rejectionReason: String,
      reward: {
        type: {
          type: String,
          enum: ['rez_coins', 'branded_coins', 'none'],
        },
        amount: { type: Number, default: 0 },
        coinTransactionId: {
          type: Schema.Types.ObjectId,
          ref: 'CoinTransaction',
        },
        awardedAt: Date,
      },
    },

    status: {
      type: String,
      enum: ['draft', 'pending_merchant', 'pending_review', 'approved', 'rejected', 'archived'],
      default: 'pending_review',
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: String,

    isPublished: {
      type: Boolean,
      default: false,
    },
    isTrending: {
      type: Boolean,
      default: false,
    },
    trendingScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

CreatorPickSchema.index({ creator: 1, createdAt: -1 });
CreatorPickSchema.index({ status: 1, isPublished: 1 });
CreatorPickSchema.index({ trendingScore: -1 });
CreatorPickSchema.index({ product: 1 });
CreatorPickSchema.index({ store: 1 });
CreatorPickSchema.index({ 'engagement.views': -1 });
CreatorPickSchema.index({ moderationStatus: 1 });
CreatorPickSchema.index({ isPublished: 1, moderationStatus: 1, trendingScore: -1 });
CreatorPickSchema.index({ 'merchantApproval.status': 1, 'merchantApproval.merchantId': 1, store: 1 });

// ============================================
// METHODS
// ============================================

CreatorPickSchema.methods.incrementViews = async function () {
  await (this.constructor as any).updateOne(
    { _id: this._id },
    { $inc: { 'engagement.views': 1 } }
  );
};

CreatorPickSchema.methods.incrementClicks = async function () {
  await (this.constructor as any).updateOne(
    { _id: this._id },
    { $inc: { 'engagement.clicks': 1 } }
  );
};

CreatorPickSchema.methods.toggleLike = async function (userId: Types.ObjectId): Promise<boolean> {
  const isLiked = this.engagement.likes.some(
    (id: Types.ObjectId) => id.toString() === userId.toString()
  );

  if (isLiked) {
    await (this.constructor as any).findByIdAndUpdate(this._id, {
      $pull: { 'engagement.likes': userId }
    });
  } else {
    await (this.constructor as any).findByIdAndUpdate(this._id, {
      $addToSet: { 'engagement.likes': userId }
    });
  }

  return !isLiked;
};

CreatorPickSchema.methods.toggleBookmark = async function (userId: Types.ObjectId): Promise<boolean> {
  const isBookmarked = this.engagement.bookmarks.some(
    (id: Types.ObjectId) => id.toString() === userId.toString()
  );

  if (isBookmarked) {
    await (this.constructor as any).findByIdAndUpdate(this._id, {
      $pull: { 'engagement.bookmarks': userId }
    });
  } else {
    await (this.constructor as any).findByIdAndUpdate(this._id, {
      $addToSet: { 'engagement.bookmarks': userId }
    });
  }

  return !isBookmarked;
};

CreatorPickSchema.methods.incrementShares = async function () {
  await (this.constructor as any).updateOne(
    { _id: this._id },
    { $inc: { 'engagement.shares': 1 } }
  );
};

// ============================================
// EXPORT
// ============================================

export const CreatorPick = mongoose.model<ICreatorPick>('CreatorPick', CreatorPickSchema);
export default CreatorPick;
