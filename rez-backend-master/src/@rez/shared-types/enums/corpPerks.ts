// @ts-nocheck
/**
 * @rez/shared/enums/corpPerks
 *
 * CorpPerks specific enums for corporate benefits, bookings, and gifting.
 */

/**
 * Corporate user roles
 */
export enum CorpRole {
  CORP_ADMIN = 'corp_admin', // Full admin access
  CORP_HR = 'corp_hr', // HR manager
  CORP_FINANCE = 'corp_finance', // Finance controller
  CORP_MANAGER = 'corp_manager', // Department manager
  CORP_EMPLOYEE = 'corp_employee', // Regular employee
}

/**
 * Benefit types supported by CorpPerks
 */
export enum BenefitType {
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
export enum CorpCoinType {
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
export enum BookingType {
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
export enum CorporateOrderStatus {
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
export enum CorpPartnerTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

/**
 * Payment source for corporate transactions
 */
export enum CorpPaymentSource {
  CORPORATE_WALLET = 'corporate_wallet',
  EMPLOYEE_MEAL_BENEFIT = 'employee_meal_benefit',
  EMPLOYEE_TRAVEL_BENEFIT = 'employee_travel_benefit',
  EXPENSE_CLAIM = 'expense_claim',
  COMPANY_CARD = 'company_card',
}

/**
 * GST service types for invoice generation
 */
export enum GSTServiceType {
  DINING = 'dining',
  HOTEL = 'hotel',
  GIFTING = 'gifting',
  TRAVEL = 'travel',
}

/**
 * Gift campaign types
 */
export enum GiftCampaignType {
  FESTIVAL = 'festival',
  MILESTONE = 'milestone',
  CLIENT = 'client',
  THANK_YOU = 'thank_you',
  REFERRAL = 'referral',
}

/**
 * Travel purpose types
 */
export enum TravelPurpose {
  BUSINESS = 'business',
  TRAINING = 'training',
  CLIENT_VISIT = 'client_visit',
  TEAM_OUTING = 'team_outing',
}

/**
 * Export all CorpPerks enums
 */
export const CORP_PERKS_ENUMS = {
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
} as const;
