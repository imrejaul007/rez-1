/**
 * OfferRule Model
 * Merchant-defined automation rules for triggering personalized offers.
 * Supports dormant customer, happy hour, low footfall, birthday, first visit,
 * milestone visit, and weather-triggered campaigns.
 */

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

// ── Trigger Configs (discriminated union) ────────────────────────────────────

export interface IDormantCustomerConfig {
  daysSinceLastVisit: number; // default 14
}

export interface IHappyHourConfig {
  startTime: string; // "HH:mm" e.g. "14:00"
  endTime: string; // "HH:mm" e.g. "17:00"
  activeDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

export interface ILowFootfallConfig {
  revenueThreshold: number; // rupees
  period: 'day' | 'week';
}

export interface IBirthdayConfig {
  daysBefore: number; // send N days before birthday, default 0
  daysAfter: number; // send N days after birthday, default 0
}

export interface IMilestoneVisitConfig {
  visitCounts: number[]; // e.g. [5, 10, 15] — 5th, 10th, 15th visit
}

export interface IWeatherTriggerConfig {
  condition: 'rain' | 'hot' | 'cold';
  city: string;
}

export type TriggerConfig =
  | { type: 'dormant_customer'; config: IDormantCustomerConfig }
  | { type: 'happy_hour'; config: IHappyHourConfig }
  | { type: 'low_footfall'; config: ILowFootfallConfig }
  | { type: 'birthday'; config: IBirthdayConfig }
  | { type: 'first_visit'; config: Record<string, never> }
  | { type: 'milestone_visit'; config: IMilestoneVisitConfig }
  | { type: 'weather_trigger'; config: IWeatherTriggerConfig };

// ── Offer Config ─────────────────────────────────────────────────────────────

export interface IOfferConfig {
  type: 'cashback' | 'discount' | 'free_item';
  value: number; // cashback %, discount %, or item id
  minOrderValue?: number;
  maxDiscount?: number;
  validityDays: number; // how many days the offer is valid after being sent
  title: string;
  message: string; // WhatsApp/push message body
}

// ── OfferRule Document ────────────────────────────────────────────────────────

export interface IOfferRule extends Document {
  _id: Types.ObjectId;
  storeId: Types.ObjectId;
  merchantId: Types.ObjectId;
  type: TriggerConfig['type'];
  triggerConfig: TriggerConfig;
  offerConfig: IOfferConfig;
  notificationChannel: 'whatsapp' | 'push' | 'sms';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Mongoose Schema ──────────────────────────────────────────────────────────

const dormantCustomerSchema = new Schema<IDormantCustomerConfig>(
  { daysSinceLastVisit: { type: Number, default: 14, min: 1, max: 365 } },
  { _id: false },
);

const happyHourSchema = new Schema<IHappyHourConfig>(
  {
    startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    activeDays: { type: [Number], required: true, min: 0, max: 6 },
  },
  { _id: false },
);

const lowFootfallSchema = new Schema<ILowFootfallConfig>(
  {
    revenueThreshold: { type: Number, required: true, min: 0 },
    period: { type: String, enum: ['day', 'week'], required: true },
  },
  { _id: false },
);

const birthdaySchema = new Schema<IBirthdayConfig>(
  {
    daysBefore: { type: Number, default: 0, min: 0, max: 30 },
    daysAfter: { type: Number, default: 0, min: 0, max: 30 },
  },
  { _id: false },
);

const milestoneVisitSchema = new Schema<IMilestoneVisitConfig>(
  {
    visitCounts: { type: [Number], required: true, default: [5, 10, 15] },
  },
  { _id: false },
);

const weatherTriggerSchema = new Schema<IWeatherTriggerConfig>(
  {
    condition: { type: String, enum: ['rain', 'hot', 'cold'], required: true },
    city: { type: String, required: true, maxlength: 100 },
  },
  { _id: false },
);

const triggerConfigSchema = new Schema<TriggerConfig>(
  {
    type: {
      type: String,
      enum: [
        'dormant_customer',
        'happy_hour',
        'low_footfall',
        'birthday',
        'first_visit',
        'milestone_visit',
        'weather_trigger',
      ],
      required: true,
    },
    config: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false },
);

const offerConfigSchema = new Schema<IOfferConfig>(
  {
    type: { type: String, enum: ['cashback', 'discount', 'free_item'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    validityDays: { type: Number, required: true, default: 7, min: 1, max: 90 },
    title: { type: String, required: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 500 },
  },
  { _id: false },
);

const OfferRuleSchema = new Schema<IOfferRule>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'dormant_customer',
        'happy_hour',
        'low_footfall',
        'birthday',
        'first_visit',
        'milestone_visit',
        'weather_trigger',
      ],
      required: true,
    },
    triggerConfig: { type: triggerConfigSchema, required: true },
    offerConfig: { type: offerConfigSchema, required: true },
    notificationChannel: { type: String, enum: ['whatsapp', 'push', 'sms'], default: 'whatsapp' },
    enabled: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// Compound index for efficient per-store rule lookups during cron runs
OfferRuleSchema.index({ storeId: 1, enabled: 1, type: 1 });

const OfferRule: Model<IOfferRule> = mongoose.model<IOfferRule>('OfferRule', OfferRuleSchema);
export default OfferRule;
