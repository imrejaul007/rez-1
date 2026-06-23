import apiClient from './apiClient';
import {
  ReferralStats,
  ReferralProgress,
  ReferralReward,
  LeaderboardEntry,
  ReferralMilestone
} from '../types/referral.types';

/**
 * Helper to safely extract data from API response.
 * Backend uses sendSuccess which wraps under data key.
 */
function extractData(response: any): any {
  return response?.data?.data ?? response?.data ?? null;
}

export const referralTierApi = {
  /**
   * Get current tier and progress
   */
  async getTier(): Promise<{
    currentTier: string;
    tierData: any;
    progress: ReferralProgress;
    stats: ReferralStats;
    upcomingMilestones: ReferralMilestone[];
  }> {
    try {
      const response = await apiClient.get('/api/referral/tier');
      return extractData(response);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get claimable and claimed rewards
   */
  async getRewards(): Promise<{
    claimable: ReferralReward[];
    claimed: ReferralReward[];
    totalClaimableValue: number;
  }> {
    try {
      const response = await apiClient.get('/api/referral/rewards');
      return extractData(response) || { claimable: [], claimed: [], totalClaimableValue: 0 };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Claim specific reward
   */
  async claimReward(referralId: string, rewardType: string): Promise<any> {
    try {
      const response = await apiClient.post('/api/referral/claim-reward', {
        referralId,
        rewardType
      });
      return extractData(response);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get referral leaderboard
   */
  async getLeaderboard(limit: number = 100): Promise<{
    leaderboard: LeaderboardEntry[];
    userRank: {
      rank: number;
      totalReferrals: number;
    };
  }> {
    try {
      const response = await apiClient.get('/api/referral/leaderboard', {
        params: { limit }
      });
      return extractData(response) || { leaderboard: [], userRank: null };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Generate QR code for referral
   */
  async generateQR(): Promise<{
    qrCode: string;
    referralLink: string;
    referralCode: string;
  }> {
    try {
      const response = await apiClient.post('/api/referral/generate-qr');
      return extractData(response);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get milestone progress
   */
  async getMilestones(): Promise<{
    current: ReferralProgress;
    upcoming: ReferralMilestone[];
  }> {
    try {
      const response = await apiClient.get('/api/referral/milestones');
      return extractData(response);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check tier upgrade eligibility
   */
  async checkUpgrade(): Promise<{
    upgraded: boolean;
    oldTier?: string;
    newTier?: string;
    currentTier?: string;
    rewards?: ReferralReward[];
    celebrate?: boolean;
    qualifiedReferrals?: number;
  }> {
    try {
      const response = await apiClient.get('/api/referral/check-upgrade');
      return extractData(response);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Validate referral code
   */
  async validateCode(code: string): Promise<{
    valid: boolean;
    referrerName: string;
    referrerId: string;
  }> {
    try {
      const response = await apiClient.post('/api/referral/validate-code', { code });
      return extractData(response);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Apply referral code during registration
   */
  async applyCode(code: string, metadata?: any): Promise<{
    success: boolean;
    referralId: string;
    welcomeBonus: number;
    message: string;
  }> {
    try {
      const response = await apiClient.post('/api/referral/apply-code', {
        code,
        metadata
      });
      return extractData(response);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get referral analytics (admin)
   */
  async getAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const response = await apiClient.get('/api/referral/analytics', {
        params: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        }
      });
      return extractData(response);
    } catch (error) {
      throw error;
    }
  }
};

export default referralTierApi;
