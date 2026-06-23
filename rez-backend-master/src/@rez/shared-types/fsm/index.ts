// @ts-nocheck
/**
 * Canonical FSMs for financial entities — re-exports.
 *
 * Keep imports narrow — e.g. `import { isValidPaymentTransition } from '@rez/shared/fsm'`.
 */

export {
  PAYMENT_STATE_TRANSITIONS,
  isValidPaymentTransition,
  assertValidPaymentTransition,
  getValidNextPaymentStates,
  isTerminalPaymentStatus,
  PAYMENT_SUCCESS_STATES,
  PAYMENT_FAILURE_STATES,
  PAYMENT_REFUND_STATES,
  isPaymentOutcomeState,
} from './paymentFsm';

export {
  ORDER_STATE_TRANSITIONS,
  isValidOrderTransition,
  assertValidOrderTransition,
  getValidNextOrderStates,
  isTerminalOrderStatus,
  ORDER_ACTIVE_STATES,
  ORDER_CANCELLABLE_STATES,
  canOrderBeCancelled,
} from './orderFsm';

export {
  type OrderPaymentStatus,
  ORDER_PAYMENT_STATUSES,
  ORDER_PAYMENT_STATE_TRANSITIONS,
  isValidOrderPaymentTransition,
  assertValidOrderPaymentTransition,
  getValidNextOrderPaymentStates,
  mapPaymentStatusToOrderPaymentStatus,
} from './orderPaymentFsm';
