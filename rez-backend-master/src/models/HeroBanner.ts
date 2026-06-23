// HeroBanner Model
// Manages hero banners for the offers page and other promotional content

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface IHeroBanner extends Document {
  _id: Types.ObjectId;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  ctaText: string;
  ctaAction: string;
  ctaUrl?: string;
  backgroundColor: string;
  textColor?: string;
  isActive: boolean;
  priority: number;
  validFrom: Date;
  validUntil: Date;
  targetAudience: {
    userTypes?: ('student' | 'new_user' | 'premium' | 'all')[];
    ageRange?: {
      min?: number;
      max?: number;
    };
    locations?: string[];
    categories?: string[];
  };
  analytics: {
    views: number;
    clicks: number;
    conversions: number;
  };
  metadata: {
    page: 'offers' | 'home' | 'category' | 'product' | 'all';
    position: 'top' | 'middle' | 'bottom';
    size: 'small' | 'medium' | 'large' | 'full';
    animation?: string;
    tags: string[];
    colors?: string[];
    shareBonus?: number;
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  isCurrentlyActive(): boolean;
  incrementView(): Promise<void>;
  incrementClick(): Promise<void>;
  incrementConversion(): Promise<void>;
  isTargetedForUser(userData?: any): boolean;
}

// Interface for static methods
export interface IHeroBannerModel extends Model<IHeroBanner> {
  findActiveBanners(page?: string, position?: string): Promise<IHeroBanner[]>;
  findBannersForUser(userData?: any, page?: string): Promise<IHeroBanner[]>;
  findExpiredBanners(): Promise<IHeroBanner[]>;
  findUpcomingBanners(): Promise<IHeroBanner[]>;
}

const HeroBannerSchema = new Schema<IHeroBanner>({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
    index: true
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Subtitle cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  image: {
    type: String,
    required: [true, 'Banner image is required'],
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|svg)$/i.test(v);
      },
      message: 'Image must be a valid URL'
    }
  },
  ctaText: {
    type: String,
    required: [true, 'CTA text is required'],
    trim: true,
    maxlength: [50, 'CTA text cannot exceed 50 characters']
  },
  ctaAction: {
    type: String,
    required: [true, 'CTA action is required'],
    enum: ['navigate', 'external_link', 'modal', 'download', 'share'],
    default: 'navigate'
  },
  ctaUrl: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v) || /^\/.+/.test(v);
      },
      message: 'CTA URL must be a valid URL or path'
    }
  },
  backgroundColor: {
    type: String,
    required: [true, 'Background color is required'],
    validate: {
      validator: function(v: string) {
        return /^#[0-9A-F]{6}$/i.test(v) || /^rgb\(/.test(v) || /^rgba\(/.test(v);
      },
      message: 'Background color must be a valid color code'
    }
  },
  textColor: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^#[0-9A-F]{6}$/i.test(v) || /^rgb\(/.test(v) || /^rgba\(/.test(v);
      },
      message: 'Text color must be a valid color code'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  priority: {
    type: Number,
    default: 0,
    index: true
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
    index: true
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required'],
    index: true
  },
  targetAudience: {
    userTypes: [{
      type: String,
      enum: ['student', 'new_user', 'premium', 'all']
    }],
    ageRange: {
      min: {
        type: Number,
        min: [0, 'Minimum age cannot be negative'],
        max: [120, 'Minimum age cannot exceed 120']
      },
      max: {
        type: Number,
        min: [0, 'Maximum age cannot be negative'],
        max: [120, 'Maximum age cannot exceed 120']
      }
    },
    locations: [{
      type: String,
      trim: true
    }],
    categories: [{
      type: String,
      trim: true
    }]
  },
  analytics: {
    views: {
      type: Number,
      default: 0,
      min: [0, 'Views count cannot be negative']
    },
    clicks: {
      type: Number,
      default: 0,
      min: [0, 'Clicks count cannot be negative']
    },
    conversions: {
      type: Number,
      default: 0,
      min: [0, 'Conversions count cannot be negative']
    }
  },
  metadata: {
    page: {
      type: String,
      enum: ['offers', 'home', 'category', 'product', 'all'],
      default: 'all',
      index: true
    },
    position: {
      type: String,
      enum: ['top', 'middle', 'bottom'],
      default: 'top',
      index: true
    },
    size: {
      type: String,
      enum: ['small', 'medium', 'large', 'full'],
      default: 'medium'
    },
    animation: {
      type: String,
      enum: ['fade', 'slide', 'bounce', 'pulse', 'none'],
      default: 'fade'
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    colors: [{
      type: String,
      trim: true
    }],
    shareBonus: {
      type: Number,
      default: 50,
      min: [0, 'Share bonus cannot be negative']
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
HeroBannerSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
HeroBannerSchema.index({ 'metadata.page': 1, 'metadata.position': 1, isActive: 1 });
HeroBannerSchema.index({ priority: -1, isActive: 1 });
HeroBannerSchema.index({ validFrom: 1, validUntil: 1, isActive: 1 });

// Instance methods
HeroBannerSchema.methods.isCurrentlyActive = function(): boolean {
  const now = new Date();
  return this.isActive && 
         now >= this.validFrom && 
         now <= this.validUntil;
};

HeroBannerSchema.methods.incrementView = async function(): Promise<void> {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { 'analytics.views': 1 }
  });
};

HeroBannerSchema.methods.incrementClick = async function(): Promise<void> {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { 'analytics.clicks': 1 }
  });
};

HeroBannerSchema.methods.incrementConversion = async function(): Promise<void> {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { 'analytics.conversions': 1 }
  });
};

HeroBannerSchema.methods.isTargetedForUser = function(userData?: any): boolean {
  // If no targeting criteria, show to all users
  if (!this.targetAudience.userTypes?.length && 
      !this.targetAudience.ageRange && 
      !this.targetAudience.locations?.length && 
      !this.targetAudience.categories?.length) {
    return true;
  }

  // Check user type targeting
  if (this.targetAudience.userTypes?.length) {
    if (!this.targetAudience.userTypes.includes('all')) {
      if (!userData?.userType || !this.targetAudience.userTypes.includes(userData.userType)) {
        return false;
      }
    }
  }

  // Check age targeting
  if (this.targetAudience.ageRange) {
    const userAge = userData?.age;
    if (userAge) {
      if (this.targetAudience.ageRange.min && userAge < this.targetAudience.ageRange.min) {
        return false;
      }
      if (this.targetAudience.ageRange.max && userAge > this.targetAudience.ageRange.max) {
        return false;
      }
    }
  }

  // Check location targeting
  if (this.targetAudience.locations?.length) {
    const userLocation = userData?.location;
    if (userLocation) {
      const userCity = userLocation.city || userLocation.state;
      if (!this.targetAudience.locations.some((loc: string) => 
        loc.toLowerCase().includes(userCity?.toLowerCase() || '')
      )) {
        return false;
      }
    }
  }

  // Check category targeting
  if (this.targetAudience.categories?.length) {
    const userInterests = userData?.interests || userData?.categories;
    if (userInterests) {
      const hasMatchingInterest = this.targetAudience.categories.some((cat: string) =>
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
HeroBannerSchema.statics.findActiveBanners = function(page?: string, position?: string): Promise<IHeroBanner[]> {
  const now = new Date();
  const query: any = {
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  };

  if (page) {
    query.$or = [
      { 'metadata.page': page },
      { 'metadata.page': 'all' }
    ];
  }

  if (position) {
    query['metadata.position'] = position;
  }

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 });
};

HeroBannerSchema.statics.findBannersForUser = function(userData?: any, page?: string): Promise<IHeroBanner[]> {
  const now = new Date();
  const query: any = {
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  };

  if (page) {
    query.$or = [
      { 'metadata.page': page },
      { 'metadata.page': 'all' }
    ];
  }

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .lean()
    .then((banners: IHeroBanner[]) => banners.filter((banner: IHeroBanner) => banner.isTargetedForUser(userData)));
};

HeroBannerSchema.statics.findExpiredBanners = function(): Promise<IHeroBanner[]> {
  const now = new Date();
  return this.find({
    validUntil: { $lt: now },
    isActive: true
  });
};

HeroBannerSchema.statics.findUpcomingBanners = function(): Promise<IHeroBanner[]> {
  const now = new Date();
  return this.find({
    validFrom: { $gt: now },
    isActive: true
  }).sort({ validFrom: 1 });
};

// Pre-save middleware
HeroBannerSchema.pre('save', function(next) {
  // Validate that end date is after start date
  if (this.validUntil <= this.validFrom) {
    next(new Error('Valid until date must be after valid from date'));
    return;
  }
  
  // Set default text color if not provided
  if (!this.textColor) {
    // Simple logic to determine text color based on background
    const bgColor = this.backgroundColor;
    if (bgColor.startsWith('#')) {
      const hex = bgColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      this.textColor = brightness > 128 ? '#000000' : '#FFFFFF';
    } else {
      this.textColor = '#FFFFFF';
    }
  }
  
  next();
});

// Create and export the model
const HeroBanner = mongoose.model<IHeroBanner, IHeroBannerModel>('HeroBanner', HeroBannerSchema);

export default HeroBanner;
