// Location types and interfaces

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationAddress {
  address: string;
  neighbourhood?: string; // BTM Layout, HSR Layout, Koramangala, etc.
  city: string;
  state: string;
  country: string;
  pincode?: string;
  formattedAddress: string;
}

export interface UserLocation {
  coordinates: LocationCoordinates;
  address: LocationAddress;
  timezone?: string;
  lastUpdated: Date;
  source: 'manual' | 'gps' | 'ip';
}

export interface LocationHistoryEntry {
  coordinates: LocationCoordinates;
  address: string;
  city?: string;
  timestamp: Date;
  source: 'manual' | 'gps' | 'ip';
}

export interface LocationState {
  currentLocation: UserLocation | null;
  locationHistory: LocationHistoryEntry[];
  isLoading: boolean;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined' | 'restricted';
  isLocationEnabled: boolean;
}

export interface LocationContextType {
  state: LocationState;
  updateLocation: (coordinates: LocationCoordinates, address?: string, source?: 'manual' | 'gps' | 'ip', extraData?: { city?: string; state?: string; pincode?: string; neighbourhood?: string }) => Promise<void>;
  setManualLocation: (location: UserLocation) => Promise<void>;
  getCurrentLocation: () => Promise<UserLocation | null>;
  getLocationHistory: () => Promise<LocationHistoryEntry[]>;
  clearLocationHistory: () => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
  searchAddresses: (query: string) => Promise<AddressSearchResult[]>;
  reverseGeocode: (coordinates: LocationCoordinates) => Promise<LocationAddress>;
  validateAddress: (address: string) => Promise<boolean>;
  clearError: () => void;
}

export interface AddressSearchResult {
  address: string;
  coordinates: LocationCoordinates;
  formattedAddress: string;
  placeId?: string;
  neighbourhood?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface GeocodeResult {
  address: string;
  city: string;
  state: string;
  country: string;
  pincode?: string;
  coordinates: LocationCoordinates;
  timezone?: string;
  formattedAddress: string;
}

export interface LocationStats {
  totalLocations: number;
  uniqueCities: number;
  mostVisitedCity: string;
  lastUpdated: Date | null;
  currentLocation: {
    city: string;
    state: string;
    coordinates: LocationCoordinates;
  } | null;
}

export interface LocationPreferences {
  autoUpdate: boolean;
  updateInterval: number; // in milliseconds
  shareLocation: boolean;
  backgroundUpdates: boolean;
}

export interface NearbyStore {
  id: string;
  name: string;
  address: string;
  coordinates: LocationCoordinates;
  distance: number; // in kilometers
  rating: number;
  isOpen: boolean;
  categories: string[];
}

export interface LocationError {
  code: string;
  message: string;
  details?: any;
}

// Location permission types
export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';

export interface LocationPermissionResult {
  status: LocationPermissionStatus;
  canAskAgain: boolean;
  message?: string;
}

// Location update options
export interface LocationUpdateOptions {
  accuracy?: 'lowest' | 'low' | 'balanced' | 'high' | 'highest';
  timeout?: number;
  maximumAge?: number;
  enableHighAccuracy?: boolean;
}

// Location service configuration
export interface LocationServiceConfig {
  apiBaseUrl: string;
  geocodingApiUrl: string;
  storesApiUrl: string;
  defaultLocation: LocationCoordinates;
  defaultLocationName: string;
  enableBackgroundLocation: boolean;
  locationUpdateInterval: number;
  maxLocationAge: number;
}
