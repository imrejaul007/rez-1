/**
 * Canonical unified booking types for cross-service use.
 *
 * These types provide a common shape for all booking collections in the REZ backend.
 * Use `AnyBookingRecord` when merging results from multiple booking collections (e.g.
 * in the appointment feed), and `_source` / `bookingType` to discriminate at runtime.
 *
 * Source models:
 *   ServiceBooking  → src/models/ServiceBooking.ts
 *   TableBooking    → src/models/TableBooking.ts
 *   OtaBooking      → src/models/OtaBooking.ts
 *   EventBooking    → src/models/EventBooking.ts
 *   TrialBooking    → src/models/TrialBooking.ts
 */

// ── Discriminator ──────────────────────────────────────────────────────────────

export type BookingSource = 'service_booking' | 'table_booking' | 'ota_booking' | 'event_booking' | 'trial_booking';

// ── Base ───────────────────────────────────────────────────────────────────────

/**
 * Fields common to every booking type.
 * All per-collection queries should return at least these fields so downstream
 * merge/sort logic works without type-narrowing.
 */
export interface BaseBookingRecord {
  _id: string;
  /** Human-readable reference number (format varies per booking type). */
  bookingNumber?: string;
  /** Discriminates the originating collection. Always set on documents returned
   *  from merged queries. */
  bookingType: BookingSource;
  userId?: string;
  storeId?: string;
  status: string;
  createdAt: Date | string;
  /**
   * Set by the merge layer (e.g. serviceAppointmentController) so the UI can
   * badge or route items from different collections without re-querying.
   * Not persisted to the DB — populated in-memory after the $merge/$unionWith.
   */
  _source?: BookingSource;
}

// ── Service Booking ────────────────────────────────────────────────────────────

export interface ServiceBookingRecord extends BaseBookingRecord {
  bookingType: 'service_booking';
  serviceId: string;
  /** ISO date string or Date object for the booked date. */
  bookingDate: Date | string;
  timeSlot: { start: string; end: string };
  /** Duration of the service in minutes. */
  duration?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNotes?: string;
  paymentStatus?: string;
}

// ── Table Booking ──────────────────────────────────────────────────────────────

export interface TableBookingRecord extends BaseBookingRecord {
  bookingType: 'table_booking';
  /** Number of guests. */
  partySize: number;
  /** The date portion of the reservation. */
  appointmentDate: Date | string;
  /** HH:MM 24-hour time string, e.g. "19:30". */
  appointmentTime: string;
  customerName?: string;
  customerPhone?: string;
  specialRequests?: string;
  preOrderStatus?: 'none' | 'pending' | 'paid' | 'confirmed';
}

// ── OTA Booking ────────────────────────────────────────────────────────────────

export interface OtaBookingRecord extends BaseBookingRecord {
  bookingType: 'ota_booking';
  hotelId: string;
  checkIn: Date | string;
  checkOut: Date | string;
  /** Amount in paise (integer). */
  amountPaise: number;
}

// ── Event Booking ──────────────────────────────────────────────────────────────

export interface EventBookingRecord extends BaseBookingRecord {
  bookingType: 'event_booking';
  eventId: string;
  bookingDate: Date | string;
  bookingReference: string;
  quantity: number;
  amount: number;
  currency?: string;
  paymentStatus?: string;
  attendeeInfo?: {
    name: string;
    email: string;
    phone?: string;
  };
  qrCode?: string;
}

// ── Trial Booking ──────────────────────────────────────────────────────────────

export interface TrialBookingRecord extends BaseBookingRecord {
  bookingType: 'trial_booking';
  trialId: string;
  merchantId: string;
  qrHash: string;
  qrExpiresAt: Date | string;
  commitmentFeePaid: number;
  rewardCredited: boolean;
  /** Trial-specific status values differ from other booking types. */
  status: 'pending' | 'active' | 'completed' | 'expired' | 'fraud_rejected';
}

// ── Union ──────────────────────────────────────────────────────────────────────

/**
 * Discriminated union covering all booking record types.
 * Use a `switch (record.bookingType)` or `if (record._source === '...')` guard
 * to narrow to a specific sub-type.
 */
export type AnyBookingRecord =
  | ServiceBookingRecord
  | TableBookingRecord
  | OtaBookingRecord
  | EventBookingRecord
  | TrialBookingRecord;
