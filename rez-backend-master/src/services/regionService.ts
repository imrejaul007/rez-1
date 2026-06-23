import { logger } from '../config/logger';
/**
 * Region Service
 * Handles region detection, filtering, and validation for multi-region support
 */

import { Request } from 'express';
import axios from 'axios';
import {
  RegionId,
  RegionConfig,
  REGIONS,
  DEFAULT_REGION,
  getRegionFromCity,
  getRegionFromCountry,
  getRegionConfig,
  getActiveRegions,
  isValidRegion,
  getRegionFromCoordinates
} from '../config/regions';

// IP Geolocation response interface
interface IPGeolocationResponse {
  status: string;
  city?: string;
  country?: string;
  countryCode?: string;
  regionName?: string;
  lat?: number;
  lon?: number;
}

class RegionService {
  private ipApiBaseUrl = 'http://ip-api.com/json';
  private ipApiTimeout = 3000; // 3 seconds timeout

  /**
   * Get MongoDB query filter for stores in a specific region
   * Uses location.city to filter stores
   */
  getStoreFilter(regionId: RegionId): Record<string, any> {
    const config = REGIONS[regionId];
    if (!config) {
      return {};
    }

    // Create case-insensitive regex patterns for each city
    const cityPatterns = config.cities.map(city => new RegExp(`^${city}$`, 'i'));

    return {
      'location.city': {
        $in: cityPatterns
      }
    };
  }

  /**
   * Get MongoDB query filter using $or for better index usage
   * Alternative filter method if the regex approach has performance issues
   */
  getStoreFilterOptimized(regionId: RegionId): Record<string, any> {
    const config = REGIONS[regionId];
    if (!config) {
      return {};
    }

    // Create $or conditions for each city (case-insensitive)
    const cityConditions = config.cities.map(city => ({
      'location.city': { $regex: new RegExp(`^${city}$`, 'i') }
    }));

    return {
      $or: cityConditions
    };
  }

  /**
   * Get MongoDB query filter for events based on region
   * Filters events by location.city matching region's cities
   * Online events are always included regardless of region
   */
  getEventFilter(regionId: RegionId): Record<string, any> {
    const config = REGIONS[regionId];
    if (!config) {
      return {};
    }

    // Create case-insensitive regex patterns for each city
    const cityPatterns = config.cities.map(city => new RegExp(`^${city}$`, 'i'));

    // Include both: region-specific events AND online events (visible to everyone)
    return {
      $or: [
        { 'location.city': { $in: cityPatterns } },
        { isOnline: true },
        { 'location.isOnline': true },
        { 'location.city': { $regex: /^online$/i } }
      ]
    };
  }

  /**
   * Detect region from Express request
   * Priority: header > user preference > IP > coordinates > default
   */
  async detectRegionFromRequest(req: Request): Promise<RegionId> {
    // 1. Check explicit region header
    const regionHeader = req.headers['x-rez-region'] as string;
    if (regionHeader && isValidRegion(regionHeader)) {
      return regionHeader;
    }

    // 2. Check user preferences (if authenticated)
    const user = (req as any).user;
    if (user?.preferences?.region && isValidRegion(user.preferences.region)) {
      return user.preferences.region;
    }

    // 3. Try IP-based detection
    try {
      const ip = this.getClientIP(req);
      if (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
        const region = await this.detectRegionFromIP(ip);
        if (region) {
          return region;
        }
      }
    } catch (error) {
      logger.warn('IP-based region detection failed:', error);
    }

    // 4. Try coordinates from query params
    const { latitude, longitude, lat, lng } = req.query;
    const coordLat = parseFloat((latitude || lat) as string);
    const coordLng = parseFloat((longitude || lng) as string);

    if (!isNaN(coordLat) && !isNaN(coordLng)) {
      return getRegionFromCoordinates(coordLng, coordLat);
    }

    // 5. Default region
    return DEFAULT_REGION;
  }

  /**
   * Get client IP from request (handles proxies)
   */
  private getClientIP(req: Request): string | null {
    // Check various headers for the real IP
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (forwardedFor as string).split(',');
      return ips[0].trim();
    }

    const realIP = req.headers['x-real-ip'] as string;
    if (realIP) {
      return realIP.trim();
    }

    // Fallback to socket remote address
    return req.ip || req.socket?.remoteAddress || null;
  }

  /**
   * Detect region from IP address using free geo API
   */
  async detectRegionFromIP(ip: string): Promise<RegionId | null> {
    try {
      const response = await axios.get<IPGeolocationResponse>(
        `${this.ipApiBaseUrl}/${ip}?fields=status,city,country,countryCode,regionName,lat,lon`,
        { timeout: this.ipApiTimeout }
      );

      const data = response.data;

      if (data.status !== 'success') {
        return null;
      }

      // Try to match by city first
      if (data.city) {
        const regionByCity = getRegionFromCity(data.city);
        if (regionByCity !== DEFAULT_REGION || this.isCityInDefaultRegion(data.city)) {
          return regionByCity;
        }
      }

      // Then try by country
      if (data.country || data.countryCode) {
        const regionByCountry = getRegionFromCountry(data.country || data.countryCode || '');
        return regionByCountry;
      }

      // Finally try coordinates
      if (data.lat && data.lon) {
        return getRegionFromCoordinates(data.lon, data.lat);
      }

      return null;
    } catch (error) {
      logger.error('IP geolocation failed:', error);
      return null;
    }
  }

  /**
   * Check if a city belongs to the default region
   */
  private isCityInDefaultRegion(city: string): boolean {
    const defaultConfig = REGIONS[DEFAULT_REGION];
    return defaultConfig.cities.some(c => c.toLowerCase() === city.toLowerCase());
  }

  /**
   * Validate if a store belongs to a specific region
   */
  storeInRegion(storeCity: string | undefined, regionId: RegionId): boolean {
    if (!storeCity) {
      return false;
    }

    const config = REGIONS[regionId];
    if (!config) {
      return true; // No region config = allow all
    }

    return config.cities.some(
      city => city.toLowerCase() === storeCity.toLowerCase()
    );
  }

  /**
   * Get region config with public-safe fields
   */
  getPublicRegionConfig(regionId: RegionId): Partial<RegionConfig> {
    const config = getRegionConfig(regionId);
    return {
      id: config.id,
      name: config.name,
      displayName: config.displayName,
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      locale: config.locale,
      timezone: config.timezone,
      defaultCoordinates: config.defaultCoordinates,
      countryCode: config.countryCode
    };
  }

  /**
   * Get all available regions for selection
   */
  getAvailableRegions(): Array<Partial<RegionConfig>> {
    return getActiveRegions().map(config => ({
      id: config.id,
      name: config.name,
      displayName: config.displayName,
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      countryCode: config.countryCode
    }));
  }

  /**
   * Validate region access for a store
   * Returns true if access is allowed, false otherwise
   */
  validateStoreAccess(storeCity: string | undefined, userRegion: RegionId): boolean {
    return this.storeInRegion(storeCity, userRegion);
  }

  /**
   * Get region from store data
   */
  getRegionFromStore(storeCity: string | undefined): RegionId {
    if (!storeCity) {
      return DEFAULT_REGION;
    }
    return getRegionFromCity(storeCity);
  }

  /**
   * Check if cross-region access should be blocked
   */
  shouldBlockAccess(storeCity: string | undefined, userRegion: RegionId): boolean {
    if (!storeCity) {
      return false; // Can't determine, allow access
    }

    const storeRegion = getRegionFromCity(storeCity);
    return storeRegion !== userRegion;
  }

  /**
   * Get suggested region for a store that doesn't match user's region
   */
  getSuggestedRegion(storeCity: string | undefined): RegionId {
    return storeCity ? getRegionFromCity(storeCity) : DEFAULT_REGION;
  }
}

// Export singleton instance
export const regionService = new RegionService();
export default regionService;

// Re-export types and config functions for convenience
export {
  RegionId,
  RegionConfig,
  REGIONS,
  DEFAULT_REGION,
  getRegionFromCity,
  getRegionFromCountry,
  getRegionConfig,
  getActiveRegions,
  isValidRegion
};
