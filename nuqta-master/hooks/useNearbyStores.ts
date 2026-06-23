import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrentLocation, useLocationPermission } from './useLocation';
import { useRegionState } from '@/stores/selectors';
import storesService from '@/services/storesApi';

// Interface for nearby store data from API
export interface NearbyStore {
  id: string;
  name: string;
  distance: string;
  isLive: boolean;
  status: string;
  waitTime: string;
  cashback: string;
  closingSoon?: boolean;
}

interface UseNearbyStoresOptions {
  radius?: number; // km, default 2
  limit?: number; // max stores, default 5
  autoFetch?: boolean; // auto fetch when location available, default true
  useRegionFallback?: boolean; // use region's default coordinates when GPS unavailable, default true
}

interface UseNearbyStoresReturn {
  stores: NearbyStore[];
  isLoading: boolean;
  error: string | null;
  hasLocationPermission: boolean;
  refetch: () => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
}

// Timeout for fetch operations to prevent infinite loading
const FETCH_TIMEOUT = 15000; // 15 seconds

/**
 * Hook for fetching nearby stores for the homepage "Stores Near You" section
 * Uses the user's current location to fetch stores with computed fields like
 * wait time, status, cashback, and distance.
 *
 * When GPS location is unavailable, falls back to the region's default coordinates.
 * Automatically refetches when region changes.
 */
export function useNearbyStores(options: UseNearbyStoresOptions = {}): UseNearbyStoresReturn {
  const { radius = 2, limit = 5, autoFetch = true, useRegionFallback = true } = options;

  // Location hooks
  const { currentLocation, isLoading: isLocationLoading, error: locationError } = useCurrentLocation();
  const { permissionStatus, requestPermission } = useLocationPermission();

  // Region context for fallback coordinates and refetch on region change
  const regionState = useRegionState();
  const currentRegion = regionState.currentRegion;
  const regionConfig = regionState.regionConfig;

  // State
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if initial fetch has been attempted
  const hasInitialFetchRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we have location permission
  const hasLocationPermission = permissionStatus === 'granted';

  // Get effective coordinates (GPS location or region fallback)
  const getEffectiveCoordinates = useCallback(() => {
    // First priority: GPS location from LocationContext
    if (currentLocation?.coordinates?.latitude && currentLocation?.coordinates?.longitude) {
      return {
        latitude: currentLocation.coordinates.latitude,
        longitude: currentLocation.coordinates.longitude,
        source: 'gps' as const,
      };
    }

    // Fallback: Use region's default coordinates
    if (useRegionFallback && regionConfig?.defaultCoordinates) {
      return {
        latitude: regionConfig.defaultCoordinates.latitude,
        longitude: regionConfig.defaultCoordinates.longitude,
        source: 'region' as const,
      };
    }

    return null;
  }, [currentLocation?.coordinates?.latitude, currentLocation?.coordinates?.longitude, useRegionFallback, regionConfig?.defaultCoordinates]);

  // Fetch nearby stores with timeout protection
  const fetchNearbyStores = useCallback(async () => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    // Get effective coordinates (GPS or region fallback)
    const coords = getEffectiveCoordinates();

    if (!coords) {
      // No coordinates available at all - check if region is still loading
      if (regionState.isLoading) {
        // Region still loading, wait for it
        return;
      }
      setIsLoading(false);
      setError('Unable to determine location');
      return;
    }

    setIsLoading(true);
    setError(null);
    hasInitialFetchRef.current = true;

    // Set up timeout to prevent infinite loading
    const timeoutPromise = new Promise<never>((_, reject) => {
      fetchTimeoutRef.current = setTimeout(() => {
        reject(new Error('Request timed out'));
      }, FETCH_TIMEOUT);
    });

    try {
      const fetchPromise = storesService.getNearbyStoresForHomepage(
        coords.latitude,
        coords.longitude,
        radius,
        limit
      );

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Clear timeout on success
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }

      if (response.success && response.data?.stores) {
        setStores(response.data.stores);
        setError(null);
      } else {
        // API returned error or no stores
        const errorMsg = response.error || response.message || 'No stores found in this area';
        setError(errorMsg);
        setStores([]);
      }
    } catch (err: any) {
      // Clear timeout on error
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }

      const errorMessage = err?.message === 'Request timed out'
        ? 'Request timed out. Please try again.'
        : (err?.message || 'Failed to fetch nearby stores');
      setError(errorMessage);
      setStores([]);
    } finally {
      setIsLoading(false);
    }
  }, [getEffectiveCoordinates, regionState.isLoading, radius, limit]);

  // Auto-fetch when coordinates become available or region changes
  useEffect(() => {
    if (!autoFetch) return;

    // Don't fetch if location context is still loading (give it a chance to get GPS)
    // But don't wait forever - if region fallback is available, use it after initial wait
    const coords = getEffectiveCoordinates();

    if (coords) {
      // We have coordinates (either GPS or region fallback), fetch stores
      fetchNearbyStores();
    } else if (!isLocationLoading && !regionState.isLoading) {
      // No coordinates available and not loading - set error state
      setIsLoading(false);
      setError('Unable to determine location');
    }
  }, [autoFetch, fetchNearbyStores, getEffectiveCoordinates, isLocationLoading, regionState.isLoading]);

  // Refetch when region changes (important for currency and regional data)
  useEffect(() => {
    if (hasInitialFetchRef.current && currentRegion) {
      // Region changed after initial fetch - refetch with new region context
      fetchNearbyStores();
    }
  }, [currentRegion]); // Only depend on currentRegion, not fetchNearbyStores to avoid loops

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Handle location error - but still try region fallback
  useEffect(() => {
    if (locationError && !currentLocation?.coordinates) {
      // Location error, but check if we have region fallback
      const coords = getEffectiveCoordinates();
      if (!coords) {
        setError(locationError);
        setIsLoading(false);
      }
      // If we have region fallback, the auto-fetch effect will handle it
    }
  }, [locationError, currentLocation?.coordinates, getEffectiveCoordinates]);

  // Request location permission
  const handleRequestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await requestPermission();
    if (granted) {
      // Refetch with new location after permission granted
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => fetchNearbyStores(), 500);
    }
    return granted;
  }, [requestPermission, fetchNearbyStores]);

  // Determine final loading state
  // Only show loading if we're actually fetching or waiting for initial data
  const effectiveLoading = isLoading && !hasInitialFetchRef.current
    ? (isLocationLoading || regionState.isLoading || isLoading)
    : isLoading;

  return {
    stores,
    isLoading: effectiveLoading,
    error,
    hasLocationPermission,
    refetch: fetchNearbyStores,
    requestLocationPermission: handleRequestPermission,
  };
}

export default useNearbyStores;
