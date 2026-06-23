/**
 * useKhata — fetches the user's merchant-credit / tab ledger.
 *
 * Wraps `GET /api/b/khata` and exposes a component-friendly shape. The
 * returned values are paise integers throughout — the UI is responsible
 * for dividing by 100 and formatting the rupee string. This keeps the
 * hook layer free of formatting choices.
 *
 * Behaviour
 * ---------
 *  - On mount, kicks off a single HTTP fetch.
 *  - While in flight, `isLoading` is `true` and `error` is `null`.
 *  - On failure, the `Error` is captured into `error` and the previous
 *    data (if any) is kept so the UI can still show stale data with a
 *    retry button. A `khata_fetch_failed` warn is logged.
 *  - `refresh()` re-runs the fetch — wired up to pull-to-refresh in the
 *    page component.
 *  - The hook never throws out of `refresh()`; all errors are caught and
 *    surfaced through state.
 *
 * Usage
 * -----
 *  ```tsx
 *  const { entries, totalOwedPaise, totalOwedToYouPaise,
 *          netBalancePaise, isLoading, error, refresh } = useKhata();
 *  ```
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';

/** Endpoints exposed by `src/routes/b/khata.ts` in the B-side backend. */
const KHATA_ENDPOINT = '/api/b/khata';

/**
 * One row of the ledger — a single merchant with whom the user has a
 * non-zero balance. Mirrors the backend `KhataEntry` interface.
 */
export interface KhataEntry {
  merchantId: string;
  merchantName: string;
  /** Negative → user owes the merchant; positive → merchant owes the user. */
  balancePaise: number;
  /** ISO-8601 timestamp of the most recent transaction. */
  lastTransactionAt: string;
  /** How many ledger transactions the user has with this merchant. */
  transactionCount: number;
  /** Small visual category — used by the UI to pick an emoji / icon. */
  category: string;
}

/** Full summary shape returned by `GET /api/b/khata`. */
export interface KhataSummary {
  entries: KhataEntry[];
  totalOwedPaise: number;
  totalOwedToYouPaise: number;
  netBalancePaise: number;
}

export interface UseKhataResult {
  entries: KhataEntry[];
  totalOwedPaise: number;
  totalOwedToYouPaise: number;
  netBalancePaise: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Type-guard that an unknown value is at least shaped like a `KhataEntry`.
 * Extra fields are allowed and ignored; required fields are validated
 * defensively so a malformed backend payload can't crash the UI.
 */
function isKhataEntry(value: unknown): value is KhataEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.merchantId === 'string' &&
    typeof v.merchantName === 'string' &&
    typeof v.balancePaise === 'number' &&
    Number.isFinite(v.balancePaise) &&
    typeof v.lastTransactionAt === 'string' &&
    typeof v.transactionCount === 'number' &&
    Number.isFinite(v.transactionCount) &&
    typeof v.category === 'string'
  );
}

/** Filter to a clean, deduped list of valid entries. */
function normalizeEntries(raw: ReadonlyArray<unknown>): KhataEntry[] {
  const seen = new Set<string>();
  const out: KhataEntry[] = [];
  for (const value of raw) {
    if (!isKhataEntry(value)) continue;
    if (seen.has(value.merchantId)) continue;
    seen.add(value.merchantId);
    out.push(value);
  }
  return out;
}

/**
 * Fetch the raw summary payload from the B-side backend.
 *
 * The endpoint returns the summary directly inside `data` — see
 * `services/apiClient.ts` for the unwrap contract.
 */
async function fetchKhataSummary(): Promise<KhataSummary> {
  const response = await apiClient.get<KhataSummary>(KHATA_ENDPOINT, undefined, {
    timeout: 8000,
  });
  if (!response.success || response.data === undefined) {
    const message = typeof response.error === 'string'
      ? response.error
      : 'Failed to load khata ledger';
    throw new Error(message);
  }
  return response.data;
}

/**
 * `useKhata` — read the user's merchant-credit / tab ledger.
 *
 * Returns a stable object shape. Consumers render the loading / error /
 * empty states from the included flags.
 */
export function useKhata(): UseKhataResult {
  const [entries, setEntries] = useState<KhataEntry[]>([]);
  const [totalOwedPaise, setTotalOwedPaise] = useState<number>(0);
  const [totalOwedToYouPaise, setTotalOwedToYouPaise] = useState<number>(0);
  const [netBalancePaise, setNetBalancePaise] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Track whether we have ever populated the entries list so the UI
  // can tell the difference between "still loading" and "loaded but
  // empty" (the "All settled up!" state).
  const hasLoadedRef = useRef<boolean>(false);

  /**
   * Internal fetch routine. Accepts a `force` flag so initial load and
   * pull-to-refresh share the same code path without double-invoking.
   */
  const runFetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await fetchKhataSummary();
      const cleanEntries = normalizeEntries(summary.entries ?? []);
      setEntries(cleanEntries);
      setTotalOwedPaise(
        typeof summary.totalOwedPaise === 'number' ? summary.totalOwedPaise : 0,
      );
      setTotalOwedToYouPaise(
        typeof summary.totalOwedToYouPaise === 'number'
          ? summary.totalOwedToYouPaise
          : 0,
      );
      setNetBalancePaise(
        typeof summary.netBalancePaise === 'number' ? summary.netBalancePaise : 0,
      );
      hasLoadedRef.current = true;
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      logger.warn('khata_fetch_failed', { error: wrapped.message }, 'B Features');
      setError(wrapped);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch — runs once on mount.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const summary = await fetchKhataSummary();
        if (cancelled) return;
        const cleanEntries = normalizeEntries(summary.entries ?? []);
        setEntries(cleanEntries);
        setTotalOwedPaise(
          typeof summary.totalOwedPaise === 'number'
            ? summary.totalOwedPaise
            : 0,
        );
        setTotalOwedToYouPaise(
          typeof summary.totalOwedToYouPaise === 'number'
            ? summary.totalOwedToYouPaise
            : 0,
        );
        setNetBalancePaise(
          typeof summary.netBalancePaise === 'number'
            ? summary.netBalancePaise
            : 0,
        );
        hasLoadedRef.current = true;
      } catch (err) {
        if (cancelled) return;
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'khata_initial_fetch_failed',
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
   * `refresh` — re-fetches the ledger. Exposed for the page component to
   * wire up to pull-to-refresh and the retry button. Never throws.
   */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      await runFetch();
    } catch {
      /* runFetch already captures errors into state */
    }
  }, [runFetch]);

  return {
    entries,
    totalOwedPaise,
    totalOwedToYouPaise,
    netBalancePaise,
    isLoading,
    error,
    refresh,
  };
}

export default useKhata;
