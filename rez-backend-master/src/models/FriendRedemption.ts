import mongoose, { Document, Schema, Model } from 'mongoose';

// FriendRedemption interface (Social proof - offers redeemed by friends)
export interface IFriendRedemption extends Document {
  userId: mongoose.Types.ObjectId; // The user viewing this
  friendId: mongoose.Types.ObjectId; // The friend who redeemed
  friendName: string; // Cached for display
  friendAvatar?: string;
  offerId: mongoose.Types.ObjectId;
  offerTitle: string; // Cached for display
  offerImage?: string;
  storeName: string;
  storeLogo?: string;
  savings: number;
  cashbackPercentage?: number;
  redeemedAt: Date;
  isVisible: boolean; // Privacy control - can be hidden by user
  createdAt: Date;
  updatedAt: Date;
}

const FriendRedemptionSchema = new Schema<IFriendRedemption>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    friendId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    friendName: {
      type: String,
      required: true,
      trim: true,
    },
    friendAvatar: {
      type: String,
    },
    offerId: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
      required: true,
      index: true,
    },
    offerTitle: {
      type: String,
      required: true,
      trim: true,
    },
    offerImage: {
      type: String,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    storeLogo: {
      type: String,
    },
    savings: {
      type: Number,
      required: true,
      min: 0,
    },
    cashbackPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    redeemedAt: {
      type: Date,
      required: true,
      index: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fetching friend redemptions
FriendRedemptionSchema.index({ userId: 1, redeemedAt: -1 });
FriendRedemptionSchema.index({ friendId: 1, isVisible: 1 });

const FriendRedemption = mongoose.model<IFriendRedemption>('FriendRedemption', FriendRedemptionSchema);

export default FriendRedemption;
