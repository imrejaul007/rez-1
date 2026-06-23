// ============== Base Response Types ==============

export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ============== Auth Types ==============

export interface SendOtpRequest {
  phoneNumber: string;
  email?: string;
  referralCode?: string;
}

export interface SendOtpResponse {
  message: string;
  expiresIn: number;
  devOtp?: string;
}

export interface VerifyOtpRequest {
  phoneNumber: string;
  otp: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  phoneNumber: string;
  email?: string;
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  preferences: {
    language?: string;
    notifications?: boolean;
    privacyLevel?: string;
  };
  wallet?: string;
  role: string;
  isVerified: boolean;
  isOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyOtpResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UpdateProfileRequest {
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  preferences?: {
    language?: string;
    notifications?: boolean;
    privacyLevel?: string;
  };
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserStatisticsResponse {
  user: { joinedDate: string; isVerified: boolean; totalReferrals: number; referralEarnings: number };
  wallet: { balance: number; totalEarned: number; totalSpent: number; pendingAmount: number };
  orders: { total: number; completed: number; cancelled: number; totalSpent: number };
  videos: { totalCreated: number; totalViews: number; totalLikes: number; totalShares: number };
  projects: { totalParticipated: number; approved: number; rejected: number; totalEarned: number };
  offers: { totalRedeemed: number };
  vouchers: { total: number; used: number; active: number };
  reviews: { total: number };
  achievements: { total: number; unlocked: number };
  summary: { totalActivity: number; totalEarnings: number; totalSpendings: number };
}

// ============== Wallet Types ==============

export interface WalletBalanceResponse {
  totalValue: number;
  breakdown: {
    rezCoins: { amount: number; color: string; expiryDate?: string };
    cashbackBalance: number;
    pendingRewards: number;
  };
  brandedCoins: Array<{
    merchantId: string;
    merchantName: string;
    merchantLogo?: string;
    merchantColor?: string;
    amount: number;
  }>;
  brandedCoinsTotal: number;
  promoCoins: { amount: number; color: string; expiryCountdown?: string; maxRedemptionPercentage?: number };
  balance: { available: number; pending: number; cashback: number; total: number };
  coins: any[];
  currency: string;
  statistics: Record<string, any>;
  limits: { maxBalance: number; dailySpendLimit: number; dailySpentToday: number; remainingToday: number };
  status: { isActive: boolean; isFrozen: boolean; frozenReason?: string };
  lastUpdated: string;
}

export interface WalletTransactionsQuery {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface CreditLoyaltyPointsRequest {
  amount: number;
  source?: {
    type: string;
    reference?: string;
    description?: string;
    metadata?: Record<string, any>;
  };
  idempotencyKey?: string;
}

export interface TopupWalletRequest {
  amount: number;
  paymentMethod?: string;
  paymentId?: string;
}

export interface WithdrawFundsRequest {
  amount: number;
  method: string;
  accountDetails: Record<string, any>;
}

export interface ProcessPaymentRequest {
  amount: number;
  orderId?: string;
  storeId?: string;
  storeName?: string;
  description?: string;
  items?: Array<{ productId: string; quantity: number; price: number }>;
}

export interface InitiatePaymentRequest {
  amount: number;
  currency?: string;
  paymentMethod: string;
  paymentMethodType?: string;
  purpose?: string;
  userDetails?: Record<string, any>;
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
}

export interface UpdateWalletSettingsRequest {
  autoTopup?: boolean;
  autoTopupThreshold?: number;
  autoTopupAmount?: number;
  lowBalanceAlert?: boolean;
  lowBalanceThreshold?: number;
}

export interface RefundPaymentRequest {
  transactionId: string;
  amount: number;
  reason: string;
}

// ============== Order Types ==============

export interface CreateOrderRequest {
  deliveryAddress?: {
    name: string;
    phone: string;
    addressLine1: string;
    city: string;
    state: string;
    pincode: string;
    addressLine2?: string;
    landmark?: string;
    instructions?: string;
  };
  paymentMethod: 'cod' | 'wallet' | 'razorpay' | 'upi' | 'card' | 'netbanking' | 'stripe';
  specialInstructions?: string;
  couponCode?: string;
  voucherCode?: string;
  coinsUsed?: { rezCoins?: number; promoCoins?: number; storePromoCoins?: number };
  storeId?: string;
  items?: string[];
  idempotencyKey?: string;
  fulfillmentType?: 'delivery' | 'pickup' | 'dine_in';
  fulfillmentDetails?: Record<string, any>;
}

export interface OrderListQuery {
  status?: string;
  statusGroup?: 'active' | 'past';
  page?: number;
  limit?: number;
  cursor?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'newest' | 'oldest' | 'amount_high' | 'amount_low';
}

export interface UpdateOrderStatusRequest {
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled' | 'returned' | 'refunded';
  estimatedDeliveryTime?: string;
  trackingInfo?: {
    trackingNumber?: string;
    carrier?: string;
    estimatedDelivery?: string;
    location?: string;
    notes?: string;
  };
}

export interface RateOrderRequest {
  rating: number;
  review?: string;
}

export interface RefundRequestBody {
  reason: string;
  refundItems?: Array<{ itemId: string; quantity: number }>;
}

export interface ReorderItemsRequest {
  itemIds: string[];
}
