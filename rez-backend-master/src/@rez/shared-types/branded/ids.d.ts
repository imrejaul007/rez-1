// @ts-nocheck
/**
 * Branded ID types — compile-time tagging so OrderId isn't accidentally
 * passed where a UserId is expected.
 *
 * Behavior:
 *   - At runtime these are just strings (24-char hex MongoDB ObjectIds).
 *   - At compile time TypeScript enforces the brand via a phantom property.
 *   - Constructors validate shape and throw on malformed input, so the
 *     brand is a meaningful guarantee, not just a lie.
 *
 * Usage:
 *   import { OrderId, toOrderId } from '@rez/shared/branded';
 *   const id: OrderId = toOrderId(req.params.orderId);
 *
 *   // This fails at compile time:
 *   const u: UserId = id;   // Error: Type 'OrderId' is not assignable to 'UserId'
 */
/** Generic brand helper — `T & { readonly __brand: B }`. */
export type Brand<T, B extends string> = T & {
  readonly __brand: B;
};
export type OrderId = Brand<string, 'OrderId'>;
export type UserId = Brand<string, 'UserId'>;
export type MerchantId = Brand<string, 'MerchantId'>;
export type StoreId = Brand<string, 'StoreId'>;
export type ProductId = Brand<string, 'ProductId'>;
export type PaymentId = Brand<string, 'PaymentId'>;
export type WalletId = Brand<string, 'WalletId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type CampaignId = Brand<string, 'CampaignId'>;
export type CouponId = Brand<string, 'CouponId'>;
export type RefundId = Brand<string, 'RefundId'>;
/** True if `s` is a 24-char hex string (MongoDB ObjectId shape). */
export declare function isObjectIdLike(s: unknown): s is string;
export declare const toOrderId: (s: unknown) => OrderId;
export declare const toUserId: (s: unknown) => UserId;
export declare const toMerchantId: (s: unknown) => MerchantId;
export declare const toStoreId: (s: unknown) => StoreId;
export declare const toProductId: (s: unknown) => ProductId;
/**
 * Payment IDs are not ObjectIds — they are opaque gateway identifiers
 * (e.g. pay_MkXyZ123). We accept any non-empty string.
 */
export declare const toPaymentId: (s: unknown) => PaymentId;
export declare const toWalletId: (s: unknown) => WalletId;
export declare const toCategoryId: (s: unknown) => CategoryId;
export declare const toCampaignId: (s: unknown) => CampaignId;
export declare const toCouponId: (s: unknown) => CouponId;
export declare const toRefundId: (s: unknown) => RefundId;
//# sourceMappingURL=ids.d.ts.map
