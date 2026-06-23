/**
 * MerchantDailyAction — the merchant's "what should I do today" feed.
 *
 * Written nightly by the daily-actions cron (see
 * `src/jobs/dailyActionsJob.ts`). One document per (merchantId, day).
 * The document embeds the list of action items surfaced for that day.
 *
 * Why model it this way
 * ─────────────────────
 * - One read per dashboard open → no N+1 fanout over rules.
 * - Day-scoped key → trivial to "show me yesterday's actions" for a
 *   what-did-I-miss UI later.
 * - Upsert by (merchantId, day) → cron is safely idempotent — running
 *   it twice on the same day replaces the payload with the latest.
 * - Actions are frozen snapshots of the rule output. If a merchant
 *   taps "launch lunch boost" 3 hours after generation, the action
 *   text + CTA won't shift from under them.
 *
 * Feature flag
 * ────────────
 * `DAILY_ACTIONS_MODE` (off | shadow | primary), read by the cron —
 * shadow writes rows with `shadow: true` so the merchant API can hide
 * them until we flip primary.
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── Action item shape ───────────────────────────────────────────────────────

export type DailyActionKind =
  | 'reengage-lapsed' // bring-back-60d-lapsed campaign template
  | 'launch-weekend-rush' // weekend-rush campaign template
  | 'launch-first-visit' // first-visit-offer campaign template
  | 'respond-reviews' // reply to pending customer reviews
  | 'fill-empty-hour' // lunch-hour-boost template for empty-slot days
  | 'generic'; // catch-all for future rules

export type DailyActionCtaKind =
  | 'launch-template' // tap → POST /api/merchant/campaign-templates/:id/launch
  | 'deep-link' // tap → merchant app deep link
  | 'external-url'; // tap → open in browser

export interface IDailyActionItem {
  /** Stable key within a day — '(kind):(qualifier)'. Used for client-
   *  side dedup across reloads + analytics. Example: 'reengage-lapsed:s_xyz'. */
  actionId: string;
  kind: DailyActionKind;
  title: string;
  description: string;
  icon?: string;
  /** Higher first. 0–100. */
  priority: number;
  /** Optional vertical filter; empty = show on any vertical. */
  verticals?: string[];
  cta: {
    kind: DailyActionCtaKind;
    /** For 'launch-template': the campaign-template slug.
     *  For 'deep-link': the in-app route.
     *  For 'external-url': a URL. */
    target: string;
    /** Free-form params passed through to the CTA handler. */
    params?: Record<string, unknown>;
  };
  /** Supporting counts / copy-fill data — e.g. { lapsedCount: 23 }. */
  data?: Record<string, unknown>;
  /** Stops showing after this date. If missing, valid for the whole `day`. */
  expiresAt?: Date;
}

// ─── Document shape ──────────────────────────────────────────────────────────

export interface IMerchantDailyAction extends Document {
  merchantId: Types.ObjectId;
  /** UTC `YYYY-MM-DD`. Upsert key. */
  day: string;
  generatedAt: Date;
  /** Top-N actions, sorted by priority DESC at generation time. */
  actions: IDailyActionItem[];
  /** When true, API filters this row out unless an explicit debug flag
   *  is passed. Written by cron when DAILY_ACTIONS_MODE=shadow. */
  shadow: boolean;
  /** Rule engine version — bumped when the rule set changes in a way
   *  that's not backward-compatible. Lets analytics compare cohorts. */
  engineVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const DailyActionItemSchema = new Schema<IDailyActionItem>(
  {
    actionId: { type: String, required: true },
    kind: { type: String, required: true },
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 500 },
    icon: { type: String, maxlength: 60 },
    priority: { type: Number, required: true, min: 0, max: 100 },
    verticals: [{ type: String, maxlength: 40 }],
    cta: {
      kind: {
        type: String,
        enum: ['launch-template', 'deep-link', 'external-url'],
        required: true,
      },
      target: { type: String, required: true, maxlength: 300 },
      params: { type: Schema.Types.Mixed },
    },
    data: { type: Schema.Types.Mixed },
    expiresAt: { type: Date },
  },
  { _id: false },
);

const MerchantDailyActionSchema = new Schema<IMerchantDailyAction>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    generatedAt: { type: Date, required: true, default: () => new Date() },
    actions: { type: [DailyActionItemSchema], default: [] },
    shadow: { type: Boolean, default: false, index: true },
    engineVersion: { type: Number, required: true, default: 1 },
  },
  { timestamps: true },
);

// Upsert target + primary lookup index.
MerchantDailyActionSchema.index({ merchantId: 1, day: 1 }, { unique: true });
// For cohort analytics: "all rows generated today".
MerchantDailyActionSchema.index({ day: 1, shadow: 1 });

// ─── Model interface ─────────────────────────────────────────────────────────

export interface IMerchantDailyActionModel extends Model<IMerchantDailyAction> {
  /** UTC `YYYY-MM-DD` for a given Date. */
  dayKey(now: Date): string;
  /** Upsert today's action list for a merchant. Safe to call repeatedly. */
  upsertForDay(args: {
    merchantId: Types.ObjectId | string;
    day: string;
    actions: IDailyActionItem[];
    shadow: boolean;
    engineVersion: number;
  }): Promise<IMerchantDailyAction>;
}

MerchantDailyActionSchema.statics.dayKey = function (now: Date): string {
  return now.toISOString().slice(0, 10);
};

MerchantDailyActionSchema.statics.upsertForDay = async function (args: {
  merchantId: Types.ObjectId | string;
  day: string;
  actions: IDailyActionItem[];
  shadow: boolean;
  engineVersion: number;
}): Promise<IMerchantDailyAction> {
  return this.findOneAndUpdate(
    { merchantId: args.merchantId, day: args.day },
    {
      $set: {
        actions: args.actions,
        shadow: args.shadow,
        engineVersion: args.engineVersion,
        generatedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

// ─── Model export ────────────────────────────────────────────────────────────

export const MerchantDailyAction =
  (mongoose.models.MerchantDailyAction as unknown as IMerchantDailyActionModel) ||
  mongoose.model<IMerchantDailyAction, IMerchantDailyActionModel>('MerchantDailyAction', MerchantDailyActionSchema);

export default MerchantDailyAction;
