import mongoose, { Schema, Document } from 'mongoose';

/**
 * HomeServiceCategory — Canonical categories for the home services vertical.
 * Examples: plumbing, electrical, cleaning, carpentry, painting, appliance repair.
 */
export interface IHomeServiceCategory extends Document {
  name: string;
  slug: string;
  icon: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  metadata?: {
    color?: string;
    bannerImage?: string;
    cashbackPercentage?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const HomeServiceCategorySchema = new Schema<IHomeServiceCategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'],
    },
    icon: {
      type: String,
      required: [true, 'Category icon is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    metadata: {
      color: { type: String, match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code'] },
      bannerImage: { type: String, trim: true },
      cashbackPercentage: { type: Number, min: 0, max: 100, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
HomeServiceCategorySchema.index({ slug: 1 }, { unique: true });
HomeServiceCategorySchema.index({ isActive: 1, sortOrder: 1 });
HomeServiceCategorySchema.index({ sortOrder: 1 });

// Pre-validate: auto-generate slug from name if not provided
HomeServiceCategorySchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

export const HomeServiceCategory = mongoose.model<IHomeServiceCategory>(
  'HomeServiceCategory',
  HomeServiceCategorySchema,
);
