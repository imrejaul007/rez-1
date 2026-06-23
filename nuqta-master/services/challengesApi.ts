// Challenges API Service
// Handles missions/challenges for the gamification system
// Maps to backend endpoints at /api/gamification/challenges/*

import apiClient, { ApiResponse } from './apiClient';

// ============================================
// TYPES
// ============================================

export interface ChallengeRequirements {
  action: 'visit_stores' | 'upload_bills' | 'refer_friends' | 'spend_amount' | 'order_count' | 'review_count' | 'login_streak' | 'share_deals' | 'explore_categories' | 'add_favorites';
  target: number;
  stores?: string[];
  categories?: string[];
  minAmount?: number;
}

export interface ChallengeRewards {
  coins: number;
  badges?: string[];
  exclusiveDeals?: string[];
  multiplier?: number;
}

export interface Challenge {
  _id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  title: string;
  description: string;
  icon: string;
  requirements: ChallengeRequirements;
  rewards: ChallengeRewards;
  difficulty: 'easy' | 'medium' | 'hard';
  startDate: string;
  endDate: string;
  participantCount: number;
  completionCount: number;
  active: boolean;
  featured: boolean;
  maxParticipants?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeProgress {
  _id: string;
  user: string;
  challenge: Challenge;
  progress: number;
  target: number;
  completed: boolean;
  completedAt?: string;
  rewardsClaimed: boolean;
  claimedAt?: string;
  startedAt: string;
  lastUpdatedAt: string;
  progressPercentage: number;
}

export interface ChallengeClaimResult {
  success: boolean;
  coinsEarned: number;
  badgesEarned?: string[];
  newBalance: number;
  message: string;
}

export interface ChallengeStats {
  totalCompleted: number;
  totalCoinsEarned: number;
  currentStreak: number;
  activeChallenges: number;
}

export interface UnifiedChallenge {
  challenge: Challenge;
  userState: 'available' | 'joined' | 'in_progress' | 'completed' | 'claimed' | 'expired';
  progress: number;
  target: number;
  progressPercentage: number;
  progressId: string | null;
  rewardsClaimed: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

// ============================================
// CHALLENGES API SERVICE
// ============================================

class ChallengesApiService {
  private baseUrl = '/gamification/challenges';

  /**
   * Get all challenges, optionally filtered by type
   */
  async getChallenges(type?: 'daily' | 'weekly' | 'monthly' | 'special'): Promise<ApiResponse<Challenge[]>> {
    try {
      const params = type ? { type } : {};
      const response = await apiClient.get<any>(this.baseUrl, params);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.challenges || response.data || [],
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get currently active challenge (featured)
   */
  async getActiveChallenge(): Promise<ApiResponse<Challenge>> {
    try {
      const response = await apiClient.get<any>(`${this.baseUrl}/active`);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.challenge || response.data,
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's progress on all challenges
   * Backend returns: { challenges: [...], stats: { completed, active, expired, totalCoinsEarned } }
   */
  async getMyProgress(includeCompleted: boolean = true): Promise<ApiResponse<ChallengeProgress[]>> {
    try {
      const response = await apiClient.get<any>(`${this.baseUrl}/my-progress`, {
        includeCompleted: includeCompleted.toString(),
      });

      if (response.success && response.data) {
        // Backend returns { challenges: [...], stats: {...} }
        const progressList = response.data.challenges || response.data.progress || response.data || [];

        // Ensure each item has progressPercentage calculated
        const mappedProgress = progressList.map((item: any) => ({
          ...item,
          progressPercentage: item.progressPercentage ??
            (item.target > 0 ? Math.min((item.progress / item.target) * 100, 100) : 0),
        }));

        return {
          success: true,
          data: mappedProgress,
        };
      }

      return { success: true, data: [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's progress with stats (returns both challenges and stats)
   * This method returns the full response including stats
   */
  async getMyProgressWithStats(includeCompleted: boolean = true): Promise<ApiResponse<{ challenges: ChallengeProgress[]; stats: ChallengeStats }>> {
    try {
      const response = await apiClient.get<any>(`${this.baseUrl}/my-progress`, {
        includeCompleted: includeCompleted.toString(),
      });

      if (response.success && response.data) {
        const progressList = response.data.challenges || response.data.progress || response.data || [];
        const stats = response.data.stats || {};

        const mappedProgress = progressList.map((item: any) => ({
          ...item,
          progressPercentage: item.progressPercentage ??
            (item.target > 0 ? Math.min((item.progress / item.target) * 100, 100) : 0),
        }));

        return {
          success: true,
          data: {
            challenges: mappedProgress,
            stats: {
              totalCompleted: stats.completed || 0,
              totalCoinsEarned: stats.totalCoinsEarned || 0,
              currentStreak: stats.currentStreak || 0,
              activeChallenges: stats.active || 0,
            },
          },
        };
      }

      return {
        success: true,
        data: {
          challenges: [],
          stats: { totalCompleted: 0, totalCoinsEarned: 0, currentStreak: 0, activeChallenges: 0 },
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unified challenges with user state and server time.
   * Single source of truth for both Play & Earn and Missions pages.
   * Returns available challenges merged with user progress.
   */
  async getUnifiedChallenges(options?: {
    type?: string;
    limit?: number;
    visibility?: 'play_and_earn' | 'missions';
  }): Promise<ApiResponse<{
    challenges: UnifiedChallenge[];
    stats: ChallengeStats;
    serverTime: string;
  }>> {
    try {
      const params: any = {};
      if (options?.type) params.type = options.type;
      if (options?.limit) params.limit = options.limit;
      if (options?.visibility) params.visibility = options.visibility;

      const response = await apiClient.get<any>(`${this.baseUrl}/unified`, params);

      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          data: {
            challenges: data.challenges || [],
            stats: {
              totalCompleted: data.stats?.completed || 0,
              totalCoinsEarned: data.stats?.totalCoinsEarned || 0,
              currentStreak: 0,
              activeChallenges: data.stats?.active || 0,
            },
            serverTime: data.serverTime || new Date().toISOString(),
          },
        };
      }

      return {
        success: true,
        data: {
          challenges: [],
          stats: { totalCompleted: 0, totalCoinsEarned: 0, currentStreak: 0, activeChallenges: 0 },
          serverTime: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get daily challenges with user progress
   */
  async getDailyChallenges(): Promise<ApiResponse<ChallengeProgress[]>> {
    try {
      const response = await this.getMyProgress();

      if (response.success && response.data) {
        const dailyChallenges = response.data.filter(
          (cp) => cp.challenge?.type === 'daily'
        );
        return { success: true, data: dailyChallenges };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get weekly challenges with user progress
   */
  async getWeeklyChallenges(): Promise<ApiResponse<ChallengeProgress[]>> {
    try {
      const response = await this.getMyProgress();

      if (response.success && response.data) {
        const weeklyChallenges = response.data.filter(
          (cp) => cp.challenge?.type === 'weekly'
        );
        return { success: true, data: weeklyChallenges };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get special challenges with user progress
   */
  async getSpecialChallenges(): Promise<ApiResponse<ChallengeProgress[]>> {
    try {
      const response = await this.getMyProgress();

      if (response.success && response.data) {
        const specialChallenges = response.data.filter(
          (cp) => cp.challenge?.type === 'special' || cp.challenge?.type === 'monthly'
        );
        return { success: true, data: specialChallenges };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Join a challenge
   */
  async joinChallenge(challengeId: string): Promise<ApiResponse<ChallengeProgress>> {
    try {
      const response = await apiClient.post<any>(`${this.baseUrl}/${challengeId}/join`);

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.progress || response.data,
          message: response.message || 'Successfully joined challenge',
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Claim reward for a completed challenge
   * IMPORTANT: Pass the progress._id (ChallengeProgress._id), NOT challenge._id
   * Backend expects progressId to find UserChallengeProgress record
   * Backend returns: { progress, rewards: { coins, badges, ... }, walletBalance }
   */
  async claimReward(progressId: string): Promise<ApiResponse<ChallengeClaimResult>> {
    try {
      const response = await apiClient.post<any>(`${this.baseUrl}/${progressId}/claim`);

      if (response.success && response.data) {
        // Backend returns { progress, rewards, walletBalance }
        const rewards = response.data.rewards || {};
        return {
          success: true,
          data: {
            success: true,
            coinsEarned: rewards.coins || response.data.coinsEarned || 0,
            badgesEarned: rewards.badges || response.data.badgesEarned,
            newBalance: response.data.walletBalance || response.data.newBalance || 0,
            message: response.message || 'Rewards claimed successfully!',
          },
          message: response.message || 'Rewards claimed successfully!',
        };
      }

      return {
        success: false,
        error: response.error || 'Failed to claim reward',
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get challenge leaderboard
   */
  async getChallengeLeaderboard(challengeId: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any>(`${this.baseUrl}/${challengeId}/leaderboard`, { limit });

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.leaderboard || response.data || [],
        };
      }

      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's challenge statistics
   * Uses the stats from my-progress endpoint since /statistics doesn't exist
   */
  async getStatistics(): Promise<ApiResponse<ChallengeStats>> {
    try {
      // Get stats from my-progress endpoint (backend returns { challenges, stats })
      const response = await this.getMyProgressWithStats();

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.stats,
        };
      }

      return {
        success: true,
        data: {
          totalCompleted: 0,
          totalCoinsEarned: 0,
          currentStreak: 0,
          activeChallenges: 0,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate time remaining until challenge ends
   */
  getTimeRemaining(endDate: string): string {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }

    return `${hours}h ${minutes}m`;
  }
}

// Create singleton instance
const challengesApi = new ChallengesApiService();

export default challengesApi;
export { challengesApi };
