import mongoose, { Document, Schema } from 'mongoose';

/**
 * Search History Interface
 * Tracks user search queries for personalization and analytics
 */
export interface ISearchHistory extends Document {
  user: mongoose.Types.ObjectId;
  query: string;
  type: 'product' | 'store' | 'general';
  resultCount: number;
  clicked: boolean;
  filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    location?: string;
    tags?: string[];
  };
  clickedItem?: {
    id: mongoose.Types.ObjectId;
    type: 'product' | 'store';
  };
  createdAt: Date;
}

const searchHistorySchema = new Schema<ISearchHistory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    query: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },
    type: {
      type: String,
      enum: ['product', 'store', 'general'],
      default: 'general',
      required: true
    },
    resultCount: {
      type: Number,
      default: 0,
      min: 0
    },
    clicked: {
      type: Boolean,
      default: false
    },
    filters: {
      category: { type: String },
      minPrice: { type: Number },
      maxPrice: { type: Number },
      rating: { type: Number },
      location: { type: String },
      tags: [{ type: String }]
    },
    clickedItem: {
      id: { type: Schema.Types.ObjectId },
      type: { type: String, enum: ['product', 'store'] }
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 2592000, // Auto-delete after 30 days (TTL index)
      index: true
    }
  },
  {
    timestamps: false, // We only need createdAt, not updatedAt
    collection: 'search_histories'
  }
);

// Compound indexes for efficient queries
searchHistorySchema.index({ user: 1, createdAt: -1 });
searchHistorySchema.index({ user: 1, query: 1, createdAt: -1 });
searchHistorySchema.index({ user: 1, type: 1, createdAt: -1 });

// Static method to clean up old entries beyond limit per user
searchHistorySchema.statics.maintainUserLimit = async function (
  userId: mongoose.Types.ObjectId,
  maxEntries: number = 50
) {
  const count = await this.countDocuments({ user: userId });

  if (count > maxEntries) {
    // Get the oldest entries to delete
    const entriesToDelete = count - maxEntries;
    const oldestEntries = await this.find({ user: userId })
      .sort({ createdAt: 1 })
      .limit(entriesToDelete)
      .select('_id');

    const idsToDelete = oldestEntries.map((entry: any) => entry._id);
    await this.deleteMany({ _id: { $in: idsToDelete } });

    return entriesToDelete;
  }

  return 0;
};

// Static method to check for consecutive duplicate searches
searchHistorySchema.statics.isDuplicate = async function (
  userId: mongoose.Types.ObjectId,
  query: string,
  type: string,
  timeWindowMinutes: number = 5
) {
  const timeAgo = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  const recentSearch = await this.findOne({
    user: userId,
    query: query.toLowerCase().trim(),
    type,
    createdAt: { $gte: timeAgo }
  }).sort({ createdAt: -1 });

  return !!recentSearch;
};

// Static method to get popular searches (for autocomplete)
searchHistorySchema.statics.getPopularSearches = async function (
  userId: mongoose.Types.ObjectId,
  limit: number = 10
) {
  const popularSearches = await this.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: { query: '$query', type: '$type' },
        count: { $sum: 1 },
        lastSearched: { $max: '$createdAt' },
        avgResultCount: { $avg: '$resultCount' },
        clickRate: {
          $avg: { $cond: [{ $eq: ['$clicked', true] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1, lastSearched: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        query: '$_id.query',
        type: '$_id.type',
        count: 1,
        lastSearched: 1,
        avgResultCount: 1,
        clickRate: 1
      }
    }
  ]);

  return popularSearches;
};

// Static method to mark search as clicked
searchHistorySchema.statics.markAsClicked = async function (
  searchId: mongoose.Types.ObjectId,
  itemId: mongoose.Types.ObjectId,
  itemType: 'product' | 'store'
) {
  return await this.findByIdAndUpdate(
    searchId,
    {
      clicked: true,
      clickedItem: { id: itemId, type: itemType }
    },
    { new: true }
  );
};

export const SearchHistory = mongoose.model<ISearchHistory>(
  'SearchHistory',
  searchHistorySchema
);
