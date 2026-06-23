/**
 * MerchantUpload — tracks which merchant uploaded each Cloudinary asset.
 *
 * ROUTE-SEC-005 FIX: The admin /uploads/delete endpoint previously allowed any
 * authenticated admin to delete any Cloudinary file by publicId. Now we verify
 * the file belongs to the caller's merchant before deletion.
 *
 * Upload routes (merchantroutes/uploads.ts) should call MerchantUpload.create()
 * after each successful upload to establish ownership.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IMerchantUpload extends Document {
  publicId: string;
  merchantId: mongoose.Types.ObjectId;
  storeId?: mongoose.Types.ObjectId;
  type: 'product-image' | 'product-images' | 'store-logo' | 'store-banner' | 'general' | string;
  cloudinaryUrl: string;
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantUploadSchema = new Schema<IMerchantUpload>(
  {
    publicId: { type: String, required: true, unique: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: false },
    type: { type: String, default: 'general' },
    cloudinaryUrl: { type: String, required: false },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: false },
  },
  { timestamps: true },
);

// Index for ownership lookup: can efficiently find uploads by merchantId
MerchantUploadSchema.index({ merchantId: 1, createdAt: -1 });

export const MerchantUpload = mongoose.model<IMerchantUpload>('MerchantUpload', MerchantUploadSchema);
