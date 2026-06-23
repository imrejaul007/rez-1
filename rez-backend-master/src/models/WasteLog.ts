import { Schema, model, Document, Types } from 'mongoose';

/**
 * WasteItem — sub-document for waste log entries.
 */
export interface IWasteItem {
  productId?: Types.ObjectId;
  ingredientId?: Types.ObjectId;
  name: string;
  quantity: number;
  unit: string;
  reason: 'expired' | 'damaged' | 'overcooked' | 'spilled' | 'over_prepared' | 'other';
  estimatedCost: number;
  notes?: string;
}

/**
 * WasteLog — tracks food waste by shift with cost estimation and reasons.
 */
export interface IWasteLog extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  staffId?: Types.ObjectId;
  date: Date;
  shift: 'morning' | 'afternoon' | 'evening' | 'night';
  items: IWasteItem[];
  totalWasteCost: number;
  createdAt: Date;
  updatedAt: Date;
}

const WasteItemSchema = new Schema<IWasteItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    reason: {
      type: String,
      enum: ['expired', 'damaged', 'overcooked', 'spilled', 'over_prepared', 'other'],
      required: true,
    },
    estimatedCost: { type: Number, default: 0 },
    notes: { type: String },
  },
  { _id: false },
);

const WasteLogSchema = new Schema<IWasteLog>(
  {
    merchantId: { type: Schema.Types.ObjectId, required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, required: true, index: true },
    staffId: { type: Schema.Types.ObjectId },
    date: { type: Date, required: true, default: Date.now, index: true },
    shift: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
      required: true,
    },
    items: { type: [WasteItemSchema], required: true, minlength: 1 },
    totalWasteCost: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Pre-save hook to calculate totalWasteCost
WasteLogSchema.pre('save', function (next) {
  this.totalWasteCost = this.items.reduce((sum, item) => sum + item.estimatedCost, 0);
  next();
});

WasteLogSchema.index({ merchantId: 1, date: -1 });
WasteLogSchema.index({ storeId: 1, date: -1 });

export const WasteLog = model<IWasteLog>('WasteLog', WasteLogSchema);

export default WasteLog;
