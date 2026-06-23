/**
 * Coin Expiry — B-feature migration types
 *
 * Phase 1.2 of the REZ → Nuqta migration. A small UI-only feature that
 * surfaces branded / promo coins that are about to expire so the user
 * has a chance to spend them before they're lost.
 *
 * UNIT CONVENTION:
 *   All monetary amounts on the wire are expressed in **paise** (smallest
 *   INR unit, integer) — i.e. ₹150.00 is sent as `15000`.
 *
 *   To render in rupees, divide by 100 and pipe through `formatPrice`
 *   from `@/utils/priceFormatter`:
 *
 *     import { formatPrice } from '@/utils/priceFormatter';
 *     const display = formatPrice(item.amountPaise / 100, 'INR'); // "₹125.00"
 *
 * DATE CONVENTION:
 *   All timestamps are ISO 8601 strings (e.g. `2026-06-15T10:30:00.000Z`).
 *
 * SEVERITY THRESHOLDS:
 *   - `urgent`  → ≤ 7  days remaining. Red treatment, slide-in banner.
 *   - `warning` → ≤ 14 days remaining. Orange treatment, full-width banner.
 *   - `info`    → ≤ 30 days remaining. Gold accent, compact chip.
 */

// ---------------------------------------------------------------------------
// CoinExpiryNotice — a single coin about to expire
// ---------------------------------------------------------------------------
/**
 * A single branded / promo coin that's about to expire.
 *
 * One row in the `CoinExpirySummary.notices` list. The component layer
 * uses `severity` to decide which banner variant to render and what
 * colour to apply to the "X days left" badge.
 *
 * @example
 * {
 *   coinId: 'bc_dmart_001',
 *   coinName: 'DMart',
 *   amountPaise: 25000,                  // ₹250
 *   expiresAt: '2026-06-25T23:59:59.000Z',
 *   daysLeft: 5,
 *   severity: 'urgent'
 * }
 */
export interface CoinExpiryNotice {
  /** Unique id used for keys + dismissal tracking. */
  coinId: string;
  /** Human-readable coin / merchant name shown in the UI. */
  coinName: string;
  /** Coin amount in paise (1 INR = 100 paise). */
  amountPaise: number;
  /** ISO 8601 timestamp of when the coin expires. */
  expiresAt: string;
  /** Whole days remaining until expiry. Always ≥ 0. */
  daysLeft: number;
  /** Urgency bucket — drives colour + variant. */
  severity: CoinExpirySeverity;
}

/** Severity buckets used by the banner / list / widget variants. */
export type CoinExpirySeverity = 'urgent' | 'warning' | 'info';

// ---------------------------------------------------------------------------
// CoinExpirySummary — aggregate derived by the hook
// ---------------------------------------------------------------------------
/**
 * Aggregate payload produced by `useCoinExpiry`.
 *
 * @example
 * {
 *   notices: [
 *     { coinId: 'bc_dmart', coinName: 'DMart', amountPaise: 25000, expiresAt: '2026-06-25T...', daysLeft: 5, severity: 'urgent' }
 *   ],
 *   totalExpiringPaise: 25000,
 *   mostUrgentDaysLeft: 5
 * }
 */
export interface CoinExpirySummary {
  /** Notices already filtered to ≤ 30 days and sorted by `daysLeft` ASC. */
  notices: CoinExpiryNotice[];
  /** Sum of `amountPaise` across all `notices` (paise). */
  totalExpiringPaise: number;
  /** Smallest `daysLeft` across `notices` — `Infinity` when empty. */
  mostUrgentDaysLeft: number;
}

// ---------------------------------------------------------------------------
// Thresholds — single source of truth for severity bucketing
// ---------------------------------------------------------------------------
/** Anything at or below this many days is considered `urgent`. */
export const URGENT_DAYS_THRESHOLD = 7;

/** Anything at or below this many days is considered `warning`. */
export const WARNING_DAYS_THRESHOLD = 14;

/** Hard cutoff for the banner — coins beyond this are simply ignored. */
export const EXPIRY_WINDOW_DAYS = 30;

/** AsyncStorage key used to persist the urgent-banner dismissal. */
export const COIN_EXPIRY_DISMISSED_KEY = 'b.coinExpiry.urgentDismissedAt';
