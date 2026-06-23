// @ts-nocheck
/**
 * Karma gamification entity types
 *
 * Canonical source of truth: rez-karma-service/src/types/index.ts
 * Collection: karma_profiles, earn_records, karma_events
 *
 * These types are the authoritative definitions used across all RuFlo services.
 * The karma service types in rez-karma-service/src/types/index.ts are the
 * source of truth — this file must be kept in sync with them.
 */

// ─── Core enums / unions ────────────────────────────────────────────────────────

/** Karma activity level (L1-L4). Levels unlock access to different event types. */
export type KarmaLevel = 'L1' | 'L2' | 'L3' | 'L4';

/** Karma-to-coin conversion rate determined by user level and campaign settings. */
export type KarmaConversionRate = 0.25 | 0.5 | 0.75 | 1.0;

/** Earn record status — lifecycle of a karma-earning event record. */
export type EarnRecordStatus =
  | 'APPROVED_PENDING_CONVERSION'
  | 'CONVERTED'
  | 'REJECTED'
  | 'ROLLED_BACK'
  | 'CONVERSION_FAILED';

/** Batch status — lifecycle of a karma-to-coin conversion batch. */
export type BatchStatus = 'DRAFT' | 'READY' | 'EXECUTED' | 'PARTIAL' | 'PAUSED';

/** CSR pool status. */
export type CSRPoolStatus = 'active' | 'depleted' | 'expired';

/**
 * Verification status — used in the karma verification engine.
 * NOTE: Different from the generic VerificationStatus enum in enums/index.ts.
 * This type is specific to the karma verification flow (qr_in, qr_out, gps_match, etc.).
 */
export type KarmaVerificationStatus = 'pending' | 'partial' | 'verified' | 'rejected';

/** Karma event difficulty level. */
export type EventDifficulty = 'easy' | 'medium' | 'hard';

/** Karma event categories. */
export type EventCategory = 'environment' | 'food' | 'health' | 'education' | 'community';

/** Karma event lifecycle status. */
export type KarmaEventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';

// ─── Sub-interfaces ────────────────────────────────────────────────────────────

export interface IBadge {
  id: string;
  name: string;
  earnedAt: Date;
}

export interface ILevelHistoryEntry {
  level: KarmaLevel;
  earnedAt: Date;
  droppedAt?: Date;
  reason?: string;
}

export interface IConversionHistoryEntry {
  karmaConverted: number;
  coinsEarned: number;
  rate: number;
  batchId: string;
  convertedAt: Date;
}

/**
 * Verification signals from the karma verification engine.
 * Stored in earn records to track the outcome of each verification check.
 */
export interface IVerificationSignals {
  qr_in?: boolean;
  qr_out?: boolean;
  gps_match?: number;
  ngo_approved?: boolean;
  photo_proof?: boolean;
}

// ─── IKarmaProfile ─────────────────────────────────────────────────────────────

/**
 * Canonical karma profile for a user.
 *
 * G-CR-X1 + G-CR-X15 FIX: Synced with rez-karma-service/src/models/KarmaProfile.ts
 * - Added 14 missing canonical fields (eventsJoined, lastActivityAt, levelHistory,
 *   conversionHistory, thisWeekKarmaEarned, weekOfLastKarmaEarned, avgEventDifficulty,
 *   avgConfidenceScore, checkIns, approvedCheckIns, activityHistory, createdAt, updatedAt,
 *   plus lastDecayAppliedAt and userTimezone)
 * - Added missing updatedAt: Date field
 * - Type names aligned: KarmaLevel (not Level), KarmaConversionRate (not ConversionRate)
 */
export interface IKarmaProfile {
  _id: string;
  userId: string;
  lifetimeKarma: number;
  activeKarma: number;
  level: KarmaLevel;
  eventsCompleted: number;
  eventsJoined: number;
  totalHours: number;
  trustScore: number;
  badges: IBadge[];
  lastActivityAt: Date;
  levelHistory: ILevelHistoryEntry[];
  conversionHistory: IConversionHistoryEntry[];
  thisWeekKarmaEarned: number;
  weekOfLastKarmaEarned?: Date;
  avgEventDifficulty: number;
  avgConfidenceScore: number;
  checkIns: number;
  approvedCheckIns: number;
  activityHistory: Date[];
  createdAt: Date;
  updatedAt: Date;
  lastDecayAppliedAt?: Date;
  userTimezone?: string;
}

// ─── IEarnRecord ───────────────────────────────────────────────────────────────

/**
 * Earn record for a single karma-earning event (check-in, attendance, etc.).
 *
 * G-CR-X9 FIX: Synced with rez-karma-service/src/models/EarnRecord.ts
 * - Added missing fields: bookingId, activeLevelAtApproval, conversionRateSnapshot,
 *   csrPoolId, confidenceScore, batchId, rezCoinsEarned, idempotencyKey
 * - Fixed verificationSignals shape: canonical had wrong field names
 *   (gps_match, qr_verified, face_verified, manual_override).
 *   Actual shape: {qr_in, qr_out, gps_match, ngo_approved, photo_proof}
 * - Renamed approvedBy -> convertedBy for consistency with actual model
 */
export interface IEarnRecord {
  _id: string;
  userId: string;
  eventId: string;
  bookingId: string;
  karmaEarned: number;
  activeLevelAtApproval: KarmaLevel;
  conversionRateSnapshot: number;
  csrPoolId: string;
  verificationSignals: IVerificationSignals;
  confidenceScore: number;
  status: EarnRecordStatus;
  createdAt: Date;
  approvedAt?: Date;
  convertedAt?: Date;
  convertedBy?: string;
  batchId?: string;
  rezCoinsEarned?: number;
  idempotencyKey: string;
}

// ─── IKarmaEvent ───────────────────────────────────────────────────────────────

/**
 * Karma event definition. Events are the source of karma earning.
 *
 * G-CR-X7b FIX: Synced with rez-karma-service/src/models/KarmaEvent.ts
 * - Complete rewrite — canonical had only 6 fields, actual model has 16+
 * - Field names aligned: baseKarmaPerHour (not karmaReward), maxVolunteers
 *   (not maxAttendees), confirmedVolunteers (not currentAttendees), etc.
 * - Added: merchantEventId, ngoId, category, impactUnit, impactMultiplier,
 *   expectedDurationHours, baseKarmaPerHour, maxKarmaPerEvent, qrCodes,
 *   gpsRadius, maxVolunteers, confirmedVolunteers, status
 */
export interface IQRCodeSet {
  checkIn: string;
  checkOut: string;
}

export interface IKarmaEvent {
  _id: string;
  merchantEventId: string;
  ngoId: string;
  category: EventCategory;
  impactUnit: string;
  impactMultiplier: number;
  difficulty: EventDifficulty;
  expectedDurationHours: number;
  baseKarmaPerHour: number;
  maxKarmaPerEvent: number;
  qrCodes: IQRCodeSet;
  gpsRadius: number;
  maxVolunteers: number;
  confirmedVolunteers: number;
  status: KarmaEventStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─── IConversionBatch ──────────────────────────────────────────────────────────

/**
 * Conversion batch: a group of karma-to-coin conversions executed together.
 * Admin creates a batch, system verifies all records, then executes.
 *
 * Note: G-CR-X10 identified that the canonical IConversionBatch fields differ from
 * the local Batch model (csrPoolId, weekStart, weekEnd vs approvedRecords, etc.).
 * The canonical version here represents the conversion execution record.
 * If the karma service uses a different Batch shape, update this accordingly.
 */
/**
 * CV-23 NOTE: This type and the karma service's `Batch` type (types/index.ts)
 * are DIFFERENT concepts — not a drift, but intentional design:
 * - IConversionBatch: user-facing summary of a karma→coin conversion run (admin view)
 * - karma service Batch: internal CSR pool reconciliation record (weekStart/weekEnd/csrPoolId)
 * These should NOT be merged. They serve different bounded contexts.
 */
export interface IConversionBatch {
  _id: string;
  status: BatchStatus;
  totalRecords: number;
  approvedRecords: number;
  rejectedRecords: number;
  totalKarma: number;
  totalCoins: number;
  averageRate: KarmaConversionRate;
  executedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── ILevelInfo ────────────────────────────────────────────────────────────────

/**
 * Karma level info for display in consumer app.
 * G-CR-X12 FIX: Added benefits, minKarma, maxKarma fields to match canonical.
 */
export interface ILevelInfo {
  level: KarmaLevel;
  minKarma: number;
  maxKarma?: number;
  conversionRate: KarmaConversionRate;
  benefits: string[];
  nextLevelAt: number | null;
  activeKarma: number;
}

// ─── IKarmaStats ───────────────────────────────────────────────────────────────

export interface IKarmaStats {
  lifetimeKarma: number;
  activeKarma: number;
  level: KarmaLevel;
  levelProgress: number;
  eventsAttended: number;
  checkInRate: number;
  trustScore: number;
  badges: IBadge[];
  nextLevel?: ILevelInfo;
}

// ─── KarmaProfileDelta ─────────────────────────────────────────────────────────

/**
 * Response type returned by applyDailyDecay() in karmaEngine.
 * G-CR-X11 FIX: This type was not exported from the karma service's types/index.ts.
 */
export interface KarmaProfileDelta {
  activeKarmaChange: number;
  levelChange: boolean;
  oldLevel?: KarmaLevel;
  newLevel?: KarmaLevel;
  lastDecayAppliedAt?: Date;
}

// ─── KarmaScore types (Phase 3: 300-900 model) ────────────────────────────────

export type KarmaScoreBand = 'starter' | 'active' | 'performer' | 'leader' | 'elite' | 'pinnacle';
export type TrustGrade = 'D' | 'C' | 'B' | 'A' | 'S';
export type MomentumLabel = 'cold' | 'slow' | 'steady' | 'hot' | 'blazing';

export interface KarmaScoreComponents {
  base: number;
  impact: number;
  relativeRank: number;
  trust: number;
  momentum: number;
}

export interface BandMetadata {
  label: string;
  color: string;
  bgColor: string;
  minScore: number;
  maxScore: number;
  perks: string[];
}

export interface StabilitySnapshot {
  raw: number;
  display: number;
  lastRawAt: number;
}

export interface ScoreHistoryEntry {
  date: Date;
  rawScore: number;
  displayScore: number;
  band: string;
  percentile: number;
  components: KarmaScoreComponents;
  activeKarma: number;
  lifetimeKarma: number;
}

export type PerkType = 'discount' | 'upgrade' | 'access' | 'cashback' | 'coin_bonus';
export type PerkClaimStatus = 'active' | 'used' | 'expired' | 'revoked';
