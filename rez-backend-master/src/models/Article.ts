import mongoose, { Schema, Document, Types } from 'mongoose';

// Article engagement interface
export interface IArticleEngagement {
  likes: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
  shares: number;
  comments: number;
}

// Article analytics interface
export interface IArticleAnalytics {
  totalViews: number;
  uniqueViews: number;
  avgReadTime: number; // in seconds
  completionRate: number; // percentage
  engagementRate: number; // percentage
  shareRate: number; // percentage
  likeRate: number; // percentage
  viewsByDate: { [date: string]: number };
  topLocations?: string[];
  deviceBreakdown?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

// Main Article interface
export interface IArticle extends Document {
  title: string;
  excerpt: string;
  content: string; // Markdown or HTML
  coverImage: string;
  author: Types.ObjectId;
  authorType: 'user' | 'merchant';
  category: 'fashion' | 'beauty' | 'lifestyle' | 'tech' | 'general';
  tags: string[];
  products: Types.ObjectId[]; // Associated products
  stores: Types.ObjectId[]; // Associated stores
  engagement: IArticleEngagement;
  analytics: IArticleAnalytics;
  readTime: string; // e.g., "5 min read"
  isPublished: boolean;
  isFeatured: boolean;
  isApproved: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderationReasons?: string[];
  publishedAt?: Date;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  readonly likeCount?: number;
  readonly bookmarkCount?: number;
  readonly engagementScore?: number;
  readonly viewCount?: string;

  // Methods
  incrementViews(userId?: string): Promise<void>;
  toggleLike(userId: string): Promise<boolean>;
  toggleBookmark(userId: string): Promise<boolean>;
  share(): Promise<void>;
  updateAnalytics(): Promise<void>;
  isViewableBy(userId?: string): boolean;
}

// Article Schema
const ArticleSchema = new Schema<IArticle>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  excerpt: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  coverImage: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  authorType: {
    type: String,
    enum: ['user', 'merchant'],
    required: true,
    default: 'user'
  },
  category: {
    type: String,
    required: true,
    enum: ['fashion', 'beauty', 'lifestyle', 'tech', 'general'],
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  stores: [{
    type: Schema.Types.ObjectId,
    ref: 'Store'
  }],
  engagement: {
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    bookmarks: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    shares: {
      type: Number,
      default: 0,
      min: 0
    },
    comments: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  analytics: {
    totalViews: {
      type: Number,
      default: 0,
      min: 0
    },
    uniqueViews: {
      type: Number,
      default: 0,
      min: 0
    },
    avgReadTime: {
      type: Number,
      default: 0,
      min: 0
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    engagementRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    shareRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    likeRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    viewsByDate: {
      type: Map,
      of: Number,
      default: {}
    },
    topLocations: [String],
    deviceBreakdown: {
      mobile: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 },
      desktop: { type: Number, default: 0 }
    }
  },
  readTime: {
    type: String,
    required: true,
    default: '5 min read'
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending',
    index: true
  },
  moderationReasons: [String],
  publishedAt: {
    type: Date,
    index: true
  },
  scheduledAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ArticleSchema.index({ author: 1, isPublished: 1, createdAt: -1 });
ArticleSchema.index({ category: 1, isPublished: 1, publishedAt: -1 });
ArticleSchema.index({ isFeatured: 1, isPublished: 1 });
ArticleSchema.index({ tags: 1, isPublished: 1 });
ArticleSchema.index({ 'analytics.totalViews': -1, isPublished: 1 });
ArticleSchema.index({ publishedAt: -1 });

// Text search index
ArticleSchema.index({
  title: 'text',
  excerpt: 'text',
  content: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    excerpt: 5,
    tags: 3,
    content: 1
  }
});

// Compound indexes
ArticleSchema.index({ category: 1, 'analytics.totalViews': -1, publishedAt: -1 });
ArticleSchema.index({ author: 1, publishedAt: -1 });

// Virtual for like count
ArticleSchema.virtual('likeCount').get(function() {
  return this.engagement.likes.length;
});

// Virtual for bookmark count
ArticleSchema.virtual('bookmarkCount').get(function() {
  return this.engagement.bookmarks.length;
});

// Virtual for engagement score
ArticleSchema.virtual('engagementScore').get(function() {
  const views = this.analytics.totalViews || 1;
  const likes = this.engagement.likes.length;
  const bookmarks = this.engagement.bookmarks.length;
  const comments = this.engagement.comments;
  const shares = this.engagement.shares;

  return ((likes * 3 + bookmarks * 2 + comments * 2 + shares * 5) / views) * 100;
});

// Virtual for view count display
ArticleSchema.virtual('viewCount').get(function() {
  const views = this.analytics.totalViews;
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
});

// Pre-save hooks
ArticleSchema.pre('save', function(next) {
  // Set published date when first published
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Calculate read time based on content length
  if (this.isModified('content')) {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    this.readTime = `${minutes} min read`;
  }

  next();
});

// Method to increment views — uses atomic $inc to avoid race conditions
ArticleSchema.methods.incrementViews = async function(userId?: string): Promise<void> {
  const now = new Date();
  const date = now.toISOString().split('T')[0];

  const updateOps: any = {
    $inc: {
      'analytics.totalViews': 1,
      [`analytics.viewsByDate.${date}`]: 1,
      ...(userId ? { 'analytics.uniqueViews': 1 } : {}),
    },
  };

  await (this.constructor as any).findByIdAndUpdate(this._id, updateOps);
};

// Method to toggle like — uses atomic $addToSet/$pull to avoid race conditions
ArticleSchema.methods.toggleLike = async function(userId: string): Promise<boolean> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const isLiked = this.engagement.likes.some((id: Types.ObjectId) => id.equals(userObjectId));

  if (isLiked) {
    await (this.constructor as any).findByIdAndUpdate(this._id, {
      $pull: { 'engagement.likes': userObjectId }
    });
  } else {
    await (this.constructor as any).findByIdAndUpdate(this._id, {
      $addToSet: { 'engagement.likes': userObjectId }
    });
  }

  return !isLiked;
};

// Method to toggle bookmark — uses atomic $addToSet/$pull to avoid race conditions
ArticleSchema.methods.toggleBookmark = async function(userId: string): Promise<boolean> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const isBookmarked = this.engagement.bookmarks.some((id: Types.ObjectId) => id.equals(userObjectId));

  if (isBookmarked) {
    await (this.constructor as any).findByIdAndUpdate(this._id, {
      $pull: { 'engagement.bookmarks': userObjectId }
    });
  } else {
    await (this.constructor as any).findByIdAndUpdate(this._id, {
      $addToSet: { 'engagement.bookmarks': userObjectId }
    });
  }

  return !isBookmarked;
};

// Method to increment shares — uses atomic $inc to avoid race conditions
ArticleSchema.methods.share = async function(): Promise<void> {
  const result = await (this.constructor as any).findByIdAndUpdate(
    this._id,
    { $inc: { 'engagement.shares': 1 } },
    { new: true }
  );
  if (result) {
    this.engagement.shares = result.engagement.shares;
    if (result.analytics?.totalViews > 0) {
      await (this.constructor as any).findByIdAndUpdate(this._id, {
        $set: { 'analytics.shareRate': (result.engagement.shares / result.analytics.totalViews) * 100 }
      });
    }
  }
};

// Method to update analytics
ArticleSchema.methods.updateAnalytics = async function(): Promise<void> {
  const views = this.analytics.totalViews || 1;
  const likes = this.engagement.likes.length;
  const bookmarks = this.engagement.bookmarks.length;
  const comments = this.engagement.comments;
  const shares = this.engagement.shares;

  this.analytics.engagementRate = ((likes + bookmarks + comments + shares) / views) * 100;
  this.analytics.likeRate = (likes / views) * 100;
  this.analytics.shareRate = (shares / views) * 100;

  await this.save();
};

// Method to check if article is viewable by user
ArticleSchema.methods.isViewableBy = function(userId?: string): boolean {
  if (!this.isPublished || !this.isApproved) {
    // Only author can view unpublished articles
    return this.author.toString() === userId;
  }

  return true;
};

// Static method to get featured articles
ArticleSchema.statics.getFeatured = function(limit: number = 10) {
  return this.find({
    isFeatured: true,
    isPublished: true,
    isApproved: true
  })
  .populate('author', 'profile.firstName profile.lastName profile.avatar')
  .populate('products', 'name images pricing')
  .sort({ publishedAt: -1 })
  .limit(limit);
};

// Static method to get articles by category
ArticleSchema.statics.getByCategory = function(category: string, limit: number = 20) {
  return this.find({
    category,
    isPublished: true,
    isApproved: true
  })
  .populate('author', 'profile.firstName profile.lastName profile.avatar')
  .populate('products', 'name images pricing')
  .sort({ publishedAt: -1 })
  .limit(limit);
};

// Static method to search articles
ArticleSchema.statics.searchArticles = function(
  searchText: string,
  filters: any = {},
  options: any = {}
) {
  const query: any = {
    $text: { $search: searchText },
    isPublished: true,
    isApproved: true
  };

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.author) {
    query.author = filters.author;
  }

  if (filters.hasProducts) {
    query.products = { $exists: true, $not: { $size: 0 } };
  }

  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('author', 'profile.firstName profile.lastName profile.avatar')
    .populate('products', 'name images pricing')
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Static method to get trending articles (most viewed in last 7 days)
ArticleSchema.statics.getTrending = function(limit: number = 10) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return this.find({
    isPublished: true,
    isApproved: true,
    publishedAt: { $gte: sevenDaysAgo }
  })
  .populate('author', 'profile.firstName profile.lastName profile.avatar')
  .populate('products', 'name images pricing')
  .sort({ 'analytics.totalViews': -1, 'engagement.likes': -1 })
  .limit(limit);
};

export const Article = mongoose.model<IArticle>('Article', ArticleSchema);
