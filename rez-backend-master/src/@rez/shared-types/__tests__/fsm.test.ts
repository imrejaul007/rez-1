// @ts-nocheck
/**
 * FSM tests — payment, order, and order-payment state machines.
 *
 * These tests pin the canonical transition graph. If a change breaks one,
 * you have three options:
 *   1. The change is wrong — revert.
 *   2. The graph genuinely evolved — update BOTH this test AND the backend
 *      `financialStateMachine.ts` copy in the same PR.
 *   3. A terminal state grew an edge — document it in MIGRATION.md.
 */

import {
  // Payment
  isValidPaymentTransition,
  assertValidPaymentTransition,
  getValidNextPaymentStates,
  isTerminalPaymentStatus,
  PAYMENT_SUCCESS_STATES,
  PAYMENT_FAILURE_STATES,
  isPaymentOutcomeState,
  // Order
  isValidOrderTransition,
  assertValidOrderTransition,
  canOrderBeCancelled,
  isTerminalOrderStatus,
  // Order.payment
  isValidOrderPaymentTransition,
  assertValidOrderPaymentTransition,
  mapPaymentStatusToOrderPaymentStatus,
} from '../fsm/index';
import { PaymentStatus, OrderStatus } from '../enums/index';

describe('Payment FSM', () => {
  test('happy path: pending → processing → completed', () => {
    expect(isValidPaymentTransition(PaymentStatus.PENDING, PaymentStatus.PROCESSING)).toBe(true);
    expect(isValidPaymentTransition(PaymentStatus.PROCESSING, PaymentStatus.COMPLETED)).toBe(true);
  });

  test('refund path: completed → refund_initiated → refund_processing → refunded', () => {
    expect(isValidPaymentTransition(PaymentStatus.COMPLETED, PaymentStatus.REFUND_INITIATED)).toBe(true);
    expect(isValidPaymentTransition(PaymentStatus.REFUND_INITIATED, PaymentStatus.REFUND_PROCESSING)).toBe(true);
    expect(isValidPaymentTransition(PaymentStatus.REFUND_PROCESSING, PaymentStatus.REFUNDED)).toBe(true);
  });

  test('terminal states: refunded, cancelled, expired have no outgoing edges', () => {
    expect(isTerminalPaymentStatus(PaymentStatus.REFUNDED)).toBe(true);
    expect(isTerminalPaymentStatus(PaymentStatus.CANCELLED)).toBe(true);
    expect(isTerminalPaymentStatus(PaymentStatus.EXPIRED)).toBe(true);
  });

  test('cannot reverse completed back to processing', () => {
    expect(isValidPaymentTransition(PaymentStatus.COMPLETED, PaymentStatus.PROCESSING)).toBe(false);
  });

  test('assert throws with allowed-list in message', () => {
    expect(() => assertValidPaymentTransition(PaymentStatus.COMPLETED, PaymentStatus.PENDING)).toThrow(
      /Allowed from completed/,
    );
  });

  test('failed can retry back to pending', () => {
    expect(isValidPaymentTransition(PaymentStatus.FAILED, PaymentStatus.PENDING)).toBe(true);
  });

  test('refund_failed can retry refund', () => {
    expect(isValidPaymentTransition(PaymentStatus.REFUND_FAILED, PaymentStatus.REFUND_INITIATED)).toBe(true);
  });

  test('partially_refunded can initiate another refund', () => {
    expect(isValidPaymentTransition(PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUND_INITIATED)).toBe(true);
  });

  test('success/failure sets are mutually exclusive', () => {
    for (const s of PAYMENT_SUCCESS_STATES) {
      expect(PAYMENT_FAILURE_STATES.has(s)).toBe(false);
    }
  });

  test('completed is an outcome state', () => {
    expect(isPaymentOutcomeState(PaymentStatus.COMPLETED)).toBe(true);
    expect(isPaymentOutcomeState(PaymentStatus.PROCESSING)).toBe(false);
  });

  test('getValidNextPaymentStates is readonly & accurate', () => {
    expect(getValidNextPaymentStates(PaymentStatus.PENDING)).toEqual([
      PaymentStatus.PROCESSING,
      PaymentStatus.CANCELLED,
      PaymentStatus.EXPIRED,
    ]);
  });
});

describe('Order FSM', () => {
  test('happy path through delivery', () => {
    expect(isValidOrderTransition(OrderStatus.PLACED, OrderStatus.CONFIRMED)).toBe(true);
    expect(isValidOrderTransition(OrderStatus.CONFIRMED, OrderStatus.PREPARING)).toBe(true);
    expect(isValidOrderTransition(OrderStatus.PREPARING, OrderStatus.READY)).toBe(true);
    expect(isValidOrderTransition(OrderStatus.READY, OrderStatus.DISPATCHED)).toBe(true);
    expect(isValidOrderTransition(OrderStatus.DISPATCHED, OrderStatus.OUT_FOR_DELIVERY)).toBe(true);
    expect(isValidOrderTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED)).toBe(true);
  });

  test('dine-in jumps ready → delivered directly', () => {
    expect(isValidOrderTransition(OrderStatus.READY, OrderStatus.DELIVERED)).toBe(true);
  });

  test('terminal states', () => {
    expect(isTerminalOrderStatus(OrderStatus.CANCELLED)).toBe(true);
    expect(isTerminalOrderStatus(OrderStatus.REFUNDED)).toBe(true);
    expect(isTerminalOrderStatus(OrderStatus.DELIVERED)).toBe(false); // can go to returned/refunded
  });

  test('cancellable states include every pre-delivered status', () => {
    expect(canOrderBeCancelled(OrderStatus.PLACED)).toBe(true);
    expect(canOrderBeCancelled(OrderStatus.PREPARING)).toBe(true);
    expect(canOrderBeCancelled(OrderStatus.OUT_FOR_DELIVERY)).toBe(true);
    expect(canOrderBeCancelled(OrderStatus.DELIVERED)).toBe(false);
    expect(canOrderBeCancelled(OrderStatus.CANCELLED)).toBe(false);
  });

  test('cancellation must go through cancelling (except from placed)', () => {
    expect(isValidOrderTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(false);
    expect(isValidOrderTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLING)).toBe(true);
    expect(isValidOrderTransition(OrderStatus.CANCELLING, OrderStatus.CANCELLED)).toBe(true);
  });

  test('assertion throws with context', () => {
    expect(() => assertValidOrderTransition(OrderStatus.DELIVERED, OrderStatus.PREPARING)).toThrow(
      /Invalid order status transition/,
    );
  });
});

describe('Order.payment FSM (sub-doc, distinct from Payment entity)', () => {
  test('pending → awaiting_payment → processing → authorized → paid', () => {
    expect(isValidOrderPaymentTransition('pending', 'awaiting_payment')).toBe(true);
    expect(isValidOrderPaymentTransition('awaiting_payment', 'processing')).toBe(true);
    expect(isValidOrderPaymentTransition('processing', 'authorized')).toBe(true);
    expect(isValidOrderPaymentTransition('authorized', 'paid')).toBe(true);
  });

  test('partial refunds can chain', () => {
    expect(isValidOrderPaymentTransition('partially_refunded', 'partially_refunded')).toBe(true);
    expect(isValidOrderPaymentTransition('partially_refunded', 'refunded')).toBe(true);
  });

  test('refunded is terminal', () => {
    expect(isValidOrderPaymentTransition('refunded', 'partially_refunded')).toBe(false);
    expect(isValidOrderPaymentTransition('refunded', 'paid')).toBe(false);
  });

  test('failed is terminal', () => {
    expect(isValidOrderPaymentTransition('failed', 'pending')).toBe(false);
  });

  test('assert throws for illegal transition', () => {
    expect(() => assertValidOrderPaymentTransition('pending', 'paid')).toThrow();
  });
});

describe('mapPaymentStatusToOrderPaymentStatus', () => {
  test('completed payment → paid order', () => {
    expect(mapPaymentStatusToOrderPaymentStatus('completed')).toBe('paid');
  });

  test('cancelled / expired payment → failed order.payment', () => {
    expect(mapPaymentStatusToOrderPaymentStatus('cancelled')).toBe('failed');
    expect(mapPaymentStatusToOrderPaymentStatus('expired')).toBe('failed');
  });

  test('refunded payment → refunded order.payment', () => {
    expect(mapPaymentStatusToOrderPaymentStatus('refunded')).toBe('refunded');
  });

  test("refund_initiated doesn't drive an order change (returns undefined)", () => {
    expect(mapPaymentStatusToOrderPaymentStatus('refund_initiated')).toBeUndefined();
  });

  test('unknown status returns undefined', () => {
    expect(mapPaymentStatusToOrderPaymentStatus('not-a-status')).toBeUndefined();
  });
});
