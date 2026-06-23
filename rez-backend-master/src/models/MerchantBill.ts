/**
 * Merchant Bill Model — Bill Builder (Phase R2)
 *
 * Lightweight bill created by a merchant on their tablet.
 * A bill generates a payment link; the customer scans and pays via the existing
 * StorePayment flow. When Razorpay captures the payment, the webhook marks the
 * bill as paid and the PayDisplay shows the incoming transaction.
 */

import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import * as crypto from 'crypto';

export interface IBillItem {
  name: string;
  qty: number;
  unitPrice: number; // in paise
  total: number; // qty * unitPrice
}

export interface IMerchantBill extends Document {
  /** Human-readable bill reference */
  billNumber: string;

  /** Merchant who created this bill */
  merchantId: Types.ObjectId;

  /** Store this bill belongs to */
  storeId: Types.ObjectId;
  storeSlug: string;

  /** Line items */
  items: IBillItem[];

  /** Amounts — all in paise */
  subtotal: number;
  discount: number;
  total: number;

  /** Status: pending → paid | expired | cancelled */
  status: 'pending' | 'paid' | 'expired' | 'cancelled';

  /** When the payment link expires (default: 15 min) */
  expiresAt: Date;

  /** When payment was confirmed */
  paidAt?: Date;

  /** Linked StorePayment (created when bill is generated) */
  storePaymentId?: Types.ObjectId;
  paymentId?: string; // StorePayment.paymentId

  /** Razorpay order ID for this bill */
  razorpayOrderId?: string;

  /** Customer name/phone if known */
  customerName?: string;
  customerPhone?: string;

  createdAt: Date;
  updatedAt: Date;
}

const MerchantBillSchema = new Schema<IMerchantBill>(
  {
    billNumber: { type: String, required: true, unique: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    storeSlug: { type: String, required: true, index: true },
    items: [
      {
        name: { type: String, required: true, trim: true },
        qty: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    expiresAt: { type: Date, required: true },
    paidAt: { type: Date },
    storePaymentId: { type: Schema.Types.ObjectId, ref: 'StorePayment', sparse: true },
    paymentId: { type: String, sparse: true },
    razorpayOrderId: { type: String, sparse: true },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
  },
  { timestamps: true },
);

// TTL index: automatically removes expired bills after 24 hours
MerchantBillSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Active bills by store
MerchantBillSchema.index({ storeSlug: 1, status: 1 });
MerchantBillSchema.index({ merchantId: 1, createdAt: -1 });

// Generate unique bill number: MB-{timestamp36}-{random8}
// Audit Round K: switched Math.random() → crypto.randomBytes to close
// arch-fitness rule #5 (no Math.random for IDs). Math.random is not
// cryptographically secure; an attacker could observe a stream of bill
// numbers and predict subsequent ones. 8 base-36 chars from 5 CSPRNG
// bytes gives ~40 bits of entropy — collision-safe at platform scale.
MerchantBillSchema.statics.generateBillNumber = function (): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rndInt = crypto.randomBytes(5).readUIntBE(0, 5); // 40 bits
  const rnd = rndInt.toString(36).toUpperCase().padStart(8, '0').slice(-8);
  return `MB-${ts}-${rnd}`;
};

export interface IMerchantBillModel extends Model<IMerchantBill> {
  generateBillNumber(): string;
}

export const MerchantBill = mongoose.model<IMerchantBill, IMerchantBillModel>('MerchantBill', MerchantBillSchema);
export default MerchantBill;
