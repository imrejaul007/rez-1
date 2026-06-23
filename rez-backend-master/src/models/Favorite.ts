import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IFavorite extends Document<any, any, any, Record<string, any>, {}> {
  _id: string;
  user: mongoose.Types.ObjectId;
  store: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for static methods
export interface IFavoriteModel extends Model<IFavorite> {
  isStoreFavorited(userId: string, storeId: string): Promise<boolean>;
  
  getUserFavorites(userId: string, page?: number, limit?: number): Promise<{
    favorites: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalFavorites: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }>;
}

const FavoriteSchema = new Schema<IFavorite>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure one favorite per user per store
FavoriteSchema.index({ user: 1, store: 1 }, { unique: true });

// Virtual for store info (populated)
FavoriteSchema.virtual('storeInfo', {
  ref: 'Store',
  localField: 'store',
  foreignField: '_id',
  justOne: true,
  options: { 
    select: 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified' 
  }
});

// Static method to check if store is favorited by user
FavoriteSchema.statics.isStoreFavorited = async function(userId: string, storeId: string) {
  const favorite = await this.findOne({ 
    user: new mongoose.Types.ObjectId(userId), 
    store: new mongoose.Types.ObjectId(storeId) 
  });
  return !!favorite;
};

// Static method to get user's favorite stores
FavoriteSchema.statics.getUserFavorites = async function(userId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;
  
  const favorites = await this.find({ user: new mongoose.Types.ObjectId(userId) })
    .populate('store', 'name logo description location ratings operationalInfo deliveryCategories isActive isFeatured isVerified')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await this.countDocuments({ user: new mongoose.Types.ObjectId(userId) });

  return {
    favorites,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalFavorites: total,
      hasNextPage: skip + favorites.length < total,
      hasPrevPage: page > 1
    }
  };
};

export const Favorite = mongoose.model<IFavorite, IFavoriteModel>('Favorite', FavoriteSchema);
export default Favorite;
