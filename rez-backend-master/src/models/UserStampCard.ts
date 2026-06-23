import { Schema, model, Document, Types } from 'mongoose';

/**
 * UserStampCard — customer's individual stamp card progress.
 * Tracks stamps accumulated, completion status, and redemption history.
 */
export interface IUserStampCard extends Document {
  userId: Types.ObjectId;
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  cardId: Types.ObjectId;
  stamps: number;
  status: 'active' | 'completed' | 'redeemed';
  completedAt?: Date;
  redeemedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserStampCardSchema = new Schema<IUserStampCard>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    cardId: { type: Schema.Types.ObjectId, ref: 'StampCard', required: true, index: true },
    stamps: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['active', 'completed', 'redeemed'],
      default: 'active',
    },
    completedAt: { type: Date },
    redeemedAt: { type: Date },
  },
  { timestamps: true },
);

UserStampCardSchema.index({ userId: 1, cardId: 1 }, { unique: true });
UserStampCardSchema.index({ merchantId: 1, userId: 1 });

export const UserStampCard = model<IUserStampCard>('UserStampCard', UserStampCardSchema);

export default UserStampCard;
