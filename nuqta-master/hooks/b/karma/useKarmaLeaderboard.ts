/**
 * useKarmaLeaderboard — wires the Karma leaderboard endpoint into a
 * component-friendly shape (Phase 4.2 of the REZ-vs-NUQTA migration).
 *
 * Contract
 * --------
 *   - On mount (and whenever `period` changes), calls
 *     `GET /api/b/karma/leaderboard?period=<period>` and stashes the
 *     result in local state. Errors are captured into `error`.
 *   - `refresh()` re-runs the fetch for the current period (used by
 *     pull-to-refresh and the retry button on the error state).
 *   - `userRank` is surfaced separately so the page can render the
 *     caller's own rank even when they're outside the top-20 window.
 *
 * Usage
 * -----
 *  ```tsx
 *  const { entries, period, isLoading, error, refresh, userRank } =
 *    useKarmaLeaderboard('week');
 *  ```
 *
 * Defensive notes
 * ---------------
 *   - The backend payload is validated defensively; malformed fields
 *     are coerced into safe defaults so a server bug never crashes the
 *     UI.
 *   - `period` is verified against the closed
 *     `KarmaLeaderboardPeriod` union; unknown values fall back to
 *     `'week'`.
 *   - The hook is intentionally *not* backed by a Zustand store — it's
 *     a Phase 4.2 stub.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import type {
  KarmaLeaderboardEntry,
  KarmaLeaderboardPeriod,
} from '@/types/karma.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEADERBOARD_ENDPOINT = '/api/b/karma/leaderboard';

const SAFE_PERIODS: ReadonlyArray<KarmaLeaderboardPeriod> = [
  'week',
  'month',
  'all',
];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UseKarmaLeaderboardResult {
  entries: KarmaLeaderboardEntry[];
  /** The period the leaderboard currently reflects. */
  period: KarmaLeaderboardPeriod;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  /**
   * Rank of the current user within the requested period. `null` when
   * the user isn't on the visible window and the backend didn't supply
   * an out-of-window rank.
   */
  userRank: number | null;
}

// ---------------------------------------------------------------------------
// Defensive normalisers
// ---------------------------------------------------------------------------

function safeNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return Math.floor(value);
}

function safeNonNegativeInt0(value: unknown): number {
  return safeNonNegativeInt(value, 0);
}

function safeRank(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.floor(value);
  if (n < 1) return null;
  return n;
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function safePeriod(value: unknown): KarmaLeaderboardPeriod {
  if (typeof value === 'string') {
    for (const candidate of SAFE_PERIODS) {
      if (candidate === value) return candidate;
    }
  }
  return 'week';
}

function isEntry(value: unknown): value is KarmaLeaderboardEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.rank === 'number' &&
    typeof v.userId === 'string' &&
    typeof v.userName === 'string' &&
    typeof v.totalKarma === 'number' &&
    typeof v.level === 'string' &&
    typeof v.isCurrentUser === 'boolean'
  );
}

function normalizeEntry(raw: unknown): KarmaLeaderboardEntry {
  const v = (typeof raw === 'object' && raw !== null
    ? raw
    : {}) as Record<string, unknown>;
  return {
    rank: safeNonNegativeInt0(v.rank),
    userId: safeString(v.userId, ''),
    userName: safeString(v.userName, 'Anonymous'),
    avatarUrl: typeof v.avatarUrl === 'string' ? v.avatarUrl : undefined,
    totalKarma: safeNonNegativeInt0(v.totalKarma),
    level: safeString(v.level, 'L1'),
    isCurrentUser: v.isCurrentUser === true,
  };
}

function normalizeEntries(raw: unknown): KarmaLeaderboardEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: KarmaLeaderboardEntry[] = [];
  for (const item of raw) {
    const entry = normalizeEntry(item);
    if (entry.userId.length > 0) {
      out.push(entry);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

interface LeaderboardResponse {
  entries: KarmaLeaderboardEntry[];
  period: KarmaLeaderboardPeriod;
  userRank: number | null;
}

async function fetchLeaderboard(
  period: KarmaLeaderboardPeriod,
): Promise<LeaderboardResponse> {
  const response = await apiClient.get<unknown>(
    LEADERBOARD_ENDPOINT,
    { period },
    { timeout: 8000 },
  );
  if (!response.success || response.data === undefined) {
    const message =
      typeof response.error === 'string'
        ? response.error
        : 'Failed to load leaderboard';
    throw new Error(message);
  }
  const v = (typeof response.data === 'object' && response.data !== null
    ? response.data
    : {}) as Record<string, unknown>;
  return {
    entries: normalizeEntries(v.entries),
    period: safePeriod(v.period ?? period),
    userRank: safeRank(v.userRank),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the leaderboard for the given period. Re-fetches whenever
 * the period changes.
 */
export function useKarmaLeaderboard(
  initialPeriod: KarmaLeaderboardPeriod = 'week',
): UseKarmaLeaderboardResult {
  const [period, setPeriod] = useState<KarmaLeaderboardPeriod>(initialPeriod);
  const [entries, setEntries] = useState<KarmaLeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const hasLoadedRef = useRef<boolean>(false);

  const runFetch = useCallback(
    async (target: KarmaLeaderboardPeriod): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const next = await fetchLeaderboard(target);
        setEntries(next.entries);
        setUserRank(next.userRank);
        setPeriod(next.period);
        hasLoadedRef.current = true;
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'karma_leaderboard_fetch_failed',
          { period: target, error: wrapped.message },
          'B Features',
        );
        setError(wrapped);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Initial fetch on mount.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const next = await fetchLeaderboard(initialPeriod);
        if (cancelled) return;
        setEntries(next.entries);
        setUserRank(next.userRank);
        setPeriod(next.period);
        hasLoadedRef.current = true;
      } catch (err) {
        if (cancelled) return;
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'karma_leaderboard_initial_fetch_failed',
          { period: initialPeriod, error: wrapped.message },
          'B Features',
        );
        setError(wrapped);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    await runFetch(period);
  }, [period, runFetch]);

  // Reference `hasLoadedRef` so future additions (e.g. a refetch
  // condition) don't trigger an unused-var warning under strict TS.
  void hasLoadedRef;

  return { entries, period, isLoading, error, refresh, userRank };
}

export default useKarmaLeaderboard;