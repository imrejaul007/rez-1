import { Schema, model, Document, Types } from 'mongoose';

/**
 * ComboItem — sub-document for product combinations.
 */
export interface IComboItem {
  productId: Types.ObjectId;
  productName: string;
  quantity: number;
  basePrice: number;
}

/**
 * ComboProduct — promotional bundles of multiple products with discounted pricing.
 */
export interface IComboProduct extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  name: string;
  image?: string;
  items: IComboItem[];
  comboPrice: number;
  originalTotal: number; // sum of individual prices
  savings: number; // originalTotal - comboPrice
  validFrom?: Date;
  validTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ComboItemSchema = new Schema<IComboItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    basePrice: { type: Number, required: true },
  },
  { _id: false },
);

const ComboProductSchema = new Schema<IComboProduct>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true },
    image: { type: String },
    items: { type: [ComboItemSchema], required: true, minlength: 2 },
    comboPrice: { type: Number, required: true },
    originalTotal: { type: Number, required: true },
    savings: { type: Number, required: true },
    validFrom: { type: Date },
    validTo: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Pre-save hook to recalculate originalTotal and savings
ComboProductSchema.pre('save', function (next) {
  this.originalTotal = this.items.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
  this.savings = parseFloat((this.originalTotal - this.comboPrice).toFixed(2));
  next();
});

ComboProductSchema.index({ merchantId: 1, storeId: 1, isActive: 1 });

export const ComboProduct = model<IComboProduct>('ComboProduct', ComboProductSchema);

export default ComboProduct;
