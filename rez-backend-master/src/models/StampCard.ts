import { Schema, model, Document, Types } from 'mongoose';

/**
 * Reward — sub-document for stamp card rewards.
 */
export interface IReward {
  type: 'free_item' | 'discount_pct' | 'coins';
  description: string;
  value: number; // productId for free_item, % for discount_pct, amount for coins
  productId?: Types.ObjectId;
}

/**
 * StampCard — loyalty program definition with rewards.
 * Merchants define required stamps and rewards per card.
 */
export interface IStampCard extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  name: string;
  requiredStamps: number;
  reward: IReward[];
  isActive: boolean;
  totalCompleted: number;
  createdAt: Date;
  updatedAt: Date;
}

const RewardSchema = new Schema<IReward>(
  {
    type: {
      type: String,
      enum: ['free_item', 'discount_pct', 'coins'],
      required: true,
    },
    description: { type: String, required: true },
    value: { type: Number, required: true },
    productId: { type: Schema.Types.ObjectId },
  },
  { _id: false },
);

const StampCardSchema = new Schema<IStampCard>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true },
    requiredStamps: { type: Number, required: true, min: 1, max: 50, default: 10 },
    reward: [RewardSchema],
    isActive: { type: Boolean, default: true },
    totalCompleted: { type: Number, default: 0 },
  },
  { timestamps: true },
);

StampCardSchema.index({ merchantId: 1, storeId: 1, isActive: 1 });

export const StampCard = model<IStampCard>('StampCard', StampCardSchema);

export default StampCard;
