import { Schema, model, Document, Types } from 'mongoose';

/**
 * PostPurchaseRule — defines automated follow-up messages after a purchase.
 *
 * Examples:
 *  - "7 days after buying Electronics → send warranty reminder"
 *  - "30 days after any purchase → send 'we miss you' offer"
 *  - "14 days after haircut category → suggest next booking"
 */
export interface IPostPurchaseRule extends Document {
  merchantId: Types.ObjectId;
  storeId?: Types.ObjectId;
  name: string;
  triggerType: 'category' | 'product' | 'any';
  triggerCategory?: string;
  triggerProductId?: Types.ObjectId;
  delayDays: number; // send N days after purchase
  channel: 'push' | 'sms' | 'whatsapp';
  messageTitle: string;
  messageBody: string;
  ctaText?: string; // e.g. "Book again", "Claim warranty"
  ctaLink?: string; // deep link or URL
  includeDiscount: boolean;
  discountPercent?: number;
  maxSendsPerCustomer: number; // default 1 — don't spam
  isActive: boolean;
  totalSent: number;
  createdAt: Date;
  updatedAt: Date;
}

const PostPurchaseRuleSchema = new Schema<IPostPurchaseRule>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    triggerType: { type: String, enum: ['category', 'product', 'any'], required: true },
    triggerCategory: { type: String, trim: true },
    triggerProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    delayDays: { type: Number, required: true, min: 1, max: 365 },
    channel: { type: String, enum: ['push', 'sms', 'whatsapp'], required: true },
    messageTitle: { type: String, required: true, maxlength: 100 },
    messageBody: { type: String, required: true, maxlength: 500 },
    ctaText: { type: String, maxlength: 40 },
    ctaLink: { type: String },
    includeDiscount: { type: Boolean, default: false },
    discountPercent: { type: Number, min: 0, max: 100 },
    maxSendsPerCustomer: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true },
    totalSent: { type: Number, default: 0 },
  },
  { timestamps: true },
);

PostPurchaseRuleSchema.index({ merchantId: 1, isActive: 1 });

export const PostPurchaseRule = model<IPostPurchaseRule>('PostPurchaseRule', PostPurchaseRuleSchema);
