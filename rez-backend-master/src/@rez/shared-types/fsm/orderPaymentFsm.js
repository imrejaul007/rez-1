"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORDER_PAYMENT_STATE_TRANSITIONS = exports.ORDER_PAYMENT_STATUSES = void 0;
exports.isValidOrderPaymentTransition = isValidOrderPaymentTransition;
exports.assertValidOrderPaymentTransition = assertValidOrderPaymentTransition;
exports.getValidNextOrderPaymentStates = getValidNextOrderPaymentStates;
exports.mapPaymentStatusToOrderPaymentStatus = mapPaymentStatusToOrderPaymentStatus;
exports.ORDER_PAYMENT_STATUSES = [
    'pending',
    'awaiting_payment',
    'processing',
    'authorized',
    'paid',
    'partially_refunded',
    'refunded',
    'failed',
];
exports.ORDER_PAYMENT_STATE_TRANSITIONS = {
    pending: ['awaiting_payment', 'failed'],
    awaiting_payment: ['processing', 'failed'],
    processing: ['authorized', 'paid', 'failed'],
    authorized: ['paid', 'failed'],
    paid: ['partially_refunded', 'refunded'],
    partially_refunded: ['partially_refunded', 'refunded'],
    failed: [],
    refunded: [],
};
function isValidOrderPaymentTransition(from, to) {
    const allowed = exports.ORDER_PAYMENT_STATE_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}
function assertValidOrderPaymentTransition(from, to) {
    if (!isValidOrderPaymentTransition(from, to)) {
        const allowed = exports.ORDER_PAYMENT_STATE_TRANSITIONS[from] ?? [];
        throw new Error(`Invalid order-payment status transition: ${from} → ${to}. ` +
            `Allowed from ${from}: [${allowed.join(', ') || 'none (terminal)'}]`);
    }
}
function getValidNextOrderPaymentStates(from) {
    return exports.ORDER_PAYMENT_STATE_TRANSITIONS[from] ?? [];
}
/**
 * Bridge: map the Payment-entity status to the Order.payment.status that
 * should be set on the related Order document. This is the ONLY place the
 * mapping should live — callers should import and call, not re-implement.
 *
 * Returns `undefined` for Payment states that don't drive an order change
 * (e.g. refund_initiated — the order update happens on final refund).
 */
function mapPaymentStatusToOrderPaymentStatus(paymentStatus) {
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
//# sourceMappingURL=orderPaymentFsm.js.map