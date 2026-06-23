/**
 * Lock Price Deal API Service
 *
 * Handles all lock-price deal operations:
 * - Browse and search lock deals
 * - Lock a deal (pay deposit)
 * - Pay balance
 * - Get user's locked deals
 * - Cancel a lock
 */

import apiClient, { ApiResponse } from './apiClient';

// ==================== TYPES ====================

export interface LockDealReward {
  type: 'coins' | 'cashback';
  amount: number;
}

export interface LockPriceDeal {
  _id: string;
  title: string;
  description: string;
  image: string;
  images?: string[];
  store: {
    _id: string;
    name: string;
    logo?: string;
    address?: string;
    ratings?: { average: number; count: number };
  } | string;
  storeName: string;
  storeCategory?: string;
  originalPrice: number;
  lockedPrice: number;
  currency: 'INR' | 'AED' | 'USD';
  depositPercent: number;
  depositAmount: number;
  balanceAmount: number;
  validFrom: string;
  validUntil: string;
  pickupWindowDays: number;
  maxLocks: number;
  currentLocks: number;
  totalPickedUp: number;
  lockReward: LockDealReward;
  pickupReward: LockDealReward;
  earningsMultiplier: number;
  minOrderValue?: number;
  region: string;
  terms: string[];
  isActive: boolean;
  isFeatured: boolean;
  priority: number;
  tags: string[];
  // Virtuals
  isRunning?: boolean;
  availableSlots?: number;
  isSoldOut?: boolean;
  discountPercent?: number;
  createdAt: string;
  updatedAt: string;
}

export type UserLockDealStatus = 'locked' | 'paid_balance' | 'picked_up' | 'expired' | 'refunded' | 'cancelled';

export interface UserLockDeal {
  _id: string;
  user: string;
  lockDeal: LockPriceDeal | string;
  status: UserLockDealStatus;
  depositPaymentId?: string;
  depositPaidAt?: string;
  depositAmount: number;
  balancePaymentId?: string;
  balancePaidAt?: string;
  balanceAmount: number;
  lockRewardCredited: boolean;
  lockRewardAmount: number;
  pickupRewardCredited: boolean;
  pickupRewardAmount: number;
  earningsMultiplier: number;
  pickupCode: string;
  pickedUpAt?: string;
  expiresAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  refundedAt?: string;
  refundAmount?: number;
  dealSnapshot: {
    title: string;
    image: string;
    originalPrice: number;
    lockedPrice: number;
    depositPercent: number;
    currency: string;
    storeName: string;
    storeId: string;
    lockReward: LockDealReward;
    pickupReward: LockDealReward;
    earningsMultiplier: number;
  };
  // Virtuals
  isExpired?: boolean;
  daysUntilExpiry?: number;
  totalRewardEarned?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LockDealFilters {
  region?: string;
  category?: string;
  storeId?: string;
  featured?: boolean;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InitiateLockResponse {
  clientSecret: string;
  paymentIntentId: string;
  deal: {
    _id: string;
    title: string;
    image: string;
    originalPrice: number;
    lockedPrice: number;
    depositAmount: number;
    balanceAmount: number;
    depositPercent: number;
    currency: string;
    lockReward: LockDealReward;
    pickupReward: LockDealReward;
    earningsMultiplier: number;
    pickupWindowDays: number;
    storeName: string;
  };
}

export interface ConfirmLockResponse {
  userLockDeal: {
    _id: string;
    status: string;
    pickupCode: string;
    depositAmount: number;
    balanceAmount: number;
    lockRewardEarned: number;
    earningsMultiplier: number;
    expiresAt: string;
    dealSnapshot: UserLockDeal['dealSnapshot'];
  };
}

export interface BalancePaymentResponse {
  clientSecret: string;
  paymentIntentId: string;
  balanceAmount: number;
  currency: string;
  dealTitle: string;
}

export interface ConfirmBalanceResponse {
  userLockDeal: {
    _id: string;
    status: string;
    pickupCode: string;
    balancePaidAt: string;
    dealSnapshot: UserLockDeal['dealSnapshot'];
  };
}

export interface CancelLockResponse {
  cancelled: boolean;
  refundAmount: number;
  lockRewardReversed: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ==================== API FUNCTIONS ====================

const BASE_URL = '/lock-deals';

export const lockDealApi = {
  /**
   * Browse available lock deals (public)
   */
  async getDeals(filters: LockDealFilters = {}): Promise<ApiResponse<PaginatedResponse<LockPriceDeal>>> {
    const params = new URLSearchParams();
    if (filters.region) params.set('region', filters.region);
    if (filters.category) params.set('category', filters.category);
    if (filters.storeId) params.set('storeId', filters.storeId);
    if (filters.featured) params.set('featured', 'true');
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', filters.page.toString());
    if (filters.limit) params.set('limit', filters.limit.toString());

    const query = params.toString();
    return apiClient.get(`${BASE_URL}${query ? `?${query}` : ''}`);
  },

  /**
   * Get single deal detail
   */
  async getDealById(id: string): Promise<ApiResponse<{ deal: LockPriceDeal; userLock: UserLockDeal | null }>> {
    return apiClient.get(`${BASE_URL}/${id}`);
  },

  /**
   * Initiate lock — creates Stripe PaymentIntent for deposit
   */
  async initiateLock(dealId: string): Promise<ApiResponse<InitiateLockResponse>> {
    return apiClient.post(`${BASE_URL}/${dealId}/lock`);
  },

  /**
   * Confirm lock after deposit payment succeeds
   */
  async confirmLock(dealId: string, paymentIntentId: string): Promise<ApiResponse<ConfirmLockResponse>> {
    return apiClient.post(`${BASE_URL}/${dealId}/confirm-lock`, { paymentIntentId });
  },

  /**
   * Initiate balance payment for a locked deal
   */
  async initiateBalancePayment(lockId: string): Promise<ApiResponse<BalancePaymentResponse>> {
    return apiClient.post(`${BASE_URL}/${lockId}/pay-balance`);
  },

  /**
   * Confirm balance payment after Stripe succeeds
   */
  async confirmBalancePayment(lockId: string, paymentIntentId: string): Promise<ApiResponse<ConfirmBalanceResponse>> {
    return apiClient.post(`${BASE_URL}/${lockId}/confirm-balance`, { paymentIntentId });
  },

  /**
   * Get user's locked deals
   */
  async getMyLocks(status?: UserLockDealStatus, page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<UserLockDeal>>> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', page.toString());
    params.set('limit', limit.toString());

    return apiClient.get(`${BASE_URL}/my-locks?${params.toString()}`);
  },

  /**
   * Get single lock detail
   */
  async getMyLockDetail(lockId: string): Promise<ApiResponse<{ lock: UserLockDeal }>> {
    return apiClient.get(`${BASE_URL}/my-locks/${lockId}`);
  },

  /**
   * Cancel a lock
   */
  async cancelLock(lockId: string, reason?: string): Promise<ApiResponse<CancelLockResponse>> {
    return apiClient.post(`${BASE_URL}/${lockId}/cancel`, { reason });
  },
};

export default lockDealApi;
