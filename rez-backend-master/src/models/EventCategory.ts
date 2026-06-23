import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEventCategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  icon: string; // Emoji or URL to icon image
  color: string; // Hex color for UI
  gradient: string[]; // Array of gradient colors for frontend cards
  description?: string;
  eventCount: number; // Cached count, updated on event publish/unpublish
  isActive: boolean;
  sortOrder: number;
  featured: boolean; // Show on homepage/entry card
  parentCategory?: Types.ObjectId; // For subcategories
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventCategorySchema = new Schema<IEventCategory>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'],
  },
  icon: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
    default: '#A855F7',
    match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color'],
  },
  gradient: {
    type: [String],
    default: ['#FAF5FF', '#FDF2F8'],
  },
  description: {
    type: String,
    maxlength: 500,
  },
  eventCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  parentCategory: {
    type: Schema.Types.ObjectId,
    ref: 'EventCategory',
    default: null,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
EventCategorySchema.index({ isActive: 1, sortOrder: 1 });
EventCategorySchema.index({ featured: 1, isActive: 1 });
EventCategorySchema.index({ parentCategory: 1 });

// Static: get active categories sorted by order
EventCategorySchema.statics.getActive = function () {
  return this.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
};

// Static: get featured categories for homepage/entry card
EventCategorySchema.statics.getFeatured = function () {
  return this.find({ isActive: true, featured: true }).sort({ sortOrder: 1 });
};

// Static: increment event count
EventCategorySchema.statics.incrementEventCount = async function (categoryId: Types.ObjectId | string) {
  await this.findByIdAndUpdate(categoryId, { $inc: { eventCount: 1 } });
};

// Static: decrement event count
EventCategorySchema.statics.decrementEventCount = async function (categoryId: Types.ObjectId | string) {
  await this.findByIdAndUpdate(categoryId, { $inc: { eventCount: -1 } });
};

const EventCategory = mongoose.model<IEventCategory>('EventCategory', EventCategorySchema);

export default EventCategory;
