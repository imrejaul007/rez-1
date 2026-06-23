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
export declare const ORDER_PAYMENT_STATUSES: readonly OrderPaymentStatus[];
export declare const ORDER_PAYMENT_STATE_TRANSITIONS: Readonly<
  Record<OrderPaymentStatus, readonly OrderPaymentStatus[]>
>;
export declare function isValidOrderPaymentTransition(from: OrderPaymentStatus, to: OrderPaymentStatus): boolean;
export declare function assertValidOrderPaymentTransition(from: OrderPaymentStatus, to: OrderPaymentStatus): void;
export declare function getValidNextOrderPaymentStates(from: OrderPaymentStatus): readonly OrderPaymentStatus[];
/**
 * Bridge: map the Payment-entity status to the Order.payment.status that
 * should be set on the related Order document. This is the ONLY place the
 * mapping should live — callers should import and call, not re-implement.
 *
 * Returns `undefined` for Payment states that don't drive an order change
 * (e.g. refund_initiated — the order update happens on final refund).
 */
export declare function mapPaymentStatusToOrderPaymentStatus(paymentStatus: string): OrderPaymentStatus | undefined;
//# sourceMappingURL=orderPaymentFsm.d.ts.map
