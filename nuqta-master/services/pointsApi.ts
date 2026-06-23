// @ts-nocheck
/**
 * Points/Coins API Service
 * Centralized service for managing user points, coins, and rewards
 */

import apiClient, { ApiResponse } from './apiClient';
import walletApi from './walletApi';

export interface PointsBalance {
  total: number;
  earned: number;
  spent: number;
  pending: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export interface PointTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'spent' | 'expired' | 'refunded' | 'bonus';
  amount: number;
  source:
    | 'purchase'
    | 'review'
    | 'referral'
    | 'daily_login'
    | 'achievement'
    | 'challenge'
    | 'spin_wheel'
    | 'scratch_card'
    | 'quiz'
    | 'bill_upload'
    | 'video_upload'
    | 'social_share'
    | 'bonus'
    | 'admin';
  description: string;
  metadata?: {
    orderId?: string;
    reviewId?: string;
    referralId?: string;
    achievementId?: string;
    challengeId?: string;
    productId?: string;
    storeId?: string;
    [key: string]: any;
  };
  status: 'pending' | 'completed' | 'cancelled' | 'expired';
  expiresAt?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PointsStats {
  totalEarned: number;
  totalSpent: number;
  currentBalance: number;
  pendingBalance: number;
  todayEarned: number;
  weekEarned: number;
  monthEarned: number;
  averagePerDay: number;
  topSource: string;
  transactionCount: number;
  recentTransactions: PointTransaction[];
}

export interface EarnPointsRequest {
  amount: number;
  source: PointTransaction['source'];
  description: string;
  metadata?: PointTransaction['metadata'];
}

export interface SpendPointsRequest {
  amount: number;
  purpose: string;
  description: string;
  metadata?: PointTransaction['metadata'];
}

export interface PointsReward {
  points: number;
  multiplier?: number;
  bonus?: number;
  reason: string;
  unlocked?: {
    achievements: string[];
    badges: string[];
    tier?: string;
  };
}

class PointsApiService {
  private baseUrl = '/points';

  /**
   * Get user's current points balance
   */
  async getBalance(): Promise<ApiResponse<PointsBalance>> {
    try {
      // Try wallet balance as source of truth (points endpoint doesn't exist on backend)
      const walletResponse = await walletApi.getBalance();
      if (walletResponse.success && walletResponse.data) {
        const w = walletResponse.data;
        return {
          success: true,
          data: {
            total: w.balance?.total || w.total || 0,
            earned: w.balance?.available || 0,
            spent: 0,
            pending: w.balance?.pending || 0,
            lifetimeEarned: w.balance?.total || 0,
            lifetimeSpent: 0,
          },
        };
      }
      return { success: true, data: { total: 0, earned: 0, spent: 0, pending: 0, lifetimeEarned: 0, lifetimeSpent: 0 } };
    } catch (error) {
      // Return default balance instead of throwing — prevents 404 console noise
      return { success: true, data: { total: 0, earned: 0, spent: 0, pending: 0, lifetimeEarned: 0, lifetimeSpent: 0 } };
    }
  }

  /**
   * Get points transaction history with pagination
   */
  async getTransactions(
    page: number = 1,
    limit: number = 20,
    filters?: {
      type?: PointTransaction['type'];
      source?: PointTransaction['source'];
      status?: PointTransaction['status'];
      startDate?: string;
      endDate?: string;
    }
  ): Promise<
    ApiResponse<{
      transactions: PointTransaction[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
  > {
    try {

      return await apiClient.get(`${this.baseUrl}/transactions`, {
        page,
        limit,
        ...filters,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get points statistics and analytics
   */
  async getStats(): Promise<ApiResponse<PointsStats>> {
    try {

      return await apiClient.get(`${this.baseUrl}/stats`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Award points to user (called by system/triggers)
   */
  async earnPoints(data: EarnPointsRequest): Promise<ApiResponse<PointsReward>> {
    try {

      return await apiClient.post(`${this.baseUrl}/earn`, data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Spend points (for redemptions, purchases, etc.)
   */
  async spendPoints(data: SpendPointsRequest): Promise<
    ApiResponse<{
      success: boolean;
      pointsSpent: number;
      newBalance: number;
      transaction: PointTransaction;
    }>
  > {
    try {

      return await apiClient.post(`${this.baseUrl}/spend`, data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate potential points for an action
   */
  async calculatePoints(
    source: PointTransaction['source'],
    metadata?: any
  ): Promise<ApiResponse<{ estimatedPoints: number; multiplier: number; breakdown: any }>> {
    try {

      return await apiClient.post(`${this.baseUrl}/calculate`, {
        source,
        metadata,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Claim pending points
   */
  async claimPendingPoints(transactionIds?: string[]): Promise<
    ApiResponse<{
      claimedAmount: number;
      claimedTransactions: PointTransaction[];
      newBalance: number;
    }>
  > {
    try {

      return await apiClient.post(`${this.baseUrl}/claim`, {
        transactionIds,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get points earning opportunities
   */
  async getEarningOpportunities(): Promise<
    ApiResponse<
      Array<{
        id: string;
        title: string;
        description: string;
        points: number;
        action: string;
        icon: string;
        category: string;
        difficulty: 'easy' | 'medium' | 'hard';
        estimatedTime: string;
      }>
    >
  > {
    try {

      return await apiClient.get(`${this.baseUrl}/opportunities`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get points leaderboard
   */
  async getLeaderboard(
    period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'monthly',
    limit: number = 50
  ): Promise<
    ApiResponse<{
      entries: Array<{
        rank: number;
        userId: string;
        username: string;
        fullName: string;
        avatar?: string;
        points: number;
        level: number;
        isCurrentUser?: boolean;
      }>;
      userRank?: number;
      totalUsers: number;
    }>
  > {
    try {

      return await apiClient.get(`${this.baseUrl}/leaderboard`, {
        period,
        limit,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get daily check-in status (uses gamification streaks endpoint)
   */
  async getDailyCheckIn(): Promise<
    ApiResponse<{
      canCheckIn: boolean;
      lastCheckInDate: string | null;
      currentStreak: number;
      longestStreak: number;
      checkInCount: number;
      todayReward: number;
      streakBonus: number;
      nextReward: number;
    }>
  > {
    try {
      // Use gamification streaks endpoint
      const response = await apiClient.get('/gamification/streaks');
      
      // Transform the response to match expected format
      if (response.success && response.data) {
        const streak = response.data;
        return {
          success: true,
          data: {
            canCheckIn: !streak.checkedInToday,
            lastCheckInDate: streak.lastCheckIn || null,
            currentStreak: streak.currentStreak || 0,
            longestStreak: streak.longestStreak || 0,
            checkInCount: streak.totalCheckIns || 0,
            todayReward: streak.todayReward || 10,
            streakBonus: streak.streakBonus || 0,
            nextReward: streak.nextReward || 10,
          }
        };
      }
      
      return { success: false, error: response.error || 'Failed to get check-in status' };
    } catch (error) {
      // Return canCheckIn: false on error to prevent cascading checkin calls
      return {
        success: false,
        data: {
          canCheckIn: false,
          lastCheckInDate: null,
          currentStreak: 0,
          longestStreak: 0,
          checkInCount: 0,
          todayReward: 10,
          streakBonus: 0,
          nextReward: 10,
        }
      };
    }
  }

  /**
   * Perform daily check-in (uses gamification streak checkin endpoint)
   */
  async performDailyCheckIn(): Promise<
    ApiResponse<{
      success: boolean;
      pointsEarned: number;
      streak: number;
      bonus: number;
      nextReward: number;
      message: string;
    }>
  > {
    try {
      // Use gamification streak checkin endpoint
      return await apiClient.post('/gamification/streak/checkin');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get points multiplier info (based on tier, events, etc.)
   */
  async getMultiplier(): Promise<
    ApiResponse<{
      baseMultiplier: number;
      tierMultiplier: number;
      eventMultiplier: number;
      totalMultiplier: number;
      activeEvents: Array<{
        name: string;
        multiplier: number;
        endsAt: string;
      }>;
    }>
  > {
    try {

      return await apiClient.get(`${this.baseUrl}/multiplier`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Transfer points to another user (if feature enabled)
   */
  async transferPoints(
    recipientId: string,
    amount: number,
    message?: string
  ): Promise<
    ApiResponse<{
      success: boolean;
      transaction: PointTransaction;
      newBalance: number;
    }>
  > {
    try {

      return await apiClient.post(`${this.baseUrl}/transfer`, {
        recipientId,
        amount,
        message,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Redeem points for rewards
   */
  async redeemPoints(
    rewardId: string,
    pointsCost: number
  ): Promise<
    ApiResponse<{
      success: boolean;
      reward: any;
      pointsSpent: number;
      newBalance: number;
    }>
  > {
    try {

      return await apiClient.post(`${this.baseUrl}/redeem`, {
        rewardId,
        pointsCost,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get available rewards that can be redeemed with points
   */
  async getRedeemableRewards(): Promise<
    ApiResponse<
      Array<{
        id: string;
        title: string;
        description: string;
        pointsCost: number;
        category: string;
        icon: string;
        availability: number;
        expiresAt?: string;
      }>
    >
  > {
    try {

      return await apiClient.get(`${this.baseUrl}/rewards`);
    } catch (error) {
      throw error;
    }
  }
}

export const pointsApi = new PointsApiService();
export default pointsApi;
