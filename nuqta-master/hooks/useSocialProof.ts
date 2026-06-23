/**
 * useSocialProof Hook
 * Fetches and manages social proof data for category pages
 * Shows nearby user activity and city-wide statistics
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import { BRAND } from '@/constants/brand';
import socialProofApi, {
  SocialProofActivity,
  StoreAggregate,
  CityWideStats,
  NearbyActivityResponse,
} from '@/services/socialProofApi';

interface UseSocialProofOptions {
  categorySlug?: string;
  radius?: number;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseSocialProofResult {
  // Activity data
  activities: SocialProofActivity[];
  storeAggregates: StoreAggregate[];
  cityWideStats: CityWideStats | null;
  
  // Computed values
  latestActivity: SocialProofActivity | null;
  totalSavingsNearby: number;
  totalPeopleNearby: number;
  
  // Banner messages
  bannerMessage: string;
  highlightMessage: string;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refetch: () => Promise<void>;
}

// Default fallback messages when no real data
const FALLBACK_MESSAGES = [
  `People nearby are saving with ${BRAND.APP_NAME}!`,
  'Join thousands saving money today',
  'Discover deals near you',
];

export const useSocialProof = (options: UseSocialProofOptions = {}): UseSocialProofResult => {
  const {
    radius = 5,
    limit = 10,
    autoRefresh = false,
    refreshInterval = 60000, // 1 minute
  } = options;

  const { state: locationState } = useLocationContext();
  
  // State
  const [activities, setActivities] = useState<SocialProofActivity[]>([]);
  const [storeAggregates, setStoreAggregates] = useState<StoreAggregate[]>([]);
  const [cityWideStats, setCityWideStats] = useState<CityWideStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch social proof data from API
   */
  const fetchSocialProof = useCallback(async () => {
    // Get coordinates from location context
    const coordinates = locationState.currentLocation?.coordinates;
    const city = locationState.currentLocation?.address?.city;

    if (!coordinates?.latitude || !coordinates?.longitude) {
      // No location available, try city-wide stats only
      if (city) {
        try {
          const response = await socialProofApi.getCityWideStats(city);
          if (response.success && response.data) {
            setCityWideStats(response.data);
          }
        } catch (_err) {
          // silently handle
        }
      }
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await socialProofApi.getNearbyActivity({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radius,
        limit,
        city,
      });

      if (response.success && response.data) {
        setActivities(response.data.activities || []);
        setStoreAggregates(response.data.storeAggregates || []);
        setCityWideStats(response.data.cityWideStats || null);
        const activityCount = response.data.activities ? response.data.activities.length : 0;
      } else {
        setError(response.error || 'Failed to fetch social proof');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch social proof');
    } finally {
      setIsLoading(false);
    }
  }, [locationState.currentLocation, radius, limit]);

  // Initial fetch
  useEffect(() => {
    fetchSocialProof();
  }, [fetchSocialProof]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSocialProof();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchSocialProof]);

  // Computed values
  const latestActivity = activities.length > 0 ? activities[0] : null;
  
  const totalSavingsNearby = activities.reduce((sum, act) => sum + (act.savings || 0), 0);
  
  const totalPeopleNearby = activities.length;

  // Generate banner message
  const bannerMessage = (() => {
    if (latestActivity) {
      return latestActivity.firstName + ' saved Rs.' + latestActivity.savings + ' at ' + latestActivity.storeName + ' ' + latestActivity.timeAgo;
    }
    if (cityWideStats) {
      return cityWideStats.message;
    }
    return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
  })();

  // Generate highlight message (for store-specific display)
  const highlightMessage = (() => {
    if (storeAggregates.length > 0) {
      const topStore = storeAggregates[0];
      return topStore.todayRedemptions + ' people saved at ' + topStore.storeName + ' today';
    }
    if (totalPeopleNearby > 0) {
      return totalPeopleNearby + ' people saved Rs.' + totalSavingsNearby + ' nearby today';
    }
    if (cityWideStats) {
      return cityWideStats.totalPeopleToday + ' people saved in ' + cityWideStats.city + ' today';
    }
    return `Start saving with ${BRAND.APP_NAME} today!`;
  })();

  return {
    // Activity data
    activities,
    storeAggregates,
    cityWideStats,
    
    // Computed values
    latestActivity,
    totalSavingsNearby,
    totalPeopleNearby,
    
    // Banner messages
    bannerMessage,
    highlightMessage,
    
    // Loading states
    isLoading,
    error,
    
    // Actions
    refetch: fetchSocialProof,
  };
};

export default useSocialProof;
