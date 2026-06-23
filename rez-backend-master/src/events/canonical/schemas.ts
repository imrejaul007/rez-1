/**
 * Canonical Event Schemas — Sprint 0 Foundation
 *
 * Defines a single, versioned shape for each domain event that the Growth Engine
 * consumes. Every producer (POS, web order, payment webhook, appointment) MUST
 * emit one of these canonical events. Subscribers (cashback, WhatsApp receipts,
 * analytics, lapsed-customer detection, etc.) consume ONLY these shapes —
 * decoupling growth concerns from the internal data model of each service.
 *
 * Changes to these schemas are breaking; bump the topic version (e.g.
 * `canonical.order.placed.v2`) rather than mutating the shape in place.
 */

import { z } from 'zod';
import * as crypto from 'crypto';

// ─── Shared fragments ─────────────────────────────────────────────────────────
//
// RECONCILIATION (Sprint -1b architect decisions):
//   - Zod v4.3.6 is installed → `z.string().datetime()` has moved. We use a
//     version-agnostic `.refine()` on Date.parse so the schema survives any
//     future Zod upgrade. A throw at parse time means the producer passed
//     garbage — the caller is always to blame, never this schema.
//   - HYBRID path: mandatory merchantId + orderId + amount; nullable storeId
//     and customerId. Allows aggregator orders (no store mapping) and POS
//     walk-ins (no identity) to flow through the pipeline; subscribers that
//     need a customer (cashback, loyalty) skip null rows.
//   - `eventType` (not `type`) is the discriminator field so it aligns with
//     the emitter in src/events/emitOrderPlaced.ts. The legacy inline schema
//     in that file will re-export from here in the follow-up edit.

const IsoDateTime = z
  .string()
  .min(1)
  .refine(
    (s) => !Number.isNaN(Date.parse(s)) && /^\d{4}-\d{2}-\d{2}T/.test(s),
    { message: 'must be an ISO-8601 date-time string' },
  );

const BaseEvent = z.object({
  /** Globally unique ID for this event occurrence — used for idempotency. */
  eventId: z.string().min(1),
  /** ISO-8601 UTC timestamp of when the event occurred in the source system. */
  occurredAt: IsoDateTime,
  /** Optional cross-service correlation ID; propagate from inbound request. */
  correlationId: z.string().min(1).optional(),
});

const OrderItem = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
  price: z.number().nonnegative(),
});

// ─── OrderPlaced ──────────────────────────────────────────────────────────────

export const OrderPlacedEventSchema = BaseEvent.extend({
  eventType: z.literal('order.placed'),
  merchantId: z.string().min(1),
  /** NULLABLE — aggregator orders emit null when the platform hasn't mapped
   *  a specific physical store. Subscribers that need a store (e.g. loyalty
   *  credit at a specific outlet) use CustomerStorePreference as fallback. */
  storeId: z.string().min(1).nullable(),
  /** NULLABLE — POS walk-ins under opt-in identity-capture mode can emit null.
   *  Subscribers targeting specific users (cashback, WhatsApp receipts, lapsed
   *  detection) skip events with null customerId. */
  customerId: z.string().min(1).nullable(),
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  amount: z.number().nonnegative(),
  source: z.enum(['pos', 'web', 'aggregator', 'appointment']),
  items: z.array(OrderItem).optional(),
});
export type OrderPlacedEvent = z.infer<typeof OrderPlacedEventSchema>;

// ─── PaymentSettled ───────────────────────────────────────────────────────────

export const PaymentSettledEventSchema = BaseEvent.extend({
  eventType: z.literal('payment.settled'),
  merchantId: z.string().min(1),
  /** NULLABLE — matches OrderPlaced semantics. */
  customerId: z.string().min(1).nullable(),
  paymentId: z.string().min(1),
  orderId: z.string().min(1).optional(),
  amount: z.number().nonnegative(),
  gateway: z.enum(['razorpay', 'cash', 'upi', 'wallet', 'card']),
});
export type PaymentSettledEvent = z.infer<typeof PaymentSettledEventSchema>;

// ─── VisitCompleted ───────────────────────────────────────────────────────────

export const VisitCompletedEventSchema = BaseEvent.extend({
  eventType: z.literal('visit.completed'),
  merchantId: z.string().min(1),
  /** NULLABLE per hybrid decision. */
  storeId: z.string().min(1).nullable(),
  /** NULLABLE — anonymous walk-in visits via QR check-in can emit null. */
  customerId: z.string().min(1).nullable(),
  visitId: z.string().min(1),
  source: z.enum(['pos', 'web', 'qr_checkin', 'appointment']),
});
export type VisitCompletedEvent = z.infer<typeof VisitCompletedEventSchema>;

// ─── CustomerLapsed ───────────────────────────────────────────────────────────

export const CustomerLapsedEventSchema = BaseEvent.extend({
  eventType: z.literal('customer.lapsed'),
  merchantId: z.string().min(1),
  customerId: z.string().min(1), // lapsed is customer-scoped by definition
  daysSinceLastVisit: z.number().int().nonnegative(),
});
export type CustomerLapsedEvent = z.infer<typeof CustomerLapsedEventSchema>;

// ─── MerchantApproved ─────────────────────────────────────────────────────────

export const MerchantApprovedEventSchema = BaseEvent.extend({
  eventType: z.literal('merchant.approved'),
  merchantId: z.string().min(1),
  approvedAt: IsoDateTime,
});
export type MerchantApprovedEvent = z.infer<typeof MerchantApprovedEventSchema>;

// ─── Union ────────────────────────────────────────────────────────────────────

export const CanonicalEventSchema = z.union([
  OrderPlacedEventSchema,
  PaymentSettledEventSchema,
  VisitCompletedEventSchema,
  CustomerLapsedEventSchema,
  MerchantApprovedEventSchema,
]);
export type CanonicalEvent = z.infer<typeof CanonicalEventSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically-random event ID.
 * Prefer this over ad-hoc string concatenation so producers stay consistent.
 */
export function newEventId(): string {
  return crypto.randomUUID();
}

/**
 * Current UTC timestamp in ISO-8601 — use for `occurredAt` defaults.
 */
export function nowIsoUtc(): string {
  return new Date().toISOString();
}
