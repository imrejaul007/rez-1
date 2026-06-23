/**
 * Try module routes — REZ-vs-NUQTA migration (Phase 4.3)
 *
 * Sub-router mounted under `/api/b/try`. Powers the B-side Try module:
 * trial products, bundles, and booking lifecycle.
 *
 * Endpoints
 * ---------
 *   GET  /api/b/try/products?category=
 *     Returns the trial product catalogue, optionally filtered by
 *     category. Category values: beauty | food | fitness | electronics.
 *     Response:
 *       { products: TrialProduct[], total: number, category: string }
 *
 *   GET  /api/b/try/bundles
 *     Returns the curated trial bundles (3 fixtures).
 *     Response:
 *       { bundles: TrialBundle[] }
 *
 *   POST /api/b/try/products/:id/book
 *     Books a trial of the product. Response:
 *       { booking: TrialBooking }
 *
 *   GET  /api/b/try/bookings
 *     Returns the authenticated user's booking history (3 fixtures).
 *     Response:
 *       { bookings: TrialBooking[] }
 *
 *   POST /api/b/try/bookings/:id/cancel
 *     Cancels an active booking. Response:
 *       { booking: TrialBooking }
 *
 * Persistence: in-memory maps keyed by user id; the contract is the
 * stable surface and the backing store will be swapped for Mongo
 * once the migration is complete.
 *
 * Mounted in `src/routes/b/index.ts` as
 *     router.use('/try', tryBRoutes);
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bSuccess, bError } from '../../utils/bResponse';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Top-level product categories exposed in the Try catalogue. */
export const TRIAL_CATEGORIES = [
  'beauty',
  'food',
  'fitness',
  'electronics',
] as const;

export type TrialCategory = (typeof TRIAL_CATEGORIES)[number];

/** Lifecycle state for a `TrialBooking`. */
export type TrialBookingStatus = 'active' | 'expired' | 'converted' | 'cancelled';

/** One trial product in the catalogue. */
export interface TrialProduct {
  id: string;
  name: string;
  description: string;
  brand: string;
  category: TrialCategory;
  trialPricePaise: number;
  fullPricePaise: number;
  durationDays: number;
  availableAt: string[];
  imageUrl?: string;
  rating: number;
  trialCount: number;
}

/** Curated bundle of trial products. */
export interface TrialBundle {
  id: string;
  name: string;
  productIds: string[];
  bundlePricePaise: number;
  savingsPaise: number;
  isLimited: boolean;
  expiresAt?: string;
}

/** A single booking made by a user. */
export interface TrialBooking {
  id: string;
  productId: string;
  bookedAt: string;
  trialEndsAt: string;
  status: TrialBookingStatus;
  coinsUsed: number;
}

// ---------------------------------------------------------------------------
// Fixtures — products
// ---------------------------------------------------------------------------

/** Indian D2C brands, prices, and trial windows representative of the
 *  Indian e-commerce market. Prices are in paise. */
const TRIAL_PRODUCTS: ReadonlyArray<TrialProduct> = [
  {
    id: 'trial-lakme-skingloss',
    name: 'Lakme Absolute Skin Gloss Gel Creme',
    description: 'Oil-free, dewy-finish hydrating gel creme for normal to combination skin.',
    brand: 'Lakme',
    category: 'beauty',
    trialPricePaise: 4900,
    fullPricePaise: 87500,
    durationDays: 7,
    availableAt: ['Mumbai', 'Delhi', 'Bangalore', 'Pune'],
    imageUrl: 'https://images.example.com/lakme-skingloss.jpg',
    rating: 4.4,
    trialCount: 12450,
  },
  {
    id: 'trial-mamaearth-teatree',
    name: 'Mamaearth Tea Tree Face Wash',
    description: 'Tea tree + salicylic acid face wash for acne-prone skin, sulphate free.',
    brand: 'Mamaearth',
    category: 'beauty',
    trialPricePaise: 4900,
    fullPricePaise: 39900,
    durationDays: 7,
    availableAt: ['Pan-India'],
    imageUrl: 'https://images.example.com/mamaearth-teatree.jpg',
    rating: 4.5,
    trialCount: 23890,
  },
  {
    id: 'trial-wow-applecidervinegar',
    name: 'Wow Apple Cider Vinegar Shampoo',
    description: 'ACV + biotin shampoo for hair growth and shine, no parabens.',
    brand: 'Wow',
    category: 'beauty',
    trialPricePaise: 4900,
    fullPricePaise: 54900,
    durationDays: 7,
    availableAt: ['Pan-India'],
    imageUrl: 'https://images.example.com/wow-acv.jpg',
    rating: 4.3,
    trialCount: 18200,
  },
  {
    id: 'trial-yoga-bar-choco',
    name: 'Yoga Bar Chocolate Protein Bar',
    description: '20g protein, no added sugar — the perfect post-workout snack.',
    brand: 'Yoga Bar',
    category: 'food',
    trialPricePaise: 4900,
    fullPricePaise: 19900,
    durationDays: 14,
    availableAt: ['Pan-India'],
    imageUrl: 'https://images.example.com/yogabar-choco.jpg',
    rating: 4.6,
    trialCount: 9410,
  },
  {
    id: 'trial-soulfull-ragi',
    name: 'Soulfull Millet Muesli',
    description: 'Ragi + oats muesli with real fruit — a fibre-rich breakfast bowl.',
    brand: 'Soulfull',
    category: 'food',
    trialPricePaise: 4900,
    fullPricePaise: 35000,
    durationDays: 14,
    availableAt: ['Pan-India'],
    imageUrl: 'https://images.example.com/soulfull-ragi.jpg',
    rating: 4.4,
    trialCount: 7200,
  },
  {
    id: 'trial-curefit-cultplay',
    name: 'Cult.fit Play — 5 Class Pass',
    description: '5 group classes at any Cult.fit centre near you — yoga, HIIT, dance.',
    brand: 'Cult.fit',
    category: 'fitness',
    trialPricePaise: 9900,
    fullPricePaise: 99900,
    durationDays: 30,
    availableAt: ['Bangalore', 'Hyderabad', 'Mumbai', 'Delhi', 'Chennai'],
    imageUrl: 'https://images.example.com/cult-play.jpg',
    rating: 4.7,
    trialCount: 5610,
  },
  {
    id: 'trial-boat-airdopes141',
    name: 'boAt Airdopes 141 TWS Earbuds',
    description: '42h playback, ENx tech, IPX4 — true wireless for everyday use.',
    brand: 'boAt',
    category: 'electronics',
    trialPricePaise: 19900,
    fullPricePaise: 449000,
    durationDays: 7,
    availableAt: ['Pan-India'],
    imageUrl: 'https://images.example.com/boat-airdopes-141.jpg',
    rating: 4.2,
    trialCount: 31250,
  },
  {
    id: 'trial-noise-colorfitpro4',
    name: 'Noise ColorFit Pro 4 Smartwatch',
    description: 'AMOLED display, Bluetooth calling, 100+ sports modes, 7-day battery.',
    brand: 'Noise',
    category: 'electronics',
    trialPricePaise: 19900,
    fullPricePaise: 599900,
    durationDays: 7,
    availableAt: ['Pan-India'],
    imageUrl: 'https://images.example.com/noise-colorfit-pro-4.jpg',
    rating: 4.3,
    trialCount: 19840,
  },
  {
    id: 'trial-plix-acne',
    name: 'Plix Acne Clear Green Tea Serum',
    description: 'Plant-based acne-clearing serum with green tea + niacinamide.',
    brand: 'Plix',
    category: 'beauty',
    trialPricePaise: 4900,
    fullPricePaise: 49900,
    durationDays: 7,
    availableAt: ['Pan-India'],
    imageUrl: 'https://images.example.com/plix-acne.jpg',
    rating: 4.1,
    trialCount: 4120,
  },
  {
    id: 'trial-sweat-yogamat',
    name: 'SWEAT Yoga Mat 6mm Anti-Slip',
    description: 'Eco-friendly TPE yoga mat with carry strap — for home or studio.',
    brand: 'SWEAT',
    category: 'fitness',
    trialPricePaise: 9900,
    fullPricePaise: 199900,
    durationDays: 14,
    availableAt: ['Pan-India'],
    imageUrl: 'https://images.example.com/sweat-mat.jpg',
    rating: 4.5,
    trialCount: 3100,
  },
];

/** Curated bundles. `savingsPaise` is pre-computed. */
const TRIAL_BUNDLES: ReadonlyArray<TrialBundle> = [
  {
    id: 'bundle-student-skincare',
    name: 'Student Skincare Trio',
    productIds: ['trial-mamaearth-teatree', 'trial-plix-acne', 'trial-lakme-skingloss'],
    bundlePricePaise: 9900,
    savingsPaise: 4800,
    isLimited: true,
    expiresAt: '2026-07-15T23:59:59.000Z',
  },
  {
    id: 'bundle-weekend-glow',
    name: 'Weekend Glow Hair + Skin Kit',
    productIds: ['trial-wow-applecidervinegar', 'trial-lakme-skingloss'],
    bundlePricePaise: 7900,
    savingsPaise: 1900,
    isLimited: false,
  },
  {
    id: 'bundle-fit-starter',
    name: 'Fit Starter Pack',
    productIds: ['trial-curefit-cultplay', 'trial-sweat-yogamat', 'trial-yoga-bar-choco'],
    bundlePricePaise: 19900,
    savingsPaise: 4800,
    isLimited: true,
    expiresAt: '2026-07-31T23:59:59.000Z',
  },
];

// ---------------------------------------------------------------------------
// Fixtures — past bookings (one user)
// ---------------------------------------------------------------------------

/** Stable ISO date used to build past bookings. Computed relative to
 *  module-load so the demo is "fresh" without needing a clock service. */
const NOW_MS = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

/** Three past bookings for the demo user. */
const PAST_BOOKINGS: ReadonlyArray<TrialBooking> = [
  {
    id: 'book-past-1',
    productId: 'trial-mamaearth-teatree',
    bookedAt: new Date(NOW_MS - 30 * DAY_MS).toISOString(),
    trialEndsAt: new Date(NOW_MS - 23 * DAY_MS).toISOString(),
    status: 'converted',
    coinsUsed: 250,
  },
  {
    id: 'book-past-2',
    productId: 'trial-wow-applecidervinegar',
    bookedAt: new Date(NOW_MS - 14 * DAY_MS).toISOString(),
    trialEndsAt: new Date(NOW_MS - 7 * DAY_MS).toISOString(),
    status: 'expired',
    coinsUsed: 250,
  },
  {
    id: 'book-past-3',
    productId: 'trial-yoga-bar-choco',
    bookedAt: new Date(NOW_MS - 3 * DAY_MS).toISOString(),
    trialEndsAt: new Date(NOW_MS + 11 * DAY_MS).toISOString(),
    status: 'active',
    coinsUsed: 250,
  },
];

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

/** Per-user booking store, lazily seeded with the past fixtures. */
const USER_BOOKING_STORE: Map<string, TrialBooking[]> = new Map();

/** Lazily seed a user's booking store with the demo fixtures. */
function readUserBookings(userId: string): TrialBooking[] {
  let existing = USER_BOOKING_STORE.get(userId);
  if (!existing) {
    existing = PAST_BOOKINGS.map((b) => ({ ...b }));
    USER_BOOKING_STORE.set(userId, existing);
  }
  return existing;
}

function writeUserBookings(userId: string, bookings: TrialBooking[]): void {
  USER_BOOKING_STORE.set(userId, bookings);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isTrialCategory(value: unknown): value is TrialCategory {
  return (
    typeof value === 'string' &&
    (TRIAL_CATEGORIES as ReadonlyArray<string>).includes(value)
  );
}

function isBookingStatus(value: unknown): value is TrialBookingStatus {
  return (
    typeof value === 'string' &&
    (value === 'active' ||
      value === 'expired' ||
      value === 'converted' ||
      value === 'cancelled')
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute `trialEndsAt` from `bookedAt` + `durationDays`. */
function computeTrialEndsAt(bookedAtMs: number, durationDays: number): string {
  return new Date(bookedAtMs + durationDays * DAY_MS).toISOString();
}

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

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/** Every try endpoint requires authentication. */
router.use(authenticate);

/**
 * GET /api/b/try/products
 *
 * Returns the trial product catalogue. The optional `category` query
 * parameter filters by `TrialCategory` (e.g. `?category=beauty`).
 * Unknown categories are rejected with HTTP 400. If omitted, every
 * product is returned.
 */
router.get('/products', (req, res) => {
  const userId = extractUserId(req);
  const rawCategory = req.query['category'];
  let filtered: ReadonlyArray<TrialProduct> = TRIAL_PRODUCTS;
  let category: string = 'all';
  if (typeof rawCategory === 'string' && rawCategory.length > 0) {
    if (!isTrialCategory(rawCategory)) {
      return bError(res, `Invalid category: ${rawCategory}`, 400, {
        allowedCategories: [...TRIAL_CATEGORIES],
      });
    }
    filtered = TRIAL_PRODUCTS.filter((p) => p.category === rawCategory);
    category = rawCategory;
  }
  try {
    logger.info('b_try_products_query', {
      userId,
      category,
      count: filtered.length,
    });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(res, {
    products: filtered.map((p) => ({ ...p })),
    total: filtered.length,
    category,
  });
});

/**
 * GET /api/b/try/bundles
 *
 * Returns the curated trial bundles. Category-independent.
 */
router.get('/bundles', (req, res) => {
  const userId = extractUserId(req);
  try {
    logger.info('b_try_bundles_query', {
      userId,
      count: TRIAL_BUNDLES.length,
    });
  } catch {
    /* logger must never block the response */
  }
  return bSuccess(res, {
    bundles: TRIAL_BUNDLES.map((b) => ({ ...b })),
  });
});

/**
 * POST /api/b/try/products/:id/book
 *
 * Books a trial of the supplied product id. Returns a fresh
 * `TrialBooking` with `status: 'active'` and `trialEndsAt` computed
 * from the product's `durationDays`. Unknown product ids are rejected
 * with HTTP 404.
 */
router.post('/products/:id/book', (req, res) => {
  const userId = extractUserId(req);
  const productId = req.params['id'];
  if (typeof productId !== 'string' || productId.length === 0) {
    return bError(res, 'Missing product id', 400);
  }
  const product = TRIAL_PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    return bError(res, `Product not found: ${productId}`, 404);
  }

  const bookedAtMs = Date.now();
  const booking: TrialBooking = {
    id: `book-${userId}-${bookedAtMs}`,
    productId: product.id,
    bookedAt: new Date(bookedAtMs).toISOString(),
    trialEndsAt: computeTrialEndsAt(bookedAtMs, product.durationDays),
    status: 'active',
    coinsUsed: 250,
  };

  const bookings = readUserBookings(userId);
  bookings.unshift(booking);
  writeUserBookings(userId, bookings);

  try {
    logger.info('b_try_product_booked', {
      userId,
      productId: product.id,
      bookingId: booking.id,
      coinsUsed: booking.coinsUsed,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, { booking });
});

/**
 * GET /api/b/try/bookings
 *
 * Returns the user's full booking history, most-recent first. Lazily
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
    logger.info('b_try_bookings_query', {
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
 * POST /api/b/try/bookings/:id/cancel
 *
 * Cancels a booking by id. The booking must belong to the authenticated
 * user and be in `active` status. Unknown ids are rejected with HTTP
 * 404; bookings in a terminal status are rejected with HTTP 409.
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
  if (existing.status !== 'active') {
    return bError(
      res,
      `Cannot cancel a booking in status: ${existing.status}`,
      409,
      { currentStatus: existing.status },
    );
  }
  const updated: TrialBooking = {
    ...existing,
    status: 'cancelled',
  };
  bookings[index] = updated;
  writeUserBookings(userId, bookings);

  try {
    logger.info('b_try_booking_cancelled', {
      userId,
      bookingId: updated.id,
      productId: updated.productId,
    });
  } catch {
    /* logger must never block the response */
  }

  return bSuccess(res, { booking: updated });
});

/** Re-exported for tests / future shared use. */
export const __test = { TRIAL_PRODUCTS, TRIAL_BUNDLES, PAST_BOOKINGS };

export default router;
