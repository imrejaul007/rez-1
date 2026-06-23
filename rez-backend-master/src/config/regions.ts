/**
 * Region Configuration
 * Defines regions, their cities, currencies, and related settings
 * Used for region-based store and product filtering
 */

export type RegionId = 'bangalore' | 'dubai';

export interface RegionConfig {
  id: RegionId;
  name: string;
  displayName: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  timezone: string;
  defaultCoordinates: [number, number]; // [longitude, latitude]
  cities: string[]; // Cities that belong to this region (case-insensitive matching)
  countries: string[]; // Countries that map to this region
  countryCode: string; // ISO country code
  deliveryRadius: number; // Default delivery radius in km
  isActive: boolean;
}

export const REGIONS: Record<RegionId, RegionConfig> = {
  bangalore: {
    id: 'bangalore',
    name: 'Bangalore',
    displayName: 'Bangalore, India',
    currency: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
    defaultCoordinates: [77.5946, 12.9716], // [lng, lat]
    cities: [
      'Bangalore',
      'Bengaluru',
      'Mysore',
      'Mysuru',
      'Mangalore',
      'Mangaluru',
      'Hubli',
      'Dharwad',
      'Belgaum',
      'Belagavi'
    ],
    countries: ['India', 'IN', 'IND'],
    countryCode: 'IN',
    deliveryRadius: 15,
    isActive: true
  },
  dubai: {
    id: 'dubai',
    name: 'Dubai',
    displayName: 'Dubai, UAE',
    currency: 'AED',
    currencySymbol: 'د.إ',
    locale: 'en-AE',
    timezone: 'Asia/Dubai',
    defaultCoordinates: [55.2708, 25.2048], // [lng, lat]
    cities: [
      'Dubai',
      'Abu Dhabi',
      'Sharjah',
      'Ajman',
      'Ras Al Khaimah',
      'Fujairah',
      'Umm Al Quwain',
      'Al Ain'
    ],
    countries: ['UAE', 'United Arab Emirates', 'AE', 'ARE'],
    countryCode: 'AE',
    deliveryRadius: 20,
    isActive: false
  }
};

export const DEFAULT_REGION: RegionId = 'bangalore';

/**
 * Get region from city name (case-insensitive)
 */
export function getRegionFromCity(city: string): RegionId {
  if (!city) return DEFAULT_REGION;

  const normalizedCity = city.toLowerCase().trim();

  for (const [regionId, config] of Object.entries(REGIONS)) {
    if (config.cities.some(c => c.toLowerCase() === normalizedCity)) {
      return regionId as RegionId;
    }
  }

  return DEFAULT_REGION;
}

/**
 * Get region from country name or code (case-insensitive)
 */
export function getRegionFromCountry(country: string): RegionId {
  if (!country) return DEFAULT_REGION;

  const normalizedCountry = country.toLowerCase().trim();

  for (const [regionId, config] of Object.entries(REGIONS)) {
    if (config.countries.some(c => c.toLowerCase() === normalizedCountry)) {
      return regionId as RegionId;
    }
  }

  return DEFAULT_REGION;
}

/**
 * Get region configuration by ID
 */
export function getRegionConfig(regionId: RegionId): RegionConfig {
  return REGIONS[regionId] || REGIONS[DEFAULT_REGION];
}

/**
 * Get all active regions
 */
export function getActiveRegions(): RegionConfig[] {
  return Object.values(REGIONS).filter(r => r.isActive);
}

/**
 * Check if a region ID is valid
 */
export function isValidRegion(regionId: string): regionId is RegionId {
  return regionId in REGIONS;
}

/**
 * Get region from coordinates (basic check based on longitude ranges)
 * This is a rough approximation - for precise detection, use IP geolocation
 */
export function getRegionFromCoordinates(lng: number, lat: number): RegionId {
  // UAE region (roughly 51-57 longitude, 22-27 latitude)
  if (lng >= 51 && lng <= 57 && lat >= 22 && lat <= 27) {
    return 'dubai';
  }

  // India/Bangalore region (roughly 68-97 longitude, 6-36 latitude)
  if (lng >= 68 && lng <= 97 && lat >= 6 && lat <= 36) {
    return 'bangalore';
  }

  return DEFAULT_REGION;
}

/**
 * Get currency symbol for a region
 */
export function getCurrencySymbol(regionId: RegionId): string {
  return REGIONS[regionId]?.currencySymbol || REGIONS[DEFAULT_REGION].currencySymbol;
}

/**
 * Get currency code for a region
 */
export function getCurrencyCode(regionId: RegionId): string {
  return REGIONS[regionId]?.currency || REGIONS[DEFAULT_REGION].currency;
}

/**
 * Format price for a region
 */
export function formatPriceForRegion(amount: number, regionId: RegionId): string {
  const config = getRegionConfig(regionId);

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    // Fallback formatting
    return `${config.currencySymbol}${amount.toFixed(2)}`;
  }
}
