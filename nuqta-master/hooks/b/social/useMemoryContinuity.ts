/**
 * useMemoryContinuity — derive short personalised memory references.
 *
 * Architecture
 * ------------
 *   Pure derivation hook. No network calls, no side effects, no timers.
 *   The hook reads from the existing Zustand stores (wallet, gamification,
 *   user identity) and projects the last 90 days of activity into 3–5
 *   `MemoryReference` cards the UI can render verbatim.
 *
 * Sources of memory
 * -----------------
 *   1. Recent wallet transactions (merchant, amount, type, timestamp)
 *      → "You saved ₹X at {StoreName} last week"
 *   2. Aggregated weekday distribution
 *      → "You tend to shop more on weekends"
 *   3. Aggregated top-category in the current month
 *      → "Your favourite category this month is {category}"
 *   4. Stores the user hasn't visited in ≥30 days
 *      → "You haven't visited {StoreName} in 30 days — miss it?"
 *   5. Last calendar month savings grouped by category
 *      → "Last month you saved ₹X on {Category}"
 *
 * Time window
 * -----------
 *   All references must sit inside the trailing 90-day window. Anything
 *   older is dropped at this layer so the card and the page never have
 *   to defend against stale data.
 *
 * Stability
 * ---------
 *   - Re-runs are O(transactions + history) on every store update. Both
 *     working sets are small (≤ a few hundred rows) so this is fine.
 *   - The hook never throws; malformed inputs are coerced to safe
 *     defaults (0 for counts, "" for strings, [] for arrays).
 *   - The returned shape is always stable — `memories` is always an
 *     array (possibly empty), `hasMemory` is always a boolean.
 *
 * Usage
 * -----
 *   ```tsx
 *   const { memories, hasMemory, refresh, totalReferences } =
 *     useMemoryContinuity();
 *   ```
 */
import { useCallback, useMemo } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useUserIdentityStore } from '@/stores/userIdentityStore';
import logger from '@/utils/logger';
import type {
  MemoryCategory,
  MemoryReference,
  UseMemoryContinuityResult,
} from '@/types/memory.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of milliseconds in a day. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Max age of any memory — anything older is dropped at the hook layer. */
const MAX_AGE_DAYS = 90;

/** Cap on the number of memories returned to the UI. */
const MAX_MEMORIES = 5;

/**
 * Threshold (in days) past which a "you haven't visited X" prompt
 * becomes meaningful. Below this, the user has been there too recently
 * for it to be a useful nudge.
 */
const REVISIT_NUDGE_DAYS = 30;

/** Number of days a "last week" memory covers. */
const LAST_WEEK_DAYS = 7;

/** Categories considered weekend spending. */
const WEEKEND_INDICES: ReadonlySet<number> = new Set([0, 6]); // Sun, Sat

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Coerce anything to a finite number; NaN / undefined / null → 0. */
function safeNumber(value: unknown): number {
  if (typeof value !== 'number') return 0;
  if (!Number.isFinite(value)) return 0;
  return value;
}

/** Coerce anything to a trimmed string; non-strings → ''. */
function safeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/** Coerce a transaction timestamp to ms; `NaN` when malformed. */
function txTimestampMs(tx: { timestamp?: unknown }): number {
  const t = tx.timestamp;
  if (t instanceof Date) return t.getTime();
  if (typeof t === 'string') {
    const parsed = Date.parse(t);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  if (typeof t === 'number') {
    return Number.isFinite(t) ? t : Number.NaN;
  }
  return Number.NaN;
}

/** Days between `fromMs` and `nowMs`, clamped to ≥ 0. */
function daysBetween(fromMs: number, nowMs: number): number {
  if (!Number.isFinite(fromMs)) return 0;
  const delta = nowMs - fromMs;
  if (delta <= 0) return 0;
  return Math.floor(delta / MS_PER_DAY);
}

/** Format a rupee amount as "₹1,234" (no decimals, en-IN grouping). */
const RUPEE_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatRupees(amountRupees: number): string {
  if (!Number.isFinite(amountRupees) || amountRupees <= 0) return '₹0';
  return RUPEE_FORMATTER.format(Math.round(amountRupees));
}

function rupeesFromPaise(paise: number): number {
  return Math.round(safeNumber(paise) / 100);
}

// ---------------------------------------------------------------------------
// Memory builders
// ---------------------------------------------------------------------------

/** A loose transaction record — the wallet store's shape can vary. */
interface TxLike {
  timestamp?: unknown;
  amount?: unknown;
  type?: unknown;
  merchantName?: unknown;
  offerId?: unknown;
  orderId?: unknown;
  category?: unknown;
}

/** Filter out malformed / out-of-window transactions in one pass. */
function pruneTransactions(
  raw: ReadonlyArray<TxLike>,
  cutoffMs: number,
): { id: string; ms: number; amountRupees: number; type: string; merchant: string; category: string }[] {
  const out: { id: string; ms: number; amountRupees: number; type: string; merchant: string; category: string }[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const tx = raw[i]!;
    const ms = txTimestampMs(tx);
    if (!Number.isFinite(ms)) continue;
    if (ms < cutoffMs) continue;
    const amountRupees = safeNumber(tx.amount);
    if (amountRupees <= 0) continue;
    const type = safeString(tx.type) || 'spend';
    const merchant = safeString(tx.merchantName);
    const category = safeString(tx.category);
    out.push({
      id: `tx_${i}_${ms}`,
      ms,
      amountRupees,
      type,
      merchant,
      category,
    });
  }
  return out;
}

/**
 * Build a "you saved ₹X at {Store} last week" memory.
 *
 * Picks the single largest savings transaction in the last 7 days that
 * has a `merchantName`. Returns `null` if nothing qualifies.
 */
function buildLastWeekSavingMemory(
  transactions: ReadonlyArray<{ ms: number; amountRupees: number; type: string; merchant: string }>,
  nowMs: number,
): MemoryReference | null {
  const lastWeekCutoff = nowMs - LAST_WEEK_DAYS * MS_PER_DAY;
  let best: { ms: number; amountRupees: number; merchant: string } | null = null;
  for (const tx of transactions) {
    if (tx.ms < lastWeekCutoff) continue;
    if (tx.ms > nowMs) continue;
    if (!tx.merchant) continue;
    // Savings = anything that is not a spend/debit. The wallet type
    // exposes 'earned' | 'spent' | 'expired' | 'bonus' | 'transfer' | 'gift'.
    if (tx.type === 'spent' || tx.type === 'expired') continue;
    if (best === null || tx.amountRupees > best.amountRupees) {
      best = { ms: tx.ms, amountRupees: tx.amountRupees, merchant: tx.merchant };
    }
  }
  if (best === null) return null;
  const daysAgo = daysBetween(best.ms, nowMs);
  if (daysAgo > MAX_AGE_DAYS) return null;
  return {
    id: `mem_saved_${best.ms}_${best.merchant}`,
    text: `You saved ${formatRupees(best.amountRupees)} at ${best.merchant} last week`,
    category: 'saving',
    relatedEntityId: undefined,
    relatedEntityType: 'store',
    daysAgo,
    ctaRoute: undefined,
  };
}

/**
 * Build a "you tend to shop more on weekends" memory.
 *
 * We split the in-window transactions by weekday and surface the side
 * (weekday vs weekend) that has the higher rupee total — but only if the
 * side leads by a meaningful margin (60/40) so we don't fabricate a
 * pattern out of noise.
 */
function buildWeekendShopperMemory(
  transactions: ReadonlyArray<{ ms: number; amountRupees: number }>,
): MemoryReference | null {
  if (transactions.length < 4) return null;
  let weekend = 0;
  let weekday = 0;
  let latestMs = 0;
  for (const tx of transactions) {
    const d = new Date(tx.ms);
    if (WEEKEND_INDICES.has(d.getDay())) {
      weekend += tx.amountRupees;
    } else {
      weekday += tx.amountRupees;
    }
    if (tx.ms > latestMs) latestMs = tx.ms;
  }
  const total = weekend + weekday;
  if (total <= 0) return null;
  const weekendShare = weekend / total;
  if (weekendShare < 0.6 && weekendShare > 0.4) return null;
  const text =
    weekendShare >= 0.6
      ? 'You tend to shop more on weekends'
      : 'You tend to shop more on weekdays';
  return {
    id: `mem_weekend_${Math.round(weekendShare * 100)}`,
    text,
    category: 'preference',
    relatedEntityType: undefined,
    relatedEntityId: undefined,
    daysAgo: 0,
    ctaRoute: undefined,
  };
}

/**
 * Build a "your favourite category this month is {X}" memory.
 *
 * Aggregates category spend for the current calendar month and surfaces
 * the leader when its share is large enough to call a "favourite".
 */
function buildFavouriteCategoryMemory(
  transactions: ReadonlyArray<{ ms: number; amountRupees: number; category: string }>,
  nowMs: number,
): MemoryReference | null {
  const now = new Date(nowMs);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const totals = new Map<string, number>();
  let totalSpend = 0;
  for (const tx of transactions) {
    if (tx.ms < monthStart || tx.ms >= monthEnd) continue;
    if (!tx.category) continue;
    const prev = totals.get(tx.category) ?? 0;
    const next = prev + tx.amountRupees;
    totals.set(tx.category, next);
    totalSpend += tx.amountRupees;
  }
  if (totalSpend <= 0 || totals.size === 0) return null;
  let topCategory: string | null = null;
  let topAmount = 0;
  for (const [cat, amt] of totals.entries()) {
    if (amt > topAmount) {
      topCategory = cat;
      topAmount = amt;
    }
  }
  if (topCategory === null) return null;
  if (topAmount / totalSpend < 0.4) return null;
  return {
    id: `mem_fav_cat_${topCategory}`,
    text: `Your favourite category this month is ${topCategory}`,
    category: 'preference',
    relatedEntityId: topCategory,
    relatedEntityType: 'category',
    daysAgo: 0,
    ctaRoute: undefined,
  };
}

/**
 * Build a "you haven't visited {Store} in 30 days — miss it?" memory.
 *
 * Picks the store with the largest historical spend that the user
 * hasn't been to in ≥ 30 days. Returns `null` if everything is fresh.
 */
function buildRevisitNudgeMemory(
  transactions: ReadonlyArray<{ ms: number; amountRupees: number; merchant: string }>,
  nowMs: number,
): MemoryReference | null {
  type Agg = { name: string; lastMs: number; totalSpend: number };
  const stores = new Map<string, Agg>();
  for (const tx of transactions) {
    if (!tx.merchant) continue;
    const prev = stores.get(tx.merchant);
    if (prev === undefined) {
      stores.set(tx.merchant, { name: tx.merchant, lastMs: tx.ms, totalSpend: tx.amountRupees });
    } else {
      prev.totalSpend += tx.amountRupees;
      if (tx.ms > prev.lastMs) prev.lastMs = tx.ms;
    }
  }
  let best: Agg | null = null;
  for (const agg of stores.values()) {
    const days = daysBetween(agg.lastMs, nowMs);
    if (days < REVISIT_NUDGE_DAYS) continue;
    if (best === null || agg.totalSpend > best.totalSpend) {
      best = agg;
    }
  }
  if (best === null) return null;
  const days = daysBetween(best.lastMs, nowMs);
  if (days > MAX_AGE_DAYS) return null;
  return {
    id: `mem_revisit_${best.name}`,
    text: `You haven't visited ${best.name} in ${days} days — miss it?`,
    category: 'spending',
    relatedEntityId: best.name,
    relatedEntityType: 'store',
    daysAgo: days,
    ctaRoute: undefined,
  };
}

/**
 * Build a "last month you saved ₹X on {Category}" memory.
 *
 * Groups PREVIOUS-calendar-month transactions by category, sums up
 * non-debit rupee amounts, and surfaces the leading category. Falls
 * back to grouping by merchant when no category is set anywhere.
 */
function buildLastMonthSavingMemory(
  transactions: ReadonlyArray<{ ms: number; amountRupees: number; type: string; category: string; merchant: string }>,
  nowMs: number,
): MemoryReference | null {
  const now = new Date(nowMs);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const byCategory = new Map<string, number>();
  const byMerchant = new Map<string, number>();
  let any = false;
  for (const tx of transactions) {
    if (tx.ms < lastMonthStart || tx.ms >= lastMonthEnd) continue;
    if (tx.type === 'spent' || tx.type === 'expired') continue;
    if (tx.amountRupees <= 0) continue;
    any = true;
    if (tx.category) {
      byCategory.set(tx.category, (byCategory.get(tx.category) ?? 0) + tx.amountRupees);
    } else if (tx.merchant) {
      byMerchant.set(tx.merchant, (byMerchant.get(tx.merchant) ?? 0) + tx.amountRupees);
    }
  }
  if (!any) return null;
  let label: string | null = null;
  let amount = 0;
  if (byCategory.size > 0) {
    for (const [k, v] of byCategory.entries()) {
      if (v > amount) {
        label = k;
        amount = v;
      }
    }
  } else if (byMerchant.size > 0) {
    for (const [k, v] of byMerchant.entries()) {
      if (v > amount) {
        label = k;
        amount = v;
      }
    }
  }
  if (label === null || amount <= 0) return null;
  return {
    id: `mem_last_month_${label}`,
    text: `Last month you saved ${formatRupees(amount)} on ${label}`,
    category: 'saving',
    relatedEntityId: label,
    relatedEntityType: byCategory.size > 0 ? 'category' : 'store',
    daysAgo: 30,
    ctaRoute: undefined,
  };
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/**
 * `useMemoryContinuity` — derive 3–5 longitudinal memory references
 * from the local stores.
 *
 * Returns an empty `memories` array when there is not enough signal —
 * the page renders an "empty state" instead of fabricated copy.
 */
export function useMemoryContinuity(): UseMemoryContinuityResult {
  // Granular selectors keep re-renders cheap.
  const savingsInsights = useWalletStore((s) => s.savingsInsights);
  const recentTransactions = useWalletStore(
    (s) => s.walletData?.recentTransactions ?? [],
  );

  const dailyStreak = useGamificationStore((s) => s.state.dailyStreak);
  const achievements = useGamificationStore((s) => s.state.achievements);

  // We currently only read the segment to keep the user-identity
  // subscription active — future memories may key off it.
  const segment = useUserIdentityStore((s) => s.segment);
  void segment;

  const memories = useMemo<MemoryReference[]>(() => {
    try {
      const now = nowMs();
      const cutoffMs = now - MAX_AGE_DAYS * MS_PER_DAY;
      const txs = pruneTransactions(recentTransactions as ReadonlyArray<TxLike>, cutoffMs);

      const candidates: MemoryReference[] = [];

      const lastWeek = buildLastWeekSavingMemory(txs, now);
      if (lastWeek !== null) candidates.push(lastWeek);

      const weekend = buildWeekendShopperMemory(txs);
      if (weekend !== null) candidates.push(weekend);

      const fav = buildFavouriteCategoryMemory(txs, now);
      if (fav !== null) candidates.push(fav);

      const nudge = buildRevisitNudgeMemory(txs, now);
      if (nudge !== null) candidates.push(nudge);

      const lastMonth = buildLastMonthSavingMemory(txs, now);
      if (lastMonth !== null) candidates.push(lastMonth);

      // Streak memory: only surface when the user has a real streak AND
      // we haven't already produced enough memories.
      if (dailyStreak >= 3 && candidates.length < MAX_MEMORIES) {
        candidates.push({
          id: `mem_streak_${dailyStreak}`,
          text: `You're on a ${dailyStreak}-day savings streak — keep it going`,
          category: 'streak' as MemoryCategory,
          daysAgo: 0,
          ctaRoute: undefined,
        });
      }

      // Achievement memory: surface the most recent unlocked achievement
      // when we still have room.
      if (achievements.length > 0 && candidates.length < MAX_MEMORIES) {
        const latest = achievements[0];
        if (latest && safeString(latest.title)) {
          candidates.push({
            id: `mem_ach_${safeString(latest.id) || 'latest'}`,
            text: `You unlocked "${safeString(latest.title)}" — nice work`,
            category: 'social' as MemoryCategory,
            daysAgo: 0,
            ctaRoute: undefined,
          });
        }
      }

      // Savings-insights fallback: when the user has lifetime savings
      // but no recent transactions, still surface an aggregate memory.
      if (candidates.length < MAX_MEMORIES) {
        const lifetimeRupees = rupeesFromPaise(safeNumber(savingsInsights?.totalSaved));
        if (lifetimeRupees > 0) {
          candidates.push({
            id: `mem_lifetime_saved_${lifetimeRupees}`,
            text: `You've saved ${formatRupees(lifetimeRupees)} on REZ so far`,
            category: 'saving',
            daysAgo: 0,
            ctaRoute: undefined,
          });
        }
      }

      return candidates.slice(0, MAX_MEMORIES);
    } catch (err) {
      logger.warn(
        'memory_continuity_aggregation_failed',
        { error: err instanceof Error ? err.message : String(err) },
        'B Features',
      );
      return [];
    }
  }, [recentTransactions, savingsInsights, dailyStreak, achievements]);

  const refresh = useCallback((): void => {
    // Pure derivation hook — refresh is a contract placeholder so the
    // page can wire pull-to-refresh to it without conditional plumbing.
    logger.info('memory_continuity_refresh', { count: memories.length }, 'B Features');
  }, [memories.length]);

  return {
    memories,
    totalReferences: memories.length,
    hasMemory: memories.length > 0,
    refresh,
  };
}

function nowMs(): number {
  return Date.now();
}

export default useMemoryContinuity;
