import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IReview extends Document<any, any, any, Record<string, any>, {}> {
  _id: string;
  store: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  helpful: number;
  verified: boolean;
  isActive: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationReason?: string;
  merchantResponse?: {
    message: string;
    respondedAt: Date;
    respondedBy?: mongoose.Types.ObjectId;
  };
  isFeaturedOnExplore: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface IReviewModel extends Model<IReview> {
  getStoreRatingStats(storeId: string): Promise<{
    average: number;
    count: number;
    distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  }>;
  hasUserReviewed(storeId: string, userId: string): Promise<boolean>;
}

// Additional interfaces for review functionality
export interface IReviewMedia {
  url: string;
  type: 'image' | 'video';
  thumbnail?: string;
  alt?: string;
}

export interface IReviewHelpfulness {
  userId: mongoose.Types.ObjectId;
  helpful: boolean;
  createdAt: Date;
}

export interface IReviewModeration {
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  reason?: string;
  flags: string[];
}

export interface IReviewVerification {
  isVerified: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  verificationMethod: 'automatic' | 'manual' | 'purchase_verified';
}

const ReviewSchema = new Schema<IReview>({
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  images: [{
    type: String,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  }],
  helpful: {
    type: Number,
    default: 0,
    min: 0
  },
  verified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  moderatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Merchant'
  },
  moderatedAt: {
    type: Date
  },
  moderationReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  merchantResponse: {
    message: {
      type: String,
      trim: true,
      maxlength: 500
    },
    respondedAt: {
      type: Date
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant'
    }
  },
  isFeaturedOnExplore: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
ReviewSchema.index({ store: 1, rating: 1 });
ReviewSchema.index({ store: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, store: 1 }, { unique: true }); // One review per user per store
ReviewSchema.index({ store: 1, isActive: 1 });
ReviewSchema.index({ rating: 1, isActive: 1 });
ReviewSchema.index({ store: 1, moderationStatus: 1 });
ReviewSchema.index({ moderationStatus: 1, isActive: 1 });

// Compound index for paginated active reviews per store sorted by newest
ReviewSchema.index({ store: 1, isActive: 1, createdAt: -1 });

// Virtual for user info (populated)
ReviewSchema.virtual('userInfo', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true,
  options: { select: 'profile.name profile.avatar' }
});

// Static method to get store rating statistics
ReviewSchema.statics.getStoreRatingStats = async function(storeId: string) {
  const stats = await this.aggregate([
    { 
      $match: { 
        store: new mongoose.Types.ObjectId(storeId), 
        isActive: true,
        moderationStatus: 'approved' // Only count approved reviews
      } 
    },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' },
        count: { $sum: 1 },
        distribution: {
          $push: '$rating'
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const result = stats[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  result.distribution.forEach((rating: number) => {
    distribution[rating as keyof typeof distribution]++;
  });

  return {
    average: Math.round(result.average * 10) / 10,
    count: result.count,
    distribution
  };
};

// Static method to check if user has reviewed store
ReviewSchema.statics.hasUserReviewed = async function(storeId: string, userId: string) {
  const review = await this.findOne({ 
    store: new mongoose.Types.ObjectId(storeId), 
    user: new mongoose.Types.ObjectId(userId),
    isActive: true,
    moderationStatus: { $in: ['pending', 'approved'] } // Count pending and approved reviews
  });
  return !!review;
};

export const Review = mongoose.model<IReview, IReviewModel>('Review', ReviewSchema);
export default Review;