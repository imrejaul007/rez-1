/**
 * Corporate B2B model
 *
 * Represents a company account that purchases REZ coins in bulk and
 * distributes them to employees as benefits, incentives, or perks.
 *
 * Flow:
 *   Company signs up → loads coin budget → distributes to employees
 *   → employees spend at REZ merchant network
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

// ── Department ────────────────────────────────────────────────────────────────

export interface ICorporateDepartment {
  _id: Types.ObjectId;
  name: string;
  budget: number; // coins allocated to this department
  spent: number; // coins already distributed from this department
  headCount: number; // number of members
}

const CorporateDepartmentSchema = new Schema<ICorporateDepartment>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    budget: { type: Number, default: 0, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
    headCount: { type: Number, default: 0, min: 0 },
  },
  { _id: true },
);

// ── Corporate Account ─────────────────────────────────────────────────────────

export interface ICorporate extends Document {
  companyName: string;
  companyEmail: string; // billing / admin contact
  companyPhone?: string;
  companyLogo?: string;
  industry?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;

  // Auth — HR admin who manages the dashboard
  adminUserId?: Types.ObjectId; // linked User (merchant or standalone)
  adminEmail: string;

  // Coin budget
  coinBalance: number; // total unspent coins in company wallet
  totalCoinsLoaded: number; // lifetime coins purchased
  totalCoinsDistributed: number; // lifetime coins sent to employees
  totalCoinsRedeemed: number; // lifetime coins spent at stores

  // Plan
  plan: 'starter' | 'growth' | 'enterprise';
  isActive: boolean;

  departments: ICorporateDepartment[];

  // Stats (cached, refreshed on distribution)
  memberCount: number;
  lastDistributionAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const CorporateSchema = new Schema<ICorporate>(
  {
    companyName: { type: String, required: true, trim: true, maxlength: 200 },
    companyEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    companyPhone: { type: String, trim: true, maxlength: 15 },
    companyLogo: String,
    industry: { type: String, trim: true, maxlength: 100 },
    gstin: { type: String, trim: true, maxlength: 20 },
    address: { type: String, trim: true, maxlength: 300 },
    city: { type: String, trim: true },
    state: { type: String, trim: true },

    adminUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    adminEmail: { type: String, required: true, lowercase: true, trim: true },

    coinBalance: { type: Number, default: 0, min: 0 },
    totalCoinsLoaded: { type: Number, default: 0, min: 0 },
    totalCoinsDistributed: { type: Number, default: 0, min: 0 },
    totalCoinsRedeemed: { type: Number, default: 0, min: 0 },

    plan: {
      type: String,
      enum: ['starter', 'growth', 'enterprise'],
      default: 'starter',
    },
    isActive: { type: Boolean, default: true },

    departments: { type: [CorporateDepartmentSchema], default: [] },
    memberCount: { type: Number, default: 0, min: 0 },
    lastDistributionAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

CorporateSchema.index({ isActive: 1 });
CorporateSchema.index({ adminUserId: 1 });

export const Corporate = mongoose.model<ICorporate>('Corporate', CorporateSchema);
