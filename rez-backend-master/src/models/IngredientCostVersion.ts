import { Schema, model, Document, Types } from 'mongoose';

/**
 * IngredientCostVersion — append-only log of ingredient cost changes.
 *
 * Used to reconstruct accurate food cost at any historical point in time.
 * Invariant: never update in place — always create a new version.
 *
 * v3 Architecture: Prevents historical margin corruption when ingredient
 * prices change. Past order margin must NOT change when ingredient price
 * changes today.
 */
export interface IIngredientCostVersion extends Document {
  ingredientId: Types.ObjectId;
  merchantId: Types.ObjectId;
  cost: number; // cost per unit
  unit: string; // 'kg', 'litre', 'piece', etc.
  effectiveFrom: Date; // when this cost became active
  effectiveTo?: Date; // null = currently active
  source: 'manual' | 'purchase_order';
  purchaseOrderId?: Types.ObjectId;
  createdBy: string; // userId or 'system'
  createdAt: Date;
}

const IngredientCostVersionSchema = new Schema<IIngredientCostVersion>(
  {
    ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    cost: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    effectiveFrom: { type: Date, required: true, default: Date.now },
    effectiveTo: { type: Date, default: null },
    source: { type: String, enum: ['manual', 'purchase_order'], required: true },
    purchaseOrderId: { type: Schema.Types.ObjectId },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // append-only
  },
);

// ── Indexes ──────────────────────────────────────────────────────────────
IngredientCostVersionSchema.index({ ingredientId: 1, effectiveFrom: -1 });
IngredientCostVersionSchema.index({ merchantId: 1, effectiveFrom: -1 });
// Compound for active-version lookups: ingredient + no effectiveTo
IngredientCostVersionSchema.index({ ingredientId: 1, effectiveTo: 1 });

export const IngredientCostVersion = model<IIngredientCostVersion>(
  'IngredientCostVersion',
  IngredientCostVersionSchema,
);

// ─────────────────────────────────────────────────────────────────────────────
// Query helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the ingredient cost as of a specific date.
 * Used for historical food cost reports — margin stays accurate regardless
 * of when the report is run.
 *
 * @example
 *   const cost = await getCostAtDate('ingredientId', new Date('2026-02-15'));
 */
export async function getCostAtDate(ingredientId: string | Types.ObjectId, date: Date): Promise<number> {
  const version = await IngredientCostVersion.findOne({
    ingredientId,
    effectiveFrom: { $lte: date },
  })
    .sort({ effectiveFrom: -1 })
    .limit(1)
    .lean();

  return version?.cost ?? 0;
}

/**
 * Close the current active version and create a new one.
 * Called when a purchase order is received or cost is manually updated.
 *
 * @param params - new cost parameters
 */
export async function recordCostChange(params: {
  ingredientId: string | Types.ObjectId;
  merchantId: string | Types.ObjectId;
  newCost: number;
  unit: string;
  source: 'manual' | 'purchase_order';
  purchaseOrderId?: string | Types.ObjectId;
  createdBy: string;
}): Promise<IIngredientCostVersion> {
  const now = new Date();

  // 1. Close existing active version
  await IngredientCostVersion.findOneAndUpdate(
    { ingredientId: params.ingredientId, effectiveTo: null },
    { effectiveTo: now },
  );

  // 2. Create new version (currently active)
  const newVersion = await IngredientCostVersion.create({
    ingredientId: params.ingredientId,
    merchantId: params.merchantId,
    cost: params.newCost,
    unit: params.unit,
    effectiveFrom: now,
    effectiveTo: null, // currently active
    source: params.source,
    purchaseOrderId: params.purchaseOrderId,
    createdBy: params.createdBy,
  });

  return newVersion;
}

export default IngredientCostVersion;
