// Referral API Service
// Handles referral and earning functionality

import apiClient, { ApiResponse } from './apiClient';

/**
 * Referral Data Interface
 */
export interface ReferralData {
  title: string;
  subtitle: string;
  inviteButtonText: string;
  inviteLink: string;
  referralCode: string;
  earnedRewards: number;
  totalReferrals: number;
  pendingRewards: number;
  completedReferrals: number;
  isActive: boolean;
  rewardPerReferral: number;
  maxReferrals: number;
}

/**
 * Referral History Item
 */
export interface ReferralHistoryItem {
  id: string;
  referredUser: {
    id: string;
    name: string;
    email: string;
    joinedAt: string;
  };
  status: 'pending' | 'completed' | 'cancelled';
  rewardAmount: number;
  rewardStatus: 'pending' | 'credited' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

/**
 * Referral Statistics
 */
export interface ReferralStatistics {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarned: number;
  pendingEarnings: number;
  averageRewardPerReferral: number;
  conversionRate: number;
}

// Type alias for backward compatibility
export type ReferralStats = ReferralStatistics;

/**
 * Referral API Service Class
 */
class ReferralService {
  /**
   * Get referral data
   */
  async getReferralData(): Promise<ApiResponse<ReferralData>> {

    return apiClient.get('/referral/data');
  }

  /**
   * Get referral history
   */
  async getReferralHistory(page = 1, limit = 20): Promise<ApiResponse<{
    referrals: ReferralHistoryItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>> {

    return apiClient.get('/referral/history', { page, limit });
  }

  /**
   * Get referral statistics
   */
  async getReferralStatistics(): Promise<ApiResponse<ReferralStatistics>> {

    return apiClient.get('/referral/statistics');
  }

  /**
   * Generate referral link
   */
  async generateReferralLink(): Promise<ApiResponse<{ referralLink: string; referralCode: string }>> {

    return apiClient.post('/referral/generate-link');
  }

  /**
   * Share referral link
   */
  async shareReferralLink(platform: 'whatsapp' | 'telegram' | 'email' | 'sms'): Promise<ApiResponse<{ success: boolean }>> {

    return apiClient.post('/referral/share', { platform });
  }

  /**
   * Claim referral rewards
   */
  async claimReferralRewards(): Promise<ApiResponse<{ 
    success: boolean; 
    totalClaimed: number; 
    transactionId: string;
  }>> {

    return apiClient.post('/referral/claim-rewards');
  }

  /**
   * Get referral leaderboard
   */
  async getReferralLeaderboard(period: 'week' | 'month' | 'year' = 'month'): Promise<ApiResponse<{
    leaderboard: Array<{
      rank: number;
      userId: string;
      userName: string;
      totalReferrals: number;
      totalEarned: number;
    }>;
    userRank?: {
      rank: number;
      totalReferrals: number;
      totalEarned: number;
    };
  }>> {

    return apiClient.get('/referral/leaderboard', { period });
  }
  /**
   * Offline-aware referral share tracking.
   * Queues the action if offline, sends immediately if online.
   */
  async shareReferralLinkOffline(
    platform: 'whatsapp' | 'telegram' | 'email' | 'sms'
  ): Promise<ApiResponse<{ success: boolean }> | { queued: true; actionId: string }> {
    const NetInfo = (await import('@react-native-community/netinfo')).default;
    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
      const offlineSyncService = (await import('./offlineSyncService')).default;
      const actionId = await offlineSyncService.enqueue('referral_share', { platform });
      return { queued: true, actionId };
    }

    return this.shareReferralLink(platform);
  }

  /**
   * Offline-aware reward claim.
   * Queues the action if offline, sends immediately if online.
   */
  async claimReferralRewardsOffline(): Promise<any> {
    const NetInfo = (await import('@react-native-community/netinfo')).default;
    const netState = await NetInfo.fetch();

    if (!netState.isConnected) {
      const offlineSyncService = (await import('./offlineSyncService')).default;
      const actionId = await offlineSyncService.enqueue('reward_claim', {});
      return { queued: true, actionId };
    }

    return this.claimReferralRewards();
  }
}

// Export singleton instance
const referralService = new ReferralService();
export default referralService;

// Export individual functions for backward compatibility
export const getReferralStats = async (): Promise<ReferralStats | null> => {
  try {
    const response = await referralService.getReferralStatistics();
    return response.data || null;
  } catch (error) {
    return null;
  }
};

export const getReferralHistory = async (page?: number, limit?: number): Promise<ReferralHistoryItem[]> => {
  try {
    const response = await referralService.getReferralHistory(page, limit);
    return response.data?.referrals || [];
  } catch (error) {
    return [];
  }
};

export const getReferralCode = async () => {
  try {
    const response = await referralService.generateReferralLink();
    return {
      referralCode: response.data?.referralCode || '',
      referralLink: response.data?.referralLink || '',
      shareMessage: `Join REZ App using my referral code: ${response.data?.referralCode || ''}`
    };
  } catch (error) {
    return {
      referralCode: '',
      referralLink: '',
      shareMessage: ''
    };
  }
};

export const trackShare = async (platform: 'whatsapp' | 'telegram' | 'email' | 'sms') => {
  try {
    const response = await referralService.shareReferralLink(platform);
    return response.data;
  } catch (error) {
    return null;
  }
};
