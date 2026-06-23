import { Schema, model, Document, Types } from 'mongoose';

/**
 * Ingredient — inventory management for merchant food/beverage items.
 * Tracks cost, stock level, reorder points, and supplier relationships.
 */
export interface IIngredient extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  name: string;
  unit: 'kg' | 'g' | 'litre' | 'ml' | 'piece' | 'dozen';
  currentCost: number; // ₹ per unit
  stockQty: number;
  reorderLevel: number;
  supplierId?: Types.ObjectId;
  category: 'produce' | 'protein' | 'dairy' | 'beverage' | 'dry' | 'spice' | 'other';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IngredientSchema = new Schema<IIngredient>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    name: { type: String, required: true, trim: true },
    unit: {
      type: String,
      enum: ['kg', 'g', 'litre', 'ml', 'piece', 'dozen'],
      required: true,
    },
    currentCost: { type: Number, required: true, min: 0 },
    stockQty: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    category: {
      type: String,
      enum: ['produce', 'protein', 'dairy', 'beverage', 'dry', 'spice', 'other'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

IngredientSchema.index({ merchantId: 1, storeId: 1 });
IngredientSchema.index({ merchantId: 1, name: 'text' });

export const Ingredient = model<IIngredient>('Ingredient', IngredientSchema);

export default Ingredient;
