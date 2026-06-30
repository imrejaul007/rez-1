/**
 * useWeeklyDigest — UI-only aggregator for the Weekly Digest surface.
 *
 * Architecture
 * ------------
 *   Pure derivation hook — no network, no side effects, no timers. We
 *   read from the existing Zustand stores (wallet / gamification / user
 *   identity) and project the last 7 days into a `WeeklyDigestSummary`
 *   the page can render verbatim.
 *
 * Time window
 * -----------
 *   "This week" = the trailing 7 calendar days ending at `now` (exclusive
 *   of `now`). We compute the previous 7 days in the same way for the
 *   week-over-week delta. The window is inclusive on both ends at the
 *   day-boundary level (start-of-day → end-of-day).
 *
 * Empty week
 * ----------
 *   We never fabricate a "₹0" digest. When the user has no savings,
 *   no offers, no cashback, and no achievements in the window, the
 *   hook returns `null` so callers can render a first-week empty state
 *   instead of a sad zero card.
 *
 * Stability
 * ---------
 *   - Re-runs are O(transactions) on every store update; the working set
 *     is small so this is fine.
 *   - The hook never throws; malformed inputs are coerced to safe
 *     defaults (0 for counts, [] for arrays, "" for strings).
 */
import { useMemo } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useUserIdentityStore } from '@/stores/userIdentityStore';
import logger from '@/utils/logger';
import { EMPTY_ARRAY } from '@/utils/zustandStable';
import type {
  AchievementRef,
  WeeklyDigestSummary,
} from '@/types/social.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of milliseconds in a day — used for the rolling 7-day window. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Width of the digest window in days. */
const WINDOW_DAYS = 7;

/** Cap on `achievementsUnlocked` to keep the card tidy. */
const MAX_ACHIEVEMENTS_IN_DIGEST = 3;

/** Fallback user name when the identity store has nothing on hand. */
const DEFAULT_USER_NAME = 'there';

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

/** Compute the start-of-day (local) for a given Date. */
function startOfDay(d: Date): Date {
  const copy = new Date(d.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Coerce a transaction timestamp (Date | string | number) to ms. */
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

interface WindowAggregate {
  totalSavingsPaise: number;
  totalCashbackPaise: number;
  offersUsed: number;
  storesVisited: number;
  topStoreName?: string;
  topCategory?: string;
}

/**
 * Reduce a list of wallet transactions into a per-week aggregate.
 */
function aggregateTransactions(
  transactions: ReadonlyArray<unknown>,
  startMs: number,
  endMs: number,
): WindowAggregate {
  const storeSavings = new Map<string, number>();
  const categorySavings = new Map<string, number>();
  const stores = new Set<string>();
  const offers = new Set<string>();

  let totalSavingsPaise = 0;
  let totalCashbackPaise = 0;
  let topStoreName: string | undefined;
  let topStoreSavingsPaise = 0;
  let topCategory: string | undefined;
  let topCategorySavingsPaise = 0;

  for (const raw of transactions) {
    const tx = raw as {
      timestamp?: unknown;
      amount?: unknown;
      type?: unknown;
      merchantName?: unknown;
      offerId?: unknown;
      orderId?: unknown;
      category?: unknown;
    };
    const ts = txTimestampMs(tx);
    if (!Number.isFinite(ts)) continue;
    if (ts < startMs || ts >= endMs) continue;

    const amount = safeNumber(tx.amount);
    if (amount <= 0) continue;

    // Savings = money the user got back. Spent/expired are not savings.
    const txType = safeString(tx.type);
    if (txType === 'spent' || txType === 'expired') continue;

    totalSavingsPaise += amount;
    if (txType === 'bonus' || txType === 'cashback') {
      totalCashbackPaise += amount;
    }

    const storeName = safeString(tx.merchantName);
    if (storeName) {
      stores.add(storeName);
      const prev = storeSavings.get(storeName) ?? 0;
      const next = prev + amount;
      storeSavings.set(storeName, next);
      if (next > topStoreSavingsPaise) {
        topStoreSavingsPaise = next;
        topStoreName = storeName;
      }
    }

    const category = safeString(tx.category);
    if (category) {
      const prev = categorySavings.get(category) ?? 0;
      const next = prev + amount;
      categorySavings.set(category, next);
      if (next > topCategorySavingsPaise) {
        topCategorySavingsPaise = next;
        topCategory = category;
      }
    }

    const offerKey = safeString(tx.offerId) || safeString(tx.orderId);
    if (offerKey) offers.add(offerKey);
  }

  return {
    totalSavingsPaise,
    totalCashbackPaise,
    offersUsed: offers.size,
    storesVisited: stores.size,
    topStoreName,
    topCategory,
  };
}

/**
 * Pull achievement refs unlocked inside the digest window.
 *
 * Walks every list the gamification store exposes (live queue,
 * unlocked list, achievement-progress sub-aggregate) and dedupes by id.
 */
function collectAchievementsInWindow(
  sources: ReadonlyArray<{
    id?: unknown;
    title?: unknown;
    icon?: unknown;
    unlockedDate?: unknown;
    timestamp?: unknown;
  }>,
  startMs: number,
  endMs: number,
): AchievementRef[] {
  const seen = new Set<string>();
  const out: AchievementRef[] = [];

  const pushIfInWindow = (a: {
    id?: unknown;
    title?: unknown;
    icon?: unknown;
    unlockedDate?: unknown;
    timestamp?: unknown;
  }): void => {
    const id = safeString(a.id);
    if (!id || seen.has(id)) return;
    const tsStr = safeString(a.unlockedDate) || safeString(a.timestamp);
    const ms = tsStr ? Date.parse(tsStr) : Number.NaN;
    if (!Number.isFinite(ms)) return;
    if (ms < startMs || ms >= endMs) return;
    seen.add(id);
    out.push({
      id,
      title: safeString(a.title) || 'Achievement',
      iconEmoji: safeString(a.icon) || '🏆',
      unlockedAt: new Date(ms).toISOString(),
    });
  };

  for (const a of sources) pushIfInWindow(a);

  out.sort((a, b) => Date.parse(b.unlockedAt) - Date.parse(a.unlockedAt));
  return out.slice(0, MAX_ACHIEVEMENTS_IN_DIGEST);
}

/**
 * Best-effort user-facing name from the user-identity store.
 */
function deriveUserName(statedIdentity: string | null | undefined): string {
  if (!statedIdentity) return DEFAULT_USER_NAME;
  switch (statedIdentity) {
    case 'student':
      return 'student';
    case 'corporate':
      return 'pro';
    case 'general':
      return 'friend';
    default:
      return DEFAULT_USER_NAME;
  }
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/**
 * `useWeeklyDigest` — derive the trailing-7-day digest from local stores.
 *
 * Returns `null` when the window is empty (no savings, no offers, no
 * achievements) so callers can render an "empty week" state.
 */
export function useWeeklyDigest(): WeeklyDigestSummary | null {
  // Granular selectors keep re-renders cheap.
  const savingsInsights = useWalletStore((s) => s.savingsInsights);
  const recentTransactions = useWalletStore(
    (s) => s.walletData?.recentTransactions ?? EMPTY_ARRAY,
  );

  const dailyStreak = useGamificationStore((s) => s.state.dailyStreak);
  const achievementQueue = useGamificationStore((s) => s.state.achievementQueue);
  const achievements = useGamificationStore((s) => s.state.achievements);
  const achievementProgress = useGamificationStore((s) => s.state.achievementProgress);

  const statedIdentity = useUserIdentityStore((s) => s.statedIdentity);

  return useMemo<WeeklyDigestSummary | null>(() => {
    try {
      const now = new Date();
      const today = startOfDay(now);
      const thisStartMs = today.getTime();
      const thisEndMs = thisStartMs + WINDOW_DAYS * MS_PER_DAY;
      const prevStartMs = thisStartMs - WINDOW_DAYS * MS_PER_DAY;
      const prevEndMs = thisStartMs;

      const thisAgg = aggregateTransactions(recentTransactions, thisStartMs, thisEndMs);
      const prevAgg = aggregateTransactions(recentTransactions, prevStartMs, prevEndMs);

      // Savings totals: prefer the transaction-derived number, then fall
      // back to the wallet's month-to-date insights snapshot.
      const insightsThisMonth = safeNumber(savingsInsights?.thisMonth);
      const totalSavingsPaise =
        thisAgg.totalSavingsPaise > 0 ? thisAgg.totalSavingsPaise : insightsThisMonth;
      const totalCashbackPaise =
        thisAgg.totalCashbackPaise > 0 ? thisAgg.totalCashbackPaise : totalSavingsPaise;

      // Achievement sources — flatten every list into a single iterable.
      const achievementSources = [
        ...achievementQueue.map((u) => u.achievement),
        ...achievements,
        ...(achievementProgress?.achievements ?? []),
      ];
      const achievementsUnlocked = collectAchievementsInWindow(
        achievementSources,
        thisStartMs,
        thisEndMs,
      );

      // Week-over-week delta.
      const prevSavings = prevAgg.totalSavingsPaise;
      let weekOverWeekChangePct = 0;
      if (prevSavings > 0) {
        weekOverWeekChangePct = Math.round(((totalSavingsPaise - prevSavings) / prevSavings) * 100);
      } else if (totalSavingsPaise > 0) {
        weekOverWeekChangePct = 100;
      }
      const weekOverWeekTrend: 'up' | 'down' | 'flat' =
        weekOverWeekChangePct > 0 ? 'up' : weekOverWeekChangePct < 0 ? 'down' : 'flat';

      // Empty-week detection uses only window-scoped signals.
      const isEmptyWeek =
        totalSavingsPaise <= 0 &&
        totalCashbackPaise <= 0 &&
        thisAgg.offersUsed <= 0 &&
        thisAgg.storesVisited <= 0 &&
        achievementsUnlocked.length === 0;

      if (isEmptyWeek) {
        return null;
      }

      return {
        userName: deriveUserName(statedIdentity),
        weekStartDate: new Date(thisStartMs).toISOString(),
        weekEndDate: new Date(thisEndMs).toISOString(),
        totalSavingsPaise,
        totalCashbackPaise,
        offersUsed: thisAgg.offersUsed,
        storesVisited: thisAgg.storesVisited,
        topStoreName: thisAgg.topStoreName,
        topCategory: thisAgg.topCategory,
        streakDays: safeNumber(dailyStreak),
        achievementsUnlocked,
        weekOverWeekChangePct,
        weekOverWeekTrend,
        isEmptyWeek: false,
      };
    } catch (err) {
      logger.warn(
        'weekly_digest_aggregation_failed',
        { error: err instanceof Error ? err.message : String(err) },
        'B Features',
      );
      return null;
    }
  }, [
    savingsInsights,
    recentTransactions,
    dailyStreak,
    achievementQueue,
    achievements,
    achievementProgress,
    statedIdentity,
  ]);
}

export default useWeeklyDigest;