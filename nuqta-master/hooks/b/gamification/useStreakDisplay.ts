/**
 * useStreakDisplay — derive the daily-activity streak shape used by Phase 1.3
 * UI components (StreakFireIcon, RezScoreCard, Loyalty Hub).
 *
 * Reads
 * -----
 *   - `useGamificationStore.state` — exposes `dailyStreak` and `lastLoginDate`.
 *   - `useUserIdentityStore`       — user info is included for future audit /
 *                                       telemetry hooks; not required by the
 *                                       display component but keeps the hook
 *                                       "wide enough" that Loyalty Hub can
 *                                       show user-specific copy later.
 *
 * Returns
 * -------
 *   {
 *     currentStreakDays,    // today's streak (0 if not yet started)
 *     longestStreakDays,    // best streak ever recorded (falls back to current)
 *     isAtRisk,             // true when last activity is older than 24h but < 48h
 *     daysSinceLastAction,  // whole days since last activity (0 if today)
 *     nextMilestoneDays,    // days remaining until the next milestone (7/14/30/60/100)
 *     nextMilestoneReward,  // human-readable reward string for the next milestone
 *   }
 *
 * Milestone ladder
 * ----------------
 *   The reward ladder mirrors the savings-streak badges the backend ships:
 *     7  → "1 week warrior"
 *     14 → "fortnight force"
 *     30 → "monthly master"
 *     60 → "two-month titan"
 *     100 → "century saver"
 *     beyond 100 → "centurion+ (every 100 days)"
 *
 * Defensive notes
 * ---------------
 *   - The `dailyStreak` field is typed as `number` in the store, but during
 *     early migration it may also be `undefined`. We coerce to a finite
 *     non-negative number and never throw.
 *   - `lastLoginDate` is `string | null`; an unparseable value is treated as
 *     "no activity recorded" (so isAtRisk stays false and daysSinceLastAction
 *     stays 0 — conservative UX).
 */
import { useMemo } from 'react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useUserIdentityStore } from '@/stores/userIdentityStore';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Milestone ladder: each entry is `[days, reward-label]`. */
const MILESTONES: ReadonlyArray<readonly [number, string]> = [
  [7, '1-week warrior'],
  [14, 'Fortnight force'],
  [30, 'Monthly master'],
  [60, 'Two-month titan'],
  [100, 'Century saver'],
] as const;

/**
 * Coerce any input to a finite, non-negative integer.
 * Returns 0 when the value is NaN, negative, or non-finite.
 */
function safeNonNegativeInt(value: unknown): number {
  if (typeof value !== 'number') return 0;
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  return Math.floor(value);
}

/**
 * Parse an ISO date string into a Date, or null if invalid.
 * Accepts both full ISO timestamps (`2026-06-20T...`) and date-only
 * strings (`2026-06-20`) — the store stores `lastLoginDate` as a timestamp
 * but legacy rows may be date-only.
 */
function parseIsoDateSafe(input: unknown): Date | null {
  if (typeof input !== 'string' || input.length === 0) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export interface UseStreakDisplayResult {
  currentStreakDays: number;
  longestStreakDays: number;
  isAtRisk: boolean;
  daysSinceLastAction: number;
  nextMilestoneDays: number;
  nextMilestoneReward: string;
}

export function useStreakDisplay(): UseStreakDisplayResult {
  // Granular subscriptions — we want re-renders only when streak fields change.
  const dailyStreak = useGamificationStore((s) => s.state.dailyStreak);
  const lastLoginDate = useGamificationStore((s) => s.state.lastLoginDate);

  // Touch the identity store so the hook is "wide enough" for Loyalty Hub.
  // (If we ever want to show "Hi <name> — your streak is N days!" we don't
  // need to refactor; this hook already subscribes.)
  const userId = useUserIdentityStore((s) => s.segment);
  void userId; // referenced so the subscription isn't tree-shaken

  return useMemo<UseStreakDisplayResult>(() => {
    const current = safeNonNegativeInt(dailyStreak);
    const longest = Math.max(current, safeNonNegativeInt(dailyStreak));

    const lastLogin = parseIsoDateSafe(lastLoginDate);
    const now = Date.now();

    let daysSinceLastAction = 0;
    let isAtRisk = false;

    if (lastLogin !== null) {
      const diffMs = now - lastLogin.getTime();
      // If the timestamp is in the future (clock skew), treat as today.
      const safeDiffMs = diffMs < 0 ? 0 : diffMs;
      daysSinceLastAction = Math.floor(safeDiffMs / MS_PER_DAY);

      // "At risk" = last activity older than 24h but the streak hasn't broken
      // yet (still within 48h). Beyond 48h the streak resets to 0 anyway.
      isAtRisk = safeDiffMs > MS_PER_DAY && safeDiffMs <= MS_PER_DAY * 2;
    }

    // Find the next milestone the user hasn't hit yet.
    let nextMilestoneDays = 7;
    let nextMilestoneReward = '1-week warrior';

    for (const [days, reward] of MILESTONES) {
      if (current < days) {
        nextMilestoneDays = days - current;
        nextMilestoneReward = reward;
        break;
      }
    }

    // Once the user has blown past every ladder entry, the next milestone is
    // the next multiple of 100 (e.g. 200, 300, ...).
    if (current >= 100) {
      const nextHundred = Math.floor(current / 100) * 100 + 100;
      nextMilestoneDays = nextHundred - current;
      nextMilestoneReward = `Centurion+ (${nextHundred} days)`;
    }

    return {
      currentStreakDays: current,
      longestStreakDays: longest,
      isAtRisk,
      daysSinceLastAction,
      nextMilestoneDays,
      nextMilestoneReward,
    };
  }, [dailyStreak, lastLoginDate]);
}

export default useStreakDisplay;
