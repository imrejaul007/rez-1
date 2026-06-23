// @ts-nocheck
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

import { PaymentStatus } from '../enums/index';

/**
 * Payment state transitions. Terminal states map to `[]`.
 *
 * Keep in sync with rezbackend/src/config/financialStateMachine.ts.
 * The only canonical difference: `partially_refunded` is a real post-refund
 * state here; on the backend it lives on the Order sub-doc. Both models
 * agree that a partially-refunded payment can be re-refunded.
 */
export const PAYMENT_STATE_TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  [PaymentStatus.PENDING]: [PaymentStatus.PROCESSING, PaymentStatus.CANCELLED, PaymentStatus.EXPIRED],
  [PaymentStatus.PROCESSING]: [PaymentStatus.COMPLETED, PaymentStatus.FAILED],
  [PaymentStatus.COMPLETED]: [PaymentStatus.REFUND_INITIATED],
  [PaymentStatus.FAILED]: [PaymentStatus.PENDING], // retry path
  [PaymentStatus.CANCELLED]: [], // terminal
  [PaymentStatus.EXPIRED]: [], // terminal
  [PaymentStatus.REFUND_INITIATED]: [PaymentStatus.REFUND_PROCESSING],
  [PaymentStatus.REFUND_PROCESSING]: [
    PaymentStatus.REFUNDED,
    PaymentStatus.PARTIALLY_REFUNDED,
    PaymentStatus.REFUND_FAILED,
  ],
  [PaymentStatus.REFUNDED]: [], // terminal
  [PaymentStatus.REFUND_FAILED]: [PaymentStatus.REFUND_INITIATED], // retry
  [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUND_INITIATED],
} as const;

/** True if `from → to` is a legal payment transition. */
export function isValidPaymentTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  const allowed = PAYMENT_STATE_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/** Throw with a readable message if the transition is invalid. */
export function assertValidPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!isValidPaymentTransition(from, to)) {
    const allowed = PAYMENT_STATE_TRANSITIONS[from] ?? [];
    throw new Error(
      `Invalid payment status transition: ${from} → ${to}. ` +
        `Allowed from ${from}: [${allowed.join(', ') || 'none (terminal)'}]`,
    );
  }
}

/** All states reachable in one step from `from`. Empty for terminal states. */
export function getValidNextPaymentStates(from: PaymentStatus): readonly PaymentStatus[] {
  return PAYMENT_STATE_TRANSITIONS[from] ?? [];
}

/** True if the state has no outgoing transitions. */
export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return getValidNextPaymentStates(status).length === 0;
}

/** Subset of statuses that represent a successful end-to-end charge. */
export const PAYMENT_SUCCESS_STATES: ReadonlySet<PaymentStatus> = new Set([PaymentStatus.COMPLETED]);

/** Subset of statuses that represent a failed or aborted charge. */
export const PAYMENT_FAILURE_STATES: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.FAILED,
  PaymentStatus.CANCELLED,
  PaymentStatus.EXPIRED,
]);

/** Subset of statuses that represent any refund phase. */
export const PAYMENT_REFUND_STATES: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.REFUND_INITIATED,
  PaymentStatus.REFUND_PROCESSING,
  PaymentStatus.REFUNDED,
  PaymentStatus.REFUND_FAILED,
  PaymentStatus.PARTIALLY_REFUNDED,
]);

/** True if `s` is a success, failure, refund-final, or cancellation-final state. */
export function isPaymentOutcomeState(s: PaymentStatus): boolean {
  return (
    PAYMENT_SUCCESS_STATES.has(s) ||
    PAYMENT_FAILURE_STATES.has(s) ||
    s === PaymentStatus.REFUNDED ||
    s === PaymentStatus.REFUND_FAILED
  );
}
