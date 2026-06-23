import mongoose, { Schema, Document, Types } from 'mongoose';

// Mall Collection interface
export interface IMallCollection extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  image: string;
  type: 'curated' | 'seasonal' | 'trending' | 'personalized';
  sortOrder: number;
  isActive: boolean;
  validFrom?: Date;
  validUntil?: Date;
  brandCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mall Collection Schema
const MallCollectionSchema = new Schema<IMallCollection>({
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
  image: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['curated', 'seasonal', 'trending', 'personalized'],
    default: 'curated'
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  validFrom: {
    type: Date
  },
  validUntil: {
    type: Date
  },
  brandCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
MallCollectionSchema.index({ isActive: 1, sortOrder: 1 });
MallCollectionSchema.index({ type: 1, isActive: 1 });
MallCollectionSchema.index({ validFrom: 1, validUntil: 1 });

// Pre-save hook to generate slug
MallCollectionSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }
  next();
});

// Virtual to check if collection is currently valid
MallCollectionSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  if (this.validFrom && now < this.validFrom) return false;
  if (this.validUntil && now > this.validUntil) return false;
  return true;
});

// Static method to get active collections
MallCollectionSchema.statics.getActive = function(limit: number = 10) {
  const now = new Date();
  return this.find({
    isActive: true,
    $and: [
      {
        $or: [
          { validFrom: { $exists: false } },
          { validFrom: { $lte: now } }
        ]
      },
      {
        $or: [
          { validUntil: { $exists: false } },
          { validUntil: { $gte: now } }
        ]
      }
    ]
  })
    .sort({ sortOrder: 1 })
    .limit(limit);
};

// Static method to update brand count
MallCollectionSchema.statics.updateBrandCount = async function(collectionId: Types.ObjectId) {
  const MallBrand = mongoose.model('MallBrand');
  const count = await MallBrand.countDocuments({
    collections: collectionId,
    isActive: true
  });
  await this.findByIdAndUpdate(collectionId, { brandCount: count });
};

// Delete cached model if exists (for development)
if (mongoose.models.MallCollection) {
  delete (mongoose.models as any).MallCollection;
}

export const MallCollection = mongoose.model<IMallCollection>('MallCollection', MallCollectionSchema);
