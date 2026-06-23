/**
 * Canonical Event Emitters — Sprint 0 Foundation
 *
 * Thin call-site helpers that each business code path (order creation,
 * payment settlement, visit completion, merchant approval) will call to emit
 * a canonical event. Producers pass only domain context; the emitter fills in
 * `eventId`, `occurredAt`, and pulls `correlationId` from AsyncLocalStorage
 * when available — so every canonical event is trivially traceable.
 *
 * NOTE: Scaffold only. Not yet invoked by any existing controller/service.
 */

import { createServiceLogger } from '../../config/logger';
import { correlationStorage } from '../../utils/correlationContext';
import {
  publishEvent,
  TOPIC_ORDER_PLACED,
  TOPIC_PAYMENT_SETTLED,
  TOPIC_VISIT_COMPLETED,
  TOPIC_MERCHANT_APPROVED,
} from './bus';
import {
  newEventId,
  nowIsoUtc,
  OrderPlacedEvent,
  PaymentSettledEvent,
  VisitCompletedEvent,
  MerchantApprovedEvent,
} from './schemas';

const logger = createServiceLogger('events-canonical-emitters');

/**
 * Non-throwing read of the current correlation ID. Unlike
 * `getCurrentCorrelationId()` in utils/correlationContext, we return undefined
 * outside a request context so the event field stays optional rather than
 * being populated with a generated placeholder.
 */
function currentCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

// ─── Order placed ─────────────────────────────────────────────────────────────

export interface OrderContext {
  merchantId: string;
  storeId: string;
  customerId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  source: OrderPlacedEvent['source'];
  items?: OrderPlacedEvent['items'];
  /** Optional override (e.g. when replaying from an audit log). */
  occurredAt?: string;
  /** Optional explicit correlation ID (overrides AsyncLocalStorage lookup). */
  correlationId?: string;
}

export async function emitOrderPlaced(ctx: OrderContext): Promise<void> {
  const event: OrderPlacedEvent = {
    eventType: 'order.placed',
    eventId: newEventId(),
    occurredAt: ctx.occurredAt ?? nowIsoUtc(),
    correlationId: ctx.correlationId ?? currentCorrelationId(),
    merchantId: ctx.merchantId,
    storeId: ctx.storeId,
    customerId: ctx.customerId,
    orderId: ctx.orderId,
    orderNumber: ctx.orderNumber,
    amount: ctx.amount,
    source: ctx.source,
    items: ctx.items,
  };

  try {
    await publishEvent(TOPIC_ORDER_PLACED, event);
  } catch (err) {
    logger.error('emitOrderPlaced failed', {
      orderId: ctx.orderId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── Payment settled ──────────────────────────────────────────────────────────

export interface PaymentContext {
  merchantId: string;
  customerId: string;
  paymentId: string;
  orderId?: string;
  amount: number;
  gateway: PaymentSettledEvent['gateway'];
  occurredAt?: string;
  correlationId?: string;
}

export async function emitPaymentSettled(ctx: PaymentContext): Promise<void> {
  const event: PaymentSettledEvent = {
    eventType: 'payment.settled',
    eventId: newEventId(),
    occurredAt: ctx.occurredAt ?? nowIsoUtc(),
    correlationId: ctx.correlationId ?? currentCorrelationId(),
    merchantId: ctx.merchantId,
    customerId: ctx.customerId,
    paymentId: ctx.paymentId,
    orderId: ctx.orderId,
    amount: ctx.amount,
    gateway: ctx.gateway,
  };

  try {
    await publishEvent(TOPIC_PAYMENT_SETTLED, event);
  } catch (err) {
    logger.error('emitPaymentSettled failed', {
      paymentId: ctx.paymentId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── Visit completed ──────────────────────────────────────────────────────────

export interface VisitContext {
  merchantId: string;
  storeId: string;
  customerId: string;
  visitId: string;
  source: VisitCompletedEvent['source'];
  occurredAt?: string;
  correlationId?: string;
}

export async function emitVisitCompleted(ctx: VisitContext): Promise<void> {
  const event: VisitCompletedEvent = {
    eventType: 'visit.completed',
    eventId: newEventId(),
    occurredAt: ctx.occurredAt ?? nowIsoUtc(),
    correlationId: ctx.correlationId ?? currentCorrelationId(),
    merchantId: ctx.merchantId,
    storeId: ctx.storeId,
    customerId: ctx.customerId,
    visitId: ctx.visitId,
    source: ctx.source,
  };

  try {
    await publishEvent(TOPIC_VISIT_COMPLETED, event);
  } catch (err) {
    logger.error('emitVisitCompleted failed', {
      visitId: ctx.visitId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── Merchant approved ────────────────────────────────────────────────────────

export interface MerchantApprovedContext {
  merchantId: string;
  approvedAt: string;
  occurredAt?: string;
  correlationId?: string;
}

export async function emitMerchantApproved(ctx: MerchantApprovedContext): Promise<void> {
  const event: MerchantApprovedEvent = {
    eventType: 'merchant.approved',
    eventId: newEventId(),
    occurredAt: ctx.occurredAt ?? nowIsoUtc(),
    correlationId: ctx.correlationId ?? currentCorrelationId(),
    merchantId: ctx.merchantId,
    approvedAt: ctx.approvedAt,
  };

  try {
    await publishEvent(TOPIC_MERCHANT_APPROVED, event);
  } catch (err) {
    logger.error('emitMerchantApproved failed', {
      merchantId: ctx.merchantId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
