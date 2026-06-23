// Achievement API Service
// Handles user achievements and badges system

import apiClient, { ApiResponse } from './apiClient';

// Achievement types are now dynamic strings from the API (no hardcoded enum)
export type AchievementType = string;

export interface AchievementReward {
  coins?: number;
  cashback?: number;
  badge?: string;
  title?: string;
  multiplier?: number;
}

export interface RuleProgress {
  metric: string;
  currentValue: number;
  targetValue: number;
  met: boolean;
}

export interface Achievement {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  unlocked: boolean;
  progress: number; // 0-100
  unlockedDate?: string;
  currentValue?: number;
  targetValue: number;
  reward: AchievementReward;
  visibility: 'visible' | 'hidden_until_progress' | 'secret';
  repeatability: 'one_time' | 'daily' | 'weekly' | 'monthly';
  timesCompleted: number;
  prerequisites: string[];
  ruleProgress: RuleProgress[];
  conditions?: {
    type: string;
    combinator: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AchievementProgress {
  summary: {
    total: number;
    unlocked: number;
    inProgress: number;
    locked: number;
    completionPercentage: number;
    totalCoinsEarned: number;
  };
  achievements: Achievement[];
}

/**
 * Map raw API achievement response to typed Achievement object.
 * All display data (icon, category, reward, tier) comes from the API.
 */
function mapAchievement(a: any): Achievement {
  return {
    id: a._id || a.id,
    userId: a.user || '',
    type: a.type || '',
    title: a.title || 'Achievement',
    description: a.description || '',
    icon: a.icon || '🏆',
    color: a.color || '#F59E0B',
    category: a.category || 'General',
    tier: a.tier || 'bronze',
    unlocked: a.unlocked || false,
    progress: a.progress || 0,
    unlockedDate: a.unlockedDate,
    currentValue: a.currentValue,
    targetValue: a.targetValue || 100,
    reward: a.reward || { coins: a.coinReward || 0 },
    visibility: a.visibility || 'visible',
    repeatability: a.repeatability || 'one_time',
    timesCompleted: a.timesCompleted || 0,
    prerequisites: a.prerequisites || [],
    ruleProgress: a.ruleProgress || [],
    conditions: a.conditions,
    createdAt: a.createdAt || new Date().toISOString(),
    updatedAt: a.updatedAt || new Date().toISOString(),
  };
}

// Client-side cooldown for recalculateAchievements — matches backend's 60s Redis lock.
// Placed at the API layer so ALL callers (GamificationContext, useAchievements,
// gamificationTriggerService, achievementTriggers, badges page) are protected.
const recalcState = {
  lastCallTimestamp: 0,
  cachedResult: null as ApiResponse<Achievement[]> | null,
  pending: null as Promise<ApiResponse<Achievement[]>> | null,
};
const RECALC_COOLDOWN_MS = 60_000;

class AchievementApiService {
  private baseUrl = '/achievements';
  private statsUrl = '/gamification/stats';

  /**
   * Get achievement definitions (not user-specific)
   */
  async getAchievementDefinitions(): Promise<ApiResponse<any[]>> {
    try {
      const response = await apiClient.get<any>(this.baseUrl);
      if (response.success) {
        return {
          success: true,
          data: response.data || [],
        };
      }
      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current user's achievements
   * Backend endpoint: GET /achievements
   */
  async getUserAchievements(): Promise<ApiResponse<Achievement[]>> {
    try {
      const response = await apiClient.get<any>(this.baseUrl);

      if (response.success && response.data) {
        const rawData = Array.isArray(response.data) ? response.data : (response.data.achievements || []);
        const achievements: Achievement[] = rawData.map(mapAchievement);
        return { success: true, data: achievements };
      }

      return { success: true, data: [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get only unlocked achievements
   */
  async getUnlockedAchievements(): Promise<ApiResponse<Achievement[]>> {
    try {
      const response = await this.getUserAchievements();
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.filter(a => a.unlocked),
        };
      }
      return response;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current user's achievement progress
   * Backend endpoint: GET /achievements/progress
   * Returns user's achievements with progress and summary stats
   */
  async getAchievementProgress(): Promise<ApiResponse<AchievementProgress>> {
    try {
      const response = await apiClient.get<any>(`${this.baseUrl}/progress`);

      if (response.success && response.data) {
        const data = response.data;
        const achievements: Achievement[] = (data.achievements || []).map(mapAchievement);

        return {
          success: true,
          data: {
            summary: data.summary || {
              total: achievements.length,
              unlocked: achievements.filter(a => a.unlocked).length,
              inProgress: achievements.filter(a => !a.unlocked && a.progress > 0).length,
              locked: achievements.filter(a => !a.unlocked && a.progress === 0).length,
              completionPercentage: achievements.length > 0
                ? Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100)
                : 0,
              totalCoinsEarned: achievements.filter(a => a.unlocked).reduce((sum, a) => sum + (a.reward?.coins || 0), 0),
            },
            achievements,
          },
        };
      }

      return {
        success: true,
        data: {
          summary: { total: 0, unlocked: 0, inProgress: 0, locked: 0, completionPercentage: 0, totalCoinsEarned: 0 },
          achievements: [],
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize achievements for user (usually done on registration)
   */
  async initializeUserAchievements(): Promise<ApiResponse<Achievement[]>> {
    try {
      const response = await apiClient.post<any>(`${this.baseUrl}/initialize`, {});
      if (response.success && response.data) {
        return { success: true, data: (response.data || []).map(mapAchievement) };
      }
      return { success: true, data: [] };
    } catch (error: any) {
      return { success: true, data: [] };
    }
  }

  /**
   * Recalculate all achievements based on user statistics
   * Backend endpoint: POST /achievements/recalculate
   *
   * Has a 60-second client-side cooldown matching the backend's Redis lock.
   * Concurrent calls are deduplicated (await the same in-flight promise).
   */
  async recalculateAchievements(): Promise<ApiResponse<Achievement[]>> {
    const now = Date.now();

    // Return cached result if within cooldown
    if (now - recalcState.lastCallTimestamp < RECALC_COOLDOWN_MS && recalcState.cachedResult) {
      return recalcState.cachedResult;
    }

    // Deduplicate concurrent calls — return the in-flight promise
    if (recalcState.pending) {
      return recalcState.pending;
    }

    // Mark timestamp before calling to prevent race conditions
    recalcState.lastCallTimestamp = now;

    const doCall = async (): Promise<ApiResponse<Achievement[]>> => {
      try {
        const response = await apiClient.post<any>('/achievements/recalculate', {});

        if (response.success && response.data) {
          const achievements: Achievement[] = (response.data || []).map(mapAchievement);
          const result: ApiResponse<Achievement[]> = { success: true, data: achievements };
          recalcState.cachedResult = result;
          return result;
        }

        const emptyResult: ApiResponse<Achievement[]> = { success: true, data: [] };
        recalcState.cachedResult = emptyResult;
        return emptyResult;
      } catch (error: any) {
        // On failure, reset timestamp so next call can retry immediately
        recalcState.lastCallTimestamp = 0;
        return { success: false, error: error.message };
      }
    };

    recalcState.pending = doCall().finally(() => {
      recalcState.pending = null;
    });

    return recalcState.pending;
  }

  /**
   * Manually unlock an achievement by ID. Returns the achievement details,
   * the coins earned, and the user's new balance.
   */
  async unlockAchievement(achievementId: string): Promise<{ achievement: any; coinsEarned: number; newBalance: number }> {
    try {
      const response = await apiClient.post<{ achievement: any; coinsEarned: number; newBalance: number }>(
        `${this.baseUrl}/${achievementId}/unlock`,
        {}
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to unlock achievement');
    } catch (error: any) {
      // Re-throw to preserve error shape for callers/tests
      throw error;
    }
  }
}

export const achievementApi = new AchievementApiService();
export default achievementApi;
