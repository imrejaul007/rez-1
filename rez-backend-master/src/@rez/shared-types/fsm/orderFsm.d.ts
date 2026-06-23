// @ts-nocheck
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
import { OrderStatus } from '../enums/index';
export declare const ORDER_STATE_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>>;
export declare function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean;
export declare function assertValidOrderTransition(from: OrderStatus, to: OrderStatus): void;
export declare function getValidNextOrderStates(from: OrderStatus): readonly OrderStatus[];
export declare function isTerminalOrderStatus(status: OrderStatus): boolean;
/** Statuses that represent active order lifecycle (not cancelled/refunded/returned). */
export declare const ORDER_ACTIVE_STATES: ReadonlySet<OrderStatus>;
/** Statuses that permit merchant-initiated cancellation. */
export declare const ORDER_CANCELLABLE_STATES: ReadonlySet<OrderStatus>;
/** Convenience: can this order be cancelled from its current status? */
export declare function canOrderBeCancelled(status: OrderStatus): boolean;
//# sourceMappingURL=orderFsm.d.ts.map
