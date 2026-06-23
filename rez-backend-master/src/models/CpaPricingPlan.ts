/**
 * CpaPricingPlan — per-merchant rate card for Phase J CPA pricing.
 *
 * Stores the "how much does this merchant pay for each attributable
 * outcome" table. One row per merchant. When a merchant hasn't
 * opted in, we fall back to `DEFAULT_RATES` below — which for the
 * MVP mirrors the pricing doc's launch rates.
 *
 * Rate semantics (all in ₹)
 *   newCustomerConversion — paid when a customer pays at this merchant
 *                           for the FIRST EVER time (earliest completed
 *                           StorePayment). One-shot per customer.
 *   lapsedReactivation    — paid when a previously-lapsed customer
 *                           (>=60 days since prior visit) pays again.
 *                           One-shot per (merchant, customer, lapse-
 *                           episode).
 *   scanConversion        — paid when a QR scanner converts to a
 *                           paying customer within 48h of the scan.
 *                           (Phase J: scaffolded but not emitted yet;
 *                           the subscriber records a placeholder.)
 *
 * Caps
 *   monthlyCap  — no more than this ₹/merchant in a calendar month
 *                 (UTC). Safety net so attribution math can't blow
 *                 up a merchant's bill due to a bad actor /
 *                 instrumentation regression.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICpaRateCard {
  newCustomerConversion: number;
  lapsedReactivation: number;
  scanConversion: number;
}

export interface ICpaPricingPlan extends Document {
  merchantId: Types.ObjectId;
  rates: ICpaRateCard;
  /** Merchant-level monthly cap in ₹. 0 = no cap (tread carefully). */
  monthlyCap: number;
  /** When false, no billing events are emitted for this merchant. */
  isActive: boolean;
  /** Last time a billing event was emitted — bumped by the subscriber. */
  lastBilledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_RATES: ICpaRateCard = {
  newCustomerConversion: 50, // ₹50
  lapsedReactivation: 20,
  scanConversion: 5,
};
export const DEFAULT_MONTHLY_CAP = 5000; // ₹5,000/month safety net

const CpaRateCardSchema = new Schema<ICpaRateCard>(
  {
    newCustomerConversion: { type: Number, required: true, min: 0, default: DEFAULT_RATES.newCustomerConversion },
    lapsedReactivation: { type: Number, required: true, min: 0, default: DEFAULT_RATES.lapsedReactivation },
    scanConversion: { type: Number, required: true, min: 0, default: DEFAULT_RATES.scanConversion },
  },
  { _id: false },
);

const CpaPricingPlanSchema = new Schema<ICpaPricingPlan>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, unique: true, index: true },
    rates: { type: CpaRateCardSchema, required: true, default: () => ({ ...DEFAULT_RATES }) },
    monthlyCap: { type: Number, required: true, min: 0, default: DEFAULT_MONTHLY_CAP },
    isActive: { type: Boolean, required: true, default: false, index: true },
    lastBilledAt: { type: Date },
  },
  { timestamps: true },
);

export interface ICpaPricingPlanModel extends Model<ICpaPricingPlan> {
  /** Returns the merchant's plan, creating a default inactive row if absent. */
  ensureForMerchant(merchantId: Types.ObjectId | string): Promise<ICpaPricingPlan>;
}

CpaPricingPlanSchema.statics.ensureForMerchant = async function (
  merchantId: Types.ObjectId | string,
): Promise<ICpaPricingPlan> {
  const existing = await this.findOne({ merchantId });
  if (existing) return existing;
  return this.create({
    merchantId,
    rates: { ...DEFAULT_RATES },
    monthlyCap: DEFAULT_MONTHLY_CAP,
    isActive: false,
  });
};

export const CpaPricingPlan =
  (mongoose.models.CpaPricingPlan as unknown as ICpaPricingPlanModel) ||
  mongoose.model<ICpaPricingPlan, ICpaPricingPlanModel>('CpaPricingPlan', CpaPricingPlanSchema);

export default CpaPricingPlan;
