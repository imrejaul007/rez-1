import mongoose, { Schema, Document, Types } from 'mongoose';

// Video engagement interface
export interface IVideoEngagement {
  views: number;
  likes: Types.ObjectId[];
  shares: number;
  comments: number;
  saves: number;
  reports: number;
}

// Video metadata interface
export interface IVideoMetadata {
  duration: number; // in seconds
  resolution?: string; // "720p", "1080p", etc.
  fileSize?: number; // in bytes
  format?: string; // "mp4", "mov", etc.
  aspectRatio?: string; // "16:9", "9:16", etc.
  fps?: number; // frames per second
}

// Video processing status interface
export interface IVideoProcessing {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  originalUrl?: string;
  processedUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string; // Short preview clip
  errorMessage?: string;
  processedAt?: Date;
}

// Video analytics interface
export interface IVideoAnalytics {
  totalViews: number;
  uniqueViews: number;
  avgWatchTime: number; // in seconds
  completionRate: number; // percentage
  engagementRate: number; // percentage
  shareRate: number; // percentage
  likeRate: number; // percentage
  likes: number;
  comments: number;
  shares: number;
  engagement: number; // calculated engagement score
  viewsByHour: { [hour: string]: number };
  viewsByDate: { [date: string]: number };
  topLocations?: string[];
  deviceBreakdown?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

// Main Video interface
export interface IVideo extends Document {
  title: string;
  description?: string;
  creator: Types.ObjectId;
  contentType: 'merchant' | 'ugc' | 'article_video'; // Type of content
  videoUrl: string;
  thumbnail: string;
  preview?: string;
  category: 'trending_me' | 'trending_her' | 'waist' | 'article' | 'featured' | 'challenge' | 'tutorial' | 'review';
  subcategory?: string;
  tags: string[];
  hashtags: string[];
  associatedArticle?: Types.ObjectId; // Link to Article if contentType is 'article_video'
  products: Types.ObjectId[]; // Associated products for shoppable videos
  stores: Types.ObjectId[]; // Associated stores
  engagement: IVideoEngagement;
  metadata: IVideoMetadata;
  processing: IVideoProcessing;
  analytics: IVideoAnalytics;
  reports: Array<{
    userId: Types.ObjectId;
    reason: string;
    details?: string;
    reportedAt: Date;
  }>;
  reportCount: number;
  isReported: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  isApproved: boolean;
  isTrending: boolean;
  isSponsored: boolean;
  sponsorInfo?: {
    brand: string;
    campaignId?: string;
    isDisclosed: boolean;
  };
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderationReasons?: string[];
  location?: {
    name?: string;
    coordinates?: [number, number];
    city?: string;
    country?: string;
  };
  music?: {
    title: string;
    artist: string;
    url?: string;
    startTime?: number; // in seconds
    duration?: number; // in seconds
  };
  effects?: string[]; // Array of applied effects/filters
  privacy: 'public' | 'private' | 'unlisted';
  allowComments: boolean;
  allowSharing: boolean;
  ageRestriction?: number; // minimum age
  publishedAt?: Date;
  scheduledAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Additional properties for compatibility
  likedBy: Types.ObjectId[]; // Users who liked this video
  bookmarkedBy: Types.ObjectId[]; // Users who bookmarked this video
  comments: Array<{
    user: Types.ObjectId;
    content: string;
    timestamp: Date;
    likes?: Types.ObjectId[];
    replies?: Array<{
      user: Types.ObjectId;
      content: string;
      timestamp: Date;
    }>;
  }>;

  // Reporting methods
  reportVideo(userId: string, reason: string, details?: string): Promise<void>;

  // Methods
  incrementViews(userId?: string): Promise<void>;
  toggleLike(userId: string): Promise<boolean>;
  toggleBookmark(userId: string): Promise<boolean>;
  addComment(userId: string, content: string): Promise<void>;
  share(): Promise<void>;
  updateAnalytics(): Promise<void>;
  isViewableBy(userId?: string): boolean;
}

// Video Schema
const VideoSchema = new Schema<IVideo>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contentType: {
    type: String,
    enum: ['merchant', 'ugc', 'article_video'],
    required: true,
    default: 'ugc',
    index: true
  },
  videoUrl: {
    type: String,
    required: true,
    trim: true
  },
  thumbnail: {
    type: String,
    required: true,
    trim: true
  },
  preview: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review'],
    index: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  hashtags: [{
    type: String,
    trim: true,
    match: [/^#[\w\d_]+$/, 'Hashtags must start with # and contain only letters, numbers, and underscores']
  }],
  associatedArticle: {
    type: Schema.Types.ObjectId,
    ref: 'Article'
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  stores: [{
    type: Schema.Types.ObjectId,
    ref: 'Store'
  }],
  engagement: {
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    likes: [{
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
    },
    saves: {
      type: Number,
      default: 0,
      min: 0
    },
    reports: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  metadata: {
    duration: {
      type: Number,
      required: true,
      min: 1,
      max: 300 // 5 minutes max
    },
    resolution: {
      type: String,
      enum: ['480p', '720p', '1080p', '4K']
    },
    fileSize: {
      type: Number,
      min: 0
    },
    format: {
      type: String,
      enum: ['mp4', 'mov', 'avi', 'webm'],
      default: 'mp4'
    },
    aspectRatio: {
      type: String,
      enum: ['16:9', '9:16', '4:3', '1:1'],
      default: '9:16'
    },
    fps: {
      type: Number,
      min: 24,
      max: 60,
      default: 30
    }
  },
  processing: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    originalUrl: String,
    processedUrl: String,
    thumbnailUrl: String,
    previewUrl: String,
    errorMessage: String,
    processedAt: Date
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
    avgWatchTime: {
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
    viewsByHour: {
      type: Map,
      of: Number,
      default: {}
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
  reports: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: true,
      enum: ['inappropriate', 'misleading', 'spam', 'copyright', 'other']
    },
    details: {
      type: String,
      maxlength: 500
    },
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  reportCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isReported: {
    type: Boolean,
    default: false
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
  isTrending: {
    type: Boolean,
    default: false,
    index: true
  },
  isSponsored: {
    type: Boolean,
    default: false
  },
  sponsorInfo: {
    brand: String,
    campaignId: String,
    isDisclosed: {
      type: Boolean,
      default: true
    }
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending',
    index: true
  },
  moderationReasons: [String],
  location: {
    name: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    city: String,
    country: String
  },
  music: {
    title: String,
    artist: String,
    url: String,
    startTime: {
      type: Number,
      min: 0
    },
    duration: {
      type: Number,
      min: 1
    }
  },
  effects: [String],
  privacy: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  allowSharing: {
    type: Boolean,
    default: true
  },
  ageRestriction: {
    type: Number,
    min: 13,
    max: 21
  },
  publishedAt: {
    type: Date,
    index: true
  },
  scheduledAt: Date,
  expiresAt: Date,
  // User tracking fields
  likedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  bookmarkedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
VideoSchema.index({ creator: 1, isPublished: 1, createdAt: -1 });
VideoSchema.index({ category: 1, isPublished: 1, publishedAt: -1 });
VideoSchema.index({ contentType: 1, isPublished: 1, publishedAt: -1 });
VideoSchema.index({ isFeatured: 1, isPublished: 1 });
VideoSchema.index({ isTrending: 1, isPublished: 1 });
VideoSchema.index({ tags: 1, isPublished: 1 });
VideoSchema.index({ hashtags: 1, isPublished: 1 });
VideoSchema.index({ 'engagement.views': -1, isPublished: 1 });
VideoSchema.index({ 'engagement.likes': -1, isPublished: 1 });
VideoSchema.index({ bookmarkedBy: 1 });
VideoSchema.index({ likedBy: 1 });

// Text search index
VideoSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
  hashtags: 'text'
}, {
  weights: {
    title: 10,
    tags: 5,
    hashtags: 3,
    description: 1
  }
});

// Compound indexes
VideoSchema.index({ category: 1, 'engagement.views': -1, publishedAt: -1 });
VideoSchema.index({ creator: 1, privacy: 1, publishedAt: -1 });

// Virtual for like count
VideoSchema.virtual('likeCount').get(function() {
  return this.engagement.likes.length;
});

// Virtual for engagement score
VideoSchema.virtual('engagementScore').get(function() {
  const views = this.engagement.views || 1;
  const likes = this.engagement.likes.length;
  const comments = this.engagement.comments;
  const shares = this.engagement.shares;
  
  return ((likes * 3 + comments * 2 + shares * 5) / views) * 100;
});

// Virtual for trending score
VideoSchema.virtual('trendingScore').get(function() {
  const ageInHours = (Date.now() - (this.publishedAt?.getTime() || this.createdAt.getTime())) / (1000 * 60 * 60);
  if (ageInHours > 72) return 0; // Only consider videos from last 72 hours
  
  const views = this.engagement.views || 0;
  const likes = this.engagement.likes.length;
  const shares = this.engagement.shares;
  
  // Time decay factor - newer videos get higher score
  const timeFactor = Math.max(0, (72 - ageInHours) / 72);
  
  return (views + likes * 10 + shares * 20) * timeFactor;
});

// Pre-save hooks
VideoSchema.pre('save', function(next) {
  // Set published date when first published
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Update processing status
  if (this.isModified('processing.status') && this.processing.status === 'completed') {
    this.processing.processedAt = new Date();
  }
  
  next();
});

// Method to increment views — uses atomic $inc to avoid race conditions
VideoSchema.methods.incrementViews = async function(userId?: string): Promise<void> {
  const now = new Date();
  const hour = now.getHours().toString();
  const date = now.toISOString().split('T')[0];

  const updateOps: any = {
    $inc: {
      'engagement.views': 1,
      'analytics.totalViews': 1,
      [`analytics.viewsByHour.${hour}`]: 1,
      [`analytics.viewsByDate.${date}`]: 1,
      ...(userId ? { 'analytics.uniqueViews': 1 } : {}),
    },
  };

  await (this.constructor as any).findByIdAndUpdate(this._id, updateOps);
};

// Method to toggle like — uses atomic $addToSet/$pull to avoid race conditions
VideoSchema.methods.toggleLike = async function(userId: string): Promise<boolean> {
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
VideoSchema.methods.toggleBookmark = async function(userId: string): Promise<boolean> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const isBookmarked = (this.bookmarkedBy || []).some((id: Types.ObjectId) => id.equals(userObjectId));

  if (isBookmarked) {
    await (this.constructor as any).findByIdAndUpdate(this._id, {
      $pull: { bookmarkedBy: userObjectId }
    });
  } else {
    await (this.constructor as any).findByIdAndUpdate(this._id, {
      $addToSet: { bookmarkedBy: userObjectId }
    });
  }

  // Recalculate engagement.saves count atomically
  const updated = await (this.constructor as any).findById(this._id).select('bookmarkedBy');
  if (updated) {
    await (this.constructor as any).findByIdAndUpdate(this._id, {
      $set: { 'engagement.saves': updated.bookmarkedBy.length }
    });
  }

  return !isBookmarked;
};

// Method to add comment (simplified) — uses atomic $inc to avoid race conditions
VideoSchema.methods.addComment = async function(userId: string, content: string): Promise<void> {
  // In a full implementation, this would create a Comment document
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { 'engagement.comments': 1 }
  });
};

// Method to increment shares — uses atomic $inc to avoid race conditions
VideoSchema.methods.share = async function(): Promise<void> {
  const result = await (this.constructor as any).findByIdAndUpdate(
    this._id,
    { $inc: { 'engagement.shares': 1 } },
    { new: true }
  );
  if (result) {
    this.engagement.shares = result.engagement.shares;
    if (result.engagement?.views > 0) {
      await (this.constructor as any).findByIdAndUpdate(this._id, {
        $set: { 'analytics.shareRate': (result.engagement.shares / result.engagement.views) * 100 }
      });
    }
  }
};

// Method to update analytics
VideoSchema.methods.updateAnalytics = async function(): Promise<void> {
  const views = this.engagement.views || 1;
  const likes = this.engagement.likes.length;
  const comments = this.engagement.comments;
  const shares = this.engagement.shares;

  this.analytics.engagementRate = ((likes + comments + shares) / views) * 100;
  this.analytics.likeRate = (likes / views) * 100;
  this.analytics.shareRate = (shares / views) * 100;

  await this.save();
};

// Method to report video
VideoSchema.methods.reportVideo = async function(userId: string, reason: string, details?: string): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Check if user already reported this video
  const alreadyReported = this.reports.some((report: any) =>
    report.userId.equals(userObjectId)
  );

  if (!alreadyReported) {
    this.reports.push({
      userId: userObjectId,
      reason,
      details: details || '',
      reportedAt: new Date()
    });

    this.reportCount = this.reports.length;

    // Auto-flag video if it has 5+ reports
    if (this.reportCount >= 5) {
      this.isReported = true;
      this.moderationStatus = 'flagged';
    }

    await this.save();
  }
};

// Method to check if video is viewable by user
VideoSchema.methods.isViewableBy = function(userId?: string): boolean {
  if (!this.isPublished || !this.isApproved) return false;
  if (this.privacy === 'private' && this.creator.toString() !== userId) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  
  return true;
};

// Static method to get trending videos
VideoSchema.statics.getTrending = function(category?: string, limit: number = 20) {
  const query: any = {
    isPublished: true,
    isApproved: true,
    privacy: 'public',
    publishedAt: { $gte: new Date(Date.now() - 72 * 60 * 60 * 1000) } // Last 72 hours
  };
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  return this.find(query)
    .populate('creator', 'profile.firstName profile.lastName profile.avatar')
    .populate('products', 'name images pricing')
    .sort({ 'engagement.views': -1, 'engagement.likes': -1 })
    .limit(limit);
};

// Static method to get featured videos
VideoSchema.statics.getFeatured = function(limit: number = 10) {
  return this.find({
    isFeatured: true,
    isPublished: true,
    isApproved: true,
    privacy: 'public'
  })
  .populate('creator', 'profile.firstName profile.lastName profile.avatar')
  .sort({ publishedAt: -1 })
  .limit(limit);
};

// Static method to search videos
VideoSchema.statics.searchVideos = function(
  searchText: string,
  filters: any = {},
  options: any = {}
) {
  const query: any = {
    $text: { $search: searchText },
    isPublished: true,
    isApproved: true,
    privacy: 'public'
  };
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.creator) {
    query.creator = filters.creator;
  }
  
  if (filters.hasProducts) {
    query.products = { $exists: true, $not: { $size: 0 } };
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('creator', 'profile.firstName profile.lastName profile.avatar')
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

export const Video = mongoose.model<IVideo>('Video', VideoSchema);