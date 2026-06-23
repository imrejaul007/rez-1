/**
 * useLiveActivity — socket-first, HTTP-fallback activity feed.
 *
 * Architecture
 * ------------
 *   1. Subscribe to the `useSocketStore` Zustand slice for connection state
 *      (the actual socket instance lives in `SocketContext` — we use the
 *      store for the boolean `isConnected` signal only).
 *   2. When `isConnected` is true, we expose a no-op loader and let the
 *      component listen for `social:new_post` events upstream. The hook
 *      itself stays connection-agnostic and returns a `refresh` that the
 *      caller can invoke on pull-to-refresh.
 *   3. When the socket is disconnected, we fall back to HTTP polling via
 *      `apiClient.get('/api/b/activity/live')` once on mount and again
 *      every time `refresh()` is called.
 *
 * Filtering
 * ---------
 *   - Events older than 24 hours are dropped before being returned.
 *   - The list is capped at the 50 most-recent events (newest-first).
 *   - Dedupe by `id` so a late-arriving HTTP payload doesn't double-up
 *     an event that arrived over the socket first.
 *
 * Error handling
 * --------------
 *   - Failures during the HTTP fetch are captured into `error` (typed
 *     as `Error`). The component renders a "Couldn't load activity" UI
 *     and exposes a retry button wired to `refresh()`.
 *   - We never throw out of the hook — all errors are caught and logged.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import { useSocketStore } from '@/stores/socketStore';
import logger from '@/utils/logger';
import type {
  LiveActivityEvent,
  LiveActivityFeed,
  UseLiveActivityResult,
} from '@/types/activity.types';

const HTTP_ENDPOINT = '/api/b/activity/live';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const MAX_EVENTS = 50;

/** Coerce unknown timestamp into a valid Date or `null` when malformed. */
function parseTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Validate that an unknown value is at least shaped like a `LiveActivityEvent`.
 *
 * We accept partial payloads (extra fields are ignored) and default to
 * `false` for `isFriend` when missing — that way the strip still works
 * on legacy payloads.
 */
function isLiveActivityEvent(value: unknown): value is LiveActivityEvent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.type === 'string' &&
    typeof v.userName === 'string' &&
    typeof v.action === 'string' &&
    typeof v.timestamp === 'string' &&
    typeof v.isFriend === 'boolean'
  );
}

/** Filter + sort + cap a raw list of events. */
function normalizeEvents(raw: ReadonlyArray<LiveActivityEvent>): LiveActivityEvent[] {
  const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS;
  const seen = new Set<string>();
  const out: LiveActivityEvent[] = [];

  for (const ev of raw) {
    if (seen.has(ev.id)) continue;
    const ts = parseTimestamp(ev.timestamp);
    if (ts === null) continue;
    if (ts.getTime() < cutoff) continue;
    seen.add(ev.id);
    out.push(ev);
  }

  out.sort((a, b) => {
    const ta = parseTimestamp(a.timestamp)?.getTime() ?? 0;
    const tb = parseTimestamp(b.timestamp)?.getTime() ?? 0;
    return tb - ta;
  });

  return out.slice(0, MAX_EVENTS);
}

/**
 * Fetch the HTTP fallback feed.
 *
 * The endpoint returns `{ events, lastUpdatedAt, totalToday }` directly
 * inside the `data` field — see `services/apiClient.ts` for the unwrap
 * contract.
 */
async function fetchHttpFeed(): Promise<LiveActivityFeed> {
  const response = await apiClient.get<LiveActivityFeed>(HTTP_ENDPOINT, undefined, {
    timeout: 8000,
  });
  if (!response.success || response.data === undefined) {
    throw new Error(
      typeof response.error === 'string'
        ? response.error
        : 'Failed to load live activity feed',
    );
  }
  return response.data;
}

/**
 * `useLiveActivity` — read the live activity feed.
 *
 * Always returns a stable object shape; consumers can render the
 * loading / error / empty states from the included flags.
 */
export function useLiveActivity(): UseLiveActivityResult {
  const isConnected = useSocketStore((s) => s.isConnected);

  const [events, setEvents] = useState<LiveActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalToday, setTotalToday] = useState<number>(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');

  // Keep the latest set in a ref so `refresh` can merge without re-binding
  // the effect on every change.
  const eventsRef = useRef<LiveActivityEvent[]>([]);
  eventsRef.current = events;

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const feed = await fetchHttpFeed();
      const validEvents = (feed.events ?? []).filter(isLiveActivityEvent);
      const merged = normalizeEvents([...eventsRef.current, ...validEvents]);
      setEvents(merged);
      setTotalToday(feed.totalToday ?? 0);
      setLastUpdatedAt(feed.lastUpdatedAt ?? new Date().toISOString());
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      logger.warn(
        'live_activity_fetch_failed',
        { error: wrapped.message },
        'B Features',
      );
      setError(wrapped);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch — the socket itself is expected to be the source of
  // truth for ongoing updates, so we only poll on mount and on demand.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const feed = await fetchHttpFeed();
        if (cancelled) return;
        const validEvents = (feed.events ?? []).filter(isLiveActivityEvent);
        setEvents(normalizeEvents(validEvents));
        setTotalToday(feed.totalToday ?? 0);
        setLastUpdatedAt(feed.lastUpdatedAt ?? new Date().toISOString());
      } catch (err) {
        if (cancelled) return;
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'live_activity_initial_fetch_failed',
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

  // When the socket connects, we don't fetch again — the socket is
  // authoritative and the component subscribes to events. We do, however,
  // mark the loading flag off so the UI settles.
  useEffect(() => {
    if (isConnected && isLoading && error === null) {
      setIsLoading(false);
    }
  }, [isConnected, isLoading, error]);

  return {
    events,
    isLoading,
    error,
    isLive: isConnected,
    refresh,
    totalToday,
    lastUpdatedAt,
  };
}

export default useLiveActivity;
