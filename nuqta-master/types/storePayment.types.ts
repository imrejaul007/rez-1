/**
 * Store Payment Types
 *
 * Type definitions for the store payment flow including:
 * - QR code scanning and store lookup
 * - Payment settings and methods
 * - Offers and rewards
 * - Payment processing
 */

// ==================== QR CODE TYPES ====================

export interface QRCodeData {
  type: 'NUQTA_STORE_PAYMENT';
  code: string;
  v: string; // version
}

export interface StoreQRInfo {
  hasQR: boolean;
  code?: string;
  qrImageUrl?: string;
  isActive?: boolean;
  generatedAt?: Date;
}

// ==================== STORE TYPES ====================

export interface StorePaymentInfo {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  category: {
    _id: string;
    name: string;
    slug: string;
    icon?: string;
  };
  location: {
    address: string;
    city: string;
    state?: string;
    pincode?: string;
    coordinates?: [number, number];
  };
  mainCategorySlug?: string;
  paymentSettings: StorePaymentSettings;
  rewardRules: StoreRewardRules;
  ratings: {
    average: number;
    count: number;
  };
  isActive: boolean;
}

// ==================== PAYMENT SETTINGS ====================

export interface StorePaymentSettings {
  // Payment Methods
  acceptUPI: boolean;
  acceptCards: boolean;
  acceptPayLater: boolean;

  // Coin Settings
  acceptNuqtaCoins: boolean;
  acceptPromoCoins: boolean;
  maxCoinRedemptionPercent: number;

  // Hybrid Payment
  allowHybridPayment: boolean;

  // Offers
  allowOffers: boolean;
  allowCashback: boolean;

  // UPI Details
  upiId?: string;
  upiName?: string;
}

export interface StoreRewardRules {
  baseCashbackPercent: number;
  reviewBonusCoins: number;
  socialShareBonusCoins: number;
  minimumAmountForReward: number;
  extraRewardThreshold?: number;
  extraRewardCoins?: number;
  visitMilestoneRewards?: {
    visits: number;
    coinsReward: number;
  }[];
}

// ==================== PAYMENT METHOD TYPES ====================

export type PaymentMethodType = 'upi' | 'card' | 'credit_card' | 'debit_card' | 'netbanking' | 'wallet' | 'pay_later';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  icon: string;
  isAvailable: boolean;
  description?: string;
}

// ==================== PREMIUM PAYMENT TYPES ====================

/**
 * Applied coins structure with breakdown by type
 */
/**
 * Applied Coins Structure
 *
 * Three coin types per Nuqta Wallet design:
 * 1. Nuqta Coins (Mustard #ffcd57) - Universal, 30-day expiry, no redemption cap
 * 2. Promo Coins (Gold #FFC857) - Limited-time, expiry countdown, max 20% per bill
 * 3. Branded Coins (Merchant color) - Store-specific, no expiry, no cap
 *
 * Usage Order: Promo → Branded → Nuqta (for maximum savings)
 */
export interface AppliedCoins {
  nuqtaCoins: {
    available: number;
    using: number;
    enabled: boolean;
    color?: string; // #ffcd57 (Nuqta Mustard)
    icon?: string;
    description?: string;
    expiryDays?: number | null; // 30 days default
    redemptionCap?: number | null; // null = no cap
  };
  promoCoins: {
    available: number;
    using: number;
    enabled: boolean;
    expiringToday: boolean;
    expiresIn?: number | null; // Days until expiry
    color?: string; // #ffcd57 (Nuqta Mustard)
    icon?: string;
    description?: string;
    redemptionCap?: number; // Max 20% per bill default
  };
  brandedCoins: {
    available: number;
    using: number;
    enabled: boolean;
    storeName: string;
    storeId: string;
    color?: string; // Merchant color
    logo?: string;
    icon?: string;
    description?: string;
    redemptionCap?: number | null; // null = no cap
  } | null;
  totalApplied: number;
  usageOrder?: string[]; // ['promo', 'branded', 'rez']
  usageOrderDescription?: string;
}

/**
 * Payment method offer types
 */
export type PaymentMethodOfferType = 'cashback' | 'discount' | 'emi' | 'bonus_coins';

/**
 * Individual offer on a payment method
 */
export interface PaymentMethodOffer {
  type: PaymentMethodOfferType;
  title: string;
  description: string;
  value: number;
  banks?: string[];
}

/**
 * Badge types for payment methods
 */
export type PaymentBadgeType = 'best' | 'popular' | 'new';

/**
 * Enhanced payment method with offers and badges
 */
export interface EnhancedPaymentMethod extends PaymentMethod {
  badge?: PaymentBadgeType;
  offers: PaymentMethodOffer[];
  providers?: string[];
}

/**
 * Savings summary showing breakdown of user savings
 */
export interface SavingsSummary {
  coinsUsed: number;
  bankOffers: number;
  loyaltyBenefit: number;
  totalSaved: number;
}

/**
 * Preview of rewards user will earn
 */
export interface RewardsPreview {
  cashback: number;
  coinsToEarn: number;
}

/**
 * Membership tier types
 */
export type MembershipTier = 'new' | 'bronze' | 'silver' | 'gold';

/**
 * Store membership information
 */
export interface StoreMembership {
  tier: MembershipTier;
  tierName: string;
  visitCount: number;
  nextTier: string | null;
  visitsToNextTier: number;
  benefits: {
    cashbackBonus: number;
    prioritySupport: boolean;
    exclusiveOffers: boolean;
  };
  isEarningRewards: boolean;
}

/**
 * External wallet provider types
 */
export type ExternalWalletProvider = 'paytm' | 'amazonpay' | 'mobikwik' | 'phonepe' | 'gpay';

/**
 * External wallet information
 */
export interface ExternalWallet {
  id: string;
  name: string;
  provider: ExternalWalletProvider;
  isLinked: boolean;
  linkedEmail?: string;
  linkedPhone?: string;
  balance?: number;
  icon: string;
  color: string;
}

/**
 * Auto-optimization response
 * Note: Backend sends rezCoins, frontend maps to nuqtaCoins
 */
export interface AutoOptimizeResponse {
  nuqtaCoins: AppliedCoins['nuqtaCoins'];
  promoCoins: AppliedCoins['promoCoins'];
  brandedCoins: AppliedCoins['brandedCoins'];
  totalApplied: number;
  maxAllowed: number;
  optimizationStrategy: string;
  savings: {
    coinsUsed: number;
    percentOfBill: number;
  };
}

// ==================== COIN TYPES ====================

export type CoinType = 'rezCoins' | 'promoCoins';

export interface CoinBalance {
  type: CoinType;
  name: string;
  balance: number;
  icon?: string;
  maxUsable?: number; // Maximum that can be used for this transaction
}

export interface CoinRedemption {
  rezCoins: number;
  promoCoins: number;
  brandedCoins: number;  // Merchant-specific coins
  totalAmount: number;
}

// ==================== OFFER TYPES ====================

export type OfferType = 'CASHBACK' | 'DISCOUNT' | 'BONUS_COINS' | 'FLAT_OFF' | 'PERCENTAGE_OFF' | 'BOGO';
export type OfferSource = 'STORE' | 'BANK' | 'NUQTA';
export type OfferValueType = 'PERCENTAGE' | 'FIXED' | 'FIXED_COINS';

export interface StorePaymentOffer {
  id: string;
  type: OfferType;
  source: OfferSource;
  title: string;
  description: string;
  value: number;
  valueType: OfferValueType;
  minAmount?: number;
  maxDiscount?: number;
  code?: string;
  expiryDate?: string;
  isAutoApplied: boolean;
  isBestOffer?: boolean;
  terms?: string[];
  // Bank offer specific
  bankName?: string;
  cardType?: string;
}

export interface OffersResponse {
  storeOffers: StorePaymentOffer[];
  bankOffers: StorePaymentOffer[];
  rezOffers: StorePaymentOffer[];
  bestOffer: StorePaymentOffer | null;
}

// ==================== PAYMENT REQUEST/RESPONSE ====================

export interface StorePaymentRequest {
  storeId: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  coinsToRedeem?: CoinRedemption;
  offersApplied?: string[]; // Offer IDs
  upiDetails?: {
    vpa?: string;
    app?: string;
  };
}

export interface StorePaymentInitResponse {
  paymentId: string;
  storeId: string;
  storeName: string;
  billAmount: number;
  coinRedemption: number;
  remainingAmount: number;
  paymentMethod: PaymentMethodType;
  upiId?: string;
  offersApplied: string[];
  status: PaymentStatus;
  expiresAt: string;
  // Stripe payment integration
  clientSecret?: string;
}

export type PaymentStatus = 'INITIATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface StorePaymentConfirmRequest {
  paymentId: string;
  transactionId?: string;
  paymentProof?: string;
}

export interface StorePaymentConfirmResponse {
  paymentId: string;
  status: PaymentStatus;
  transactionId: string;
  completedAt: string;
  rewards: PaymentRewards;
}

export interface PaymentRewards {
  cashbackEarned: number;
  coinsEarned: number;
  bonusCoins?: number;
  firstVisitBonus?: number;
  cashbackBreakdown?: {
    baseCashbackPercent: number;
    baseCashbackAmount: number;
    subscriptionMultiplier: number;
    priveMultiplier: number;
    priveTier: string;
    finalCashbackAmount: number;
  };
  loyaltyProgress: {
    currentVisits: number;
    nextMilestone: number;
    milestoneReward: string;
  };
}

// ==================== PAYMENT SUMMARY ====================

export interface PaymentSummary {
  billAmount: number;

  // Discounts
  discountApplied: number;
  discountDetails: {
    offerId: string;
    offerName: string;
    discount: number;
  }[];

  // Coins
  coinsRedeemed: CoinRedemption;
  coinsValue: number;

  // Final
  totalDiscount: number;
  amountToPay: number;

  // Rewards to earn
  cashbackToEarn: number;
  coinsToEarn: number;
}

// ==================== TRANSACTION HISTORY ====================

export interface StorePaymentTransaction {
  id: string;
  paymentId: string;
  storeId: string;
  storeName: string;
  storeLogo?: string;
  amount: number;
  coinsUsed: number;
  paymentMethod: PaymentMethodType;
  status: PaymentStatus;
  rewards: PaymentRewards;
  createdAt: string;
  completedAt?: string;
}

export interface PaymentHistoryResponse {
  transactions: StorePaymentTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    hasMore?: boolean;  // Legacy field for backwards compatibility
  };
}

// ==================== HOOK TYPES ====================

export interface UseStorePaymentState {
  // Current state
  store: StorePaymentInfo | null;
  amount: number;
  selectedOffers: StorePaymentOffer[];
  coinRedemption: CoinRedemption;
  paymentMethod: PaymentMethod | null;
  paymentSummary: PaymentSummary | null;

  // Available options
  availableOffers: OffersResponse | null;
  availableCoins: CoinBalance[];
  availablePaymentMethods: PaymentMethod[];

  // Loading states
  isLoadingStore: boolean;
  isLoadingOffers: boolean;
  isProcessingPayment: boolean;

  // Error state
  error: string | null;
}

export interface UseStorePaymentActions {
  // Setup
  setStore: (store: StorePaymentInfo) => void;
  setAmount: (amount: number) => void;
  loadStoreByQR: (qrCode: string) => Promise<void>;

  // Offers
  loadOffers: () => Promise<void>;
  selectOffer: (offer: StorePaymentOffer) => void;
  removeOffer: (offerId: string) => void;
  applyBestOffer: () => void;

  // Coins
  setCoinRedemption: (coins: Partial<CoinRedemption>) => void;
  resetCoinRedemption: () => void;

  // Payment
  setPaymentMethod: (method: PaymentMethod) => void;
  calculateSummary: () => void;
  initiatePayment: () => Promise<StorePaymentInitResponse>;
  confirmPayment: (data: StorePaymentConfirmRequest) => Promise<StorePaymentConfirmResponse>;

  // Reset
  reset: () => void;
}

export type UseStorePaymentReturn = UseStorePaymentState & UseStorePaymentActions;

// ==================== NAVIGATION PARAMS ====================

export interface PayInStoreParams {
  storeId?: string;
  qrCode?: string;
  storeName?: string;
}

export interface EnterAmountParams {
  storeId: string;
  storeName: string;
  storeLogo?: string;
}

export interface OffersScreenParams {
  storeId: string;
  amount: number;
  storeName: string;
  storeLogo?: string;
}

export interface PaymentScreenParams {
  storeId: string;
  amount: number;
  storeName: string;
  storeLogo?: string;
  selectedOffers?: string; // JSON stringified
}

export interface SuccessScreenParams {
  paymentId: string;
  storeId: string;
  storeName: string;
  storeLogo?: string;
  amount: number;
  coinsUsed?: string; // Total coins used in payment
  rewards: string; // JSON stringified PaymentRewards
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export type QRLookupResponse = ApiResponse<StorePaymentInfo>;
export type OffersApiResponse = ApiResponse<OffersResponse>;
export type PaymentInitApiResponse = ApiResponse<StorePaymentInitResponse>;
export type PaymentConfirmApiResponse = ApiResponse<StorePaymentConfirmResponse>;
export type PaymentHistoryApiResponse = ApiResponse<PaymentHistoryResponse>;
