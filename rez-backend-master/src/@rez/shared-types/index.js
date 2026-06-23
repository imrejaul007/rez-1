"use strict";
/**
 * @rez/shared-types — canonical cross-repo type surface.
 *
 * v2.0 rewrite — see MIGRATION.md. Major additions over v1:
 *   - Strict zod schemas (no more `.passthrough()`) with discriminated unions
 *   - FSM helpers: isValidPaymentTransition, assertValidOrderTransition, etc.
 *   - Branded ID types: OrderId, UserId, PaymentId, ... (compile-time safety)
 *   - Runtime guards (no-zod): isOrderResponse, isWalletResponse, isArrayOf, ...
 *   - Deeper entity coverage matching rezbackend source of truth
 *
 * Import patterns:
 *
 *   // Entities + enums (no zod dep)
 *   import type { IOrder, IUser } from '@rez/shared-types';
 *   import { OrderStatus, CoinType } from '@rez/shared-types';
 *
 *   // Zod schemas (backend, admin)
 *   import { CreateOrderSchema, WalletDebitSchema } from '@rez/shared-types';
 *
 *   // FSM helpers (backend, admin, merchant)
 *   import { isValidPaymentTransition, canOrderBeCancelled } from '@rez/shared-types';
 *
 *   // Branded IDs (backend, merchant where strict)
 *   import { toOrderId, type OrderId } from '@rez/shared-types';
 *
 *   // Runtime guards (consumer — no zod)
 *   import { isOrderResponse, asPaymentStatus } from '@rez/shared-types';
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTerminalOrderStatus = exports.getValidNextOrderStates = exports.assertValidOrderTransition = exports.isValidOrderTransition = exports.ORDER_STATE_TRANSITIONS = exports.isPaymentOutcomeState = exports.PAYMENT_REFUND_STATES = exports.PAYMENT_FAILURE_STATES = exports.PAYMENT_SUCCESS_STATES = exports.isTerminalPaymentStatus = exports.getValidNextPaymentStates = exports.assertValidPaymentTransition = exports.isValidPaymentTransition = exports.getValidNextWalletDebitCoin = exports.COIN_PRIORITY_ORDER = exports.PAYMENT_STATE_TRANSITIONS = exports.COIN_TYPE_VALUES = exports.normalizeCoinTypeAs = exports.isCanonicalCoinType = exports.normalizeCoinType = exports.TransactionStatus = exports.EventType = exports.ServiceType = exports.ProfessionType = exports.DocumentType = exports.LocationSource = exports.LoyaltyTier = exports.PriveTier = exports.RezPlusTier = exports.ReferralTier = exports.Theme = exports.JewelryStyle = exports.VerificationStatus = exports.FinanceTransactionStatus = exports.FinanceTransactionType = exports.DiscountType = exports.OfferType = exports.NotificationChannel = exports.NotificationType = exports.CampaignChannel = exports.CampaignStatus = exports.CoinTransactionType = exports.COIN_PRIORITY = exports.CoinType = exports.PaymentGateway = exports.PaymentMethod = exports.PaymentStatus = exports.OrderStatus = exports.Gender = exports.UserRole = void 0;
exports.UpdatePaymentStatusSchema = exports.CreatePaymentSchema = exports.PaymentMetadataSchema = exports.PaymentGatewayResponseSchema = exports.PaymentUserDetailsSchema = exports.PAYMENT_PURPOSE = exports.PAYMENT_GATEWAY = exports.PAYMENT_METHOD = exports.PAYMENT_STATUS = exports.OrderListResponseSchema = exports.OrderResponseSchema = exports.UpdateOrderStatusSchema = exports.CreateOrderSchema = exports.OrderDeliverySchema = exports.OrderAddressSchema = exports.OrderPaymentSchema = exports.OrderTotalsSchema = exports.OrderItemSchema = exports.ORDER_PAYMENT_STATUS = exports.ORDER_STATUS = exports.isArrayOf = exports.asCoinType = exports.asPaymentStatus = exports.asOrderStatus = exports.isProductResponse = exports.isUserResponse = exports.isWalletResponse = exports.isPaymentResponse = exports.isOrderResponse = exports.toRefundId = exports.toCouponId = exports.toCampaignId = exports.toCategoryId = exports.toWalletId = exports.toPaymentId = exports.toProductId = exports.toStoreId = exports.toMerchantId = exports.toUserId = exports.toOrderId = exports.isObjectIdLike = exports.mapPaymentStatusToOrderPaymentStatus = exports.getValidNextOrderPaymentStates = exports.assertValidOrderPaymentTransition = exports.isValidOrderPaymentTransition = exports.ORDER_PAYMENT_STATE_TRANSITIONS = exports.ORDER_PAYMENT_STATUSES = exports.canOrderBeCancelled = exports.ORDER_CANCELLABLE_STATES = exports.ORDER_ACTIVE_STATES = void 0;
exports.WalletBalanceResponseSchema = exports.CoinTransactionListResponseSchema = exports.CoinTransactionResponseSchema = exports.WalletCreditSchema = exports.WalletDebitSchema = exports.BrandedCoinSchema = exports.CoinSchema = exports.WalletBalanceSchema = exports.TRANSACTION_STATUS = exports.COIN_TRANSACTION_TYPE = exports.COIN_TYPE = exports.ProductListResponseSchema = exports.ProductResponseSchema = exports.UpdateProductSchema = exports.CreateProductSchema = exports.ProductModifierSchema = exports.ProductModifierOptionSchema = exports.ProductInventorySchema = exports.ProductVariantSchema = exports.ProductRatingDistributionSchema = exports.ProductRatingSchema = exports.ProductPricingSchema = exports.ProductGSTSchema = exports.ProductImageSchema = exports.MENU_PERIOD = exports.TAX_SLAB = exports.PRODUCT_VISIBILITY = exports.PRODUCT_TYPE = exports.PaymentListResponseSchema = exports.PaymentResponseSchema = void 0;
// ─── Enums ────────────────────────────────────────────────────────────────────
var index_1 = require("./enums/index");
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return index_1.UserRole; } });
Object.defineProperty(exports, "Gender", { enumerable: true, get: function () { return index_1.Gender; } });
Object.defineProperty(exports, "OrderStatus", { enumerable: true, get: function () { return index_1.OrderStatus; } });
Object.defineProperty(exports, "PaymentStatus", { enumerable: true, get: function () { return index_1.PaymentStatus; } });
Object.defineProperty(exports, "PaymentMethod", { enumerable: true, get: function () { return index_1.PaymentMethod; } });
Object.defineProperty(exports, "PaymentGateway", { enumerable: true, get: function () { return index_1.PaymentGateway; } });
Object.defineProperty(exports, "CoinType", { enumerable: true, get: function () { return index_1.CoinType; } });
Object.defineProperty(exports, "COIN_PRIORITY", { enumerable: true, get: function () { return index_1.COIN_PRIORITY; } });
Object.defineProperty(exports, "CoinTransactionType", { enumerable: true, get: function () { return index_1.CoinTransactionType; } });
Object.defineProperty(exports, "CampaignStatus", { enumerable: true, get: function () { return index_1.CampaignStatus; } });
Object.defineProperty(exports, "CampaignChannel", { enumerable: true, get: function () { return index_1.CampaignChannel; } });
Object.defineProperty(exports, "NotificationType", { enumerable: true, get: function () { return index_1.NotificationType; } });
Object.defineProperty(exports, "NotificationChannel", { enumerable: true, get: function () { return index_1.NotificationChannel; } });
Object.defineProperty(exports, "OfferType", { enumerable: true, get: function () { return index_1.OfferType; } });
Object.defineProperty(exports, "DiscountType", { enumerable: true, get: function () { return index_1.DiscountType; } });
Object.defineProperty(exports, "FinanceTransactionType", { enumerable: true, get: function () { return index_1.FinanceTransactionType; } });
Object.defineProperty(exports, "FinanceTransactionStatus", { enumerable: true, get: function () { return index_1.FinanceTransactionStatus; } });
Object.defineProperty(exports, "VerificationStatus", { enumerable: true, get: function () { return index_1.VerificationStatus; } });
Object.defineProperty(exports, "JewelryStyle", { enumerable: true, get: function () { return index_1.JewelryStyle; } });
Object.defineProperty(exports, "Theme", { enumerable: true, get: function () { return index_1.Theme; } });
Object.defineProperty(exports, "ReferralTier", { enumerable: true, get: function () { return index_1.ReferralTier; } });
Object.defineProperty(exports, "RezPlusTier", { enumerable: true, get: function () { return index_1.RezPlusTier; } });
Object.defineProperty(exports, "PriveTier", { enumerable: true, get: function () { return index_1.PriveTier; } });
Object.defineProperty(exports, "LoyaltyTier", { enumerable: true, get: function () { return index_1.LoyaltyTier; } });
Object.defineProperty(exports, "LocationSource", { enumerable: true, get: function () { return index_1.LocationSource; } });
Object.defineProperty(exports, "DocumentType", { enumerable: true, get: function () { return index_1.DocumentType; } });
Object.defineProperty(exports, "ProfessionType", { enumerable: true, get: function () { return index_1.ProfessionType; } });
Object.defineProperty(exports, "ServiceType", { enumerable: true, get: function () { return index_1.ServiceType; } });
Object.defineProperty(exports, "EventType", { enumerable: true, get: function () { return index_1.EventType; } });
Object.defineProperty(exports, "TransactionStatus", { enumerable: true, get: function () { return index_1.TransactionStatus; } });
Object.defineProperty(exports, "normalizeCoinType", { enumerable: true, get: function () { return index_1.normalizeCoinType; } });
Object.defineProperty(exports, "isCanonicalCoinType", { enumerable: true, get: function () { return index_1.isCanonicalCoinType; } });
Object.defineProperty(exports, "normalizeCoinTypeAs", { enumerable: true, get: function () { return index_1.normalizeCoinTypeAs; } });
Object.defineProperty(exports, "COIN_TYPE_VALUES", { enumerable: true, get: function () { return index_1.COIN_TYPE_VALUES; } });
var payment_1 = require("./entities/payment");
Object.defineProperty(exports, "PAYMENT_STATE_TRANSITIONS", { enumerable: true, get: function () { return payment_1.PAYMENT_STATE_TRANSITIONS; } });
var wallet_1 = require("./entities/wallet");
Object.defineProperty(exports, "COIN_PRIORITY_ORDER", { enumerable: true, get: function () { return wallet_1.COIN_PRIORITY_ORDER; } });
Object.defineProperty(exports, "getValidNextWalletDebitCoin", { enumerable: true, get: function () { return wallet_1.getValidNextWalletDebitCoin; } });
// ─── FSM helpers ──────────────────────────────────────────────────────────────
var index_2 = require("./fsm/index");
// Payment FSM
Object.defineProperty(exports, "isValidPaymentTransition", { enumerable: true, get: function () { return index_2.isValidPaymentTransition; } });
Object.defineProperty(exports, "assertValidPaymentTransition", { enumerable: true, get: function () { return index_2.assertValidPaymentTransition; } });
Object.defineProperty(exports, "getValidNextPaymentStates", { enumerable: true, get: function () { return index_2.getValidNextPaymentStates; } });
Object.defineProperty(exports, "isTerminalPaymentStatus", { enumerable: true, get: function () { return index_2.isTerminalPaymentStatus; } });
Object.defineProperty(exports, "PAYMENT_SUCCESS_STATES", { enumerable: true, get: function () { return index_2.PAYMENT_SUCCESS_STATES; } });
Object.defineProperty(exports, "PAYMENT_FAILURE_STATES", { enumerable: true, get: function () { return index_2.PAYMENT_FAILURE_STATES; } });
Object.defineProperty(exports, "PAYMENT_REFUND_STATES", { enumerable: true, get: function () { return index_2.PAYMENT_REFUND_STATES; } });
Object.defineProperty(exports, "isPaymentOutcomeState", { enumerable: true, get: function () { return index_2.isPaymentOutcomeState; } });
// Order FSM
Object.defineProperty(exports, "ORDER_STATE_TRANSITIONS", { enumerable: true, get: function () { return index_2.ORDER_STATE_TRANSITIONS; } });
Object.defineProperty(exports, "isValidOrderTransition", { enumerable: true, get: function () { return index_2.isValidOrderTransition; } });
Object.defineProperty(exports, "assertValidOrderTransition", { enumerable: true, get: function () { return index_2.assertValidOrderTransition; } });
Object.defineProperty(exports, "getValidNextOrderStates", { enumerable: true, get: function () { return index_2.getValidNextOrderStates; } });
Object.defineProperty(exports, "isTerminalOrderStatus", { enumerable: true, get: function () { return index_2.isTerminalOrderStatus; } });
Object.defineProperty(exports, "ORDER_ACTIVE_STATES", { enumerable: true, get: function () { return index_2.ORDER_ACTIVE_STATES; } });
Object.defineProperty(exports, "ORDER_CANCELLABLE_STATES", { enumerable: true, get: function () { return index_2.ORDER_CANCELLABLE_STATES; } });
Object.defineProperty(exports, "canOrderBeCancelled", { enumerable: true, get: function () { return index_2.canOrderBeCancelled; } });
// Order.payment FSM
Object.defineProperty(exports, "ORDER_PAYMENT_STATUSES", { enumerable: true, get: function () { return index_2.ORDER_PAYMENT_STATUSES; } });
Object.defineProperty(exports, "ORDER_PAYMENT_STATE_TRANSITIONS", { enumerable: true, get: function () { return index_2.ORDER_PAYMENT_STATE_TRANSITIONS; } });
Object.defineProperty(exports, "isValidOrderPaymentTransition", { enumerable: true, get: function () { return index_2.isValidOrderPaymentTransition; } });
Object.defineProperty(exports, "assertValidOrderPaymentTransition", { enumerable: true, get: function () { return index_2.assertValidOrderPaymentTransition; } });
Object.defineProperty(exports, "getValidNextOrderPaymentStates", { enumerable: true, get: function () { return index_2.getValidNextOrderPaymentStates; } });
Object.defineProperty(exports, "mapPaymentStatusToOrderPaymentStatus", { enumerable: true, get: function () { return index_2.mapPaymentStatusToOrderPaymentStatus; } });
var ids_1 = require("./branded/ids");
Object.defineProperty(exports, "isObjectIdLike", { enumerable: true, get: function () { return ids_1.isObjectIdLike; } });
Object.defineProperty(exports, "toOrderId", { enumerable: true, get: function () { return ids_1.toOrderId; } });
Object.defineProperty(exports, "toUserId", { enumerable: true, get: function () { return ids_1.toUserId; } });
Object.defineProperty(exports, "toMerchantId", { enumerable: true, get: function () { return ids_1.toMerchantId; } });
Object.defineProperty(exports, "toStoreId", { enumerable: true, get: function () { return ids_1.toStoreId; } });
Object.defineProperty(exports, "toProductId", { enumerable: true, get: function () { return ids_1.toProductId; } });
Object.defineProperty(exports, "toPaymentId", { enumerable: true, get: function () { return ids_1.toPaymentId; } });
Object.defineProperty(exports, "toWalletId", { enumerable: true, get: function () { return ids_1.toWalletId; } });
Object.defineProperty(exports, "toCategoryId", { enumerable: true, get: function () { return ids_1.toCategoryId; } });
Object.defineProperty(exports, "toCampaignId", { enumerable: true, get: function () { return ids_1.toCampaignId; } });
Object.defineProperty(exports, "toCouponId", { enumerable: true, get: function () { return ids_1.toCouponId; } });
Object.defineProperty(exports, "toRefundId", { enumerable: true, get: function () { return ids_1.toRefundId; } });
// ─── Runtime guards (no zod) ──────────────────────────────────────────────────
var index_3 = require("./guards/index");
Object.defineProperty(exports, "isOrderResponse", { enumerable: true, get: function () { return index_3.isOrderResponse; } });
Object.defineProperty(exports, "isPaymentResponse", { enumerable: true, get: function () { return index_3.isPaymentResponse; } });
Object.defineProperty(exports, "isWalletResponse", { enumerable: true, get: function () { return index_3.isWalletResponse; } });
Object.defineProperty(exports, "isUserResponse", { enumerable: true, get: function () { return index_3.isUserResponse; } });
Object.defineProperty(exports, "isProductResponse", { enumerable: true, get: function () { return index_3.isProductResponse; } });
Object.defineProperty(exports, "asOrderStatus", { enumerable: true, get: function () { return index_3.asOrderStatus; } });
Object.defineProperty(exports, "asPaymentStatus", { enumerable: true, get: function () { return index_3.asPaymentStatus; } });
Object.defineProperty(exports, "asCoinType", { enumerable: true, get: function () { return index_3.asCoinType; } });
Object.defineProperty(exports, "isArrayOf", { enumerable: true, get: function () { return index_3.isArrayOf; } });
// ─── Zod schemas ──────────────────────────────────────────────────────────────
// Each domain's schema module is also exported on the root so callers can
// `import { CreateOrderSchema } from '@rez/shared-types'`.
var order_schema_1 = require("./schemas/order.schema");
Object.defineProperty(exports, "ORDER_STATUS", { enumerable: true, get: function () { return order_schema_1.ORDER_STATUS; } });
Object.defineProperty(exports, "ORDER_PAYMENT_STATUS", { enumerable: true, get: function () { return order_schema_1.ORDER_PAYMENT_STATUS; } });
Object.defineProperty(exports, "OrderItemSchema", { enumerable: true, get: function () { return order_schema_1.OrderItemSchema; } });
Object.defineProperty(exports, "OrderTotalsSchema", { enumerable: true, get: function () { return order_schema_1.OrderTotalsSchema; } });
Object.defineProperty(exports, "OrderPaymentSchema", { enumerable: true, get: function () { return order_schema_1.OrderPaymentSchema; } });
Object.defineProperty(exports, "OrderAddressSchema", { enumerable: true, get: function () { return order_schema_1.OrderAddressSchema; } });
Object.defineProperty(exports, "OrderDeliverySchema", { enumerable: true, get: function () { return order_schema_1.OrderDeliverySchema; } });
Object.defineProperty(exports, "CreateOrderSchema", { enumerable: true, get: function () { return order_schema_1.CreateOrderSchema; } });
Object.defineProperty(exports, "UpdateOrderStatusSchema", { enumerable: true, get: function () { return order_schema_1.UpdateOrderStatusSchema; } });
Object.defineProperty(exports, "OrderResponseSchema", { enumerable: true, get: function () { return order_schema_1.OrderResponseSchema; } });
Object.defineProperty(exports, "OrderListResponseSchema", { enumerable: true, get: function () { return order_schema_1.OrderListResponseSchema; } });
var payment_schema_1 = require("./schemas/payment.schema");
Object.defineProperty(exports, "PAYMENT_STATUS", { enumerable: true, get: function () { return payment_schema_1.PAYMENT_STATUS; } });
Object.defineProperty(exports, "PAYMENT_METHOD", { enumerable: true, get: function () { return payment_schema_1.PAYMENT_METHOD; } });
Object.defineProperty(exports, "PAYMENT_GATEWAY", { enumerable: true, get: function () { return payment_schema_1.PAYMENT_GATEWAY; } });
Object.defineProperty(exports, "PAYMENT_PURPOSE", { enumerable: true, get: function () { return payment_schema_1.PAYMENT_PURPOSE; } });
Object.defineProperty(exports, "PaymentUserDetailsSchema", { enumerable: true, get: function () { return payment_schema_1.PaymentUserDetailsSchema; } });
Object.defineProperty(exports, "PaymentGatewayResponseSchema", { enumerable: true, get: function () { return payment_schema_1.PaymentGatewayResponseSchema; } });
Object.defineProperty(exports, "PaymentMetadataSchema", { enumerable: true, get: function () { return payment_schema_1.PaymentMetadataSchema; } });
Object.defineProperty(exports, "CreatePaymentSchema", { enumerable: true, get: function () { return payment_schema_1.CreatePaymentSchema; } });
Object.defineProperty(exports, "UpdatePaymentStatusSchema", { enumerable: true, get: function () { return payment_schema_1.UpdatePaymentStatusSchema; } });
Object.defineProperty(exports, "PaymentResponseSchema", { enumerable: true, get: function () { return payment_schema_1.PaymentResponseSchema; } });
Object.defineProperty(exports, "PaymentListResponseSchema", { enumerable: true, get: function () { return payment_schema_1.PaymentListResponseSchema; } });
var product_schema_1 = require("./schemas/product.schema");
Object.defineProperty(exports, "PRODUCT_TYPE", { enumerable: true, get: function () { return product_schema_1.PRODUCT_TYPE; } });
Object.defineProperty(exports, "PRODUCT_VISIBILITY", { enumerable: true, get: function () { return product_schema_1.PRODUCT_VISIBILITY; } });
Object.defineProperty(exports, "TAX_SLAB", { enumerable: true, get: function () { return product_schema_1.TAX_SLAB; } });
Object.defineProperty(exports, "MENU_PERIOD", { enumerable: true, get: function () { return product_schema_1.MENU_PERIOD; } });
Object.defineProperty(exports, "ProductImageSchema", { enumerable: true, get: function () { return product_schema_1.ProductImageSchema; } });
Object.defineProperty(exports, "ProductGSTSchema", { enumerable: true, get: function () { return product_schema_1.ProductGSTSchema; } });
Object.defineProperty(exports, "ProductPricingSchema", { enumerable: true, get: function () { return product_schema_1.ProductPricingSchema; } });
Object.defineProperty(exports, "ProductRatingSchema", { enumerable: true, get: function () { return product_schema_1.ProductRatingSchema; } });
Object.defineProperty(exports, "ProductRatingDistributionSchema", { enumerable: true, get: function () { return product_schema_1.ProductRatingDistributionSchema; } });
Object.defineProperty(exports, "ProductVariantSchema", { enumerable: true, get: function () { return product_schema_1.ProductVariantSchema; } });
Object.defineProperty(exports, "ProductInventorySchema", { enumerable: true, get: function () { return product_schema_1.ProductInventorySchema; } });
Object.defineProperty(exports, "ProductModifierOptionSchema", { enumerable: true, get: function () { return product_schema_1.ProductModifierOptionSchema; } });
Object.defineProperty(exports, "ProductModifierSchema", { enumerable: true, get: function () { return product_schema_1.ProductModifierSchema; } });
Object.defineProperty(exports, "CreateProductSchema", { enumerable: true, get: function () { return product_schema_1.CreateProductSchema; } });
Object.defineProperty(exports, "UpdateProductSchema", { enumerable: true, get: function () { return product_schema_1.UpdateProductSchema; } });
Object.defineProperty(exports, "ProductResponseSchema", { enumerable: true, get: function () { return product_schema_1.ProductResponseSchema; } });
Object.defineProperty(exports, "ProductListResponseSchema", { enumerable: true, get: function () { return product_schema_1.ProductListResponseSchema; } });
var wallet_schema_1 = require("./schemas/wallet.schema");
Object.defineProperty(exports, "COIN_TYPE", { enumerable: true, get: function () { return wallet_schema_1.COIN_TYPE; } });
Object.defineProperty(exports, "COIN_TRANSACTION_TYPE", { enumerable: true, get: function () { return wallet_schema_1.COIN_TRANSACTION_TYPE; } });
Object.defineProperty(exports, "TRANSACTION_STATUS", { enumerable: true, get: function () { return wallet_schema_1.TRANSACTION_STATUS; } });
Object.defineProperty(exports, "WalletBalanceSchema", { enumerable: true, get: function () { return wallet_schema_1.WalletBalanceSchema; } });
Object.defineProperty(exports, "CoinSchema", { enumerable: true, get: function () { return wallet_schema_1.CoinSchema; } });
Object.defineProperty(exports, "BrandedCoinSchema", { enumerable: true, get: function () { return wallet_schema_1.BrandedCoinSchema; } });
Object.defineProperty(exports, "WalletDebitSchema", { enumerable: true, get: function () { return wallet_schema_1.WalletDebitSchema; } });
Object.defineProperty(exports, "WalletCreditSchema", { enumerable: true, get: function () { return wallet_schema_1.WalletCreditSchema; } });
Object.defineProperty(exports, "CoinTransactionResponseSchema", { enumerable: true, get: function () { return wallet_schema_1.CoinTransactionResponseSchema; } });
Object.defineProperty(exports, "CoinTransactionListResponseSchema", { enumerable: true, get: function () { return wallet_schema_1.CoinTransactionListResponseSchema; } });
Object.defineProperty(exports, "WalletBalanceResponseSchema", { enumerable: true, get: function () { return wallet_schema_1.WalletBalanceResponseSchema; } });
// Campaign / user / notification schemas are still exported from their modules.
__exportStar(require("./schemas/campaign.schema"), exports);
__exportStar(require("./schemas/user.schema"), exports);
__exportStar(require("./schemas/notification.schema"), exports);
//# sourceMappingURL=index.js.map