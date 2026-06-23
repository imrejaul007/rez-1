/**
 * useKarmaMissions — wires the Karma mission endpoints into a
 * component-friendly shape (Phase 4.2 of the REZ-vs-NUQTA migration).
 *
 * Contract
 * --------
 *   - On mount, calls `GET /api/b/karma/missions` once and stashes the
 *     result in local state. Errors are captured into `error` (an
 *     `Error` instance); `missions` stays as the last good array.
 *   - `complete(id)` calls `POST /api/b/karma/missions/:id/complete`.
 *     On success the returned mission is merged back into local state
 *     so the card flips to the "completed" visual without a full
 *     refresh. The delta returned by the backend is also surfaced so
 *     the page can render a celebratory toast.
 *   - `refresh()` re-runs the missions fetch (used by pull-to-refresh).
 *
 * Usage
 * -----
 *  ```tsx
 *  const { missions, isLoading, error, complete, isCompleting, refresh } =
 *    useKarmaMissions();
 *  if (isLoading && missions.length === 0) return <Skeleton />;
 *  if (error && missions.length === 0) return <ErrorState onRetry={refresh} />;
 *  return missions.map((m) => (
 *    <KarmaMissionCard
 *      key={m.id}
 *      mission={m}
 *      onComplete={(id) => complete(id)}
 *    />
 *  ));
 *  ```
 *
 * Defensive notes
 * ---------------
 *   - The backend payload is validated defensively; malformed fields
 *     are coerced into safe defaults so a server bug never crashes the
 *     UI.
 *   - `category` is verified against the closed `KarmaMissionCategory`
 *     union; unknown values fall back to `'community'`.
 *   - The hook never rejects on its own — `complete()` returns the
 *     karma delta on success or `null` on failure so callers don't need
 *     a try/catch.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import type {
  KarmaMission,
  KarmaMissionCategory,
} from '@/types/karma.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MISSIONS_ENDPOINT = '/api/b/karma/missions';

const SAFE_CATEGORIES: ReadonlyArray<KarmaMissionCategory> = [
  'environment',
  'community',
  'health',
  'education',
];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Result of a single `POST /complete` call. The delta is the karma
 * awarded for this mission; for the mock backend it equals
 * `mission.karmaReward`, but real implementations may apply bonuses.
 */
export interface KarmaMissionCompleteResult {
  /** The mission as it now exists on the server (with `isCompleted: true`). */
  mission: KarmaMission;
  /** Karma points added to the user's profile as a result of this completion. */
  karmaDelta: number;
}

export interface UseKarmaMissionsResult {
  missions: KarmaMission[];
  isLoading: boolean;
  /** True while a `POST /complete` is in flight. */
  isCompleting: boolean;
  error: Error | null;
  complete: (id: string) => Promise<KarmaMissionCompleteResult | null>;
  refresh: () => Promise<void>;
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

function safePct(value: unknown): number {
  const n = safeNonNegativeInt0(value);
  if (n > 100) return 100;
  return n;
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function safeCategory(value: unknown): KarmaMissionCategory {
  if (typeof value === 'string') {
    for (const candidate of SAFE_CATEGORIES) {
      if (candidate === value) return candidate;
    }
  }
  return 'community';
}

function isMission(value: unknown): value is KarmaMission {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.description === 'string' &&
    typeof v.category === 'string' &&
    typeof v.karmaReward === 'number' &&
    typeof v.expiresAt === 'string' &&
    typeof v.isCompleted === 'boolean' &&
    typeof v.progressPct === 'number'
  );
}

function normalizeMission(raw: unknown): KarmaMission {
  const v = (typeof raw === 'object' && raw !== null
    ? raw
    : {}) as Record<string, unknown>;
  return {
    id: safeString(v.id, ''),
    title: safeString(v.title, 'Untitled mission'),
    description: safeString(v.description, ''),
    category: safeCategory(v.category),
    karmaReward: safeNonNegativeInt0(v.karmaReward),
    expiresAt: safeString(v.expiresAt, new Date().toISOString()),
    isCompleted: v.isCompleted === true,
    progressPct: safePct(v.progressPct),
  };
}

function normalizeMissions(raw: unknown): KarmaMission[] {
  if (!Array.isArray(raw)) return [];
  const out: KarmaMission[] = [];
  for (const item of raw) {
    if (isMission(item)) {
      out.push(normalizeMission(item));
    } else {
      // Be lenient: try to normalise even partially-typed objects so
      // a backend hiccup doesn't blank the entire list.
      const normalised = normalizeMission(item);
      if (normalised.id.length > 0) {
        out.push(normalised);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchMissions(): Promise<KarmaMission[]> {
  const response = await apiClient.get<KarmaMission[]>(MISSIONS_ENDPOINT, undefined, {
    timeout: 8000,
  });
  if (!response.success || response.data === undefined) {
    const message =
      typeof response.error === 'string'
        ? response.error
        : 'Failed to load missions';
    throw new Error(message);
  }
  return normalizeMissions(response.data);
}

async function postComplete(
  id: string,
): Promise<KarmaMissionCompleteResult> {
  const endpoint = `${MISSIONS_ENDPOINT}/${encodeURIComponent(id)}/complete`;
  const response = await apiClient.post<{
    mission: KarmaMission;
    karmaDelta: number;
  }>(endpoint, undefined, { deduplicate: false });
  if (!response.success || response.data === undefined) {
    const message =
      typeof response.error === 'string'
        ? response.error
        : 'Failed to complete mission';
    throw new Error(message);
  }
  const raw = response.data as { mission: unknown; karmaDelta?: unknown };
  return {
    mission: normalizeMission(raw.mission),
    karmaDelta: safeNonNegativeInt0(raw.karmaDelta),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the active missions list + a `complete()` action.
 */
export function useKarmaMissions(): UseKarmaMissionsResult {
  const [missions, setMissions] = useState<KarmaMission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Track whether we've ever populated so the UI can tell apart
  // "still loading" from "loaded but empty".
  const hasLoadedRef = useRef<boolean>(false);

  const runFetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await fetchMissions();
      setMissions(next);
      hasLoadedRef.current = true;
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      logger.warn(
        'karma_missions_fetch_failed',
        { error: wrapped.message },
        'B Features',
      );
      setError(wrapped);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const next = await fetchMissions();
        if (cancelled) return;
        setMissions(next);
        hasLoadedRef.current = true;
      } catch (err) {
        if (cancelled) return;
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'karma_missions_initial_fetch_failed',
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

  const refresh = useCallback(async (): Promise<void> => {
    await runFetch();
  }, [runFetch]);

  /**
   * Mark a mission as complete. Returns the karma delta on success, or
   * `null` on failure (errors are surfaced via the `error` state).
   */
  const complete = useCallback(
    async (id: string): Promise<KarmaMissionCompleteResult | null> => {
      if (id.length === 0) return null;
      // Guard against double-clicks: short-circuit if already complete.
      const existing = missions.find((m) => m.id === id);
      if (existing !== undefined && existing.isCompleted) {
        return null;
      }
      setIsCompleting(true);
      setError(null);
      try {
        const result = await postComplete(id);
        // Merge the server-acknowledged mission back into local state.
        setMissions((prev) =>
          prev.map((m) => (m.id === result.mission.id ? result.mission : m)),
        );
        logger.info(
          'karma_mission_completed',
          {
            missionId: result.mission.id,
            karmaDelta: result.karmaDelta,
          },
          'B Features',
        );
        return result;
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'karma_mission_complete_failed',
          { missionId: id, error: wrapped.message },
          'B Features',
        );
        setError(wrapped);
        return null;
      } finally {
        setIsCompleting(false);
      }
    },
    [missions],
  );

  // Reference `hasLoadedRef` so future additions (e.g. a refetch
  // condition) don't trigger an unused-var warning under strict TS.
  void hasLoadedRef;

  return { missions, isLoading, isCompleting, error, complete, refresh };
}

export default useKarmaMissions;
