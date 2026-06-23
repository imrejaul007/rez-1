import { Schema, model, Document, Types } from 'mongoose';

/**
 * MerchantCustomerSnapshot — per-merchant customer intelligence read model.
 *
 * Rebuilt nightly by the customerSnapshotJob cron (or on-demand for new merchants).
 * Used by:
 *   - broadcastWorker: resolves audience list at dispatch time
 *   - slaMonitorJob: checks freshness to detect rebuild failures
 *   - admin system health: reports snapshot age
 *   - merchant analytics: "Your customers" segmentation screen
 *
 * One document per (merchantId, userId) pair.
 * Updated via upsert — safe to rebuild incrementally.
 *
 * v3 Architecture: Part 5 — Broadcast Campaign audience resolution.
 */
export interface IMerchantCustomerSnapshot extends Document {
  merchantId: Types.ObjectId;
  storeId?: Types.ObjectId;
  userId: Types.ObjectId;

  // Contact info (denormalised from User — populated at snapshot build time)
  phone?: string;
  email?: string;
  pushTokens?: string[]; // FCM/APNs tokens for push notifications
  hasAppInstalled: boolean;

  // Customer engagement metrics (computed at snapshot build time)
  totalVisits: number;
  totalSpend: number; // lifetime spend at this merchant in ₹
  lastVisitAt?: Date;
  lastOrderAt?: Date;
  daysSinceLastVisit?: number; // computed daily by rebuild job

  // Segmentation flags (pre-computed for fast audience filtering)
  isRecent: boolean; // visited in last 30 days
  isLapsed: boolean; // no visit in 31–90 days
  isHighValue: boolean; // lifetime spend ≥ ₹5000
  hasActiveStampCard: boolean;

  // Stamp card progress (denormalised for broadcast audience)
  stampCardProgress?: number; // stamps collected on current card

  // Notification consent
  smsOptIn: boolean;
  pushOptIn: boolean;
  emailOptIn: boolean;
  whatsappOptIn: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const MerchantCustomerSnapshotSchema = new Schema<IMerchantCustomerSnapshot>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    phone: { type: String },
    email: { type: String, lowercase: true, trim: true },
    pushTokens: [{ type: String }],
    hasAppInstalled: { type: Boolean, default: false },

    totalVisits: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    lastVisitAt: { type: Date },
    lastOrderAt: { type: Date },
    daysSinceLastVisit: { type: Number },

    isRecent: { type: Boolean, default: false },
    isLapsed: { type: Boolean, default: false },
    isHighValue: { type: Boolean, default: false },
    hasActiveStampCard: { type: Boolean, default: false },
    stampCardProgress: { type: Number },

    smsOptIn: { type: Boolean, default: true },
    pushOptIn: { type: Boolean, default: true },
    emailOptIn: { type: Boolean, default: true },
    whatsappOptIn: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Primary key for upsert operations
MerchantCustomerSnapshotSchema.index({ merchantId: 1, userId: 1 }, { unique: true });

// Audience filter indexes (broadcastWorker queries these)
MerchantCustomerSnapshotSchema.index({ merchantId: 1, isRecent: 1 });
MerchantCustomerSnapshotSchema.index({ merchantId: 1, isLapsed: 1 });
MerchantCustomerSnapshotSchema.index({ merchantId: 1, isHighValue: 1 });
MerchantCustomerSnapshotSchema.index({ merchantId: 1, hasActiveStampCard: 1 });
MerchantCustomerSnapshotSchema.index({ merchantId: 1, updatedAt: 1 }); // slaMonitorJob freshness check

export const MerchantCustomerSnapshot = model<IMerchantCustomerSnapshot>(
  'MerchantCustomerSnapshot',
  MerchantCustomerSnapshotSchema,
);

export default MerchantCustomerSnapshot;
