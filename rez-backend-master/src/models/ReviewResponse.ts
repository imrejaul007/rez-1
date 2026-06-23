import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * ReviewResponse — merchant/hotel-partner reply to a hotel review.
 * One response per review; updates are handled by replacing the document.
 */
export interface IReviewResponse extends Document<any, any, any, Record<string, any>, {}> {
  _id: string;
  reviewId: mongoose.Types.ObjectId;
  merchantId: mongoose.Types.ObjectId;
  response: string;
  respondedAt: Date;
  isPublic: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReviewResponseModel extends Model<IReviewResponse> {}

const ReviewResponseSchema = new Schema<IReviewResponse>(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelReview',
      required: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    response: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    respondedAt: {
      type: Date,
      default: Date.now,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: {
      type: Date,
    },
    moderationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Unique: one response per review
ReviewResponseSchema.index({ reviewId: 1 }, { unique: true });

// Query efficiency
ReviewResponseSchema.index({ merchantId: 1, createdAt: -1 });

export const ReviewResponse = mongoose.model<IReviewResponse, IReviewResponseModel>(
  'ReviewResponse',
  ReviewResponseSchema,
);
export default ReviewResponse;
