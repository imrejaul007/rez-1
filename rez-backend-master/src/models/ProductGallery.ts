import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Product Gallery Interface
 * Represents individual gallery items (images) for products
 */
export interface IProductGallery extends Document {
  productId: Types.ObjectId; // Reference to Product
  merchantId: Types.ObjectId; // Reference to Merchant

  // Media item details
  url: string; // Cloudinary URL
  publicId: string; // Cloudinary public ID for deletion

  // Metadata
  type: 'image'; // Images only (no videos per requirements)
  category: string; // 'main', 'variant', 'lifestyle', 'details', 'packaging', 'general'
  title?: string;
  description?: string;
  tags?: string[]; // For search/filtering

  // Organization
  order: number; // For sorting within category
  isVisible: boolean;
  isCover: boolean; // Is this the main product image?
  variantId?: string; // Optional: Link to specific product variant

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
 * Product Gallery Schema
 */
const ProductGallerySchema = new Schema<IProductGallery>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image'], // Images only
      required: true,
      default: 'image',
    },
    category: {
      type: String,
      required: true,
      default: 'general',
      enum: ['main', 'variant', 'lifestyle', 'details', 'packaging', 'general'],
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
    variantId: {
      type: String,
      trim: true,
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
ProductGallerySchema.index({ productId: 1, category: 1, order: 1 });
ProductGallerySchema.index({ productId: 1, isVisible: 1, type: 1 });
ProductGallerySchema.index({ merchantId: 1, deletedAt: 1 });
ProductGallerySchema.index({ productId: 1, isCover: 1, category: 1 });
ProductGallerySchema.index({ productId: 1, variantId: 1 });

// Virtual for checking if item is deleted
ProductGallerySchema.virtual('isDeleted').get(function() {
  return !!this.deletedAt;
});

// Pre-save middleware to ensure only one cover image per product
ProductGallerySchema.pre('save', async function(next) {
  if (this.isCover && this.isModified('isCover')) {
    // Unset other cover images for this product
    await mongoose.model<IProductGallery>('ProductGallery').updateMany(
      {
        productId: this.productId,
        _id: { $ne: this._id },
        deletedAt: { $exists: false },
      },
      { $set: { isCover: false } }
    );
  }
  next();
});

// Method to soft delete
ProductGallerySchema.methods.softDelete = async function() {
  this.deletedAt = new Date();
  this.isVisible = false;
  await this.save();
};

// Static method to get gallery items for a product
ProductGallerySchema.statics.getProductGallery = async function(
  productId: Types.ObjectId,
  options: {
    category?: string;
    variantId?: string;
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const query: any = {
    productId,
    ...(options.includeDeleted ? {} : { deletedAt: { $exists: false } }),
    ...(options.category ? { category: options.category.toLowerCase() } : {}),
    ...(options.variantId ? { variantId: options.variantId } : {}),
  };

  return this.find(query)
    .sort({ order: 1, uploadedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.offset || 0);
};

// Static method to get categories for a product
ProductGallerySchema.statics.getProductCategories = async function(productId: Types.ObjectId) {
  const categories = await this.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
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

const ProductGallery = mongoose.model<IProductGallery>('ProductGallery', ProductGallerySchema);

export default ProductGallery;
