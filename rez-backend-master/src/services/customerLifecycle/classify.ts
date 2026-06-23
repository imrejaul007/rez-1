/**
 * Customer Lifecycle Classifier — Phase H.
 *
 * Given the per-merchant customer metrics we already compute into
 * MerchantCustomerSnapshot, bucket each customer into one explicit
 * lifecycle stage. No DB calls — pure helpers so callers (Growth
 * Score, daily-actions rules, future retention playbooks) all share
 * the same definitions.
 *
 * Stage definitions
 * ─────────────────
 *   'new'          — first-ever visit was <= NEW_WINDOW_DAYS ago
 *   'active'       — visited in the last ACTIVE_WINDOW_DAYS
 *   'at-risk'      — last visit between ACTIVE_WINDOW_DAYS and LAPSED_DAYS ago
 *   'lapsed'       — last visit between LAPSED_DAYS and CHURN_DAYS ago
 *   'churned'      — last visit > CHURN_DAYS ago
 *   'high-value'   — non-exclusive overlay: lifetimeSpend >= HIGH_VALUE_RUPEE
 *
 * `classify()` returns the primary stage; `stageOf()` is the
 * enum-only version for callers that already know the customer isn't
 * high-value. High-value-ness is a separate flag surfaced via
 * `isHighValueSpender()`.
 *
 * Why the buckets these values
 * ────────────────────────────
 * Matches the existing Snapshot flags semantics (isRecent = last 30
 * days) + the existing campaign template cadences (lapsed-30d,
 * lapsed-60d). Staying aligned avoids a "what counts as lapsed"
 * debate between systems.
 */

export type LifecycleStage = 'new' | 'active' | 'at-risk' | 'lapsed' | 'churned' | 'unknown';

export const NEW_WINDOW_DAYS = 14;
export const ACTIVE_WINDOW_DAYS = 30;
export const LAPSED_DAYS = 60;
export const CHURN_DAYS = 120;

/** Lifetime ₹ spend threshold for the "high-value" overlay. */
export const HIGH_VALUE_RUPEE = 5000;

export interface ClassifyInput {
  /** Days since this customer's LAST visit at the merchant. Undefined
   *  means no visit ever (or no data yet) — we return 'unknown'. */
  daysSinceLastVisit?: number;
  /** Total visits over the customer's history with the merchant. */
  totalVisits: number;
  /** Days since this customer's FIRST visit. Used to distinguish
   *  "genuinely new" from "old customer who just happens to have
   *  visited recently". */
  daysSinceFirstVisit?: number;
  /** Lifetime spend in ₹ — drives the high-value overlay. */
  totalSpend: number;
}

export interface ClassifyResult {
  stage: LifecycleStage;
  /** True when totalSpend >= HIGH_VALUE_RUPEE, regardless of stage. */
  isHighValue: boolean;
}

export function isHighValueSpender(totalSpend: number): boolean {
  return Number.isFinite(totalSpend) && totalSpend >= HIGH_VALUE_RUPEE;
}

/**
 * Compute the primary stage without the high-value overlay.
 */
export function stageOf(input: ClassifyInput): LifecycleStage {
  const { daysSinceLastVisit, daysSinceFirstVisit, totalVisits } = input;

  // No data → unknown. Callers should treat this as "don't target".
  if (daysSinceLastVisit == null || totalVisits <= 0) return 'unknown';

  // First-ever visit was recent AND only 1-2 visits ⇒ still "new".
  // Rationale: a customer with 20 visits in the last year isn't 'new'
  // even if their first visit was 13 days ago — they adopted fast.
  if (
    daysSinceFirstVisit != null &&
    daysSinceFirstVisit <= NEW_WINDOW_DAYS &&
    totalVisits <= 2
  ) {
    return 'new';
  }

  if (daysSinceLastVisit <= ACTIVE_WINDOW_DAYS) return 'active';
  if (daysSinceLastVisit <= LAPSED_DAYS) return 'at-risk';
  if (daysSinceLastVisit <= CHURN_DAYS) return 'lapsed';
  return 'churned';
}

export function classify(input: ClassifyInput): ClassifyResult {
  return {
    stage: stageOf(input),
    isHighValue: isHighValueSpender(input.totalSpend),
  };
}

/**
 * Bucket a batch of customers. Returns a map from stage → count plus
 * a separate highValueCount. Used by Growth Score to compute retention
 * ratios + new-customer percentage in a single pass.
 */
export function bucketize(batch: readonly ClassifyInput[]): {
  total: number;
  byStage: Record<LifecycleStage, number>;
  highValueCount: number;
} {
  const byStage: Record<LifecycleStage, number> = {
    new: 0,
    active: 0,
    'at-risk': 0,
    lapsed: 0,
    churned: 0,
    unknown: 0,
  };
  let highValueCount = 0;

  for (const row of batch) {
    const r = classify(row);
    byStage[r.stage] = (byStage[r.stage] ?? 0) + 1;
    if (r.isHighValue) highValueCount++;
  }

  return {
    total: batch.length,
    byStage,
    highValueCount,
  };
}

// ─── Constants surface for tests + tuning ────────────────────────────────────

export const __testOnly = {
  NEW_WINDOW_DAYS,
  ACTIVE_WINDOW_DAYS,
  LAPSED_DAYS,
  CHURN_DAYS,
  HIGH_VALUE_RUPEE,
};
