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
export declare const PAYMENT_STATE_TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>>;
/** True if `from → to` is a legal payment transition. */
export declare function isValidPaymentTransition(from: PaymentStatus, to: PaymentStatus): boolean;
/** Throw with a readable message if the transition is invalid. */
export declare function assertValidPaymentTransition(from: PaymentStatus, to: PaymentStatus): void;
/** All states reachable in one step from `from`. Empty for terminal states. */
export declare function getValidNextPaymentStates(from: PaymentStatus): readonly PaymentStatus[];
/** True if the state has no outgoing transitions. */
export declare function isTerminalPaymentStatus(status: PaymentStatus): boolean;
/** Subset of statuses that represent a successful end-to-end charge. */
export declare const PAYMENT_SUCCESS_STATES: ReadonlySet<PaymentStatus>;
/** Subset of statuses that represent a failed or aborted charge. */
export declare const PAYMENT_FAILURE_STATES: ReadonlySet<PaymentStatus>;
/** Subset of statuses that represent any refund phase. */
export declare const PAYMENT_REFUND_STATES: ReadonlySet<PaymentStatus>;
/** True if `s` is a success, failure, refund-final, or cancellation-final state. */
export declare function isPaymentOutcomeState(s: PaymentStatus): boolean;
//# sourceMappingURL=paymentFsm.d.ts.map
