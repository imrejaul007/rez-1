/**
 * Pure pricing math — no DB, no side effects. Given a merchant's
 * rate card + a detected outcome, return the ₹ charge + kind.
 *
 * Kept as its own module so unit tests can exercise the math without
 * spinning up the BullMQ subscriber harness.
 */

import type { ICpaRateCard } from '../../models/CpaPricingPlan';
import type { CpaBillingKind } from '../../models/CpaBillingEvent';

export type AttributionOutcome =
  | { kind: 'new-customer-conversion' }
  | { kind: 'lapsed-reactivation'; daysSinceLastVisit: number }
  | { kind: 'scan-conversion'; scannedAt: Date };

export interface Charge {
  kind: CpaBillingKind;
  amount: number;
}

/**
 * Look up the ₹ amount for a given outcome against the rate card.
 * Returns a Charge (possibly amount=0 when the merchant zero-rated
 * that outcome, which is semantically different from "no charge
 * applies").
 */
export function computeCharge(outcome: AttributionOutcome, rates: ICpaRateCard): Charge {
  switch (outcome.kind) {
    case 'new-customer-conversion':
      return { kind: 'new-customer-conversion', amount: rates.newCustomerConversion };
    case 'lapsed-reactivation':
      return { kind: 'lapsed-reactivation', amount: rates.lapsedReactivation };
    case 'scan-conversion':
      return { kind: 'scan-conversion', amount: rates.scanConversion };
  }
}

/** UTC YYYY-MM-DD. */
export function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Start of the UTC calendar month the given date sits in. */
export function startOfUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Will this new charge exceed the monthly cap? Returns true when the
 * candidate charge SHOULD be suppressed.
 *
 *   monthToDateSpend — sum of `amount` on billing rows in the current
 *                      UTC month (excluding shadow rows).
 *   cap              — monthlyCap from the pricing plan. 0 = no cap.
 *   candidate        — the new charge about to be billed.
 */
export function exceedsMonthlyCap(
  monthToDateSpend: number,
  cap: number,
  candidate: Charge,
): boolean {
  if (cap <= 0) return false;
  return monthToDateSpend + candidate.amount > cap;
}
