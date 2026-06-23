/**
 * useTravelBooking — wires the booking lifecycle into a component.
 *
 * Wraps three endpoints:
 *   - `POST /api/b/travel/book`              → place a booking
 *   - `POST /api/b/travel/bookings/:id/cancel` → cancel an active booking
 *   - `GET  /api/b/travel/bookings`          → read booking history
 *
 * Behaviour
 * ---------
 *  - `book(resultId)` posts the booking and prepends the returned
 *    `TravelBooking` onto `bookings` so the UI updates without a
 *    follow-up fetch.
 *  - `cancel(bookingId)` posts the cancel and replaces the matching
 *    booking in `bookings` with the returned (status: 'cancelled')
 *    row.
 *  - `getBookings()` re-fetches the booking list. `bookings` is
 *    initially empty until the page (or a manual call) populates it.
 *  - `isBooking` is true while a `book()` is in flight; `isCancelling`
 *    tracks the cancel-call separately so the UI can disable just the
 *    affected row.
 *  - Errors from `book` are surfaced through `error` AND returned so
 *    the caller can render an inline toast; cancel errors set `error`
 *    but do not throw.
 *  - The hook never throws out of `book` / `cancel` / `getBookings`.
 *
 * Usage
 * -----
 *  ```tsx
 *  const { book, cancel, bookings, isBooking, error,
 *          getBookings } = useTravelBooking();
 *  ```
 */
import { useCallback, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import {
  isTravelBooking,
  normalizeTravelBookings,
  type TravelBooking,
} from '@/types/travel.types';

/** Endpoint for placing a new booking. */
const TRAVEL_BOOK_ENDPOINT = '/api/b/travel/book';
/** Endpoint for reading booking history. */
const TRAVEL_BOOKINGS_ENDPOINT = '/api/b/travel/bookings';

/** Response envelope for `book` / `cancel`. */
interface BookingEnvelope {
  booking: TravelBooking;
}

/** Response envelope for `bookings` listing. */
interface BookingsEnvelope {
  bookings: TravelBooking[];
}

export interface UseTravelBookingResult {
  book: (resultId: string) => Promise<TravelBooking | null>;
  cancel: (bookingId: string) => Promise<TravelBooking | null>;
  getBookings: () => Promise<void>;
  bookings: TravelBooking[];
  isBooking: boolean;
  isCancelling: boolean;
  isLoadingBookings: boolean;
  error: Error | null;
}

/**
 * Type-guard for `BookingEnvelope`. Defensive against malformed
 * backend payloads.
 */
function isBookingEnvelope(value: unknown): value is BookingEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return isTravelBooking(v['booking']);
}

/**
 * Type-guard for `BookingsEnvelope`.
 */
function isBookingsEnvelope(value: unknown): value is BookingsEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v['bookings']);
}

/**
 * Replace the booking with `id` inside `list`. If absent, prepend.
 */
function upsertBooking(
  list: ReadonlyArray<TravelBooking>,
  next: TravelBooking,
): TravelBooking[] {
  const index = list.findIndex((b) => b.id === next.id);
  if (index < 0) return [next, ...list];
  const copy = list.slice();
  copy[index] = next;
  return copy;
}

/**
 * `useTravelBooking` — manage the booking lifecycle. See
 * module-level JSDoc for the full contract.
 */
export function useTravelBooking(): UseTravelBookingResult {
  const [bookings, setBookings] = useState<TravelBooking[]>([]);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /** Track in-flight bookings so duplicate taps don't double-book. */
  const inFlightRef = useRef<Set<string>>(new Set());

  /**
   * Place a booking for `resultId`. Returns the new booking on
   * success, `null` on failure (with `error` populated). Never throws.
   */
  const book = useCallback(
    async (resultId: string): Promise<TravelBooking | null> => {
      const trimmed = resultId.trim();
      if (trimmed.length === 0) {
        const e = new Error('resultId is required');
        setError(e);
        return null;
      }
      if (inFlightRef.current.has(trimmed)) {
        // Defensive: prevent a double-tap from issuing two requests.
        return null;
      }
      inFlightRef.current.add(trimmed);
      setIsBooking(true);
      setError(null);
      try {
        const response = await apiClient.post<BookingEnvelope>(
          TRAVEL_BOOK_ENDPOINT,
          { resultId: trimmed },
          { deduplicate: false },
        );
        if (!response.success || response.data === undefined) {
          const message =
            typeof response.error === 'string'
              ? response.error
              : 'Travel booking failed';
          throw new Error(message);
        }
        if (!isBookingEnvelope(response.data)) {
          throw new Error('Travel booking returned an unexpected payload');
        }
        const next = response.data.booking;
        setBookings((prev) => upsertBooking(prev, next));
        try {
          logger.info(
            'travel_booking_placed',
            { bookingId: next.id, resultId: next.resultId },
            'B Features',
          );
        } catch {
          /* never block */
        }
        return next;
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'travel_booking_failed',
          {
            error: wrapped.message,
            resultId: trimmed,
          },
          'B Features',
        );
        setError(wrapped);
        return null;
      } finally {
        inFlightRef.current.delete(trimmed);
        setIsBooking(false);
      }
    },
    [],
  );

  /**
   * Cancel an active booking by id. Returns the updated booking on
   * success, `null` on failure (with `error` populated). Never throws.
   */
  const cancel = useCallback(
    async (bookingId: string): Promise<TravelBooking | null> => {
      const trimmed = bookingId.trim();
      if (trimmed.length === 0) {
        const e = new Error('bookingId is required');
        setError(e);
        return null;
      }
      setIsCancelling(true);
      setError(null);
      try {
        const response = await apiClient.post<BookingEnvelope>(
          `${TRAVEL_BOOKINGS_ENDPOINT}/${encodeURIComponent(trimmed)}/cancel`,
          {},
          { deduplicate: false },
        );
        if (!response.success || response.data === undefined) {
          const message =
            typeof response.error === 'string'
              ? response.error
              : 'Travel booking cancellation failed';
          throw new Error(message);
        }
        if (!isBookingEnvelope(response.data)) {
          throw new Error('Travel cancel returned an unexpected payload');
        }
        const next = response.data.booking;
        setBookings((prev) => upsertBooking(prev, next));
        try {
          logger.info(
            'travel_booking_cancelled',
            { bookingId: next.id, resultId: next.resultId },
            'B Features',
          );
        } catch {
          /* never block */
        }
        return next;
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'travel_cancel_failed',
          { error: wrapped.message, bookingId: trimmed },
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

  /**
   * Re-fetch the booking history. Updates `bookings` on success;
   * surfaces failures via `error`. Never throws.
   */
  const getBookings = useCallback(async (): Promise<void> => {
    setIsLoadingBookings(true);
    setError(null);
    try {
      const response = await apiClient.get<BookingsEnvelope>(
        TRAVEL_BOOKINGS_ENDPOINT,
        undefined,
        { timeout: 8000 },
      );
      if (!response.success || response.data === undefined) {
        const message =
          typeof response.error === 'string'
            ? response.error
            : 'Failed to load travel bookings';
        throw new Error(message);
      }
      if (!isBookingsEnvelope(response.data)) {
        throw new Error('Travel bookings returned an unexpected payload');
      }
      setBookings(normalizeTravelBookings(response.data.bookings));
    } catch (err) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      logger.warn(
        'travel_bookings_load_failed',
        { error: wrapped.message },
        'B Features',
      );
      setError(wrapped);
    } finally {
      setIsLoadingBookings(false);
    }
  }, []);

  return {
    book,
    cancel,
    getBookings,
    bookings,
    isBooking,
    isCancelling,
    isLoadingBookings,
    error,
  };
}

export default useTravelBooking;