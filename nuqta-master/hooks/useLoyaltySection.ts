import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrentLocation } from './useLocation';
import { useRegionState } from '@/stores/selectors';
import loyaltyApi, {
  HomepageLoyaltySummary,
  LoyaltyHubStats,
  FeaturedProduct,
} from '@/services/loyaltyApi';

// Timeout for waiting on location - don't block forever
const LOCATION_WAIT_TIMEOUT = 3000; // 3 seconds max wait for location

// ── Module-level dedup: survives component remounts caused by DeferredProviders ──
let _loyaltyCache: HomepageLoyaltySummary | null = null;
let _loyaltyCacheTime = 0;
let _loyaltyPending: Promise<HomepageLoyaltySummary | null> | null = null;
const LOYALTY_CACHE_MS = 30_000; // 30 seconds

interface UseLoyaltySectionOptions {
  autoFetch?: boolean; // Auto fetch when location available, default true
}

interface UseLoyaltySectionReturn {
  data: HomepageLoyaltySummary | null;
  loyaltyHub: LoyaltyHubStats | null;
  featuredLockProduct: FeaturedProduct | null;
  trendingService: FeaturedProduct | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching homepage loyalty section data
 * Includes loyalty hub stats, featured lock product, and trending service
 * Uses user's current location for nearby products/services
 * Falls back to region default coordinates if GPS unavailable
 */
export function useLoyaltySection(options: UseLoyaltySectionOptions = {}): UseLoyaltySectionReturn {
  const { autoFetch = true } = options;

  // Location hook
  const { currentLocation, isLoading: isLocationLoading } = useCurrentLocation();

  // Region context for fallback coordinates
  const regionState = useRegionState();
  const regionConfig = regionState.regionConfig;

  // State
  const [data, setData] = useState<HomepageLoyaltySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already fetched
  const hasFetchedRef = useRef(false);
  const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get effective coordinates (GPS or region fallback)
  const getEffectiveCoordinates = useCallback(() => {
    // First priority: GPS location
    if (currentLocation?.coordinates?.latitude && currentLocation?.coordinates?.longitude) {
      return {
        latitude: currentLocation.coordinates.latitude,
        longitude: currentLocation.coordinates.longitude,
      };
    }

    // Fallback: Use region's default coordinates
    if (regionConfig?.defaultCoordinates) {
      return {
        latitude: regionConfig.defaultCoordinates.latitude,
        longitude: regionConfig.defaultCoordinates.longitude,
      };
    }

    // Final fallback: Bangalore coordinates
    return {
      latitude: 12.9716,
      longitude: 77.5946,
    };
  }, [currentLocation?.coordinates, regionConfig?.defaultCoordinates]);

  // Fetch loyalty section data (module-level dedup prevents duplicate calls on remount)
  const fetchData = useCallback(async () => {
    // Return cached result if recent enough (prevents re-fetch on DeferredProvider remounts)
    if (_loyaltyCache && Date.now() - _loyaltyCacheTime < LOYALTY_CACHE_MS) {
      setData(_loyaltyCache);
      setIsLoading(false);
      hasFetchedRef.current = true;
      return;
    }

    // Coalesce with in-flight request
    if (_loyaltyPending) {
      try {
        const cached = await _loyaltyPending;
        if (cached) {
          setData(cached);
          setError(null);
        }
      } catch { /* handled below */ }
      setIsLoading(false);
      hasFetchedRef.current = true;
      return;
    }

    setIsLoading(true);
    setError(null);

    _loyaltyPending = (async () => {
      try {
        const coords = getEffectiveCoordinates();
        const response = await loyaltyApi.getHomepageSummary(coords.latitude, coords.longitude);

        if (response.success && response.data) {
          _loyaltyCache = response.data;
          _loyaltyCacheTime = Date.now();
          setData(response.data);
          setError(null);
          return response.data;
        } else {
          setError(response.error || response.message || 'Failed to fetch loyalty data');
          setData(null);
          return null;
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch loyalty data');
        setData(null);
        return null;
      } finally {
        setIsLoading(false);
        hasFetchedRef.current = true;
        _loyaltyPending = null;
      }
    })();

    await _loyaltyPending;
  }, [getEffectiveCoordinates]);

  // Auto-fetch with location timeout protection
  useEffect(() => {
    if (!autoFetch || hasFetchedRef.current) return;

    // Clear any existing timeout
    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current);
    }

    // If location is available or not loading, fetch immediately
    if (!isLocationLoading || currentLocation?.coordinates) {
      fetchData();
      return;
    }

    // If location is still loading, wait up to LOCATION_WAIT_TIMEOUT
    // then fetch with fallback coordinates
    locationTimeoutRef.current = setTimeout(() => {
      if (!hasFetchedRef.current) {
        fetchData();
      }
    }, LOCATION_WAIT_TIMEOUT);

    return () => {
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
      }
    };
  }, [autoFetch, isLocationLoading, currentLocation?.coordinates, fetchData]);

  // Refetch when region changes (important for regional data)
  useEffect(() => {
    if (hasFetchedRef.current && regionState.currentRegion) {
      fetchData();
    }
  }, [regionState.currentRegion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    loyaltyHub: data?.loyaltyHub || null,
    featuredLockProduct: data?.featuredLockProduct || null,
    trendingService: data?.trendingService || null,
    isLoading,
    error,
    refetch: fetchData,
  };
}

export default useLoyaltySection;
