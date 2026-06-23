// useUserStatistics Hook
// Fetches and manages user statistics from all phases with caching

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '@/services/authApi';

// Cache configuration
const CACHE_KEY = 'user_statistics_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CachedData {
  data: UserStatistics;
  timestamp: number;
}

export interface UserStatistics {
  user: {
    joinedDate: string;
    isVerified: boolean;
    totalReferrals: number;
    referralEarnings: number;
  };
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    totalSpent: number;
  };
  wallet: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    pendingAmount: number;
  };
  reviews?: {
    total: number;
  };
  achievements?: {
    total: number;
    unlocked: number;
  };
  activities?: {
    total: number;
  };
  videos: {
    totalCreated: number;
    totalViews: number;
    totalLikes: number;
    totalShares: number;
  };
  projects: {
    totalParticipated: number;
    approved: number;
    rejected: number;
    totalEarned: number;
  };
  offers: {
    totalRedeemed: number;
  };
  vouchers: {
    total: number;
    used: number;
    active: number;
  };
  summary: {
    totalActivity: number;
    totalEarnings: number;
    totalSpendings: number;
  };
}

interface UseUserStatisticsReturn {
  statistics: UserStatistics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearError: () => void;
}

export const useUserStatistics = (autoFetch: boolean = true): UseUserStatisticsReturn => {
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached data
  const loadCachedData = useCallback(async (): Promise<UserStatistics | null> => {
    try {
      const cachedJson = await AsyncStorage.getItem(CACHE_KEY);
      if (!cachedJson) return null;

      const cached: CachedData = JSON.parse(cachedJson);
      const now = Date.now();

      // Check if cache is still valid
      if (now - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      } else {
        // Cache expired, remove it
        await AsyncStorage.removeItem(CACHE_KEY);
        return null;
      }
    } catch (error) {
      return null;
    }
  }, []);

  // Save data to cache
  const saveToCache = useCallback(async (data: UserStatistics): Promise<void> => {
    try {
      const cacheData: CachedData = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (_error) {
      // silently handle
    }
  }, []);

  // Fetch statistics from API
  const fetchStatistics = useCallback(async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to load from cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = await loadCachedData();
        if (cachedData) {
          setStatistics(cachedData);
          setIsLoading(false);
          return; // Return early with cached data
        }
      }

      // Fetch fresh data from API
      const response = await authService.getUserStatistics();

      if (response.success && response.data) {
        // Ensure all expected fields exist with defaults
        // Handle wallet balance if it's returned as an object instead of a number
        const walletBalance = typeof response.data.wallet?.balance === 'object'
          ? (response.data.wallet.balance as any).available || (response.data.wallet.balance as any).total || 0
          : response.data.wallet?.balance || 0;

        const statsData: UserStatistics = {
          ...response.data,
          wallet: {
            ...response.data.wallet,
            balance: walletBalance,
            totalEarned: response.data.wallet?.totalEarned || 0,
            totalSpent: response.data.wallet?.totalSpent || 0,
            pendingAmount: response.data.wallet?.pendingAmount || 0,
          },
          reviews: (response.data as any).reviews || { total: 0 },
          achievements: (response.data as any).achievements || { total: 0, unlocked: 0 },
          activities: (response.data as any).activities || { total: 0 },
        };

        setStatistics(statsData);

        // Save to cache
        await saveToCache(statsData);
      } else {
        throw new Error(response.message || 'Failed to fetch statistics');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch user statistics';
      setError(errorMessage);

      // If the fetch fails and we don't have data yet, try to load from cache
      if (!forceRefresh) {
        const cachedData = await loadCachedData();
        if (cachedData) {
          setStatistics(prevStats => prevStats || cachedData);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedData, saveToCache]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchStatistics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]);

  return {
    statistics,
    isLoading,
    error,
    refetch: fetchStatistics,
    clearError,
  };
};

export default useUserStatistics;
