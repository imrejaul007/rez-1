/**
 * emitOrderPlaced — canonical `order.placed` dispatcher for the ReZ monolith.
 *
 * Purpose
 * ───────
 * This is the ONE place every order-creation code path (web checkout, POS bill,
 * aggregator ingest, appointment → order) goes to announce "an order was placed".
 * Downstream concerns — cashback, loyalty/gamification, analytics, merchant
 * socket updates, WhatsApp receipts — must subscribe to this signal rather than
 * being hand-wired into controllers.
 *
 * Dual-write strategy
 * ───────────────────
 *  1. PRIMARY (synchronous, in-process)
 *     `gamificationEventBus.emit('order_placed', …)` fans the event out to
 *     streak / achievement / challenge handlers immediately in the same event
 *     loop tick (setImmediate). If this throws we let it surface — caller got
 *     the emit wrong (bad ctx).
 *
 *  2. COMPAT (durable, best-effort)
 *     A BullMQ job on the `order-events` queue carries the canonical envelope
 *     so crash-safe consumers (analytics rollups, future `rez-order-service`)
 *     can replay. Enqueue failure is LOGGED, never thrown — Redis flakiness
 *     must not break order creation.
 *
 * Contract
 * ────────
 *  - Validates the built envelope with Zod before dispatch. Schema violations
 *    throw at emit time (caller bug: missing customerId, bad source, etc.).
 *  - Beyond schema validation, this function NEVER throws. Queue failures are
 *    swallowed; in-process emit is wrapped in try/catch with structured logs.
 *  - `customerId` is REQUIRED. Callers emitting for guest checkouts MUST
 *    resolve a stable pseudo-user id (e.g. the guest cart owner) before calling.
 *  - `storeId` is nullable to accommodate aggregator orders that don't map to a
 *    single physical store.
 *
 * Import-time integrity
 * ─────────────────────
 * If `gamificationEventBus` is missing at module load we throw immediately so
 * the build/CI catches the breakage. We do NOT defer this to emit time — a
 * silent regression here would only surface in production under real order
 * traffic, which is exactly the cliff this helper exists to prevent.
 */

import * as crypto from 'crypto';
import { Queue } from 'bullmq';

import { logger } from '../config/logger';
import { bullmqRedis } from '../config/bullmq-connection';
import gamificationEventBus from './gamificationEventBus';
import { getCurrentCorrelationId } from '../utils/correlationContext';
// Single source of truth for the canonical Zod schema + inferred type lives in
// canonical/schemas.ts. We import with aliases so the existing exports
// (`OrderPlacedEventSchema` / `OrderPlacedEvent`) keep working for external
// callers that already import from this module.
import {
  OrderPlacedEventSchema as CanonicalOrderPlacedEventSchema,
  OrderPlacedEvent as CanonicalOrderPlacedEvent,
} from './canonical/schemas';

// ─── Import-time integrity check ──────────────────────────────────────────────
// Fail at boot, not at runtime. If the gamification bus was renamed/removed,
// we want the TS build or the first server boot to crash — not the order API.
if (!gamificationEventBus || typeof (gamificationEventBus as { emit?: unknown }).emit !== 'function') {
  throw new Error(
    "[emitOrderPlaced] gamificationEventBus is missing or does not expose emit(). " +
      'Check src/events/gamificationEventBus.ts default export.',
  );
}

// ─── Zod schema (re-exported from canonical) ──────────────────────────────────
// Single source of truth lives in canonical/schemas.ts. Both the schema and
// the inferred type are just aliases here for backward compat with callers
// that import from this module.
//
// Schema version-compatibility: canonical/schemas.ts uses a .refine-based
// ISO-8601 check so it works across Zod v3.x and v4.x without code changes.

export const OrderPlacedEventSchema = CanonicalOrderPlacedEventSchema;
export type OrderPlacedEvent = CanonicalOrderPlacedEvent;

// ─── Caller context ───────────────────────────────────────────────────────────

export interface EmitOrderPlacedContext {
  merchantId: string;
  /** Nullable for aggregator orders that don't map to a specific store. */
  storeId: string | null;
  /** Nullable for POS walk-ins under opt-in identity-capture mode. Callers
   *  SHOULD resolve when possible (via phone→User upsert); emit null only
   *  when the merchant's identityCaptureMode is 'optional' and the cashier
   *  explicitly selected walk-in. */
  customerId: string | null;
  orderId: string;
  orderNumber: string;
  amount: number;
  source: 'pos' | 'web' | 'aggregator' | 'appointment';
  items?: Array<{ productId: string; qty: number; price: number }>;
}

// ─── BullMQ compat queue (lazy singleton) ─────────────────────────────────────
// We mirror the settings of src/events/orderQueue.ts so downstream workers see
// the same retention and retry semantics. The queue is created lazily so tests
// and scripts that never emit an event don't open a Redis connection.

const ORDER_EVENTS_QUEUE_NAME = 'order-events';
let _orderQueue: Queue | null = null;

function getOrderQueue(): Queue {
  if (!_orderQueue) {
    _orderQueue = new Queue(ORDER_EVENTS_QUEUE_NAME, {
      connection: bullmqRedis,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 48 * 3600 }, // 48 h — orders need audit trail
        removeOnFail: { age: 14 * 24 * 3600 }, // 14 d for failed order events
      },
    });
    _orderQueue.on('error', (err) => {
      logger.warn('[emitOrderPlaced] order-events queue error (non-fatal): ' + err.message);
    });
  }
  return _orderQueue;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Emit the canonical `order.placed` event.
 *
 * Dispatches to:
 *   - gamificationEventBus (synchronous, in-process fan-out)
 *   - BullMQ `order-events` queue (durable, best-effort)
 *
 * @throws ZodError if ctx fails schema validation. This is a caller bug path —
 *   missing customerId, bad source enum, non-string storeId, etc. ALL OTHER
 *   failure modes are swallowed and logged; this function is safe to call from
 *   the hot path of order creation without try/catch.
 */
export function emitOrderPlaced(ctx: EmitOrderPlacedContext): OrderPlacedEvent {
  // Resolve correlation from AsyncLocalStorage (may be a generated fallback
  // when called outside an HTTP request — e.g. scheduled replay jobs).
  const correlationId = safeCorrelationId();

  // Build the envelope. Everything producer-supplied goes through Zod next.
  const candidate = {
    eventId: crypto.randomUUID(),
    eventType: 'order.placed' as const,
    occurredAt: new Date().toISOString(),
    correlationId,
    merchantId: ctx.merchantId,
    storeId: ctx.storeId,
    customerId: ctx.customerId,
    orderId: ctx.orderId,
    orderNumber: ctx.orderNumber,
    amount: ctx.amount,
    source: ctx.source,
    items: ctx.items,
  };

  // Schema-validate BEFORE any side effect so a bad ctx can't half-emit.
  const event: OrderPlacedEvent = OrderPlacedEventSchema.parse(candidate);

  // ── PRIMARY: synchronous in-process fan-out ────────────────────────────────
  // gamificationEventBus.emit is itself wrapped in setImmediate + try/catch,
  // so this call is non-blocking and won't throw on handler errors. We still
  // guard it defensively in case a future refactor changes those semantics.
  //
  // NULLABLE-customer guard: per-user gamification handlers (streaks,
  // achievements, challenges) require a real user id. If this is a POS
  // walk-in emit (customerId=null), we skip the in-process fan-out and
  // still ship the canonical envelope to the durable queue below — so
  // analytics rollups still count the order, just no user-scoped rewards.
  if (event.customerId) {
    try {
      gamificationEventBus.emit('order_placed', {
        userId: event.customerId,
        entityId: event.orderId,
        entityType: 'order',
        amount: event.amount,
        storeId: event.storeId ?? undefined,
        metadata: {
          eventId: event.eventId,
          eventType: event.eventType,
          orderNumber: event.orderNumber,
          merchantId: event.merchantId,
          source: event.source,
          correlationId: event.correlationId,
          items: event.items,
        },
        source: { controller: 'emitOrderPlaced', action: 'order.placed' },
      });
    } catch (err) {
      logger.error('[emitOrderPlaced] in-process fan-out failed (swallowed)', {
        eventId: event.eventId,
        orderId: event.orderId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    logger.debug('[emitOrderPlaced] walk-in order (no customerId) — skipping gamification fan-out', {
      eventId: event.eventId,
      orderId: event.orderId,
      source: event.source,
    });
  }

  // ── COMPAT: legacy durable BullMQ queue (best-effort) ──────────────────────
  // The `order-events` queue is consumed by legacy subscribers only. Kept for
  // backward compatibility until every subscriber migrates to canonical-events.
  // Fire-and-forget; we do NOT await.
  void enqueueOrderPlacedJob(event);

  // ── CANONICAL BUS: new durable event fan-out ───────────────────────────────
  // Sprint-2 — publish to the canonical `canonical-events` BullMQ queue via
  // `publishEvent`, matching what `src/events/canonical/bus.ts` exposes.
  // Downstream subscribers (cashback, gamification, WhatsApp receipts) subscribe
  // to the canonical queue by job name (`canonical.order.placed`). Fire-and-forget
  // and never-throws — the bus module itself catches and logs every failure.
  void publishCanonicalOrderPlaced(event);

  return event;
}

async function publishCanonicalOrderPlaced(event: OrderPlacedEvent): Promise<void> {
  try {
    const { publishEvent, TOPIC_ORDER_PLACED } = await import('./canonical/bus');
    await publishEvent(TOPIC_ORDER_PLACED, event);
  } catch (err) {
    logger.warn('[emitOrderPlaced] canonical bus publish failed (fail-open)', {
      eventId: event.eventId,
      orderId: event.orderId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeCorrelationId(): string | undefined {
  try {
    const id = getCurrentCorrelationId();
    return typeof id === 'string' && id.length > 0 ? id : undefined;
  } catch {
    // If the util ever throws (module mis-load, etc.) we must not break emit.
    return undefined;
  }
}

async function enqueueOrderPlacedJob(event: OrderPlacedEvent): Promise<void> {
  try {
    const queue = getOrderQueue();
    await queue.add('process-order-placed', event, {
      jobId: event.eventId, // dedupe at the queue level
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
    });
  } catch (err) {
    // Fail-open. Log and move on — primary bus already fired synchronously.
    logger.warn('[emitOrderPlaced] failed to enqueue BullMQ compat job (fail-open)', {
      eventId: event.eventId,
      orderId: event.orderId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// Internal export for unit tests only — not part of the public API surface.
export const __testOnly = {
  getOrderQueue,
  enqueueOrderPlacedJob,
};
