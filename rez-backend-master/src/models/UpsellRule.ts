import { Schema, model, Document, Types } from 'mongoose';

/**
 * UpsellRule — defines when and what to suggest to a customer.
 *
 * Trigger types:
 *   - 'product'  : suggest when a specific product is in cart
 *   - 'category' : suggest when any product from a category is in cart
 *   - 'any'      : always suggest (shown on every checkout)
 *
 * Example: haircut in cart → suggest beard trim
 */
export interface IUpsellRule extends Document {
  merchantId: Types.ObjectId;
  storeId?: Types.ObjectId;
  name: string; // e.g. "Beard trim upsell"
  triggerType: 'product' | 'category' | 'any';
  triggerProductId?: Types.ObjectId;
  triggerCategory?: string;
  suggestedProductId: Types.ObjectId;
  suggestedProductName: string;
  suggestedProductPrice: number;
  suggestedProductImage?: string;
  badgeText?: string; // e.g. "Popular add-on" / "Most ordered with this"
  discountPercent?: number; // optional discount when added as upsell
  isActive: boolean;
  priority: number; // lower = shown first
  totalImpressions: number;
  totalAccepted: number;
  createdAt: Date;
  updatedAt: Date;
}

const UpsellRuleSchema = new Schema<IUpsellRule>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    triggerType: { type: String, enum: ['product', 'category', 'any'], required: true },
    triggerProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    triggerCategory: { type: String, trim: true },
    suggestedProductId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    suggestedProductName: { type: String, required: true, trim: true },
    suggestedProductPrice: { type: Number, required: true, min: 0 },
    suggestedProductImage: { type: String },
    badgeText: { type: String, maxlength: 40 },
    discountPercent: { type: Number, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    totalAccepted: { type: Number, default: 0 },
  },
  { timestamps: true },
);

UpsellRuleSchema.index({ merchantId: 1, isActive: 1 });
UpsellRuleSchema.index({ triggerProductId: 1 });
UpsellRuleSchema.index({ triggerCategory: 1 });

export const UpsellRule = model<IUpsellRule>('UpsellRule', UpsellRuleSchema);
