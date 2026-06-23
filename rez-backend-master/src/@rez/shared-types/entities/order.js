"use strict";
/**
 * Order entity — canonical shape for the `orders` collection.
 *
 * Mirrors rezbackend/src/models/Order.ts. The Order.status FSM lives in
 * `../fsm/orderFsm.ts`; the Order.payment.status FSM lives in
 * `../fsm/orderPaymentFsm.ts`.
 *
 * Guiding choices:
 *   - Every enum value is a string literal, never `string`.
 *   - Optional vs. required matches the backend schema. Fields set by the
 *     post-payment pipeline (e.g. `postPaymentProcessed`) stay optional.
 *   - The legacy "Order.payment.status uses 'paid', Payment.status uses
 *     'completed'" gap is documented in-line so no one tries to unify them
 *     in passing. Cross-refs must go through `mapPaymentStatusToOrderPaymentStatus`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=order.js.map