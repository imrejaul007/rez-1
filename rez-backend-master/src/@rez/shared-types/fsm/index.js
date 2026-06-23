"use strict";
/**
 * Canonical FSMs for financial entities — re-exports.
 *
 * Keep imports narrow — e.g. `import { isValidPaymentTransition } from '@rez/shared-types/fsm'`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPaymentStatusToOrderPaymentStatus = exports.getValidNextOrderPaymentStates = exports.assertValidOrderPaymentTransition = exports.isValidOrderPaymentTransition = exports.ORDER_PAYMENT_STATE_TRANSITIONS = exports.ORDER_PAYMENT_STATUSES = exports.canOrderBeCancelled = exports.ORDER_CANCELLABLE_STATES = exports.ORDER_ACTIVE_STATES = exports.isTerminalOrderStatus = exports.getValidNextOrderStates = exports.assertValidOrderTransition = exports.isValidOrderTransition = exports.ORDER_STATE_TRANSITIONS = exports.isPaymentOutcomeState = exports.PAYMENT_REFUND_STATES = exports.PAYMENT_FAILURE_STATES = exports.PAYMENT_SUCCESS_STATES = exports.isTerminalPaymentStatus = exports.getValidNextPaymentStates = exports.assertValidPaymentTransition = exports.isValidPaymentTransition = exports.PAYMENT_STATE_TRANSITIONS = void 0;
var paymentFsm_1 = require("./paymentFsm");
Object.defineProperty(exports, "PAYMENT_STATE_TRANSITIONS", { enumerable: true, get: function () { return paymentFsm_1.PAYMENT_STATE_TRANSITIONS; } });
Object.defineProperty(exports, "isValidPaymentTransition", { enumerable: true, get: function () { return paymentFsm_1.isValidPaymentTransition; } });
Object.defineProperty(exports, "assertValidPaymentTransition", { enumerable: true, get: function () { return paymentFsm_1.assertValidPaymentTransition; } });
Object.defineProperty(exports, "getValidNextPaymentStates", { enumerable: true, get: function () { return paymentFsm_1.getValidNextPaymentStates; } });
Object.defineProperty(exports, "isTerminalPaymentStatus", { enumerable: true, get: function () { return paymentFsm_1.isTerminalPaymentStatus; } });
Object.defineProperty(exports, "PAYMENT_SUCCESS_STATES", { enumerable: true, get: function () { return paymentFsm_1.PAYMENT_SUCCESS_STATES; } });
Object.defineProperty(exports, "PAYMENT_FAILURE_STATES", { enumerable: true, get: function () { return paymentFsm_1.PAYMENT_FAILURE_STATES; } });
Object.defineProperty(exports, "PAYMENT_REFUND_STATES", { enumerable: true, get: function () { return paymentFsm_1.PAYMENT_REFUND_STATES; } });
Object.defineProperty(exports, "isPaymentOutcomeState", { enumerable: true, get: function () { return paymentFsm_1.isPaymentOutcomeState; } });
var orderFsm_1 = require("./orderFsm");
Object.defineProperty(exports, "ORDER_STATE_TRANSITIONS", { enumerable: true, get: function () { return orderFsm_1.ORDER_STATE_TRANSITIONS; } });
Object.defineProperty(exports, "isValidOrderTransition", { enumerable: true, get: function () { return orderFsm_1.isValidOrderTransition; } });
Object.defineProperty(exports, "assertValidOrderTransition", { enumerable: true, get: function () { return orderFsm_1.assertValidOrderTransition; } });
Object.defineProperty(exports, "getValidNextOrderStates", { enumerable: true, get: function () { return orderFsm_1.getValidNextOrderStates; } });
Object.defineProperty(exports, "isTerminalOrderStatus", { enumerable: true, get: function () { return orderFsm_1.isTerminalOrderStatus; } });
Object.defineProperty(exports, "ORDER_ACTIVE_STATES", { enumerable: true, get: function () { return orderFsm_1.ORDER_ACTIVE_STATES; } });
Object.defineProperty(exports, "ORDER_CANCELLABLE_STATES", { enumerable: true, get: function () { return orderFsm_1.ORDER_CANCELLABLE_STATES; } });
Object.defineProperty(exports, "canOrderBeCancelled", { enumerable: true, get: function () { return orderFsm_1.canOrderBeCancelled; } });
var orderPaymentFsm_1 = require("./orderPaymentFsm");
Object.defineProperty(exports, "ORDER_PAYMENT_STATUSES", { enumerable: true, get: function () { return orderPaymentFsm_1.ORDER_PAYMENT_STATUSES; } });
Object.defineProperty(exports, "ORDER_PAYMENT_STATE_TRANSITIONS", { enumerable: true, get: function () { return orderPaymentFsm_1.ORDER_PAYMENT_STATE_TRANSITIONS; } });
Object.defineProperty(exports, "isValidOrderPaymentTransition", { enumerable: true, get: function () { return orderPaymentFsm_1.isValidOrderPaymentTransition; } });
Object.defineProperty(exports, "assertValidOrderPaymentTransition", { enumerable: true, get: function () { return orderPaymentFsm_1.assertValidOrderPaymentTransition; } });
Object.defineProperty(exports, "getValidNextOrderPaymentStates", { enumerable: true, get: function () { return orderPaymentFsm_1.getValidNextOrderPaymentStates; } });
Object.defineProperty(exports, "mapPaymentStatusToOrderPaymentStatus", { enumerable: true, get: function () { return orderPaymentFsm_1.mapPaymentStatusToOrderPaymentStatus; } });
//# sourceMappingURL=index.js.map