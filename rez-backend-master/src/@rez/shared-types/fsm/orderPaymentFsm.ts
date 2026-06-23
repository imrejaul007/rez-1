// @ts-nocheck
/**
 * Order-Payment FSM — canonical transitions for the Order.payment.status
 * sub-document. Intentionally distinct from the Payment-entity FSM:
 *
 *   Payment.status === 'completed'   ⇄   Order.payment.status === 'paid'
 *
 * Mirrors rezbackend/src/config/financialStateMachine.ts (ORDER_PAYMENT_TRANSITIONS).
 *
 * States used:
 *   pending, awaiting_payment, processing, authorized, paid,
 *   partially_refunded, refunded, failed
 *
 * Some of these names overlap with Payment.status but carry different semantics —
 * do NOT unify without a migration. See recovery plan DB-03.
 */

/** Finite state type for Order.payment.status (NOT the Payment entity). */
export type OrderPaymentStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'processing'
  | 'authorized'
  | 'paid'
  | 'partially_refunded'
  | 'refunded'
  | 'failed';

export const ORDER_PAYMENT_STATUSES: readonly OrderPaymentStatus[] = [
  'pending',
  'awaiting_payment',
  'processing',
  'authorized',
  'paid',
  'partially_refunded',
  'refunded',
  'failed',
] as const;

export const ORDER_PAYMENT_STATE_TRANSITIONS: Readonly<Record<OrderPaymentStatus, readonly OrderPaymentStatus[]>> = {
  pending: ['awaiting_payment', 'failed'],
  awaiting_payment: ['processing', 'failed'],
  processing: ['authorized', 'paid', 'failed'],
  authorized: ['paid', 'failed'],
  paid: ['partially_refunded', 'refunded'],
  partially_refunded: ['partially_refunded', 'refunded'],
  failed: [],
  refunded: [],
} as const;

export function isValidOrderPaymentTransition(from: OrderPaymentStatus, to: OrderPaymentStatus): boolean {
  const allowed = ORDER_PAYMENT_STATE_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertValidOrderPaymentTransition(from: OrderPaymentStatus, to: OrderPaymentStatus): void {
  if (!isValidOrderPaymentTransition(from, to)) {
    const allowed = ORDER_PAYMENT_STATE_TRANSITIONS[from] ?? [];
    throw new Error(
      `Invalid order-payment status transition: ${from} → ${to}. ` +
        `Allowed from ${from}: [${allowed.join(', ') || 'none (terminal)'}]`,
    );
  }
}

export function getValidNextOrderPaymentStates(from: OrderPaymentStatus): readonly OrderPaymentStatus[] {
  return ORDER_PAYMENT_STATE_TRANSITIONS[from] ?? [];
}

/**
 * Bridge: map the Payment-entity status to the Order.payment.status that
 * should be set on the related Order document. This is the ONLY place the
 * mapping should live — callers should import and call, not re-implement.
 *
 * Returns `undefined` for Payment states that don't drive an order change
 * (e.g. refund_initiated — the order update happens on final refund).
 */
export function mapPaymentStatusToOrderPaymentStatus(paymentStatus: string): OrderPaymentStatus | undefined {
  switch (paymentStatus) {
    case 'pending':
      return 'pending';
    case 'processing':
      return 'processing';
    case 'completed':
      return 'paid';
    case 'failed':
      return 'failed';
    case 'cancelled':
    case 'expired':
      return 'failed';
    case 'refunded':
      return 'refunded';
    case 'partially_refunded':
      return 'partially_refunded';
    default:
      return undefined;
  }
}
