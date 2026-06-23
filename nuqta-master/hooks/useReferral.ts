// Referral Hook
// Manages referral data and functionality

import { useState, useCallback, useEffect, useRef } from 'react';
import referralApi, { ReferralData, ReferralStatistics } from '@/services/referralApi';

interface UseReferralOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

interface UseReferralReturn {
  referralData: ReferralData | null;
  statistics: ReferralStatistics | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  fetchReferralData: () => Promise<void>;
  refreshReferralData: () => Promise<void>;
  generateReferralLink: () => Promise<string | null>;
  shareReferralLink: (platform: 'whatsapp' | 'telegram' | 'email' | 'sms') => Promise<boolean>;
  claimRewards: () => Promise<boolean>;
  clearError: () => void;
}

export const useReferral = ({
  autoFetch = true,
  refreshInterval
}: UseReferralOptions = {}): UseReferralReturn => {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [statistics, setStatistics] = useState<ReferralStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Fetch referral data
  const fetchReferralData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const [referralResponse, statisticsResponse] = await Promise.all([
        referralApi.getReferralData(),
        referralApi.getReferralStatistics()
      ]);

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;

      if (referralResponse.success && referralResponse.data) {
        setReferralData(referralResponse.data);
      } else {
        throw new Error(referralResponse.error || 'Failed to fetch referral data');
      }

      if (statisticsResponse.success && statisticsResponse.data) {
        setStatistics(statisticsResponse.data);
      } else {
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load referral data');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Refresh referral data
  const refreshReferralData = useCallback(async (): Promise<void> => {
    try {
      setIsRefreshing(true);
      setError(null);

      const [referralResponse, statisticsResponse] = await Promise.all([
        referralApi.getReferralData(),
        referralApi.getReferralStatistics()
      ]);

      if (!isMountedRef.current) return;

      if (referralResponse.success && referralResponse.data) {
        setReferralData(referralResponse.data);
      }

      if (statisticsResponse.success && statisticsResponse.data) {
        setStatistics(statisticsResponse.data);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to refresh referral data');
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  // Generate referral link
  const generateReferralLink = useCallback(async (): Promise<string | null> => {
    try {
      setError(null);

      const response = await referralApi.generateReferralLink();

      if (response.success && response.data) {
        return response.data.referralLink;
      } else {
        setError(response.error || 'Failed to generate referral link');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate referral link');
      return null;
    }
  }, []);

  // Share referral link
  const shareReferralLink = useCallback(async (platform: 'whatsapp' | 'telegram' | 'email' | 'sms'): Promise<boolean> => {
    try {
      setError(null);

      const response = await referralApi.shareReferralLink(platform);

      if (response.success) {
        return true;
      } else {
        setError(response.error || 'Failed to share referral link');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share referral link');
      return false;
    }
  }, []);

  // Claim rewards
  const claimRewards = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      const response = await referralApi.claimReferralRewards();

      if (response.success) {
        // Refresh data after claiming rewards
        await refreshReferralData();
        return true;
      } else {
        setError(response.error || 'Failed to claim rewards');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim rewards');
      return false;
    }
  }, [refreshReferralData]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Track mounted state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchReferralData();
    }
  }, [autoFetch, fetchReferralData]);

  // Setup refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        if (!isLoading && !isRefreshing) {
          refreshReferralData();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, isLoading, isRefreshing, refreshReferralData]);

  return {
    referralData,
    statistics,
    isLoading,
    isRefreshing,
    error,
    fetchReferralData,
    refreshReferralData,
    generateReferralLink,
    shareReferralLink,
    claimRewards,
    clearError,
  };
};

export default useReferral;
