import { Schema, model, Document, Types } from 'mongoose';

/**
 * RecipeIngredient — sub-document for recipe line items.
 */
export interface IRecipeIngredient {
  ingredientId: Types.ObjectId;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

/**
 * Recipe — product recipes with ingredient costing and margin analysis.
 * Tracks cost, selling price, and food cost percentages.
 */
export interface IRecipe extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  productId: Types.ObjectId;
  productName: string;
  servings: number;
  ingredients: IRecipeIngredient[];
  totalCost: number; // auto-calculated
  sellingPrice: number;
  grossMargin: number; // (selling - cost) / selling
  foodCostPct: number; // cost / selling × 100
  isStale: boolean; // true if ingredient price changed
  createdAt: Date;
  updatedAt: Date;
}

const RecipeIngredientSchema = new Schema<IRecipeIngredient>(
  {
    ingredientId: { type: Schema.Types.ObjectId, required: true },
    ingredientName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    unitCost: { type: Number, required: true },
  },
  { _id: false },
);

const RecipeSchema = new Schema<IRecipe>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true },
    servings: { type: Number, default: 1 },
    ingredients: [RecipeIngredientSchema],
    totalCost: { type: Number, default: 0 },
    sellingPrice: { type: Number, required: true },
    grossMargin: { type: Number, default: 0 },
    foodCostPct: { type: Number, default: 0 },
    isStale: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Pre-save hook to recalculate totalCost, grossMargin, foodCostPct
RecipeSchema.pre('save', function (next) {
  const totalCost = this.ingredients.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  this.totalCost = parseFloat(totalCost.toFixed(2));

  if (this.sellingPrice > 0) {
    this.foodCostPct = parseFloat(((totalCost / this.sellingPrice) * 100).toFixed(2));
    this.grossMargin = parseFloat((((this.sellingPrice - totalCost) / this.sellingPrice) * 100).toFixed(2));
  }

  next();
});

RecipeSchema.index({ merchantId: 1, storeId: 1 });
RecipeSchema.index({ storeId: 1, productId: 1 }, { unique: true });

export const Recipe = model<IRecipe>('Recipe', RecipeSchema);

export default Recipe;
