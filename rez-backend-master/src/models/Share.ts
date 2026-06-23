import mongoose, { Schema, Document } from 'mongoose';

export interface IShare extends Document {
  user: mongoose.Types.ObjectId;
  contentType: 'product' | 'store' | 'offer' | 'referral' | 'video' | 'article' | 'purchase';
  contentId: string;
  orderId?: mongoose.Types.ObjectId;  // For purchase shares
  orderTotal?: number;                 // Order total for calculating 5% reward
  platform: 'whatsapp' | 'facebook' | 'twitter' | 'instagram' | 'copy_link' | 'other';
  shareUrl: string;
  trackingCode: string;
  clicks: number;
  conversions: number;
  coinsEarned: number;
  status: 'pending' | 'verified' | 'rewarded' | 'expired' | 'pending_approval';
  verifiedAt?: Date;
  rewardedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShareSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    contentType: {
      type: String,
      enum: ['product', 'store', 'offer', 'referral', 'video', 'article', 'purchase'],
      required: true
    },
    contentId: {
      type: String,
      required: true
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order'
    },
    orderTotal: {
      type: Number,
      min: 0
    },
    platform: {
      type: String,
      enum: ['whatsapp', 'facebook', 'twitter', 'instagram', 'copy_link', 'other'],
      required: true
    },
    shareUrl: {
      type: String,
      required: true
    },
    trackingCode: {
      type: String,
      required: true,
      unique: true
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0
    },
    conversions: {
      type: Number,
      default: 0,
      min: 0
    },
    coinsEarned: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rewarded', 'expired', 'pending_approval'],
      default: 'pending'
    },
    verifiedAt: Date,
    rewardedAt: Date,
    expiresAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
ShareSchema.index({ user: 1, contentType: 1, createdAt: -1 });
ShareSchema.index({ status: 1, expiresAt: 1 });
ShareSchema.index({ contentType: 1, status: 1, createdAt: -1 });

export default mongoose.model<IShare>('Share', ShareSchema);
