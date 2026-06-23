import { logger } from '../config/logger';
import axios from 'axios';

// Geocoding service interfaces
export interface GeocodeResult {
  address: string;
  neighbourhood?: string; // BTM Layout, HSR Layout, Koramangala, etc.
  city: string;
  state: string;
  country: string;
  pincode?: string;
  coordinates: [number, number]; // [longitude, latitude]
  timezone?: string;
  formattedAddress: string;
}

export interface GeocodeRequest {
  latitude: number;
  longitude: number;
}

export interface SearchAddressRequest {
  query: string;
  limit?: number;
}

export interface AddressSearchResult {
  address: string;
  coordinates: [number, number];
  formattedAddress: string;
  placeId?: string;
  neighbourhood?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

class GeocodingService {
  private googleMapsApiKey: string;
  private openCageApiKey: string;
  private useGoogleMaps: boolean;

  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    this.openCageApiKey = process.env.OPENCAGE_API_KEY || '';
    // Use OpenCage as primary since Google Maps requires billing
    this.useGoogleMaps = false; // !!this.googleMapsApiKey;
  }

  /**
   * Reverse geocoding - Convert coordinates to address
   */
  async reverseGeocode(request: GeocodeRequest): Promise<GeocodeResult> {
    try {
      if (this.useGoogleMaps) {
        return await this.reverseGeocodeGoogle(request);
      } else {
        return await this.reverseGeocodeOpenCage(request);
      }
    } catch (error) {
      logger.error('Geocoding error:', error);
      throw new Error('Failed to get address from coordinates');
    }
  }

  /**
   * Google Maps reverse geocoding
   */
  private async reverseGeocodeGoogle(request: GeocodeRequest): Promise<GeocodeResult> {
    const { latitude, longitude } = request;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.googleMapsApiKey}`;
    
    const response = await axios.get(url);
    const data = response.data;
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error('No address found for coordinates');
    }

    const result = data.results[0];
    const addressComponents = result.address_components;
    
    // Extract address components
    let neighbourhood = '';
    let city = '';
    let state = '';
    let country = '';
    let pincode = '';

    addressComponents.forEach((component: any) => {
      const types = component.types;
      // Neighbourhood/area (most specific — BTM Layout, HSR Layout, etc.)
      if (types.includes('sublocality_level_1') || types.includes('sublocality') || types.includes('neighborhood')) {
        if (!neighbourhood) neighbourhood = component.long_name; // first match wins
      } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      } else if (types.includes('country')) {
        country = component.long_name;
      } else if (types.includes('postal_code')) {
        pincode = component.long_name;
      }
    });

    return {
      address: result.formatted_address,
      neighbourhood: neighbourhood || undefined,
      city: city || 'Unknown',
      state: state || 'Unknown',
      country: country || 'Unknown',
      pincode: pincode || undefined,
      coordinates: [longitude, latitude],
      formattedAddress: result.formatted_address,
    };
  }

  /**
   * OpenCage reverse geocoding (fallback)
   */
  private async reverseGeocodeOpenCage(request: GeocodeRequest): Promise<GeocodeResult> {
    const { latitude, longitude } = request;
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${this.openCageApiKey}&limit=1`;
    
    const response = await axios.get(url);
    const data = response.data;

    if (data.status.code !== 200 || !data.results || data.results.length === 0) {
      throw new Error('No address found for coordinates');
    }

    const result = data.results[0];
    const components = result.components;

    // Extract city - OpenCage uses different fields for different places
    const city = components.city
      || components.town
      || components.village
      || components.county
      || components.state_district
      || components.suburb
      || components.locality
      || components._normalized_city
      || 'Unknown';

    // OpenCage neighbourhood: neighbourhood > suburb > quarter
    const neighbourhood = components.neighbourhood
      || components.suburb
      || components.quarter
      || components.residential
      || undefined;

    return {
      address: result.formatted,
      neighbourhood,
      city: city,
      state: components.state || components.province || 'Unknown',
      country: components.country || 'Unknown',
      pincode: components.postcode || undefined,
      coordinates: [longitude, latitude],
      formattedAddress: result.formatted,
    };
  }

  /**
   * Search addresses by query
   */
  async searchAddresses(request: SearchAddressRequest): Promise<AddressSearchResult[]> {
    try {
      if (this.useGoogleMaps) {
        return await this.searchAddressesGoogle(request);
      } else {
        return await this.searchAddressesOpenCage(request);
      }
    } catch (error) {
      logger.error('Address search error:', error);
      throw new Error('Failed to search addresses');
    }
  }

  /**
   * Google Places API address search
   */
  private async searchAddressesGoogle(request: SearchAddressRequest): Promise<AddressSearchResult[]> {
    const { query, limit = 5 } = request;
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&key=${this.googleMapsApiKey}`;
    
    const response = await axios.get(url);
    const data = response.data;

    if (data.status !== 'OK' || !data.predictions) {
      return [];
    }

    const results: AddressSearchResult[] = [];
    
    for (const prediction of data.predictions.slice(0, limit)) {
      try {
        // Get place details for coordinates
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${this.googleMapsApiKey}`;
        const detailsResponse = await axios.get(detailsUrl);
        const detailsData = detailsResponse.data;

        if (detailsData.status === 'OK' && detailsData.result.geometry) {
          const location = detailsData.result.geometry.location;
          results.push({
            address: prediction.description,
            coordinates: [location.lng, location.lat],
            formattedAddress: detailsData.result.formatted_address,
            placeId: prediction.place_id,
          });
        }
      } catch (error) {
        logger.error('Error getting place details:', error);
      }
    }

    return results;
  }

  /**
   * OpenCage address search
   */
  private async searchAddressesOpenCage(request: SearchAddressRequest): Promise<AddressSearchResult[]> {
    const { query, limit = 5 } = request;
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${this.openCageApiKey}&limit=${limit}`;

    const response = await axios.get(url);
    const data = response.data;

    if (data.status.code !== 200 || !data.results) {
      return [];
    }

    return data.results.map((result: any) => {
      const components = result.components || {};

      // Extract city - OpenCage uses different fields for different places
      const city = components.city
        || components.town
        || components.village
        || components.county
        || components.state_district
        || components.suburb
        || components.locality
        || components._normalized_city
        || '';

      // Extract neighbourhood from search result
      const neighbourhood = components.neighbourhood
        || components.suburb
        || components.quarter
        || components.residential
        || undefined;

      return {
        address: result.formatted,
        coordinates: [result.geometry.lng, result.geometry.lat],
        formattedAddress: result.formatted,
        neighbourhood,
        city: city,
        state: components.state || components.province || '',
        country: components.country || 'India',
        pincode: components.postcode || '',
      };
    });
  }

  /**
   * Get timezone for coordinates
   */
  async getTimezone(latitude: number, longitude: number): Promise<string> {
    try {
      if (this.useGoogleMaps) {
        return await this.getTimezoneGoogle(latitude, longitude);
      } else {
        // Fallback to a simple timezone estimation
        return this.estimateTimezone(longitude);
      }
    } catch (error) {
      logger.error('Timezone error:', error);
      return this.estimateTimezone(longitude);
    }
  }

  /**
   * Google Maps timezone API
   */
  private async getTimezoneGoogle(latitude: number, longitude: number): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${latitude},${longitude}&timestamp=${timestamp}&key=${this.googleMapsApiKey}`;
    
    const response = await axios.get(url);
    const data = response.data;

    if (data.status === 'OK') {
      return data.timeZoneId;
    }

    return this.estimateTimezone(longitude);
  }

  /**
   * Simple timezone estimation based on longitude
   */
  private estimateTimezone(longitude: number): string {
    // Simple timezone estimation for India
    if (longitude >= 68 && longitude <= 97) {
      return 'Asia/Kolkata';
    }
    
    // Default to UTC
    return 'UTC';
  }

  /**
   * Validate if coordinates are valid
   */
  validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      !isNaN(latitude) && !isNaN(longitude)
    );
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const geocodingService = new GeocodingService();
