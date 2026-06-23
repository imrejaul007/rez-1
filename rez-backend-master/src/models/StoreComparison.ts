import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IStoreComparison extends Document<any, any, any, Record<string, any>, {}> {
  _id: string;
  user: mongoose.Types.ObjectId;
  stores: mongoose.Types.ObjectId[];
  name?: string; // Custom comparison name
  isFeaturedOnExplore: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface IStoreComparisonModel extends Model<IStoreComparison> {
  getUserComparisons(userId: string, page?: number, limit?: number): Promise<{
    comparisons: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalComparisons: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>;
  
  findComparisonByStores(userId: string, storeIds: string[]): Promise<IStoreComparison | null>;
  
  getComparisonStats(userId: string): Promise<{
    totalComparisons: number;
    averageStoresPerComparison: number;
    mostComparedStore: any;
  }>;
}

const StoreComparisonSchema = new Schema<IStoreComparison>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  stores: [{
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  }],
  name: {
    type: String,
    trim: true,
    maxlength: 100
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
StoreComparisonSchema.index({ user: 1, createdAt: -1 });
StoreComparisonSchema.index({ user: 1, stores: 1 });

// Virtual for store info (populated)
StoreComparisonSchema.virtual('storeInfo', {
  ref: 'Store',
  localField: 'stores',
  foreignField: '_id',
  options: { 
    select: 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified' 
  }
});

// Static method to get user's comparisons
StoreComparisonSchema.statics.getUserComparisons = async function(userId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;
  
  const comparisons = await this.find({ user: new mongoose.Types.ObjectId(userId) })
    .populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await this.countDocuments({ user: new mongoose.Types.ObjectId(userId) });

  return {
    comparisons,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalComparisons: total,
      hasNextPage: skip + comparisons.length < total,
      hasPrevPage: page > 1
    }
  };
};

// Static method to find comparison by stores
StoreComparisonSchema.statics.findComparisonByStores = async function(userId: string, storeIds: string[]) {
  const comparison = await this.findOne({
    user: new mongoose.Types.ObjectId(userId),
    stores: { $all: storeIds.map(id => new mongoose.Types.ObjectId(id)) }
  }).populate('stores', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified');

  return comparison;
};

// Static method to get comparison statistics
StoreComparisonSchema.statics.getComparisonStats = async function(userId: string) {
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalComparisons: { $sum: 1 },
        averageStoresPerComparison: { $avg: { $size: '$stores' } },
        mostComparedStore: { $first: '$stores' }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalComparisons: 0,
      averageStoresPerComparison: 0,
      mostComparedStore: null
    };
  }

  return stats[0];
};

export const StoreComparison = mongoose.model<IStoreComparison, IStoreComparisonModel>('StoreComparison', StoreComparisonSchema);
export default StoreComparison;
