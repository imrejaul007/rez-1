/**
 * useKarmaProfile — wires the Karma profile endpoint into a
 * component-friendly shape (Phase 4.2 of the REZ-vs-NUQTA migration).
 *
 * Contract
 * --------
 *   - On mount, calls `GET /api/b/karma/profile` once and stashes the
 *     result in local state. Errors are captured into `error` (an
 *     `Error` instance) and `profile` is kept `null` so the UI can
 *     still offer a "retry" affordance instead of an empty page.
 *   - `refresh()` re-runs the fetch (used by pull-to-refresh and the
 *     retry button on the error state).
 *
 * Usage
 * -----
 *  ```tsx
 *  const { profile, isLoading, error, refresh } = useKarmaProfile();
 *  if (isLoading && !profile) return <Skeleton />;
 *  if (error && !profile) return <ErrorState onRetry={refresh} />;
 *  return <KarmaProfileCard profile={profile} />;
 *  ```
 *
 * Defensive notes
 * ---------------
 *   - The backend payload is validated defensively; malformed fields
 *     are coerced into safe defaults so a server bug never crashes the
 *     UI.
 *   - `currentLevel` is verified against the closed `KarmaLevel` union;
 *     unknown values fall back to `'L1'` (the lowest rung) so the UI
 *     can always render a meaningful badge.
 *   - `trustScore` is clamped to [0, 100].
 *   - The hook is intentionally *not* backed by a Zustand store — it's
 *     a Phase 4.2 stub and we want to be able to swap the backing store
 *     later without rewriting every consumer.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import type { KarmaLevel, KarmaProfile } from '@/types/karma.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROFILE_ENDPOINT = '/api/b/karma/profile';

const SAFE_LEVELS: ReadonlyArray<KarmaLevel> = ['L1', 'L2', 'L3', 'L4'];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UseKarmaProfileResult {
  profile: KarmaProfile | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Defensive normalisers
// ---------------------------------------------------------------------------

/** Coerce an unknown value into a finite non-negative integer. */
function safeNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return Math.floor(value);
}

function safeNonNegativeInt0(value: unknown): number {
  return safeNonNegativeInt(value, 0);
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function safeLevel(value: unknown): KarmaLevel {
  if (typeof value === 'string') {
    for (const candidate of SAFE_LEVELS) {
      if (candidate === value) return candidate;
    }
  }
  return 'L1';
}

function clampTrustScore(value: unknown): number {
  const n = safeNonNegativeInt0(value);
  if (n > 100) return 100;
  return n;
}

function safeBadges(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.length > 0) {
      out.push(item);
    }
  }
  return out;
}

/**
 * Normalise an arbitrary payload into a `KarmaProfile`. Never throws —
 * any malformed field is replaced with a safe default.
 */
function normalizeProfile(raw: unknown): KarmaProfile {
  const v = (typeof raw === 'object' && raw !== null
    ? raw
    : {}) as Record<string, unknown>;
  return {
    userId: safeString(v.userId, 'me'),
    totalKarma: safeNonNegativeInt0(v.totalKarma),
    currentLevel: safeLevel(v.currentLevel),
    trustScore: clampTrustScore(v.trustScore),
    badgesEarned: safeBadges(v.badgesEarned),
    joinedAt: safeString(v.joinedAt, new Date().toISOString()),
  };
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchProfile(): Promise<KarmaProfile> {
  const response = await apiClient.get<KarmaProfile>(PROFILE_ENDPOINT, undefined, {
    timeout: 8000,
  });
  if (!response.success || response.data === undefined) {
    const message =
      typeof response.error === 'string'
        ? response.error
        : 'Failed to load karma profile';
    throw new Error(message);
  }
  return normalizeProfile(response.data);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the current user's karma profile. Refresh on demand via the
 * returned `refresh()` function (used by pull-to-refresh, retry, and the
 * screen-level focus effect).
 */
export function useKarmaProfile(): UseKarmaProfileResult {
  const [profile, setProfile] = useState<KarmaProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Track whether we've ever populated so the UI can tell apart
  // "still loading" from "loaded but empty".
  const hasLoadedRef = useRef<boolean>(false);

  /**
   * Run the profile fetch. Sets loading + error state on its own;
   * never throws (the returned promise resolves either way so callers
   * can `await` it from refresh handlers without try/catch).
   */
  const runFetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await fetchProfile();
      setProfile(next);
      hasLoadedRef.current = true;
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      logger.warn(
        'karma_profile_fetch_failed',
        { error: wrapped.message },
        'B Features',
      );
      setError(wrapped);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount. Cancellation flag avoids the "set state on
  // unmounted component" warning when the screen is torn down mid-fetch.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const next = await fetchProfile();
        if (cancelled) return;
        setProfile(next);
        hasLoadedRef.current = true;
      } catch (err) {
        if (cancelled) return;
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'karma_profile_initial_fetch_failed',
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

  // Reference `hasLoadedRef` so future additions (e.g. a refetch
  // condition) don't trigger an unused-var warning under strict TS.
  void hasLoadedRef;

  return { profile, isLoading, error, refresh };
}

export default useKarmaProfile;
