/**
 * useRezCash — derives the lifetime REZ Cash summary from the wallet store.
 *
 * REZ Cash is the "since-you-joined" framing of a user's wallet activity.
 * The page surfaces a single huge number ("You've saved ₹X with REZ since
 * you joined") plus three smaller stat tiles (this month, this year,
 * projected year-end) and a "you vs the average user" comparison.
 *
 * Source of truth
 * ---------------
 * Reads from `useWalletStore`:
 *   - `savingsInsights.totalSaved` — lifetime savings in paise
 *   - `savingsInsights.thisMonth`  — current calendar-month savings in paise
 *   - `walletData.recentTransactions` — used to derive this-year savings,
 *     `topCategory`, and `memberSinceDate` (earliest transaction timestamp).
 *
 * The store types `brandedCoins` and `rawBackendData` loosely (`any[]` /
 * `any | null`); the hook reads every field defensively and falls back to
 * sensible defaults so a malformed payload never crashes the page.
 *
 * Output
 * ------
 * `{ lifetimeSavingsPaise, thisYearSavingsPaise, thisMonthSavingsPaise,
 *    memberSinceDate, topCategory, projectedYearEndSavingsPaise,
 *    comparisonToAvgUserPct }`
 *
 * All monetary fields are in **paise** (smallest INR unit). Display
 * conversion is the caller's job (`formatPrice(value / 100, 'INR')`).
 *
 * @example
 *   ```tsx
 *   const rezCash = useRezCash();
 *   console.log(`Saved ₹${(rezCash.lifetimeSavingsPaise / 100).toFixed(0)}`);
 *   ```
 */
import { useMemo } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import logger from '@/utils/logger';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Lightweight transaction record we read off `walletData.recentTransactions`.
 * Every field is optional — the store payload is loosely typed and we want
 * the hook to survive malformed entries.
 */
interface RezentTransaction {
  /** Transaction timestamp (Date or ISO string). */
  timestamp?: Date | string | null;
  /** Free-form category label, e.g. `grocery`, `dining`. */
  category?: string;
  /** Transaction amount in paise; negative = spend, positive = earn. */
  amount?: number;
}

export interface UseRezCashResult {
  /** Lifetime savings in paise (sum of all cashback / discount earned). */
  lifetimeSavingsPaise: number;
  /** Savings in paise accrued during the current calendar year. */
  thisYearSavingsPaise: number;
  /** Savings in paise accrued during the current calendar month. */
  thisMonthSavingsPaise: number;
  /**
   * The earliest known transaction timestamp — used as a proxy for
   * "member since". `null` when no usable transaction exists.
   */
  memberSinceDate: Date | null;
  /**
   * Category with the highest lifetime savings, or `null` when there's no
   * usable category data.
   */
  topCategory: string | null;
  /**
   * Projection of full-year savings in paise based on the user's current
   * pace (thisYearSavingsPaise × 12 / monthsElapsed). Falls back to
   * `thisYearSavingsPaise` if the year has just started.
   */
  projectedYearEndSavingsPaise: number;
  /**
   * How the user's lifetime savings compare to an average REZ member, as
   * a signed percentage. Positive means above-average. `0` when no
   * baseline is available.
   */
  comparisonToAvgUserPct: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Synthetic "average REZ user" lifetime savings, in paise. Drives the
 * `comparisonToAvgUserPct` calculation. Tuned so a fresh user with no
 * transactions is meaningfully "below" the average.
 */
const AVG_USER_LIFETIME_SAVINGS_PAISE = 50_000_00; // ₹50,000

/** Synthetic month-end target used only for the projection display. */
const PROJECTION_PROJECTED_TARGET_PAISE = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a value to a `Date` if it represents a valid instant. */
function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Coerce a numeric value to a non-negative finite number; default 0. */
function toNonNegativeNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value;
}

/** Same as above but allows negatives (used for signed "amount" field). */
function toFiniteNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return value;
}

/** Cast an arbitrary wallet-store field to our loose transaction shape. */
function asTransaction(value: unknown): RezentTransaction | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  return {
    timestamp: (raw.timestamp ?? raw.occurredAt ?? null) as Date | string | null,
    category: typeof raw.category === 'string' ? raw.category : undefined,
    amount: toFiniteNumber(raw.amount),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Derive the REZ Cash summary from the wallet store.
 *
 * Returned values are all in **paise**. The page-level component is
 * responsible for formatting and currency conversion.
 */
export function useRezCash(): UseRezCashResult {
  // Granular selectors keep re-renders narrow — only this hook re-runs
  // when one of the fields it actually reads changes.
  const savingsInsights = useWalletStore((s) => s.savingsInsights);
  const walletData = useWalletStore((s) => s.walletData);

  return useMemo<UseRezCashResult>(() => {
    // 1. Lifetime + this-month savings come from `savingsInsights`.
    const lifetimeSavingsPaise = toNonNegativeNumber(savingsInsights?.totalSaved);
    const thisMonthSavingsPaise = toNonNegativeNumber(savingsInsights?.thisMonth);

    // 2. Pull transactions defensively (the store types the array loosely).
    const recentRaw = Array.isArray(walletData?.recentTransactions)
      ? walletData.recentTransactions
      : [];
    const transactions: RezentTransaction[] = recentRaw
      .map(asTransaction)
      .filter((t): t is RezentTransaction => t !== null);

    // 3. Derive `memberSinceDate` from the earliest transaction timestamp.
    let memberSinceDate: Date | null = null;
    for (const tx of transactions) {
      const d = toDate(tx.timestamp);
      if (!d) continue;
      if (memberSinceDate === null || d.getTime() < memberSinceDate.getTime()) {
        memberSinceDate = d;
      }
    }

    // 4. Derive `thisYearSavingsPaise` from transactions in the current
    //    calendar year. We treat positive amounts as savings credits.
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1).getTime();
    const monthsElapsed = Math.max(1, now.getMonth() + 1);

    let thisYearSavingsPaise = 0;
    const categoryTotals: Record<string, number> = {};
    for (const tx of transactions) {
      const d = toDate(tx.timestamp);
      if (!d) continue;
      const ts = d.getTime();
      if (ts < yearStart || ts >= yearEnd) continue;
      const credit = tx.amount && tx.amount > 0 ? tx.amount : 0;
      thisYearSavingsPaise += credit;
      if (tx.category) {
        categoryTotals[tx.category] = (categoryTotals[tx.category] ?? 0) + credit;
      }
    }

    // 5. `topCategory` — highest-spending category this year.
    let topCategory: string | null = null;
    let topCategoryTotal = 0;
    for (const [category, total] of Object.entries(categoryTotals)) {
      if (total > topCategoryTotal) {
        topCategoryTotal = total;
        topCategory = category;
      }
    }

    // 6. `projectedYearEndSavingsPaise` — extrapolate current-year pace.
    let projectedYearEndSavingsPaise = thisYearSavingsPaise;
    if (thisYearSavingsPaise > 0 && monthsElapsed < 12) {
      projectedYearEndSavingsPaise = Math.round(
        (thisYearSavingsPaise * 12) / monthsElapsed,
      );
    }
    // Defensive: never let the projection go below a zero floor.
    if (projectedYearEndSavingsPaise < PROJECTION_PROJECTED_TARGET_PAISE) {
      projectedYearEndSavingsPaise = PROJECTION_PROJECTED_TARGET_PAISE;
    }

    // 7. `comparisonToAvgUserPct` — signed % vs the synthetic average.
    let comparisonToAvgUserPct = 0;
    if (AVG_USER_LIFETIME_SAVINGS_PAISE > 0) {
      const diff = lifetimeSavingsPaise - AVG_USER_LIFETIME_SAVINGS_PAISE;
      comparisonToAvgUserPct = Math.round(
        (diff / AVG_USER_LIFETIME_SAVINGS_PAISE) * 100,
      );
    }

    const result: UseRezCashResult = {
      lifetimeSavingsPaise,
      thisYearSavingsPaise,
      thisMonthSavingsPaise,
      memberSinceDate,
      topCategory,
      projectedYearEndSavingsPaise,
      comparisonToAvgUserPct,
    };

    if (__DEV__) {
      logger.debug(
        'useRezCash:computed',
        {
          lifetime: lifetimeSavingsPaise,
          thisYear: thisYearSavingsPaise,
          thisMonth: thisMonthSavingsPaise,
          monthsElapsed,
          projected: projectedYearEndSavingsPaise,
        },
        'B Features',
      );
    }

    return result;
  }, [savingsInsights, walletData]);
}

export default useRezCash;