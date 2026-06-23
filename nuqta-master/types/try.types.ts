/**
 * Try module — shared type definitions (Phase 4.3).
 *
 * The Try module lets users trial a product (a perfume, a snack, a fitness
 * class, a gadget accessory) at a fraction of the full price for a fixed
 * window — e.g. ₹49 for a 7-day trial of a ₹799 facewash. Users can also
 * book curated bundles of trials.
 *
 * These types are duplicated between frontend and backend so either side
 * can be evolved in lock-step. The frontend definitions are the canonical
 * read shape; the backend (`src/routes/b/try.ts`) produces equivalent
 * payloads.
 *
 * Money convention
 * ----------------
 *  - All amounts on the wire are integer paise (1/100 of a rupee).
 *  - The UI is responsible for dividing by 100 and formatting via
 *    `formatPrice(...)` from `@/utils/priceFormatter`.
 */

/**
 * Top-level product categories exposed in the Try catalogue.
 *
 * Order is the render order on the chip strip. Add new values here AND
 * in the backend's `TRIAL_CATEGORIES` tuple — they must stay in sync.
 */
export const TRIAL_CATEGORIES = [
  'all',
  'beauty',
  'food',
  'fitness',
  'electronics',
] as const;

/** Union of valid category strings. */
export type TrialCategory = (typeof TRIAL_CATEGORIES)[number];

/** Human-readable label for a category. */
export const TRIAL_CATEGORY_LABELS: Record<TrialCategory, string> = {
  all: 'All',
  beauty: 'Beauty',
  food: 'Food',
  fitness: 'Fitness',
  electronics: 'Electronics',
};

/**
 * Lifecycle state for a `TrialBooking`.
 *
 *  - `active`    — trial window is in progress; user can convert or cancel.
 *  - `expired`   — trial window passed without conversion; terminal.
 *  - `converted` — user bought the full product; terminal (success).
 *  - `cancelled` — user cancelled; terminal.
 */
export type TrialBookingStatus = 'active' | 'expired' | 'converted' | 'cancelled';

/**
 * One trial product in the catalogue.
 *
 * `trialPricePaise` is the small amount the user pays upfront. The
 * `fullPricePaise - trialPricePaise` gap is what they would save if they
 * end up *not* buying — surfaced in the UI as a "save up to ₹X" callout.
 */
export interface TrialProduct {
  /** Stable opaque id used as a `FlatList` key and analytics id. */
  id: string;
  /** Display name, e.g. "Lakme Absolute Skin Gloss Gel Crème". */
  name: string;
  /** One-or-two-line product description, sales copy. */
  description: string;
  /** Brand name, e.g. "Lakme", "Mamaearth", "BoAt". */
  brand: string;
  /** Product category. */
  category: Exclude<TrialCategory, 'all'>;
  /** Amount in paise the user pays to start the trial. */
  trialPricePaise: number;
  /** Full product price in paise (i.e. what they'd pay to buy). */
  fullPricePaise: number;
  /** How many days the trial lasts, e.g. 7. */
  durationDays: number;
  /** Cities / store names where the trial is redeemable. */
  availableAt: string[];
  /** Optional product image URL. */
  imageUrl?: string;
  /** Average user rating, 0-5 with one decimal. */
  rating: number;
  /** Total number of historical trials booked (popularity signal). */
  trialCount: number;
}

/**
 * A curated bundle of trials sold together for a discount.
 *
 * Bundles let the user try a vertical (e.g. a complete skincare kit) at
 * a flat price, with the savings computed as the delta against the sum
 * of individual trial prices.
 */
export interface TrialBundle {
  id: string;
  /** Bundle display name, e.g. "Student Skincare Kit". */
  name: string;
  /** IDs of the products included in the bundle. */
  productIds: string[];
  /** Total bundle price in paise. */
  bundlePricePaise: number;
  /** How much the user saves vs. booking each trial individually. */
  savingsPaise: number;
  /** True if the bundle is a limited-time / limited-stock offer. */
  isLimited: boolean;
  /** ISO-8601 timestamp the bundle stops being bookable. */
  expiresAt?: string;
}

/**
 * A booking of a single trial product by a single user.
 *
 * `bookedAt` is the moment the booking was created, `trialEndsAt` is
 * `bookedAt + durationDays` (computed server-side, not derived client-side
 * to avoid clock-skew bugs).
 */
export interface TrialBooking {
  id: string;
  productId: string;
  /** ISO-8601 timestamp the booking was created. */
  bookedAt: string;
  /** ISO-8601 timestamp the trial window ends. */
  trialEndsAt: string;
  status: TrialBookingStatus;
  /** Coins debited from the wallet to book the trial. */
  coinsUsed: number;
}

/**
 * A gamified "trial explorer" badge — awarded after a milestone
 * (e.g. 5 trials booked, 1 trial converted, etc.).
 *
 * Badges surface in the "My trials" tab and on the user profile.
 */
export interface TrialBadge {
  id: string;
  /** Badge display name, e.g. "First Trial". */
  name: string;
  /** Single emoji used as the badge icon. */
  iconEmoji: string;
  /** ISO-8601 timestamp the badge was earned. */
  earnedAt: string;
}

/**
 * Type-guard — checks an unknown value is shaped like a `TrialProduct`.
 *
 * Extra fields are allowed and ignored. Required fields are validated
 * defensively so a malformed backend payload cannot crash the UI.
 */
export function isTrialProduct(value: unknown): value is TrialProduct {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.description === 'string' &&
    typeof v.brand === 'string' &&
    typeof v.category === 'string' &&
    (v.category === 'beauty' ||
      v.category === 'food' ||
      v.category === 'fitness' ||
      v.category === 'electronics') &&
    typeof v.trialPricePaise === 'number' &&
    Number.isFinite(v.trialPricePaise) &&
    v.trialPricePaise >= 0 &&
    typeof v.fullPricePaise === 'number' &&
    Number.isFinite(v.fullPricePaise) &&
    v.fullPricePaise >= 0 &&
    typeof v.durationDays === 'number' &&
    Number.isFinite(v.durationDays) &&
    v.durationDays > 0 &&
    Array.isArray(v.availableAt) &&
    v.availableAt.every((s) => typeof s === 'string') &&
    typeof v.rating === 'number' &&
    Number.isFinite(v.rating) &&
    typeof v.trialCount === 'number' &&
    Number.isFinite(v.trialCount) &&
    (v.imageUrl === undefined || typeof v.imageUrl === 'string')
  );
}

/** Type-guard — `TrialBundle`. */
export function isTrialBundle(value: unknown): value is TrialBundle {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.productIds) &&
    v.productIds.every((id) => typeof id === 'string') &&
    typeof v.bundlePricePaise === 'number' &&
    Number.isFinite(v.bundlePricePaise) &&
    v.bundlePricePaise >= 0 &&
    typeof v.savingsPaise === 'number' &&
    Number.isFinite(v.savingsPaise) &&
    v.savingsPaise >= 0 &&
    typeof v.isLimited === 'boolean' &&
    (v.expiresAt === undefined || typeof v.expiresAt === 'string')
  );
}

/** Type-guard — `TrialBooking`. */
export function isTrialBooking(value: unknown): value is TrialBooking {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.productId === 'string' &&
    typeof v.bookedAt === 'string' &&
    typeof v.trialEndsAt === 'string' &&
    typeof v.status === 'string' &&
    (v.status === 'active' ||
      v.status === 'expired' ||
      v.status === 'converted' ||
      v.status === 'cancelled') &&
    typeof v.coinsUsed === 'number' &&
    Number.isFinite(v.coinsUsed) &&
    v.coinsUsed >= 0
  );
}

/**
 * Normalise a raw backend payload into clean `TrialProduct[]`.
 *
 * Drops invalid entries, deduplicates by `id`, preserves the order
 * the backend emitted them in. Returns an empty array if nothing
 * valid is present — never throws.
 */
export function normalizeTrialProducts(raw: unknown): TrialProduct[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: TrialProduct[] = [];
  for (const value of raw) {
    if (!isTrialProduct(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    clean.push(value);
  }
  return clean;
}

/** Normalise a raw payload into `TrialBundle[]`. Same semantics as above. */
export function normalizeTrialBundles(raw: unknown): TrialBundle[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: TrialBundle[] = [];
  for (const value of raw) {
    if (!isTrialBundle(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    clean.push(value);
  }
  return clean;
}

/** Normalise a raw payload into `TrialBooking[]`. */
export function normalizeTrialBookings(raw: unknown): TrialBooking[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: TrialBooking[] = [];
  for (const value of raw) {
    if (!isTrialBooking(value)) continue;
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    clean.push(value);
  }
  // Most-recent first — easier to scan in "My trials" tab.
  clean.sort((a, b) => {
    const aMs = new Date(a.bookedAt).getTime();
    const bMs = new Date(b.bookedAt).getTime();
    return bMs - aMs;
  });
  return clean;
}
