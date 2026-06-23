/**
 * CampaignTemplate — catalog of pre-built campaign blueprints.
 *
 * Sprint 2 / Phase C: merchant picks a template → one backend RPC creates
 * the Coupon + BroadcastCampaign and enqueues delivery. No free-form
 * campaign editor surface (that already exists and stays); this is the
 * "30-second from open-app to campaign-running" path that the growth-
 * strategy doc calls out as the activation driver.
 *
 * Seeded at boot / via `src/seeds/campaignTemplateSeeds.ts`. A merchant
 * never creates a CampaignTemplate document — they launch INSTANCES of
 * it (which materialise as Coupon + BroadcastCampaign rows).
 *
 * Scoping
 * ───────
 *  - `verticals` empty array OR undefined = available to every vertical.
 *  - `verticals` non-empty = only surfaced to merchants in that list.
 *  - `isActive: false` hides from the merchant UI (kill-switch without
 *    needing to delete the row).
 */

import mongoose, { Schema, Document } from 'mongoose';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TemplateAudienceRule =
  | 'all-customers'
  | 'new-customers'
  | 'lapsed-30d'
  | 'lapsed-60d'
  | 'high-spenders';

export type TemplateChannel = 'whatsapp' | 'push' | 'sms';
export type TemplateVertical = 'restaurant' | 'salon' | 'hotel' | 'grocery' | 'general';

export interface ITemplateOffer {
  discountType: 'PERCENTAGE' | 'FIXED';
  /** Percentage (e.g. 15 for 15%) or fixed amount in paise / whole rupees
   *  depending on the existing Coupon conventions. Mirrors Coupon.discountValue. */
  discountValue: number;
  minOrderValue?: number;
  /** How long the launched offer stays valid, in hours from launch. */
  validityHours: number;
  /** Optional max-discount cap in the merchant's currency (₹). Applied when
   *  discountType=PERCENTAGE so big bills don't give away the store. */
  maxDiscountCap?: number;
}

export interface ITemplateCampaign {
  /** Display name for the generated BroadcastCampaign row. Variables are
   *  interpolated at launch time: {{storeName}}, {{discount}}, etc. */
  name: string;
  /** Message body for the broadcast. Same interpolation rules. */
  messageBody: string;
  audienceRule: TemplateAudienceRule;
  channels: TemplateChannel[];
  /** Optional day-of-week constraints. Empty / missing = every day. */
  daysOfWeek?: number[]; // 0=Sun .. 6=Sat
  /** Optional hour window. 0-23. Useful for happy-hour-style templates. */
  startHourLocal?: number;
  endHourLocal?: number;
}

export interface ICampaignTemplate extends Document {
  /** Stable identifier e.g. 'lunch-hour-boost'. URL slug for launch RPC. */
  templateId: string;
  title: string;
  description: string;
  icon?: string;
  verticals: TemplateVertical[];
  tags: string[];
  offer: ITemplateOffer;
  campaign: ITemplateCampaign;
  /** Rough impact estimate the UI can display. Not used for routing. */
  predictedImpact?: string;
  /** Hide from merchant UI without deleting. */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const OfferSchema = new Schema<ITemplateOffer>(
  {
    discountType: { type: String, enum: ['PERCENTAGE', 'FIXED'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, min: 0 },
    validityHours: { type: Number, required: true, min: 1 },
    maxDiscountCap: { type: Number, min: 0 },
  },
  { _id: false },
);

const CampaignSchema = new Schema<ITemplateCampaign>(
  {
    name: { type: String, required: true, trim: true },
    messageBody: { type: String, required: true, trim: true },
    audienceRule: {
      type: String,
      enum: ['all-customers', 'new-customers', 'lapsed-30d', 'lapsed-60d', 'high-spenders'],
      required: true,
    },
    channels: {
      type: [{ type: String, enum: ['whatsapp', 'push', 'sms'] }],
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one channel required',
      },
    },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    startHourLocal: { type: Number, min: 0, max: 23 },
    endHourLocal: { type: Number, min: 0, max: 23 },
  },
  { _id: false },
);

const CampaignTemplateSchema = new Schema<ICampaignTemplate>(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]{2,60}$/, 'templateId must be kebab-case, 2-60 chars'],
    },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 240 },
    icon: { type: String, trim: true },
    verticals: [
      { type: String, enum: ['restaurant', 'salon', 'hotel', 'grocery', 'general'] },
    ],
    tags: [{ type: String, trim: true, lowercase: true }],
    offer: { type: OfferSchema, required: true },
    campaign: { type: CampaignSchema, required: true },
    predictedImpact: { type: String, trim: true, maxlength: 120 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// Query helpers
CampaignTemplateSchema.index({ isActive: 1, verticals: 1 });

export const CampaignTemplate =
  (mongoose.models.CampaignTemplate as mongoose.Model<ICampaignTemplate>) ||
  mongoose.model<ICampaignTemplate>('CampaignTemplate', CampaignTemplateSchema);

export default CampaignTemplate;
