// Earnings API Service
// Provides methods to fetch consolidated earnings data from the backend

import apiClient, { ApiResponse } from './apiClient';

export interface EarningsBreakdownItem {
  amount: number;
  count: number;
}

export interface EarningsBreakdown {
  videos: EarningsBreakdownItem;
  projects: EarningsBreakdownItem;
  referrals: EarningsBreakdownItem;
  cashback: EarningsBreakdownItem;
  socialMedia: EarningsBreakdownItem;
  games: EarningsBreakdownItem;
  dailyCheckIn: EarningsBreakdownItem;
  socialImpact: EarningsBreakdownItem;
  programs: EarningsBreakdownItem;
  events: EarningsBreakdownItem;
  bonus: EarningsBreakdownItem;
  total: number;
}

export interface EarningsStatistics {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  transactionCount: number;
  daysActive: number;
}

export interface EarningTransaction {
  _id: string;
  type: string;
  source: string;
  category: string;
  amount: number;
  description: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface ConsolidatedEarningsSummary {
  totalEarned: number;
  availableBalance: number;
  pendingEarnings: number;
  breakdown: EarningsBreakdown;
  statistics: EarningsStatistics;
  period: string;
  recentTransactions: EarningTransaction[];
}

export interface EarningsHistoryResponse {
  transactions: EarningTransaction[];
  summary: {
    totalEarned: number;
    totalWithdrawn: number;
    pendingAmount: number;
    breakdown: Record<string, number>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PartnerEarningsBreakdownItem {
  amount: number;
  count: number;
}

export interface PartnerEarningsSummary {
  totalPartnerEarnings: number;
  availableBalance: number;
  breakdown: {
    partnerCashback: PartnerEarningsBreakdownItem;
    milestoneRewards: PartnerEarningsBreakdownItem;
    referralBonus: PartnerEarningsBreakdownItem;
    taskRewards: PartnerEarningsBreakdownItem;
  };
  thisMonth: number;
  pendingPartnerEarnings: number;
  partnerLevel: {
    level: number;
    name: string;
    daysRemaining: number;
    ordersToNextLevel: number;
  };
  period: string;
}

export type EarningsPeriod = '7d' | '30d' | '90d' | 'all';
export type EarningsFilterType = 'videos' | 'projects' | 'referrals' | 'cashback' | 'socialMedia' | 'games' | 'dailyCheckIn' | 'socialImpact' | 'bonus';

class EarningsApiService {
  /**
   * Get consolidated earnings summary (primary endpoint for My Earnings page)
   */
  async getConsolidatedSummary(params?: {
    period?: EarningsPeriod;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<ConsolidatedEarningsSummary>> {
    const queryParams: Record<string, string> = {};
    if (params?.period) queryParams.period = params.period;
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;

    return apiClient.get('/earnings/consolidated-summary', queryParams);
  }

  /**
   * Get partner-specific earnings summary (for wallet Partner Earnings card)
   */
  async getPartnerSummary(params?: {
    period?: EarningsPeriod;
  }): Promise<ApiResponse<PartnerEarningsSummary>> {
    const queryParams: Record<string, string> = {};
    if (params?.period) queryParams.period = params.period;
    return apiClient.get('/earnings/partner-summary', queryParams);
  }

  /**
   * Get paginated earnings history
   */
  async getHistory(params?: {
    type?: EarningsFilterType;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<EarningsHistoryResponse>> {
    const queryParams: Record<string, any> = {};
    if (params?.type) queryParams.type = params.type;
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;

    return apiClient.get('/earnings/history', queryParams);
  }
}

const earningsApi = new EarningsApiService();
export default earningsApi;
