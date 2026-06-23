/**
 * Travel module routes — REZ-vs-NUQTA migration (Phase 4.4)
 *
 * Sub-router mounted under `/api/b/travel`. Powers the B-side Travel
 * module: a unified aggregation surface across five verticals —
 * flights, hotels, trains, cabs, and buses.
 *
 * Endpoints
 * ---------
 *   POST /api/b/travel/search
 *     Body: `TravelSearchQuery` (`from`, `to`, `departDate`,
 *     `returnDate?`, `passengers`, `category`). Returns 5–8 mock
 *     results for the requested vertical. Response:
 *       { results: TravelResult[], query: TravelSearchQuery }
 *
 *   POST /api/b/travel/book
 *     Body: `{ resultId: string }`. Returns a fresh `TravelBooking`
 *     with status `confirmed`. The originating `TravelResult` is
 *     looked up in the seeded fixture set; unknown ids are rejected
 *     with HTTP 404. Response:
 *       { booking: TravelBooking }
 *
 *   GET  /api/b/travel/bookings
 *     Returns the authenticated user's full booking history,
 *     most-recent first. Lazily seeded with 3 past fixtures.
 *     Response:
 *       { bookings: TravelBooking[] }
 *
 *   POST /api/b/travel/bookings/:id/cancel
 *     Cancels a booking by id. Bookings not owned by the authenticated
 *     user or not in `pending`/`confirmed` state are rejected.
 *     Response:
 *       { booking: TravelBooking }
 *
 * Persistence: in-memory maps keyed by user id; the contract is the
 * stable surface and the backing store will be swapped for Mongo
 * once the migration is complete.
 *
 * Mounted in `src/routes/b/index.ts` as
 *     router.use('/travel', travelBRoutes);
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bSuccess, bError } from '../../utils/bResponse';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Top-level travel categories exposed by the search UI. */
export const TRAVEL_CATEGORIES = [
  'flight',
  'hotel',
  'train',
  'cab',
  'bus',
] as const;

export type TravelCategory = (typeof TRAVEL_CATEGORIES)[number];

/** Lifecycle state for a `TravelBooking`. */
export type TravelBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

/** Search query supplied by the user. */
export interface TravelSearchQuery {
  from: string;
  to: string;
  departDate: string;
  returnDate?: string;
  passengers: number;
  category: TravelCategory;
}

/** A single search result — one option across the five verticals. */
export interface TravelResult {
  id: string;
  category: TravelCategory;
  provider: string;
  title: string;
  pricePaise: number;
  originalPricePaise?: number;
  durationMinutes?: number;
  rating?: number;
  thumbnailUrl?: string;
  deepLink: string;
}

/** A booking the user has placed on a `TravelResult`. */
export interface TravelBooking {
  id: string;
  resultId: string;
  userId: string;
  status: TravelBookingStatus;
  totalPaise: number;
  bookedAt: string;
  confirmationCode: string;
  details: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Fixtures — results
// ---------------------------------------------------------------------------

const NOW_MS = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Mock results seeded into the result store. The list is queried by
 * `category`; `buildResultsForQuery` filters by the requested vertical
 * and re-scales the price by passenger count.
 *
 * 5 results per vertical — within the 5-8 spec range.
 */
const RESULT_FIXTURES: ReadonlyArray<TravelResult> = [
  // Flights (BLR → DEL)
  { id: 'flight-indigo-6e-213', category: 'flight', provider: 'IndiGo',
    title: 'IndiGo 6E-213 • BLR → DEL', pricePaise: 549900, originalPricePaise: 729900,
    durationMinutes: 165, deepLink: 'https://example.com/book/flight-indigo-6e-213' },
  { id: 'flight-airindia-ai-501', category: 'flight', provider: 'Air India',
    title: 'Air India AI-501 • BLR → DEL', pricePaise: 689900, durationMinutes: 175,
    rating: 4.1, deepLink: 'https://example.com/book/flight-airindia-ai-501' },
  { id: 'flight-vistara-uk-820', category: 'flight', provider: 'Vistara',
    title: 'Vistara UK-820 • BLR → DEL', pricePaise: 749900, originalPricePaise: 899900,
    durationMinutes: 160, rating: 4.4, deepLink: 'https://example.com/book/flight-vistara-uk-820' },
  { id: 'flight-spicejet-sg-167', category: 'flight', provider: 'SpiceJet',
    title: 'SpiceJet SG-167 • BLR → DEL', pricePaise: 459900, durationMinutes: 180,
    rating: 3.8, deepLink: 'https://example.com/book/flight-spicejet-sg-167' },
  { id: 'flight-goair-g8-321', category: 'flight', provider: 'Go First',
    title: 'Go First G8-321 • BLR → DEL', pricePaise: 479900, originalPricePaise: 599900,
    durationMinutes: 170, rating: 3.9, deepLink: 'https://example.com/book/flight-goair-g8-321' },

  // Hotels (Bengaluru)
  { id: 'hotel-oyo-rooms-blr-001', category: 'hotel', provider: 'OYO',
    title: 'OYO Townhouse Indiranagar', pricePaise: 189900, originalPricePaise: 259900,
    rating: 4.2, deepLink: 'https://example.com/book/hotel-oyo-rooms-blr-001' },
  { id: 'hotel-taj-mg-road', category: 'hotel', provider: 'Taj',
    title: 'Taj MG Road Bengaluru', pricePaise: 1249900, durationMinutes: 60 * 24,
    rating: 4.8, deepLink: 'https://example.com/book/hotel-taj-mg-road' },
  { id: 'hotel-lemontree-whitefield', category: 'hotel', provider: 'Lemon Tree',
    title: 'Lemon Tree Hotel Whitefield', pricePaise: 549900, originalPricePaise: 649900,
    rating: 4.3, deepLink: 'https://example.com/book/hotel-lemontree-whitefield' },
  { id: 'hotel-ibis-hosurroad', category: 'hotel', provider: 'ibis',
    title: 'ibis Bengaluru Hosur Road', pricePaise: 329900, rating: 4.1,
    deepLink: 'https://example.com/book/hotel-ibis-hosurroad' },
  { id: 'hotel-airbnb-koramangala', category: 'hotel', provider: 'Airbnb',
    title: 'Cozy Studio in Koramangala', pricePaise: 219900, durationMinutes: 60 * 24,
    rating: 4.6, deepLink: 'https://example.com/book/hotel-airbnb-koramangala' },

  // Trains (SBC ↔ MAS / NDLS)
  { id: 'train-shatabdi-12007', category: 'train', provider: 'IRCTC',
    title: 'Shatabdi Express 12007 • SBC → MAS', pricePaise: 89900,
    durationMinutes: 7 * 60, rating: 4.5, deepLink: 'https://example.com/book/train-shatabdi-12007' },
  { id: 'train-rajdhani-22691', category: 'train', provider: 'IRCTC',
    title: 'Rajdhani Express 22691 • SBC → NDLS', pricePaise: 289900,
    originalPricePaise: 349900, durationMinutes: 33 * 60, rating: 4.6,
    deepLink: 'https://example.com/book/train-rajdhani-22691' },
  { id: 'train-duronto-12213', category: 'train', provider: 'IRCTC',
    title: 'Duronto Express 12213 • SBC → NDLS', pricePaise: 249900,
    durationMinutes: 35 * 60, rating: 4.2, deepLink: 'https://example.com/book/train-duronto-12213' },
  { id: 'train-garib-rath-12275', category: 'train', provider: 'IRCTC',
    title: 'Garib Rath 12275 • SBC → NDLS', pricePaise: 119900,
    durationMinutes: 38 * 60, rating: 3.9, deepLink: 'https://example.com/book/train-garib-rath-12275' },
  { id: 'train-vande-bharat-22210', category: 'train', provider: 'IRCTC',
    title: 'Vande Bharat 22210 • SBC → MAS', pricePaise: 149900,
    originalPricePaise: 189900, durationMinutes: 6 * 60 + 30, rating: 4.7,
    deepLink: 'https://example.com/book/train-vande-bharat-22210' },

  // Cabs (Bengaluru local — 8 km baseline)
  { id: 'cab-ola-micro-blr', category: 'cab', provider: 'Ola',
    title: 'Ola Micro • 8 km • 22 min', pricePaise: 11900, durationMinutes: 22,
    rating: 4.2, deepLink: 'https://example.com/book/cab-ola-micro-blr' },
  { id: 'cab-ola-prime-blr', category: 'cab', provider: 'Ola',
    title: 'Ola Prime Sedan • 8 km • 20 min', pricePaise: 18900, originalPricePaise: 22900,
    durationMinutes: 20, rating: 4.4, deepLink: 'https://example.com/book/cab-ola-prime-blr' },
  { id: 'cab-uber-go-blr', category: 'cab', provider: 'Uber',
    title: 'Uber Go • 8 km • 23 min', pricePaise: 12900, durationMinutes: 23,
    rating: 4.1, deepLink: 'https://example.com/book/cab-uber-go-blr' },
  { id: 'cab-uber-premier-blr', category: 'cab', provider: 'Uber',
    title: 'Uber Premier • 8 km • 19 min', pricePaise: 22900, durationMinutes: 19,
    rating: 4.5, deepLink: 'https://example.com/book/cab-uber-premier-blr' },
  { id: 'cab-rapido-bike-blr', category: 'cab', provider: 'Rapido',
    title: 'Rapido Bike • 8 km • 18 min', pricePaise: 4900, originalPricePaise: 7900,
    durationMinutes: 18, rating: 4.3, deepLink: 'https://example.com/book/cab-rapido-bike-blr' },

  // Buses (BLR → MYS)
  { id: 'bus-redbus-volvo-blr-mys', category: 'bus', provider: 'RedBus',
    title: 'VRL Volvo AC Sleeper • BLR → MYS', pricePaise: 89900,
    originalPricePaise: 109900, durationMinutes: 3 * 60, rating: 4.4,
    deepLink: 'https://example.com/book/bus-redbus-volvo-blr-mys' },
  { id: 'bus-redbus-ac-blr-mys', category: 'bus', provider: 'RedBus',
    title: 'SRS Travels AC Semi-Sleeper • BLR → MYS', pricePaise: 59900,
    durationMinutes: 3 * 60 + 20, rating: 4.0,
    deepLink: 'https://example.com/book/bus-redbus-ac-blr-mys' },
  { id: 'bus-abhibus-volvo-blr-mys', category: 'bus', provider: 'AbhiBus',
    title: 'KPN Travels Volvo AC • BLR → MYS', pricePaise: 79900,
    durationMinutes: 3 * 60, rating: 4.2, deepLink: 'https://example.com/book/bus-abhibus-volvo-blr-mys' },
  { id: 'bus-redbus-ordinary-blr-mys', category: 'bus', provider: 'RedBus',
    title: 'KSRTC Ordinary • BLR → MYS', pricePaise: 24900, durationMinutes: 4 * 60,
    rating: 3.6, deepLink: 'https://example.com/book/bus-redbus-ordinary-blr-mys' },
  { id: 'bus-make-my-trip-blr-mys', category: 'bus', provider: 'MakeMyTrip',
    title: 'IntrCity Smart Bus • BLR → MYS', pricePaise: 69900,
    originalPricePaise: 89900, durationMinutes: 3 * 60 + 10, rating: 4.3,
    deepLink: 'https://example.com/book/bus-make-my-trip-blr-mys' },
];

/** Past bookings seeded for the demo user. */
const PAST_BOOKINGS: ReadonlyArray<TravelBooking> = [
  {
    id: 'travel-book-past-1',
    resultId: 'flight-indigo-6e-213',
    userId: '__seed__',
    status: 'completed',
    totalPaise: 549900,
    bookedAt: new Date(NOW_MS - 30 * DAY_MS).toISOString(),
    confirmationCode: 'TRV-AX91P2',
    details: {
      provider: 'IndiGo',
      title: 'IndiGo 6E-213 • BLR → DEL',
      category: 'flight',
      from: 'BLR',
      to: 'DEL',
      passengers: 1,
    },
  },
  {
    id: 'travel-book-past-2',
    resultId: 'hotel-oyo-rooms-blr-001',
    userId: '__seed__',
    status: 'completed',
    totalPaise: 189900,
    bookedAt: new Date(NOW_MS - 14 * DAY_MS).toISOString(),
    confirmationCode: 'TRV-BC42Q7',
    details: {
      provider: 'OYO',
      title: 'OYO Townhouse Indiranagar',
      category: 'hotel',
      from: 'Bengaluru',
      to: 'Bengaluru',
      passengers: 1,
    },
  },
  {
    id: 'travel-book-past-3',
    resultId: 'cab-uber-go-blr',
    userId: '__seed__',
    status: 'confirmed',
    totalPaise: 12900,
    bookedAt: new Date(NOW_MS - 1 * DAY_MS).toISOString(),
    confirmationCode: 'TRV-DE73R1',
    details: {
      provider: 'Uber',
      title: 'Uber Go • 8 km • 23 min',
      category: 'cab',
      from: 'HSR Layout',
      to: 'Indiranagar',
      passengers: 1,
    },
  },
];

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

/** Per-user booking store, lazily seeded with the past fixtures. */
const USER_BOOKING_STORE: Map<string, TravelBooking[]> = new Map();

/** Lazily read a user's booking list, seeding it from the past fixtures
 *  on first access. Returns a *reference* — callers must clone. */
function readUserBookings(userId: string): TravelBooking[] {
  let existing = USER_BOOKING_STORE.get(userId);
  if (!existing) {
    existing = PAST_BOOKINGS.map((b) => ({ ...b, userId }));
    USER_BOOKING_STORE.set(userId, existing);
  }
  return existing;
}

/** Overwrite a user's booking list. */
function writeUserBookings(userId: string, bookings: TravelBooking[]): void {
  USER_BOOKING_STORE.set(userId, bookings);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isTravelCategory(value: unknown): value is TravelCategory {
  return (
    typeof value === 'string' &&
    (TRAVEL_CATEGORIES as ReadonlyArray<string>).includes(value)
  );
}

function isBookingStatus(value: unknown): value is TravelBookingStatus {
  return (
    typeof value === 'string' &&
    (value === 'pending' ||
      value === 'confirmed' ||
      value === 'cancelled' ||
      value === 'completed')
  );
}

function isSearchQuery(value: unknown): value is TravelSearchQuery {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.from === 'string' &&
    v.from.length > 0 &&
    typeof v.to === 'string' &&
    v.to.length > 0 &&
    typeof v.departDate === 'string' &&
    v.departDate.length > 0 &&
    (v.returnDate === undefined || typeof v.returnDate === 'string') &&
    typeof v.passengers === 'number' &&
    Number.isFinite(v.passengers) &&
    v.passengers >= 1 &&
    isTravelCategory(v.category)
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Best-effort extraction of the authenticated user's id. */
function extractUserId(req: { user?: unknown }): string {
  if (typeof req.user !== 'object' || req.user === null) return 'anonymous';
  const u = req.user as Record<string, unknown>;
  const candidates: unknown[] = [u['id'], u['_id'], u['userId']];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }
  return 'anonymous';
}

/** Pseudo-random hex confirmation code (8 chars). */
function generateConfirmationCode(): string {
  const stamp = NOW_MS.toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `TRV-${stamp.slice(-4)}${rand}`;
}

/** Return the results for the requested category, scaled by passengers. */
function buildResultsForQuery(query: TravelSearchQuery): TravelResult[] {
  const matches = RESULT_FIXTURES.filter((r) => r.category === query.category);
  const base = matches.length > 0 ? matches : RESULT_FIXTURES.slice(0, 5);
  // Scale price by passenger count (single-passenger baseline).
  return base.map((r) => {
    const scaled: TravelResult = {
      ...r,
      pricePaise: r.pricePaise * Math.max(1, query.passengers),
    };
    if (r.originalPricePaise !== undefined) {
      scaled.originalPricePaise = r.originalPricePaise * Math.max(1, query.passengers);
    }
    return scaled;
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/** Every travel endpoint requires authentication. */
router.use(authenticate);

/**
 * POST /api/b/travel/search
 *
 * Returns 5–8 mock `TravelResult`s matching the requested category.
 * The shape mirrors the frontend `TravelSearchQuery` 1:1 so the
 * API contract is self-documenting.
 */
router.post('/search', (req, res) => {
  const userId = extractUserId(req);
  if (!isSearchQuery(req.body)) {
    return bError(res, 'Invalid travel search query', 400, {
      required: ['from', 'to', 'departDate', 'passengers', 'category'],
      allowedCategories: [...TRAVEL_CATEGORIES],
    });
  }
  const query: TravelSearchQuery = req.body;
  const results = buildResultsForQuery(query);
  try {
    logger.info('b_travel_search', {
      userId,
      category: query.category,
      from: query.from,
      to: query.to,
      departDate: query.departDate,
      count: results.length,
    });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(res, {
    results: results.map((r) => ({ ...r })),
    query,
  });
});

/**
 * POST /api/b/travel/book
 *
 * Books the supplied `resultId`. Looks the result up in the seeded
 * fixture set; unknown ids are rejected with HTTP 404. The booking
 * is appended to the user's history with status `confirmed`.
 */
router.post('/book', (req, res) => {
  const userId = extractUserId(req);
  const body = req.body as Record<string, unknown> | undefined;
  const resultId = body?.['resultId'];
  if (typeof resultId !== 'string' || resultId.length === 0) {
    return bError(res, 'Missing resultId', 400);
  }
  const result = RESULT_FIXTURES.find((r) => r.id === resultId);
  if (!result) {
    return bError(res, `Result not found: ${resultId}`, 404);
  }

  const bookedAtMs = Date.now();
  const booking: TravelBooking = {
    id: `travel-book-${userId}-${bookedAtMs}`,
    resultId: result.id,
    userId,
    status: 'confirmed',
    totalPaise: result.pricePaise,
    bookedAt: new Date(bookedAtMs).toISOString(),
    confirmationCode: generateConfirmationCode(),
    details: {
      provider: result.provider,
      title: result.title,
      category: result.category,
      passengers: 1,
    },
  };

  const bookings = readUserBookings(userId);
  bookings.unshift(booking);
  writeUserBookings(userId, bookings);

  try {
    logger.info('b_travel_booked', {
      userId,
      resultId: result.id,
      bookingId: booking.id,
      totalPaise: booking.totalPaise,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, { booking });
});

/**
 * GET /api/b/travel/bookings
 *
 * Returns the user's full booking history, most-recent first.
 * Lazily seeds with the past fixtures on first read.
 */
router.get('/bookings', (req, res) => {
  const userId = extractUserId(req);
  const bookings = readUserBookings(userId)
    .slice()
    .sort((a, b) => {
      const aMs = new Date(a.bookedAt).getTime();
      const bMs = new Date(b.bookedAt).getTime();
      return bMs - aMs;
    });
  try {
    logger.info('b_travel_bookings_query', {
      userId,
      count: bookings.length,
    });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(res, {
    bookings: bookings.map((b) => ({ ...b })),
  });
});

/**
 * POST /api/b/travel/bookings/:id/cancel
 *
 * Cancels a booking by id. The booking must belong to the authenticated
 * user and be in `pending` or `confirmed` status. Unknown ids are
 * rejected with HTTP 404; bookings in a terminal status are rejected
 * with HTTP 409.
 */
router.post('/bookings/:id/cancel', (req, res) => {
  const userId = extractUserId(req);
  const bookingId = req.params['id'];
  if (typeof bookingId !== 'string' || bookingId.length === 0) {
    return bError(res, 'Missing booking id', 400);
  }
  const bookings = readUserBookings(userId);
  const index = bookings.findIndex((b) => b.id === bookingId);
  if (index < 0) {
    return bError(res, `Booking not found: ${bookingId}`, 404);
  }
  const existing = bookings[index];
  if (!existing) {
    return bError(res, `Booking not found: ${bookingId}`, 404);
  }
  if (existing.status !== 'pending' && existing.status !== 'confirmed') {
    return bError(
      res,
      `Cannot cancel a booking in status: ${existing.status}`,
      409,
      { currentStatus: existing.status },
    );
  }
  const updated: TravelBooking = {
    ...existing,
    status: 'cancelled',
  };
  bookings[index] = updated;
  writeUserBookings(userId, bookings);

  try {
    logger.info('b_travel_booking_cancelled', {
      userId,
      bookingId: updated.id,
      resultId: updated.resultId,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, { booking: updated });
});

/** Re-exported for tests / future shared use. */
export const __test = {
  RESULT_FIXTURES,
  PAST_BOOKINGS,
  TRAVEL_CATEGORIES,
};

export default router;
