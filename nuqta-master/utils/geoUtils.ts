/**
 * Geo Utilities
 * Unified coordinate handling and distance calculations
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Coordinate input in various formats:
 * - Object: { latitude, longitude }
 * - Tuple: [lng, lat] (GeoJSON convention)
 * - String: "lng,lat"
 */
export type CoordinateInput =
  | { latitude: number; longitude: number }
  | [number, number]  // [lng, lat] - GeoJSON format
  | string;           // "lng,lat"

/** Parsed coordinate output with consistent lat/lng naming */
export interface ParsedCoordinates {
  lat: number;
  lng: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Earth's radius in kilometers */
const EARTH_RADIUS_KM = 6371;

// ============================================================================
// COORDINATE PARSING
// ============================================================================

/**
 * Parse any coordinate input to {lat, lng} format
 * @param input - Coordinate in object, tuple, or string format
 * @returns Parsed coordinates with lat/lng properties
 * @throws Error if input cannot be parsed
 */
export function parseCoordinates(input: CoordinateInput): ParsedCoordinates {
  if (typeof input === 'string') {
    const parts = input.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
      throw new Error(`Invalid coordinate string: "${input}"`);
    }
    // String format: "lng,lat" (GeoJSON convention)
    return { lat: parts[1], lng: parts[0] };
  }

  if (Array.isArray(input)) {
    if (input.length < 2) {
      throw new Error(`Invalid coordinate array: must have at least 2 elements`);
    }
    const [lng, lat] = input;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Invalid coordinate array values`);
    }
    return { lat, lng };
  }

  if (typeof input === 'object' && 'latitude' in input && 'longitude' in input) {
    const { latitude, longitude } = input;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error(`Invalid coordinate object values`);
    }
    return { lat: latitude, lng: longitude };
  }

  throw new Error(`Unrecognized coordinate format: ${typeof input}`);
}

/**
 * Safely parse coordinates, returning null on failure
 * @param input - Coordinate input to parse
 * @returns Parsed coordinates or null if invalid
 */
export function tryParseCoordinates(input: CoordinateInput | null | undefined): ParsedCoordinates | null {
  if (!input) return null;
  try {
    return parseCoordinates(input);
  } catch {
    return null;
  }
}

// ============================================================================
// HAVERSINE DISTANCE
// ============================================================================

/**
 * Calculate the Haversine distance between two points
 * @param lat1 - Latitude of first point in decimal degrees
 * @param lng1 - Longitude of first point in decimal degrees
 * @param lat2 - Latitude of second point in decimal degrees
 * @param lng2 - Longitude of second point in decimal degrees
 * @returns Distance in kilometers, or NaN if inputs are invalid
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return Number.NaN;
  }

  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Calculate distance between two coordinate inputs
 * @param from - Starting coordinates
 * @param to - Ending coordinates
 * @returns Distance in kilometers, or NaN if inputs are invalid
 */
export function distanceBetween(from: CoordinateInput, to: CoordinateInput): number {
  const fromCoords = tryParseCoordinates(from);
  const toCoords = tryParseCoordinates(to);

  if (!fromCoords || !toCoords) {
    return Number.NaN;
  }

  return haversineDistance(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format coordinates for API transmission
 * @param coords - Coordinate input
 * @returns String format "lat,lng" for API
 */
export function formatForAPI(coords: CoordinateInput): string {
  const parsed = parseCoordinates(coords);
  return `${parsed.lat},${parsed.lng}`;
}

/**
 * Format coordinates as GeoJSON [lng, lat] tuple
 * @param coords - Coordinate input
 * @returns GeoJSON format array
 */
export function toGeoJSON(coords: CoordinateInput): [number, number] {
  const parsed = parseCoordinates(coords);
  return [parsed.lng, parsed.lat];
}

/**
 * Format distance for display
 * @param km - Distance in kilometers
 * @returns Formatted string like "1.5 km" or "500 m"
 */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) {
    return '';
  }

  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }

  return `${km.toFixed(1)} km`;
}

/**
 * Format distance for display with high precision
 * @param km - Distance in kilometers
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with unit
 */
export function formatDistancePrecise(km: number, decimals: number = 1): string {
  if (!Number.isFinite(km) || km < 0) {
    return '';
  }

  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }

  return `${km.toFixed(decimals)} km`;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if coordinates are within valid ranges
 * @param lat - Latitude (-90 to 90)
 * @param lng - Longitude (-180 to 180)
 * @returns True if coordinates are valid
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Check if a coordinate input is valid
 * @param input - Coordinate to validate
 * @returns True if valid
 */
export function isValidCoordinateInput(input: CoordinateInput): boolean {
  try {
    const parsed = parseCoordinates(input);
    return isValidCoordinate(parsed.lat, parsed.lng);
  } catch {
    return false;
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  parseCoordinates,
  tryParseCoordinates,
  haversineDistance,
  distanceBetween,
  formatForAPI,
  toGeoJSON,
  formatDistance,
  formatDistancePrecise,
  isValidCoordinate,
  isValidCoordinateInput,
};
