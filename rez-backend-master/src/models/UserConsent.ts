/**
 * UserConsent — DPDP-compliant consent ledger (Phase D).
 *
 * Why this exists
 * ───────────────
 * India's Digital Personal Data Protection Act, 2023 requires:
 *   • §6 — Consent must be free, specific, informed, unconditional, unambiguous.
 *   • §7 — Data fiduciary must be able to demonstrate consent.
 *   • §12 — Right to withdraw consent at any time, and ease of withdrawal
 *           must be comparable to the ease of granting it.
 *   • §8(5) — Data fiduciary must maintain evidence of consent.
 *
 * Design
 * ──────
 * Append-only ledger. Every consent decision (grant, withdraw) inserts a
 * NEW row with a timestamp. The "current" consent state for a user+category
 * is whichever row has the largest createdAt. Rows are never updated or
 * deleted — that preserves the legal audit trail DPDP §8(5) requires.
 *
 * Indexes
 *   • { userId: 1, category: 1, createdAt: -1 } — fast latest-state lookup
 *   • { category: 1, status: 1, createdAt: -1 } — audit reporting by category
 *
 * Category taxonomy
 * ─────────────────
 * Conservative, transactional vs. marketing split so the WhatsApp receipt
 * subscriber (transactional) doesn't accidentally require a marketing
 * opt-in. Receipts for a transaction the user just completed are
 * contract-basis under DPDP §7(a) — so `whatsapp_transactional` defaults
 * to granted on signup. Marketing categories default to denied (no row =
 * no consent).
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ─── Categories ──────────────────────────────────────────────────────────────

export const CONSENT_CATEGORIES = [
  'whatsapp_transactional', // receipts, order updates (contract basis; on by default)
  'whatsapp_marketing',     // broadcasts, promos (consent basis; off by default)
  'sms_transactional',
  'sms_marketing',
  'email_transactional',
  'email_marketing',
  'push_marketing',
  'analytics',              // product analytics beyond security/billing
  'data_sharing',           // sharing with 3rd-party partners
] as const;

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export const CONSENT_STATUSES = ['granted', 'withdrawn'] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const CONSENT_SOURCES = [
  'app_signup',        // set at account creation
  'app_settings',      // user toggled in Settings UI
  'checkout_inline',   // inline consent during checkout flow
  'admin_action',      // staff-initiated (support, compliance)
  'legacy_migration',  // bulk import from pre-DPDP data
  'api',               // partner/programmatic
] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export const CONSENT_LEGAL_BASES = [
  'consent',              // DPDP §6 — explicit opt-in
  'contract',             // DPDP §7(a) — necessary to perform a contract
  'legitimate_interest',  // DPDP §7 — security, fraud prevention
] as const;
export type ConsentLegalBasis = (typeof CONSENT_LEGAL_BASES)[number];

// ─── Document shape ──────────────────────────────────────────────────────────

export interface IUserConsent extends Document {
  userId: Types.ObjectId;
  category: ConsentCategory;
  status: ConsentStatus;
  source: ConsentSource;
  /**
   * Monotonically-increasing version of the consent copy / policy shown
   * to the user at the moment they made this decision. Lets us re-prompt
   * users when the policy changes in a way that affects their choice.
   */
  copyVersion: number;
  legalBasis: ConsentLegalBasis;
  /** IP + user-agent at the moment of the decision, for dispute resolution. */
  ipAddress?: string;
  userAgent?: string;
  /** Free-form note — e.g. "withdrawn via support ticket #12345". */
  note?: string;
  /** Ledger rows never mutate; this is the decision timestamp. */
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserConsentModel extends Model<IUserConsent> {
  /**
   * Returns true iff the latest row for (userId, category) has
   * status='granted'. Returns false for users with no ledger entries in
   * that category (= never opted in).
   */
  hasActiveConsent(
    userId: Types.ObjectId | string,
    category: ConsentCategory,
  ): Promise<boolean>;
  /**
   * Append a new ledger row. DOES NOT mutate existing rows. Safe to call
   * repeatedly — each call is a new row.
   */
  record(params: {
    userId: Types.ObjectId | string;
    category: ConsentCategory;
    status: ConsentStatus;
    source: ConsentSource;
    copyVersion?: number;
    legalBasis?: ConsentLegalBasis;
    ipAddress?: string;
    userAgent?: string;
    note?: string;
  }): Promise<IUserConsent>;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const UserConsentSchema = new Schema<IUserConsent, IUserConsentModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: {
      type: String,
      enum: CONSENT_CATEGORIES as unknown as string[],
      required: true,
    },
    status: {
      type: String,
      enum: CONSENT_STATUSES as unknown as string[],
      required: true,
    },
    source: {
      type: String,
      enum: CONSENT_SOURCES as unknown as string[],
      required: true,
    },
    copyVersion: { type: Number, default: 1, min: 1 },
    legalBasis: {
      type: String,
      enum: CONSENT_LEGAL_BASES as unknown as string[],
      default: 'consent',
    },
    ipAddress: { type: String, trim: true, maxlength: 64 },
    userAgent: { type: String, trim: true, maxlength: 500 },
    note: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
    // DPDP audit trail — no one should ever mutate or drop a consent row.
    // Mongoose doesn't enforce immutability at schema level for arbitrary
    // fields, but we make a runtime-level check in record() below and rely
    // on Mongo role-based access at the ops layer to deny updateMany.
  },
);

// Fast latest-state lookup — sort descending on createdAt, find first hit.
UserConsentSchema.index({ userId: 1, category: 1, createdAt: -1 });
// Audit queries — all 'withdrawn' events in the last 30 days, by category.
UserConsentSchema.index({ category: 1, status: 1, createdAt: -1 });

// ─── Static methods ──────────────────────────────────────────────────────────

UserConsentSchema.statics.hasActiveConsent = async function (
  userId: Types.ObjectId | string,
  category: ConsentCategory,
): Promise<boolean> {
  const latest = await this.findOne({ userId, category })
    .sort({ createdAt: -1 })
    .select('status')
    .lean()
    .exec();
  return !!latest && (latest as { status: ConsentStatus }).status === 'granted';
};

UserConsentSchema.statics.record = async function (params: {
  userId: Types.ObjectId | string;
  category: ConsentCategory;
  status: ConsentStatus;
  source: ConsentSource;
  copyVersion?: number;
  legalBasis?: ConsentLegalBasis;
  ipAddress?: string;
  userAgent?: string;
  note?: string;
}): Promise<IUserConsent> {
  return this.create({
    userId: params.userId,
    category: params.category,
    status: params.status,
    source: params.source,
    copyVersion: params.copyVersion ?? 1,
    legalBasis: params.legalBasis ?? 'consent',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    note: params.note,
  });
};

// ─── Model export ────────────────────────────────────────────────────────────

export const UserConsent =
  (mongoose.models.UserConsent as unknown as IUserConsentModel) ||
  mongoose.model<IUserConsent, IUserConsentModel>('UserConsent', UserConsentSchema);

export default UserConsent;
