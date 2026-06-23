import mongoose, { Schema, Document, Types } from 'mongoose';

// Mall Category interface
export interface IMallCategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  image?: string;
  color: string;
  backgroundColor?: string;
  maxCashback: number;
  sortOrder: number;
  brandCount: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mall Category Schema
const MallCategorySchema = new Schema<IMallCategory>({
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
  image: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    required: true,
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color']
  },
  backgroundColor: {
    type: String,
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Background color must be a valid hex color']
  },
  maxCashback: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: 0
  },
  brandCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
MallCategorySchema.index({ isActive: 1, sortOrder: 1 });
MallCategorySchema.index({ isFeatured: 1, isActive: 1 });

// Pre-save hook to generate slug
MallCategorySchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }
  next();
});

// Static method to get active categories
MallCategorySchema.statics.getActive = function(limit: number = 20) {
  return this.find({ isActive: true })
    .sort({ sortOrder: 1 })
    .limit(limit);
};

// Static method to update brand count
MallCategorySchema.statics.updateBrandCount = async function(categoryId: Types.ObjectId) {
  const MallBrand = mongoose.model('MallBrand');
  const count = await MallBrand.countDocuments({
    mallCategory: categoryId,
    isActive: true
  });
  await this.findByIdAndUpdate(categoryId, { brandCount: count });
};

// Delete cached model if exists (for development)
if (mongoose.models.MallCategory) {
  delete (mongoose.models as any).MallCategory;
}

export const MallCategory = mongoose.model<IMallCategory>('MallCategory', MallCategorySchema);
