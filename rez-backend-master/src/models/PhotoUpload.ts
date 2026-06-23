import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * PhotoUpload — User-generated store/product/experience photos.
 * Users upload photos to earn coins after admin/merchant moderation.
 */
export interface IPhotoUpload extends Document {
  user: mongoose.Types.ObjectId;
  store?: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  photos: Array<{
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    fileSize?: number;
  }>;
  caption?: string;
  taggedProducts: mongoose.Types.ObjectId[];
  taggedStores: mongoose.Types.ObjectId[];
  contentType: 'store_photo' | 'product_photo' | 'experience_photo';
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderatedBy?: mongoose.Types.ObjectId;
  moderationNotes?: string;
  coinsAwarded: number;
  qualityScore?: number;
  isPublic: boolean;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPhotoUploadModel extends Model<IPhotoUpload> {
  getPendingCount(): Promise<number>;
}

const PhotoUploadSchema = new Schema<IPhotoUpload, IPhotoUploadModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    photos: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        width: Number,
        height: Number,
        fileSize: Number,
      },
    ],
    caption: {
      type: String,
      maxlength: 500,
    },
    taggedProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    taggedStores: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Store',
      },
    ],
    contentType: {
      type: String,
      enum: ['store_photo', 'product_photo', 'experience_photo'],
      default: 'store_photo',
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderationNotes: String,
    coinsAwarded: {
      type: Number,
      default: 0,
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 10,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PhotoUploadSchema.index({ user: 1, createdAt: -1 });
PhotoUploadSchema.index({ store: 1, moderationStatus: 1 });
PhotoUploadSchema.index({ moderationStatus: 1, createdAt: -1 });
PhotoUploadSchema.index({ taggedStores: 1, moderationStatus: 1 });

PhotoUploadSchema.statics.getPendingCount = async function (): Promise<number> {
  return this.countDocuments({ moderationStatus: 'pending' });
};

export const PhotoUpload = mongoose.model<IPhotoUpload, IPhotoUploadModel>(
  'PhotoUpload',
  PhotoUploadSchema
);

export default PhotoUpload;
