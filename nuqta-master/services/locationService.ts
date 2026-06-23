import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import {
  LocationCoordinates,
  LocationAddress,
  UserLocation,
  LocationHistoryEntry,
  AddressSearchResult,
  GeocodeResult,
  LocationStats,
  LocationPermissionResult,
  LocationUpdateOptions,
  LocationServiceConfig,
} from '@/types/location.types';

// Storage keys
const STORAGE_KEYS = {
  CURRENT_LOCATION: 'current_location',
  LOCATION_HISTORY: 'location_history',
  LOCATION_PERMISSION: 'location_permission',
  LOCATION_PREFERENCES: 'location_preferences',
};

// Default configuration
const DEFAULT_CONFIG: LocationServiceConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_LOCATION_API_URL || `${apiClient.getBaseURL()}/location`,
  geocodingApiUrl: process.env.EXPO_PUBLIC_GEOCODING_API_URL || `${apiClient.getBaseURL()}/location/geocode`,
  storesApiUrl: process.env.EXPO_PUBLIC_STORES_API_URL || `${apiClient.getBaseURL()}/stores`,
  defaultLocation: {
    latitude: parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LOCATION_LAT || '12.9716'),
    longitude: parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LOCATION_LNG || '77.5946'),
  },
  defaultLocationName: process.env.EXPO_PUBLIC_DEFAULT_LOCATION_NAME || 'Bangalore, India',
  enableBackgroundLocation: process.env.EXPO_PUBLIC_ENABLE_BACKGROUND_LOCATION === 'true',
  locationUpdateInterval: parseInt(process.env.EXPO_PUBLIC_LOCATION_UPDATE_INTERVAL || '300000'),
  maxLocationAge: parseInt(process.env.EXPO_PUBLIC_MAX_LOCATION_AGE || '3600000'),
};

class LocationService {
  private config: LocationServiceConfig;
  private apiClient: any;

  constructor(config?: Partial<LocationServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Use the main API client that has authentication
    this.apiClient = apiClient;
  }

  /**
   * Request location permission
   */
  async requestLocationPermission(): Promise<LocationPermissionResult> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      const result: LocationPermissionResult = {
        status: status as any,
        canAskAgain: status !== 'denied',
      };

      // Save permission status
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PERMISSION, JSON.stringify(result));
      
      return result;
    } catch (error) {
      return {
        status: 'denied',
        canAskAgain: false,
        message: 'Failed to request location permission',
      };
    }
  }

  /**
   * Get current location permission status
   */
  async getLocationPermissionStatus(): Promise<LocationPermissionResult> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
        return {
        status: status as any,
        canAskAgain: status !== 'denied',
      };
    } catch (error) {
      return {
        status: 'undetermined',
        canAskAgain: true,
      };
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(options?: LocationUpdateOptions): Promise<LocationCoordinates> {
    try {
      const permission = await this.getLocationPermissionStatus();
      if (permission.status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const locationOptions: Location.LocationOptions = {
        accuracy: this.mapAccuracy(options?.accuracy || 'balanced'),
      };

      const location = await Location.getCurrentPositionAsync(locationOptions);
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      throw new Error('Failed to get current location');
    }
  }

  /**
   * Update user location on server
   */
  async updateUserLocation(
    coordinates: LocationCoordinates,
    address?: string,
    source: 'manual' | 'gps' | 'ip' = 'gps',
    extraData?: { city?: string; state?: string; pincode?: string }
  ): Promise<UserLocation> {
    try {
      const response = await this.apiClient.post('/location/update', {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        address,
        source,
        city: extraData?.city,
        state: extraData?.state,
        pincode: extraData?.pincode,
      });

      // apiClient already unwraps responseData.data, so response.data is the backend's data field
      const locationData = response.data?.location || response.data;

      if (!locationData) {
        throw new Error('No location data in response');
      }

      // Handle different coordinate formats
      let lat = coordinates.latitude;
      let lng = coordinates.longitude;
      if (locationData.coordinates) {
        if (Array.isArray(locationData.coordinates)) {
          lat = locationData.coordinates[1];
          lng = locationData.coordinates[0];
        } else if (locationData.coordinates.latitude !== undefined) {
          lat = locationData.coordinates.latitude;
          lng = locationData.coordinates.longitude;
        }
      } else if (locationData.latitude !== undefined) {
        lat = locationData.latitude;
        lng = locationData.longitude;
      }

      // Extract city/state from address if not provided
      const fullAddress = locationData.address || address || '';
      let city = locationData.city || '';
      let state = locationData.state || '';

      // Try to extract city/state from formatted address if empty
      if (!city || !state) {
        const addressParts = fullAddress.split(',').map((p: string) => p.trim());
        if (addressParts.length >= 2) {
          // Usually format is "City, State, Country" or "Area, City, State, Country"
          if (!city && addressParts.length >= 1) {
            // Find city name (first non-pincode, non-country part)
            for (const part of addressParts) {
              if (part && !part.match(/^\d{6}$/) && part !== 'India') {
                city = part.replace(/\s*-?\s*\d{6}\s*/, '').trim();
                break;
              }
            }
          }
          if (!state && addressParts.length >= 2) {
            // State is usually second to last (before country)
            const stateCandidate = addressParts[addressParts.length - 2];
            if (stateCandidate && stateCandidate !== 'India') {
              state = stateCandidate.replace(/\s*-?\s*\d{6}\s*/, '').trim();
            }
          }
        }
      }

      const userLocation: UserLocation = {
        coordinates: {
          latitude: lat,
          longitude: lng,
        },
        address: {
          address: fullAddress,
          city: city,
          state: state,
          country: locationData.country || 'India',
          pincode: locationData.pincode || '',
          formattedAddress: locationData.formattedAddress || fullAddress,
        },
        timezone: locationData.timezone,
        lastUpdated: new Date(),
        source,
      };

      // Save to local storage
      await this.saveCurrentLocation(userLocation);

      return userLocation;
    } catch (error) {
      throw new Error('Failed to update location');
    }
  }

  /**
   * Get current user location from server
   */
  async getCurrentUserLocation(): Promise<UserLocation | null> {

    try {
      const response = await this.apiClient.get('/location/current');

      // apiClient already unwraps responseData.data, so response.data is the backend's data field
      const locationData = response?.data?.location || response?.data;
      
      if (!locationData || !locationData.coordinates) {
        return null;
      }
      
      // Handle both array and object coordinate formats
      const lat = Array.isArray(locationData.coordinates) 
        ? locationData.coordinates[1] 
        : locationData.coordinates.latitude;
      const lng = Array.isArray(locationData.coordinates) 
        ? locationData.coordinates[0] 
        : locationData.coordinates.longitude;
      
      return {
        coordinates: {
          latitude: lat,
          longitude: lng,
        },
        address: {
          address: locationData.address || '',
          city: locationData.city || '',
          state: locationData.state || '',
          country: 'India',
          pincode: locationData.pincode || '',
          formattedAddress: locationData.address || '',
        },
        timezone: locationData.timezone,
        lastUpdated: new Date(),
        source: 'gps',
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get location history
   */
  async getLocationHistory(page: number = 1, limit: number = 10): Promise<LocationHistoryEntry[]> {
    try {
      const response = await this.apiClient.get('/location/history', { page, limit });
      
      return (response.data?.history || []).map((entry: any) => ({
        coordinates: {
          latitude: entry.coordinates[1],
          longitude: entry.coordinates[0],
        },
        address: entry.address,
        city: entry.city,
        timestamp: new Date(entry.timestamp),
        source: entry.source,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Reverse geocoding - Convert coordinates to address
   */
  async reverseGeocode(coordinates: LocationCoordinates): Promise<LocationAddress> {
    try {
      const response = await this.apiClient.post('/location/geocode', {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      
      const data = response.data;
        return {
        address: data?.formattedAddress || '',
        neighbourhood: data?.neighbourhood || undefined,
        city: data?.city || '',
        state: data?.state || '',
        country: data?.country || '',
        pincode: data?.pincode || '',
        formattedAddress: data?.formattedAddress || '',
      };
    } catch (error) {
      throw new Error('Failed to get address from coordinates');
    }
  }

  /**
   * Search addresses
   */
  async searchAddresses(query: string, limit: number = 5): Promise<AddressSearchResult[]> {
    try {
      const response = await this.apiClient.post('/location/search', {
        query,
        limit,
      });

      // apiClient already unwraps responseData.data, so response.data is the backend's data field
      const results = response.data?.results || [];

      if (!Array.isArray(results)) {
        return [];
      }

      return results.map((result: any) => ({
        address: result.address || result.formattedAddress || '',
        coordinates: {
          latitude: Array.isArray(result.coordinates) ? result.coordinates[1] : result.coordinates?.latitude || 0,
          longitude: Array.isArray(result.coordinates) ? result.coordinates[0] : result.coordinates?.longitude || 0,
        },
        formattedAddress: result.formattedAddress || result.address || '',
        placeId: result.placeId,
        city: result.city || '',
        state: result.state || '',
        country: result.country || 'India',
        pincode: result.pincode || '',
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Validate address
   */
  async validateAddress(address: string): Promise<boolean> {
    try {
      const response = await this.apiClient.post('/location/validate', { address });
      return response.data?.isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get timezone for coordinates
   */
  async getTimezone(coordinates: LocationCoordinates): Promise<string> {
    try {
      const response = await this.apiClient.get('/location/timezone', {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      
      return response.data?.timezone;
    } catch (error) {
      return 'Asia/Kolkata'; // Default timezone
    }
  }

  /**
   * Get nearby stores
   */
  async getNearbyStores(
    coordinates: LocationCoordinates,
    radius: number = 5,
    limit: number = 20
  ): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/nearby-stores', {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radius,
        limit,
      });
      
      return response.data?.stores || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get location statistics
   */
  async getLocationStats(): Promise<LocationStats> {
    try {
      const response = await this.apiClient.get('/stats');
      const data = response.data?.stats;
      
      return {
        totalLocations: data.totalLocations,
        uniqueCities: data.uniqueCities,
        mostVisitedCity: data.mostVisitedCity,
        lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : null,
        currentLocation: data.currentLocation ? {
          city: data.currentLocation.city,
          state: data.currentLocation.state,
          coordinates: {
            latitude: data.currentLocation.coordinates[1],
            longitude: data.currentLocation.coordinates[0],
          },
        } : null,
      };
    } catch (error) {
      throw new Error('Failed to get location statistics');
    }
  }

  /**
   * Save current location to local storage
   */
  private async saveCurrentLocation(location: UserLocation): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_LOCATION, JSON.stringify(location));
    } catch (error) {
      // Silently handle storage errors
    }
  }

  /**
   * Get current location from local storage
   */
  async getCachedLocation(): Promise<UserLocation | null> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_LOCATION);
      if (cached) {
        const location = JSON.parse(cached);
        location.lastUpdated = new Date(location.lastUpdated);
        return location;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear location data
   */
  async clearLocationData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CURRENT_LOCATION,
        STORAGE_KEYS.LOCATION_HISTORY,
        STORAGE_KEYS.LOCATION_PERMISSION,
      ]);
    } catch (error) {
      // Silently handle storage errors
    }
  }

  /**
   * Map accuracy string to Location.Accuracy
   */
  private mapAccuracy(accuracy: string): Location.Accuracy {
    switch (accuracy) {
      case 'lowest':
        return Location.Accuracy.Lowest;
      case 'low':
        return Location.Accuracy.Low;
      case 'balanced':
        return Location.Accuracy.Balanced;
      case 'high':
        return Location.Accuracy.High;
      case 'highest':
        return Location.Accuracy.Highest;
      default:
        return Location.Accuracy.Balanced;
    }
  }

  /**
   * Check if location is fresh (not too old)
   */
  isLocationFresh(location: UserLocation): boolean {
    const now = new Date();
    const age = now.getTime() - location.lastUpdated.getTime();
    return age < this.config.maxLocationAge;
  }

  /**
   * Get default location
   */
  getDefaultLocation(): UserLocation {
    return {
      coordinates: this.config.defaultLocation,
      address: {
        address: this.config.defaultLocationName,
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        formattedAddress: this.config.defaultLocationName,
      },
      timezone: 'Asia/Kolkata',
      lastUpdated: new Date(),
      source: 'manual',
    };
  }

  /**
   * Cache location locally
   */
  async cacheLocation(location: UserLocation): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_LOCATION, JSON.stringify(location));
    } catch (error) {
      // Silently handle storage errors
    }
  }
}

export const locationService = new LocationService();