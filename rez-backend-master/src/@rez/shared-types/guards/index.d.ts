// @ts-nocheck
/**
 * Hand-rolled runtime type guards — for consumers that can't (or prefer not
 * to) depend on zod. The consumer app keeps its bundle small by using these
 * instead of the zod schemas.
 *
 * Philosophy: narrow, pragmatic checks on the fields every downstream
 * consumer actually reads. If you need full field validation, use the
 * corresponding zod schema in `schemas/`.
 *
 * All guards are `value is T`-style so TypeScript narrows at the call site:
 *
 *   if (isOrderResponse(data)) {
 *     // data is IOrder here
 *     console.log(data.orderNumber);
 *   }
 */
import type { IOrder } from '../entities/order';
import type { IPayment } from '../entities/payment';
import type { IWallet } from '../entities/wallet';
import type { IUser } from '../entities/user';
import type { IProduct } from '../entities/product';
import { OrderStatus, PaymentStatus, CoinType } from '../enums/index';
/** Minimal Order-shape guard — checks status, user, items[], totals.total, orderNumber. */
export declare function isOrderResponse(value: unknown): value is IOrder;
/** Minimal Payment-shape guard — checks paymentId, orderId, user, status, amount. */
export declare function isPaymentResponse(value: unknown): value is IPayment;
/** Minimal Wallet-shape guard — checks user + balance.{total,available,pending,cashback}. */
export declare function isWalletResponse(value: unknown): value is IWallet;
/** Minimal User-shape guard — checks phoneNumber, profile, auth, referral, role. */
export declare function isUserResponse(value: unknown): value is IUser;
/** Minimal Product-shape guard — checks name, pricing.selling, pricing.original, sku. */
export declare function isProductResponse(value: unknown): value is IProduct;
/** Narrow a string to OrderStatus without an exception on miss. */
export declare function asOrderStatus(v: unknown): OrderStatus | null;
/** Narrow a string to PaymentStatus without an exception on miss. */
export declare function asPaymentStatus(v: unknown): PaymentStatus | null;
/** Narrow a string to CoinType without an exception on miss. */
export declare function asCoinType(v: unknown): CoinType | null;
/**
 * Array-guard helper — useful for list responses.
 *
 *   if (isArrayOf(data, isOrderResponse)) { ... }
 */
export declare function isArrayOf<T>(value: unknown, itemGuard: (x: unknown) => x is T): value is T[];
export declare const __internal: {
  isObj: (v: unknown) => v is Record<string, unknown>;
  isNonEmptyString: (v: unknown) => v is string;
  isObjectIdString: (v: unknown) => v is string;
  isFiniteNumber: (v: unknown) => v is number;
  isDateOrString: (v: unknown) => boolean;
};
//# sourceMappingURL=index.d.ts.map
