/**
 * useDailyCheckin — wires the Daily Check-In backend stub into a
 * component-friendly shape (Phase 3.1 of the REZ-vs-NUQTA migration).
 *
 * Contract
 * --------
 *   - On mount, calls `GET /api/b/checkin/status` once and stashes the
 *     result in local state. Errors are captured into `error` (an
 *     `Error` instance) and `status` is kept stale so the UI can
 *     still offer a "retry" affordance instead of an empty page.
 *   - `claim()` calls `POST /api/b/checkin/claim`. On success it
 *     refreshes the status so the calendar + streak update together.
 *     On failure it throws — callers should wrap in try/catch (the
 *     hook never rejects on its own).
 *   - `refresh()` re-runs the status fetch (used by pull-to-refresh
 *     and the retry button).
 *
 * Usage
 * -----
 *  ```tsx
 *  const { status, isLoading, error, claim, refresh } = useDailyCheckin();
 *  if (isLoading && !status) return <Skeleton />;
 *  if (error && !status) return <ErrorState onRetry={refresh} />;
 *  return <Calendar weekData={status.weekData} />;
 *  ```
 *
 * Defensive notes
 * ---------------
 *   - The backend payload is validated defensively; malformed fields
 *     are coerced into safe defaults so a server bug never crashes the
 *     UI.
 *   - The hook is intentionally *not* backed by a Zustand store — it's
 *     a Phase 3.1 stub and we want to be able to replace the store
 *     backing later without rewriting every consumer.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CheckinDayState = 'claimed' | 'missed' | 'pending' | 'future';

export interface CheckinDay {
  date: string;
  weekday: string;
  dayOfMonth: number;
  state: CheckinDayState;
  coinsEarned: number;
}

export interface CheckinReward {
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;
  label: string;
  isMilestone: boolean;
}

export interface CheckinStatus {
  isClaimedToday: boolean;
  currentStreakDays: number;
  lastClaimDate: string | null;
  weekData: CheckinDay[];
  totalCoinsEarnedThisWeek: number;
  nextMilestoneDays: number;
  nextMilestoneReward: string;
}

export interface CheckinClaimResult {
  reward: CheckinReward;
  isClaimedToday: boolean;
  currentStreakDays: number;
  nextClaimAvailableAt: string;
}

export interface UseDailyCheckinResult {
  status: CheckinStatus | null;
  isLoading: boolean;
  /** True while the claim POST is in flight. */
  isClaiming: boolean;
  error: Error | null;
  claim: () => Promise<CheckinClaimResult | null>;
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_ENDPOINT = '/api/b/checkin/status';
const CLAIM_ENDPOINT = '/api/b/checkin/claim';

const SAFE_DAY_STATES: ReadonlyArray<CheckinDayState> = [
  'claimed',
  'missed',
  'pending',
  'future',
];

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

/** Coerce an unknown value into a finite non-negative integer (0 default). */
function safeNonNegativeInt0(value: unknown): number {
  return safeNonNegativeInt(value, 0);
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function safeStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function safeState(value: unknown): CheckinDayState {
  if (typeof value === 'string') {
    for (const candidate of SAFE_DAY_STATES) {
      if (candidate === value) return candidate;
    }
  }
  return 'pending';
}

function isCheckinDay(value: unknown): value is CheckinDay {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.date === 'string' &&
    typeof v.weekday === 'string' &&
    typeof v.dayOfMonth === 'number' &&
    typeof v.state === 'string' &&
    typeof v.coinsEarned === 'number'
  );
}

function normalizeDay(raw: unknown): CheckinDay {
  const v = (typeof raw === 'object' && raw !== null
    ? raw
    : {}) as Record<string, unknown>;
  return {
    date: safeString(v.date, ''),
    weekday: safeString(v.weekday, ''),
    dayOfMonth: safeNonNegativeInt0(v.dayOfMonth),
    state: safeState(v.state),
    coinsEarned: safeNonNegativeInt0(v.coinsEarned),
  };
}

function normalizeStatus(raw: unknown): CheckinStatus {
  const v = (typeof raw === 'object' && raw !== null
    ? raw
    : {}) as Record<string, unknown>;
  const rawWeek = Array.isArray(v.weekData) ? v.weekData : [];
  const weekData = rawWeek.filter(isCheckinDay).map(normalizeDay);
  return {
    isClaimedToday: v.isClaimedToday === true,
    currentStreakDays: safeNonNegativeInt0(v.currentStreakDays),
    lastClaimDate: safeStringOrNull(v.lastClaimDate),
    weekData,
    totalCoinsEarnedThisWeek: safeNonNegativeInt0(v.totalCoinsEarnedThisWeek),
    nextMilestoneDays: safeNonNegativeInt(v.nextMilestoneDays, 7),
    nextMilestoneReward: safeString(v.nextMilestoneReward, '1-week warrior'),
  };
}

function normalizeReward(raw: unknown): CheckinReward {
  const v = (typeof raw === 'object' && raw !== null
    ? raw
    : {}) as Record<string, unknown>;
  const base = safeNonNegativeInt0(v.baseCoins);
  const bonus = safeNonNegativeInt0(v.bonusCoins);
  const totalRaw = safeNonNegativeInt0(v.totalCoins);
  return {
    baseCoins: base,
    bonusCoins: bonus,
    totalCoins: totalRaw > 0 ? totalRaw : base + bonus,
    label: safeString(v.label, 'Daily reward'),
    isMilestone: v.isMilestone === true,
  };
}

function normalizeClaimResult(raw: unknown): CheckinClaimResult {
  const v = (typeof raw === 'object' && raw !== null
    ? raw
    : {}) as Record<string, unknown>;
  const reward = normalizeReward(v.reward);
  return {
    reward,
    isClaimedToday: v.isClaimedToday === true,
    currentStreakDays: safeNonNegativeInt0(v.currentStreakDays),
    nextClaimAvailableAt: safeString(v.nextClaimAvailableAt, new Date().toISOString()),
  };
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchStatus(): Promise<CheckinStatus> {
  const response = await apiClient.get<CheckinStatus>(STATUS_ENDPOINT, undefined, {
    timeout: 8000,
  });
  if (!response.success || response.data === undefined) {
    const message =
      typeof response.error === 'string'
        ? response.error
        : 'Failed to load check-in status';
    throw new Error(message);
  }
  return normalizeStatus(response.data);
}

async function postClaim(): Promise<CheckinClaimResult> {
  const response = await apiClient.post<CheckinClaimResult>(CLAIM_ENDPOINT, undefined, {
    deduplicate: false,
  });
  if (!response.success || response.data === undefined) {
    const message =
      typeof response.error === 'string'
        ? response.error
        : 'Failed to claim daily reward';
    throw new Error(message);
  }
  return normalizeClaimResult(response.data);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDailyCheckin(): UseDailyCheckinResult {
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Track whether we've ever populated so the UI can tell apart
  // "still loading" from "loaded but empty".
  const hasLoadedRef = useRef<boolean>(false);

  /**
   * Run the status fetch. Sets loading + error state on its own; never
   * throws (the returned promise resolves either way so callers can
   * `await` it from refresh handlers without try/catch).
   */
  const runStatusFetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await fetchStatus();
      setStatus(next);
      hasLoadedRef.current = true;
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      logger.warn(
        'checkin_status_fetch_failed',
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
        const next = await fetchStatus();
        if (cancelled) return;
        setStatus(next);
        hasLoadedRef.current = true;
      } catch (err) {
        if (cancelled) return;
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'checkin_initial_fetch_failed',
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
    await runStatusFetch();
  }, [runStatusFetch]);

  /**
   * Claim today's reward. On success the hook refreshes the status
   * internally so the UI sees the new streak + claimed flag together.
   * Returns the claim result on success, or `null` on failure.
   */
  const claim = useCallback(async (): Promise<CheckinClaimResult | null> => {
    if (status?.isClaimedToday === true) {
      // Already claimed — short-circuit without a round-trip.
      return null;
    }
    setIsClaiming(true);
    setError(null);
    try {
      const result = await postClaim();
      // Refresh in the background; the modal can already show `result`.
      runStatusFetch().catch(() => {
        /* runStatusFetch already captures errors */
      });
      return result;
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      logger.warn(
        'checkin_claim_failed',
        { error: wrapped.message },
        'B Features',
      );
      setError(wrapped);
      return null;
    } finally {
      setIsClaiming(false);
    }
  }, [status, runStatusFetch]);

  // Reference `hasLoadedRef` so future additions (e.g. a refetch
  // condition) don't trigger an unused-var warning under strict TS.
  void hasLoadedRef;

  return { status, isLoading, isClaiming, error, claim, refresh };
}

export default useDailyCheckin;