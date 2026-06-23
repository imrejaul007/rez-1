import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMerchantFoodCostSnapshot extends Document {
  merchantId: Types.ObjectId;
  snapshotDate: Date;
  totalFoodCost: number;
  totalRevenue: number;
  foodCostPercentage: number;
  // items: product-level cost breakdown for snapshot
  items: Array<{
    productId: Types.ObjectId;
    name: string;
    cost: number;
    quantity: number;
  }>;
  // ingredients: ingredient-level cost breakdown; used by merchantEventSubscribers
  // to mark snapshots stale when a purchase order updates ingredient costs
  ingredients: Array<{
    ingredientId: Types.ObjectId;
    cost: number;
    unit: string;
  }>;
  // isStale: true when an upstream ingredient cost has changed since this snapshot
  isStale: boolean;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantFoodCostSnapshotSchema = new Schema<IMerchantFoodCostSnapshot>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    snapshotDate: {
      type: Date,
      required: true,
    },
    totalFoodCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    foodCostPercentage: {
      type: Number,
      default: 0,
      min: 0,
    },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        name: { type: String, trim: true },
        cost: { type: Number, default: 0, min: 0 },
        quantity: { type: Number, default: 0, min: 0 },
        _id: false,
      },
    ],
    ingredients: [
      {
        ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient' },
        cost: { type: Number, default: 0, min: 0 },
        unit: { type: String, trim: true },
        _id: false,
      },
    ],
    isStale: {
      type: Boolean,
      default: false,
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

MerchantFoodCostSnapshotSchema.index({ merchantId: 1, snapshotDate: -1 });
MerchantFoodCostSnapshotSchema.index({ 'ingredients.ingredientId': 1 });
MerchantFoodCostSnapshotSchema.index({ merchantId: 1, isStale: 1 });

const MerchantFoodCostSnapshot = mongoose.models['MerchantFoodCostSnapshot']
  ? (mongoose.models['MerchantFoodCostSnapshot'] as mongoose.Model<IMerchantFoodCostSnapshot>)
  : mongoose.model<IMerchantFoodCostSnapshot>('MerchantFoodCostSnapshot', MerchantFoodCostSnapshotSchema);

export default MerchantFoodCostSnapshot;
