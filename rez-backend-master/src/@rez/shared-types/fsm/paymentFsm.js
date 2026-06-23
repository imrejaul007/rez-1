"use strict";
/**
 * Payment FSM — canonical state-machine rules for the Payment entity.
 *
 * Mirrors rezbackend/src/config/financialStateMachine.ts (PAYMENT_TRANSITIONS)
 * so every service, the merchant app, and the consumer app agree on the same
 * graph. This is the single source of truth: update THIS file first, then
 * regenerate the backend copy.
 *
 * The graph covers the full 11-state lifecycle:
 *   pending → processing → completed → refund_initiated → refund_processing
 *     → refunded (terminal) | partially_refunded (can re-refund)
 *   any state → cancelled | expired | failed as allowed below
 *
 * Only transitions whose `from` key appears here with `to` in the value list
 * are legal. Callers MUST route every status mutation through
 * `assertValidPaymentTransition()` so invalid changes surface as errors rather
 * than silent inconsistency.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYMENT_REFUND_STATES = exports.PAYMENT_FAILURE_STATES = exports.PAYMENT_SUCCESS_STATES = exports.PAYMENT_STATE_TRANSITIONS = void 0;
exports.isValidPaymentTransition = isValidPaymentTransition;
exports.assertValidPaymentTransition = assertValidPaymentTransition;
exports.getValidNextPaymentStates = getValidNextPaymentStates;
exports.isTerminalPaymentStatus = isTerminalPaymentStatus;
exports.isPaymentOutcomeState = isPaymentOutcomeState;
const index_1 = require("../enums/index");
/**
 * Payment state transitions. Terminal states map to `[]`.
 *
 * Keep in sync with rezbackend/src/config/financialStateMachine.ts.
 * The only canonical difference: `partially_refunded` is a real post-refund
 * state here; on the backend it lives on the Order sub-doc. Both models
 * agree that a partially-refunded payment can be re-refunded.
 */
exports.PAYMENT_STATE_TRANSITIONS = {
    [index_1.PaymentStatus.PENDING]: [index_1.PaymentStatus.PROCESSING, index_1.PaymentStatus.CANCELLED, index_1.PaymentStatus.EXPIRED],
    [index_1.PaymentStatus.PROCESSING]: [index_1.PaymentStatus.COMPLETED, index_1.PaymentStatus.FAILED],
    [index_1.PaymentStatus.COMPLETED]: [index_1.PaymentStatus.REFUND_INITIATED],
    [index_1.PaymentStatus.FAILED]: [index_1.PaymentStatus.PENDING], // retry path
    [index_1.PaymentStatus.CANCELLED]: [], // terminal
    [index_1.PaymentStatus.EXPIRED]: [], // terminal
    [index_1.PaymentStatus.REFUND_INITIATED]: [index_1.PaymentStatus.REFUND_PROCESSING],
    [index_1.PaymentStatus.REFUND_PROCESSING]: [
        index_1.PaymentStatus.REFUNDED,
        index_1.PaymentStatus.PARTIALLY_REFUNDED,
        index_1.PaymentStatus.REFUND_FAILED,
    ],
    [index_1.PaymentStatus.REFUNDED]: [], // terminal
    [index_1.PaymentStatus.REFUND_FAILED]: [index_1.PaymentStatus.REFUND_INITIATED], // retry
    [index_1.PaymentStatus.PARTIALLY_REFUNDED]: [index_1.PaymentStatus.REFUND_INITIATED],
};
/** True if `from → to` is a legal payment transition. */
function isValidPaymentTransition(from, to) {
    const allowed = exports.PAYMENT_STATE_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}
/** Throw with a readable message if the transition is invalid. */
function assertValidPaymentTransition(from, to) {
    if (!isValidPaymentTransition(from, to)) {
        const allowed = exports.PAYMENT_STATE_TRANSITIONS[from] ?? [];
        throw new Error(`Invalid payment status transition: ${from} → ${to}. ` +
            `Allowed from ${from}: [${allowed.join(', ') || 'none (terminal)'}]`);
    }
}
/** All states reachable in one step from `from`. Empty for terminal states. */
function getValidNextPaymentStates(from) {
    return exports.PAYMENT_STATE_TRANSITIONS[from] ?? [];
}
/** True if the state has no outgoing transitions. */
function isTerminalPaymentStatus(status) {
    return getValidNextPaymentStates(status).length === 0;
}
/** Subset of statuses that represent a successful end-to-end charge. */
exports.PAYMENT_SUCCESS_STATES = new Set([index_1.PaymentStatus.COMPLETED]);
/** Subset of statuses that represent a failed or aborted charge. */
exports.PAYMENT_FAILURE_STATES = new Set([
    index_1.PaymentStatus.FAILED,
    index_1.PaymentStatus.CANCELLED,
    index_1.PaymentStatus.EXPIRED,
]);
/** Subset of statuses that represent any refund phase. */
exports.PAYMENT_REFUND_STATES = new Set([
    index_1.PaymentStatus.REFUND_INITIATED,
    index_1.PaymentStatus.REFUND_PROCESSING,
    index_1.PaymentStatus.REFUNDED,
    index_1.PaymentStatus.REFUND_FAILED,
    index_1.PaymentStatus.PARTIALLY_REFUNDED,
]);
/** True if `s` is a success, failure, refund-final, or cancellation-final state. */
function isPaymentOutcomeState(s) {
    return (exports.PAYMENT_SUCCESS_STATES.has(s) ||
        exports.PAYMENT_FAILURE_STATES.has(s) ||
        s === index_1.PaymentStatus.REFUNDED ||
        s === index_1.PaymentStatus.REFUND_FAILED);
}
//# sourceMappingURL=paymentFsm.js.map