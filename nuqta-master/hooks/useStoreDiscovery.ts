// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrentLocation } from './useLocation';
import storesService from '@/services/storesApi';
import apiClient from '@/services/apiClient';
import { useCurrentRegionId } from '@/stores/selectors';
import { devLog } from '@/utils/devLogger';

export interface DiscoveryStore {
  id: string;
  name: string;
  image?: string;
  banner?: string | string[];
  logo?: string;
  rating: {
    value: number;
    count?: number;
  };
  distance?: string;
  cashback?: {
    percentage: number;
    maxAmount?: number;
  };
  category?: string;
  location?: {
    coordinates?: [number, number];
    address?: string;
    city?: string;
  };
}

interface UseStoreDiscoveryState {
  topStores: DiscoveryStore[];
  popularStores: DiscoveryStore[];
  isLoadingTop: boolean;
  isLoadingPopular: boolean;
  errorTop: string | null;
  errorPopular: string | null;
}

interface UseStoreDiscoveryReturn extends UseStoreDiscoveryState {
  refreshTopStores: () => Promise<void>;
  refreshPopularStores: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
}

/**
 * Transform backend store data to DiscoveryStore format
 */
function transformStore(
  store: any,
  userCoordinates?: { latitude: number; longitude: number }
): DiscoveryStore {
  // Calculate distance if user coordinates and store coordinates are available
  let distance: string | undefined;
  if (userCoordinates && store.location?.coordinates) {
    const coords = store.location.coordinates;
    // MongoDB stores as [lng, lat]
    const [lng, lat] = Array.isArray(coords) ? coords : [coords.lng || coords.longitude, coords.lat || coords.latitude];
    if (typeof lat === 'number' && typeof lng === 'number') {
      distance = calculateDistance(
        userCoordinates.latitude,
        userCoordinates.longitude,
        lat,
        lng
      );
    }
  }

  // Use existing distance from store if available
  if (!distance && store.location?.distance) {
    distance = store.location.distance;
  }

  // Get image from various fields
  const image = (() => {
    if (store.banner) {
      if (Array.isArray(store.banner) && store.banner.length > 0) {
        return store.banner[0];
      }
      if (typeof store.banner === 'string') {
        return store.banner;
      }
    }
    return store.image || store.logo || '';
  })();

  // Extract cashback percentage from multiple sources
  let cashbackPercentage = 5; // Default fallback (5%)
  
  if (store.rewardRules?.baseCashbackPercent) {
    cashbackPercentage = store.rewardRules.baseCashbackPercent;
  } else if (store.offers?.cashback !== undefined) {
    // Handle both number and object formats
    cashbackPercentage = typeof store.offers.cashback === 'number' 
      ? store.offers.cashback 
      : store.offers.cashback?.percentage || 5;
  } else if (store.cashback !== undefined) {
    // Handle both number and object formats
    cashbackPercentage = typeof store.cashback === 'number'
      ? store.cashback
      : store.cashback?.percentage || 5;
  } else if (store.offers?.cashbackPercentage) {
    cashbackPercentage = store.offers.cashbackPercentage;
  } else if (store.cashbackPercentage) {
    cashbackPercentage = store.cashbackPercentage;
  }

  // Ensure minimum cashback of 5% for display (unless explicitly 0)
  if (cashbackPercentage === 0 && !store.rewardRules && !store.offers?.cashback && !store.cashback) {
    cashbackPercentage = 5; // Use default if no cashback data found
  }

  return {
    id: store._id || store.id,
    name: store.name || 'Unknown Store',
    image,
    banner: store.banner,
    logo: store.logo,
    rating: {
      value: store.ratings?.average || store.rating?.value || 0,
      count: store.ratings?.count || store.rating?.count || 0,
    },
    distance,
    cashback: {
      percentage: cashbackPercentage,
      maxAmount: store.offers?.cashback?.maxAmount || store.offers?.maxCashback || store.cashback?.maxAmount,
    },
    category: store.category?.name || store.category || 'General',
    location: store.location,
  };
}

/**
 * Hook for Store Discovery section data
 * Provides trending stores and nearby stores with fallback logic
 */
export function useStoreDiscovery(limit: number = 10): UseStoreDiscoveryReturn {
  const { currentLocation } = useCurrentLocation();
  const currentRegion = useCurrentRegionId(); // Get current region to refetch on change

  const [state, setState] = useState<UseStoreDiscoveryState>({
    topStores: [],
    popularStores: [],
    isLoadingTop: true,
    isLoadingPopular: true,
    errorTop: null,
    errorPopular: null,
  });

  // Get user coordinates from current location
  const userCoordinates = useMemo(() => {
    if (currentLocation?.coordinates) {
      return {
        latitude: currentLocation.coordinates.latitude,
        longitude: currentLocation.coordinates.longitude,
      };
    }
    return undefined;
  }, [currentLocation]);

  /**
   * Fetch top stores with location-based priority:
   * 1. If location available: Nearby stores sorted by rating (top-rated nearby stores)
   * 2. Trending stores API
   * 3. High-rated stores (4.5+)
   * 4. Featured stores
   */
  const fetchTopStores = useCallback(async (): Promise<DiscoveryStore[]> => {
    try {
      // Priority 1: If user location is available, fetch nearby stores sorted by rating
      if (userCoordinates) {
        devLog.log('📍 [StoreDiscovery] Fetching nearby top-rated stores...', userCoordinates);
        try {
          const nearbyResponse = await storesService.getNearbyStores(
            userCoordinates.latitude,
            userCoordinates.longitude,
            10, // 10km radius
            limit * 2 // Get more to sort by rating
          );

          if (nearbyResponse.success && nearbyResponse.data?.length > 0) {
            // Transform and sort by rating (descending), then by distance (ascending)
            const stores = nearbyResponse.data
              .map((store: any) => transformStore(store, userCoordinates))
              .sort((a: DiscoveryStore, b: DiscoveryStore) => {
                // First sort by rating (higher is better)
                const ratingDiff = (b.rating?.value || 0) - (a.rating?.value || 0);
                if (ratingDiff !== 0) return ratingDiff;
                
                // If ratings are equal, sort by distance (closer is better)
                if (a.distance && b.distance) {
                  const distA = parseFloat(a.distance.replace(/[^\d.]/g, '')) || Infinity;
                  const distB = parseFloat(b.distance.replace(/[^\d.]/g, '')) || Infinity;
                  return distA - distB;
                }
                return 0;
              })
              .slice(0, limit); // Take top N stores

            if (stores.length > 0) {
              devLog.log(`✅ [StoreDiscovery] Got ${stores.length} location-based top stores`);
              return stores;
            }
          }
        } catch (nearbyError) {
          devLog.warn('⚠️ [StoreDiscovery] Nearby stores fetch failed, falling back...', nearbyError);
          // Continue to fallback options
        }
      }

      // Priority 2: Try trending stores
      devLog.log('📊 [StoreDiscovery] Fetching trending stores...');
      const trendingResponse = await apiClient.get<any>('/stores/trending', { limit });

      if (trendingResponse.success && trendingResponse.data?.stores?.length > 0) {
        devLog.log(`✅ [StoreDiscovery] Got ${trendingResponse.data.stores.length} trending stores`);
        return trendingResponse.data.stores.map((store: any) =>
          transformStore(store, userCoordinates)
        );
      }

      // Priority 3: High-rated stores (4.5+)
      devLog.log('📊 [StoreDiscovery] Trying high-rated stores fallback...');
      const highRatedResponse = await storesService.getStores({
        rating: 4.5,
        limit,
        sort: 'rating',
        order: 'desc',
        ...(userCoordinates && {
          location: {
            latitude: userCoordinates.latitude,
            longitude: userCoordinates.longitude,
            radius: 10,
          },
        }),
      });

      if (highRatedResponse.success && highRatedResponse.data?.stores?.length > 0) {
        devLog.log(`✅ [StoreDiscovery] Got ${highRatedResponse.data.stores.length} high-rated stores`);
        return highRatedResponse.data.stores.map((store: any) =>
          transformStore(store, userCoordinates)
        );
      }

      // Priority 4: Featured stores
      devLog.log('📊 [StoreDiscovery] Trying featured stores fallback...');
      const featuredResponse = await storesService.getFeaturedStores(limit);

      if (featuredResponse.success && featuredResponse.data?.length > 0) {
        devLog.log(`✅ [StoreDiscovery] Got ${featuredResponse.data.length} featured stores`);
        return featuredResponse.data.map((store: any) =>
          transformStore(store, userCoordinates)
        );
      }

      return [];
    } catch (error) {
      devLog.error('❌ [StoreDiscovery] Error fetching top stores:', error);
      throw error;
    }
  }, [limit, userCoordinates]);

  /**
   * Fetch nearby stores using GPS location
   */
  const fetchPopularStores = useCallback(async (): Promise<DiscoveryStore[]> => {
    try {
      if (!userCoordinates) {
        devLog.log('⚠️ [StoreDiscovery] No user location available for nearby stores');
        // Fall back to featured stores if no location
        const featuredResponse = await storesService.getFeaturedStores(limit);
        if (featuredResponse.success && featuredResponse.data?.length > 0) {
          return featuredResponse.data.map((store: any) =>
            transformStore(store, undefined)
          );
        }
        return [];
      }

      devLog.log('📍 [StoreDiscovery] Fetching nearby stores...', userCoordinates);
      const nearbyResponse = await storesService.getNearbyStores(
        userCoordinates.latitude,
        userCoordinates.longitude,
        10, // 10km radius
        limit
      );

      if (nearbyResponse.success && nearbyResponse.data?.length > 0) {
        devLog.log(`✅ [StoreDiscovery] Got ${nearbyResponse.data.length} nearby stores`);
        return nearbyResponse.data.map((store: any) =>
          transformStore(store, userCoordinates)
        );
      }

      // Fallback to featured if no nearby stores
      devLog.log('📊 [StoreDiscovery] No nearby stores, falling back to featured...');
      const featuredResponse = await storesService.getFeaturedStores(limit);
      if (featuredResponse.success && featuredResponse.data?.length > 0) {
        return featuredResponse.data.map((store: any) =>
          transformStore(store, userCoordinates)
        );
      }

      return [];
    } catch (error) {
      devLog.error('❌ [StoreDiscovery] Error fetching popular stores:', error);
      throw error;
    }
  }, [limit, userCoordinates]);

  /**
   * Refresh top stores
   */
  const refreshTopStores = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingTop: true, errorTop: null }));
    try {
      const stores = await fetchTopStores();
      setState(prev => ({ ...prev, topStores: stores, isLoadingTop: false }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoadingTop: false,
        errorTop: error?.message || 'Failed to load top stores',
      }));
    }
  }, [fetchTopStores]);

  /**
   * Refresh popular stores
   */
  const refreshPopularStores = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingPopular: true, errorPopular: null }));
    try {
      const stores = await fetchPopularStores();
      setState(prev => ({ ...prev, popularStores: stores, isLoadingPopular: false }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoadingPopular: false,
        errorPopular: error?.message || 'Failed to load popular stores',
      }));
    }
  }, [fetchPopularStores]);

  /**
   * Refresh all stores
   */
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshTopStores(), refreshPopularStores()]);
  }, [refreshTopStores, refreshPopularStores]);

  // Initial data fetch - also refetch when region changes
  useEffect(() => {
    refreshTopStores();
  }, [refreshTopStores, currentRegion]);

  // Fetch popular stores when location becomes available or region changes
  useEffect(() => {
    refreshPopularStores();
  }, [refreshPopularStores, currentRegion]);

  return {
    ...state,
    refreshTopStores,
    refreshPopularStores,
    refreshAll,
  };
}

export default useStoreDiscovery;
