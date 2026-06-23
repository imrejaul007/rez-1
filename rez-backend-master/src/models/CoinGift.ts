import mongoose, { Schema, Document, Types } from 'mongoose';

export type GiftStatus = 'pending' | 'delivered' | 'claimed' | 'expired' | 'cancelled';
export type GiftDeliveryType = 'instant' | 'scheduled';
export type GiftTheme = string; // Server-driven via WalletConfig.giftLimits.themes

export interface ICoinGift extends Document {
  sender: Types.ObjectId;
  recipient: Types.ObjectId;
  amount: number;
  coinType: 'nuqta' | 'promo';
  theme: GiftTheme;
  message?: string;
  deliveryType: GiftDeliveryType;
  scheduledAt?: Date;
  status: GiftStatus;
  claimedAt?: Date;
  expiresAt: Date;
  senderTxId?: Types.ObjectId;
  recipientTxId?: Types.ObjectId;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CoinGiftSchema = new Schema<ICoinGift>({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  coinType: {
    type: String,
    required: true,
    enum: ['nuqta', 'promo'],
    default: 'nuqta'
  },
  theme: {
    type: String,
    required: true,
    default: 'gift'
  },
  message: {
    type: String,
    maxlength: 500,
    trim: true
  },
  deliveryType: {
    type: String,
    required: true,
    enum: ['instant', 'scheduled'],
    default: 'instant'
  },
  scheduledAt: Date,
  status: {
    type: String,
    required: true,
    enum: ['pending', 'delivered', 'claimed', 'expired', 'cancelled'],
    default: 'pending'
  },
  claimedAt: Date,
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  senderTxId: { type: Schema.Types.ObjectId, ref: 'CoinTransaction' },
  recipientTxId: { type: Schema.Types.ObjectId, ref: 'CoinTransaction' },
  idempotencyKey: { type: String, sparse: true },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Indexes
CoinGiftSchema.index({ sender: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
CoinGiftSchema.index({ sender: 1, createdAt: -1 });
CoinGiftSchema.index({ recipient: 1, status: 1, createdAt: -1 }); // Gift history with pagination
CoinGiftSchema.index({ status: 1, scheduledAt: 1 }); // For scheduled delivery job
CoinGiftSchema.index({ status: 1, expiresAt: 1 });    // For expiry job

export const CoinGift = mongoose.model<ICoinGift>('CoinGift', CoinGiftSchema);
