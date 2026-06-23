"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORDER_CANCELLABLE_STATES = exports.ORDER_ACTIVE_STATES = exports.ORDER_STATE_TRANSITIONS = void 0;
exports.isValidOrderTransition = isValidOrderTransition;
exports.assertValidOrderTransition = assertValidOrderTransition;
exports.getValidNextOrderStates = getValidNextOrderStates;
exports.isTerminalOrderStatus = isTerminalOrderStatus;
exports.canOrderBeCancelled = canOrderBeCancelled;
const index_1 = require("../enums/index");
exports.ORDER_STATE_TRANSITIONS = {
    [index_1.OrderStatus.PLACED]: [index_1.OrderStatus.CONFIRMED, index_1.OrderStatus.CANCELLING, index_1.OrderStatus.CANCELLED],
    [index_1.OrderStatus.CONFIRMED]: [index_1.OrderStatus.PREPARING, index_1.OrderStatus.CANCELLING],
    [index_1.OrderStatus.PREPARING]: [index_1.OrderStatus.READY, index_1.OrderStatus.CANCELLING],
    [index_1.OrderStatus.READY]: [index_1.OrderStatus.DISPATCHED, index_1.OrderStatus.DELIVERED, index_1.OrderStatus.CANCELLING],
    [index_1.OrderStatus.DISPATCHED]: [index_1.OrderStatus.OUT_FOR_DELIVERY, index_1.OrderStatus.CANCELLING],
    [index_1.OrderStatus.OUT_FOR_DELIVERY]: [index_1.OrderStatus.DELIVERED, index_1.OrderStatus.CANCELLING],
    [index_1.OrderStatus.DELIVERED]: [index_1.OrderStatus.RETURNED, index_1.OrderStatus.REFUNDED],
    [index_1.OrderStatus.CANCELLING]: [index_1.OrderStatus.CANCELLED],
    [index_1.OrderStatus.CANCELLED]: [], // terminal
    [index_1.OrderStatus.RETURNED]: [index_1.OrderStatus.REFUNDED],
    [index_1.OrderStatus.REFUNDED]: [], // terminal
};
function isValidOrderTransition(from, to) {
    const allowed = exports.ORDER_STATE_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}
function assertValidOrderTransition(from, to) {
    if (!isValidOrderTransition(from, to)) {
        const allowed = exports.ORDER_STATE_TRANSITIONS[from] ?? [];
        throw new Error(`Invalid order status transition: ${from} → ${to}. ` +
            `Allowed from ${from}: [${allowed.join(', ') || 'none (terminal)'}]`);
    }
}
function getValidNextOrderStates(from) {
    return exports.ORDER_STATE_TRANSITIONS[from] ?? [];
}
function isTerminalOrderStatus(status) {
    return getValidNextOrderStates(status).length === 0;
}
/** Statuses that represent active order lifecycle (not cancelled/refunded/returned). */
exports.ORDER_ACTIVE_STATES = new Set([
    index_1.OrderStatus.PLACED,
    index_1.OrderStatus.CONFIRMED,
    index_1.OrderStatus.PREPARING,
    index_1.OrderStatus.READY,
    index_1.OrderStatus.DISPATCHED,
    index_1.OrderStatus.OUT_FOR_DELIVERY,
]);
/** Statuses that permit merchant-initiated cancellation. */
exports.ORDER_CANCELLABLE_STATES = new Set([
    index_1.OrderStatus.PLACED,
    index_1.OrderStatus.CONFIRMED,
    index_1.OrderStatus.PREPARING,
    index_1.OrderStatus.READY,
    index_1.OrderStatus.DISPATCHED,
    index_1.OrderStatus.OUT_FOR_DELIVERY,
]);
/** Convenience: can this order be cancelled from its current status? */
function canOrderBeCancelled(status) {
    return exports.ORDER_CANCELLABLE_STATES.has(status);
}
//# sourceMappingURL=orderFsm.js.map