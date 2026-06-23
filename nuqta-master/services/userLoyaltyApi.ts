// User Loyalty API Service
// Handles user streak, missions, and coins for loyalty/gamification

import apiClient, { ApiResponse } from './apiClient';

export interface Streak {
  current: number;
  target: number;
  lastCheckin: string | null;
  history: string[];
}

export interface BrandLoyalty {
  brandId: string;
  brandName: string;
  purchaseCount: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  progress: number;
  nextTierAt: number;
}

export interface Mission {
  missionId: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  icon: string;
  completedAt: string | null;
}

export interface CoinHistory {
  amount: number;
  type: 'earned' | 'spent' | 'expired';
  description: string;
  date: string;
}

export interface Coins {
  available: number;
  expiring: number;
  expiryDate: string | null;
  history: CoinHistory[];
}

export type MainCategorySlug = 'food-dining' | 'beauty-wellness' | 'grocery-essentials' | 'fitness-sports' | 'healthcare' | 'fashion' | 'education-learning' | 'home-services' | 'travel-experiences' | 'entertainment' | 'financial-lifestyle' | 'electronics';

export interface CategoryCoins {
  available: number;
  expiring: number;
  expiryDate?: string | null;
}

export interface CategoryBalance {
  available: number;
  earned: number;
  spent: number;
}

export interface UserLoyalty {
  _id: string;
  userId: string;
  streak: Streak;
  brandLoyalty: BrandLoyalty[];
  missions: Mission[];
  coins: Coins;
  categoryCoins?: Record<string, CategoryCoins>;
}

class UserLoyaltyApiService {
  private baseUrl = '/loyalty';

  /**
   * Get user's loyalty data (with auto-seeded missions, brand loyalty, and wallet balance)
   */
  async getLoyalty(category?: string): Promise<ApiResponse<{
    loyalty: UserLoyalty;
    walletBalance: number;
    totalCoins: number;
    categoryCoins?: CategoryCoins;
    categoryBalance?: number;
    categoryTotalCoins?: number;
  }>> {
    const params = category ? { category } : undefined;
    return apiClient.get(this.baseUrl, params);
  }

  /**
   * Daily check-in
   */
  async checkIn(category?: string): Promise<ApiResponse<{
    loyalty: UserLoyalty;
    coinsEarned: number;
    streakContinued: boolean;
    streakBonus: boolean;
    message: string;
  }>> {
    const params = category ? `?category=${category}` : '';
    return apiClient.post(`${this.baseUrl}/checkin${params}`);
  }

  /**
   * Complete a mission (with optional category for category-specific coin award)
   */
  async completeMission(missionId: string, category?: string): Promise<ApiResponse<{ loyalty: UserLoyalty; reward: number; message: string }>> {
    const params = category ? `?category=${category}` : '';
    return apiClient.post(`${this.baseUrl}/missions/${missionId}/complete${params}`);
  }

  /**
   * Get coin balance (combined loyalty + wallet, with per-category breakdown)
   */
  async getCoinBalance(category?: string): Promise<ApiResponse<{
    coins: Coins;
    walletBalance: number;
    totalCoins: number;
    categoryBreakdown?: Record<string, CategoryBalance>;
    categoryBalance?: CategoryBalance;
  }>> {
    const params = category ? { category } : undefined;
    return apiClient.get(`${this.baseUrl}/coins`, params);
  }

  /**
   * Sync brand loyalty from order history
   */
  async syncBrandLoyalty(): Promise<ApiResponse<{ brandLoyalty: BrandLoyalty[]; count: number }>> {
    return apiClient.post(`${this.baseUrl}/sync-brands`);
  }
}

// Export singleton instance
const userLoyaltyApi = new UserLoyaltyApiService();
export default userLoyaltyApi;
