/**
 * MerchantCapitalScore — Computed credit profile for REZ Capital.
 *
 * Written weekly by rezCapitalScoringJob. Read by the eligibility route.
 * Not a loan record — just a score snapshot that drives pre-approval UI.
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMerchantCapitalScore extends Document {
  merchantId: Types.ObjectId;

  // ── Score components (0-100 total) ──────────────────────────────────────────
  gmvScore: number; // 0-40  — monthly GMV volume through REZ
  repaymentScore: number; // 0-30  — khata repayment rate
  consistencyScore: number; // 0-20  — active trading days last 30d
  cashbackScore: number; // 0-10  — runs active cashback program

  totalScore: number; // sum of above
  eligible: boolean; // totalScore >= 60

  // ── Offer ────────────────────────────────────────────────────────────────────
  preApprovedAmountPaise: number; // 20% of 30d GMV, capped at ₹5L (in paise)
  monthlyInterestRate: number; // 1.5 – 3.0 %

  // ── Supporting data snapshot ─────────────────────────────────────────────────
  gmv30dPaise: number; // gross merchandise value last 30 days
  khataRepaymentRate: number; // 0-1 ratio
  activeDays30d: number;

  // ── Application state ────────────────────────────────────────────────────────
  applicationStatus: 'none' | 'applied' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
  appliedAt?: Date;
  reviewNote?: string;

  computedAt: Date;
}

const MerchantCapitalScoreSchema = new Schema<IMerchantCapitalScore>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, unique: true, index: true },

    gmvScore: { type: Number, default: 0 },
    repaymentScore: { type: Number, default: 0 },
    consistencyScore: { type: Number, default: 0 },
    cashbackScore: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    eligible: { type: Boolean, default: false },

    preApprovedAmountPaise: { type: Number, default: 0 },
    monthlyInterestRate: { type: Number, default: 3.0 },

    gmv30dPaise: { type: Number, default: 0 },
    khataRepaymentRate: { type: Number, default: 0 },
    activeDays30d: { type: Number, default: 0 },

    applicationStatus: {
      type: String,
      enum: ['none', 'applied', 'under_review', 'approved', 'rejected', 'disbursed'],
      default: 'none',
    },
    appliedAt: { type: Date },
    reviewNote: { type: String },

    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const MerchantCapitalScore =
  mongoose.models['MerchantCapitalScore'] ||
  mongoose.model<IMerchantCapitalScore>('MerchantCapitalScore', MerchantCapitalScoreSchema);
