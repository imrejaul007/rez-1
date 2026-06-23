/**
 * useTravelSearch — wires the travel search endpoint into a component.
 *
 * Wraps `POST /api/b/travel/search` and exposes a stable result set
 * plus AsyncStorage-backed recent searches. The hook does no
 * formatting — it returns paise integers throughout and lets the
 * UI divide by 100.
 *
 * Behaviour
 * ---------
 *  - `search(query)` issues a POST request and updates `results` on
 *    success. Errors are surfaced through `error` so the page can
 *    render its retry button.
 *  - On a successful search, the query is persisted into
 *    `AsyncStorage[b_travel_recent_searches_v1]` (most-recent first,
 *    capped at `TRAVEL_RECENT_SEARCHES_CAP`).
 *  - `recentSearches` is hydrated lazily from AsyncStorage on mount.
 *  - `clearRecent()` empties both in-memory state and storage.
 *  - `refresh()` re-runs the most recent successful query — used by
 *    pull-to-refresh on the page.
 *  - The hook never throws out of `search()` / `refresh()`; all
 *    errors are captured into state.
 *
 * Usage
 * -----
 *  ```tsx
 *  const { results, isLoading, error, search, recentSearches,
 *          clearRecent } = useTravelSearch();
 *  ```
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import {
  TRAVEL_RECENT_SEARCHES_CAP,
  TRAVEL_STORAGE_KEYS,
  isTravelSearchQuery,
  normalizeRecentSearches,
  normalizeTravelResults,
  type TravelResult,
  type TravelSearchQuery,
} from '@/types/travel.types';

/** Endpoint exposed by `src/routes/b/travel.ts`. */
const TRAVEL_SEARCH_ENDPOINT = '/api/b/travel/search';

/** Full payload shape returned by the search endpoint. */
interface TravelSearchResponse {
  results: TravelResult[];
  query: TravelSearchQuery;
}

export interface UseTravelSearchResult {
  results: TravelResult[];
  isLoading: boolean;
  error: Error | null;
  /** Run a new search. Clears prior error on entry. */
  search: (query: TravelSearchQuery) => Promise<void>;
  /** Persisted recent searches, most-recent first. */
  recentSearches: TravelSearchQuery[];
  /** Wipe both in-memory and persisted recent searches. */
  clearRecent: () => Promise<void>;
  /** Re-run the most recent successful query. No-op if none. */
  refresh: () => Promise<void>;
}

/**
 * Type-guard for the search response envelope.
 */
function isSearchResponse(value: unknown): value is TravelSearchResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v['results']) && isTravelSearchQuery(v['query']);
}

/**
 * Read the persisted recent searches list. Falls back to an empty
 * array on any storage / parse failure.
 */
async function loadRecentFromStorage(): Promise<TravelSearchQuery[]> {
  try {
    const raw = await AsyncStorage.getItem(TRAVEL_STORAGE_KEYS.RECENT_SEARCHES);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return normalizeRecentSearches(parsed);
  } catch (err) {
    logger.warn(
      'travel_recent_load_failed',
      { error: err instanceof Error ? err.message : String(err) },
      'B Features',
    );
    return [];
  }
}

/**
 * Persist the recent-searches list, trimming to the cap.
 */
async function saveRecentToStorage(list: ReadonlyArray<TravelSearchQuery>): Promise<void> {
  try {
    await AsyncStorage.setItem(
      TRAVEL_STORAGE_KEYS.RECENT_SEARCHES,
      JSON.stringify(list.slice(0, TRAVEL_RECENT_SEARCHES_CAP)),
    );
  } catch (err) {
    logger.warn(
      'travel_recent_save_failed',
      { error: err instanceof Error ? err.message : String(err) },
      'B Features',
    );
  }
}

/**
 * Build a dedup key for a search query — used by `addRecent`.
 */
function buildDedupKey(query: TravelSearchQuery): string {
  const from = query.from.trim().toLowerCase();
  const to = query.to.trim().toLowerCase();
  return `${query.category}|${from}|${to}|${query.departDate}|${query.returnDate ?? ''}`;
}

/**
 * Push a successful search onto the recent list (deduped, capped).
 */
function addRecent(
  list: ReadonlyArray<TravelSearchQuery>,
  query: TravelSearchQuery,
): TravelSearchQuery[] {
  const key = buildDedupKey(query);
  const filtered = list.filter((existing) => buildDedupKey(existing) !== key);
  return [query, ...filtered].slice(0, TRAVEL_RECENT_SEARCHES_CAP);
}

/**
 * `useTravelSearch` — manage the search-result list and the
 * persisted recent-search list. See module-level JSDoc for the
 * full contract.
 */
export function useTravelSearch(): UseTravelSearchResult {
  const [results, setResults] = useState<TravelResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [recentSearches, setRecentSearches] = useState<TravelSearchQuery[]>([]);

  /** Track the most-recent successful query so `refresh()` can re-run it. */
  const lastQueryRef = useRef<TravelSearchQuery | null>(null);
  /** Track whether the initial AsyncStorage hydration has completed. */
  const hasHydratedRef = useRef<boolean>(false);

  /**
   * Issue the search POST and normalise the response. Captures any
   * error into state instead of throwing.
   */
  const runSearch = useCallback(
    async (query: TravelSearchQuery): Promise<TravelResult[]> => {
      const response = await apiClient.post<TravelSearchResponse>(
        TRAVEL_SEARCH_ENDPOINT,
        query,
        { deduplicate: false },
      );
      if (!response.success || response.data === undefined) {
        const message =
          typeof response.error === 'string'
            ? response.error
            : 'Travel search failed';
        throw new Error(message);
      }
      if (!isSearchResponse(response.data)) {
        throw new Error('Travel search returned an unexpected payload');
      }
      return normalizeTravelResults(response.data.results);
    },
    [],
  );

  /**
   * Public `search` entry-point. Updates state, persists the query
   * to the recent list, and never throws.
   */
  const search = useCallback(
    async (query: TravelSearchQuery): Promise<void> => {
      if (!isTravelSearchQuery(query)) {
        setError(new Error('Invalid travel search query'));
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const next = await runSearch(query);
        setResults(next);
        lastQueryRef.current = query;
        const updated = addRecent(recentSearches, query);
        setRecentSearches(updated);
        // Fire-and-forget persistence — failures are logged inside.
        void saveRecentToStorage(updated);
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'travel_search_failed',
          {
            error: wrapped.message,
            category: query.category,
            from: query.from,
            to: query.to,
          },
          'B Features',
        );
        setError(wrapped);
      } finally {
        setIsLoading(false);
      }
    },
    [runSearch, recentSearches],
  );

  /**
   * Re-run the most-recent successful query. Falls back to a no-op
   * if no query has been issued yet.
   */
  const refresh = useCallback(async (): Promise<void> => {
    const last = lastQueryRef.current;
    if (last === null) return;
    await search(last);
  }, [search]);

  /**
   * Wipe both in-memory and persisted recent searches.
   */
  const clearRecent = useCallback(async (): Promise<void> => {
    setRecentSearches([]);
    try {
      await AsyncStorage.removeItem(TRAVEL_STORAGE_KEYS.RECENT_SEARCHES);
    } catch (err) {
      logger.warn(
        'travel_recent_clear_failed',
        { error: err instanceof Error ? err.message : String(err) },
        'B Features',
      );
    }
  }, []);

  // Hydrate the recent-search list from AsyncStorage on mount.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      const loaded = await loadRecentFromStorage();
      if (cancelled) return;
      setRecentSearches(loaded);
      hasHydratedRef.current = true;
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    recentSearches,
    clearRecent,
    refresh,
  };
}

export default useTravelSearch;