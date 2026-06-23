import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICategoryVibe extends Document {
  category: Types.ObjectId;
  categorySlug: string;
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryVibeSchema = new Schema<ICategoryVibe>({
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
  description: {
    type: String,
    trim: true
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

CategoryVibeSchema.index({ categorySlug: 1, isActive: 1 });
CategoryVibeSchema.index({ category: 1, isActive: 1, sortOrder: 1 });

export const CategoryVibe = mongoose.model<ICategoryVibe>('CategoryVibe', CategoryVibeSchema);
export default CategoryVibe;





