import mongoose, { Schema, Document, Types } from 'mongoose';
import crypto from 'crypto';

// Gift Card Catalog (admin-managed)
export interface IGiftCard extends Document {
  name: string;
  description?: string;
  logo?: string;
  color: string;
  category: 'shopping' | 'food' | 'travel' | 'entertainment' | 'beauty' | 'general';
  denominations: number[];
  cashbackPercentage: number;
  termsAndConditions?: string;
  isActive: boolean;
  storeId?: Types.ObjectId; // If tied to a specific Rez store
  validityDays: number;
  totalIssued: number;
  totalRedeemed: number;
  createdAt: Date;
  updatedAt: Date;
}

const GiftCardSchema = new Schema<IGiftCard>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  logo: String,
  color: { type: String, default: '#1a3a52' },
  category: {
    type: String,
    required: true,
    enum: ['shopping', 'food', 'travel', 'entertainment', 'beauty', 'general'],
    default: 'general'
  },
  denominations: {
    type: [Number],
    required: true,
    validate: {
      validator: (v: number[]) => v.length > 0 && v.every(d => d > 0),
      message: 'At least one positive denomination required'
    }
  },
  cashbackPercentage: { type: Number, default: 0, min: 0, max: 100 },
  termsAndConditions: String,
  isActive: { type: Boolean, default: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
  validityDays: { type: Number, default: 365, min: 1 },
  totalIssued: { type: Number, default: 0 },
  totalRedeemed: { type: Number, default: 0 }
}, { timestamps: true });

GiftCardSchema.index({ category: 1, isActive: 1 });
GiftCardSchema.index({ name: 'text' });

export const GiftCard = mongoose.model<IGiftCard>('GiftCard', GiftCardSchema);

// User's Purchased Gift Card
export type UserGiftCardStatus = 'active' | 'partially_used' | 'fully_used' | 'expired';

export interface IUserGiftCard extends Document {
  user: Types.ObjectId;
  giftCard: Types.ObjectId;
  code: string;        // Encrypted gift card code
  pin?: string;        // Encrypted PIN (if applicable)
  amount: number;      // Original purchase amount
  balance: number;     // Remaining balance
  purchasedAt: Date;
  expiresAt: Date;
  status: UserGiftCardStatus;
  transactionId?: Types.ObjectId;
  redemptions: Array<{
    amount: number;
    orderId?: Types.ObjectId;
    description: string;
    redeemedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Simple encryption for gift card codes (use proper key management in production)
const ENCRYPTION_KEY = process.env.GIFT_CARD_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf-8'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = parts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'utf-8'), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const UserGiftCardSchema = new Schema<IUserGiftCard>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  giftCard: { type: Schema.Types.ObjectId, ref: 'GiftCard', required: true },
  code: { type: String, required: true },
  pin: String,
  amount: { type: Number, required: true, min: 1 },
  balance: { type: Number, required: true, min: 0 },
  purchasedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  status: {
    type: String,
    required: true,
    enum: ['active', 'partially_used', 'fully_used', 'expired'],
    default: 'active'
  },
  transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  redemptions: [{
    amount: { type: Number, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    description: { type: String, required: true },
    redeemedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

UserGiftCardSchema.index({ user: 1, status: 1 });
UserGiftCardSchema.index({ expiresAt: 1 });

// Generate a unique gift card code
UserGiftCardSchema.pre('save', function(next) {
  if (this.isNew && !this.code.includes(':')) {
    // Generate and encrypt a unique code
    const rawCode = `REZ-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    this.code = encrypt(rawCode);
  }
  // Update status based on balance
  if (this.balance <= 0) {
    this.status = 'fully_used';
  } else if (this.balance < this.amount) {
    this.status = 'partially_used';
  }
  next();
});

// Method to reveal decrypted code
UserGiftCardSchema.methods.revealCode = function(): string {
  try {
    return decrypt(this.code);
  } catch {
    return '***ERROR***';
  }
};

export const UserGiftCard = mongoose.model<IUserGiftCard>('UserGiftCard', UserGiftCardSchema);
