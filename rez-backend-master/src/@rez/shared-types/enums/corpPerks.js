"use strict";
/**
 * @rez/shared-types/enums/corpPerks
 *
 * CorpPerks specific enums for corporate benefits, bookings, and gifting.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORP_PERKS_ENUMS = exports.TravelPurpose = exports.GiftCampaignType = exports.GSTServiceType = exports.CorpPaymentSource = exports.CorpPartnerTier = exports.CorporateOrderStatus = exports.BookingType = exports.CorpCoinType = exports.BenefitType = exports.CorpRole = void 0;
/**
 * Corporate user roles
 */
var CorpRole;
(function (CorpRole) {
    CorpRole["CORP_ADMIN"] = "corp_admin";
    CorpRole["CORP_HR"] = "corp_hr";
    CorpRole["CORP_FINANCE"] = "corp_finance";
    CorpRole["CORP_MANAGER"] = "corp_manager";
    CorpRole["CORP_EMPLOYEE"] = "corp_employee";
})(CorpRole || (exports.CorpRole = CorpRole = {}));
/**
 * Benefit types supported by CorpPerks
 */
var BenefitType;
(function (BenefitType) {
    BenefitType["MEAL"] = "meal";
    BenefitType["TRAVEL"] = "travel";
    BenefitType["GIFT"] = "gift";
    BenefitType["WELLNESS"] = "wellness";
    BenefitType["FLEX"] = "flex";
    BenefitType["LEARNING"] = "learning";
})(BenefitType || (exports.BenefitType = BenefitType = {}));
/**
 * Corporate coin types for benefit allocations
 */
var CorpCoinType;
(function (CorpCoinType) {
    CorpCoinType["MEAL_BENEFIT"] = "meal_benefit";
    CorpCoinType["DINING_CREDIT"] = "dining_credit";
    CorpCoinType["TRAVEL_BENEFIT"] = "travel_benefit";
    CorpCoinType["GIFT_BENEFIT"] = "gift_benefit";
    CorpCoinType["WELLNESS_BENEFIT"] = "wellness_benefit";
    CorpCoinType["RECOGNITION"] = "recognition";
    CorpCoinType["CSR_KARMA"] = "csr_karma";
})(CorpCoinType || (exports.CorpCoinType = CorpCoinType = {}));
/**
 * Corporate order/booking types
 */
var BookingType;
(function (BookingType) {
    BookingType["TEAM_LUNCH"] = "team_lunch";
    BookingType["CLIENT_DINNER"] = "client_dinner";
    BookingType["CATERING"] = "catering";
    BookingType["HOTEL_BOOKING"] = "hotel_booking";
    BookingType["FLIGHT_BOOKING"] = "flight_booking";
    BookingType["GIFT_ORDER"] = "gift_order";
})(BookingType || (exports.BookingType = BookingType = {}));
/**
 * Corporate order status
 */
var CorporateOrderStatus;
(function (CorporateOrderStatus) {
    CorporateOrderStatus["PENDING"] = "pending";
    CorporateOrderStatus["APPROVED"] = "approved";
    CorporateOrderStatus["CONFIRMED"] = "confirmed";
    CorporateOrderStatus["IN_PROGRESS"] = "in_progress";
    CorporateOrderStatus["COMPLETED"] = "completed";
    CorporateOrderStatus["CANCELLED"] = "cancelled";
    CorporateOrderStatus["REJECTED"] = "rejected";
})(CorporateOrderStatus || (exports.CorporateOrderStatus = CorporateOrderStatus = {}));
/**
 * Corporate partner tier
 */
var CorpPartnerTier;
(function (CorpPartnerTier) {
    CorpPartnerTier["BRONZE"] = "bronze";
    CorpPartnerTier["SILVER"] = "silver";
    CorpPartnerTier["GOLD"] = "gold";
    CorpPartnerTier["PLATINUM"] = "platinum";
})(CorpPartnerTier || (exports.CorpPartnerTier = CorpPartnerTier = {}));
/**
 * Payment source for corporate transactions
 */
var CorpPaymentSource;
(function (CorpPaymentSource) {
    CorpPaymentSource["CORPORATE_WALLET"] = "corporate_wallet";
    CorpPaymentSource["EMPLOYEE_MEAL_BENEFIT"] = "employee_meal_benefit";
    CorpPaymentSource["EMPLOYEE_TRAVEL_BENEFIT"] = "employee_travel_benefit";
    CorpPaymentSource["EXPENSE_CLAIM"] = "expense_claim";
    CorpPaymentSource["COMPANY_CARD"] = "company_card";
})(CorpPaymentSource || (exports.CorpPaymentSource = CorpPaymentSource = {}));
/**
 * GST service types for invoice generation
 */
var GSTServiceType;
(function (GSTServiceType) {
    GSTServiceType["DINING"] = "dining";
    GSTServiceType["HOTEL"] = "hotel";
    GSTServiceType["GIFTING"] = "gifting";
    GSTServiceType["TRAVEL"] = "travel";
})(GSTServiceType || (exports.GSTServiceType = GSTServiceType = {}));
/**
 * Gift campaign types
 */
var GiftCampaignType;
(function (GiftCampaignType) {
    GiftCampaignType["FESTIVAL"] = "festival";
    GiftCampaignType["MILESTONE"] = "milestone";
    GiftCampaignType["CLIENT"] = "client";
    GiftCampaignType["THANK_YOU"] = "thank_you";
    GiftCampaignType["REFERRAL"] = "referral";
})(GiftCampaignType || (exports.GiftCampaignType = GiftCampaignType = {}));
/**
 * Travel purpose types
 */
var TravelPurpose;
(function (TravelPurpose) {
    TravelPurpose["BUSINESS"] = "business";
    TravelPurpose["TRAINING"] = "training";
    TravelPurpose["CLIENT_VISIT"] = "client_visit";
    TravelPurpose["TEAM_OUTING"] = "team_outing";
})(TravelPurpose || (exports.TravelPurpose = TravelPurpose = {}));
/**
 * Export all CorpPerks enums
 */
exports.CORP_PERKS_ENUMS = {
    CorpRole: CorpRole,
    BenefitType: BenefitType,
    CorpCoinType: CorpCoinType,
    BookingType: BookingType,
    CorporateOrderStatus: CorporateOrderStatus,
    CorpPartnerTier: CorpPartnerTier,
    CorpPaymentSource: CorpPaymentSource,
    GSTServiceType: GSTServiceType,
    GiftCampaignType: GiftCampaignType,
    TravelPurpose: TravelPurpose,
};
//# sourceMappingURL=corpPerks.js.map