// Checkout Types and Interfaces
// This file contains all TypeScript interfaces for the checkout system

// ── Fulfillment Types ──────────────────────────────────────────────
export type FulfillmentType = 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';

export interface FulfillmentOption {
  type: FulfillmentType;
  label: string;
  icon: string;
  description: string;
  enabled: boolean;
  estimatedTime?: string;
}

export interface FulfillmentState {
  selectedType: FulfillmentType;
  availableTypes: FulfillmentOption[];
  tableNumber?: string;
  vehicleInfo?: string;
  pickupInstructions?: string;
  deliverySlot?: string;
  scheduledDate?: string;
  isScheduled?: boolean;
}

export interface FulfillmentDetails {
  tableNumber?: string;
  vehicleInfo?: string;
  pickupInstructions?: string;
  deliverySlot?: string;
  scheduledDate?: string;
  isScheduled?: boolean;
}

// ── Cart / Items ───────────────────────────────────────────────────
export interface CheckoutItem {
  id: string;
  productId?: string; // Product ID for backend order creation
  name: string;
  image: string;
  price: number;
  quantity: number;
  originalPrice?: number;
  discount?: number;
  cashbackPercentage?: number;
  category: string;
  storeId: string;
  storeName: string;
}

export interface CheckoutStore {
  id: string;
  name: string;
  distance: string;
  deliveryFee: number;
  minimumOrder: number;
  estimatedDelivery: string;
}

export interface PromoCode {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'CASHBACK';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue: number;
  validUntil: string;
  isActive: boolean;
  termsAndConditions: string[];
  tierRequirement?: 'bronze' | 'silver' | 'gold' | 'platinum' | null; // Required loyalty tier to use this coupon
}

export interface CoinSystem {
  nuqtaCoin: {
    available: number;
    used: number;
    conversionRate: number; // 1 Rupee = X Nuqta Coins
    maxUsagePercentage: number;
  };
  promoCoin: {
    available: number;
    used: number;
    conversionRate: number;
    maxUsagePercentage: number;
    promoCode?: string;
  };
  storePromoCoin: {
    available: number;
    used: number;
    conversionRate: number; // 1 coin = 1 rupee
    maxUsagePercentage: number; // Can use up to 30% of order value
    storeId?: string; // The store these coins are from
    storeName?: string; // Name of the store (from branded coins)
    storeColor?: string; // Brand color of the store
  };
}

export interface BillSummary {
  itemTotal: number;
  getAndItemTotal: number;
  deliveryFee: number;
  platformFee: number;
  taxes: number;
  promoDiscount: number;
  lockFeeDiscount: number; // Lock fee already paid at time of locking
  coinDiscount: number;
  cardOfferDiscount: number;
  roundOff: number;
  totalBeforeCoinDiscount: number; // Total before coin discount - used for slider max
  totalPayable: number;
  cashbackEarned: number;
  savings: number;
}

export interface CardOffer {
  _id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxDiscountAmount?: number;
  minOrderValue: number;
  cardType?: 'credit' | 'debit' | 'all';
  bankNames?: string[];
  cardBins?: string[];
}

export interface PaymentMethod {
  id: string;
  type: 'upi' | 'card' | 'netbanking' | 'wallet' | 'paylater' | 'emi';
  name: string;
  icon: string;
  isRecent?: boolean;
  details?: {
    // For UPI
    upiId?: string;
    // For Cards
    cardNumber?: string;
    cardType?: 'credit' | 'debit';
    bank?: string;
    expiryMonth?: number;
    expiryYear?: number;
    // For Net Banking
    bankCode?: string;
    // For Pay Later
    provider?: string;
    emiTenure?: number;
    emiAmount?: number;
  };
}

// Delivery Address for checkout
export interface CheckoutDeliveryAddress {
  id?: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  type?: 'HOME' | 'OFFICE' | 'OTHER';
  isDefault?: boolean;
  instructions?: string;
}

export interface CheckoutPageState {
  // Cart and Items
  items: CheckoutItem[];
  store: CheckoutStore;

  // Fulfillment
  fulfillment: FulfillmentState;

  // Pricing and Calculations
  billSummary: BillSummary;

  // Delivery Address
  selectedAddress?: CheckoutDeliveryAddress;
  availableAddresses: CheckoutDeliveryAddress[];

  // Promotions and Coins
  appliedPromoCode?: PromoCode;
  availablePromoCodes: PromoCode[];
  coinSystem: CoinSystem;
  appliedCardOffer?: CardOffer;

  // Payment
  selectedPaymentMethod?: PaymentMethod;
  availablePaymentMethods: PaymentMethod[];
  recentPaymentMethods: PaymentMethod[];

  // UI State
  showPromoCodeSection: boolean;
  showBillSummary: boolean;
  showAddressSection: boolean;
  loading: boolean;
  error: string | null;

  // Flow State
  currentStep: 'checkout' | 'address_selection' | 'payment_methods' | 'payment_details' | 'processing' | 'success';
}

export interface CheckoutAction {
  type: 'SET_LOADING' | 'SET_ERROR' | 'APPLY_PROMO_CODE' | 'REMOVE_PROMO_CODE' | 
        'TOGGLE_WASIL_COIN' | 'TOGGLE_PROMO_COIN' | 'SET_PAYMENT_METHOD' | 
        'UPDATE_BILL_SUMMARY' | 'SET_CURRENT_STEP' | 'TOGGLE_PROMO_SECTION' | 
        'TOGGLE_BILL_SUMMARY';
  payload?: any;
}

// Component Props Interfaces
export interface CheckoutHeaderProps {
  onBack: () => void;
  totalAmount: number;
  coinsBalance: number;
  title?: string;
}

export interface AmountDisplayProps {
  amount: number;
  cashbackPercentage: number;
  currency?: string;
}

export interface StoreConfirmationProps {
  store: CheckoutStore;
  onConfirm: () => void;
}

export interface PromoCodeSectionProps {
  promoCodes: PromoCode[];
  appliedPromoCode?: PromoCode;
  onApplyPromoCode: (code: PromoCode) => void;
  onRemovePromoCode: () => void;
  showSection: boolean;
  onToggleSection: () => void;
}

export interface CoinTogglesProps {
  coinSystem: CoinSystem;
  onToggleWasilCoin: (enabled: boolean) => void;
  onTogglePromoCoin: (enabled: boolean) => void;
}

export interface BillSummaryProps {
  billSummary: BillSummary;
  showDetails: boolean;
  onToggleDetails: () => void;
}

export interface PaymentMethodsProps {
  recentMethods: PaymentMethod[];
  allMethods: PaymentMethod[];
  selectedMethod?: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  onAddNewUPI: (upiId: string) => void;
  onAddNewCard: () => void;
}

export interface RecentMethodsProps {
  methods: PaymentMethod[];
  onSelectMethod: (method: PaymentMethod) => void;
}

export interface UPISectionProps {
  onAddUPI: (upiId: string) => void;
  existingUPIs: PaymentMethod[];
}

export interface CardsSectionProps {
  cards: PaymentMethod[];
  onSelectCard: (card: PaymentMethod) => void;
  onAddNewCard: () => void;
}

export interface NetBankingSectionProps {
  onSelectBank: (bankCode: string) => void;
  popularBanks: PaymentMethod[];
}

export interface PayLaterSectionProps {
  payLaterOptions: PaymentMethod[];
  onSelectOption: (option: PaymentMethod) => void;
}

// Hook Return Types
export interface UseCheckoutReturn {
  state: CheckoutPageState;
  actions: {
    applyPromoCode: (code: PromoCode) => Promise<{ success: boolean; message: string; discount?: number }>;
    removePromoCode: () => void;
    toggleNuqtaCoin: (enabled: boolean) => void;
    togglePromoCoin: (enabled: boolean) => void;
    selectPaymentMethod: (method: PaymentMethod) => void;
    selectAddress: (address: CheckoutDeliveryAddress) => void;
    updateBillSummary: () => void;
    proceedToPayment: () => Promise<void>;
    processPayment: () => Promise<void>;
    setFulfillmentType: (type: FulfillmentType) => void;
    setFulfillmentDetails: (details: Partial<FulfillmentDetails>) => void;
  };
  handlers: {
    handlePromoCodeApply: (code: string) => Promise<{ success: boolean; message: string }>;
    handleCoinToggle: (coinType: 'rez' | 'promo' | 'storePromo', enabled: boolean) => void;
    handleCustomCoinAmount: (coinType: 'rez' | 'promo' | 'storePromo', amount: number) => void;
    handlePaymentMethodSelect: (method: PaymentMethod) => void;
    handleAddressSelect: (address: CheckoutDeliveryAddress) => void;
    handleProceedToPayment: () => void;
    handleBackNavigation: () => void;
    handleWalletPayment: (coinValuesOverride?: { rezCoins: number; promoCoins: number; storePromoCoins: number }) => Promise<void>;
    handleCODPayment: (coinValuesOverride?: { rezCoins: number; promoCoins: number; storePromoCoins: number }) => Promise<void>;
    handleRazorpayPayment: (userInfo?: { name?: string; email?: string; phone?: string }, coinValuesOverride?: { rezCoins: number; promoCoins: number; storePromoCoins: number }) => Promise<void>;
    removePromoCode: () => void;
    navigateToOtherPaymentMethods: () => void;
    applyCardOffer: (offer: {
      _id: string;
      name: string;
      type: 'percentage' | 'fixed';
      value: number;
      maxDiscountAmount?: number;
      minOrderValue: number;
      cardType?: 'credit' | 'debit' | 'all';
      bankNames?: string[];
      cardBins?: string[];
    }) => void;
    removeCardOffer: () => void;
  };
}

// API Response Types
export interface CheckoutInitResponse {
  items: CheckoutItem[];
  store: CheckoutStore;
  billSummary: BillSummary;
  availablePromoCodes: PromoCode[];
  coinSystem: CoinSystem;
  paymentMethods: PaymentMethod[];
}

export interface PromoCodeValidationResponse {
  isValid: boolean;
  promoCode?: PromoCode;
  error?: string;
  updatedBillSummary: BillSummary;
}

export interface PaymentProcessResponse {
  success: boolean;
  transactionId?: string;
  orderId?: string;
  paymentMethod: PaymentMethod;
  amount: number;
  error?: string;
  redirectUrl?: string;
}

// Form Interfaces
export interface UPIPaymentForm {
  upiId: string;
  saveForFuture: boolean;
}

export interface CardPaymentForm {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  nameOnCard: string;
  saveCard: boolean;
}

export interface NetBankingForm {
  bankCode: string;
  accountType: 'savings' | 'current';
}

// Validation Interfaces
export interface CheckoutValidation {
  isValid: boolean;
  errors: {
    items?: string;
    store?: string;
    payment?: string;
    address?: string;
  };
}

// Constants
export const CHECKOUT_STEPS = {
  CHECKOUT: 'checkout',
  PAYMENT_METHODS: 'payment_methods',
  PAYMENT_DETAILS: 'payment_details',
  PROCESSING: 'processing',
  SUCCESS: 'success',
} as const;

export const PAYMENT_TYPES = {
  UPI: 'upi',
  CARD: 'card',
  NETBANKING: 'netbanking',
  WALLET: 'wallet',
  PAY_LATER: 'paylater',
  EMI: 'emi',
} as const;

export const COIN_TYPES = {
  REZ: 'rez',
  PROMO: 'promo',
} as const;