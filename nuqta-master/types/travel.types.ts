/**
 * Travel module — shared type definitions (Phase 4.4).
 *
 * The Travel module aggregates inventory across five travel verticals —
 * flights, hotels, trains, cabs, and buses — and exposes a single
 * search / book surface to the rest of the app. The frontend is the
 * canonical read shape; the backend (`src/routes/b/travel.ts`) emits
 * equivalent payloads.
 *
 * Money convention
 * ----------------
 *  - All amounts on the wire are integer paise (1/100 of a rupee).
 *  - The UI is responsible for dividing by 100 and formatting via
 *    `formatPrice(...)` from `@/utils/priceFormatter`.
 *
 * Recent searches
 * ---------------
 * Recent searches are persisted to AsyncStorage under the key
 * `STORAGE_KEYS.TRAVEL_RECENT_SEARCHES`. They are stored as an array
 * of `TravelSearchQuery` with the most-recent first; the hook trims
 * to a configurable cap (default 8) on every write.
 */

/** Top-level travel categories exposed in the search UI. */
export const TRAVEL_CATEGORIES = [
  'flight',
  'hotel',
  'train',
  'cab',
  'bus',
] as const;

/** Union of valid category strings. */
export type TravelCategory = (typeof TRAVEL_CATEGORIES)[number];

/** Human-readable label for a category — used as the tab title. */
export const TRAVEL_CATEGORY_LABELS: Record<TravelCategory, string> = {
  flight: 'Flights',
  hotel: 'Hotels',
  train: 'Trains',
  cab: 'Cabs',
  bus: 'Buses',
};

/** Storage key for the persisted recent-searches list. */
export const TRAVEL_STORAGE_KEYS = {
  /** Persisted recent searches, JSON-serialised `TravelSearchQuery[]`. */
  RECENT_SEARCHES: 'b_travel_recent_searches_v1',
} as const;

/**
 * Maximum number of recent searches retained in AsyncStorage.
 * Trimming happens on every write.
 */
export const TRAVEL_RECENT_SEARCHES_CAP = 8;

/** Lifecycle state for a `TravelBooking`. */
export type TravelBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

/**
 * Search query supplied by the user.
 *
 * `category` is part of the query so the same shape can drive all
 * five verticals. `returnDate` is only meaningful for round-trip
 * flights; hotels / trains / cabs / buses treat it as advisory.
 */
export interface TravelSearchQuery {
  /** Origin city / airport / station code, e.g. "BLR" or "Bengaluru". */
  from: string;
  /** Destination city / airport / station code, e.g. "DEL" or "Delhi". */
  to: string;
  /** ISO-8601 date string, e.g. "2026-07-15". */
  departDate: string;
  /** Optional ISO-8601 date string for round trips. */
  returnDate?: string;
  /** Number of passengers / rooms. Always >= 1. */
  passengers: number;
  /** Which vertical this query is for. */
  category: TravelCategory;
}

/**
 * A single search result — one flight / hotel room / train seat / cab
 * quote / bus ticket option.
 *
 * `pricePaise` is the final amount the user pays. `originalPricePaise`,
 * when set and greater than `pricePaise`, drives a strikethrough +
 * discount badge. `durationMinutes` is optional because hotels don't
 * have a meaningful duration; `rating` is optional because flights /
 * trains often don't surface a user rating.
 */
export interface TravelResult {
  /** Stable opaque id used as a `FlatList` key and analytics id. */
  id: string;
  /** Which vertical produced this result. */
  category: TravelCategory;
  /** Provider display name, e.g. "IndiGo", "OYO", "IRCTC", "Ola", "RedBus". */
  provider: string;
  /** Display title — flight number, hotel name, train name, etc. */
  title: string;
  /** Selling price in paise. */
  pricePaise: number;
  /** Optional pre-discount price in paise; used for strikethrough. */
  originalPricePaise?: number;
  /** Duration in minutes (flight leg, train journey, cab ride). */
  durationMinutes?: number;
  /** Average user rating 0-5, one decimal. */
  rating?: number;
  /** Optional thumbnail image URL (provider logo, hotel photo). */
  thumbnailUrl?: string;
  /**
   * Deep link the user can follow to complete checkout on the
   * provider's surface. In the migration phase this is a stub.
   */
  deepLink: string;
}

/**
 * A booking the user has placed on a `TravelResult`.
 *
 * `details` is a free-form key/value bag the UI can render as a
 * summary. The backend seeds it with the originating search query +
 * a few display strings so the "My trips" view is self-contained.
 */
export interface TravelBooking {
  id: string;
  /** The `TravelResult.id` the booking was made against. */
  resultId: string;
  /** Owning user id (extracted from the auth token server-side). */
  userId: string;
  status: TravelBookingStatus;
  /** Total amount in paise. */
  totalPaise: number;
  /** ISO-8601 timestamp the booking was created. */
  bookedAt: string;
  /** Provider-issued confirmation code. */
  confirmationCode: string;
  /** Free-form details — title, provider, category, etc. */
  details: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

/** Type-guard for `TravelCategory`. */
export function isTravelCategory(value: unknown): value is TravelCategory {
  return (
    typeof value === 'string' &&
    (TRAVEL_CATEGORIES as ReadonlyArray<string>).includes(value)
  );
}

/** Type-guard for `TravelBookingStatus`. */
export function isTravelBookingStatus(value: unknown): value is TravelBookingStatus {
  return (
    typeof value === 'string' &&
    (value === 'pending' ||
      value === 'confirmed' ||
      value === 'cancelled' ||
      value === 'completed')
  );
}

/** Type-guard for `TravelSearchQuery`. */
export function isTravelSearchQuery(value: unknown): value is TravelSearchQuery {
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

/** Type-guard for `TravelResult`. */
export function isTravelResult(value: unknown): value is TravelResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    isTravelCategory(v.category) &&
    typeof v.provider === 'string' &&
    v.provider.length > 0 &&
    typeof v.title === 'string' &&
    v.title.length > 0 &&
    typeof v.pricePaise === 'number' &&
    Number.isFinite(v.pricePaise) &&
    v.pricePaise >= 0 &&
    (v.originalPricePaise === undefined ||
      (typeof v.originalPricePaise === 'number' &&
        Number.isFinite(v.originalPricePaise) &&
        v.originalPricePaise >= 0)) &&
    (v.durationMinutes === undefined ||
      (typeof v.durationMinutes === 'number' &&
        Number.isFinite(v.durationMinutes) &&
        v.durationMinutes >= 0)) &&
    (v.rating === undefined ||
      (typeof v.rating === 'number' &&
        Number.isFinite(v.rating) &&
        v.rating >= 0 &&
        v.rating <= 5)) &&
    (v.thumbnailUrl === undefined || typeof v.thumbnailUrl === 'string') &&
    typeof v.deepLink === 'string'
  );
}

/** Type-guard for `TravelBooking`. */
export function isTravelBooking(value: unknown): value is TravelBooking {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.resultId === 'string' &&
    v.resultId.length > 0 &&
    typeof v.userId === 'string' &&
    isTravelBookingStatus(v.status) &&
    typeof v.totalPaise === 'number' &&
    Number.isFinite(v.totalPaise) &&
    v.totalPaise >= 0 &&
    typeof v.bookedAt === 'string' &&
    typeof v.confirmationCode === 'string' &&
    typeof v.details === 'object' &&
    v.details !== null
  );
}

// ---------------------------------------------------------------------------
// Normalisers
// ---------------------------------------------------------------------------

/** Normalise a raw payload into `TravelResult[]`. */
export function normalizeTravelResults(raw: unknown): TravelResult[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: TravelResult[] = [];
  for (const value of raw) {
    if (!isTravelResult(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    clean.push(value);
  }
  return clean;
}

/** Normalise a raw payload into `TravelBooking[]`. */
export function normalizeTravelBookings(raw: unknown): TravelBooking[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: TravelBooking[] = [];
  for (const value of raw) {
    if (!isTravelBooking(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    clean.push(value);
  }
  // Most-recent first.
  clean.sort((a, b) => {
    const aMs = new Date(a.bookedAt).getTime();
    const bMs = new Date(b.bookedAt).getTime();
    return bMs - aMs;
  });
  return clean;
}

/** Normalise a raw payload into `TravelSearchQuery[]`. */
export function normalizeRecentSearches(raw: unknown): TravelSearchQuery[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: TravelSearchQuery[] = [];
  for (const value of raw) {
    if (!isTravelSearchQuery(value)) continue;
    // Dedup by content — not just by id.
    const key = `${value.category}|${value.from.toLowerCase()}|${value.to.toLowerCase()}|${value.departDate}|${value.returnDate ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(value);
  }
  return clean;
}
