/**
 * Salon booking — shared type definitions (Phase 4.6).
 *
 * The Salon module lets users discover nearby salons in Bangalore (Lakme,
 * Naturals, Jawed Habib, etc.), browse the services each one offers, pick
 * a stylist, and book a time slot. Users can also see and cancel their
 * upcoming bookings.
 *
 * Types are duplicated between frontend and backend so either side can
 * evolve the contract in lock-step. Frontend definitions are the
 * canonical read shape; the backend (`src/routes/b/salonInfluencer.ts`)
 * produces equivalent payloads.
 *
 * Money convention
 * ----------------
 *  - All amounts on the wire are integer paise (1/100 of a rupee).
 *  - The UI is responsible for dividing by 100 and formatting via
 *    `formatPrice(...)` from `@/utils/priceFormatter`.
 *
 * Price range
 * -----------
 *  - `priceRange` is a three-tier budget signal displayed as `₹` / `₹₹`
 *    / `₹₹₹` rather than an exact number — the booking flow picks the
 *    exact paise figure from the chosen service.
 */

/**
 * Three-tier visual price range.
 *
 * Mapped to a 0/1/2 ordering when sorting ("affordable first"). The
 * raw string is rendered verbatim in the salon card.
 */
export const SALON_PRICE_RANGES = ['₹', '₹₹', '₹₹₹'] as const;

/** Union of valid price-range labels. */
export type SalonPriceRange = (typeof SALON_PRICE_RANGES)[number];

/**
 * Lifecycle state for a `SalonBooking`.
 *
 *  - `pending`   — booking created, awaiting salon confirmation.
 *  - `confirmed` — salon accepted the booking; user is expected to show up.
 *  - `cancelled` — booking was cancelled (by user or salon). Terminal.
 *  - `completed` — service was rendered. Terminal.
 */
export type SalonBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

/** Categorisation of a salon service. Mirrors the backend fixture set. */
export type SalonServiceCategory =
  | 'haircut'
  | 'color'
  | 'spa'
  | 'facial'
  | 'waxing'
  | 'manicure'
  | 'pedicure'
  | 'threading'
  | 'makeup'
  | 'other';

/**
 * A single salon in the discovery feed.
 *
 * `imageUrl`, `nextAvailableSlot` are optional — backend fixtures don't
 * always provide them, and the UI degrades gracefully (placeholder tile,
 * "Book now" CTA without a specific time).
 */
export interface Salon {
  /** Stable opaque id used as a `FlatList` key and analytics id. */
  id: string;
  /** Display name, e.g. "Lakme Salon – Koramangala". */
  name: string;
  /** Locality / micro-area, e.g. "Koramangala". */
  area: string;
  /** City, e.g. "Bangalore". */
  city: string;
  /** Average user rating, 0-5 with one decimal. */
  rating: number;
  /** Total historical review count. */
  reviewCount: number;
  /** Visual price tier. */
  priceRange: SalonPriceRange;
  /** Optional hero image URL. */
  imageUrl?: string;
  /** Free-text specialty tags, e.g. ["Hair Color", "Keratin"]. */
  specialties: string[];
  /** Whether the salon is currently open. */
  isOpen: boolean;
  /** Optional next-available time slot as ISO-8601, e.g. "2026-06-21T15:30:00.000Z". */
  nextAvailableSlot?: string;
}

/**
 * A service offered by a salon (e.g. "Haircut – 45 min – ₹400").
 *
 * Services are looked up by id from the booking flow when the user
 * confirms a slot.
 */
export interface SalonService {
  /** Stable opaque id, scoped to the parent salon. */
  id: string;
  /** Display name, e.g. "Classic Haircut". */
  name: string;
  /** Estimated duration in minutes (used for slot resolution). */
  durationMinutes: number;
  /** Price in paise. */
  pricePaise: number;
  /** Service category — used for filters and analytics. */
  category: SalonServiceCategory;
}

/**
 * A stylist working at a salon. Optional during booking — when omitted,
 * the system assigns the next available stylist.
 */
export interface SalonStylist {
  id: string;
  /** Display name, e.g. "Priya N.". */
  name: string;
  /** Average rating, 0-5 with one decimal. */
  rating: number;
  /** Free-text specialties, e.g. ["Balayage", "Curly Hair"]. */
  specialties: string[];
}

/**
 * A confirmed/pending booking made by a user.
 *
 * `totalPaise` is the sum of the service price (+ any add-ons); the UI
 * uses this to render the booking receipt without re-fetching services.
 */
export interface SalonBooking {
  id: string;
  /** Foreign key into `Salon.id`. */
  salonId: string;
  /** Foreign key into `SalonService.id`. */
  serviceId: string;
  /** Optional foreign key into `SalonStylist.id`. */
  stylistId?: string;
  /** ISO-8601 timestamp of the booked slot. */
  slot: string;
  /** Lifecycle state. */
  status: SalonBookingStatus;
  /** Total booking amount in paise. */
  totalPaise: number;
  /** ISO-8601 timestamp the booking was created. */
  bookedAt: string;
}

// ---------------------------------------------------------------------------
// Type-guards
// ---------------------------------------------------------------------------

/** Type-guard — `SalonPriceRange`. */
export function isSalonPriceRange(value: unknown): value is SalonPriceRange {
  return (
    typeof value === 'string' &&
    (SALON_PRICE_RANGES as ReadonlyArray<string>).includes(value)
  );
}

/** Type-guard — `SalonBookingStatus`. */
export function isSalonBookingStatus(value: unknown): value is SalonBookingStatus {
  return (
    typeof value === 'string' &&
    (value === 'pending' ||
      value === 'confirmed' ||
      value === 'cancelled' ||
      value === 'completed')
  );
}

/** Type-guard — `SalonServiceCategory`. */
export function isSalonServiceCategory(
  value: unknown,
): value is SalonServiceCategory {
  if (typeof value !== 'string') return false;
  switch (value) {
    case 'haircut':
    case 'color':
    case 'spa':
    case 'facial':
    case 'waxing':
    case 'manicure':
    case 'pedicure':
    case 'threading':
    case 'makeup':
    case 'other':
      return true;
    default:
      return false;
  }
}

/** Type-guard — `Salon`. Extra fields are allowed and ignored. */
export function isSalon(value: unknown): value is Salon {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.area === 'string' &&
    typeof v.city === 'string' &&
    typeof v.rating === 'number' &&
    Number.isFinite(v.rating) &&
    v.rating >= 0 &&
    v.rating <= 5 &&
    typeof v.reviewCount === 'number' &&
    Number.isFinite(v.reviewCount) &&
    v.reviewCount >= 0 &&
    isSalonPriceRange(v.priceRange) &&
    (v.imageUrl === undefined || typeof v.imageUrl === 'string') &&
    Array.isArray(v.specialties) &&
    v.specialties.every((s) => typeof s === 'string') &&
    typeof v.isOpen === 'boolean' &&
    (v.nextAvailableSlot === undefined || typeof v.nextAvailableSlot === 'string')
  );
}

/** Type-guard — `SalonService`. */
export function isSalonService(value: unknown): value is SalonService {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.durationMinutes === 'number' &&
    Number.isFinite(v.durationMinutes) &&
    v.durationMinutes > 0 &&
    typeof v.pricePaise === 'number' &&
    Number.isFinite(v.pricePaise) &&
    v.pricePaise >= 0 &&
    isSalonServiceCategory(v.category)
  );
}

/** Type-guard — `SalonStylist`. */
export function isSalonStylist(value: unknown): value is SalonStylist {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.rating === 'number' &&
    Number.isFinite(v.rating) &&
    v.rating >= 0 &&
    v.rating <= 5 &&
    Array.isArray(v.specialties) &&
    v.specialties.every((s) => typeof s === 'string')
  );
}

/** Type-guard — `SalonBooking`. */
export function isSalonBooking(value: unknown): value is SalonBooking {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.salonId === 'string' &&
    typeof v.serviceId === 'string' &&
    (v.stylistId === undefined || typeof v.stylistId === 'string') &&
    typeof v.slot === 'string' &&
    isSalonBookingStatus(v.status) &&
    typeof v.totalPaise === 'number' &&
    Number.isFinite(v.totalPaise) &&
    v.totalPaise >= 0 &&
    typeof v.bookedAt === 'string'
  );
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

/**
 * Normalise a raw backend payload into clean `Salon[]`.
 *
 * Drops invalid entries, deduplicates by `id`, preserves the order the
 * backend emitted them in. Returns an empty array if nothing valid is
 * present — never throws.
 */
export function normalizeSalons(raw: unknown): Salon[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: Salon[] = [];
  for (const value of raw) {
    if (!isSalon(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    clean.push(value);
  }
  return clean;
}

/** Normalise a raw payload into `SalonService[]`. */
export function normalizeSalonServices(raw: unknown): SalonService[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: SalonService[] = [];
  for (const value of raw) {
    if (!isSalonService(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    clean.push(value);
  }
  return clean;
}

/** Normalise a raw payload into `SalonStylist[]`. */
export function normalizeSalonStylists(raw: unknown): SalonStylist[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: SalonStylist[] = [];
  for (const value of raw) {
    if (!isSalonStylist(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    clean.push(value);
  }
  return clean;
}

/** Normalise a raw payload into `SalonBooking[]`. */
export function normalizeSalonBookings(raw: unknown): SalonBooking[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: SalonBooking[] = [];
  for (const value of raw) {
    if (!isSalonBooking(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    clean.push(value);
  }
  // Most-recent first — easier to scan in "My bookings" tab.
  clean.sort((a, b) => {
    const aMs = new Date(a.bookedAt).getTime();
    const bMs = new Date(b.bookedAt).getTime();
    return bMs - aMs;
  });
  return clean;
}
