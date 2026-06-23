// useAchievements Hook
// Manages user achievements and badges system

import { useState, useEffect, useCallback } from 'react';
import achievementApi, { Achievement, AchievementProgress } from '@/services/achievementApi';

interface UseAchievementsReturn {
  achievements: Achievement[];
  progress: AchievementProgress | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchProgress: () => Promise<void>;
  getUnlockedAchievements: () => Promise<Achievement[]>;
  initializeAchievements: () => Promise<boolean>;
  recalculateAchievements: () => Promise<boolean>;
  unlockedAchievements: Achievement[];
  clearError: () => void;
}

export const useAchievements = (autoFetch: boolean = true): UseAchievementsReturn => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<AchievementProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await achievementApi.getUserAchievements();

      if (response.success && response.data) {
        setAchievements(response.data);
      } else if (response.message === 'Achievements already initialized' || response.data?.length === 0) {
        // If no achievements exist, initialize them

        const initResponse = await achievementApi.initializeUserAchievements();
        if (initResponse.success && initResponse.data) {
          setAchievements(initResponse.data);
        } else {
          throw new Error(initResponse.message || 'Failed to initialize achievements');
        }
      } else {
        throw new Error(response.message || 'Failed to fetch achievements');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch achievements';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    setError(null);

    try {
      const response = await achievementApi.getAchievementProgress();

      if (response.success && response.data) {
        setProgress(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch achievement progress');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch achievement progress';
      setError(errorMessage);
    }
  }, []);

  const getUnlockedAchievements = useCallback(async (): Promise<Achievement[]> => {
    setError(null);

    try {
      const response = await achievementApi.getUnlockedAchievements();

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch unlocked achievements');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch unlocked achievements';
      setError(errorMessage);
      return [];
    }
  }, []);

  const initializeAchievements = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const response = await achievementApi.initializeUserAchievements();

      if (response.success && response.data) {
        setAchievements(response.data);
        await fetchProgress(); // Update progress after initialization
        return true;
      } else {
        throw new Error(response.message || 'Failed to initialize achievements');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to initialize achievements';
      setError(errorMessage);
      return false;
    }
  }, [fetchProgress]);

  const recalculateAchievements = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const response = await achievementApi.recalculateAchievements();

      if (response.success && response.data) {
        setAchievements(response.data);
        await fetchProgress(); // Update progress after recalculation
        return true;
      } else {
        throw new Error(response.message || 'Failed to recalculate achievements');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to recalculate achievements';
      setError(errorMessage);
      return false;
    }
  }, [fetchProgress]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get unlocked achievements from current state
  const unlockedAchievements = achievements.filter(ach => ach.unlocked);

  useEffect(() => {
    if (autoFetch) {
      fetchAchievements();
      fetchProgress();
    }
  }, [autoFetch, fetchAchievements, fetchProgress]);

  return {
    achievements,
    progress,
    isLoading,
    error,
    refetch: fetchAchievements,
    fetchProgress,
    getUnlockedAchievements,
    initializeAchievements,
    recalculateAchievements,
    unlockedAchievements,
    clearError,
  };
};

export default useAchievements;
