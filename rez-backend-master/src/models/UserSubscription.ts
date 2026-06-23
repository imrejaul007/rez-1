import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  plan: 'free' | 'premium_monthly';
  status: 'active' | 'cancelled' | 'expired' | 'paused';
  startedAt: Date;
  renewsAt: Date;
  endDate?: Date;
  coinMultiplier: number;
  // Tier (e.g. 'prive', 'premium') is a higher-level grouping than `plan`.
  // Both fields coexist: `plan` is the billable SKU, `tier` is the
  // feature/access level.
  tier?: string;
  previousTier?: string;
  price?: number;
  proratedCredit?: number;
  paymentMethod?: 'razorpay' | 'wallet' | 'stripe' | 'upi' | 'card';
  razorpaySubscriptionId?: string;
  autoRenew?: boolean;
  billingCycle?: 'monthly' | 'quarterly' | 'annual' | 'lifetime';
  benefits?: Record<string, any>;
  upgradeDate?: Date;
  cancellationDate?: Date;
  cancellationReason?: string;
  cancellationFeedback?: string;
  reactivationEligibleUntil?: Date;
  usage?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
  getRemainingDays(): number;
}

const UserSubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'premium_monthly'],
      default: 'free',
      required: true,
    },
    status: {
      // 'paused' added — common subscription state when a user pauses
      // and later resumes
      type: String,
      enum: ['active', 'cancelled', 'expired', 'paused'],
      default: 'active',
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    renewsAt: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      // When the subscription actually ends (after cancellation grace
      // period, etc.). Distinct from `renewsAt`.
    },
    coinMultiplier: {
      type: Number,
      default: 1,
      min: 1,
    },
    // ── Tier / pricing ──────────────────────────────────────
    tier: {
      type: String,
      trim: true,
      maxlength: 64,
    },
    previousTier: {
      type: String,
      trim: true,
      maxlength: 64,
    },
    price: {
      type: Number,
      min: 0,
      max: 10_000_000, // ₹1 crore cap
    },
    proratedCredit: {
      type: Number,
      min: 0,
    },
    // ── Payment ──────────────────────────────────────────────
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'wallet', 'stripe', 'upi', 'card', ''],
      default: '',
    },
    razorpaySubscriptionId: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    // ── Billing cycle / auto-renew ──────────────────────────
    autoRenew: {
      type: Boolean,
      default: true,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'lifetime', ''],
      default: '',
    },
    // ── Benefits / usage ────────────────────────────────────
    benefits: {
      type: Schema.Types.Mixed,
      default: {},
    },
    usage: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // ── Cancellation / reactivation ─────────────────────────
    upgradeDate: {
      type: Date,
    },
    cancellationDate: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    cancellationFeedback: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    reactivationEligibleUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
    // SECURITY: strict is now true (default). All fields used by the
    // subscription controller are now declared in the schema above, with
    // proper types and constraints. Previously this schema had
    // `strict: false` (DB-06 TODO) which silently accepted any field
    // shape, making it easy for the controller to write unvalidated data
    // and impossible to rely on the schema as a contract.
    //
    // If the controller needs a new field, add it here first with proper
    // type constraints. Do NOT silently add fields to the DB.
  },
);

UserSubscriptionSchema.index({ userId: 1, status: 1 });
// Useful for renewal-reminder jobs: find active subs that renew in next 3 days
UserSubscriptionSchema.index({ status: 1, renewsAt: 1 });
// Webhook lookups by Razorpay subscription ID
UserSubscriptionSchema.index({ razorpaySubscriptionId: 1 }, { sparse: true });

/**
 * Returns the number of full days remaining until the subscription
 * renews. Returns 0 if the subscription is past its renewal date.
 */
UserSubscriptionSchema.methods.getRemainingDays = function (): number {
  if (!this.renewsAt) return 0;
  const ms = this.renewsAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
};

export const UserSubscription = mongoose.model<IUserSubscription>('UserSubscription', UserSubscriptionSchema);
