import mongoose, { Schema, Document, Types } from 'mongoose';

export type MallListingRequestStatus = 'pending' | 'approved' | 'rejected';

export interface IMallListingRequest extends Document {
  storeId: Types.ObjectId;
  merchantId: Types.ObjectId;
  status: MallListingRequestStatus;
  reason: string;
  adminNotes?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MallListingRequestSchema = new Schema<IMallListingRequest>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    adminNotes: {
      type: String,
      maxlength: 1000,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending requests for the same store
MallListingRequestSchema.index(
  { storeId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

MallListingRequestSchema.index({ merchantId: 1 });
MallListingRequestSchema.index({ createdAt: -1 });

export const MallListingRequest = mongoose.model<IMallListingRequest>(
  'MallListingRequest',
  MallListingRequestSchema
);

export default MallListingRequest;
