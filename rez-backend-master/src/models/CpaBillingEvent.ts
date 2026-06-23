/**
 * CpaBillingEvent — append-only ledger of chargeable CPA outcomes (Phase J).
 *
 * Every time the attribution subscriber decides "this merchant owes ₹X
 * for outcome Y", a row lands here. Rows are IMMUTABLE by convention —
 * the merchant-facing statement is a SUM over rows in a window, so
 * updating a row would lie to the audit trail. Corrections go in as
 * NEW rows with kind='adjustment' and a negative amount.
 *
 * Idempotency
 * ───────────
 * Unique compound index on (merchantId, kind, sourceEventId) — if the
 * same canonical event fires twice (retry, dual-write), only the first
 * row lands; the second raises E11000 and the subscriber swallows it.
 *
 * Shadow flag
 * ───────────
 * When CPA_PRICING_MODE=shadow, rows are written with shadow:true;
 * merchant API hides them. Flipping to primary just stops writing
 * shadow:true — backfill / unshadow is a separate admin action.
 */

import mongoose, { Schema, Document, Types } from 'mongoose';

export type CpaBillingKind =
  | 'new-customer-conversion'
  | 'lapsed-reactivation'
  | 'scan-conversion'
  | 'adjustment'; // manual corrections (admin only)

export interface ICpaBillingEvent extends Document {
  merchantId: Types.ObjectId;
  kind: CpaBillingKind;
  /** ₹ amount. Can be negative for adjustment rows. */
  amount: number;
  /** Customer whose behaviour produced this charge. Null for
   *  merchant-level adjustments. */
  customerId?: Types.ObjectId;
  /** Canonical event ID that triggered this row (idempotency key). */
  sourceEventId?: string;
  /** Free-form metadata — which order, which scan, which window. */
  metadata?: Record<string, unknown>;
  /** UTC YYYY-MM-DD of when the charge occurred — denormalised so
   *  monthly-cap queries can use an index. */
  day: string;
  /** Written when CPA_PRICING_MODE=shadow; merchant API filters these out. */
  shadow: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CpaBillingEventSchema = new Schema<ICpaBillingEvent>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    kind: {
      type: String,
      enum: ['new-customer-conversion', 'lapsed-reactivation', 'scan-conversion', 'adjustment'],
      required: true,
    },
    amount: { type: Number, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User' },
    sourceEventId: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    shadow: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

// Idempotency — same source event can only bill once per kind per merchant.
// Sparse so adjustment rows (which have no sourceEventId) don't collide on
// the natural index null-null pair.
CpaBillingEventSchema.index(
  { merchantId: 1, kind: 1, sourceEventId: 1 },
  { unique: true, sparse: true },
);
// Monthly cap + statement queries.
CpaBillingEventSchema.index({ merchantId: 1, day: 1, shadow: 1 });
// By-customer audit: what has this customer cost us?
CpaBillingEventSchema.index({ merchantId: 1, customerId: 1, createdAt: -1 });

export const CpaBillingEvent =
  (mongoose.models.CpaBillingEvent as mongoose.Model<ICpaBillingEvent>) ||
  mongoose.model<ICpaBillingEvent>('CpaBillingEvent', CpaBillingEventSchema);

export default CpaBillingEvent;
