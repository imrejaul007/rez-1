import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Store Experience interface - For StoreExperiencesSection
 * Represents different shopping/store experiences like fast delivery, budget stores, etc.
 */
export interface IStoreExperience extends Document {
  _id: Types.ObjectId;
  slug: string; // e.g., 'fast-delivery', 'one-rupee-store', 'luxury'
  title: string;
  subtitle?: string;
  description?: string;
  icon: string; // emoji or icon name
  iconType: 'emoji' | 'url' | 'icon-name';
  type: 'fastDelivery' | 'budgetFriendly' | 'premium' | 'organic' | 'oneRupee' | 'ninetyNine' | 'luxury' | 'verified' | 'partner' | 'mall' | 'custom';
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  backgroundColor?: string;
  gradientColors?: string[];
  image?: string;
  bannerImage?: string;
  benefits?: string[];

  // Store filtering criteria (auto-matching)
  filterCriteria: {
    tags?: string[];
    maxDeliveryTime?: number; // in minutes
    maxPrice?: number;
    minRating?: number;
    isPremium?: boolean;
    isOrganic?: boolean;
    isPartner?: boolean;
    isMall?: boolean;
    isFastDelivery?: boolean;
    isBudgetFriendly?: boolean;
    isVerified?: boolean;
    categories?: Types.ObjectId[];
  };

  // Manually assigned stores (admin can add specific stores)
  assignedStores?: Types.ObjectId[];

  // Region settings
  regions?: string[]; // Available regions (empty = all regions)

  // Display settings
  storeCount?: number; // Cached count
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Store Experience Schema
 */
const StoreExperienceSchema = new Schema<IStoreExperience>({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  icon: {
    type: String,
    required: true,
    trim: true,
  },
  iconType: {
    type: String,
    enum: ['emoji', 'url', 'icon-name'],
    default: 'emoji',
  },
  type: {
    type: String,
    enum: ['fastDelivery', 'budgetFriendly', 'premium', 'organic', 'oneRupee', 'ninetyNine', 'luxury', 'verified', 'partner', 'mall', 'custom'],
    required: true,
    index: true,
  },
  badge: {
    type: String,
    trim: true,
  },
  badgeBg: {
    type: String,
    default: '#22C55E',
  },
  badgeColor: {
    type: String,
    default: '#FFFFFF',
  },
  backgroundColor: {
    type: String,
  },
  gradientColors: [{
    type: String,
  }],
  image: {
    type: String,
  },
  bannerImage: {
    type: String,
  },
  benefits: {
    type: [String],
    default: []
  },
  filterCriteria: {
    tags: [{ type: String, trim: true }],
    maxDeliveryTime: { type: Number, min: 0 },
    maxPrice: { type: Number, min: 0 },
    minRating: { type: Number, min: 0, max: 5 },
    isPremium: { type: Boolean },
    isOrganic: { type: Boolean },
    isPartner: { type: Boolean },
    isMall: { type: Boolean },
    isFastDelivery: { type: Boolean },
    isBudgetFriendly: { type: Boolean },
    isVerified: { type: Boolean },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  },
  assignedStores: [{
    type: Schema.Types.ObjectId,
    ref: 'Store',
    index: true,
  }],
  regions: [{
    type: String,
    enum: ['bangalore', 'dubai'],
    index: true,
  }],
  storeCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
StoreExperienceSchema.index({ isActive: 1, sortOrder: 1 });
StoreExperienceSchema.index({ type: 1, isActive: 1 });
StoreExperienceSchema.index({ isFeatured: 1, sortOrder: 1 });

// Static methods
StoreExperienceSchema.statics.getActiveExperiences = function () {
  return this.find({ isActive: true }).sort({ sortOrder: 1 });
};

StoreExperienceSchema.statics.getFeaturedExperiences = function () {
  return this.find({ isActive: true, isFeatured: true }).sort({ sortOrder: 1 });
};

const StoreExperience = mongoose.model<IStoreExperience>('StoreExperience', StoreExperienceSchema);

export default StoreExperience;
