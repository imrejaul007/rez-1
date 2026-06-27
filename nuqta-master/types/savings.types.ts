/**
 * Savings Dashboard — B-feature migration types
 *
 * These types mirror the backend contract at `/api/b/savings/*`.
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
 * REGION EXAMPLES:
 *   The shapes below were defined for an Indian-region user shopping
 *   in Bengaluru; numeric values are illustrative.
 */

// ---------------------------------------------------------------------------
// History item — single line on the savings ledger
// ---------------------------------------------------------------------------
/**
 * A single savings event on the user's ledger.
 *
 * @example
 * {
 *   id: 'sv_01HXY...',
 *   date: '2026-06-15T10:30:00.000Z',
 *   source: 'cashback',
 *   amountPaise: 12500, // ₹125.00
 *   description: '5% cashback on BigBazaar order #BB-44521',
 *   storeId: 'st_bigbazaar_koramangala',
 *   storeName: 'BigBazaar Koramangala',
 *   offerId: 'off_weekend_5',
 *   offerTitle: 'Weekend 5% Cashback',
 *   receiptUrl: 'https://cdn.nuqta.in/receipts/sv_01HXY.pdf'
 * }
 */
export interface SavingsHistoryItem {
  /** Server-side primary key (ULID). */
  id: string;
  /** ISO 8601 timestamp of when the savings was realised. */
  date: string;
  /** Alias for `date` — present on payloads that surface the timestamp under
   * the `earnedAt` key. Optional so existing payloads with `date` only still
   * type-check; the UI helpers below read whichever is present. */
  earnedAt?: string;
  /** Source channel that produced the saving. */
  source:
    | 'cashback'
    | 'offer'
    | 'loyalty'
    | 'referral'
    | 'wallet_transfer'
    | 'milestone_bonus';
  /** Credit amount in paise. Always positive — debit events do not appear here. */
  amountPaise: number;
  /** Human-readable description shown on the activity row. */
  description: string;
  /** Originating store id (if source is store-scoped). */
  storeId?: string;
  /** Pre-resolved store display name. */
  storeName?: string;
  /** Originating offer id (if source is an offer redemption). */
  offerId?: string;
  /** Pre-resolved offer display title. */
  offerTitle?: string;
  /** Link to the receipt / invoice PDF or image. */
  receiptUrl?: string;
}

// ---------------------------------------------------------------------------
// Goal — user-defined savings target
// ---------------------------------------------------------------------------
/**
 * A user-defined savings goal (e.g. "Goa trip", "iPhone 17").
 *
 * @example
 * {
 *   id: 'gl_01HXY',
 *   userId: 'usr_abc',
 *   name: 'Goa Trip',
 *   targetAmountPaise: 5000000, // ₹50,000
 *   savedAmountPaise: 1234500,  // ₹12,345
 *   deadline: '2026-12-31T23:59:59.000Z',
 *   category: 'travel',
 *   createdAt: '2026-01-10T08:00:00.000Z',
 *   updatedAt: '2026-06-15T10:30:00.000Z',
 *   isCompleted: false
 * }
 */
export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  /** Target in paise (1 INR = 100 paise). */
  targetAmountPaise: number;
  /** Short alias for `targetAmountPaise` — the UI prefers the shorter form. */
  targetPaise: number;
  /** Currently accumulated amount in paise. */
  savedAmountPaise: number;
  /** Short alias for `savedAmountPaise` — the UI prefers the shorter form. */
  savedPaise: number;
  /** ISO 8601 deadline (target completion date). */
  deadline: string;
  /** Free-form category label (e.g. `travel`, `electronics`). */
  category?: string;
  /** Optional icon emoji to render on the goal card. */
  iconEmoji?: string;
  createdAt: string;
  updatedAt: string;
  isCompleted: boolean;
  /** Goal status (active, paused, completed). */
  status?: 'active' | 'paused' | 'completed';
  /** Progress percentage (0-100). */
  progress?: number;
  /** Milestones for this goal. */
  milestones?: Array<{
    id: string;
    title: string;
    targetAmountPaise: number;
    isCompleted: boolean;
    completedAt?: string;
  }>;
  /** Flag indicating this is an optimistic/predicted goal. */
  isOptimistic?: boolean;
}

// ---------------------------------------------------------------------------
// Streak — daily-activity streak state
// ---------------------------------------------------------------------------
/**
 * Daily-activity streak state for the savings habit.
 *
 * `isAtRisk` is `true` when the user has not recorded activity today
 * but the streak window has not yet expired (typically before midnight IST).
 *
 * @example
 * {
 *   currentStreakDays: 12,
 *   longestStreakDays: 45,
 *   lastActivityDate: '2026-06-19',
 *   isAtRisk: true,
 *   nextMilestoneDays: 14
 * }
 */
export interface SavingsStreak {
  currentStreakDays: number;
  longestStreakDays: number;
  /** Date (YYYY-MM-DD) of last recorded activity. */
  lastActivityDate: string;
  /** ISO 8601 timestamp of the last recorded activity. Optional alias for
   * `lastActivityDate` — the widget prefers the timestamp form. */
  lastActivityAt?: string;
  isAtRisk: boolean;
  /** Days remaining until the next streak milestone (e.g. 7/14/30 day badge). */
  nextMilestoneDays: number;
}

// ---------------------------------------------------------------------------
// Dashboard — the top-level aggregation
// ---------------------------------------------------------------------------
/**
 * Aggregate payload for the Savings Dashboard screen.
 *
 * All monetary fields are in **paise** — divide by 100 for rupee display.
 *
 * @example
 * {
 *   totalSavedPaise: 1234500,        // ₹12,345 lifetime
 *   thisMonthSavedPaise: 250000,     // ₹2,500 this month
 *   thisMonthTargetPaise: 500000,    // ₹5,000 monthly target
 *   goalsCount: 3,
 *   streak: { currentStreakDays: 12, longestStreakDays: 45, lastActivityDate: '2026-06-19', isAtRisk: true, nextMilestoneDays: 14 },
 *   lastCalculatedAt: '2026-06-20T00:05:00.000Z',
 *   recentActivity: []
 * }
 */
export interface SavingsDashboard {
  /** Lifetime savings in paise. */
  totalSavedPaise: number;
  /** Savings accumulated in the current calendar month (paise). */
  thisMonthSavedPaise: number;
  /** User-set (or default) monthly savings target in paise. */
  thisMonthTargetPaise: number;
  /** Number of active savings goals the user has created. */
  goalsCount: number;
  streak: SavingsStreak;
  /** ISO 8601 timestamp of when this aggregation was last computed. */
  lastCalculatedAt: string;
  /** Most recent activity rows (typically last 5–10). */
  recentActivity: SavingsHistoryItem[];
}

// ---------------------------------------------------------------------------
// Summary — period-bounded metric set
// ---------------------------------------------------------------------------
/**
 * Period-bounded savings summary. `periodDays` is fixed at 7/30/90 days
 * to match the API contract.
 *
 * @example
 * {
 *   periodDays: 30,
 *   totalSavedPaise: 250000,
 *   cashbackEarnedPaise: 180000,
 *   offersUsed: 6,
 *   storesVisited: 4,
 *   comparedToPreviousPeriodPct: 18.5  // +18.5% vs prior 30 days
 * }
 */
export interface SavingsSummary {
  periodDays: 7 | 30 | 90;
  /** Total savings within the period (paise). */
  totalSavedPaise: number;
  /** Cashback sub-component within the period (paise). */
  cashbackEarnedPaise: number;
  /** Distinct offers redeemed within the period. */
  offersUsed: number;
  /** Distinct stores shopped at within the period. */
  storesVisited: number;
  /** Percent delta vs the previous equivalent period (signed). */
  comparedToPreviousPeriodPct: number;
}

// ---------------------------------------------------------------------------
// Projection — forward-looking forecast
// ---------------------------------------------------------------------------
/**
 * Forward-looking savings projection based on recent pace.
 *
 * @example
 * {
 *   next30DaysPaise: 260000,
 *   next90DaysPaise: 780000,
 *   paceVsTarget: 'on_track',
 *   confidence: 0.82
 * }
 */
export interface SavingsProjection {
  /** Forecasted savings over the next 30 days (paise). */
  next30DaysPaise: number;
  /** Forecasted savings over the next 90 days (paise). */
  next90DaysPaise: number;
  /** How the projected pace compares to the user's monthly target. */
  paceVsTarget: 'ahead' | 'on_track' | 'behind';
  /** Confidence score for the projection in the [0, 1] range. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Recommendation — actionable nudge
// ---------------------------------------------------------------------------
/**
 * A savings recommendation surfaced on the dashboard.
 *
 * `ctaRoute` is an in-app deep-link (e.g. `/offers/cashback-boost?offerId=...`).
 *
 * @example
 * {
 *   id: 'rec_01HXY',
 *   type: 'cashback_boost',
 *   title: 'Boost your DMart cashback to 7%',
 *   description: 'You shop at DMart monthly — opt in for an extra 2%.',
 *   potentialSavingsPaise: 50000,  // ₹500
 *   storeId: 'st_dmart',
 *   offerId: 'off_dmart_7',
 *   ctaRoute: '/offers/cashback-boost?offerId=off_dmart_7',
 *   expiresAt: '2026-07-15T23:59:59.000Z'
 * }
 */
export interface SavingsRecommendation {
  id: string;
  type: 'cashback_boost' | 'new_offer' | 'goal_nudge' | 'category_underspend';
  title: string;
  description: string;
  /** Estimated savings if the user acts on this nudge (paise). */
  potentialSavingsPaise: number;
  /** Originating store id, when relevant. */
  storeId?: string;
  /** Originating offer id, when relevant. */
  offerId?: string;
  /** In-app route to navigate to when the user taps the CTA. */
  ctaRoute: string;
  /** ISO 8601 expiry; absent if the nudge never expires. */
  expiresAt?: string;
}

// ---------------------------------------------------------------------------
// History page — paginated envelope for the savings ledger
// ---------------------------------------------------------------------------
/**
 * Paginated response wrapper for `GET /api/b/savings/history`.
 *
 * @example
 * {
 *   items: [],
 *   page: 1,
 *   total: 137,
 *   hasMore: true
 * }
 */
export interface SavingsHistoryPage {
  items: SavingsHistoryItem[];
  /** 1-indexed page number returned. */
  page: number;
  /** Total record count across all pages. */
  total: number;
  /** True when another page exists beyond this one. */
  hasMore: boolean;
}
