import mongoose, { Schema, Document, Types } from 'mongoose';

export type SubscriptionAuditAction =
  | 'created'
  | 'upgraded'
  | 'downgraded'
  | 'cancelled'
  | 'renewed'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'trial_started'
  | 'trial_expired'
  | 'grace_period_entered'
  | 'auto_renewed'
  | 'benefits_changed'
  | 'admin_override'
  | 'upgrade_initiated'
  | 'upgrade_confirmed'
  | 'upgrade_failed'
  | 'downgrade_scheduled'
  | 'downgrade_executed'
  | 'expired';

export interface ISubscriptionAuditLog extends Document {
  subscriptionId?: Types.ObjectId;
  userId: Types.ObjectId;
  action: SubscriptionAuditAction;
  previousState?: {
    tier?: string;
    status?: string;
    price?: number;
    billingCycle?: string;
  };
  newState?: {
    tier?: string;
    status?: string;
    price?: number;
    billingCycle?: string;
  };
  metadata?: {
    paymentId?: string;
    upgradeId?: string;
    proratedAmount?: number;
    promoCode?: string;
    adminUserId?: string;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    description?: string;
  };
  createdAt: Date;
}

const SubscriptionAuditLogSchema = new Schema<ISubscriptionAuditLog>(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'created', 'upgraded', 'downgraded', 'cancelled', 'renewed',
        'payment_succeeded', 'payment_failed', 'trial_started', 'trial_expired',
        'grace_period_entered', 'auto_renewed', 'benefits_changed', 'admin_override',
        'upgrade_initiated', 'upgrade_confirmed', 'upgrade_failed',
        'downgrade_scheduled', 'downgrade_executed', 'expired',
      ],
      index: true,
    },
    previousState: {
      tier: String,
      status: String,
      price: Number,
      billingCycle: String,
    },
    newState: {
      tier: String,
      status: String,
      price: Number,
      billingCycle: String,
    },
    metadata: {
      paymentId: String,
      upgradeId: String,
      proratedAmount: Number,
      promoCode: String,
      adminUserId: String,
      ipAddress: String,
      userAgent: String,
      reason: String,
      description: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for common queries
SubscriptionAuditLogSchema.index({ userId: 1, createdAt: -1 });
SubscriptionAuditLogSchema.index({ subscriptionId: 1, createdAt: -1 });
SubscriptionAuditLogSchema.index({ action: 1, createdAt: -1 });

export const SubscriptionAuditLog = mongoose.model<ISubscriptionAuditLog>(
  'SubscriptionAuditLog',
  SubscriptionAuditLogSchema
);
