// @ts-nocheck
import { create } from 'zustand';
import { Platform } from 'react-native';
import {
  LocationState,
  LocationContextType,
  LocationCoordinates,
  UserLocation,
  LocationHistoryEntry,
  AddressSearchResult,
  LocationAddress,
} from '@/types/location.types';

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

const initialState: LocationState = {
  currentLocation: null,
  locationHistory: [],
  isLoading: false,
  error: null,
  permissionStatus: 'undetermined',
  isLocationEnabled: false,
};

interface LocationStoreState extends LocationContextType {}

export const useLocationStore = create<LocationStoreState>((set, get) => ({
  state: initialState,

  updateLocation: async (
    coordinates: LocationCoordinates,
    address?: string,
    source: 'manual' | 'gps' | 'ip' = 'gps',
    extraData?: { city?: string; state?: string; pincode?: string }
  ): Promise<void> => {
    try {
      set(s => ({ state: { ...s.state, isLoading: true, error: null } }));
      const userLocation = await (await getLocationService()).updateUserLocation(coordinates, address, source, extraData);
      set(s => ({ state: { ...s.state, currentLocation: userLocation, isLoading: false } }));
    } catch (_error) {
      set(s => ({ state: { ...s.state, error: 'Failed to update location', isLoading: false } }));
      throw _error;
    }
  },

  setManualLocation: async (location: UserLocation): Promise<void> => {
    try {
      set(s => ({ state: { ...s.state, isLoading: true, error: null } }));
      await (await getLocationService()).cacheLocation(location);
      set(s => ({ state: { ...s.state, currentLocation: location, isLoading: false } }));
    } catch (_error) {
      set(s => ({ state: { ...s.state, error: 'Failed to set location', isLoading: false } }));
      throw _error;
    }
  },

  getCurrentLocation: async (): Promise<UserLocation | null> => {
    try {
      set(s => ({ state: { ...s.state, isLoading: true, error: null } }));

      if (Platform.OS === 'web') {
        const webLocation = await (await getWebLocationService()).getCurrentLocation();
        if (webLocation) {
          const userLocation: UserLocation = {
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
          await (await getLocationService()).cacheLocation(userLocation);
          set(s => ({ state: { ...s.state, currentLocation: userLocation, isLoading: false } }));
          return userLocation;
        }
        set(s => ({ state: { ...s.state, error: 'Failed to get location', isLoading: false } }));
        return null;
      }

      // Mobile: use expo-location
      const locSvc = await getLocationService();
      const permission = await locSvc.getLocationPermissionStatus();
      if (permission.status !== 'granted') {
        set(s => ({ state: { ...s.state, error: 'Location permission not granted', isLoading: false } }));
        return null;
      }

      const coordinates = await locSvc.getCurrentLocation();
      const userLocation = await locSvc.updateUserLocation(coordinates, undefined, 'gps');
      set(s => ({ state: { ...s.state, currentLocation: userLocation, isLoading: false } }));
      return userLocation;
    } catch (_error) {
      set(s => ({ state: { ...s.state, error: 'Failed to get current location', isLoading: false } }));
      return null;
    }
  },

  getLocationHistory: async (): Promise<LocationHistoryEntry[]> => {
    try {
      const history = await (await getLocationService()).getLocationHistory();
      set(s => ({ state: { ...s.state, locationHistory: history } }));
      return history;
    } catch (_error) {
      set(s => ({ state: { ...s.state, error: 'Failed to get location history' } }));
      return [];
    }
  },

  clearLocationHistory: async (): Promise<void> => {
    set(s => ({ state: { ...s.state, locationHistory: [] } }));
  },

  requestLocationPermission: async (): Promise<boolean> => {
    try {
      set(s => ({ state: { ...s.state, isLoading: true, error: null } }));
      const locSvc = await getLocationService();
      const permission = await locSvc.requestLocationPermission();
      set(s => ({
        state: {
          ...s.state,
          permissionStatus: permission.status,
          isLocationEnabled: permission.status === 'granted',
        },
      }));

      if (permission.status === 'granted') {
        try {
          const coordinates = await locSvc.getCurrentLocation();
          const geocodedLocation = await locSvc.reverseGeocode(coordinates);
          const userLocation: UserLocation = {
            coordinates,
            address: geocodedLocation,
            lastUpdated: new Date(),
            source: 'gps' as const,
          };

          try {
            await locSvc.updateUserLocation(coordinates, geocodedLocation.formattedAddress, 'gps');
          } catch (_serverError) {
            await locSvc.cacheLocation(userLocation);
          }

          set(s => ({ state: { ...s.state, currentLocation: userLocation, isLoading: false } }));
        } catch (_locationError) {
          set(s => ({ state: { ...s.state, isLoading: false } }));
        }
      } else {
        set(s => ({ state: { ...s.state, isLoading: false } }));
      }

      return permission.status === 'granted';
    } catch (_error) {
      set(s => ({ state: { ...s.state, error: 'Failed to request location permission', isLoading: false } }));
      return false;
    }
  },

  searchAddresses: async (query: string): Promise<AddressSearchResult[]> => {
    try {
      return await (await getLocationService()).searchAddresses(query);
    } catch (_error) {
      set(s => ({ state: { ...s.state, error: 'Failed to search addresses' } }));
      return [];
    }
  },

  reverseGeocode: async (coordinates: LocationCoordinates): Promise<LocationAddress> => {
    try {
      return await (await getLocationService()).reverseGeocode(coordinates);
    } catch (_error) {
      set(s => ({ state: { ...s.state, error: 'Failed to get address from coordinates' } }));
      throw _error;
    }
  },

  validateAddress: async (address: string): Promise<boolean> => {
    try {
      return await (await getLocationService()).validateAddress(address);
    } catch (_error) {
      set(s => ({ state: { ...s.state, error: 'Failed to validate address' } }));
      return false;
    }
  },

  clearError: (): void => {
    set(s => ({ state: { ...s.state, error: null } }));
  },
}));
