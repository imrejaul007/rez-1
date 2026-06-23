import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Special Program Configuration Model
 *
 * Stores admin-configurable settings for each special program:
 * - Student Zone: Campus-based earning program
 * - Corporate Perks: Employee benefit program
 * - Nuqta Privé: Reputation-based premium program
 *
 * One config document per program (3 total).
 * All eligibility rules, caps, multipliers, and benefits are configurable from admin.
 */

export type SpecialProgramSlug = 'student_zone' | 'corporate_perks' | 'nuqta_prive';

export interface IEligibilityRule {
  type: 'min_orders' | 'min_spend' | 'min_referrals' | 'min_streak' | 'account_age_days';
  value: number;
  label: string;
}

export interface IProgramBenefit {
  title: string;
  description: string;
  icon: string;
  type: 'earning_multiplier' | 'exclusive_campaign' | 'task_reward' | 'perk' | 'recognition';
}

export interface IEarningConfig {
  monthlyCap: number;
  multiplier: number;
  multiplierAppliesTo: string[];
  earningsDisplayText: string;
}

export interface IEligibilityConfig {
  requiresVerification: boolean;
  verificationZone?: string;
  requiresPriveScore: boolean;
  minPriveScore?: number;
  customRules: IEligibilityRule[];
}

export interface ISpecialProgramConfig extends Document {
  slug: SpecialProgramSlug;
  name: string;
  description: string;
  badge: string;
  icon: string;

  eligibility: IEligibilityConfig;
  benefits: IProgramBenefit[];
  earningConfig: IEarningConfig;

  linkedCampaigns: Types.ObjectId[];
  gradientColors: string[];
  isActive: boolean;
  priority: number;

  createdAt: Date;
  updatedAt: Date;
}

const EligibilityRuleSchema = new Schema<IEligibilityRule>({
  type: {
    type: String,
    enum: ['min_orders', 'min_spend', 'min_referrals', 'min_streak', 'account_age_days'],
    required: true,
  },
  value: { type: Number, required: true, min: 0 },
  label: { type: String, required: true },
}, { _id: false });

const ProgramBenefitSchema = new Schema<IProgramBenefit>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  type: {
    type: String,
    enum: ['earning_multiplier', 'exclusive_campaign', 'task_reward', 'perk', 'recognition'],
    required: true,
  },
}, { _id: false });

const EligibilityConfigSchema = new Schema<IEligibilityConfig>({
  requiresVerification: { type: Boolean, default: false },
  verificationZone: { type: String },
  requiresPriveScore: { type: Boolean, default: false },
  minPriveScore: { type: Number, min: 0, max: 100 },
  customRules: [EligibilityRuleSchema],
}, { _id: false });

const EarningConfigSchema = new Schema<IEarningConfig>({
  monthlyCap: { type: Number, default: 0, min: 0 },
  multiplier: { type: Number, default: 1.0, min: 1.0 },
  multiplierAppliesTo: [{ type: String }],
  earningsDisplayText: { type: String, default: '' },
}, { _id: false });

const SpecialProgramConfigSchema = new Schema<ISpecialProgramConfig>(
  {
    slug: {
      type: String,
      enum: ['student_zone', 'corporate_perks', 'nuqta_prive'],
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    badge: { type: String, required: true },
    icon: { type: String, required: true },

    eligibility: { type: EligibilityConfigSchema, required: true },
    benefits: [ProgramBenefitSchema],
    earningConfig: { type: EarningConfigSchema, required: true },

    linkedCampaigns: [{
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
    }],
    gradientColors: [{ type: String }],
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes
SpecialProgramConfigSchema.index({ slug: 1 }, { unique: true });
SpecialProgramConfigSchema.index({ isActive: 1, priority: -1 });

export const SpecialProgramConfig = mongoose.model<ISpecialProgramConfig>(
  'SpecialProgramConfig',
  SpecialProgramConfigSchema
);

export default SpecialProgramConfig;
