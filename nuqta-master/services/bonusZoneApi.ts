import apiClient, { ApiResponse } from './apiClient';

// ============================================================================
// TYPES
// ============================================================================

export type BonusCampaignType =
  | 'cashback_boost'
  | 'bank_offer'
  | 'bill_upload_bonus'
  | 'category_multiplier'
  | 'first_transaction_bonus'
  | 'festival_offer';

export type UserCampaignState =
  | 'eligible'
  | 'claimed'
  | 'limit_reached'
  | 'not_eligible'
  | 'budget_exhausted'
  | 'expired';

export interface BonusZoneCampaign {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description?: string;
  campaignType: BonusCampaignType;
  reward: {
    type: 'percentage' | 'flat' | 'multiplier';
    value: number;
    capPerUser: number;
    coinType: 'rez' | 'branded';
  };
  display: {
    icon: string;
    bannerImage?: string;
    partnerLogo?: string;
    backgroundColor?: string;
    badgeText?: string;
    featured: boolean;
    priority: number;
  };
  schedule: {
    startTime: string;
    endTime: string;
  };
  deepLink: {
    screen: string;
    params?: Record<string, any>;
  };
  userState: UserCampaignState;
  userClaimCount: number;
  userTotalReward: number;
  maxClaimsPerUser: number;
  maxClaimsPerUserPerDay?: number;
  globalClaimsRemaining?: number | null;
  terms: string[];
  fundingSource?: {
    partnerName?: string;
    partnerLogo?: string;
  };
}

export interface BonusZoneCampaignDetail extends BonusZoneCampaign {
  reward: BonusZoneCampaign['reward'] & {
    capPerTransaction: number;
  };
  eligibility: {
    paymentMethods?: string[];
    bankCodes?: string[];
    merchantCategories?: string[];
    minSpend?: number;
    firstTransactionOnly?: boolean;
  };
  globalClaimsRemaining?: number | null;
}

export interface BonusClaim {
  id: string;
  campaignId: any;
  status: 'pending' | 'verified' | 'credited' | 'rejected' | 'expired';
  rewardAmount: number;
  rewardType: 'rez' | 'branded';
  rejectionReason?: string;
  createdAt: string;
}

export interface ClaimResult {
  claim: {
    id: string;
    status: string;
    rewardAmount: number;
    rewardType: string;
  };
  coinTransaction: {
    id: string;
    amount: number;
    balance: number;
  } | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
}

export interface TransactionRef {
  type: 'order' | 'bill' | 'payment' | 'none';
  refId?: string;
}

// ============================================================================
// BONUS ZONE API SERVICE
// ============================================================================

class BonusZoneApiService {
  /**
   * Get active bonus zone campaigns with per-user state
   */
  async getBonusCampaigns(region?: string): Promise<ApiResponse<{
    campaigns: BonusZoneCampaign[];
    total: number;
  }>> {
    const params: Record<string, string> = {};
    if (region) params.region = region;
    return apiClient.get('/bonus-zone/campaigns', params);
  }

  /**
   * Get single campaign detail with eligibility info
   */
  async getCampaignDetail(slug: string): Promise<ApiResponse<{
    campaign: BonusZoneCampaignDetail;
    userState: {
      eligible: boolean;
      reasons: string[];
      claimCount: number;
      totalReward: number;
      maxClaimsPerUser: number;
      maxClaimsPerUserPerDay?: number;
      dailyClaimCount?: number;
    };
  }>> {
    return apiClient.get(`/bonus-zone/campaigns/${slug}`);
  }

  /**
   * Claim a bonus campaign reward
   */
  async claimReward(
    slug: string,
    transactionRef: TransactionRef,
    context?: {
      paymentMethod?: string;
      bankCode?: string;
      cardBin?: string;
      transactionAmount?: number;
    }
  ): Promise<ApiResponse<ClaimResult>> {
    return apiClient.post(`/bonus-zone/campaigns/${slug}/claim`, {
      transactionRef,
      ...context,
    });
  }

  /**
   * Get user's claim history
   */
  async getMyClaimHistory(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    claims: BonusClaim[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    return apiClient.get('/bonus-zone/my-claims', params);
  }

  /**
   * Pre-check eligibility for a campaign
   */
  async checkEligibility(slug: string): Promise<ApiResponse<EligibilityResult>> {
    return apiClient.get(`/bonus-zone/campaigns/${slug}/eligibility`);
  }
}

export const bonusZoneApi = new BonusZoneApiService();
export default bonusZoneApi;
