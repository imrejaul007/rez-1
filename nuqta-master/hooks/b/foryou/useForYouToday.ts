/**
 * useForYouToday — fetches the daily "For You" feed.
 *
 * Wraps `GET /api/b/foryou/today` and exposes a component-friendly shape.
 * The hook keeps the last-known feed around even after an error so the UI
 * can render stale data with a non-blocking error banner if it wants to.
 *
 * Lifecycle
 * ---------
 *  - On mount, kicks off a single HTTP fetch.
 *  - While in flight, `isLoading` is `true` and `error` is `null`.
 *  - On failure, the `Error` is captured into `error` and the previous
 *    feed (if any) is kept. A `foryou_fetch_failed` warn is logged.
 *  - `refresh()` re-runs the fetch — wired up to pull-to-refresh and the
 *    manual "Refresh" button on the page.
 *  - The hook never throws out of `refresh()`; all errors are caught and
 *    surfaced through state.
 *
 * Staleness
 * ---------
 *  - `lastUpdatedAt` is the wall-clock time of the most recent successful
 *    fetch (or `null` if we've never succeeded).
 *  - `isStale` is `true` once the server's `validUntil` has passed.
 *  - The UI is free to call `refresh()` automatically when `isStale` flips
 *    — the hook itself only fetches on mount and on explicit `refresh()`.
 *
 * Usage
 * -----
 *  ```tsx
 *  const { feed, isLoading, error, refresh, lastUpdatedAt, isStale } =
 *    useForYouToday();
 *  ```
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import {
  type ForYouFeed,
  normalizeForYouFeed,
} from '@/types/foryou.types';

/** Endpoint exposed by `src/routes/b/foryou.ts` in the B-side backend. */
const FORYOU_ENDPOINT = '/api/b/foryou/today';

export interface UseForYouTodayResult {
  feed: ForYouFeed;
  isLoading: boolean;
  error: Error | null;
  /** Manually re-run the fetch. Wired to pull-to-refresh and the button. */
  refresh: () => Promise<void>;
  /** Wall-clock time of the most recent successful fetch, or `null`. */
  lastUpdatedAt: Date | null;
  /** `true` once `validUntil` has passed; UI may auto-refresh. */
  isStale: boolean;
}

/** Empty-feed placeholder used until the first response lands. */
const EMPTY_FEED: ForYouFeed = {
  actions: [],
  generatedAt: '',
  validUntil: '',
  userSegment: 'all',
};

/**
 * Fetch the raw feed payload from the B-side backend.
 *
 * The endpoint returns the feed directly inside `data` — see
 * `services/apiClient.ts` for the unwrap contract.
 */
async function fetchForYouFeed(): Promise<ForYouFeed> {
  const response = await apiClient.get<ForYouFeed>(FORYOU_ENDPOINT, undefined, {
    timeout: 8000,
  });
  if (!response.success || response.data === undefined) {
    const message = typeof response.error === 'string'
      ? response.error
      : 'Failed to load your daily feed';
    throw new Error(message);
  }
  return normalizeForYouFeed(response.data);
}

/**
 * Compute the staleness flag for a feed given the current wall-clock time.
 * Returns `false` if the feed has no `validUntil` (e.g. before first load).
 */
function computeIsStale(feed: ForYouFeed, nowMs: number): boolean {
  if (!feed.validUntil) return false;
  const until = new Date(feed.validUntil).getTime();
  if (!Number.isFinite(until)) return false;
  return nowMs >= until;
}

/**
 * `useForYouToday` — read the daily personalised feed.
 *
 * Returns a stable object shape. Consumers render the loading / error /
 * empty states from the included flags.
 */
export function useForYouToday(): UseForYouTodayResult {
  const [feed, setFeed] = useState<ForYouFeed>(EMPTY_FEED);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  // Track whether we have ever successfully populated the feed so the UI
  // can tell the difference between "still loading" and "loaded but empty"
  // (the "No actions for you today" state).
  const hasLoadedRef = useRef<boolean>(false);

  /**
   * Internal fetch routine. Shared by the initial-load effect and the
   * `refresh` callback so we don't need to duplicate the bookkeeping.
   */
  const runFetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await fetchForYouFeed();
      setFeed(next);
      const now = new Date();
      setLastUpdatedAt(now);
      setIsStale(computeIsStale(next, now.getTime()));
      hasLoadedRef.current = true;
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      logger.warn(
        'foryou_fetch_failed',
        { error: wrapped.message },
        'B Features',
      );
      setError(wrapped);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch — runs once on mount. Cancellation-safe.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const next = await fetchForYouFeed();
        if (cancelled) return;
        setFeed(next);
        const now = new Date();
        setLastUpdatedAt(now);
        setIsStale(computeIsStale(next, now.getTime()));
        hasLoadedRef.current = true;
      } catch (err) {
        if (cancelled) return;
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'foryou_initial_fetch_failed',
          { error: wrapped.message },
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
  }, []);

  /**
   * `refresh` — re-fetches the feed. Exposed for the page component to
   * wire up to pull-to-refresh and the retry / refresh button. Never
   * throws — `runFetch` already captures errors into state.
   */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      await runFetch();
    } catch {
      /* runFetch already captures errors into state */
    }
  }, [runFetch]);

  return {
    feed,
    isLoading,
    error,
    refresh,
    lastUpdatedAt,
    isStale,
  };
}

export default useForYouToday;
