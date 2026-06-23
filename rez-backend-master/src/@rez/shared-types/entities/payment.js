"use strict";
/**
 * Payment entity — canonical shape for the `payments` collection.
 *
 * Mirrors rezbackend/src/models/Payment.ts (authoritative writer is the
 * rez-payment-service; backend reads only).
 *
 * The status enum covers all 11 states the FSM understands; see
 * `../fsm/paymentFsm.ts` for transition rules. Convenience helpers are
 * re-exported from `../index.ts`.
 *
 * Design choices worth reading:
 *   - `metadata` is typed as `PaymentMetadata` with KNOWN gateway keys,
 *     not `Record<string, any>`. Unknown keys still pass through via
 *     index signature, but at least razorpayOrderId / stripeWebhookId /
 *     paypalOrderId get IDE completion.
 *   - `gatewayResponse` is a discriminated union on `gateway` so upi-
 *     specific fields (upiId) don't appear on card responses.
 *   - Timestamps are `Date` (node) or `string` (serialized). The schema
 *     accepts either; callers should normalize on ingress.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYMENT_STATE_TRANSITIONS = void 0;
/**
 * Re-export the FSM transition map for backward compatibility with
 * callers that imported `PAYMENT_STATE_TRANSITIONS` from the entity
 * file before the FSM helpers were split out.
 */
var paymentFsm_1 = require("../fsm/paymentFsm");
Object.defineProperty(exports, "PAYMENT_STATE_TRANSITIONS", { enumerable: true, get: function () { return paymentFsm_1.PAYMENT_STATE_TRANSITIONS; } });
//# sourceMappingURL=payment.js.map