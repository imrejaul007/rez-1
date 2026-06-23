/**
 * Habixo module — B-feature migration types (Phase 4.5)
 *
 * These types mirror the backend contract at `/api/b/habixo/*`. The Habixo
 * feature is a rental marketplace that bundles five vertical surfaces:
 *
 *   1. **Stays**         — short-term apartment / house rentals.
 *   2. **Hourly**        — meeting rooms, studios, and event spaces billed
 *                          by the hour.
 *   3. **Property**      — long-term flats / houses for rent.
 *   4. **Rent**          — appliance / furniture / vehicle rent.
 *   5. **Match**         — personalised match suggestions based on user
 *                          preferences.
 *
 * The data model collapses all five into a single `HabixoProperty` record
 * whose `type` discriminator tells the UI which vertical surface to render.
 *
 * DATE / MONEY CONVENTION:
 *   - All timestamps are ISO 8601 strings
 *     (e.g. `2026-06-20T10:30:00.000Z`).
 *   - All monetary fields (`rentPaise`, `depositPaise`, `totalPaise`) are
 *     in **paise** (smallest INR unit). Display conversion is the caller's
 *     job (`formatPrice(value / 100, 'INR')`).
 */

// ---------------------------------------------------------------------------
// Property
// ---------------------------------------------------------------------------

/**
 * Vertical surface a property belongs to. Drives the card layout, the
 * filter chips, and the booking flow rendered by the client.
 */
export type HabixoPropertyType =
  | 'apartment'
  | 'house'
  | 'office'
  | 'meeting_room'
  | 'pg'
  | 'studio';

/** Closed union of valid property types — exported for filter chip lists. */
export const HABIXO_PROPERTY_TYPES: ReadonlyArray<HabixoPropertyType> = [
  'apartment',
  'house',
  'office',
  'meeting_room',
  'pg',
  'studio',
];

/**
 * A single rental listing. Combines stays, hourly, property, rent, and
 * match surfaces into one canonical record.
 *
 * @example
 * {
 *   id: 'prop-blr-001',
 *   title: '2BHK in Indiranagar, fully furnished',
 *   type: 'apartment',
 *   city: 'Bangalore',
 *   area: 'Indiranagar',
 *   rentPaise: 3500000,
 *   depositPaise: 7000000,
 *   bedrooms: 2,
 *   bathrooms: 2,
 *   areaSqft: 1100,
 *   amenities: ['WiFi', 'AC', 'Parking'],
 *   imageUrls: ['https://images.example.com/prop1-1.jpg'],
 *   ownerName: 'Priya Menon',
 *   available: true
 * }
 */
export interface HabixoProperty {
  /** Server-side property id (ULID/ObjectId stringified). */
  id: string;
  /** Short listing title shown on the card. */
  title: string;
  /** Vertical surface — drives the card layout and detail screen. */
  type: HabixoPropertyType;
  /** City of the listing, e.g. `'Bangalore'`. */
  city: string;
  /** Neighbourhood / area within the city, e.g. `'Indiranagar'`. */
  area: string;
  /** Monthly (or per-hour) rent in paise. Always >= 0. */
  rentPaise: number;
  /** Refundable deposit in paise; omitted for hourly surfaces. */
  depositPaise?: number;
  /** Bedroom count — omitted for offices and meeting rooms. */
  bedrooms?: number;
  /** Bathroom count — omitted for some hourly surfaces. */
  bathrooms?: number;
  /** Carpet area in square feet. */
  areaSqft?: number;
  /** Free-form amenity labels, e.g. `['WiFi', 'AC', 'Parking']`. */
  amenities: string[];
  /** Ordered list of image URLs; the first is the hero image. */
  imageUrls: string[];
  /** Display name of the property owner / landlord. */
  ownerName: string;
  /** When `false` the listing is hidden from new bookings. */
  available: boolean;
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

/** Lifecycle state for a `HabixoBooking`. */
export type HabixoBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed';

/**
 * A booking made by the authenticated user against a property. Both
 * stays (date range) and hourly (single slot) flows share this shape;
 * `endDate` is omitted for hourly bookings.
 *
 * @example
 * {
 *   id: 'book-usr-1234-1718900000000',
 *   propertyId: 'prop-blr-001',
 *   userId: 'usr_01HXY',
 *   startDate: '2026-07-01T00:00:00.000Z',
 *   endDate: '2026-07-31T00:00:00.000Z',
 *   status: 'confirmed',
 *   totalPaise: 3500000,
 *   bookedAt: '2026-06-20T08:15:00.000Z'
 * }
 */
export interface HabixoBooking {
  /** Server-side booking id. */
  id: string;
  /** Property being booked. */
  propertyId: string;
  /** Authenticated user that owns the booking. */
  userId: string;
  /** ISO 8601 check-in date / hour. */
  startDate: string;
  /** ISO 8601 check-out date / hour. Omitted for hourly bookings. */
  endDate?: string;
  status: HabixoBookingStatus;
  /** Total billed amount in paise (deposit included for stays). */
  totalPaise: number;
  /** ISO 8601 timestamp when the booking was created. */
  bookedAt: string;
}

// ---------------------------------------------------------------------------
// Conversation / message
// ---------------------------------------------------------------------------

/**
 * One message in a property conversation thread. Conversations are
 * identified by `conversationId`; the backend currently mocks the body
 * for each property.
 */
export interface HabixoMessage {
  /** Server-side message id. */
  id: string;
  /** Conversation the message belongs to. */
  conversationId: string;
  /** Sender user id (property owner or renter). */
  senderId: string;
  /** Display name of the sender, denormalised for convenience. */
  senderName: string;
  /** Free-form message body. */
  content: string;
  /** ISO 8601 timestamp the message was sent. */
  timestamp: string;
  /** `true` once the recipient has read the message. */
  isRead: boolean;
}

// ---------------------------------------------------------------------------
// Filters (UI-only — not part of the wire surface)
// ---------------------------------------------------------------------------

/**
 * Shape of the Habixo property filter bar. Used by the page-level
 * component and the `useHabixoProperties` hook. Kept in this file so
 * the UI / hook / types can all evolve together.
 */
export interface HabixoPropertyFilters {
  /** Free-text city filter, case-insensitive. `''` means all cities. */
  city: string;
  /** Vertical surface filter; `null` means all types. */
  type: HabixoPropertyType | null;
  /** Inclusive minimum rent in paise. `null` means no lower bound. */
  minRentPaise: number | null;
  /** Inclusive maximum rent in paise. `null` means no upper bound. */
  maxRentPaise: number | null;
}