/**
 * emitPaymentSettled — canonical `payment.settled` dispatcher for the monolith.
 *
 * Mirrors the emitOrderPlaced contract. Every monolith code path that
 * persists a settled payment (web-order /payment/verify, POS /mark-paid,
 * wallet-payment, store-payment confirm) should call this helper after
 * the DB write but before returning to the HTTP caller.
 *
 * Contract
 * ────────
 *  - Validates the envelope with Zod. Caller bugs (missing paymentId, bad
 *    gateway enum, etc.) throw synchronously — deliberate, because a
 *    malformed envelope is a dev-time contract violation not a runtime
 *    failure.
 *  - Beyond schema validation, NEVER throws. Canonical-bus publish
 *    failures (Redis down, BullMQ queue error) are caught internally
 *    and logged at warn level. The caller must not block on queue health.
 *  - Nullable customerId for walk-in scenarios — matches the canonical
 *    hybrid-nullable contract.
 */

import * as crypto from 'crypto';

import { logger } from '../config/logger';
import { getCurrentCorrelationId } from '../utils/correlationContext';
import {
  PaymentSettledEventSchema,
  type PaymentSettledEvent,
} from './canonical/schemas';

export interface EmitPaymentSettledContext {
  merchantId: string;
  customerId: string | null;
  paymentId: string;
  /** Order the payment was for, if known. Aggregator/subscription flows
   *  sometimes settle without a local order doc. */
  orderId?: string;
  amount: number;
  gateway: PaymentSettledEvent['gateway'];
}

export function emitPaymentSettled(ctx: EmitPaymentSettledContext): PaymentSettledEvent {
  const correlationId = safeCorrelationId();

  const candidate = {
    eventId: crypto.randomUUID(),
    eventType: 'payment.settled' as const,
    occurredAt: new Date().toISOString(),
    correlationId,
    merchantId: ctx.merchantId,
    customerId: ctx.customerId,
    paymentId: ctx.paymentId,
    orderId: ctx.orderId,
    amount: ctx.amount,
    gateway: ctx.gateway,
  };

  // Throws on invalid caller envelope — intentional (see contract above).
  const event: PaymentSettledEvent = PaymentSettledEventSchema.parse(candidate);

  // Publish to canonical bus. Fire-and-forget + never-throws.
  void publishCanonicalPaymentSettled(event);

  return event;
}

async function publishCanonicalPaymentSettled(event: PaymentSettledEvent): Promise<void> {
  try {
    const { publishEvent, TOPIC_PAYMENT_SETTLED } = await import('./canonical/bus');
    await publishEvent(TOPIC_PAYMENT_SETTLED, event);
  } catch (err) {
    logger.warn('[emitPaymentSettled] canonical bus publish failed (fail-open)', {
      eventId: event.eventId,
      paymentId: event.paymentId,
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
