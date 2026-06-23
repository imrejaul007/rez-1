import apiClient, { ApiResponse } from './apiClient';

// ============================================================================
// CASHBACK API SERVICE
// ============================================================================

/**
 * Cashback Metadata
 */
export interface CashbackMetadata {
  orderAmount: number;
  productCategories: string[];
  storeId?: string;
  storeName?: string;
  campaignId?: string;
  campaignName?: string;
  bonusMultiplier?: number;
}

/**
 * User Cashback
 */
export interface UserCashback {
  _id: string;
  user: string;
  order?: {
    _id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
  };
  amount: number;
  cashbackRate: number;
  source: 'order' | 'referral' | 'promotion' | 'special_offer' | 'bonus' | 'signup';
  status: 'pending' | 'credited' | 'expired' | 'cancelled';
  earnedDate: string;
  creditedDate?: string;
  expiryDate: string;
  description: string;
  transaction?: string;
  metadata: CashbackMetadata;
  pendingDays: number;
  isRedeemed: boolean;
  redeemedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cashback Summary
 */
export interface CashbackSummary {
  totalEarned: number;
  pending: number;
  credited: number;
  expired: number;
  cancelled: number;
  pendingCount: number;
  creditedCount: number;
  expiredCount: number;
  cancelledCount: number;
}

/**
 * Cashback Campaign
 */
export interface CashbackCampaign {
  id: string;
  name: string;
  description: string;
  cashbackRate: number;
  validFrom: string;
  validTo: string;
  categories: string[];
  isActive: boolean;
  daysOfWeek?: number[];
}

/**
 * Cashback History Filters
 */
export interface CashbackHistoryFilters {
  status?: 'pending' | 'credited' | 'expired' | 'cancelled';
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/**
 * Cashback History Response
 */
export interface CashbackHistoryResponse {
  cashbacks: UserCashback[];
  total: number;
  pages: number;
}

/**
 * Pending Cashback Response
 */
export interface PendingCashbackResponse {
  cashbacks: UserCashback[];
  totalAmount: number;
  count: number;
}

/**
 * Redeem Response
 */
export interface RedeemCashbackResponse {
  totalAmount: number;
  count: number;
  cashbacks: UserCashback[];
}

/**
 * Forecast Response
 */
export interface ForecastCashbackResponse {
  estimatedCashback: number;
  cashbackRate: number;
  description: string;
}

/**
 * Statistics Response
 */
export interface CashbackStatistics {
  period: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  totalCount: number;
  averagePerTransaction: number;
}

/**
 * Cashback API Service Class
 */
class CashbackService {
  /**
   * Get cashback summary
   */
  async getCashbackSummary(): Promise<ApiResponse<CashbackSummary>> {
    try {
      const response = await apiClient.get<CashbackSummary>('/cashback/summary');

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get cashback history
   */
  async getCashbackHistory(
    filters?: CashbackHistoryFilters
  ): Promise<ApiResponse<CashbackHistoryResponse>> {

    return apiClient.get('/cashback/history', filters);
  }

  /**
   * Get pending cashback
   */
  async getPendingCashback(): Promise<ApiResponse<PendingCashbackResponse>> {

    return apiClient.get('/cashback/pending');
  }

  /**
   * Get expiring soon cashback
   */
  async getExpiringSoon(days: number = 7): Promise<ApiResponse<PendingCashbackResponse>> {

    return apiClient.get('/cashback/expiring-soon', { days });
  }

  /**
   * Redeem pending cashback
   */
  async redeemCashback(): Promise<ApiResponse<RedeemCashbackResponse>> {

    return apiClient.post('/cashback/redeem');
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(): Promise<ApiResponse<{ campaigns: CashbackCampaign[] }>> {

    return apiClient.get('/cashback/campaigns');
  }

  /**
   * Forecast cashback for cart
   */
  async forecastCashback(cartData: {
    items: Array<{
      product: any;
      quantity: number;
      price: number;
    }>;
    subtotal: number;
  }): Promise<ApiResponse<ForecastCashbackResponse>> {

    return apiClient.post('/cashback/forecast', { cartData });
  }

  /**
   * Get cashback statistics
   */
  async getStatistics(
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<ApiResponse<CashbackStatistics>> {

    return apiClient.get('/cashback/statistics', { period });
  }
}

// Export singleton instance
const cashbackService = new CashbackService();
export default cashbackService;
