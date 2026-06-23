/**
 * Social-feature types — shared between hooks, components, and screens
 * that participate in the Weekly Digest / Savings Share surface.
 *
 * Consumers
 * ---------
 *   - `hooks/b/social/useWeeklyDigest.ts` — produces `WeeklyDigestSummary`.
 *   - `components/b/social/WeeklyDigestCard.tsx` — renders the summary.
 *   - `components/b/social/SavingsShareCard.tsx` — renderable capture card.
 *   - `app/b/social/weekly-digest.tsx` — full page composing the above.
 *
 * Stability contract
 * ------------------
 *   - `WeeklyDigestSummary` is the public, hook-shaped payload — keep it
 *     serializable (no `Date`, no functions) so it can move over the wire
 *     or be persisted in state without serialization surprises.
 *   - All monetary amounts are expressed in **paise** (₹1 = 100 paise) to
 *     stay consistent with the rest of the B-feature surface (savings,
 *     coin-expiry, payments).
 *   - Optional fields stay optional — the UI must render defensively.
 */

/**
 * Lightweight reference to an unlocked achievement shown in the digest.
 *
 * The full `Achievement` payload from `services/achievementApi` is too
 * heavy for a digest card; we only carry what the UI actually renders.
 */
export interface AchievementRef {
  /** Stable server-assigned achievement id. */
  id: string;
  /** Short human-readable title (e.g. "First 5 offers"). */
  title: string;
  /** Emoji marker for the achievement (e.g. "🏆"). */
  iconEmoji: string;
  /** ISO-8601 timestamp when the achievement was unlocked. */
  unlockedAt: string;
}

/**
 * Aggregated weekly digest summary for a single user.
 *
 * Produced by `useWeeklyDigest` from in-memory store data — no network
 * round-trip. The page-level component passes it straight to
 * `WeeklyDigestCard` / `SavingsShareCard`.
 *
 * `weekOverWeekChangePct` is computed against the previous 7-day window
 * (e.g. +23 = 23% higher savings than the prior week, -5 = 5% drop).
 * `weekOverWeekTrend` is the directional hint used to render the
 * up/down arrow without re-computing the sign.
 */
export interface WeeklyDigestSummary {
  /** User's first name (or display name fallback). */
  userName: string;
  /** ISO-8601 timestamp marking the start of the digest window. */
  weekStartDate: string;
  /** ISO-8601 timestamp marking the end of the digest window. */
  weekEndDate: string;
  /** Total savings across all categories this week, in paise. */
  totalSavingsPaise: number;
  /** Cashback earned (subset of savings), in paise. */
  totalCashbackPaise: number;
  /** Count of distinct offers the user redeemed this week. */
  offersUsed: number;
  /** Count of distinct stores the user transacted at this week. */
  storesVisited: number;
  /** Display name of the store with the highest savings this week. */
  topStoreName?: string;
  /** Display name of the category with the highest savings this week. */
  topCategory?: string;
  /** Active streak length in days at end-of-week. */
  streakDays: number;
  /** Achievements unlocked during the window, newest-first (capped at 3). */
  achievementsUnlocked: AchievementRef[];
  /**
   * Percent change in total savings vs the prior 7-day window.
   * Positive = more savings this week, negative = less.
   */
  weekOverWeekChangePct: number;
  /**
   * Directional hint that mirrors `weekOverWeekChangePct`. The UI prefers
   * this over re-checking the sign of the numeric percentage.
   */
  weekOverWeekTrend: 'up' | 'down' | 'flat';
  /**
   * True when the week produced no savings, no cashback, no offers, and
   * no achievements. Callers use this to render an empty state instead
   * of a degenerate "₹0" digest.
   */
  isEmptyWeek: boolean;
}

/**
 * Lightweight payload for a generic share-card preview surface.
 *
 * Currently used to hand data to the OS share sheet (title + subtitle
 * + optional image URI). Kept here so future share surfaces (achievement
 * cards, streak cards) can share the same shape without re-defining it.
 */
export interface ShareCardData {
  /** Title shown on the share preview (and used as `dialogTitle`). */
  title: string;
  /** Subtitle / supporting copy under the title. */
  subtitle: string;
  /** Local file URI of a captured image (from view-shot, etc.). */
  imageUri?: string;
}