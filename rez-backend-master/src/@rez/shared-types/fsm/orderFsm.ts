// @ts-nocheck
/**
 * Order FSM — canonical transitions for Order.status (not to be confused with
 * Order.payment.status, which has its own FSM; see orderPaymentFsm.ts).
 *
 * States (11 total) mirror Order.ts in rezbackend:
 *   placed → confirmed → preparing → ready → dispatched → out_for_delivery → delivered
 *   any pre-delivered state can move to `cancelling` → `cancelled`
 *   delivered can move to `returned` or `refunded`
 *
 * This FSM is enforced at the API boundary (merchant app -> backend) and in
 * the broadcast subscribers that react to order events.
 */

import { OrderStatus } from '../enums/index';

export const ORDER_STATE_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [OrderStatus.PLACED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLING, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLING],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLING],
  [OrderStatus.READY]: [OrderStatus.DISPATCHED, OrderStatus.DELIVERED, OrderStatus.CANCELLING],
  [OrderStatus.DISPATCHED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLING],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLING],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED, OrderStatus.REFUNDED],
  [OrderStatus.CANCELLING]: [OrderStatus.CANCELLED],
  [OrderStatus.CANCELLED]: [], // terminal
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [], // terminal
} as const;

export function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  const allowed = ORDER_STATE_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertValidOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!isValidOrderTransition(from, to)) {
    const allowed = ORDER_STATE_TRANSITIONS[from] ?? [];
    throw new Error(
      `Invalid order status transition: ${from} → ${to}. ` +
        `Allowed from ${from}: [${allowed.join(', ') || 'none (terminal)'}]`,
    );
  }
}

export function getValidNextOrderStates(from: OrderStatus): readonly OrderStatus[] {
  return ORDER_STATE_TRANSITIONS[from] ?? [];
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return getValidNextOrderStates(status).length === 0;
}

/** Statuses that represent active order lifecycle (not cancelled/refunded/returned). */
export const ORDER_ACTIVE_STATES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.PLACED,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DISPATCHED,
  OrderStatus.OUT_FOR_DELIVERY,
]);

/** Statuses that permit merchant-initiated cancellation. */
export const ORDER_CANCELLABLE_STATES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.PLACED,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.DISPATCHED,
  OrderStatus.OUT_FOR_DELIVERY,
]);

/** Convenience: can this order be cancelled from its current status? */
export function canOrderBeCancelled(status: OrderStatus): boolean {
  return ORDER_CANCELLABLE_STATES.has(status);
}
