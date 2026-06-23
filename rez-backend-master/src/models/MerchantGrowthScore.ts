/**
 * MerchantGrowthScore — daily 0-100 health snapshot (Phase H).
 *
 * One document per (merchantId, day). Upsert by that key so the cron
 * is idempotent within a UTC day. Schema keeps the component sub-
 * scores so the card + future detail screen can explain WHY the score
 * is what it is — no opaque total.
 *
 * Sub-scores (0-100 each):
 *   gmvGrowth     — MoM GMV lift vs prior 30 days
 *   newCustomerPct — % of GMV from new-lifecycle customers this window
 *   retention     — (active + at-risk) / (active + at-risk + lapsed + churned)
 *   campaignCadence — Broadcasts launched / 30 days, clamped 0..100
 *
 * Total = weighted average (gmvGrowth 40% + newCustomerPct 20% +
 *         retention 30% + campaignCadence 10%). Weights encode the
 *         priority order from the growth-strategy doc: growth > keep >
 *         attract > message.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IGrowthScoreBreakdown {
  gmvGrowth: number;
  newCustomerPct: number;
  retention: number;
  campaignCadence: number;
}

export interface IMerchantGrowthScore extends Document {
  merchantId: Types.ObjectId;
  /** UTC YYYY-MM-DD. Upsert key. */
  day: string;
  computedAt: Date;
  /** 0-100. */
  total: number;
  breakdown: IGrowthScoreBreakdown;
  /** True when the cron was in shadow mode; hide from primary API. */
  shadow: boolean;
  /** Scoring algorithm version — bump when weights / inputs change in
   *  a non-backwards-compatible way. */
  engineVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const BreakdownSchema = new Schema<IGrowthScoreBreakdown>(
  {
    gmvGrowth: { type: Number, required: true, min: 0, max: 100 },
    newCustomerPct: { type: Number, required: true, min: 0, max: 100 },
    retention: { type: Number, required: true, min: 0, max: 100 },
    campaignCadence: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

const MerchantGrowthScoreSchema = new Schema<IMerchantGrowthScore>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    computedAt: { type: Date, required: true, default: () => new Date() },
    total: { type: Number, required: true, min: 0, max: 100 },
    breakdown: { type: BreakdownSchema, required: true },
    shadow: { type: Boolean, default: false, index: true },
    engineVersion: { type: Number, required: true, default: 1 },
  },
  { timestamps: true },
);

// Upsert key + primary lookup.
MerchantGrowthScoreSchema.index({ merchantId: 1, day: 1 }, { unique: true });
// Cohort queries: "all scores computed today".
MerchantGrowthScoreSchema.index({ day: 1, shadow: 1 });

export interface IMerchantGrowthScoreModel extends Model<IMerchantGrowthScore> {
  dayKey(now: Date): string;
  upsertForDay(args: {
    merchantId: Types.ObjectId | string;
    day: string;
    total: number;
    breakdown: IGrowthScoreBreakdown;
    shadow: boolean;
    engineVersion: number;
  }): Promise<IMerchantGrowthScore>;
}

MerchantGrowthScoreSchema.statics.dayKey = function (now: Date): string {
  return now.toISOString().slice(0, 10);
};

MerchantGrowthScoreSchema.statics.upsertForDay = async function (args: {
  merchantId: Types.ObjectId | string;
  day: string;
  total: number;
  breakdown: IGrowthScoreBreakdown;
  shadow: boolean;
  engineVersion: number;
}): Promise<IMerchantGrowthScore> {
  return this.findOneAndUpdate(
    { merchantId: args.merchantId, day: args.day },
    {
      $set: {
        total: args.total,
        breakdown: args.breakdown,
        shadow: args.shadow,
        engineVersion: args.engineVersion,
        computedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

export const MerchantGrowthScore =
  (mongoose.models.MerchantGrowthScore as unknown as IMerchantGrowthScoreModel) ||
  mongoose.model<IMerchantGrowthScore, IMerchantGrowthScoreModel>(
    'MerchantGrowthScore',
    MerchantGrowthScoreSchema,
  );

export default MerchantGrowthScore;
