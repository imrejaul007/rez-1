import { Schema, model, Document, Types } from 'mongoose';

/**
 * Redemption — sub-document for gift card usage history.
 */
export interface IRedemption {
  amount: number;
  usedAt: Date;
  orderId?: Types.ObjectId;
}

/**
 * StoreGiftCard — digital gift cards with unique codes, expiry, and redemption tracking.
 */
export interface IStoreGiftCard extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  code: string; // "BREW-XKYZ-8421"
  purchasedBy: Types.ObjectId;
  purchasedFor?: Types.ObjectId;
  amount: number; // face value
  balance: number; // remaining
  expiresAt: Date;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  redemptions: IRedemption[];
  createdAt: Date;
  updatedAt: Date;
}

const RedemptionSchema = new Schema<IRedemption>(
  {
    amount: { type: Number, required: true },
    usedAt: { type: Date, required: true },
    orderId: { type: Schema.Types.ObjectId },
  },
  { _id: false },
);

const StoreGiftCardSchema = new Schema<IStoreGiftCard>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    purchasedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    purchasedFor: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number, required: true, min: 1 },
    balance: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'used', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    redemptions: { type: [RedemptionSchema], default: [] },
  },
  { timestamps: true },
);

StoreGiftCardSchema.index({ code: 1 }, { unique: true });
StoreGiftCardSchema.index({ merchantId: 1, status: 1 });
StoreGiftCardSchema.index({ purchasedBy: 1 });

/**
 * Static helper method to generate a random 16-character code like "BREW-XKYZ-8421"
 */
StoreGiftCardSchema.statics.generateCode = function (): string {
  const prefix = 'BREW';
  const uuid = crypto.randomUUID().replace('-', '');
  const code = uuid.substring(0, 4).toUpperCase();
  const part2 = uuid.substring(4, 8).toUpperCase();
  const part3 = uuid.substring(8, 12);
  return `${prefix}-${code}-${part2}-${part3}`;
};

export const StoreGiftCard = model<IStoreGiftCard>('StoreGiftCard', StoreGiftCardSchema);

export default StoreGiftCard;
