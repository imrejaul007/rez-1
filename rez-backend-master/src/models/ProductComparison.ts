import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IProductComparison extends Document<any, any, any, Record<string, any>, {}> {
  _id: string;
  user: mongoose.Types.ObjectId;
  products: mongoose.Types.ObjectId[];
  name?: string; // Custom comparison name
  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface IProductComparisonModel extends Model<IProductComparison> {
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
  
  findComparisonByProducts(userId: string, productIds: string[]): Promise<IProductComparison | null>;
  
  getComparisonStats(userId: string): Promise<{
    totalComparisons: number;
    averageProductsPerComparison: number;
    mostComparedProduct: any;
  }>;
}

const ProductComparisonSchema = new Schema<IProductComparison>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  }],
  name: {
    type: String,
    trim: true,
    maxlength: 100
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
ProductComparisonSchema.index({ user: 1, createdAt: -1 });
ProductComparisonSchema.index({ user: 1, products: 1 });

// Virtual for product info (populated)
ProductComparisonSchema.virtual('productInfo', {
  ref: 'Product',
  localField: 'products',
  foreignField: '_id',
  options: { 
    select: 'name description images pricing ratings inventory cashback store category brand weight specifications deliveryInfo'
  }
});

// Static method to get user's comparisons
ProductComparisonSchema.statics.getUserComparisons = async function(userId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;

  const comparisons = await this.find({ user: new mongoose.Types.ObjectId(userId) })
    .populate({
      path: 'products',
      select: 'name description images pricing ratings inventory cashback store category brand weight specifications deliveryInfo',
      populate: [
        {
          path: 'store',
          select: 'name logo'
        },
        {
          path: 'category',
          select: 'name slug'
        }
      ]
    })
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

// Static method to find comparison by products
ProductComparisonSchema.statics.findComparisonByProducts = async function(userId: string, productIds: string[]) {
  const comparison = await this.findOne({
    user: new mongoose.Types.ObjectId(userId),
    products: { $all: productIds.map(id => new mongoose.Types.ObjectId(id)) }
  }).populate({
    path: 'products',
    select: 'name description images pricing ratings inventory cashback store category brand weight specifications deliveryInfo',
    populate: [
      {
        path: 'store',
        select: 'name logo'
      },
      {
        path: 'category',
        select: 'name slug'
      }
    ]
  });

  return comparison;
};

// Static method to get comparison statistics
ProductComparisonSchema.statics.getComparisonStats = async function(userId: string) {
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalComparisons: { $sum: 1 },
        averageProductsPerComparison: { $avg: { $size: '$products' } },
        mostComparedProduct: { $first: '$products' }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalComparisons: 0,
      averageProductsPerComparison: 0,
      mostComparedProduct: null
    };
  }

  return stats[0];
};

export const ProductComparison = mongoose.model<IProductComparison, IProductComparisonModel>('ProductComparison', ProductComparisonSchema);
export default ProductComparison;
