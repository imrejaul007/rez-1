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

const OBJECT_ID = /^[a-fA-F0-9]{24}$/;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

const isObjectIdString = (v: unknown): v is string => typeof v === 'string' && OBJECT_ID.test(v);

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isDateOrString = (v: unknown): boolean =>
  typeof v === 'string' || (v instanceof Date && !Number.isNaN(v.getTime()));

const ORDER_STATUS_SET: ReadonlySet<string> = new Set(Object.values(OrderStatus));
const PAYMENT_STATUS_SET: ReadonlySet<string> = new Set(Object.values(PaymentStatus));
const COIN_TYPE_SET: ReadonlySet<string> = new Set(Object.values(CoinType));

/** Minimal Order-shape guard — checks status, user, items[], totals.total, orderNumber. */
export function isOrderResponse(value: unknown): value is IOrder {
  if (!isObj(value)) return false;
  if (!isNonEmptyString(value.orderNumber)) return false;
  if (!isObjectIdString(value.user)) return false;
  if (typeof value.status !== 'string' || !ORDER_STATUS_SET.has(value.status)) return false;
  if (!Array.isArray(value.items) || value.items.length === 0) return false;
  const totals = value.totals;
  if (!isObj(totals) || !isFiniteNumber(totals.total)) return false;
  return true;
}

/** Minimal Payment-shape guard — checks paymentId, orderId, user, status, amount. */
export function isPaymentResponse(value: unknown): value is IPayment {
  if (!isObj(value)) return false;
  if (!isNonEmptyString(value.paymentId)) return false;
  if (!isNonEmptyString(value.orderId)) return false;
  if (!isObjectIdString(value.user)) return false;
  if (typeof value.status !== 'string' || !PAYMENT_STATUS_SET.has(value.status)) return false;
  if (!isFiniteNumber(value.amount) || value.amount < 0) return false;
  return true;
}

/** Minimal Wallet-shape guard — checks user + balance.{total,available,pending,cashback}. */
export function isWalletResponse(value: unknown): value is IWallet {
  if (!isObj(value)) return false;
  if (!isObjectIdString(value.user) && !isNonEmptyString(value.user)) return false;
  const balance = value.balance;
  if (!isObj(balance)) return false;
  if (
    !isFiniteNumber(balance.total) ||
    !isFiniteNumber(balance.available) ||
    !isFiniteNumber(balance.pending) ||
    !isFiniteNumber(balance.cashback)
  ) {
    return false;
  }
  if (!Array.isArray(value.coins)) return false;
  return true;
}

/** Minimal User-shape guard — checks phoneNumber, profile, auth, referral, role. */
export function isUserResponse(value: unknown): value is IUser {
  if (!isObj(value)) return false;
  if (!isNonEmptyString(value.phoneNumber)) return false;
  if (!isObj(value.profile)) return false;
  if (!isObj(value.auth)) return false;
  if (!isObj(value.referral)) return false;
  if (!isNonEmptyString(value.role)) return false;
  return true;
}

/** Minimal Product-shape guard — checks name, pricing.selling, pricing.original, sku. */
export function isProductResponse(value: unknown): value is IProduct {
  if (!isObj(value)) return false;
  if (!isNonEmptyString(value.name)) return false;
  if (!isNonEmptyString(value.sku)) return false;
  const pricing = value.pricing;
  if (!isObj(pricing)) return false;
  if (!isFiniteNumber(pricing.selling) || pricing.selling <= 0) return false;
  if (!isFiniteNumber(pricing.original) || pricing.original <= 0) return false;
  if (pricing.selling > pricing.original) return false; // violates MRP rule
  return true;
}

/** Narrow a string to OrderStatus without an exception on miss. */
export function asOrderStatus(v: unknown): OrderStatus | null {
  return typeof v === 'string' && ORDER_STATUS_SET.has(v) ? (v as OrderStatus) : null;
}

/** Narrow a string to PaymentStatus without an exception on miss. */
export function asPaymentStatus(v: unknown): PaymentStatus | null {
  return typeof v === 'string' && PAYMENT_STATUS_SET.has(v) ? (v as PaymentStatus) : null;
}

/** Narrow a string to CoinType without an exception on miss. */
export function asCoinType(v: unknown): CoinType | null {
  return typeof v === 'string' && COIN_TYPE_SET.has(v) ? (v as CoinType) : null;
}

/**
 * Array-guard helper — useful for list responses.
 *
 *   if (isArrayOf(data, isOrderResponse)) { ... }
 */
export function isArrayOf<T>(value: unknown, itemGuard: (x: unknown) => x is T): value is T[] {
  return Array.isArray(value) && value.every(itemGuard);
}

// Re-export internal helpers for testing + reuse.
export const __internal = { isObj, isNonEmptyString, isObjectIdString, isFiniteNumber, isDateOrString };
