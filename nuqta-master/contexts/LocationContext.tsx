// @ts-nocheck
import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';

// Lazy import toast store to avoid circular deps
let _useToastStore: any = null;
const getToastStore = async () => {
  if (!_useToastStore) {
    try {
      const { useToastStore } = await import('@/stores/toastStore');
      _useToastStore = useToastStore;
    } catch {
      _useToastStore = null;
    }
  }
  return _useToastStore;
};
// Lazy-loaded: expo-location (500KB+) not in synchronous dependency chain
let _locSvc: any = null;
const getLocationService = async () => {
  if (!_locSvc) _locSvc = (await import('@/services/locationService')).locationService;
  return _locSvc;
};
let _webLocSvc: any = null;
const getWebLocationService = async () => {
  if (!_webLocSvc) _webLocSvc = (await import('@/services/webLocationService')).webLocationService;
  return _webLocSvc;
};
import {
  LocationState,
  LocationContextType,
  LocationCoordinates,
  UserLocation,
  LocationHistoryEntry,
  AddressSearchResult,
  LocationAddress,
  LocationPermissionResult,
} from '@/types/location.types';

// Action types
type LocationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_LOCATION'; payload: UserLocation | null }
  | { type: 'SET_LOCATION_HISTORY'; payload: LocationHistoryEntry[] }
  | { type: 'SET_PERMISSION_STATUS'; payload: LocationPermissionResult }
  | { type: 'SET_LOCATION_ENABLED'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: LocationState = {
  currentLocation: null,
  locationHistory: [],
  isLoading: false,
  error: null,
  permissionStatus: 'undetermined',
  isLocationEnabled: false,
};

// Reducer
function locationReducer(state: LocationState, action: LocationAction): LocationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_CURRENT_LOCATION':
      return { ...state, currentLocation: action.payload, isLoading: false };
    
    case 'SET_LOCATION_HISTORY':
      return { ...state, locationHistory: action.payload };
    
    case 'SET_PERMISSION_STATUS':
      return { 
        ...state, 
        permissionStatus: action.payload.status,
        isLocationEnabled: action.payload.status === 'granted'
      };
    
    case 'SET_LOCATION_ENABLED':
      return { ...state, isLocationEnabled: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Create context
const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Provider component
interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [state, dispatch] = useReducer(locationReducer, initialState);

  // Initialize location context
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!cancelled) await initializeLocation();
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const initializeLocation = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Add timeout to prevent infinite loading (3s instead of 10s)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Location initialization timeout')), 3000)
      );
      const initPromise = async () => {
        // Check permission status
        const permission = await (await getLocationService()).getLocationPermissionStatus();
        dispatch({ type: 'SET_PERMISSION_STATUS', payload: permission });

        // Don't auto-fetch from server or GPS on initialization
        // Let LocationRegionSync set the default based on current region (Bangalore)
        // GPS/server location will only be fetched when user explicitly clicks "Use current location"
        dispatch({ type: 'SET_LOADING', payload: false });
      };
      
      // Race between initialization and timeout
      await Promise.race([initPromise(), timeoutPromise]);
      
    } catch (error) {
      // Set a default location if initialization fails - default to Bangalore
      const defaultLocation: UserLocation = {
        coordinates: {
          latitude: 12.9716,
          longitude: 77.5946,
        },
        address: {
          address: 'Bangalore, India',
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          pincode: '',
          formattedAddress: 'Bangalore, India',
        },
        lastUpdated: new Date(),
        source: 'gps' as const,
      };
      dispatch({ type: 'SET_CURRENT_LOCATION', payload: defaultLocation });
      dispatch({ type: 'SET_ERROR', payload: null });
    }
  };

  const updateLocation = useCallback(async (
    coordinates: LocationCoordinates,
    address?: string,
    source: 'manual' | 'gps' | 'ip' = 'gps',
    extraData?: { city?: string; state?: string; pincode?: string; neighbourhood?: string }
  ): Promise<void> => {
    // Optimistic update: create immediate location state
    const optimisticLocation: UserLocation = {
      coordinates,
      address: address ? {
        address: address,
        city: extraData?.city || '',
        state: extraData?.state || '',
        country: '',
        pincode: extraData?.pincode || '',
        formattedAddress: address,
        neighbourhood: extraData?.neighbourhood,
      } : {
        address: '',
        city: '',
        state: '',
        country: '',
        pincode: '',
        formattedAddress: '',
      },
      lastUpdated: new Date(),
      source,
    };

    const prevLocation = state.currentLocation;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      // Apply optimistic update immediately
      dispatch({ type: 'SET_CURRENT_LOCATION', payload: optimisticLocation });

      const userLocation = await (await getLocationService()).updateUserLocation(coordinates, address, source, extraData);
      // Merge neighbourhood from search results if the backend didn't return it
      if (extraData?.neighbourhood && userLocation.address && !userLocation.address.neighbourhood) {
        userLocation.address.neighbourhood = extraData.neighbourhood;
      }
      dispatch({ type: 'SET_CURRENT_LOCATION', payload: userLocation });
    } catch (error) {
      // Rollback on error
      dispatch({ type: 'SET_CURRENT_LOCATION', payload: prevLocation });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update location' });
      try {
        const ToastStore = await getToastStore();
        ToastStore?.getState()?.show?.('Failed to update location', 'error');
      } catch { /* silent */ }
      throw error;
    }
  }, [state.currentLocation]);

  // Set manual location - works for both authenticated and unauthenticated users
  // This caches locally and updates state without requiring server authentication
  const setManualLocation = useCallback(async (location: UserLocation): Promise<void> => {
    const prevLocation = state.currentLocation;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      // Apply optimistic update immediately
      dispatch({ type: 'SET_CURRENT_LOCATION', payload: location });

      // Cache the location locally
      await (await getLocationService()).cacheLocation(location);
    } catch (error) {
      // Rollback on error
      dispatch({ type: 'SET_CURRENT_LOCATION', payload: prevLocation });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to set location' });
      try {
        const ToastStore = await getToastStore();
        ToastStore?.getState()?.show?.('Failed to set location', 'error');
      } catch { /* silent */ }
      throw error;
    }
  }, [state.currentLocation]);

  const getCurrentLocation = useCallback(async (): Promise<UserLocation | null> => {
    const prevLocation = state.currentLocation;
    let optimisticLocation: UserLocation | null = null;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      if (Platform.OS === 'web') {
        // Use browser's Geolocation API for web
        const webLocation = await (await getWebLocationService()).getCurrentLocation();
        if (webLocation) {
          optimisticLocation = {
            coordinates: webLocation.coordinates,
            address: {
              address: webLocation.address.formattedAddress,
              city: webLocation.address.city || '',
              state: webLocation.address.state || '',
              country: webLocation.address.country || '',
              pincode: webLocation.address.postalCode || '',
              formattedAddress: webLocation.address.formattedAddress,
            },
            lastUpdated: new Date(),
            source: 'gps' as const,
          };

          // Apply optimistic update immediately
          dispatch({ type: 'SET_CURRENT_LOCATION', payload: optimisticLocation });

          // Cache and update state
          await (await getLocationService()).cacheLocation(optimisticLocation);

          return optimisticLocation;
        }
        dispatch({ type: 'SET_ERROR', payload: 'Failed to get location' });
        return null;
      }

      // Mobile: use expo-location
      const permission = await (await getLocationService()).getLocationPermissionStatus();
      if (permission.status !== 'granted') {
        dispatch({ type: 'SET_ERROR', payload: 'Location permission not granted' });
        return null;
      }

      const coordinates = await (await getLocationService()).getCurrentLocation();

      // Create optimistic location with coordinates only
      optimisticLocation = {
        coordinates,
        address: {
          address: '',
          city: '',
          state: '',
          country: '',
          pincode: '',
          formattedAddress: '',
        },
        lastUpdated: new Date(),
        source: 'gps' as const,
      };

      // Apply optimistic update immediately
      dispatch({ type: 'SET_CURRENT_LOCATION', payload: optimisticLocation });

      const userLocation = await (await getLocationService()).updateUserLocation(coordinates, undefined, 'gps');
      dispatch({ type: 'SET_CURRENT_LOCATION', payload: userLocation });

      return userLocation;
    } catch (error) {
      // Rollback on error
      if (prevLocation) {
        dispatch({ type: 'SET_CURRENT_LOCATION', payload: prevLocation });
      }
      dispatch({ type: 'SET_ERROR', payload: 'Failed to get current location' });
      try {
        const ToastStore = await getToastStore();
        ToastStore?.getState()?.show?.('Failed to get current location', 'error');
      } catch { /* silent */ }
      return null;
    }
  }, [state.currentLocation]);

  const getLocationHistory = useCallback(async (): Promise<LocationHistoryEntry[]> => {
    try {
      const history = await (await getLocationService()).getLocationHistory();
      dispatch({ type: 'SET_LOCATION_HISTORY', payload: history });
      return history;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to get location history' });
      return [];
    }
  }, []);

  const clearLocationHistory = useCallback(async (): Promise<void> => {
    try {
      // This would need to be implemented in the backend
      dispatch({ type: 'SET_LOCATION_HISTORY', payload: [] });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to clear location history' });
    }
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const permission = await (await getLocationService()).requestLocationPermission();
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: permission });
      
      if (permission.status === 'granted') {
        // Try to get current location after permission is granted
        try {
          const coordinates = await (await getLocationService()).getCurrentLocation();
          // Try to get address from coordinates using geocoding
          const geocodedLocation = await (await getLocationService()).reverseGeocode(coordinates);
          // Create user location object
          const userLocation: UserLocation = {
            coordinates,
            address: geocodedLocation,
            lastUpdated: new Date(),
            source: 'gps' as const,
          };
          
          // Try to update on server if authenticated, otherwise just store locally
          try {
            await (await getLocationService()).updateUserLocation(coordinates, geocodedLocation.formattedAddress, 'gps');
          } catch (serverError) {
            // Store locally if server update fails
            await (await getLocationService()).cacheLocation(userLocation);
          }
          
          dispatch({ type: 'SET_CURRENT_LOCATION', payload: userLocation });
        } catch (locationError) {
          // Don't throw error here, permission was granted successfully
        }
      }
      
      return permission.status === 'granted';
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to request location permission' });
      return false;
    }
  }, []);

  const searchAddresses = useCallback(async (query: string): Promise<AddressSearchResult[]> => {
    try {
      return await (await getLocationService()).searchAddresses(query);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to search addresses' });
      return [];
    }
  }, []);

  const reverseGeocode = useCallback(async (coordinates: LocationCoordinates): Promise<LocationAddress> => {
    try {
      return await (await getLocationService()).reverseGeocode(coordinates);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to get address from coordinates' });
      throw error;
    }
  }, []);

  const validateAddress = useCallback(async (address: string): Promise<boolean> => {
    try {
      return await (await getLocationService()).validateAddress(address);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to validate address' });
      return false;
    }
  }, []);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Stable-ref pattern: prevent consumer re-renders when action identities change
  const locationActionsRef = useRef({
    updateLocation, setManualLocation, getCurrentLocation, getLocationHistory,
    clearLocationHistory, requestLocationPermission, searchAddresses, reverseGeocode,
    validateAddress, clearError,
  });
  locationActionsRef.current = {
    updateLocation, setManualLocation, getCurrentLocation, getLocationHistory,
    clearLocationHistory, requestLocationPermission, searchAddresses, reverseGeocode,
    validateAddress, clearError,
  };

  const stableLocationActions = useMemo(() => ({
    updateLocation: (...args: Parameters<typeof updateLocation>) => locationActionsRef.current.updateLocation(...args),
    setManualLocation: (...args: Parameters<typeof setManualLocation>) => locationActionsRef.current.setManualLocation(...args),
    getCurrentLocation: () => locationActionsRef.current.getCurrentLocation(),
    getLocationHistory: () => locationActionsRef.current.getLocationHistory(),
    clearLocationHistory: () => locationActionsRef.current.clearLocationHistory(),
    requestLocationPermission: () => locationActionsRef.current.requestLocationPermission(),
    searchAddresses: (...args: Parameters<typeof searchAddresses>) => locationActionsRef.current.searchAddresses(...args),
    reverseGeocode: (...args: Parameters<typeof reverseGeocode>) => locationActionsRef.current.reverseGeocode(...args),
    validateAddress: (...args: Parameters<typeof validateAddress>) => locationActionsRef.current.validateAddress(...args),
    clearError: () => locationActionsRef.current.clearError(),
  }), [state.currentLocation]);

  const contextValue: LocationContextType = useMemo(() => ({
    state,
    ...stableLocationActions,
  }), [state, stableLocationActions]);

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

// Lazy import to avoid circular deps
let __useLocationStore: () => any;
try {
  const { useLocationStore } = require('@/stores/locationStore');
  __useLocationStore = useLocationStore;
} catch {
  __useLocationStore = () => ({
    state: initialState,
    updateLocation: async () => {},
    setManualLocation: async () => {},
    getCurrentLocation: async () => null,
    getLocationHistory: async () => [],
    clearLocationHistory: async () => {},
    requestLocationPermission: async () => false,
    searchAddresses: async () => [],
    reverseGeocode: async () => { throw new Error('Not available'); },
    validateAddress: async () => false,
    clearError: () => {},
  });
}

// Custom hook to use location context
// Now backed by Zustand store -- works with or without LocationProvider in tree.
export function useLocation(): LocationContextType {
  const context = useContext(LocationContext);
  const store = __useLocationStore();
  if (context) return context;
  return store as unknown as LocationContextType;
}

// Custom hook for location permission
export function useLocationPermission() {
  const { state, requestLocationPermission } = useLocation();
  
  return {
    permissionStatus: state.permissionStatus,
    isLocationEnabled: state.isLocationEnabled,
    requestPermission: requestLocationPermission,
  };
}

// Custom hook for current location
export function useCurrentLocation() {
  const { state, getCurrentLocation, updateLocation } = useLocation();
  
  return {
    currentLocation: state.currentLocation,
    isLoading: state.isLoading,
    error: state.error,
    getCurrentLocation,
    updateLocation,
  };
}

// Custom hook for location history
export function useLocationHistory() {
  const { state, getLocationHistory, clearLocationHistory } = useLocation();
  
  return {
    locationHistory: state.locationHistory,
    isLoading: state.isLoading,
    error: state.error,
    getLocationHistory,
    clearLocationHistory,
  };
}
