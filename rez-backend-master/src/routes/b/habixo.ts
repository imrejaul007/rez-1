/**
 * Habixo routes — REZ-vs-NUQTA migration (Phase 4.5)
 *
 * Sub-router mounted under `/api/b/habixo`. Powers the B-side Habixo
 * rental marketplace: stays, hourly spaces, property rentals, rent
 * (appliances / vehicles), and match suggestions — all unified under a
 * single `HabixoProperty` record.
 *
 * Endpoints
 * ---------
 *   GET  /api/b/habixo/properties?city=&type=&minRent=&maxRent=
 *     Returns the property catalogue, optionally filtered by city,
 *     vertical surface, and an inclusive paise price range. Response:
 *       { properties: HabixoProperty[], total: number, filters: {...} }
 *
 *   POST /api/b/habixo/book
 *     Books a property. Body: { propertyId, startDate, endDate? }.
 *     Response: { booking: HabixoBooking }
 *
 *   GET  /api/b/habixo/bookings
 *     Returns the authenticated user's booking history, most recent
 *     first. Response: { bookings: HabixoBooking[] }
 *
 *   POST /api/b/habixo/bookings/:id/cancel
 *     Cancels a booking. Response: { booking: HabixoBooking }
 *
 *   GET  /api/b/habixo/messages/:conversationId
 *     Returns the messages in a conversation. The mock always returns
 *     a small fixture thread. Response: { messages: HabixoMessage[] }
 *
 * Persistence: in-memory maps keyed by user id. The contract is the
 * stable surface; the backing store will be swapped for Mongo once the
 * migration is complete.
 *
 * Mounted in `src/routes/b/index.ts` as
 *     router.use('/habixo', habixoBRoutes);
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bSuccess, bError } from '../../utils/bResponse';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Vertical surface a property belongs to. */
export type HabixoPropertyType =
  | 'apartment'
  | 'house'
  | 'office'
  | 'meeting_room'
  | 'pg'
  | 'studio';

/** Lifecycle state for a `HabixoBooking`. */
export type HabixoBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

/** A single Habixo property listing. */
export interface HabixoProperty {
  id: string;
  title: string;
  type: HabixoPropertyType;
  city: string;
  area: string;
  rentPaise: number;
  depositPaise?: number;
  bedrooms?: number;
  bathrooms?: number;
  areaSqft?: number;
  amenities: string[];
  imageUrls: string[];
  ownerName: string;
  available: boolean;
}

/** A booking made by the authenticated user against a property. */
export interface HabixoBooking {
  id: string;
  propertyId: string;
  userId: string;
  startDate: string;
  endDate?: string;
  status: HabixoBookingStatus;
  totalPaise: number;
  bookedAt: string;
}

/** One message in a property conversation thread. */
export interface HabixoMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

// ---------------------------------------------------------------------------
// Fixtures — properties
// ---------------------------------------------------------------------------

/** Hardcoded Bangalore-area properties covering all five vertical surfaces. */
const FIXTURE_PROPERTIES: ReadonlyArray<HabixoProperty> = [
  {
    id: 'prop-blr-001',
    title: 'Sunlit 2BHK in Indiranagar',
    type: 'apartment',
    city: 'Bangalore',
    area: 'Indiranagar',
    rentPaise: 35_000_00,
    depositPaise: 70_000_00,
    bedrooms: 2,
    bathrooms: 2,
    areaSqft: 1100,
    amenities: ['WiFi', 'AC', 'Parking', 'Power Backup', 'Lift', 'Security'],
    imageUrls: [
      'https://images.example.com/habixo/blr-001-1.jpg',
      'https://images.example.com/habixo/blr-001-2.jpg',
    ],
    ownerName: 'Priya Menon',
    available: true,
  },
  {
    id: 'prop-blr-002',
    title: 'Cozy studio near MG Road',
    type: 'studio',
    city: 'Bangalore',
    area: 'MG Road',
    rentPaise: 18_000_00,
    depositPaise: 36_000_00,
    bedrooms: 0,
    bathrooms: 1,
    areaSqft: 420,
    amenities: ['WiFi', 'AC', 'Housekeeping'],
    imageUrls: ['https://images.example.com/habixo/blr-002-1.jpg'],
    ownerName: 'Arjun Reddy',
    available: true,
  },
  {
    id: 'prop-blr-003',
    title: 'Family 3BHK house in Whitefield',
    type: 'house',
    city: 'Bangalore',
    area: 'Whitefield',
    rentPaise: 55_000_00,
    depositPaise: 110_000_00,
    bedrooms: 3,
    bathrooms: 3,
    areaSqft: 1800,
    amenities: ['WiFi', 'AC', 'Parking', 'Garden', 'Power Backup', 'Pet Friendly'],
    imageUrls: ['https://images.example.com/habixo/blr-003-1.jpg'],
    ownerName: 'Lakshmi Iyer',
    available: true,
  },
  {
    id: 'prop-blr-004',
    title: 'PG accommodation in Koramangala',
    type: 'pg',
    city: 'Bangalore',
    area: 'Koramangala',
    rentPaise: 12_000_00,
    depositPaise: 24_000_00,
    bedrooms: 1,
    bathrooms: 1,
    areaSqft: 180,
    amenities: ['WiFi', 'Meals', 'Laundry', 'Housekeeping', 'Security'],
    imageUrls: ['https://images.example.com/habixo/blr-004-1.jpg'],
    ownerName: 'Manjunath B',
    available: true,
  },
  {
    id: 'prop-blr-005',
    title: 'Modern office cabin in HSR Layout',
    type: 'office',
    city: 'Bangalore',
    area: 'HSR Layout',
    rentPaise: 75_000_00,
    depositPaise: 150_000_00,
    bathrooms: 1,
    areaSqft: 650,
    amenities: ['WiFi', 'AC', 'Meeting Room', 'Pantry', 'Parking'],
    imageUrls: ['https://images.example.com/habixo/blr-005-1.jpg'],
    ownerName: 'Sneha Kapoor',
    available: true,
  },
  {
    id: 'prop-blr-006',
    title: 'Hourly meeting room in Indiranagar',
    type: 'meeting_room',
    city: 'Bangalore',
    area: 'Indiranagar',
    rentPaise: 500_00, // ₹500 / hour
    areaSqft: 220,
    amenities: ['WiFi', 'Projector', 'Whiteboard', 'AC', 'Coffee'],
    imageUrls: ['https://images.example.com/habixo/blr-006-1.jpg'],
    ownerName: 'Workhive Coworking',
    available: true,
  },
  {
    id: 'prop-blr-007',
    title: '1BHK near Electronic City',
    type: 'apartment',
    city: 'Bangalore',
    area: 'Electronic City',
    rentPaise: 14_000_00,
    depositPaise: 28_000_00,
    bedrooms: 1,
    bathrooms: 1,
    areaSqft: 560,
    amenities: ['WiFi', 'AC', 'Lift', 'Power Backup'],
    imageUrls: ['https://images.example.com/habixo/blr-007-1.jpg'],
    ownerName: 'Rajesh K',
    available: true,
  },
  {
    id: 'prop-blr-008',
    title: 'Heritage 4BHK villa in Jayanagar',
    type: 'house',
    city: 'Bangalore',
    area: 'Jayanagar',
    rentPaise: 1_20_000_00,
    depositPaise: 2_40_000_00,
    bedrooms: 4,
    bathrooms: 4,
    areaSqft: 2800,
    amenities: ['WiFi', 'AC', 'Parking', 'Garden', 'Servant Quarter', 'Power Backup'],
    imageUrls: ['https://images.example.com/habixo/blr-008-1.jpg'],
    ownerName: 'Vikram Shetty',
    available: true,
  },
];

// ---------------------------------------------------------------------------
// Fixtures — past bookings (one user)
// ---------------------------------------------------------------------------

/** Stable ISO date used to build past bookings. */
const NOW_MS = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

/** Three past bookings for the demo user, covering different statuses. */
const PAST_BOOKINGS: ReadonlyArray<HabixoBooking> = [
  {
    id: 'book-past-1',
    propertyId: 'prop-blr-001',
    userId: 'demo',
    startDate: new Date(NOW_MS - 60 * DAY_MS).toISOString(),
    endDate: new Date(NOW_MS - 30 * DAY_MS).toISOString(),
    status: 'completed',
    totalPaise: 35_000_00,
    bookedAt: new Date(NOW_MS - 65 * DAY_MS).toISOString(),
  },
  {
    id: 'book-past-2',
    propertyId: 'prop-blr-002',
    userId: 'demo',
    startDate: new Date(NOW_MS - 7 * DAY_MS).toISOString(),
    endDate: new Date(NOW_MS + 23 * DAY_MS).toISOString(),
    status: 'confirmed',
    totalPaise: 18_000_00,
    bookedAt: new Date(NOW_MS - 10 * DAY_MS).toISOString(),
  },
  {
    id: 'book-past-3',
    propertyId: 'prop-blr-006',
    userId: 'demo',
    startDate: new Date(NOW_MS + 2 * DAY_MS).toISOString(),
    status: 'pending',
    totalPaise: 500_00,
    bookedAt: new Date(NOW_MS - 1 * DAY_MS).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Fixtures — conversation messages
// ---------------------------------------------------------------------------

/** Mock conversation thread for the demo user. */
const FIXTURE_MESSAGES: ReadonlyArray<HabixoMessage> = [
  {
    id: 'msg-1',
    conversationId: 'conv-blr-001-demo',
    senderId: 'owner-priya',
    senderName: 'Priya Menon',
    content: 'Hi! Thanks for your interest in the 2BHK. When are you planning to move in?',
    timestamp: new Date(NOW_MS - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: 'msg-2',
    conversationId: 'conv-blr-001-demo',
    senderId: 'demo',
    senderName: 'You',
    content: 'Hello Priya, I am hoping to move in by the 1st of next month.',
    timestamp: new Date(NOW_MS - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: 'msg-3',
    conversationId: 'conv-blr-001-demo',
    senderId: 'owner-priya',
    senderName: 'Priya Menon',
    content: 'Great. I can do a video tour this Saturday at 11 AM. Does that work?',
    timestamp: new Date(NOW_MS - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: 'msg-4',
    conversationId: 'conv-blr-001-demo',
    senderId: 'owner-priya',
    senderName: 'Priya Menon',
    content: 'Also confirming — the deposit is 2 months rent, refundable at the end of the term.',
    timestamp: new Date(NOW_MS - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: false,
  },
];

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

/** Per-user booking store, lazily seeded with the past fixtures. */
const USER_BOOKING_STORE: Map<string, HabixoBooking[]> = new Map();

/** Lazily seed a user's booking store with the demo fixtures. */
function readUserBookings(userId: string): HabixoBooking[] {
  let existing = USER_BOOKING_STORE.get(userId);
  if (!existing) {
    existing = PAST_BOOKINGS.map((b) => ({ ...b, userId }));
    USER_BOOKING_STORE.set(userId, existing);
  }
  return existing;
}

function writeUserBookings(userId: string, bookings: HabixoBooking[]): void {
  USER_BOOKING_STORE.set(userId, bookings);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const PROPERTY_TYPES: ReadonlyArray<HabixoPropertyType> = [
  'apartment',
  'house',
  'office',
  'meeting_room',
  'pg',
  'studio',
];

const BOOKING_STATUSES: ReadonlyArray<HabixoBookingStatus> = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
];

function isPropertyType(value: unknown): value is HabixoPropertyType {
  return (
    typeof value === 'string' &&
    (PROPERTY_TYPES as ReadonlyArray<string>).includes(value)
  );
}

function isBookingStatus(value: unknown): value is HabixoBookingStatus {
  return (
    typeof value === 'string' &&
    (BOOKING_STATUSES as ReadonlyArray<string>).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Best-effort extraction of the authenticated user's id.
 *
 * Falls back to `'anonymous'` if the user is missing or the id field
 * can't be coerced to a non-empty string. The mock bookings are
 * seeded under this id so a fresh authenticated user sees the same
 * demo content.
 */
function extractUserId(req: { user?: unknown }): string {
  if (typeof req.user !== 'object' || req.user === null) return 'demo';
  const u = req.user as Record<string, unknown>;
  const candidates: unknown[] = [u['id'], u['_id'], u['userId']];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }
  return 'demo';
}

/** Coerce an unknown value to a non-negative integer (or `null`). */
function safeNonNegativeIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** Coerce an unknown value to a non-empty ISO date string (or `null`). */
function safeIsoDateOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * Compute the total paise for a booking. For stays, this is rent ×
 * number of months. For hourly (meeting rooms), it's rent × 1 (per
 * hour slot). The mock keeps the math simple — the real backend will
 * introduce a proper pricing engine.
 */
function computeTotalPaise(
  property: HabixoProperty,
  startDateMs: number,
  endDateMs: number | null,
): number {
  if (endDateMs === null) {
    // Hourly: single slot, full rent once.
    return property.rentPaise;
  }
  const diffMs = endDateMs - startDateMs;
  if (diffMs <= 0) return property.rentPaise;
  const months = diffMs / (30 * DAY_MS);
  // Round up to the nearest half-month so partial months still bill.
  const billableMonths = Math.max(1, Math.ceil(months * 2) / 2);
  return Math.round(property.rentPaise * billableMonths);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/** Every habixo endpoint requires authentication. */
router.use(authenticate);

/**
 * GET /api/b/habixo/properties
 *
 * Returns the property catalogue, optionally filtered by city, type,
 * and an inclusive paise price range. Filters are case-insensitive
 * and partial-match for `city`. Unknown `type` values are rejected
 * with HTTP 400.
 */
router.get('/properties', (req, res) => {
  const userId = extractUserId(req);
  const rawCity = req.query['city'];
  const rawType = req.query['type'];
  const rawMin = req.query['minRent'];
  const rawMax = req.query['maxRent'];

  const cityFilter =
    typeof rawCity === 'string' && rawCity.trim().length > 0
      ? rawCity.trim().toLowerCase()
      : null;

  let typeFilter: HabixoPropertyType | null = null;
  if (typeof rawType === 'string' && rawType.length > 0) {
    if (!isPropertyType(rawType)) {
      return bError(res, `Invalid type: ${rawType}`, 400, {
        allowedTypes: [...PROPERTY_TYPES],
      });
    }
    typeFilter = rawType;
  }

  const minRentPaise = safeNonNegativeIntOrNull(rawMin);
  const maxRentPaise = safeNonNegativeIntOrNull(rawMax);
  if (
    minRentPaise !== null &&
    maxRentPaise !== null &&
    minRentPaise > maxRentPaise
  ) {
    return bError(res, 'minRent cannot be greater than maxRent', 400, {
      minRent: minRentPaise,
      maxRent: maxRentPaise,
    });
  }

  const filtered = FIXTURE_PROPERTIES.filter((p) => {
    if (cityFilter !== null && !p.city.toLowerCase().includes(cityFilter)) {
      return false;
    }
    if (typeFilter !== null && p.type !== typeFilter) {
      return false;
    }
    if (minRentPaise !== null && p.rentPaise < minRentPaise) {
      return false;
    }
    if (maxRentPaise !== null && p.rentPaise > maxRentPaise) {
      return false;
    }
    return true;
  });

  try {
    logger.info('b_habixo_properties_query', {
      userId,
      city: cityFilter,
      type: typeFilter,
      minRent: minRentPaise,
      maxRent: maxRentPaise,
      count: filtered.length,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, {
    properties: filtered.map((p) => ({ ...p })),
    total: filtered.length,
    filters: {
      city: cityFilter,
      type: typeFilter,
      minRent: minRentPaise,
      maxRent: maxRentPaise,
    },
  });
});

/**
 * POST /api/b/habixo/book
 *
 * Books a property. Body: { propertyId, startDate, endDate? }.
 * Returns the new `HabixoBooking` with `status: 'confirmed'`.
 */
router.post('/book', (req, res) => {
  const userId = extractUserId(req);
  const body = (typeof req.body === 'object' && req.body !== null
    ? req.body
    : {}) as Record<string, unknown>;
  const propertyId =
    typeof body['propertyId'] === 'string' ? body['propertyId'] : '';
  const startDate = safeIsoDateOrNull(body['startDate']);
  const endDate = safeIsoDateOrNull(body['endDate']);

  if (propertyId.length === 0) {
    return bError(res, 'Missing propertyId', 400);
  }
  if (startDate === null) {
    return bError(res, 'Missing or invalid startDate', 400);
  }
  const property = FIXTURE_PROPERTIES.find((p) => p.id === propertyId);
  if (!property) {
    return bError(res, `Property not found: ${propertyId}`, 404);
  }
  if (!property.available) {
    return bError(
      res,
      `Property ${propertyId} is currently unavailable`,
      409,
    );
  }

  const startDateMs = new Date(startDate).getTime();
  const endDateMs = endDate === null ? null : new Date(endDate).getTime();
  if (endDateMs !== null && endDateMs < startDateMs) {
    return bError(res, 'endDate cannot be before startDate', 400);
  }

  const bookedAtMs = Date.now();
  const totalPaise = computeTotalPaise(property, startDateMs, endDateMs);
  const booking: HabixoBooking = {
    id: `book-${userId}-${bookedAtMs}`,
    propertyId: property.id,
    userId,
    startDate,
    ...(endDate !== null ? { endDate } : {}),
    status: 'confirmed',
    totalPaise,
    bookedAt: new Date(bookedAtMs).toISOString(),
  };

  const bookings = readUserBookings(userId);
  bookings.unshift(booking);
  writeUserBookings(userId, bookings);

  try {
    logger.info('b_habixo_property_booked', {
      userId,
      propertyId: property.id,
      bookingId: booking.id,
      totalPaise,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, { booking });
});

/**
 * GET /api/b/habixo/bookings
 *
 * Returns the user's full booking history, most recent first. Lazily
 * seeds with the past fixtures on first read.
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
    logger.info('b_habixo_bookings_query', {
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
 * POST /api/b/habixo/bookings/:id/cancel
 *
 * Cancels a booking by id. The booking must belong to the authenticated
 * user and be in a non-terminal status. Unknown ids are rejected with
 * HTTP 404; bookings in a terminal status are rejected with HTTP 409.
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
  if (existing.status === 'cancelled' || existing.status === 'completed') {
    return bError(
      res,
      `Cannot cancel a booking in status: ${existing.status}`,
      409,
      { currentStatus: existing.status },
    );
  }
  const updated: HabixoBooking = {
    ...existing,
    status: 'cancelled',
  };
  bookings[index] = updated;
  writeUserBookings(userId, bookings);

  try {
    logger.info('b_habixo_booking_cancelled', {
      userId,
      bookingId: updated.id,
      propertyId: updated.propertyId,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, { booking: updated });
});

/**
 * GET /api/b/habixo/messages/:conversationId
 *
 * Returns the messages in a conversation thread. The mock always
 * returns the same fixture thread regardless of the supplied
 * `conversationId` — a real implementation will scope by id.
 */
router.get('/messages/:conversationId', (req, res) => {
  const userId = extractUserId(req);
  const conversationId = req.params['conversationId'];
  if (typeof conversationId !== 'string' || conversationId.length === 0) {
    return bError(res, 'Missing conversationId', 400);
  }
  try {
    logger.info('b_habixo_messages_query', {
      userId,
      conversationId,
      count: FIXTURE_MESSAGES.length,
    });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(res, {
    conversationId,
    messages: FIXTURE_MESSAGES.map((m) => ({ ...m })),
  });
});

/**
 * Type-guard helper re-exported for tests / future shared use.
 * The frontend mirrors the same union.
 */
export const __test = {
  FIXTURE_PROPERTIES,
  PAST_BOOKINGS,
  FIXTURE_MESSAGES,
  PROPERTY_TYPES,
  BOOKING_STATUSES,
  isPropertyType,
  isBookingStatus,
};

export default router;
