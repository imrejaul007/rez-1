import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Store Gallery Interface
 * Represents individual gallery items (images/videos) for stores
 */
export interface IStoreGallery extends Document {
  storeId: Types.ObjectId; // Reference to Store
  merchantId: Types.ObjectId; // Reference to Merchant
  
  // Media item details
  url: string; // Cloudinary URL
  thumbnail?: string; // Thumbnail URL for videos
  publicId: string; // Cloudinary public ID for deletion
  
  // Metadata
  type: 'image' | 'video';
  category: string; // 'interior', 'exterior', 'products', 'events', 'team', 'behind-scenes', 'menu', 'general', etc.
  title?: string;
  description?: string;
  tags?: string[]; // For search/filtering
  
  // Organization
  order: number; // For sorting within category
  isVisible: boolean;
  isCover: boolean; // Is this the cover image for the category?
  
  // Analytics
  views: number;
  likes: number;
  shares: number;
  viewedBy: Types.ObjectId[]; // Track unique users who viewed this item
  
  // Timestamps
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Soft delete
  deletedAt?: Date;
}

/**
 * Store Gallery Schema
 */
const StoreGallerySchema = new Schema<IStoreGallery>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
    },
    publicId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    category: {
      type: String,
      required: true,
      default: 'general',
      index: true,
      lowercase: true,
      trim: true,
    },
    title: {
      type: String,
      maxlength: 200,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    tags: [{
      type: String,
      maxlength: 50,
      trim: true,
      lowercase: true,
    }],
    order: {
      type: Number,
      default: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    isCover: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    shares: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for performance
StoreGallerySchema.index({ storeId: 1, category: 1, order: 1 });
StoreGallerySchema.index({ storeId: 1, isVisible: 1, type: 1 });
StoreGallerySchema.index({ merchantId: 1, deletedAt: 1 });
StoreGallerySchema.index({ storeId: 1, isCover: 1, category: 1 });

// Virtual for checking if item is deleted
StoreGallerySchema.virtual('isDeleted').get(function() {
  return !!this.deletedAt;
});

// Pre-save middleware to ensure only one cover per category
StoreGallerySchema.pre('save', async function(next) {
  if (this.isCover && this.isModified('isCover')) {
    // Unset other cover images in the same category
    await mongoose.model<IStoreGallery>('StoreGallery').updateMany(
      {
        storeId: this.storeId,
        category: this.category,
        _id: { $ne: this._id },
        deletedAt: { $exists: false },
      },
      { $set: { isCover: false } }
    );
  }
  next();
});

// Method to soft delete
StoreGallerySchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  this.isVisible = false;
  await this.save();
};

// Static method to get gallery items for a store
StoreGallerySchema.statics.getStoreGallery = async function(
  storeId: Types.ObjectId,
  options: {
    category?: string;
    type?: 'image' | 'video';
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const query: any = {
    storeId,
    ...(options.includeDeleted ? {} : { deletedAt: { $exists: false } }),
    ...(options.category ? { category: options.category.toLowerCase() } : {}),
    ...(options.type ? { type: options.type } : {}),
  };

  return this.find(query)
    .sort({ order: 1, uploadedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.offset || 0);
};

// Static method to get categories for a store
StoreGallerySchema.statics.getStoreCategories = async function(storeId: Types.ObjectId) {
  const categories = await this.aggregate([
    {
      $match: {
        storeId: new mongoose.Types.ObjectId(storeId),
        deletedAt: { $exists: false },
        isVisible: true,
      },
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        coverImage: {
          $first: {
            $cond: [
              { $eq: ['$isCover', true] },
              '$url',
              null,
            ],
          },
        },
      },
    },
    {
      $project: {
        name: '$_id',
        count: 1,
        coverImage: {
          $ifNull: [
            '$coverImage',
            {
              $arrayElemAt: [
                {
                  $map: {
                    input: { $slice: ['$url', 1] },
                    as: 'url',
                    in: '$$url',
                  },
                },
                0,
              ],
            },
          ],
        },
      },
    },
    {
      $sort: { name: 1 },
    },
  ]);

  return categories;
};

const StoreGallery = mongoose.model<IStoreGallery>('StoreGallery', StoreGallerySchema);

export default StoreGallery;

