/**
 * useHabixoBooking — wires the Habixo booking endpoints into a
 * component-friendly shape (Phase 4.5 of the REZ-vs-NUQTA migration).
 *
 * Contract
 * --------
 *   - On mount, calls `GET /api/b/habixo/bookings` once and stashes the
 *     result in local state. Errors are captured into `error`; the
 *     previous bookings list is preserved across retries.
 *   - `book(propertyId, startDate, endDate)` calls
 *     `POST /api/b/habixo/book`. On success the new `HabixoBooking` is
 *     unshifted into the local list so the UI updates without a full
 *     refresh.
 *   - `cancel(bookingId)` calls
 *     `POST /api/b/habixo/bookings/:id/cancel`. On success the matching
 *     booking is updated in local state (`status: 'cancelled'`).
 *   - `getBookings()` re-fetches the user's booking history. Useful as
 *     a manual refresh from the page-level component.
 *
 * Defensive notes
 * ---------------
 *   - The backend payload is validated defensively; malformed fields
 *     are coerced into safe defaults so a server bug never crashes the
 *     UI.
 *   - `status` is verified against the closed `HabixoBookingStatus`
 *     union; unknown values fall back to `'pending'`.
 *   - `book()`, `cancel()` and `getBookings()` never throw — failures
 *     are surfaced through the `error` state so callers don't need
 *     try/catch wrappers.
 *
 * Usage
 * -----
 *  ```tsx
 *  const { book, cancel, bookings, isBooking, error } = useHabixoBooking();
 *  const handleBook = async () => {
 *    const result = await book('prop-blr-001', '2026-07-01', '2026-07-31');
 *    if (result !== null) console.log('Booked!', result.id);
 *  };
 *  ```
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import type { HabixoBooking, HabixoBookingStatus } from '@/types/habixo.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOOKINGS_ENDPOINT = '/api/b/habixo/bookings';
const BOOK_ENDPOINT = '/api/b/habixo/book';

const SAFE_STATUSES: ReadonlyArray<HabixoBookingStatus> = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
];

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Result of a single `POST /book` call. */
export interface HabixoBookResult {
  booking: HabixoBooking;
}

export interface UseHabixoBookingResult {
  /** All bookings for the authenticated user, most recent first. */
  bookings: HabixoBooking[];
  isLoading: boolean;
  /** True while a `POST /book` is in flight. */
  isBooking: boolean;
  /** True while a `POST /bookings/:id/cancel` is in flight. */
  isCancelling: boolean;
  error: Error | null;
  /**
   * Book a property. Returns the new booking on success, or `null` on
   * failure (errors are surfaced via the `error` state).
   */
  book: (
    propertyId: string,
    startDate: string,
    endDate?: string,
  ) => Promise<HabixoBookResult | null>;
  /**
   * Cancel a booking. Returns the updated booking on success, or `null`
   * on failure (errors are surfaced via the `error` state).
   */
  cancel: (bookingId: string) => Promise<HabixoBooking | null>;
  /** Re-fetch the user's booking history. */
  getBookings: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Defensive normalisers
// ---------------------------------------------------------------------------

function safeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function safeNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return Math.floor(value);
}

function safeStatus(value: unknown): HabixoBookingStatus {
  if (typeof value === 'string') {
    for (const candidate of SAFE_STATUSES) {
      if (candidate === value) return candidate;
    }
  }
  return 'pending';
}

function isBooking(value: unknown): value is HabixoBooking {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.propertyId === 'string' &&
    typeof v.userId === 'string' &&
    typeof v.startDate === 'string' &&
    typeof v.status === 'string' &&
    typeof v.totalPaise === 'number' &&
    typeof v.bookedAt === 'string'
  );
}

function normalizeBooking(raw: unknown): HabixoBooking {
  const v = (typeof raw === 'object' && raw !== null
    ? raw
    : {}) as Record<string, unknown>;
  const endDate = typeof v.endDate === 'string' && v.endDate.length > 0
    ? v.endDate
    : undefined;
  return {
    id: safeString(v.id, ''),
    propertyId: safeString(v.propertyId, ''),
    userId: safeString(v.userId, ''),
    startDate: safeString(v.startDate, new Date().toISOString()),
    ...(endDate !== undefined ? { endDate } : {}),
    status: safeStatus(v.status),
    totalPaise: safeNonNegativeInt(v.totalPaise, 0),
    bookedAt: safeString(v.bookedAt, new Date().toISOString()),
  };
}

function normalizeBookings(raw: unknown): HabixoBooking[] {
  if (!Array.isArray(raw)) return [];
  const out: HabixoBooking[] = [];
  for (const item of raw) {
    if (isBooking(item)) {
      out.push(normalizeBooking(item));
    } else {
      // Be lenient: try to normalise even partially-typed objects so
      // a backend hiccup doesn't blank the entire list.
      const normalised = normalizeBooking(item);
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

async function fetchBookings(): Promise<HabixoBooking[]> {
  const response = await apiClient.get<HabixoBooking[]>(
    BOOKINGS_ENDPOINT,
    undefined,
    { timeout: 8000, deduplicate: false },
  );
  if (!response.success || response.data === undefined) {
    const message =
      typeof response.error === 'string'
        ? response.error
        : 'Failed to load bookings';
    throw new Error(message);
  }
  return normalizeBookings(response.data);
}

async function postBook(
  propertyId: string,
  startDate: string,
  endDate: string | undefined,
): Promise<HabixoBooking> {
  const payload: Record<string, string> = {
    propertyId,
    startDate,
  };
  if (endDate !== undefined && endDate.length > 0) {
    payload['endDate'] = endDate;
  }
  const response = await apiClient.post<{ booking: HabixoBooking }>(
    BOOK_ENDPOINT,
    payload,
    { deduplicate: false },
  );
  if (!response.success || response.data === undefined) {
    const message =
      typeof response.error === 'string'
        ? response.error
        : 'Failed to book property';
    throw new Error(message);
  }
  const raw = response.data as { booking?: unknown };
  return normalizeBooking(raw.booking);
}

async function postCancel(bookingId: string): Promise<HabixoBooking> {
  const endpoint = `${BOOKINGS_ENDPOINT}/${encodeURIComponent(bookingId)}/cancel`;
  const response = await apiClient.post<{ booking: HabixoBooking }>(
    endpoint,
    undefined,
    { deduplicate: false },
  );
  if (!response.success || response.data === undefined) {
    const message =
      typeof response.error === 'string'
        ? response.error
        : 'Failed to cancel booking';
    throw new Error(message);
  }
  const raw = response.data as { booking?: unknown };
  return normalizeBooking(raw.booking);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the user's booking history plus `book` and `cancel` actions.
 */
export function useHabixoBooking(): UseHabixoBookingResult {
  const [bookings, setBookings] = useState<HabixoBooking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Track whether we've ever populated so the UI can tell apart
  // "still loading" from "loaded but empty".
  const hasLoadedRef = useRef<boolean>(false);

  const runFetch = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await fetchBookings();
      setBookings(next);
      hasLoadedRef.current = true;
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      logger.warn(
        'habixo_bookings_fetch_failed',
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
        const next = await fetchBookings();
        if (cancelled) return;
        setBookings(next);
        hasLoadedRef.current = true;
      } catch (err) {
        if (cancelled) return;
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'habixo_bookings_initial_fetch_failed',
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
   * `getBookings` — re-runs the bookings fetch. Wired to a manual
   * refresh button on the page-level component. Never throws.
   */
  const getBookings = useCallback(async (): Promise<void> => {
    await runFetch();
  }, [runFetch]);

  /**
   * `book` — book a property. Returns the new booking on success, or
   * `null` on failure (errors are surfaced via the `error` state).
   */
  const book = useCallback(
    async (
      propertyId: string,
      startDate: string,
      endDate?: string,
    ): Promise<HabixoBookResult | null> => {
      if (propertyId.length === 0) return null;
      if (startDate.length === 0) return null;
      setIsBooking(true);
      setError(null);
      try {
        const created = await postBook(propertyId, startDate, endDate);
        // Optimistically prepend the new booking.
        setBookings((prev) => [created, ...prev]);
        logger.info(
          'habixo_property_booked',
          {
            propertyId,
            bookingId: created.id,
            totalPaise: created.totalPaise,
          },
          'B Features',
        );
        return { booking: created };
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'habixo_property_book_failed',
          { propertyId, error: wrapped.message },
          'B Features',
        );
        setError(wrapped);
        return null;
      } finally {
        setIsBooking(false);
      }
    },
    [],
  );

  /**
   * `cancel` — cancel a booking by id. Returns the updated booking on
   * success, or `null` on failure (errors are surfaced via `error`).
   */
  const cancel = useCallback(
    async (bookingId: string): Promise<HabixoBooking | null> => {
      if (bookingId.length === 0) return null;
      setIsCancelling(true);
      setError(null);
      try {
        const updated = await postCancel(bookingId);
        setBookings((prev) =>
          prev.map((b) => (b.id === updated.id ? updated : b)),
        );
        logger.info(
          'habixo_booking_cancelled',
          { bookingId: updated.id },
          'B Features',
        );
        return updated;
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'habixo_booking_cancel_failed',
          { bookingId, error: wrapped.message },
          'B Features',
        );
        setError(wrapped);
        return null;
      } finally {
        setIsCancelling(false);
      }
    },
    [],
  );

  // Reference `hasLoadedRef` so future additions (e.g. a refetch
  // condition) don't trigger an unused-var warning under strict TS.
  void hasLoadedRef;

  return {
    bookings,
    isLoading,
    isBooking,
    isCancelling,
    error,
    book,
    cancel,
    getBookings,
  };
}

export default useHabixoBooking;
