/**
 * useSalonBooking — book salon slots and manage the user's bookings.
 *
 * Phase 4.6 of the REZ-vs-NUQTA migration. Wraps three B-side endpoints:
 *
 *   - `POST /api/b/salon/book` — create a booking for a salon service.
 *   - `GET  /api/b/salon/bookings` — list the user's bookings.
 *   - `POST /api/b/salon/bookings/:id/cancel` — cancel a booking.
 *
 * State model
 * -----------
 *   - `bookings` is the canonical list of the user's bookings (server
 *     truth). It is loaded on mount and re-loaded after each mutation
 *     so the UI always reflects the latest state.
 *   - `isBooking` is `true` while a book / cancel is in flight.
 *   - `error` carries the last failure message; the UI renders it as a
 *     banner + retry / dismiss.
 *   - On mount, fires a `getBookings()` so the user's history is
 *     immediately visible.
 *
 * Usage
 * -----
 *  ```tsx
 *  const { book, cancel, bookings, isBooking, error, refresh } =
 *    useSalonBooking();
 *  ```
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import {
  type SalonBooking,
  normalizeSalonBookings,
} from '@/types/salon.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Endpoint for booking creation. */
const BOOK_ENDPOINT = '/api/b/salon/book';

/** Endpoint for listing bookings. */
const BOOKINGS_ENDPOINT = '/api/b/salon/bookings';

/** Helper to build the cancel endpoint. */
function cancelEndpoint(bookingId: string): string {
  return `/api/b/salon/bookings/${encodeURIComponent(bookingId)}/cancel`;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Parameters accepted by `book(...)`. */
export interface BookSalonParams {
  salonId: string;
  serviceId: string;
  /** ISO-8601 timestamp for the slot. */
  slot: string;
  /** Optional stylist id — when omitted, the system assigns one. */
  stylistId?: string;
}

export interface UseSalonBookingResult {
  /** The user's full booking list, most-recent first. */
  bookings: SalonBooking[];
  /** `true` while the initial load or any mutation is in flight. */
  isBooking: boolean;
  /** Last error message, or `null`. */
  error: string | null;
  /** Create a new booking. Throws on failure (also captured to state). */
  book: (params: BookSalonParams) => Promise<SalonBooking>;
  /** Cancel a booking by id. Throws on failure (also captured to state). */
  cancel: (bookingId: string) => Promise<SalonBooking>;
  /** Re-fetch the user's bookings. */
  refresh: () => Promise<void>;
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

interface BookingResponse {
  booking: SalonBooking;
}

interface BookingsResponse {
  bookings: SalonBooking[];
}

async function fetchBook(params: BookSalonParams): Promise<SalonBooking> {
  const response = await apiClient.post<BookingResponse>(BOOK_ENDPOINT, params, {
    deduplicate: false,
  });
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to book salon slot',
    );
    throw new Error(message);
  }
  return response.data.booking;
}

async function fetchBookings(): Promise<SalonBooking[]> {
  const response = await apiClient.get<BookingsResponse>(
    BOOKINGS_ENDPOINT,
    undefined,
    { timeout: 8000 },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to load bookings',
    );
    throw new Error(message);
  }
  return normalizeSalonBookings(response.data.bookings);
}

async function fetchCancel(bookingId: string): Promise<SalonBooking> {
  const response = await apiClient.post<BookingResponse>(
    cancelEndpoint(bookingId),
    undefined,
    { deduplicate: false },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to cancel booking',
    );
    throw new Error(message);
  }
  return response.data.booking;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * `useSalonBooking` — read and mutate the user's salon bookings.
 *
 * The hook is *not* backed by a Zustand store; it lives in component
 * state so each page has an independent copy.
 */
export function useSalonBooking(): UseSalonBookingResult {
  const [bookings, setBookings] = useState<SalonBooking[]>([]);
  const [isBooking, setIsBooking] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Guards against late setState after unmount.
  const mountedRef = useRef<boolean>(true);

  // Generic in-flight mutator wrapper. Sets `isBooking` and ensures the
  // bookings list is re-loaded so the UI is always server-truth.
  const runMutation = useCallback(
    async <T>(label: string, mutator: () => Promise<T>): Promise<T> => {
      setIsBooking(true);
      setError(null);
      try {
        const result = await mutator();
        // Re-fetch the list so consumers don't have to splice manually.
        try {
          const refreshed = await fetchBookings();
          if (mountedRef.current) {
            setBookings(refreshed);
          }
        } catch (refreshErr) {
          // Refreshing is best-effort; surface a warn but don't fail
          // the user-visible mutation.
          const message = errorToString(refreshErr);
          logger.warn(
            'salon_booking_refresh_failed',
            { label, error: message },
            'B Features',
          );
        }
        return result;
      } catch (err) {
        const message = errorToString(err);
        logger.warn(
          `salon_${label}_failed`,
          { error: message },
          'B Features',
        );
        if (mountedRef.current) {
          setError(message);
        }
        throw err instanceof Error ? err : new Error(message);
      } finally {
        if (mountedRef.current) {
          setIsBooking(false);
        }
      }
    },
    [],
  );

  /** Public: book a salon slot. */
  const book = useCallback(
    async (params: BookSalonParams): Promise<SalonBooking> => {
      return runMutation<SalonBooking>('book', () => fetchBook(params));
    },
    [runMutation],
  );

  /** Public: cancel a booking. */
  const cancel = useCallback(
    async (bookingId: string): Promise<SalonBooking> => {
      return runMutation<SalonBooking>('cancel', () => fetchCancel(bookingId));
    },
    [runMutation],
  );

  /** Public: re-fetch the user's bookings. */
  const refresh = useCallback(async (): Promise<void> => {
    setIsBooking(true);
    setError(null);
    try {
      const list = await fetchBookings();
      if (mountedRef.current) {
        setBookings(list);
      }
    } catch (err) {
      const message = errorToString(err);
      logger.warn(
        'salon_bookings_load_failed',
        { error: message },
        'B Features',
      );
      if (mountedRef.current) {
        setError(message);
        setBookings([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsBooking(false);
      }
    }
  }, []);

  // Initial mount: load the user's bookings. Cancellation-safe.
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    const run = async (): Promise<void> => {
      setIsBooking(true);
      setError(null);
      try {
        const list = await fetchBookings();
        if (cancelled) return;
        setBookings(list);
      } catch (err) {
        if (cancelled) return;
        const message = errorToString(err);
        logger.warn(
          'salon_initial_bookings_failed',
          { error: message },
          'B Features',
        );
        setError(message);
        setBookings([]);
      } finally {
        if (!cancelled) {
          setIsBooking(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  return {
    bookings,
    isBooking,
    error,
    book,
    cancel,
    refresh,
  };
}

export default useSalonBooking;
