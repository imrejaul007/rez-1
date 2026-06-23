// @ts-nocheck
/**
 * Shared enums — canonical values used across all RuFlo services.
 * Consolidates from packages/shared-enums (deprecated).
 *
 * CoinType utilities (normalizeCoinType, isCanonicalCoinType) are in ./coinType.ts
 * to keep this file focused on enum definitions.
 */

export { CoinType, normalizeCoinType, isCanonicalCoinType, normalizeCoinTypeAs, COIN_TYPE_VALUES } from './coinType';

// User roles (7 types)
export enum UserRole {
  USER = 'user',
  CONSUMER = 'consumer',
  MERCHANT = 'merchant',
  ADMIN = 'admin',
  SUPPORT = 'support',
  OPERATOR = 'operator',
  SUPER_ADMIN = 'super_admin',
}

// Gender values
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

// Order statuses (11 states)
export enum OrderStatus {
  PLACED = 'placed',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  DISPATCHED = 'dispatched',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  CANCELLING = 'cancelling',
  RETURNED = 'returned',
  REFUNDED = 'refunded',
}

// Payment statuses (11 states + FSM)
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  REFUND_INITIATED = 'refund_initiated',
  REFUND_PROCESSING = 'refund_processing',
  REFUNDED = 'refunded',
  REFUND_FAILED = 'refund_failed',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

// Payment methods — method types (HOW the customer pays)
export enum PaymentMethod {
  UPI = 'upi',
  CARD = 'card',
  WALLET = 'wallet',
  NETBANKING = 'netbanking',
  COD = 'cod',
  BNPL = 'bnpl',
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
}

// Payment gateways — provider names (WHO processes the payment)
export enum PaymentGateway {
  STRIPE = 'stripe',
  RAZORPAY = 'razorpay',
  PAYPAL = 'paypal',
}

// CoinType enum is defined in ./coinType.ts (re-exported above) to avoid circular dependency

// Coin priority order (canonical: promo → branded → prive → cashback → referral → rez)
export const COIN_PRIORITY = ['promo', 'branded', 'prive', 'cashback', 'referral', 'rez'] as const;

// Coin transaction types
export enum CoinTransactionType {
  EARNED = 'earned',
  SPENT = 'spent',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
  BONUS = 'bonus',
  BRANDED_AWARD = 'branded_award',
}

// Campaign statuses (unified across all services)
// Includes: marketing (draft, scheduled, sending, sent, failed, cancelled)
//           ads (draft, pending_review, active, paused, rejected, completed)
//           merchant (draft, active, paused, completed, expired, cancelled)
export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  REJECTED = 'rejected',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Campaign channels (unified across all services)
// Includes: marketing (whatsapp, push, sms, email, in_app)
//           generic support (social, web, api)
export enum CampaignChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WHATSAPP = 'whatsapp',
  SOCIAL = 'social',
  WEB = 'web',
  API = 'api',
}

// Notification types
export enum NotificationType {
  ORDER = 'order',
  PAYMENT = 'payment',
  PROMOTION = 'promotion',
  WALLET = 'wallet',
  REFERRAL = 'referral',
  SYSTEM = 'system',
  ALERT = 'alert',
}

// Notification channels
export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}

// Offer types
export enum OfferType {
  CASHBACK = 'cashback',
  DISCOUNT = 'discount',
  VOUCHER = 'voucher',
  COMBO = 'combo',
  SPECIAL = 'special',
  WALK_IN = 'walk_in',
}

// Discount types
export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_MORE_SAVE_MORE = 'buy_more_save_more',
}

// Finance transaction types
export enum FinanceTransactionType {
  BNPL_PAYMENT = 'bnpl_payment',
  BILL_PAYMENT = 'bill_payment',
  RECHARGE = 'recharge',
  EMI_PAYMENT = 'emi_payment',
  CREDIT_CARD_PAYMENT = 'credit_card_payment',
}

// Finance transaction statuses
export enum FinanceTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// User verification status (5 states: unverified → pending → verified/rejected/expired)
export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

// Jewelry preferences
export enum JewelryStyle {
  TRADITIONAL = 'traditional',
  MODERN = 'modern',
  VINTAGE = 'vintage',
  CONTEMPORARY = 'contemporary',
}

// User theme
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

// Referral tiers
export enum ReferralTier {
  STARTER = 'STARTER',
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

// Rez Plus tier
export enum RezPlusTier {
  FREE = 'free',
  PREMIUM = 'premium',
  VIP = 'vip',
}

// Prive tier
export enum PriveTier {
  NONE = 'none',
  ENTRY = 'entry',
  SIGNATURE = 'signature',
  ELITE = 'elite',
}

// Loyalty tier
export enum LoyaltyTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

// Location source
export enum LocationSource {
  MANUAL = 'manual',
  GPS = 'gps',
  IP = 'ip',
}

// Document types
export enum DocumentType {
  STUDENT_ID = 'student_id',
  EDU_EMAIL = 'edu_email',
  ENROLLMENT_LETTER = 'enrollment_letter',
  MILITARY_ID = 'military_id',
  SERVICE_CARD = 'service_card',
  CANTEEN_CARD = 'canteen_card',
  EX_SERVICEMEN_CARD = 'ex_servicemen_card',
  HOSPITAL_ID = 'hospital_id',
  MEDICAL_COUNCIL = 'medical_council',
  NURSING_LICENSE = 'nursing_license',
  SCHOOL_ID = 'school_id',
  COLLEGE_ID = 'college_id',
  UGC_ID = 'ugc_id',
  GOVT_ID = 'govt_id',
  PAY_SLIP = 'pay_slip',
  DISABILITY_CERTIFICATE = 'disability_certificate',
  UDID_CARD = 'udid_card',
}

// Professional types
export enum ProfessionType {
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  PARAMEDIC = 'paramedic',
  PHARMACIST = 'pharmacist',
}

// Service types
export enum ServiceType {
  ARMY = 'army',
  NAVY = 'navy',
  AIRFORCE = 'airforce',
  PARAMILITARY = 'paramilitary',
}

// Analytics event types
export enum EventType {
  PAGE_VIEW = 'page_view',
  CLICK = 'click',
  PURCHASE = 'purchase',
  ADD_TO_CART = 'add_to_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  SEARCH = 'search',
  FILTER = 'filter',
  SHARE = 'share',
  LOGIN = 'login',
  LOGOUT = 'logout',
  SIGNUP = 'signup',
  ERROR = 'error',
}

// Coin transaction status
export enum TransactionStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
  FAILED = 'failed',
}

// CorpPerks enums - re-exported from corpPerks.ts
export {
  CorpRole,
  BenefitType,
  CorpCoinType,
  BookingType,
  CorporateOrderStatus,
  CorpPartnerTier,
  CorpPaymentSource,
  GSTServiceType,
  GiftCampaignType,
  TravelPurpose,
} from './corpPerks';
