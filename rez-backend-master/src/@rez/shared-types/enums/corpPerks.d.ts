// @ts-nocheck
/**
 * @rez/shared/enums/corpPerks
 *
 * CorpPerks specific enums for corporate benefits, bookings, and gifting.
 */
/**
 * Corporate user roles
 */
export declare enum CorpRole {
  CORP_ADMIN = 'corp_admin', // Full admin access
  CORP_HR = 'corp_hr', // HR manager
  CORP_FINANCE = 'corp_finance', // Finance controller
  CORP_MANAGER = 'corp_manager', // Department manager
  CORP_EMPLOYEE = 'corp_employee',
}
/**
 * Benefit types supported by CorpPerks
 */
export declare enum BenefitType {
  MEAL = 'meal',
  TRAVEL = 'travel',
  GIFT = 'gift',
  WELLNESS = 'wellness',
  FLEX = 'flex',
  LEARNING = 'learning',
}
/**
 * Corporate coin types for benefit allocations
 */
export declare enum CorpCoinType {
  MEAL_BENEFIT = 'meal_benefit',
  DINING_CREDIT = 'dining_credit',
  TRAVEL_BENEFIT = 'travel_benefit',
  GIFT_BENEFIT = 'gift_benefit',
  WELLNESS_BENEFIT = 'wellness_benefit',
  RECOGNITION = 'recognition',
  CSR_KARMA = 'csr_karma',
}
/**
 * Corporate order/booking types
 */
export declare enum BookingType {
  TEAM_LUNCH = 'team_lunch',
  CLIENT_DINNER = 'client_dinner',
  CATERING = 'catering',
  HOTEL_BOOKING = 'hotel_booking',
  FLIGHT_BOOKING = 'flight_booking',
  GIFT_ORDER = 'gift_order',
}
/**
 * Corporate order status
 */
export declare enum CorporateOrderStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}
/**
 * Corporate partner tier
 */
export declare enum CorpPartnerTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}
/**
 * Payment source for corporate transactions
 */
export declare enum CorpPaymentSource {
  CORPORATE_WALLET = 'corporate_wallet',
  EMPLOYEE_MEAL_BENEFIT = 'employee_meal_benefit',
  EMPLOYEE_TRAVEL_BENEFIT = 'employee_travel_benefit',
  EXPENSE_CLAIM = 'expense_claim',
  COMPANY_CARD = 'company_card',
}
/**
 * GST service types for invoice generation
 */
export declare enum GSTServiceType {
  DINING = 'dining',
  HOTEL = 'hotel',
  GIFTING = 'gifting',
  TRAVEL = 'travel',
}
/**
 * Gift campaign types
 */
export declare enum GiftCampaignType {
  FESTIVAL = 'festival',
  MILESTONE = 'milestone',
  CLIENT = 'client',
  THANK_YOU = 'thank_you',
  REFERRAL = 'referral',
}
/**
 * Travel purpose types
 */
export declare enum TravelPurpose {
  BUSINESS = 'business',
  TRAINING = 'training',
  CLIENT_VISIT = 'client_visit',
  TEAM_OUTING = 'team_outing',
}
/**
 * Export all CorpPerks enums
 */
export declare const CORP_PERKS_ENUMS: {
  readonly CorpRole: typeof CorpRole;
  readonly BenefitType: typeof BenefitType;
  readonly CorpCoinType: typeof CorpCoinType;
  readonly BookingType: typeof BookingType;
  readonly CorporateOrderStatus: typeof CorporateOrderStatus;
  readonly CorpPartnerTier: typeof CorpPartnerTier;
  readonly CorpPaymentSource: typeof CorpPaymentSource;
  readonly GSTServiceType: typeof GSTServiceType;
  readonly GiftCampaignType: typeof GiftCampaignType;
  readonly TravelPurpose: typeof TravelPurpose;
};
//# sourceMappingURL=corpPerks.d.ts.map
