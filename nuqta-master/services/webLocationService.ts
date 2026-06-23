// Web-specific location service using browser Geolocation API
// Geocoding is routed through the backend proxy (/location/geocode, /location/search)
// to avoid exposing API keys in the client bundle / APK.
import { Platform } from 'react-native';
import apiClient from './apiClient';

interface WebLocationCoordinates {
  latitude: number;
  longitude: number;
}

interface WebLocationAddress {
  formattedAddress: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface WebLocationResult {
  coordinates: WebLocationCoordinates;
  address: WebLocationAddress;
  timestamp: number;
}

class WebLocationService {
  /**
   * Request location permission using browser's geolocation API
   */
  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS !== 'web') {
      return false;
    }

    if (!navigator.geolocation) {
      return false;
    }

    try {
      // Test permission by attempting to get position
      await this.getBrowserLocation();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current location using browser's geolocation API
   */
  private getBrowserLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  }

  /**
   * Reverse geocode coordinates via the backend proxy (POST /location/geocode).
   * The backend calls Google Maps / OpenCage server-side so the API key
   * never leaves the server.
   */
  private async reverseGeocode(lat: number, lng: number): Promise<WebLocationAddress> {
    const response = await apiClient.post<{
      formattedAddress: string;
      city: string;
      state: string;
      country: string;
      pincode?: string;
      address: string;
      coordinates: [number, number];
    }>('/location/geocode', { latitude: lat, longitude: lng });

    if (!response.success || !response.data) {
      throw new Error('Backend geocoding failed');
    }

    const data = response.data;

    return {
      formattedAddress: data.formattedAddress || data.address || '',
      city: data.city || '',
      state: data.state || '',
      country: data.country || '',
      postalCode: data.pincode || '',
    };
  }

  /**
   * Get current location with address
   */
  async getCurrentLocation(): Promise<WebLocationResult | null> {
    if (Platform.OS !== 'web') {
      return null;
    }

    try {
      // Get coordinates from browser
      const position = await this.getBrowserLocation();
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      let address: WebLocationAddress;

      try {
        // Reverse-geocode via backend proxy
        address = await this.reverseGeocode(coords.latitude, coords.longitude);
      } catch (geocodingError: any) {

        // Fallback: Create a reasonable location name based on coordinates
        const { city, region } = this.getLocationFromCoordinates(coords.latitude, coords.longitude);
        address = {
          formattedAddress: `${city}, ${region}`,
          city,
          state: region,
          country: 'India', // Most likely based on your app context
        };
      }

      const result: WebLocationResult = {
        coordinates: coords,
        address,
        timestamp: Date.now(),
      };

      return result;

    } catch (error) {
      return null;
    }
  }

  /**
   * Approximate location based on coordinates (fallback when geocoding fails)
   */
  private getLocationFromCoordinates(lat: number, lng: number): { city: string; region: string } {
    // India coordinate ranges (approximate)
    const indiaRegions = [
      // Bangalore area
      { minLat: 12.8, maxLat: 13.2, minLng: 77.4, maxLng: 77.8, city: 'Bangalore', region: 'Karnataka' },
      // Mumbai area
      { minLat: 18.9, maxLat: 19.3, minLng: 72.7, maxLng: 73.1, city: 'Mumbai', region: 'Maharashtra' },
      // Delhi area
      { minLat: 28.4, maxLat: 28.9, minLng: 76.8, maxLng: 77.3, city: 'New Delhi', region: 'Delhi' },
      // Chennai area
      { minLat: 12.9, maxLat: 13.2, minLng: 80.1, maxLng: 80.3, city: 'Chennai', region: 'Tamil Nadu' },
      // Hyderabad area
      { minLat: 17.3, maxLat: 17.5, minLng: 78.3, maxLng: 78.6, city: 'Hyderabad', region: 'Telangana' },
      // Pune area
      { minLat: 18.4, maxLat: 18.6, minLng: 73.7, maxLng: 73.9, city: 'Pune', region: 'Maharashtra' },
    ];

    // Find matching region
    const matchedRegion = indiaRegions.find(region =>
      lat >= region.minLat && lat <= region.maxLat &&
      lng >= region.minLng && lng <= region.maxLng
    );

    if (matchedRegion) {
      return { city: matchedRegion.city, region: matchedRegion.region };
    }

    // Default fallback based on general India regions
    if (lat >= 12.0 && lat <= 15.0 && lng >= 77.0 && lng <= 78.0) {
      return { city: 'Bangalore Area', region: 'Karnataka' };
    }

    // Default fallback
    return { city: 'Your Location', region: 'India' };
  }

  /**
   * Check if location permission is granted
   */
  async checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (Platform.OS !== 'web' || !navigator.permissions) {
      return 'denied';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state as 'granted' | 'denied' | 'prompt';
    } catch (error) {
      return 'prompt';
    }
  }
}

// Create singleton instance
export const webLocationService = new WebLocationService();
export default webLocationService;
