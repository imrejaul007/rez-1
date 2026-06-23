/**
 * useTryBooking — book / cancel trial products, fetch booking history.
 *
 * Phase 4.3 of the REZ-vs-NUQTA migration. Wires three B-side endpoints:
 *
 *   - `POST /api/b/try/products/:id/book`        — start a trial.
 *   - `POST /api/b/try/bookings/:id/cancel`      — cancel an active trial.
 *   - `GET  /api/b/try/bookings`                 — list the user's
 *     past + active bookings (most-recent first).
 *
 * Booking flow
 * ------------
 *  - `book(productId)` calls the backend, on success appends the new
 *    booking to `history` (so the "My trials" tab updates immediately)
 *    and returns the booking. On failure it throws — callers should
 *    wrap in try/catch and surface a toast.
 *  - `cancel(bookingId)` calls the backend, on success mutates the
 *    matching entry in `history` so the UI re-renders as cancelled.
 *  - `getHistory()` re-fetches the full booking list. Wired to pull-
 *    to-refresh on the "My trials" tab.
 *
 * Usage
 * -----
 *  ```tsx
 *  const { book, cancel, getHistory, history, isBooking, isCancelling, error } =
 *    useTryBooking();
 *  await book('trial-lakme-skingloss');
 *  ```
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import {
  type TrialBooking,
  normalizeTrialBookings,
} from '@/types/try.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOOK_ENDPOINT_BASE = '/api/b/try/products';
const CANCEL_ENDPOINT_BASE = '/api/b/try/bookings';
const HISTORY_ENDPOINT = '/api/b/try/bookings';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UseTryBookingResult {
  /** Most-recent-first list of the user's bookings. */
  history: TrialBooking[];
  /** `true` while the initial history GET is in flight. */
  isLoading: boolean;
  /** `true` while a book / cancel mutation is in flight. */
  isBooking: boolean;
  /** `true` while a history GET is in flight (refreshing). */
  isRefreshing: boolean;
  /** Last error message, or `null`. */
  error: string | null;
  /**
   * Book a trial. Throws on failure; the caller is expected to surface
   * a toast. On success, the new booking is prepended to `history`.
   */
  book: (productId: string) => Promise<TrialBooking>;
  /**
   * Cancel an active booking. Throws on failure. On success, the
   * matching entry in `history` is updated to `cancelled`.
   */
  cancel: (bookingId: string) => Promise<TrialBooking>;
  /** Re-fetch the booking history. */
  getHistory: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

interface HistoryResponse {
  bookings: TrialBooking[];
}

async function fetchHistory(): Promise<TrialBooking[]> {
  const response = await apiClient.get<HistoryResponse>(
    HISTORY_ENDPOINT,
    undefined,
    { timeout: 8000 },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to load trial history',
    );
    throw new Error(message);
  }
  return normalizeTrialBookings(response.data.bookings);
}

async function postBook(productId: string): Promise<TrialBooking> {
  const endpoint = `${BOOK_ENDPOINT_BASE}/${encodeURIComponent(productId)}/book`;
  const response = await apiClient.post<{ booking: TrialBooking }>(
    endpoint,
    undefined,
    { deduplicate: false },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to book trial',
    );
    throw new Error(message);
  }
  // The endpoint returns `{ booking }` per the contract; defensively
  // accept a flat `{ ...booking }` shape too in case the backend
  // implementation differs.
  const raw = (response.data as { booking?: TrialBooking }).booking ??
    (response.data as unknown as TrialBooking);
  const list = normalizeTrialBookings([raw]);
  if (list.length === 0) {
    throw new Error('Malformed booking response');
  }
  // We've already validated above, so the first entry is safe.
  return list[0] as TrialBooking;
}

async function postCancel(bookingId: string): Promise<TrialBooking> {
  const endpoint = `${CANCEL_ENDPOINT_BASE}/${encodeURIComponent(bookingId)}/cancel`;
  const response = await apiClient.post<{ booking: TrialBooking }>(
    endpoint,
    undefined,
    { deduplicate: false },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to cancel trial',
    );
    throw new Error(message);
  }
  const raw = (response.data as { booking?: TrialBooking }).booking ??
    (response.data as unknown as TrialBooking);
  const list = normalizeTrialBookings([raw]);
  if (list.length === 0) {
    throw new Error('Malformed cancel response');
  }
  return list[0] as TrialBooking;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * `useTryBooking` — book trials, cancel bookings, read history.
 *
 * The hook is *not* backed by a Zustand store; it lives in component
 * state so each page has an independent copy.
 */
export function useTryBooking(): UseTryBookingResult {
  const [history, setHistory] = useState<TrialBooking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Tracks whether the initial fetch has resolved.
  const hasLoadedRef = useRef<boolean>(false);

  /**
   * Internal: re-fetch the history. Always resolves — errors are
   * captured into `error` state.
   */
  const runHistoryFetch = useCallback(async (): Promise<void> => {
    try {
      const list = await fetchHistory();
      setHistory(list);
      setError(null);
    } catch (err) {
      const message = errorToString(err);
      logger.warn(
        'try_history_fetch_failed',
        { error: message },
        'B Features',
      );
      setError(message);
    }
  }, []);

  /**
   * Public: re-fetch history. Sets the loading flag differently based
   * on whether this is the first run.
   */
  const getHistory = useCallback(async (): Promise<void> => {
    if (hasLoadedRef.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      await runHistoryFetch();
    } finally {
      hasLoadedRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [runHistoryFetch]);

  // Initial mount: kick off the history fetch. Cancellation-safe.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const list = await fetchHistory();
        if (cancelled) return;
        setHistory(list);
      } catch (err) {
        if (cancelled) return;
        const message = errorToString(err);
        logger.warn(
          'try_history_initial_fetch_failed',
          { error: message },
          'B Features',
        );
        setError(message);
      } finally {
        if (!cancelled) {
          hasLoadedRef.current = true;
          setIsLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Book a trial. Throws on failure so the caller can decide what to
   * surface (typically a toast). On success the new booking is
   * prepended to `history`.
   */
  const book = useCallback(
    async (productId: string): Promise<TrialBooking> => {
      setIsBooking(true);
      setError(null);
      try {
        const booking = await postBook(productId);
        setHistory((current) => {
          // Replace any optimistic copy of the same id, otherwise
          // prepend to keep "most-recent-first" ordering intact.
          const filtered = current.filter((b) => b.id !== booking.id);
          return [booking, ...filtered];
        });
        return booking;
      } catch (err) {
        const message = errorToString(err);
        logger.warn(
          'try_book_failed',
          { productId, error: message },
          'B Features',
        );
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsBooking(false);
      }
    },
    [],
  );

  /**
   * Cancel an active booking. Throws on failure. On success the
   * matching entry in `history` is updated in place.
   */
  const cancel = useCallback(
    async (bookingId: string): Promise<TrialBooking> => {
      setIsBooking(true);
      setError(null);
      try {
        const updated = await postCancel(bookingId);
        setHistory((current) =>
          current.map((b) => (b.id === updated.id ? updated : b)),
        );
        return updated;
      } catch (err) {
        const message = errorToString(err);
        logger.warn(
          'try_cancel_failed',
          { bookingId, error: message },
          'B Features',
        );
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsBooking(false);
      }
    },
    [],
  );

  return {
    history,
    isLoading,
    isBooking,
    isRefreshing,
    error,
    book,
    cancel,
    getHistory,
  };
}

export default useTryBooking;
