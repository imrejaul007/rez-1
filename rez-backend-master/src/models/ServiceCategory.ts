import mongoose, { Schema, Document, Types } from 'mongoose';

// Service Category metadata interface
export interface IServiceCategoryMetadata {
  color?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
}

// Service Category interface
export interface IServiceCategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  iconType: 'emoji' | 'url' | 'icon-name';
  image?: string;
  bannerImage?: string;
  cashbackPercentage: number;
  maxCashback?: number;
  isActive: boolean;
  sortOrder: number;
  parentCategory?: Types.ObjectId;
  childCategories?: Types.ObjectId[];
  serviceCount: number;
  metadata: IServiceCategoryMetadata;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getFullPath(): Promise<string>;
  getAllChildren(): Promise<IServiceCategory[]>;
  incrementServiceCount(): Promise<void>;
  decrementServiceCount(): Promise<void>;
}

// Service Category Schema
const ServiceCategorySchema = new Schema<IServiceCategory>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens']
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  icon: {
    type: String,
    required: true,
    trim: true
  },
  iconType: {
    type: String,
    enum: ['emoji', 'url', 'icon-name'],
    default: 'emoji'
  },
  image: {
    type: String,
    trim: true
  },
  bannerImage: {
    type: String,
    trim: true
  },
  cashbackPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 5
  },
  maxCashback: {
    type: Number,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  parentCategory: {
    type: Schema.Types.ObjectId,
    ref: 'ServiceCategory',
    default: null
  },
  childCategories: [{
    type: Schema.Types.ObjectId,
    ref: 'ServiceCategory'
  }],
  serviceCount: {
    type: Number,
    default: 0,
    min: 0
  },
  metadata: {
    color: {
      type: String,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color']
    },
    tags: [{
      type: String,
      trim: true
    }],
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 60
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 160
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ServiceCategorySchema.index({ isActive: 1, sortOrder: 1 });
ServiceCategorySchema.index({ parentCategory: 1 });
ServiceCategorySchema.index({ cashbackPercentage: -1 });
ServiceCategorySchema.index({ serviceCount: -1 });
ServiceCategorySchema.index({ createdAt: -1 });

// Compound indexes
ServiceCategorySchema.index({ isActive: 1, parentCategory: 1, sortOrder: 1 });

// Virtual for cashback display text
ServiceCategorySchema.virtual('cashbackText').get(function() {
  return `Up to ${this.cashbackPercentage}% cash back`;
});

// Virtual for level (root = 0, child = 1, etc.)
ServiceCategorySchema.virtual('level').get(function() {
  return this.parentCategory ? 1 : 0;
});

// Method to get full category path
ServiceCategorySchema.methods.getFullPath = async function(): Promise<string> {
  let path = this.name;

  if (this.parentCategory) {
    const parent = await this.model('ServiceCategory').findById(this.parentCategory);
    if (parent) {
      const parentPath = await parent.getFullPath();
      path = `${parentPath} > ${path}`;
    }
  }

  return path;
};

// Method to get all child categories recursively
ServiceCategorySchema.methods.getAllChildren = async function(): Promise<IServiceCategory[]> {
  const children = await this.model('ServiceCategory').find({
    parentCategory: this._id,
    isActive: true
  }).sort({ sortOrder: 1 });

  let allChildren = [...children];

  for (const child of children) {
    const grandChildren = await child.getAllChildren();
    allChildren = [...allChildren, ...grandChildren];
  }

  return allChildren;
};

// Method to increment service count
ServiceCategorySchema.methods.incrementServiceCount = async function(): Promise<void> {
  this.serviceCount += 1;
  await this.save();
};

// Method to decrement service count
ServiceCategorySchema.methods.decrementServiceCount = async function(): Promise<void> {
  if (this.serviceCount > 0) {
    this.serviceCount -= 1;
    await this.save();
  }
};

// Pre-save hook to generate slug if not provided
ServiceCategorySchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }
  next();
});

// Pre-save hook to update parent's childCategories array
ServiceCategorySchema.pre('save', async function(next) {
  if (this.isNew && this.parentCategory) {
    await this.model('ServiceCategory').findByIdAndUpdate(
      this.parentCategory,
      { $addToSet: { childCategories: this._id } }
    );
  }
  next();
});

// Pre-remove hook to clean up references
ServiceCategorySchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  if (this.parentCategory) {
    await this.model('ServiceCategory').findByIdAndUpdate(
      this.parentCategory,
      { $pull: { childCategories: this._id } }
    );
  }

  await this.model('ServiceCategory').updateMany(
    { parentCategory: this._id },
    { $unset: { parentCategory: 1 } }
  );

  next();
});

// Static method to get root categories
ServiceCategorySchema.statics.getRootCategories = function() {
  return this.find({ parentCategory: null, isActive: true }).sort({ sortOrder: 1 });
};

// Static method to get all active categories
ServiceCategorySchema.statics.getActiveCategories = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1 });
};

// Static method to get category by slug
ServiceCategorySchema.statics.getBySlug = function(slug: string) {
  return this.findOne({ slug, isActive: true });
};

// Static method to get categories with service counts
ServiceCategorySchema.statics.getCategoriesWithCounts = function() {
  return this.aggregate([
    { $match: { isActive: true, parentCategory: null } },
    {
      $lookup: {
        from: 'products',
        let: { categoryId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$serviceCategory', '$$categoryId'] },
                  { $eq: ['$productType', 'service'] },
                  { $eq: ['$isActive', true] },
                  { $ne: ['$isDeleted', true] }
                ]
              }
            }
          }
        ],
        as: 'services'
      }
    },
    {
      $addFields: {
        serviceCount: { $size: '$services' }
      }
    },
    {
      $project: {
        services: 0
      }
    },
    { $sort: { sortOrder: 1 } }
  ]);
};

export const ServiceCategory = mongoose.model<IServiceCategory>('ServiceCategory', ServiceCategorySchema);
