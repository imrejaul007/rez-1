import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * StampRedemption — records when a user redeems a completed stamp card for a reward.
 * This is the ledger entry for stamp redemptions, linked to the UserStampCard
 * that was redeemed and the reward that was claimed.
 */
export interface IStampRedemption extends Document {
  userId: Types.ObjectId;
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  cardId: Types.ObjectId;
  userCardId: Types.ObjectId; // the UserStampCard that was redeemed
  rewardIndex: number; // index into StampCard.reward[] that was claimed
  rewardType: 'free_item' | 'discount_pct' | 'coins';
  rewardDescription: string;
  rewardValue: number;
  rewardCode?: string; // optional human-readable code for in-store redemption
  orderId?: Types.ObjectId; // if redemption was tied to an order
  idempotencyKey?: string; // prevents double-redemption
  metadata?: Record<string, any>;
  createdAt: Date;
}

const StampRedemptionSchema = new Schema<IStampRedemption>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    cardId: {
      type: Schema.Types.ObjectId,
      ref: 'StampCard',
      required: true,
      index: true,
    },
    userCardId: {
      type: Schema.Types.ObjectId,
      ref: 'UserStampCard',
      required: true,
      index: true,
    },
    rewardIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    rewardType: {
      type: String,
      enum: ['free_item', 'discount_pct', 'coins'],
      required: true,
    },
    rewardDescription: {
      type: String,
      required: true,
    },
    rewardValue: {
      type: Number,
      required: true,
    },
    rewardCode: {
      type: String,
      index: true,
      sparse: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Compound indexes for common query patterns
StampRedemptionSchema.index({ userId: 1, cardId: 1, createdAt: -1 });
StampRedemptionSchema.index({ merchantId: 1, createdAt: -1 });
StampRedemptionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const StampRedemption = mongoose.model<IStampRedemption>('StampRedemption', StampRedemptionSchema);

export default StampRedemption;
