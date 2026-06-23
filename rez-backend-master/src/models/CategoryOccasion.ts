import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICategoryOccasion extends Document {
  category: Types.ObjectId;
  categorySlug: string;
  id: string;
  name: string;
  icon: string;
  color: string;
  tag?: string | null;
  discount: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryOccasionSchema = new Schema<ICategoryOccasion>({
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  categorySlug: {
    type: String,
    required: true,
    index: true
  },
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color']
  },
  tag: {
    type: String,
    trim: true,
    default: null
  },
  discount: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

CategoryOccasionSchema.index({ categorySlug: 1, isActive: 1 });
CategoryOccasionSchema.index({ category: 1, isActive: 1, sortOrder: 1 });

export const CategoryOccasion = mongoose.model<ICategoryOccasion>('CategoryOccasion', CategoryOccasionSchema);
export default CategoryOccasion;





