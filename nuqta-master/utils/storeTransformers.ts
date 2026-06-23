/**
 * Store Data Transformers
 * Utility functions for transforming API responses to UI-friendly formats
 */

import { Discount } from '@/services/discountsApi';
import type { SearchFilters } from '@/types/store-search';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StoreApiResponse {
  _id: string;
  id?: string;
  name: string;
  title?: string;
  description?: string;
  rating?: number;
  ratingCount?: number;
  reviews?: ReviewData[];
  hours?: BusinessHoursData;
  location?: LocationData;
  image?: string;
  logo?: string;
  category?: string;
  cashback?: number | { percentage?: number };
  discount?: number | { value?: number };
  [key: string]: any;
}

export interface ReviewData {
  _id: string;
  rating: number;
  comment?: string;
  createdAt?: string;
}

export interface BusinessHoursData {
  [day: number]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export interface LocationData {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  address?: string;
  distance?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface TransformedStoreData {
  id: string;
  name: string;
  description: string;
  rating: number;
  reviewCount: number;
  formattedHours: string;
  address: string;
  category: string;
  cashbackPercentage: string;
  imageUrl: string;
  logoUrl: string;
}

// ============================================================================
// STORE DATA TRANSFORMERS
// ============================================================================

/**
 * Transform API store response to UI-friendly format
 * @param apiResponse - Raw API response from backend
 * @returns Transformed store data with all computed fields
 */
export function transformStoreData(apiResponse: StoreApiResponse): TransformedStoreData {
  const id = apiResponse._id || apiResponse.id || 'unknown';
  const name = apiResponse.name || apiResponse.title || 'Unknown Store';
  const description = apiResponse.description || `Discover amazing products at ${name}. Quality items with great deals and cashback offers.`;

  return {
    id,
    name,
    description,
    rating: calculateAverageRating(apiResponse.reviews || []),
    reviewCount: apiResponse.reviews?.length || 0,
    formattedHours: formatBusinessHours(apiResponse.hours),
    address: formatAddress(apiResponse.location),
    category: apiResponse.category || 'General',
    cashbackPercentage: extractCashbackPercentage(apiResponse.cashback),
    imageUrl: apiResponse.image || apiResponse.logo || '',
    logoUrl: apiResponse.logo || apiResponse.image || '',
  };
}

/**
 * Calculate average rating from reviews array
 * @param reviews - Array of review objects
 * @returns Average rating rounded to 1 decimal place
 */
export function calculateAverageRating(reviews: ReviewData[]): number {
  if (!reviews || reviews.length === 0) return 0;

  const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
  const average = sum / reviews.length;

  return Math.round(average * 10) / 10; // Round to 1 decimal
}

/**
 * Format business hours for display
 * @param hours - Business hours object with day indices as keys
 * @returns Formatted hours string for current day
 */
export function formatBusinessHours(hours?: BusinessHoursData): string {
  if (!hours) return 'Hours not available';

  const today = new Date().getDay();
  const todayHours = hours[today];

  if (!todayHours) return 'Closed today';
  if (todayHours.closed) return 'Closed today';

  return `${todayHours.open} - ${todayHours.close}`;
}

/**
 * Format location address for display
 * @param location - Location object with address components
 * @returns Formatted address string
 */
export function formatAddress(location?: LocationData): string {
  if (!location) return 'Address not available';

  // If there's a pre-formatted address, use it
  if (location.address) return location.address;

  // Otherwise build from components
  const parts = [
    location.street,
    location.city,
    location.state,
    location.zip,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'Address not available';
}

/**
 * Extract cashback percentage from various format
 * @param cashback - Cashback data (can be number or object)
 * @returns Formatted percentage string
 */
export function extractCashbackPercentage(cashback?: number | { percentage?: number } | any): string {
  if (!cashback) return '10'; // Default

  if (typeof cashback === 'object' && cashback.percentage) {
    return cashback.percentage.toString();
  }

  if (typeof cashback === 'number') {
    return cashback.toString();
  }

  return '10'; // Default
}

// ============================================================================
// PRICE UTILITIES
// ============================================================================

/**
 * Calculate price range from products array
 * @param products - Array of products with price field
 * @returns Formatted price range string
 */
export function calculatePriceRange(products: Array<{ price?: number | string }>): string {
  if (!products || products.length === 0) return 'No prices available';

  const prices = products
    .map(p => {
      const price = p.price;
      if (typeof price === 'number') return price;
      if (typeof price === 'string') {
        // Extract number from string like "₹2,199"
        const num = parseFloat(price.replace(/[^\d.]/g, ''));
        return isNaN(num) ? 0 : num;
      }
      return 0;
    })
    .filter(p => p > 0);

  if (prices.length === 0) return 'No prices available';

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} - ${formatPrice(max)}`;
}

/**
 * Format price with currency symbol
 * @param price - Numeric price value
 * @param currencySymbol - Currency symbol (default: ₹)
 * @param locale - Locale for number formatting (default: en-IN)
 * @returns Formatted price string with currency symbol
 */
export function formatPrice(price: number, currencySymbol: string = '₹', locale: string = 'en-IN'): string {
  return `${currencySymbol}${price.toLocaleString(locale)}`;
}

/**
 * Parse price string to number
 * @param priceString - Price string like "₹2,199"
 * @returns Numeric price value
 */
export function parsePrice(priceString: string): number {
  const cleaned = priceString.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Calculate discount percentage
 * @param originalPrice - Original price before discount
 * @param salePrice - Final sale price
 * @returns Discount percentage rounded to nearest integer
 */
export function calculateDiscountPercentage(originalPrice: number, salePrice: number): number {
  if (!originalPrice || originalPrice <= 0) return 0;
  if (salePrice >= originalPrice) return 0;

  const discount = ((originalPrice - salePrice) / originalPrice) * 100;
  return Math.round(discount);
}

/**
 * Calculate final price after discount
 * @param originalPrice - Original price
 * @param discountPercentage - Discount percentage (0-100)
 * @returns Final price after applying discount
 */
export function applyDiscount(originalPrice: number, discountPercentage: number): number {
  if (!originalPrice || originalPrice <= 0) return 0;
  if (discountPercentage <= 0) return originalPrice;

  const discountAmount = (originalPrice * discountPercentage) / 100;
  return Math.round((originalPrice - discountAmount) * 100) / 100; // Round to 2 decimals
}

// ============================================================================
// DISCOUNT UTILITIES
// ============================================================================

/**
 * Format discount for display
 * @param discount - Discount object from API
 * @returns Human-readable discount text
 */
export function formatDiscountText(discount: Discount): string {
  const value = discount.type === 'percentage'
    ? `${discount.value}%`
    : `₹${discount.value}`;

  const applicableText = discount.applicableOn === 'bill_payment'
    ? ' on bill payment'
    : '';

  return `${value} Off${applicableText}`;
}

/**
 * Calculate discount amount for given order value
 * @param discount - Discount object
 * @param orderValue - Total order value
 * @returns Calculated discount amount
 */
export function calculateDiscountAmount(discount: Discount, orderValue: number): number {
  if (orderValue < discount.minOrderValue) return 0;

  let discountAmount = 0;

  if (discount.type === 'percentage') {
    discountAmount = (orderValue * discount.value) / 100;
  } else {
    discountAmount = discount.value;
  }

  // Apply max discount cap if exists
  if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
    discountAmount = discount.maxDiscountAmount;
  }

  return Math.round(discountAmount * 100) / 100; // Round to 2 decimals
}

/**
 * Check if discount is applicable for given order value
 * @param discount - Discount object
 * @param orderValue - Total order value
 * @returns Boolean indicating if discount can be applied
 */
export function isDiscountApplicable(discount: Discount, orderValue: number): boolean {
  if (!discount.isActive) return false;
  if (orderValue < discount.minOrderValue) return false;

  const now = new Date();
  const validFrom = new Date(discount.validFrom);
  const validUntil = new Date(discount.validUntil);

  if (now < validFrom || now > validUntil) return false;

  if (discount.usageLimit && discount.usedCount >= discount.usageLimit) return false;

  return true;
}

// ============================================================================
// DISTANCE UTILITIES
// ============================================================================

/**
 * Format distance for display
 * @param distance - Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distance: number | string): string {
  if (typeof distance === 'string') return distance;

  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(1)} Km`;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param lat1 - Latitude of point 1
 * @param lon1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lon2 - Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ============================================================================
// STORE STATUS UTILITIES
// ============================================================================

/**
 * Get human-readable store status text
 */
export function getStoreStatusText(store: { isOpen: boolean; hasOnlineDelivery: boolean }): string {
  if (!store.isOpen && store.hasOnlineDelivery) {
    return 'Online available';
  }
  if (store.isOpen) {
    return 'Open';
  }
  return 'Closed';
}

/**
 * Get store status indicator color
 */
export function getStoreStatusColor(store: { isOpen: boolean; hasOnlineDelivery: boolean }): string {
  if (store.isOpen) {
    return '#10B981'; // Green
  }
  if (store.hasOnlineDelivery) {
    return '#3B82F6'; // Blue
  }
  return '#6B7280'; // Gray
}

// ============================================================================
// DEFAULT SEARCH FILTERS
// ============================================================================

export const defaultSearchFilters: SearchFilters = {
  categories: [],
  gender: [],
  hasRezPay: false,
  priceRange: undefined,
  distance: undefined,
  storeStatus: [],
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  transformStoreData,
  calculateAverageRating,
  formatBusinessHours,
  formatAddress,
  extractCashbackPercentage,
  calculatePriceRange,
  formatPrice,
  parsePrice,
  calculateDiscountPercentage,
  applyDiscount,
  formatDiscountText,
  calculateDiscountAmount,
  isDiscountApplicable,
  formatDistance,
  calculateDistance,
  getStoreStatusText,
  getStoreStatusColor,
  defaultSearchFilters,
};
