import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICategoryHashtag extends Document {
  category: Types.ObjectId;
  categorySlug: string;
  id: string;
  tag: string;
  count: number;
  color: string;
  trending: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryHashtagSchema = new Schema<ICategoryHashtag>({
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
  tag: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^#[\p{L}\p{N}\s\-_]+$/u.test(v);
      },
      message: 'Hashtag must start with # and contain only letters, numbers, spaces, hyphens, and underscores'
    }
  },
  count: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  color: {
    type: String,
    required: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color']
  },
  trending: {
    type: Boolean,
    default: false,
    index: true
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

CategoryHashtagSchema.index({ categorySlug: 1, isActive: 1, trending: -1 });
CategoryHashtagSchema.index({ category: 1, isActive: 1, count: -1 });

export const CategoryHashtag = mongoose.model<ICategoryHashtag>('CategoryHashtag', CategoryHashtagSchema);
export default CategoryHashtag;

