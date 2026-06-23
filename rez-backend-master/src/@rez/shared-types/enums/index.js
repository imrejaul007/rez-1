"use strict";
/**
 * Shared enums — canonical values used across all RuFlo services.
 * Consolidates from packages/shared-enums (deprecated).
 *
 * CoinType utilities (normalizeCoinType, isCanonicalCoinType) are in ./coinType.ts
 * to keep this file focused on enum definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelPurpose = exports.GiftCampaignType = exports.GSTServiceType = exports.CorpPaymentSource = exports.CorpPartnerTier = exports.CorporateOrderStatus = exports.BookingType = exports.CorpCoinType = exports.BenefitType = exports.CorpRole = exports.TransactionStatus = exports.EventType = exports.ServiceType = exports.ProfessionType = exports.DocumentType = exports.LocationSource = exports.LoyaltyTier = exports.PriveTier = exports.RezPlusTier = exports.ReferralTier = exports.Theme = exports.JewelryStyle = exports.VerificationStatus = exports.FinanceTransactionStatus = exports.FinanceTransactionType = exports.DiscountType = exports.OfferType = exports.NotificationChannel = exports.NotificationType = exports.CampaignChannel = exports.CampaignStatus = exports.CoinTransactionType = exports.COIN_PRIORITY = exports.PaymentGateway = exports.PaymentMethod = exports.PaymentStatus = exports.OrderStatus = exports.Gender = exports.UserRole = exports.COIN_TYPE_VALUES = exports.normalizeCoinTypeAs = exports.isCanonicalCoinType = exports.normalizeCoinType = exports.CoinType = void 0;
var coinType_1 = require("./coinType");
Object.defineProperty(exports, "CoinType", { enumerable: true, get: function () { return coinType_1.CoinType; } });
Object.defineProperty(exports, "normalizeCoinType", { enumerable: true, get: function () { return coinType_1.normalizeCoinType; } });
Object.defineProperty(exports, "isCanonicalCoinType", { enumerable: true, get: function () { return coinType_1.isCanonicalCoinType; } });
Object.defineProperty(exports, "normalizeCoinTypeAs", { enumerable: true, get: function () { return coinType_1.normalizeCoinTypeAs; } });
Object.defineProperty(exports, "COIN_TYPE_VALUES", { enumerable: true, get: function () { return coinType_1.COIN_TYPE_VALUES; } });
// User roles (7 types)
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "user";
    UserRole["CONSUMER"] = "consumer";
    UserRole["MERCHANT"] = "merchant";
    UserRole["ADMIN"] = "admin";
    UserRole["SUPPORT"] = "support";
    UserRole["OPERATOR"] = "operator";
    UserRole["SUPER_ADMIN"] = "super_admin";
})(UserRole || (exports.UserRole = UserRole = {}));
// Gender values
var Gender;
(function (Gender) {
    Gender["MALE"] = "male";
    Gender["FEMALE"] = "female";
    Gender["OTHER"] = "other";
    Gender["PREFER_NOT_TO_SAY"] = "prefer_not_to_say";
})(Gender || (exports.Gender = Gender = {}));
// Order statuses (11 states)
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PLACED"] = "placed";
    OrderStatus["CONFIRMED"] = "confirmed";
    OrderStatus["PREPARING"] = "preparing";
    OrderStatus["READY"] = "ready";
    OrderStatus["DISPATCHED"] = "dispatched";
    OrderStatus["OUT_FOR_DELIVERY"] = "out_for_delivery";
    OrderStatus["DELIVERED"] = "delivered";
    OrderStatus["CANCELLED"] = "cancelled";
    OrderStatus["CANCELLING"] = "cancelling";
    OrderStatus["RETURNED"] = "returned";
    OrderStatus["REFUNDED"] = "refunded";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
// Payment statuses (11 states + FSM)
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["CANCELLED"] = "cancelled";
    PaymentStatus["EXPIRED"] = "expired";
    PaymentStatus["REFUND_INITIATED"] = "refund_initiated";
    PaymentStatus["REFUND_PROCESSING"] = "refund_processing";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["REFUND_FAILED"] = "refund_failed";
    PaymentStatus["PARTIALLY_REFUNDED"] = "partially_refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
// Payment methods — method types (HOW the customer pays)
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["UPI"] = "upi";
    PaymentMethod["CARD"] = "card";
    PaymentMethod["WALLET"] = "wallet";
    PaymentMethod["NETBANKING"] = "netbanking";
    PaymentMethod["COD"] = "cod";
    PaymentMethod["BNPL"] = "bnpl";
    PaymentMethod["RAZORPAY"] = "razorpay";
    PaymentMethod["STRIPE"] = "stripe";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
// Payment gateways — provider names (WHO processes the payment)
var PaymentGateway;
(function (PaymentGateway) {
    PaymentGateway["STRIPE"] = "stripe";
    PaymentGateway["RAZORPAY"] = "razorpay";
    PaymentGateway["PAYPAL"] = "paypal";
})(PaymentGateway || (exports.PaymentGateway = PaymentGateway = {}));
// CoinType enum is defined in ./coinType.ts (re-exported above) to avoid circular dependency
// Coin priority order (canonical: promo → branded → prive → cashback → referral → rez)
exports.COIN_PRIORITY = ['promo', 'branded', 'prive', 'cashback', 'referral', 'rez'];
// Coin transaction types
var CoinTransactionType;
(function (CoinTransactionType) {
    CoinTransactionType["EARNED"] = "earned";
    CoinTransactionType["SPENT"] = "spent";
    CoinTransactionType["EXPIRED"] = "expired";
    CoinTransactionType["REFUNDED"] = "refunded";
    CoinTransactionType["BONUS"] = "bonus";
    CoinTransactionType["BRANDED_AWARD"] = "branded_award";
})(CoinTransactionType || (exports.CoinTransactionType = CoinTransactionType = {}));
// Campaign statuses (unified across all services)
// Includes: marketing (draft, scheduled, sending, sent, failed, cancelled)
//           ads (draft, pending_review, active, paused, rejected, completed)
//           merchant (draft, active, paused, completed, expired, cancelled)
var CampaignStatus;
(function (CampaignStatus) {
    CampaignStatus["DRAFT"] = "draft";
    CampaignStatus["SCHEDULED"] = "scheduled";
    CampaignStatus["SENDING"] = "sending";
    CampaignStatus["SENT"] = "sent";
    CampaignStatus["PENDING_REVIEW"] = "pending_review";
    CampaignStatus["ACTIVE"] = "active";
    CampaignStatus["PAUSED"] = "paused";
    CampaignStatus["COMPLETED"] = "completed";
    CampaignStatus["EXPIRED"] = "expired";
    CampaignStatus["REJECTED"] = "rejected";
    CampaignStatus["FAILED"] = "failed";
    CampaignStatus["CANCELLED"] = "cancelled";
})(CampaignStatus || (exports.CampaignStatus = CampaignStatus = {}));
// Campaign channels (unified across all services)
// Includes: marketing (whatsapp, push, sms, email, in_app)
//           generic support (social, web, api)
var CampaignChannel;
(function (CampaignChannel) {
    CampaignChannel["EMAIL"] = "email";
    CampaignChannel["SMS"] = "sms";
    CampaignChannel["PUSH"] = "push";
    CampaignChannel["IN_APP"] = "in_app";
    CampaignChannel["WHATSAPP"] = "whatsapp";
    CampaignChannel["SOCIAL"] = "social";
    CampaignChannel["WEB"] = "web";
    CampaignChannel["API"] = "api";
})(CampaignChannel || (exports.CampaignChannel = CampaignChannel = {}));
// Notification types
var NotificationType;
(function (NotificationType) {
    NotificationType["ORDER"] = "order";
    NotificationType["PAYMENT"] = "payment";
    NotificationType["PROMOTION"] = "promotion";
    NotificationType["WALLET"] = "wallet";
    NotificationType["REFERRAL"] = "referral";
    NotificationType["SYSTEM"] = "system";
    NotificationType["ALERT"] = "alert";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
// Notification channels
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["PUSH"] = "push";
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["IN_APP"] = "in_app";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
// Offer types
var OfferType;
(function (OfferType) {
    OfferType["CASHBACK"] = "cashback";
    OfferType["DISCOUNT"] = "discount";
    OfferType["VOUCHER"] = "voucher";
    OfferType["COMBO"] = "combo";
    OfferType["SPECIAL"] = "special";
    OfferType["WALK_IN"] = "walk_in";
})(OfferType || (exports.OfferType = OfferType = {}));
// Discount types
var DiscountType;
(function (DiscountType) {
    DiscountType["PERCENTAGE"] = "percentage";
    DiscountType["FIXED_AMOUNT"] = "fixed_amount";
    DiscountType["BUY_MORE_SAVE_MORE"] = "buy_more_save_more";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
// Finance transaction types
var FinanceTransactionType;
(function (FinanceTransactionType) {
    FinanceTransactionType["BNPL_PAYMENT"] = "bnpl_payment";
    FinanceTransactionType["BILL_PAYMENT"] = "bill_payment";
    FinanceTransactionType["RECHARGE"] = "recharge";
    FinanceTransactionType["EMI_PAYMENT"] = "emi_payment";
    FinanceTransactionType["CREDIT_CARD_PAYMENT"] = "credit_card_payment";
})(FinanceTransactionType || (exports.FinanceTransactionType = FinanceTransactionType = {}));
// Finance transaction statuses
var FinanceTransactionStatus;
(function (FinanceTransactionStatus) {
    FinanceTransactionStatus["PENDING"] = "pending";
    FinanceTransactionStatus["COMPLETED"] = "completed";
    FinanceTransactionStatus["FAILED"] = "failed";
    FinanceTransactionStatus["REFUNDED"] = "refunded";
})(FinanceTransactionStatus || (exports.FinanceTransactionStatus = FinanceTransactionStatus = {}));
// User verification status (5 states: unverified → pending → verified/rejected/expired)
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["UNVERIFIED"] = "unverified";
    VerificationStatus["PENDING"] = "pending";
    VerificationStatus["VERIFIED"] = "verified";
    VerificationStatus["REJECTED"] = "rejected";
    VerificationStatus["EXPIRED"] = "expired";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
// Jewelry preferences
var JewelryStyle;
(function (JewelryStyle) {
    JewelryStyle["TRADITIONAL"] = "traditional";
    JewelryStyle["MODERN"] = "modern";
    JewelryStyle["VINTAGE"] = "vintage";
    JewelryStyle["CONTEMPORARY"] = "contemporary";
})(JewelryStyle || (exports.JewelryStyle = JewelryStyle = {}));
// User theme
var Theme;
(function (Theme) {
    Theme["LIGHT"] = "light";
    Theme["DARK"] = "dark";
})(Theme || (exports.Theme = Theme = {}));
// Referral tiers
var ReferralTier;
(function (ReferralTier) {
    ReferralTier["STARTER"] = "STARTER";
    ReferralTier["BRONZE"] = "BRONZE";
    ReferralTier["SILVER"] = "SILVER";
    ReferralTier["GOLD"] = "GOLD";
    ReferralTier["PLATINUM"] = "PLATINUM";
    ReferralTier["DIAMOND"] = "DIAMOND";
})(ReferralTier || (exports.ReferralTier = ReferralTier = {}));
// Rez Plus tier
var RezPlusTier;
(function (RezPlusTier) {
    RezPlusTier["FREE"] = "free";
    RezPlusTier["PREMIUM"] = "premium";
    RezPlusTier["VIP"] = "vip";
})(RezPlusTier || (exports.RezPlusTier = RezPlusTier = {}));
// Prive tier
var PriveTier;
(function (PriveTier) {
    PriveTier["NONE"] = "none";
    PriveTier["ENTRY"] = "entry";
    PriveTier["SIGNATURE"] = "signature";
    PriveTier["ELITE"] = "elite";
})(PriveTier || (exports.PriveTier = PriveTier = {}));
// Loyalty tier
var LoyaltyTier;
(function (LoyaltyTier) {
    LoyaltyTier["BRONZE"] = "bronze";
    LoyaltyTier["SILVER"] = "silver";
    LoyaltyTier["GOLD"] = "gold";
    LoyaltyTier["PLATINUM"] = "platinum";
    LoyaltyTier["DIAMOND"] = "diamond";
})(LoyaltyTier || (exports.LoyaltyTier = LoyaltyTier = {}));
// Location source
var LocationSource;
(function (LocationSource) {
    LocationSource["MANUAL"] = "manual";
    LocationSource["GPS"] = "gps";
    LocationSource["IP"] = "ip";
})(LocationSource || (exports.LocationSource = LocationSource = {}));
// Document types
var DocumentType;
(function (DocumentType) {
    DocumentType["STUDENT_ID"] = "student_id";
    DocumentType["EDU_EMAIL"] = "edu_email";
    DocumentType["ENROLLMENT_LETTER"] = "enrollment_letter";
    DocumentType["MILITARY_ID"] = "military_id";
    DocumentType["SERVICE_CARD"] = "service_card";
    DocumentType["CANTEEN_CARD"] = "canteen_card";
    DocumentType["EX_SERVICEMEN_CARD"] = "ex_servicemen_card";
    DocumentType["HOSPITAL_ID"] = "hospital_id";
    DocumentType["MEDICAL_COUNCIL"] = "medical_council";
    DocumentType["NURSING_LICENSE"] = "nursing_license";
    DocumentType["SCHOOL_ID"] = "school_id";
    DocumentType["COLLEGE_ID"] = "college_id";
    DocumentType["UGC_ID"] = "ugc_id";
    DocumentType["GOVT_ID"] = "govt_id";
    DocumentType["PAY_SLIP"] = "pay_slip";
    DocumentType["DISABILITY_CERTIFICATE"] = "disability_certificate";
    DocumentType["UDID_CARD"] = "udid_card";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
// Professional types
var ProfessionType;
(function (ProfessionType) {
    ProfessionType["DOCTOR"] = "doctor";
    ProfessionType["NURSE"] = "nurse";
    ProfessionType["PARAMEDIC"] = "paramedic";
    ProfessionType["PHARMACIST"] = "pharmacist";
})(ProfessionType || (exports.ProfessionType = ProfessionType = {}));
// Service types
var ServiceType;
(function (ServiceType) {
    ServiceType["ARMY"] = "army";
    ServiceType["NAVY"] = "navy";
    ServiceType["AIRFORCE"] = "airforce";
    ServiceType["PARAMILITARY"] = "paramilitary";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
// Analytics event types
var EventType;
(function (EventType) {
    EventType["PAGE_VIEW"] = "page_view";
    EventType["CLICK"] = "click";
    EventType["PURCHASE"] = "purchase";
    EventType["ADD_TO_CART"] = "add_to_cart";
    EventType["REMOVE_FROM_CART"] = "remove_from_cart";
    EventType["SEARCH"] = "search";
    EventType["FILTER"] = "filter";
    EventType["SHARE"] = "share";
    EventType["LOGIN"] = "login";
    EventType["LOGOUT"] = "logout";
    EventType["SIGNUP"] = "signup";
    EventType["ERROR"] = "error";
})(EventType || (exports.EventType = EventType = {}));
// Coin transaction status
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["COMPLETED"] = "completed";
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["FAILED"] = "failed";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
// CorpPerks enums - re-exported from corpPerks.ts
var corpPerks_1 = require("./corpPerks");
Object.defineProperty(exports, "CorpRole", { enumerable: true, get: function () { return corpPerks_1.CorpRole; } });
Object.defineProperty(exports, "BenefitType", { enumerable: true, get: function () { return corpPerks_1.BenefitType; } });
Object.defineProperty(exports, "CorpCoinType", { enumerable: true, get: function () { return corpPerks_1.CorpCoinType; } });
Object.defineProperty(exports, "BookingType", { enumerable: true, get: function () { return corpPerks_1.BookingType; } });
Object.defineProperty(exports, "CorporateOrderStatus", { enumerable: true, get: function () { return corpPerks_1.CorporateOrderStatus; } });
Object.defineProperty(exports, "CorpPartnerTier", { enumerable: true, get: function () { return corpPerks_1.CorpPartnerTier; } });
Object.defineProperty(exports, "CorpPaymentSource", { enumerable: true, get: function () { return corpPerks_1.CorpPaymentSource; } });
Object.defineProperty(exports, "GSTServiceType", { enumerable: true, get: function () { return corpPerks_1.GSTServiceType; } });
Object.defineProperty(exports, "GiftCampaignType", { enumerable: true, get: function () { return corpPerks_1.GiftCampaignType; } });
Object.defineProperty(exports, "TravelPurpose", { enumerable: true, get: function () { return corpPerks_1.TravelPurpose; } });
//# sourceMappingURL=index.js.map