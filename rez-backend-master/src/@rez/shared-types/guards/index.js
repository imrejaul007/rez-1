"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.__internal = void 0;
exports.isOrderResponse = isOrderResponse;
exports.isPaymentResponse = isPaymentResponse;
exports.isWalletResponse = isWalletResponse;
exports.isUserResponse = isUserResponse;
exports.isProductResponse = isProductResponse;
exports.asOrderStatus = asOrderStatus;
exports.asPaymentStatus = asPaymentStatus;
exports.asCoinType = asCoinType;
exports.isArrayOf = isArrayOf;
const index_1 = require("../enums/index");
const OBJECT_ID = /^[a-fA-F0-9]{24}$/;
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isObjectIdString = (v) => typeof v === 'string' && OBJECT_ID.test(v);
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const isDateOrString = (v) => typeof v === 'string' || (v instanceof Date && !Number.isNaN(v.getTime()));
const ORDER_STATUS_SET = new Set(Object.values(index_1.OrderStatus));
const PAYMENT_STATUS_SET = new Set(Object.values(index_1.PaymentStatus));
const COIN_TYPE_SET = new Set(Object.values(index_1.CoinType));
/** Minimal Order-shape guard — checks status, user, items[], totals.total, orderNumber. */
function isOrderResponse(value) {
    if (!isObj(value))
        return false;
    if (!isNonEmptyString(value.orderNumber))
        return false;
    if (!isObjectIdString(value.user))
        return false;
    if (typeof value.status !== 'string' || !ORDER_STATUS_SET.has(value.status))
        return false;
    if (!Array.isArray(value.items) || value.items.length === 0)
        return false;
    const totals = value.totals;
    if (!isObj(totals) || !isFiniteNumber(totals.total))
        return false;
    return true;
}
/** Minimal Payment-shape guard — checks paymentId, orderId, user, status, amount. */
function isPaymentResponse(value) {
    if (!isObj(value))
        return false;
    if (!isNonEmptyString(value.paymentId))
        return false;
    if (!isNonEmptyString(value.orderId))
        return false;
    if (!isObjectIdString(value.user))
        return false;
    if (typeof value.status !== 'string' || !PAYMENT_STATUS_SET.has(value.status))
        return false;
    if (!isFiniteNumber(value.amount) || value.amount < 0)
        return false;
    return true;
}
/** Minimal Wallet-shape guard — checks user + balance.{total,available,pending,cashback}. */
function isWalletResponse(value) {
    if (!isObj(value))
        return false;
    if (!isObjectIdString(value.user) && !isNonEmptyString(value.user))
        return false;
    const balance = value.balance;
    if (!isObj(balance))
        return false;
    if (!isFiniteNumber(balance.total) ||
        !isFiniteNumber(balance.available) ||
        !isFiniteNumber(balance.pending) ||
        !isFiniteNumber(balance.cashback)) {
        return false;
    }
    if (!Array.isArray(value.coins))
        return false;
    return true;
}
/** Minimal User-shape guard — checks phoneNumber, profile, auth, referral, role. */
function isUserResponse(value) {
    if (!isObj(value))
        return false;
    if (!isNonEmptyString(value.phoneNumber))
        return false;
    if (!isObj(value.profile))
        return false;
    if (!isObj(value.auth))
        return false;
    if (!isObj(value.referral))
        return false;
    if (!isNonEmptyString(value.role))
        return false;
    return true;
}
/** Minimal Product-shape guard — checks name, pricing.selling, pricing.original, sku. */
function isProductResponse(value) {
    if (!isObj(value))
        return false;
    if (!isNonEmptyString(value.name))
        return false;
    if (!isNonEmptyString(value.sku))
        return false;
    const pricing = value.pricing;
    if (!isObj(pricing))
        return false;
    if (!isFiniteNumber(pricing.selling) || pricing.selling <= 0)
        return false;
    if (!isFiniteNumber(pricing.original) || pricing.original <= 0)
        return false;
    if (pricing.selling > pricing.original)
        return false; // violates MRP rule
    return true;
}
/** Narrow a string to OrderStatus without an exception on miss. */
function asOrderStatus(v) {
    return typeof v === 'string' && ORDER_STATUS_SET.has(v) ? v : null;
}
/** Narrow a string to PaymentStatus without an exception on miss. */
function asPaymentStatus(v) {
    return typeof v === 'string' && PAYMENT_STATUS_SET.has(v) ? v : null;
}
/** Narrow a string to CoinType without an exception on miss. */
function asCoinType(v) {
    return typeof v === 'string' && COIN_TYPE_SET.has(v) ? v : null;
}
/**
 * Array-guard helper — useful for list responses.
 *
 *   if (isArrayOf(data, isOrderResponse)) { ... }
 */
function isArrayOf(value, itemGuard) {
    return Array.isArray(value) && value.every(itemGuard);
}
// Re-export internal helpers for testing + reuse.
exports.__internal = { isObj, isNonEmptyString, isObjectIdString, isFiniteNumber, isDateOrString };
//# sourceMappingURL=index.js.map