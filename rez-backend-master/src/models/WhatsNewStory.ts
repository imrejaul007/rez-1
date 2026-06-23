// WhatsNewStory Model
// Manages promotional stories displayed when users tap "What's New" badge

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

// Interface for story slides
export interface IStorySlide {
  image: string;
  backgroundColor?: string;
  overlayText?: string;
  duration: number; // Auto-advance time in ms (default 5000)
}

// Interface for CTA button
export interface IStoryCTA {
  text: string;
  action: 'link' | 'screen' | 'deeplink';
  target: string; // URL or screen name
}

// Interface for targeting
export interface IStoryTargeting {
  userTypes?: ('new' | 'returning' | 'premium' | 'all')[];
  locations?: string[];
  categories?: string[];
}

// Interface for validity period
export interface IStoryValidity {
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

// Interface for analytics
export interface IStoryAnalytics {
  views: number;
  clicks: number;
  completions: number;
}

// Story type for categorisation
export type StoryType = 'new_offer' | 'new_feature' | 'cashback_boost' | 'event' | 'general';

// Metadata for auto-generated stories
export interface IStoryMetadata {
  sourceType?: 'campaign' | 'feature' | 'manual';
  sourceId?: string;
}

export interface IWhatsNewStory extends Document {
  _id: Types.ObjectId;
  title: string;
  subtitle?: string;
  icon: string;
  storyType: StoryType;
  slides: IStorySlide[];
  ctaButton?: IStoryCTA;
  validity: IStoryValidity;
  targeting?: IStoryTargeting;
  priority: number;
  analytics: IStoryAnalytics;
  metadata?: IStoryMetadata;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isCurrentlyActive(): boolean;
  incrementView(): Promise<void>;
  incrementClick(): Promise<void>;
  incrementCompletion(): Promise<void>;
  isTargetedForUser(userData?: any): boolean;
}

// Interface for static methods
export interface IWhatsNewStoryModel extends Model<IWhatsNewStory> {
  findActiveStories(): Promise<IWhatsNewStory[]>;
  findStoriesForUser(userData?: any): Promise<IWhatsNewStory[]>;
  findExpiredStories(): Promise<IWhatsNewStory[]>;
  findUpcomingStories(): Promise<IWhatsNewStory[]>;
}

const StorySlideSchema = new Schema<IStorySlide>({
  image: {
    type: String,
    required: [true, 'Slide image is required'],
  },
  backgroundColor: {
    type: String,
    default: '#000000',
  },
  overlayText: {
    type: String,
    trim: true,
    maxlength: [200, 'Overlay text cannot exceed 200 characters'],
  },
  duration: {
    type: Number,
    default: 5000,
    min: [1000, 'Duration must be at least 1 second'],
    max: [30000, 'Duration cannot exceed 30 seconds'],
  },
}, { _id: false });

const StoryCTASchema = new Schema<IStoryCTA>({
  text: {
    type: String,
    required: [true, 'CTA text is required'],
    trim: true,
    maxlength: [50, 'CTA text cannot exceed 50 characters'],
  },
  action: {
    type: String,
    enum: ['link', 'screen', 'deeplink'],
    default: 'screen',
  },
  target: {
    type: String,
    required: [true, 'CTA target is required'],
  },
}, { _id: false });

const WhatsNewStorySchema = new Schema<IWhatsNewStory>({
  title: {
    type: String,
    required: [true, 'Story title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
    index: true,
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Subtitle cannot exceed 200 characters'],
  },
  icon: {
    type: String,
    required: [true, 'Story icon is required'],
  },
  slides: {
    type: [StorySlideSchema],
    required: [true, 'At least one slide is required'],
    validate: {
      validator: function(v: IStorySlide[]) {
        return v && v.length > 0 && v.length <= 10;
      },
      message: 'Story must have 1-10 slides',
    },
  },
  ctaButton: {
    type: StoryCTASchema,
  },
  validity: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  targeting: {
    userTypes: [{
      type: String,
      enum: ['new', 'returning', 'premium', 'all'],
    }],
    locations: [{
      type: String,
      trim: true,
    }],
    categories: [{
      type: String,
      trim: true,
    }],
  },
  priority: {
    type: Number,
    default: 0,
    index: true,
  },
  analytics: {
    views: {
      type: Number,
      default: 0,
      min: [0, 'Views cannot be negative'],
    },
    clicks: {
      type: Number,
      default: 0,
      min: [0, 'Clicks cannot be negative'],
    },
    completions: {
      type: Number,
      default: 0,
      min: [0, 'Completions cannot be negative'],
    },
  },
  storyType: {
    type: String,
    enum: ['new_offer', 'new_feature', 'cashback_boost', 'event', 'general'],
    default: 'general',
    index: true,
  },
  metadata: {
    sourceType: {
      type: String,
      enum: ['campaign', 'feature', 'manual'],
    },
    sourceId: {
      type: String,
      index: true,
    },
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
WhatsNewStorySchema.index({ 'validity.isActive': 1, 'validity.startDate': 1, 'validity.endDate': 1 });
WhatsNewStorySchema.index({ priority: -1, 'validity.isActive': 1 });

// Instance methods
WhatsNewStorySchema.methods.isCurrentlyActive = function(): boolean {
  const now = new Date();
  return this.validity.isActive &&
         now >= this.validity.startDate &&
         now <= this.validity.endDate;
};

WhatsNewStorySchema.methods.incrementView = async function(): Promise<void> {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { 'analytics.views': 1 }
  });
};

WhatsNewStorySchema.methods.incrementClick = async function(): Promise<void> {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { 'analytics.clicks': 1 }
  });
};

WhatsNewStorySchema.methods.incrementCompletion = async function(): Promise<void> {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { 'analytics.completions': 1 }
  });
};

WhatsNewStorySchema.methods.isTargetedForUser = function(userData?: any): boolean {
  // If no targeting criteria, show to all users
  if (!this.targeting?.userTypes?.length &&
      !this.targeting?.locations?.length &&
      !this.targeting?.categories?.length) {
    return true;
  }

  // Check user type targeting
  if (this.targeting?.userTypes?.length) {
    if (!this.targeting.userTypes.includes('all')) {
      if (!userData?.userType || !this.targeting.userTypes.includes(userData.userType)) {
        return false;
      }
    }
  }

  // Check location targeting
  if (this.targeting?.locations?.length) {
    const userLocation = userData?.location;
    if (userLocation) {
      const userCity = userLocation.city || userLocation.state;
      if (!this.targeting.locations.some((loc: string) =>
        loc.toLowerCase().includes(userCity?.toLowerCase() || '')
      )) {
        return false;
      }
    }
  }

  // Check category targeting
  if (this.targeting?.categories?.length) {
    const userInterests = userData?.interests || userData?.categories;
    if (userInterests) {
      const hasMatchingInterest = this.targeting.categories.some((cat: string) =>
        userInterests.some((interest: string) =>
          interest.toLowerCase().includes(cat.toLowerCase())
        )
      );
      if (!hasMatchingInterest) {
        return false;
      }
    }
  }

  return true;
};

// Static methods
WhatsNewStorySchema.statics.findActiveStories = function(): Promise<IWhatsNewStory[]> {
  const now = new Date();
  return this.find({
    'validity.isActive': true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now },
  }).sort({ priority: -1, createdAt: -1 });
};

WhatsNewStorySchema.statics.findStoriesForUser = function(userData?: any): Promise<IWhatsNewStory[]> {
  const now = new Date();
  return this.find({
    'validity.isActive': true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now },
  })
    .sort({ priority: -1, createdAt: -1 })
    .lean()
    .then((stories: IWhatsNewStory[]) =>
      stories.filter((story: any) => {
        // Manually check targeting since lean() doesn't include methods
        if (!story.targeting?.userTypes?.length &&
            !story.targeting?.locations?.length &&
            !story.targeting?.categories?.length) {
          return true;
        }
        // Simplified targeting check for lean documents
        if (story.targeting?.userTypes?.length) {
          if (!story.targeting.userTypes.includes('all')) {
            if (!userData?.userType || !story.targeting.userTypes.includes(userData.userType)) {
              return false;
            }
          }
        }
        return true;
      })
    );
};

WhatsNewStorySchema.statics.findExpiredStories = function(): Promise<IWhatsNewStory[]> {
  const now = new Date();
  return this.find({
    'validity.endDate': { $lt: now },
    'validity.isActive': true,
  });
};

WhatsNewStorySchema.statics.findUpcomingStories = function(): Promise<IWhatsNewStory[]> {
  const now = new Date();
  return this.find({
    'validity.startDate': { $gt: now },
    'validity.isActive': true,
  }).sort({ 'validity.startDate': 1 });
};

// Pre-save middleware
WhatsNewStorySchema.pre('save', function(next) {
  // Validate that end date is after start date
  if (this.validity.endDate <= this.validity.startDate) {
    next(new Error('End date must be after start date'));
    return;
  }
  next();
});

// Create and export the model
const WhatsNewStory = mongoose.model<IWhatsNewStory, IWhatsNewStoryModel>('WhatsNewStory', WhatsNewStorySchema);

export default WhatsNewStory;
