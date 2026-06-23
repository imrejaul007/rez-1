// Offer Model
// Main model for managing all types of offers (mega, student, new arrival, etc.)

import mongoose, { Document, Schema, Types, Model } from 'mongoose';
import { escapeRegex } from '../utils/sanitize';

export interface IOffer extends Document {
  _id: Types.ObjectId;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  category: 'mega' | 'student' | 'new_arrival' | 'trending' | 'food' | 'fashion' | 'electronics' | 'general' | 'entertainment' | 'beauty' | 'wellness';
  type: 'cashback' | 'discount' | 'voucher' | 'combo' | 'special' | 'walk_in';
  cashbackPercentage: number;
  originalPrice?: number;
  discountedPrice?: number;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  distance?: number; // Calculated dynamically based on user location
  store: {
    id: Types.ObjectId;
    name: string;
    logo?: string;
    rating?: number;
    verified?: boolean;
  };
  validity: {
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  };
  engagement: {
    likesCount: number;
    sharesCount: number;
    viewsCount: number;
    isLikedByUser?: boolean; // User-specific, calculated dynamically
  };
  restrictions: {
    minOrderValue?: number;
    maxDiscountAmount?: number;
    applicableOn?: string[];
    excludedProducts?: Types.ObjectId[];
    ageRestriction?: {
      minAge?: number;
      maxAge?: number;
    };
    userTypeRestriction?: 'student' | 'new_user' | 'premium' | 'all';
    usageLimitPerUser?: number;
    usageLimit?: number;
  };
  eligibility: {
    nuqtaPlusTiers: ('free' | 'premium' | 'vip')[];
    priveTiers: ('none' | 'entry' | 'signature' | 'elite')[];
    requiredZones: string[];
    requireAll: boolean;
  };
  metadata: {
    isNew?: boolean;
    isTrending?: boolean;
    isBestSeller?: boolean;
    isSpecial?: boolean;
    priority: number;
    tags: string[];
    featured?: boolean;
    flashSale?: {
      isActive: boolean;
      endTime?: Date;
      originalPrice?: number;
      salePrice?: number;
    };
  };
  // Follower-exclusive offer fields
  isFollowerExclusive: boolean;
  exclusiveUntil?: Date;
  visibleTo: 'all' | 'followers' | 'premium';

  // Sale/Clearance fields
  saleTag?: 'clearance' | 'sale' | 'last_pieces' | 'mega_sale';
  salePrice?: number;

  // BOGO (Buy One Get One) fields
  bogoType?: 'buy1get1' | 'buy2get1' | 'buy1get50' | 'buy2get50';
  bogoDetails?: string;

  // Delivery fields
  isFreeDelivery: boolean;
  deliveryFee?: number;
  deliveryTime?: string; // e.g., "25 min", "30-45 min"

  // Exclusive zone fields
  exclusiveZone?: 'corporate' | 'women' | 'birthday' | 'student' | 'senior' | 'defence' | 'healthcare' | 'teacher' | 'government' | 'differently-abled' | 'first-time';
  eligibilityRequirement?: string;

  // Redemption tracking
  redemptionCount: number;

  // Admin Control Fields
  adminApproved?: boolean;
  adminNotes?: string;
  isSuspended?: boolean;
  suspensionReason?: string;

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Soft delete fields
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  // Instance methods
  calculateDistance(userLocation: [number, number]): number;
  isExpired(): boolean;
  isActiveForUser(userId: Types.ObjectId): Promise<{ canUse: boolean; reason?: string }>;
  incrementEngagement(action: 'view' | 'like' | 'share'): Promise<void>;
  softDelete(adminId: Types.ObjectId): Promise<void>;
}

// Interface for static methods
export interface IOfferModel extends Model<IOffer> {
  findActiveOffers(): Promise<IOffer[]>;
  findOffersByCategory(category: string): Promise<IOffer[]>;
  findNearbyOffers(userLocation: [number, number], maxDistance?: number): Promise<IOffer[]>;
  findTrendingOffers(limit?: number): Promise<IOffer[]>;
  findNewArrivals(limit?: number): Promise<IOffer[]>;
  findStudentOffers(): Promise<IOffer[]>;
  findMegaOffers(): Promise<IOffer[]>;
  searchOffers(query: string, filters?: any): Promise<IOffer[]>;
}

const OfferSchema = new Schema<IOffer>({
  title: {
    type: String,
    required: [true, 'Offer title is required'],
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
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  image: {
    type: String,
    required: [true, 'Offer image is required'],
    validate: {
      validator: function(v: string) {
        if (!v || typeof v !== 'string') return false;
        try {
          const url = new URL(v);
          return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
        } catch (e) {
          return false;
        }
      },
      message: 'Image must be a valid URL'
    }
  },
  category: {
    type: String,
    enum: ['mega', 'student', 'new_arrival', 'trending', 'food', 'fashion', 'electronics', 'general', 'entertainment', 'beauty', 'wellness'],
    required: [true, 'Offer category is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['cashback', 'discount', 'voucher', 'combo', 'special', 'walk_in'],
    required: [true, 'Offer type is required'],
    default: 'cashback'
  },
  cashbackPercentage: {
    type: Number,
    required: [true, 'Cashback percentage is required'],
    min: [0, 'Cashback percentage cannot be negative'],
    max: [100, 'Cashback percentage cannot exceed 100%']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  discountedPrice: {
    type: Number,
    min: [0, 'Discounted price cannot be negative']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(v: number[]) {
          return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
        },
        message: 'Invalid coordinates format'
      }
    }
  },
  distance: {
    type: Number,
    min: [0, 'Distance cannot be negative']
  },
  store: {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store reference is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true
    },
    logo: {
      type: String,
      validate: {
        validator: function(v: string) {
          if (!v || typeof v !== 'string') return true;
          try {
            const url = new URL(v);
            return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
          } catch (e) {
            return false;
          }
        },
        message: 'Logo must be a valid URL'
      }
    },
    rating: {
      type: Number,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  validity: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  engagement: {
    likesCount: {
      type: Number,
      default: 0,
      min: [0, 'Likes count cannot be negative']
    },
    sharesCount: {
      type: Number,
      default: 0,
      min: [0, 'Shares count cannot be negative']
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: [0, 'Views count cannot be negative']
    }
  },
  restrictions: {
    minOrderValue: {
      type: Number,
      min: [0, 'Minimum order value cannot be negative']
    },
    maxDiscountAmount: {
      type: Number,
      min: [0, 'Maximum discount amount cannot be negative']
    },
    applicableOn: [{
      type: String,
      enum: ['online', 'offline', 'both']
    }],
    excludedProducts: [{
      type: Schema.Types.ObjectId,
      ref: 'Product'
    }],
    ageRestriction: {
      minAge: {
        type: Number,
        min: [0, 'Minimum age cannot be negative'],
        max: [120, 'Minimum age cannot exceed 120']
      },
      maxAge: {
        type: Number,
        min: [0, 'Maximum age cannot be negative'],
        max: [120, 'Maximum age cannot exceed 120']
      }
    },
    userTypeRestriction: {
      type: String,
      enum: ['student', 'new_user', 'premium', 'all'],
      default: 'all'
    },
    usageLimitPerUser: {
      type: Number,
      min: [1, 'Usage limit per user must be at least 1']
    },
    usageLimit: {
      type: Number,
      min: [1, 'Total usage limit must be at least 1']
    }
  },
  eligibility: {
    nuqtaPlusTiers: {
      type: [String],
      enum: ['free', 'premium', 'vip'],
      default: ['free', 'premium', 'vip'],
    },
    priveTiers: {
      type: [String],
      enum: ['none', 'entry', 'signature', 'elite'],
      default: ['none', 'entry', 'signature', 'elite'],
    },
    requiredZones: { type: [String], default: [] },
    requireAll: { type: Boolean, default: false },
  },
  metadata: {
    isNew: {
      type: Boolean,
      default: false,
      index: true
    },
    isTrending: {
      type: Boolean,
      default: false,
      index: true
    },
    isBestSeller: {
      type: Boolean,
      default: false,
      index: true
    },
    isSpecial: {
      type: Boolean,
      default: false,
      index: true
    },
    priority: {
      type: Number,
      default: 0,
      index: true
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    featured: {
      type: Boolean,
      default: false,
      index: true
    },
    flashSale: {
      isActive: {
        type: Boolean,
        default: false
      },
      endTime: {
        type: Date
      },
      originalPrice: {
        type: Number,
        min: [0, 'Flash sale original price cannot be negative']
      },
      salePrice: {
        type: Number,
        min: [0, 'Flash sale price cannot be negative']
      }
    }
  },
  // Follower-exclusive offer fields
  isFollowerExclusive: {
    type: Boolean,
    default: false,
    index: true
  },
  exclusiveUntil: {
    type: Date,
    validate: {
      validator: function(this: IOffer, v: Date) {
        return !this.isFollowerExclusive || (v && v > new Date());
      },
      message: 'Exclusive until date must be in the future for follower-exclusive offers'
    }
  },
  visibleTo: {
    type: String,
    enum: ['all', 'followers', 'premium'],
    default: 'all',
    index: true
  },

  // Sale/Clearance fields
  saleTag: {
    type: String,
    enum: ['clearance', 'sale', 'last_pieces', 'mega_sale'],
    index: true
  },
  salePrice: {
    type: Number,
    min: [0, 'Sale price cannot be negative']
  },

  // BOGO (Buy One Get One) fields
  bogoType: {
    type: String,
    enum: ['buy1get1', 'buy2get1', 'buy1get50', 'buy2get50'],
    index: true
  },
  bogoDetails: {
    type: String,
    trim: true,
    maxlength: 200
  },

  // Delivery fields
  isFreeDelivery: {
    type: Boolean,
    default: false,
    index: true
  },
  deliveryFee: {
    type: Number,
    min: [0, 'Delivery fee cannot be negative'],
    default: 0
  },
  deliveryTime: {
    type: String,
    trim: true,
    maxlength: 50
  },

  // Exclusive zone fields
  exclusiveZone: {
    type: String,
    enum: ['corporate', 'women', 'birthday', 'student', 'senior', 'defence', 'healthcare', 'teacher', 'government', 'differently-abled', 'first-time'],
    index: true
  },
  eligibilityRequirement: {
    type: String,
    trim: true,
    maxlength: 200
  },

  // Redemption tracking
  redemptionCount: {
    type: Number,
    default: 0,
    min: [0, 'Redemption count cannot be negative']
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
    index: true
  },

  // Admin Control Fields
  adminApproved: {
    type: Boolean,
    default: false,
    index: true
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  isSuspended: {
    type: Boolean,
    default: false,
    index: true
  },
  suspensionReason: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'AdminUser',
    default: null,
  },
}, {
  timestamps: true
});

// Geospatial index for location-based queries
OfferSchema.index({ location: '2dsphere' });

// Compound indexes for efficient queries
OfferSchema.index({ category: 1, 'validity.isActive': 1, 'validity.endDate': 1 });
OfferSchema.index({ 'metadata.isTrending': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'metadata.isNew': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'metadata.featured': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'store.id': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'metadata.priority': -1, 'validity.isActive': 1 });
OfferSchema.index({ 'store.id': 1, isFollowerExclusive: 1, 'validity.isActive': 1 });
OfferSchema.index({ isFollowerExclusive: 1, visibleTo: 1, 'validity.isActive': 1 });

// Eligibility indexes for segmentation queries
OfferSchema.index({ 'eligibility.nuqtaPlusTiers': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'eligibility.priveTiers': 1, 'validity.isActive': 1 });
OfferSchema.index({ 'eligibility.requiredZones': 1, 'validity.isActive': 1 });

// Instance methods
OfferSchema.methods.calculateDistance = function(userLocation: [number, number]): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = this.toRadians(userLocation[1] - this.location.coordinates[1]);
  const dLon = this.toRadians(userLocation[0] - this.location.coordinates[0]);
  const lat1 = this.toRadians(this.location.coordinates[1]);
  const lat2 = this.toRadians(userLocation[1]);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

OfferSchema.methods.toRadians = function(degrees: number): number {
  return degrees * (Math.PI / 180);
};

OfferSchema.methods.isExpired = function(): boolean {
  return new Date() > this.validity.endDate;
};

OfferSchema.methods.isActiveForUser = async function(userId: Types.ObjectId): Promise<{ canUse: boolean; reason?: string }> {
  const now = new Date();
  
  // Check if offer is expired
  if (now > this.validity.endDate) {
    return { canUse: false, reason: 'Offer has expired' };
  }
  
  // Check if offer is not yet active
  if (now < this.validity.startDate) {
    return { canUse: false, reason: 'Offer is not yet active' };
  }
  
  // Check if offer is active
  if (!this.validity.isActive) {
    return { canUse: false, reason: 'Offer is not active' };
  }
  
  // Check eligibility (new segmentation-aware check)
  if (this.eligibility) {
    try {
      const { privilegeResolutionService } = await import('../services/entitlement/privilegeResolutionService');
      const priv = await privilegeResolutionService.resolve(userId.toString());

      // Check subscription tier
      if (this.eligibility.nuqtaPlusTiers?.length > 0 &&
          !this.eligibility.nuqtaPlusTiers.includes(priv.subscriptionTier)) {
        return { canUse: false, reason: 'Offer requires a different subscription tier' };
      }

      // Check Prive tier
      if (this.eligibility.priveTiers?.length > 0 &&
          this.eligibility.priveTiers.length < 4 &&
          !this.eligibility.priveTiers.includes(priv.priveTier)) {
        return { canUse: false, reason: 'Offer requires Privé membership' };
      }

      // Check zone requirements
      if (this.eligibility.requiredZones?.length > 0) {
        const hasMatch = this.eligibility.requireAll
          ? this.eligibility.requiredZones.every((z: string) => priv.activeZones.includes(z))
          : this.eligibility.requiredZones.some((z: string) => priv.activeZones.includes(z));
        if (!hasMatch) {
          return { canUse: false, reason: 'You are not eligible for this exclusive offer' };
        }
      }
    } catch {
      // Entitlement service unavailable — allow access (fail open)
    }
  }

  return { canUse: true };
};

OfferSchema.methods.incrementEngagement = async function(action: 'view' | 'like' | 'share'): Promise<void> {
  const updateField = `${action}Count`;
  if (updateField in this.engagement) {
    this.engagement[updateField as keyof typeof this.engagement] = (this.engagement[updateField as keyof typeof this.engagement] as number) + 1;
    await this.save();
  }
};

// Static methods
OfferSchema.statics.findActiveOffers = function(maxResults: number = 50): Promise<IOffer[]> {
  const now = new Date();
  return this.find({
    'validity.isActive': true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now }
  }).sort({ 'metadata.priority': -1, createdAt: -1 }).limit(maxResults);
};

OfferSchema.statics.findOffersByCategory = function(category: string, maxResults: number = 50): Promise<IOffer[]> {
  const now = new Date();
  return this.find({
    category,
    'validity.isActive': true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now }
  }).sort({ 'metadata.priority': -1, createdAt: -1 }).limit(maxResults);
};

OfferSchema.statics.findNearbyOffers = function(userLocation: [number, number], maxDistance: number = 10): Promise<IOffer[]> {
  const now = new Date();
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: userLocation
        },
        $maxDistance: maxDistance * 1000 // Convert km to meters
      }
    },
    'validity.isActive': true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now }
  }).sort({ 'metadata.priority': -1, createdAt: -1 });
};

OfferSchema.statics.findTrendingOffers = function(limit: number = 10): Promise<IOffer[]> {
  const now = new Date();
  return this.find({
    'metadata.isTrending': true,
    'validity.isActive': true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now }
  })
  .sort({ 'engagement.likesCount': -1, 'metadata.priority': -1 })
  .limit(limit)
  .lean();
};

OfferSchema.statics.findNewArrivals = function(limit: number = 10): Promise<IOffer[]> {
  const now = new Date();
  return this.find({
    'metadata.isNew': true,
    'validity.isActive': true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now }
  })
  .sort({ createdAt: -1, 'metadata.priority': -1 })
  .limit(limit)
  .lean();
};

OfferSchema.statics.findStudentOffers = function(): Promise<IOffer[]> {
  const now = new Date();
  return this.find({
    $or: [
      { category: 'student' },
      { 'restrictions.userTypeRestriction': 'student' }
    ],
    'validity.isActive': true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now }
  }).sort({ 'metadata.priority': -1, createdAt: -1 }).lean();
};

OfferSchema.statics.findMegaOffers = function(): Promise<IOffer[]> {
  const now = new Date();
  return this.find({
    category: 'mega',
    'validity.isActive': true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now }
  }).sort({ 'metadata.priority': -1, createdAt: -1 }).lean();
};

OfferSchema.statics.searchOffers = function(query: string, filters: any = {}): Promise<IOffer[]> {
  const now = new Date();
  const searchQuery: any = {
    'validity.isActive': true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now }
  };

  // Text search
  if (query) {
    const escaped = escapeRegex(query);
    searchQuery.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { subtitle: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
      { 'store.name': { $regex: escaped, $options: 'i' } },
      { 'metadata.tags': { $in: [new RegExp(escaped, 'i')] } }
    ];
  }

  // Apply filters
  if (filters.category) {
    searchQuery.category = filters.category;
  }
  if (filters.type) {
    searchQuery.type = filters.type;
  }
  if (filters.minCashback) {
    searchQuery.cashbackPercentage = { $gte: filters.minCashback };
  }
  if (filters.maxCashback) {
    searchQuery.cashbackPercentage = { ...searchQuery.cashbackPercentage, $lte: filters.maxCashback };
  }

  return this.find(searchQuery).sort({ 'metadata.priority': -1, createdAt: -1 }).limit(50);
};

// Pre-save middleware
OfferSchema.pre('save', function(next) {
  // Validate that end date is after start date
  if (this.validity.endDate <= this.validity.startDate) {
    next(new Error('End date must be after start date'));
    return;
  }
  
  // Validate flash sale dates
  if (this.metadata.flashSale?.isActive && this.metadata.flashSale?.endTime) {
    if (this.metadata.flashSale.endTime <= new Date()) {
      this.metadata.flashSale.isActive = false;
    }
  }
  
  next();
});

// ── Soft delete: exclude deleted docs from all find queries ──
OfferSchema.pre(/^find/, function (this: any, next) {
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

OfferSchema.pre('countDocuments', function (this: any, next) {
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// ── Soft delete instance method ──
OfferSchema.methods.softDelete = async function (adminId: Types.ObjectId): Promise<void> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = adminId;
  this.validity.isActive = false;
  await this.save();
};

// Create and export the model
const Offer = mongoose.model<IOffer, IOfferModel>('Offer', OfferSchema);

export default Offer;