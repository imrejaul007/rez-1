import apiClient, { ApiResponse } from './apiClient';

// ============================================================================
// WALLET API SERVICE
// ============================================================================

/**
 * Coin Balance from Backend (new schema)
 */
export interface BackendCoinBalance {
  type: 'rez' | 'promo' | 'branded';
  amount: number;
  isActive: boolean;
  color?: string;
  earnedDate?: string;
  lastUsed?: string;
  expiryDate?: string;
  promoDetails?: {
    maxRedemptionPercentage: number;
    expiryDate: string;
  };
}

/**
 * Branded Coin from Backend
 */
export interface BackendBrandedCoin {
  merchantId: string;
  merchantName: string;
  merchantLogo?: string;
  merchantColor?: string;
  amount: number;
  earnedDate?: string;
  lastUsed?: string;
}

/**
 * Savings Insights from Backend
 */
export interface BackendSavingsInsights {
  totalSaved: number;
  thisMonth: number;
  avgPerVisit: number;
  lastCalculated?: string;
}

/**
 * Wallet Balance Response
 */
export interface CategoryBalance {
  available: number;
  earned: number;
  spent: number;
}

export interface WalletBalanceResponse {
  balance: {
    total: number;
    available: number;
    pending: number;
    cashback: number;
  };
  totalValue: number;
  breakdown: {
    rezCoins: { amount: number; color: string; expiryDate?: string };
    cashbackBalance: number;
    pendingRewards: number;
  };
  coins: BackendCoinBalance[];
  brandedCoins: BackendBrandedCoin[];
  brandedCoinsTotal: number;
  promoCoins: {
    amount: number;
    color: string;
    isActive?: boolean;
    expiryCountdown?: string;
    maxRedemptionPercentage?: number;
    earnedDate?: string;
    lastUsed?: string;
    expiryDate?: string;
    promoDetails?: {
      maxRedemptionPercentage: number;
      expiryDate: string;
    };
  };
  coinUsageOrder: string[];
  categoryBalances?: Record<string, CategoryBalance>;
  savingsInsights: BackendSavingsInsights;
  currency: string;
  statistics: {
    totalEarned: number;
    totalSpent: number;
    totalCashback: number;
    totalRefunds: number;
    totalTopups: number;
    totalWithdrawals: number;
  };
  limits: {
    maxBalance: number;
    dailySpendLimit: number;
    dailySpentToday: number;
    remainingToday: number;
  };
  status: {
    isActive: boolean;
    isFrozen: boolean;
    frozenReason?: string;
  };
  lastUpdated: string;
}

/**
 * Transaction Response
 */
export interface TransactionResponse {
  id: string;
  transactionId: string;
  user: string;
  type: 'credit' | 'debit';
  category: 'earning' | 'spending' | 'refund' | 'withdrawal' | 'topup' | 'bonus' | 'penalty' | 'cashback';
  amount: number;
  currency: string;
  description: string;
  source: {
    type: string;
    reference: string;
    description?: string;
    metadata?: any;
  };
  status: {
    current: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'reversed';
    history: Array<{
      status: string;
      timestamp: string;
      reason?: string;
    }>;
  };
  balanceBefore: number;
  balanceAfter: number;
  fees?: number;
  tax?: number;
  netAmount?: number;
  processingTime?: number;
  receiptUrl?: string;
  notes?: string;
  isReversible: boolean;
  reversedAt?: string;
  reversalReason?: string;
  reversalTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Transaction List Response
 */
export interface TransactionListResponse {
  transactions: TransactionResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Topup Request
 */
export interface TopupRequest {
  amount: number;
  paymentMethod?: string;
  paymentId?: string;
}

/**
 * Topup Response
 */
export interface TopupResponse {
  transaction: TransactionResponse;
  wallet: {
    balance: {
      total: number;
      available: number;
      pending: number;
    };
    currency: string;
  };
}

/**
 * Withdrawal Request
 */
export interface WithdrawalRequest {
  amount: number;
  method: 'bank' | 'upi' | 'paypal';
  accountDetails?: string;
}

/**
 * Withdrawal Response
 */
export interface WithdrawalResponse {
  transaction: TransactionResponse;
  withdrawalId: string;
  netAmount: number;
  fees: number;
  wallet: {
    balance: {
      total: number;
      available: number;
      pending: number;
    };
    currency: string;
  };
  estimatedProcessingTime: string;
}

/**
 * Payment Request
 */
export interface PaymentRequest {
  amount: number;
  orderId?: string;
  storeId?: string;
  storeName?: string;
  description?: string;
  items?: any[];
}

/**
 * Payment Response
 */
export interface PaymentResponse {
  transaction: TransactionResponse;
  wallet: {
    balance: {
      total: number;
      available: number;
      pending: number;
    };
    currency: string;
  };
  paymentStatus: 'success' | 'failed' | 'pending';
}

/**
 * Transaction Summary Response
 */
export interface TransactionSummaryResponse {
  summary: {
    summary: Array<{
      type: 'credit' | 'debit';
      totalAmount: number;
      count: number;
      avgAmount: number;
    }>;
    totalTransactions: number;
  };
  period: string;
  wallet: {
    balance: {
      total: number;
      available: number;
      pending: number;
    };
    statistics: {
      totalEarned: number;
      totalSpent: number;
      totalCashback: number;
      totalRefunds: number;
      totalTopups: number;
      totalWithdrawals: number;
    };
  } | null;
}

/**
 * Wallet Settings Request
 */
export interface WalletSettingsRequest {
  autoTopup?: boolean;
  autoTopupThreshold?: number;
  autoTopupAmount?: number;
  lowBalanceAlert?: boolean;
  lowBalanceThreshold?: number;
}

/**
 * Categories Breakdown Response
 */
export interface CategoriesBreakdownResponse {
  categories: Array<{
    _id: string;
    totalAmount: number;
    count: number;
    avgAmount: number;
  }>;
  totalCategories: number;
}

/**
 * Transaction Filters
 */
export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: 'credit' | 'debit';
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Wallet API Service Class
 */
class WalletService {
  /**
   * Get wallet balance and status
   */
  async getBalance(): Promise<ApiResponse<WalletBalanceResponse>> {
    try {
      return await apiClient.get('/wallet/balance');
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getBalance failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch balance', data: null } as any;
    }
  }

  /**
   * Get transaction history with optional filters
   */
  async getTransactions(
    filters?: TransactionFilters
  ): Promise<ApiResponse<TransactionListResponse>> {
    try {
      return await apiClient.get<TransactionListResponse>('/wallet/transactions', filters);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getTransactions failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch transactions', data: null } as any;
    }
  }

  /**
   * Get single transaction by ID
   */
  async getTransactionById(
    transactionId: string
  ): Promise<ApiResponse<{ transaction: TransactionResponse }>> {
    try {
      return await apiClient.get(`/wallet/transaction/${transactionId}`);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getTransactionById failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch transaction', data: null } as any;
    }
  }

  /**
   * Topup wallet
   */
  async topup(data: TopupRequest): Promise<ApiResponse<TopupResponse>> {
    try {
      return await apiClient.post('/wallet/topup', data);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] topup failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to topup wallet', data: null } as any;
    }
  }

  /**
   * Withdraw funds from wallet
   */
  async withdraw(
    data: WithdrawalRequest
  ): Promise<ApiResponse<WithdrawalResponse>> {
    try {
      return await apiClient.post('/wallet/withdraw', data);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] withdraw failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to withdraw funds', data: null } as any;
    }
  }

  /**
   * Process payment (deduct from wallet)
   */
  async processPayment(
    data: PaymentRequest
  ): Promise<ApiResponse<PaymentResponse>> {
    try {
      return await apiClient.post('/wallet/payment', data);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] processPayment failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to process payment', data: null } as any;
    }
  }

  /**
   * Get transaction summary/statistics
   */
  async getSummary(
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<ApiResponse<TransactionSummaryResponse>> {
    try {
      return await apiClient.get('/wallet/summary', { period });
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getSummary failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch summary', data: null } as any;
    }
  }

  /**
   * Update wallet settings
   */
  async updateSettings(
    settings: WalletSettingsRequest
  ): Promise<ApiResponse<{ settings: any }>> {
    try {
      return await apiClient.put('/wallet/settings', settings);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] updateSettings failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to update settings', data: null } as any;
    }
  }

  /**
   * Get spending breakdown by categories
   */
  async getCategoriesBreakdown(): Promise<
    ApiResponse<CategoriesBreakdownResponse>
  > {
    try {
      return await apiClient.get('/wallet/categories');
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getCategoriesBreakdown failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch categories breakdown', data: null } as any;
    }
  }

  /**
   * Credit loyalty points to wallet
   */
  async creditLoyaltyPoints(data: {
    amount: number;
    source?: {
      type?: string;
      reference?: string;
      description?: string;
      metadata?: any;
    };
  }): Promise<ApiResponse<{
    balance: {
      total: number;
      available: number;
      pending: number;
    };
    coins: any[];
    credited: number;
    message: string;
  }>> {
    try {
      return await apiClient.post('/wallet/credit-loyalty-points', data);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] creditLoyaltyPoints failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to credit loyalty points', data: null } as any;
    }
  }

  /**
   * Add test funds to wallet (DEVELOPMENT ONLY)
   * @param amount Amount to add (default: 1000)
   * @param type 'rez' | 'promo' | 'cashback' (default: 'rez')
   */
  async devTopup(amount: number = 1000, type: 'rez' | 'promo' | 'cashback' = 'rez'): Promise<ApiResponse<{
    wallet: {
      balance: {
        total: number;
        available: number;
        pending: number;
        cashback: number;
      };
      currency: string;
    };
    addedAmount: number;
    type: string;
  }>> {
    try {
      return await apiClient.post('/wallet/dev-topup', { amount, type });
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] devTopup failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to add test funds', data: null } as any;
    }
  }

  /**
   * Sync wallet balance from CoinTransaction (fixes discrepancies)
   * Call this to ensure wallet balance matches the actual coin transactions
   */
  async syncBalance(): Promise<ApiResponse<{
    previousBalance: number;
    newBalance: number;
    wallet: {
      balance: {
        total: number;
        available: number;
        pending: number;
        cashback: number;
      };
      coins: any[];
      currency: string;
    };
    synced: boolean;
  }>> {
    try {
      return await apiClient.post('/wallet/sync-balance', {});
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] syncBalance failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to sync balance', data: null } as any;
    }
  }

  /**
   * Refund a wallet payment (used when order creation fails after payment)
   * @param data Refund details including transaction ID and reason
   */
  async refundPayment(data: {
    transactionId: string;
    amount: number;
    reason: string;
  }): Promise<ApiResponse<{
    refundId: string;
    refundedAmount: number;
    wallet: {
      balance: {
        total: number;
        available: number;
        pending: number;
      };
    };
    status: 'success' | 'failed' | 'pending';
  }>> {
    try {
      return await apiClient.post('/wallet/refund', data);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] refundPayment failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to process refund', data: null } as any;
    }
  }

  // ========================================================================
  // TRANSFER APIs
  // ========================================================================

  async initiateTransfer(data: {
    recipientPhone?: string;
    recipientId?: string;
    amount: number;
    coinType: 'nuqta' | 'promo' | 'branded';
    merchantId?: string;
    note?: string;
    idempotencyKey?: string;
  }): Promise<ApiResponse<{
    transferId: string;
    requiresOtp: boolean;
    recipientName: string;
    amount: number;
    coinType: string;
    status?: string;
  }>> {
    try {
      return await apiClient.post('/wallet/transfer/initiate', data);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] initiateTransfer failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to initiate transfer', data: null } as any;
    }
  }

  async confirmTransfer(data: {
    transferId: string;
    otp: string;
  }): Promise<ApiResponse<{
    transferId: string;
    status: string;
    amount: number;
    coinType: string;
  }>> {
    try {
      return await apiClient.post('/wallet/transfer/confirm', data);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] confirmTransfer failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to confirm transfer', data: null } as any;
    }
  }

  async getTransferHistory(params?: {
    page?: number;
    limit?: number;
    type?: 'sent' | 'received';
  }): Promise<ApiResponse<{
    transfers: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
  }>> {
    try {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.type) query.set('type', params.type);
      return await apiClient.get(`/wallet/transfer/history?${query.toString()}`);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getTransferHistory failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch transfer history', data: null } as any;
    }
  }

  async getRecentRecipients(search?: string): Promise<ApiResponse<{ recipients: any[] }>> {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      return await apiClient.get(`/wallet/transfer/recipients${query}`);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getRecentRecipients failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch recent recipients', data: null } as any;
    }
  }

  // ========================================================================
  // GIFT APIs
  // ========================================================================

  async getGiftConfig(): Promise<ApiResponse<{
    themes: Array<{
      id: string;
      label: string;
      emoji: string;
      colors: string[];
      tags: string[];
    }>;
    denominations: number[];
    limits: {
      min: number;
      max: number;
      dailyMax: number;
      maxPerDay: number;
      otpAbove: number;
    };
    features: {
      scheduledDelivery: boolean;
      messageMaxLength: number;
    };
  }>> {
    try {
      return await apiClient.get('/wallet/gift/config');
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getGiftConfig failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch gift config', data: null } as any;
    }
  }

  async validateGiftRecipient(phone: string): Promise<ApiResponse<{
    exists: boolean;
    name?: string;
    isSelf: boolean;
  }>> {
    try {
      return await apiClient.post('/wallet/gift/validate-recipient', { phone });
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] validateGiftRecipient failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to validate recipient', data: null } as any;
    }
  }

  async sendGift(data: {
    recipientPhone?: string;
    recipientId?: string;
    amount: number;
    coinType?: string;
    theme: string;
    message?: string;
    deliveryType?: 'instant' | 'scheduled';
    scheduledAt?: string;
    idempotencyKey?: string;
  }): Promise<ApiResponse<{
    giftId: string;
    status: string;
    recipientName: string;
    amount: number;
    theme: string;
    expiresAt: string;
  }>> {
    try {
      return await apiClient.post('/wallet/gift/send', data);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] sendGift failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to send gift', data: null } as any;
    }
  }

  async getReceivedGifts(): Promise<ApiResponse<{ gifts: any[] }>> {
    try {
      return await apiClient.get('/wallet/gift/received');
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getReceivedGifts failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch received gifts', data: null } as any;
    }
  }

  async claimGift(giftId: string): Promise<ApiResponse<{ giftId: string; amount: number; status: string }>> {
    try {
      return await apiClient.post(`/wallet/gift/${giftId}/claim`, {});
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] claimGift failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to claim gift', data: null } as any;
    }
  }

  async getSentGifts(): Promise<ApiResponse<{ gifts: any[] }>> {
    try {
      return await apiClient.get('/wallet/gift/sent');
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getSentGifts failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch sent gifts', data: null } as any;
    }
  }

  // ========================================================================
  // GIFT CARD APIs
  // ========================================================================

  async getGiftCardCatalog(params?: {
    category?: string;
    search?: string;
  }): Promise<ApiResponse<{ giftCards: any[]; categories: string[] }>> {
    try {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.search) query.set('search', params.search);
      return await apiClient.get(`/wallet/gift-cards/catalog?${query.toString()}`);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getGiftCardCatalog failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch gift card catalog', data: null } as any;
    }
  }

  async purchaseGiftCard(data: {
    giftCardId: string;
    amount: number;
    idempotencyKey?: string;
  }): Promise<ApiResponse<{ userGiftCard: any }>> {
    try {
      return await apiClient.post('/wallet/gift-cards/purchase', data);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] purchaseGiftCard failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to purchase gift card', data: null } as any;
    }
  }

  async getMyGiftCards(status?: string): Promise<ApiResponse<{ giftCards: any[] }>> {
    try {
      const query = status ? `?status=${status}` : '';
      return await apiClient.get(`/wallet/gift-cards/mine${query}`);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getMyGiftCards failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch gift cards', data: null } as any;
    }
  }

  async revealGiftCardCode(giftCardId: string): Promise<ApiResponse<{ code: string; pin?: string }>> {
    try {
      return await apiClient.get(`/wallet/gift-cards/${giftCardId}/reveal`);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] revealGiftCardCode failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to reveal gift card code', data: null } as any;
    }
  }

  // ========================================================================
  // EXPIRY & RECHARGE APIs
  // ========================================================================

  async getExpiringCoins(): Promise<ApiResponse<{
    expiringCoins: Record<string, { totalAmount: number; coins: any[]; count: number }>;
    totalExpiring: number;
  }>> {
    try {
      return await apiClient.get('/wallet/expiring-coins');
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getExpiringCoins failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch expiring coins', data: null } as any;
    }
  }

  async previewRechargeCashback(amount: number): Promise<ApiResponse<{
    rechargeAmount: number;
    cashbackPercentage: number;
    cashback: number;
    maxCashback: number;
    cappedAt: number | null;
  }>> {
    try {
      return await apiClient.get(`/wallet/recharge/preview?amount=${amount}`);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] previewRechargeCashback failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to preview recharge cashback', data: null } as any;
    }
  }

  async getCoinRules(): Promise<ApiResponse<{
    coinRules: Record<string, { usageRules: string[]; earningMethods: string[] }>;
    coinExpiryConfig: Record<string, { expiryDays: number; maxUsagePct: number }>;
  }>> {
    try {
      return await apiClient.get('/wallet/coin-rules');
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getCoinRules failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch coin rules', data: null } as any;
    }
  }

  async getScheduledDrops(): Promise<ApiResponse<{
    drops: Array<{
      id: string;
      title: string;
      amount: number;
      type: 'daily' | 'weekly' | 'special' | 'cashback';
      scheduledDate: string;
      description: string;
      icon: string;
      source: string;
      claimable: boolean;
      storeLogo?: string;
    }>;
    totalUpcoming: number;
  }>> {
    try {
      return await apiClient.get('/wallet/scheduled-drops');
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getScheduledDrops failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch scheduled drops', data: null } as any;
    }
  }

  // ========================================================================
  // BILL SPLIT APIs
  // ========================================================================

  async createBillSplit(data: {
    totalAmount: number;
    splitType: 'equal' | 'custom';
    participants: Array<{ phone: string; name?: string; amount?: number }>;
    note?: string;
    idempotencyKey: string;
  }): Promise<ApiResponse<{ billSplit: any; duplicate?: boolean }>> {
    try {
      return await apiClient.post('/wallet/split', data);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] createBillSplit failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to create bill split', data: null } as any;
    }
  }

  async listBillSplits(page = 1, limit = 10): Promise<ApiResponse<any[]>> {
    try {
      return await apiClient.get(`/wallet/split?page=${page}&limit=${limit}`);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] listBillSplits failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch bill splits', data: null } as any;
    }
  }

  async getBillSplit(id: string): Promise<ApiResponse<{ billSplit: any }>> {
    try {
      return await apiClient.get(`/wallet/split/${id}`);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] getBillSplit failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to fetch bill split', data: null } as any;
    }
  }

  async payBillSplit(id: string): Promise<ApiResponse<{ billSplit: any }>> {
    try {
      return await apiClient.post(`/wallet/split/${id}/pay`, {});
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] payBillSplit failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to pay bill split', data: null } as any;
    }
  }

  async declineBillSplit(id: string): Promise<ApiResponse<{ billSplit: any }>> {
    try {
      return await apiClient.post(`/wallet/split/${id}/decline`, {});
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] declineBillSplit failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to decline bill split', data: null } as any;
    }
  }

  async cancelBillSplit(id: string): Promise<ApiResponse<{ billSplit: any }>> {
    try {
      return await apiClient.delete(`/wallet/split/${id}`);
    } catch (error: any) {
      if (__DEV__) console.warn('[WalletAPI] cancelBillSplit failed:', error?.message);
      return { success: false, message: error?.message || 'Failed to cancel bill split', data: null } as any;
    }
  }
}

// Export singleton instance
const walletService = new WalletService();
export default walletService;

// Phase 20 fix: removed duplicate `export default walletService;` that the audit
// agent introduced. The export at line 913 (after the class) is the canonical one.
// Named export with backward-compat methods (for tests)
export const walletApi = {
  ...walletService,
  getWallet: async () => {
    const r = await apiClient.get('/wallet');
    return (r as any).data ?? r;
  },
  addMoney: async (amount: number) => {
    const r = await apiClient.post('/wallet/add', { amount });
    return (r as any).data ?? r;
  },
  transferMoney: async (data: { recipientId: string; amount: number }) => {
    const r = await apiClient.post('/wallet/transfer', data);
    return (r as any).data ?? r;
  },
  getTransactions: async (filters?: any) => {
    const r = await apiClient.get('/wallet/transactions', { params: filters });
    return (r as any).data ?? r;
  },
};