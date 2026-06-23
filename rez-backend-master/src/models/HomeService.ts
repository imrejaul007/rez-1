import mongoose, { Schema, Document, Types, Model } from 'mongoose';

/**
 * HomeService — Individual service offered by a merchant within a category.
 * Example: "Tap Leak Repair" under "plumbing", or "Full House Cleaning" under "cleaning".
 */
export interface IHomeService extends Document {
  name: string;
  categorySlug: string;
  category: Types.ObjectId;
  merchantId: Types.ObjectId;
  storeId?: Types.ObjectId;
  description?: string;
  basePrice: number;
  priceType: 'fixed' | 'hourly';
  duration: number; // in minutes
  isActive: boolean;
  isFeatured: boolean;
  images?: string[];
  includes?: string[]; // e.g., ["Free inspection", "90-day warranty"]
  exclusions?: string[];
  serviceAreas?: string[]; // city/pincode codes where service is available
  ratings?: {
    average: number;
    count: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const HomeServiceSchema = new Schema<IHomeService>(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [200, 'Service name cannot exceed 200 characters'],
    },
    categorySlug: {
      type: String,
      required: [true, 'Category slug is required'],
      lowercase: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'HomeServiceCategory',
      required: [true, 'Category reference is required'],
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: [true, 'Merchant ID is required'],
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
    },
    priceType: {
      type: String,
      enum: ['fixed', 'hourly'],
      default: 'fixed',
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [15, 'Duration must be at least 15 minutes'],
      max: [1440, 'Duration cannot exceed 1440 minutes (24 hours)'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    includes: [
      {
        type: String,
        trim: true,
        maxlength: 200,
      },
    ],
    exclusions: [
      {
        type: String,
        trim: true,
        maxlength: 200,
      },
    ],
    serviceAreas: [
      {
        type: String,
        trim: true,
        uppercase: true,
      },
    ],
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
HomeServiceSchema.index({ categorySlug: 1, isActive: 1 });
HomeServiceSchema.index({ category: 1, isActive: 1 });
HomeServiceSchema.index({ merchantId: 1, isActive: 1 });
HomeServiceSchema.index({ storeId: 1, isActive: 1 });
HomeServiceSchema.index({ basePrice: 1 });
HomeServiceSchema.index({ isFeatured: 1, isActive: 1 });
HomeServiceSchema.index({ merchantId: 1, categorySlug: 1 });
HomeServiceSchema.index({ serviceAreas: 1 });

// Compound index for service lookup with location filter
HomeServiceSchema.index({ categorySlug: 1, isActive: 1, basePrice: 1 });

// Virtual for formatted price
HomeServiceSchema.virtual('formattedPrice').get(function (this: IHomeService) {
  if (this.priceType === 'hourly') {
    return `₹${this.basePrice}/hr`;
  }
  return `₹${this.basePrice}`;
});

HomeServiceSchema.set('toJSON', { virtuals: true });
HomeServiceSchema.set('toObject', { virtuals: true });

// Static: find active services by category
HomeServiceSchema.statics.findByCategory = function (
  categorySlug: string,
  options: { limit?: number; skip?: number; sortBy?: string } = {},
) {
  const { limit = 20, skip = 0, sortBy = 'ratings.average' } = options;
  const sortDir = sortBy === 'price_asc' ? 1 : sortBy === 'price_desc' ? -1 : -1;
  const actualSort = sortBy === 'price_asc' || sortBy === 'price_desc' ? { basePrice: sortDir } : { [sortBy]: -1 };

  return this.find({ categorySlug, isActive: true })
    .populate('category', 'name slug icon metadata')
    .populate('merchantId', 'name logo phone')
    .sort(actualSort)
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static: find featured services
HomeServiceSchema.statics.findFeatured = function (limit = 6) {
  return this.find({ isFeatured: true, isActive: true })
    .populate('category', 'name slug icon metadata')
    .populate('merchantId', 'name logo phone')
    .sort({ 'ratings.average': -1 })
    .limit(limit)
    .lean();
};

export interface IHomeServiceModel extends Model<IHomeService> {
  findByCategory(categorySlug: string, options?: { limit?: number; skip?: number; sortBy?: string }): Promise<any[]>;
  findFeatured(limit?: number): Promise<any[]>;
}

export const HomeService = mongoose.model<IHomeService, IHomeServiceModel>('HomeService', HomeServiceSchema);
