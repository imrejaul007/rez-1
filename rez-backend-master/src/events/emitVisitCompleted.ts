/**
 * emitVisitCompleted — canonical `visit.completed` dispatcher for the monolith.
 *
 * Mirrors emitOrderPlaced / emitPaymentSettled contract. Call this from every
 * code path that represents a customer visiting a store: QR check-in, POS
 * bill paid (proxy-visit), appointment completion, web-order completion.
 *
 * Contract
 * ────────
 *  - Zod-validated envelope. Caller bugs throw (missing visitId, bad source
 *    enum). All other failures caught + logged + swallowed.
 *  - customerId nullable — consistent with order.placed + payment.settled
 *    canonical hybrid-nullable contract.
 *  - Does NOT replace the legacy `store-visit-events` queue publish — callers
 *    should dual-write during the migration window so rollback is a comment
 *    toggle, not a schema change.
 */

import * as crypto from 'crypto';

import { logger } from '../config/logger';
import { getCurrentCorrelationId } from '../utils/correlationContext';
import {
  VisitCompletedEventSchema,
  type VisitCompletedEvent,
} from './canonical/schemas';

export interface EmitVisitCompletedContext {
  merchantId: string;
  /** Nullable — aggregator / web-ordering visits don't always map to a store row. */
  storeId: string | null;
  /** Nullable per hybrid-nullable contract — walk-in visits with no identity
   *  still fire the event for analytics + aggregate lapsed-detection. */
  customerId: string | null;
  /** Stable ID per-visit. Use Mongo _id when persisted; otherwise a UUID. */
  visitId: string;
  /** Which code path produced this visit. */
  source: VisitCompletedEvent['source'];
}

export function emitVisitCompleted(ctx: EmitVisitCompletedContext): VisitCompletedEvent {
  const correlationId = safeCorrelationId();

  const candidate = {
    eventId: crypto.randomUUID(),
    eventType: 'visit.completed' as const,
    occurredAt: new Date().toISOString(),
    correlationId,
    merchantId: ctx.merchantId,
    storeId: ctx.storeId,
    customerId: ctx.customerId,
    visitId: ctx.visitId,
    source: ctx.source,
  };

  const event: VisitCompletedEvent = VisitCompletedEventSchema.parse(candidate);

  void publishCanonicalVisitCompleted(event);

  return event;
}

async function publishCanonicalVisitCompleted(event: VisitCompletedEvent): Promise<void> {
  try {
    const { publishEvent, TOPIC_VISIT_COMPLETED } = await import('./canonical/bus');
    await publishEvent(TOPIC_VISIT_COMPLETED, event);
  } catch (err) {
    logger.warn('[emitVisitCompleted] canonical bus publish failed (fail-open)', {
      eventId: event.eventId,
      visitId: event.visitId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function safeCorrelationId(): string | undefined {
  try {
    const id = getCurrentCorrelationId();
    return typeof id === 'string' && id.length > 0 ? id : undefined;
  } catch {
    return undefined;
  }
}
