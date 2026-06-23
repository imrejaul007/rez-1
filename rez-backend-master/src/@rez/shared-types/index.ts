// @ts-nocheck
/**
 * @rez/shared — canonical cross-repo type surface.
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
 *   import type { IOrder, IUser } from './@rez/shared-types';
 *   import { OrderStatus, CoinType } from './@rez/shared-types';
 *
 *   // Zod schemas (backend, admin)
 *   import { CreateOrderSchema, WalletDebitSchema } from './@rez/shared-types';
 *
 *   // FSM helpers (backend, admin, merchant)
 *   import { isValidPaymentTransition, canOrderBeCancelled } from './@rez/shared-types';
 *
 *   // Branded IDs (backend, merchant where strict)
 *   import { toOrderId, type OrderId } from './@rez/shared-types';
 *
 *   // Runtime guards (consumer — no zod)
 *   import { isOrderResponse, asPaymentStatus } from './@rez/shared-types';
 */

// ─── Enums ────────────────────────────────────────────────────────────────────
export {
  UserRole,
  Gender,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  PaymentGateway,
  CoinType,
  COIN_PRIORITY,
  CoinTransactionType,
  CampaignStatus,
  CampaignChannel,
  NotificationType,
  NotificationChannel,
  OfferType,
  DiscountType,
  FinanceTransactionType,
  FinanceTransactionStatus,
  VerificationStatus,
  JewelryStyle,
  Theme,
  ReferralTier,
  RezPlusTier,
  PriveTier,
  LoyaltyTier,
  LocationSource,
  DocumentType,
  ProfessionType,
  ServiceType,
  EventType,
  TransactionStatus,
  normalizeCoinType,
  isCanonicalCoinType,
  normalizeCoinTypeAs,
  COIN_TYPE_VALUES,
} from './enums/index';

// ─── Entities ─────────────────────────────────────────────────────────────────
export type {
  IUserProfile,
  IUserPreferences,
  IUserAuth,
  IUserReferral,
  IUserWallet,
  IUserVerifications,
  IUser,
  IUserLocation,
  IUserLocationHistory,
  IUserJewelryPreferences,
  IUserNotificationPreferences,
  IUserVerificationDocument,
  IUserSocialLogin,
  IUserPushToken,
  IUserPatchTest,
  IUserFraudFlags,
  IStudentVerification,
  ICorporateVerification,
  IDefenceVerification,
  IHealthcareVerification,
  ISeniorVerification,
  ITeacherVerification,
  IGovernmentVerification,
  IDifferentlyAbledVerification,
  UserAccountStatus,
  UserVerificationSegment,
  UserSegment,
  UserInstituteStatus,
  UserStatedIdentity,
} from './entities/user';

export type {
  IOrder,
  IOrderItem,
  IOrderTotals,
  IOrderPayment,
  IOrderDelivery,
  IOrderAddress,
  IOrderServiceBookingDetails,
  IFulfillmentDetails,
  IOrderDeliveryAttempt,
  IOrderTimelineEntry,
  IOrderAnalytics,
  FulfillmentType,
  OrderItemType,
  OrderServiceLocation,
  OrderPaymentMethod,
  OrderDeliveryMethod,
  OrderDeliveryStatus,
  OrderAnalyticsSource,
  OrderAddressType,
  OrderPriority,
} from './entities/order';

export type {
  IPayment,
  IPaymentUserDetails,
  IPaymentGatewayResponse,
  PaymentMetadata,
  PaymentPurpose,
} from './entities/payment';
export { PAYMENT_STATE_TRANSITIONS } from './entities/payment';

export type {
  IProduct,
  IProductPricing,
  IProductRating,
  IProductRatingDistribution,
  IProductReviewStats,
  IProductImage,
  IProductVariant,
  IProductInventory,
  IProductSpecification,
  IProductSEO,
  IProductAnalytics,
  IProductCashback,
  IProductDeliveryInfo,
  IFrequentlyBoughtWith,
  IServiceDetails,
  IModifierOption,
  IModifier,
  IProductGST,
  ProductType,
  ProductVisibility,
  ProductTaxSlab,
  ProductMenuPeriod,
  ProductServiceLocation,
  ProductCancellationFee,
} from './entities/product';

export type {
  IWallet,
  ICoin,
  IBrandedCoin,
  IBrandedCoinDetails,
  IPromoCoinDetails,
  ICoinTransaction,
  IWalletBalance,
  IWalletStatistics,
  IWalletLimits,
  IWalletSavingsInsights,
  IWalletSettings,
  ICategoryBalance,
} from './entities/wallet';
export { COIN_PRIORITY_ORDER, getValidNextWalletDebitCoin } from './entities/wallet';

export type { IBaseCampaign, IMarketingCampaign, IAdCampaign, IMerchantCampaign, ICampaign } from './entities/campaign';

export type { INotification, INotificationEvent, INotificationRecipient } from './entities/notification';

export type { IMerchant, IMerchantProfile, IMerchantLocation } from './entities/merchant';

export type { IOffer, IOfferConditions } from './entities/offer';

export type { IFinanceTransaction } from './entities/finance';

export type { IBadge, IReward } from './entities/gamification';

export type {
  IKarmaProfile,
  IKarmaEvent,
  IQRCodeSet,
  IConversionBatch,
  ILevelInfo,
  IKarmaStats,
  IEarnRecord,
  IVerificationSignals,
  IBadge as IBadgeKarma,
  ILevelHistoryEntry,
  IConversionHistoryEntry,
  KarmaProfileDelta,
  KarmaLevel,
  KarmaConversionRate,
  EarnRecordStatus,
  BatchStatus,
  CSRPoolStatus,
  KarmaVerificationStatus,
  EventDifficulty,
  EventCategory,
  KarmaEventStatus,
  KarmaScoreBand,
  TrustGrade,
  MomentumLabel,
  KarmaScoreComponents,
  BandMetadata,
  StabilitySnapshot,
  ScoreHistoryEntry,
  PerkType,
  PerkClaimStatus,
} from './entities/karma';

export type { IAnalyticsEvent, IAnalyticsEventContext } from './entities/analytics';

// ─── FSM helpers ──────────────────────────────────────────────────────────────
export {
  // Payment FSM
  isValidPaymentTransition,
  assertValidPaymentTransition,
  getValidNextPaymentStates,
  isTerminalPaymentStatus,
  PAYMENT_SUCCESS_STATES,
  PAYMENT_FAILURE_STATES,
  PAYMENT_REFUND_STATES,
  isPaymentOutcomeState,
  // Order FSM
  ORDER_STATE_TRANSITIONS,
  isValidOrderTransition,
  assertValidOrderTransition,
  getValidNextOrderStates,
  isTerminalOrderStatus,
  ORDER_ACTIVE_STATES,
  ORDER_CANCELLABLE_STATES,
  canOrderBeCancelled,
  // Order.payment FSM
  ORDER_PAYMENT_STATUSES,
  ORDER_PAYMENT_STATE_TRANSITIONS,
  isValidOrderPaymentTransition,
  assertValidOrderPaymentTransition,
  getValidNextOrderPaymentStates,
  mapPaymentStatusToOrderPaymentStatus,
} from './fsm/index';
export type { OrderPaymentStatus } from './fsm/index';

// ─── Branded IDs ──────────────────────────────────────────────────────────────
export type {
  Brand,
  OrderId,
  UserId,
  MerchantId,
  StoreId,
  ProductId,
  PaymentId,
  WalletId,
  CategoryId,
  CampaignId,
  CouponId,
  RefundId,
} from './branded/ids';
export {
  isObjectIdLike,
  toOrderId,
  toUserId,
  toMerchantId,
  toStoreId,
  toProductId,
  toPaymentId,
  toWalletId,
  toCategoryId,
  toCampaignId,
  toCouponId,
  toRefundId,
} from './branded/ids';

// ─── Runtime guards (no zod) ──────────────────────────────────────────────────
export {
  isOrderResponse,
  isPaymentResponse,
  isWalletResponse,
  isUserResponse,
  isProductResponse,
  asOrderStatus,
  asPaymentStatus,
  asCoinType,
  isArrayOf,
} from './guards/index';

// ─── Zod schemas ──────────────────────────────────────────────────────────────
// Each domain's schema module is also exported on the root so callers can
// `import { CreateOrderSchema } from './@rez/shared-types'`.
export {
  ORDER_STATUS,
  ORDER_PAYMENT_STATUS,
  OrderItemSchema,
  OrderTotalsSchema,
  OrderPaymentSchema,
  OrderAddressSchema,
  OrderDeliverySchema,
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  OrderResponseSchema,
  OrderListResponseSchema,
  type CreateOrderRequest,
  type UpdateOrderStatusRequest,
  type OrderResponse,
  type OrderListResponse,
} from './schemas/order.schema';

export {
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_GATEWAY,
  PAYMENT_PURPOSE,
  PaymentUserDetailsSchema,
  PaymentGatewayResponseSchema,
  PaymentMetadataSchema,
  CreatePaymentSchema,
  UpdatePaymentStatusSchema,
  PaymentResponseSchema,
  PaymentListResponseSchema,
  type CreatePaymentRequest,
  type UpdatePaymentStatusRequest,
  type PaymentResponse,
  type PaymentListResponse,
} from './schemas/payment.schema';

export {
  PRODUCT_TYPE,
  PRODUCT_VISIBILITY,
  TAX_SLAB,
  MENU_PERIOD,
  ProductImageSchema,
  ProductGSTSchema,
  ProductPricingSchema,
  ProductRatingSchema,
  ProductRatingDistributionSchema,
  ProductVariantSchema,
  ProductInventorySchema,
  ProductModifierOptionSchema,
  ProductModifierSchema,
  CreateProductSchema,
  UpdateProductSchema,
  ProductResponseSchema,
  ProductListResponseSchema,
  type CreateProductRequest,
  type UpdateProductRequest,
  type ProductResponse,
  type ProductListResponse,
} from './schemas/product.schema';

export {
  COIN_TYPE,
  COIN_TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  WalletBalanceSchema,
  CoinSchema,
  BrandedCoinSchema,
  WalletDebitSchema,
  WalletCreditSchema,
  CoinTransactionResponseSchema,
  CoinTransactionListResponseSchema,
  WalletBalanceResponseSchema,
  type WalletDebitRequest,
  type WalletCreditRequest,
  type CoinTransactionResponse,
  type CoinTransactionListResponse,
  type WalletBalanceResponse,
} from './schemas/wallet.schema';

// Campaign / user / notification schemas are still exported from their modules.
export * from './schemas/campaign.schema';
export * from './schemas/user.schema';
export * from './schemas/notification.schema';
