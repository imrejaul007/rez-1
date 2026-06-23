// @ts-nocheck
/**
 * @rez/shared — Zod Validation Schemas
 *
 * Canonical Zod schemas for API boundary validation across all RuFlo services.
 * Exports request/response schemas and inferred TypeScript types.
 *
 * Import example:
 * ```
 * import { CreateProductSchema, ProductResponse } from '@rez/shared/schemas';
 *
 * const productData = await CreateProductSchema.parseAsync(req.body);
 * ```
 */

// Product schemas
export {
  ProductImageSchema,
  ProductPricingSchema,
  ProductRatingSchema,
  CreateProductSchema,
  UpdateProductSchema,
  ProductResponseSchema,
  ProductListResponseSchema,
  type CreateProductRequest,
  type UpdateProductRequest,
  type ProductResponse,
  type ProductListResponse,
} from './product.schema';

// Order schemas
export {
  ORDER_STATUS,
  OrderItemSchema,
  OrderTotalsSchema,
  OrderPaymentSchema,
  OrderDeliverySchema,
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  OrderResponseSchema,
  OrderListResponseSchema,
  type CreateOrderRequest,
  type UpdateOrderStatusRequest,
  type OrderResponse,
  type OrderListResponse,
  type OrderStatus,
} from './order.schema';

// Payment schemas
export {
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_GATEWAY,
  PAYMENT_PURPOSE,
  PaymentUserDetailsSchema,
  PaymentGatewayResponseSchema,
  CreatePaymentSchema,
  UpdatePaymentStatusSchema,
  PaymentResponseSchema,
  PaymentListResponseSchema,
  type CreatePaymentRequest,
  type UpdatePaymentStatusRequest,
  type PaymentResponse,
  type PaymentListResponse,
  type PaymentStatus,
  type PaymentMethod,
  type PaymentGateway,
  type PaymentPurpose,
} from './payment.schema';

// Wallet schemas
export {
  COIN_TYPE,
  COIN_TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  WalletBalanceSchema,
  CoinSchema,
  WalletDebitSchema,
  WalletCreditSchema,
  CoinTransactionResponseSchema,
  CoinTransactionListResponseSchema,
  WalletBalanceResponseSchema,
  COIN_PRIORITY_ORDER,
  type WalletDebitRequest,
  type WalletCreditRequest,
  type CoinTransactionResponse,
  type CoinTransactionListResponse,
  type WalletBalanceResponse,
  type CoinType,
  type CoinTransactionType,
  type TransactionStatus,
} from './wallet.schema';

// Campaign schemas
export {
  CAMPAIGN_STATUS,
  CAMPAIGN_CHANNEL,
  BaseCampaignSchema,
  CreateMarketingCampaignSchema,
  UpdateMarketingCampaignSchema,
  MarketingCampaignResponseSchema,
  CreateAdCampaignSchema,
  UpdateAdCampaignSchema,
  AdCampaignResponseSchema,
  CreateMerchantCampaignSchema,
  UpdateMerchantCampaignSchema,
  MerchantCampaignResponseSchema,
  CampaignResponseSchema,
  CampaignListResponseSchema,
  type CreateMarketingCampaignRequest,
  type UpdateMarketingCampaignRequest,
  type MarketingCampaignResponse,
  type CreateAdCampaignRequest,
  type UpdateAdCampaignRequest,
  type AdCampaignResponse,
  type CreateMerchantCampaignRequest,
  type UpdateMerchantCampaignRequest,
  type MerchantCampaignResponse,
  type CampaignResponse,
  type CampaignListResponse,
  type CampaignStatus,
  type CampaignChannel,
} from './campaign.schema';

// User schemas
export {
  USER_ROLE,
  GENDER,
  ACCOUNT_VERIFICATION_STATUS,
  THEME,
  UserLocationSchema,
  UserLocationHistorySchema,
  UserJewelryPreferencesSchema,
  UserVerificationDocumentSchema,
  UserNotificationPreferencesSchema,
  UserProfileSchema,
  UserPreferencesSchema,
  UserAuthSchema,
  CreateUserSchema,
  UpdateProfileSchema,
  UserResponseSchema,
  UserListResponseSchema,
  type CreateUserRequest,
  type UpdateProfileRequest,
  type UserResponse,
  type UserListResponse,
  type UserRole,
  type Gender,
  type AccountVerificationStatus,
  type Theme,
} from './user.schema';

// Notification schemas
export {
  NOTIFICATION_TYPE,
  NOTIFICATION_CHANNEL,
  NotificationEventSchema,
  NotificationRecipientSchema,
  SendNotificationSchema,
  NotificationResponseSchema,
  NotificationListResponseSchema,
  MarkNotificationAsReadSchema,
  BatchMarkAsReadSchema,
  type NotificationEvent,
  type NotificationRecipient,
  type SendNotificationRequest,
  type NotificationResponse,
  type NotificationListResponse,
  type NotificationType,
  type NotificationChannel,
} from './notification.schema';
