// OfferCategory Model
// Manages offer categories for organizing and filtering offers

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface IOfferCategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color: string;
  backgroundColor?: string;
  isActive: boolean;
  priority: number;
  offers: Types.ObjectId[];
  metadata: {
    displayOrder: number;
    isFeatured: boolean;
    parentCategory?: Types.ObjectId;
    subcategories?: Types.ObjectId[];
    tags: string[];
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  addOffer(offerId: Types.ObjectId): Promise<void>;
  removeOffer(offerId: Types.ObjectId): Promise<void>;
  getActiveOffersCount(): Promise<number>;
}

// Interface for static methods
export interface IOfferCategoryModel extends Model<IOfferCategory> {
  findActiveCategories(): Promise<IOfferCategory[]>;
  findBySlug(slug: string): Promise<IOfferCategory | null>;
  findFeaturedCategories(): Promise<IOfferCategory[]>;
  findParentCategories(): Promise<IOfferCategory[]>;
  findSubcategories(parentId: Types.ObjectId): Promise<IOfferCategory[]>;
}

const OfferCategorySchema = new Schema<IOfferCategory>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters'],
    unique: true,
    index: true
  },
  slug: {
    type: String,
    required: [true, 'Category slug is required'],
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^[a-z0-9-]+$/.test(v);
      },
      message: 'Slug can only contain lowercase letters, numbers, and hyphens'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  icon: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^[a-z0-9-]+$/.test(v) || /^https?:\/\/.+\.(svg|png|jpg|jpeg|gif)$/i.test(v);
      },
      message: 'Icon must be a valid icon name or URL'
    }
  },
  color: {
    type: String,
    required: [true, 'Category color is required'],
    validate: {
      validator: function(v: string) {
        return /^#[0-9A-F]{6}$/i.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  backgroundColor: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^#[0-9A-F]{6}$/i.test(v);
      },
      message: 'Background color must be a valid hex color code'
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
  offers: [{
    type: Schema.Types.ObjectId,
    ref: 'Offer'
  }],
  metadata: {
    displayOrder: {
      type: Number,
      default: 0,
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'OfferCategory'
    },
    subcategories: [{
      type: Schema.Types.ObjectId,
      ref: 'OfferCategory'
    }],
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }]
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
OfferCategorySchema.index({ slug: 1, isActive: 1 });
OfferCategorySchema.index({ isActive: 1, priority: -1 });
OfferCategorySchema.index({ 'metadata.isFeatured': 1, isActive: 1 });
OfferCategorySchema.index({ 'metadata.parentCategory': 1, isActive: 1 });
OfferCategorySchema.index({ 'metadata.displayOrder': 1, isActive: 1 });

// Instance methods
OfferCategorySchema.methods.addOffer = async function(offerId: Types.ObjectId): Promise<void> {
  if (!this.offers.includes(offerId)) {
    this.offers.push(offerId);
    await this.save();
  }
};

OfferCategorySchema.methods.removeOffer = async function(offerId: Types.ObjectId): Promise<void> {
  this.offers = this.offers.filter((id: Types.ObjectId) => !id.equals(offerId));
  await this.save();
};

OfferCategorySchema.methods.getActiveOffersCount = async function(): Promise<number> {
  const Offer = mongoose.model('Offer');
  const now = new Date();
  
  const count = await Offer.countDocuments({
    _id: { $in: this.offers },
    'validity.isActive': true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now }
  });
  
  return count;
};

// Static methods
OfferCategorySchema.statics.findActiveCategories = function(): Promise<IOfferCategory[]> {
  return this.find({ isActive: true })
    .sort({ 'metadata.displayOrder': 1, priority: -1, name: 1 });
};

OfferCategorySchema.statics.findBySlug = function(slug: string): Promise<IOfferCategory | null> {
  return this.findOne({ slug, isActive: true });
};

OfferCategorySchema.statics.findFeaturedCategories = function(): Promise<IOfferCategory[]> {
  return this.find({ 
    isActive: true, 
    'metadata.isFeatured': true 
  })
  .sort({ 'metadata.displayOrder': 1, priority: -1 });
};

OfferCategorySchema.statics.findParentCategories = function(): Promise<IOfferCategory[]> {
  return this.find({ 
    isActive: true, 
    'metadata.parentCategory': { $exists: false } 
  })
  .sort({ 'metadata.displayOrder': 1, priority: -1 });
};

OfferCategorySchema.statics.findSubcategories = function(parentId: Types.ObjectId): Promise<IOfferCategory[]> {
  return this.find({ 
    isActive: true, 
    'metadata.parentCategory': parentId 
  })
  .sort({ 'metadata.displayOrder': 1, priority: -1 });
};

// Pre-save middleware
OfferCategorySchema.pre('save', function(next) {
  // Generate slug from name if not provided
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  
  // Set default background color if not provided
  if (!this.backgroundColor) {
    this.backgroundColor = this.color;
  }
  
  next();
});

// Pre-remove middleware
OfferCategorySchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  // Remove this category from all offers
  const Offer = mongoose.model('Offer');
  await Offer.updateMany(
    { offers: this._id },
    { $pull: { offers: this._id } }
  );
  
  // Remove this category from parent categories
  await mongoose.model('OfferCategory').updateMany(
    { 'metadata.subcategories': this._id },
    { $pull: { 'metadata.subcategories': this._id } }
  );
  
  next();
});

// Create and export the model
const OfferCategory = mongoose.model<IOfferCategory, IOfferCategoryModel>('OfferCategory', OfferCategorySchema);

export default OfferCategory;
