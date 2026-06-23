// Partner Program API Service
// Handles partner/affiliate program operations

import apiClient, { ApiResponse } from './apiClient';

export interface PartnerProfile {
  _id: string;
  userId: string;
  level: {
    level: number;
    name: string;
    requirements: {
      orders: number;
      timeframe: number;
    };
  };
  ordersThisLevel: number;
  totalOrders: number;
  daysRemaining: number;
  validUntil: string;
  avatar?: string;
  name: string;
  earnings: {
    total: number;
    pending: number;
    paid: number;
  };
}

export interface OrderMilestone {
  id: string;
  orderCount: number;
  reward: {
    type: 'cashback' | 'discount' | 'points' | 'voucher';
    value: number;
    title: string;
  };
  achieved: boolean;
  claimedAt?: string;
}

export interface RewardTask {
  id: string;
  title: string;
  description: string;
  reward: {
    type: string;
    value: number;
    title: string;
  };
  progress: {
    current: number;
    target: number;
  };
  completed: boolean;
  claimed: boolean;
}

export interface JackpotMilestone {
  id: string;
  spendAmount: number;
  title: string;
  description: string;
  reward: {
    type: string;
    value: number;
    title: string;
  };
  achieved: boolean;
  claimedAt?: string;
}

export interface ClaimableOffer {
  id: string;
  title: string;
  description: string;
  discount: number;
  validUntil: string;
  termsAndConditions: string[];
  claimed: boolean;
  category: string;
}

export interface PartnerFAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface PartnerDashboard {
  profile: PartnerProfile;
  milestones: OrderMilestone[];
  tasks: RewardTask[];
  jackpotProgress: JackpotMilestone[];
  claimableOffers: ClaimableOffer[];
  faqs: PartnerFAQ[];
}

export interface PartnerEarnings {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  thisMonth: number;
  lastMonth: number;
  transactions: Array<{
    _id: string;
    amount: number;
    type: 'commission' | 'bonus' | 'referral';
    status: 'pending' | 'approved' | 'paid';
    description: string;
    createdAt: string;
  }>;
}

export interface PartnerTransaction {
  _id: string;
  amount: number;
  type: 'commission' | 'bonus' | 'referral' | 'milestone' | 'task' | 'jackpot';
  status: 'pending' | 'approved' | 'paid' | 'completed';
  description: string;
  source?: string;
  createdAt: string;
}

export interface PartnerStats {
  totalPartners: number;
  userRank: number;
  averageOrders: number;
  topPerformers: Array<{
    _id: string;
    name: string;
    totalOrders: number;
    currentLevel: {
      name: string;
    };
    avatar?: string;
  }>;
}

class PartnerApiService {
  private baseUrl = '/partner';

  /**
   * Get partner dashboard data
   */
  async getDashboard(): Promise<ApiResponse<PartnerDashboard & { enrolled?: boolean }>> {

    return apiClient.get(`${this.baseUrl}/dashboard`);
  }

  /**
   * Explicitly enroll user in partner program
   */
  async enrollPartner(): Promise<ApiResponse<PartnerDashboard & { enrolled: boolean }>> {
    return apiClient.post(`${this.baseUrl}/enroll`);
  }

  /**
   * Get partner benefits for all levels
   */
  async getBenefits(): Promise<ApiResponse<{
    currentLevel: number;
    currentBenefits: any;
    allLevels: Array<{
      level: number;
      name: string;
      requirements: { orders: number; timeframe: number };
      benefits: any;
    }>;
    levels: Array<any>; // Same as allLevels for compatibility
  }>> {

    return apiClient.get(`${this.baseUrl}/benefits`);
  }

  /**
   * Get partner profile
   */
  async getProfile(): Promise<ApiResponse<{ profile: PartnerProfile }>> {

    return apiClient.get(`${this.baseUrl}/profile`);
  }

  /**
   * Get partner earnings
   */
  async getEarnings(): Promise<ApiResponse<PartnerEarnings>> {

    return apiClient.get(`${this.baseUrl}/earnings`);
  }

  /**
   * Get milestones
   */
  async getMilestones(): Promise<ApiResponse<{ milestones: OrderMilestone[] }>> {

    return apiClient.get(`${this.baseUrl}/milestones`);
  }

  /**
   * Claim milestone reward
   */
  async claimMilestoneReward(milestoneId: string): Promise<ApiResponse<{
    success: boolean;
    message: string;
    milestone: OrderMilestone;
  }>> {

    return apiClient.post(`${this.baseUrl}/milestones/${milestoneId}/claim`);
  }

  /**
   * Get reward tasks
   */
  async getTasks(): Promise<ApiResponse<{ tasks: RewardTask[] }>> {

    return apiClient.get(`${this.baseUrl}/tasks`);
  }

  /**
   * Claim task reward
   */
  async claimTaskReward(taskId: string): Promise<ApiResponse<{
    success: boolean;
    message: string;
    task: RewardTask;
  }>> {

    return apiClient.post(`${this.baseUrl}/tasks/${taskId}/claim`);
  }

  /**
   * Get jackpot progress
   */
  async getJackpotProgress(): Promise<ApiResponse<{
    currentSpent: number;
    milestones: JackpotMilestone[];
  }>> {

    return apiClient.get(`${this.baseUrl}/jackpot`);
  }

  /**
   * Claim jackpot reward
   */
  async claimJackpotReward(spendAmount: number): Promise<ApiResponse<{
    success: boolean;
    message: string;
    jackpot: JackpotMilestone;
  }>> {

    return apiClient.post(`${this.baseUrl}/jackpot/${spendAmount}/claim`);
  }

  /**
   * Get claimable offers
   */
  async getOffers(): Promise<ApiResponse<{ offers: ClaimableOffer[] }>> {

    return apiClient.get(`${this.baseUrl}/offers`);
  }

  /**
   * Claim partner offer
   */
  async claimOffer(offerId: string): Promise<ApiResponse<{
    success: boolean;
    message: string;
    voucher: {
      code: string;
      expiryDate: string;
    };
  }>> {

    // Pass offer ID in request body to avoid URL encoding issues with special characters

    const response = await apiClient.post(`${this.baseUrl}/offers/claim`, { offerId });

    return response as ApiResponse<{ success: boolean; message: string; voucher: { code: string; expiryDate: string; }; }>;
  }

  /**
   * Get partner FAQs
   */
  async getFAQs(category?: string): Promise<ApiResponse<{ faqs: PartnerFAQ[] }>> {

    return apiClient.get(`${this.baseUrl}/faqs`, category ? { category } : undefined);
  }

  /**
   * Get level benefits
   */
  async getLevelBenefits(): Promise<ApiResponse<{
    levels: Array<{
      level: number;
      name: string;
      requirements: {
        orders: number;
        timeframe: number;
      };
      benefits: string[];
    }>;
  }>> {

    return apiClient.get(`${this.baseUrl}/levels`);
  }

  /**
   * Request payout (Note: In store credit model, this uses earnings at checkout instead)
   */
  async requestPayout(amount: number, method: string): Promise<ApiResponse<{
    success: boolean;
    message: string;
    payoutId: string;
  }>> {

    return apiClient.post(`${this.baseUrl}/payout/request`, { amount, method });
  }

  /**
   * Get partner statistics and rankings
   */
  async getStats(): Promise<ApiResponse<PartnerStats>> {
    return apiClient.get(`${this.baseUrl}/stats`);
  }

  /**
   * Get partner transactions history
   */
  async getTransactions(params?: {
    page?: number;
    limit?: number;
    type?: 'all' | 'commission' | 'bonus' | 'referral';
  }): Promise<ApiResponse<{
    transactions: PartnerTransaction[];
    total: number;
    page: number;
    totalPages: number;
  }>> {
    return apiClient.get(`${this.baseUrl}/earnings`, params);
  }
}

// Export singleton instance
const partnerApi = new PartnerApiService();
export default partnerApi;
