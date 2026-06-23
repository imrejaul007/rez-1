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

/** 24-char hex regex matching MongoDB ObjectId. */
const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

/** Generic brand helper — `T & { readonly __brand: B }`. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

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
export function isObjectIdLike(s: unknown): s is string {
  return typeof s === 'string' && OBJECT_ID_REGEX.test(s);
}

/** Throws if `s` isn't a 24-char hex string; otherwise returns it. */
function assertObjectIdLike(s: unknown, label: string): string {
  if (!isObjectIdLike(s)) {
    throw new Error(`${label} must be a 24-char hex ObjectId, got: ${JSON.stringify(s)}`);
  }
  return s;
}

export const toOrderId = (s: unknown): OrderId => assertObjectIdLike(s, 'OrderId') as OrderId;
export const toUserId = (s: unknown): UserId => assertObjectIdLike(s, 'UserId') as UserId;
export const toMerchantId = (s: unknown): MerchantId => assertObjectIdLike(s, 'MerchantId') as MerchantId;
export const toStoreId = (s: unknown): StoreId => assertObjectIdLike(s, 'StoreId') as StoreId;
export const toProductId = (s: unknown): ProductId => assertObjectIdLike(s, 'ProductId') as ProductId;
/**
 * Payment IDs are not ObjectIds — they are opaque gateway identifiers
 * (e.g. pay_MkXyZ123). We accept any non-empty string.
 */
export const toPaymentId = (s: unknown): PaymentId => {
  if (typeof s !== 'string' || s.trim().length === 0) {
    throw new Error(`PaymentId must be a non-empty string, got: ${JSON.stringify(s)}`);
  }
  return s as PaymentId;
};
export const toWalletId = (s: unknown): WalletId => assertObjectIdLike(s, 'WalletId') as WalletId;
export const toCategoryId = (s: unknown): CategoryId => assertObjectIdLike(s, 'CategoryId') as CategoryId;
export const toCampaignId = (s: unknown): CampaignId => assertObjectIdLike(s, 'CampaignId') as CampaignId;
export const toCouponId = (s: unknown): CouponId => assertObjectIdLike(s, 'CouponId') as CouponId;
export const toRefundId = (s: unknown): RefundId => assertObjectIdLike(s, 'RefundId') as RefundId;
