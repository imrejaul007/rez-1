/**
 * Type Guards
 * Runtime type checking utilities for TypeScript type safety
 */

import { Product, StoreData, Review, Promotion, Category, Location } from '@/types/store.types';
import { Discount } from '@/services/discountsApi';

// ============================================================================
// BASIC TYPE GUARDS
// ============================================================================

/**
 * Check if value is a valid string
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a valid number
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Check if value is a valid boolean
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is a valid date
 */
export function isDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a valid array
 */
export function isArray<T>(value: any): value is T[] {
  return Array.isArray(value);
}

/**
 * Check if value is a valid object (not null, not array)
 */
export function isObject(value: any): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ============================================================================
// PRODUCT TYPE GUARDS
// ============================================================================

/**
 * Check if object is a valid Product
 */
export function isProduct(obj: any): obj is Product {
  if (!isObject(obj)) return false;

  return (
    isString(obj.id) &&
    (isString(obj.name) || isString(obj.title)) &&
    isString(obj.description) &&
    isNumber(obj.price) &&
    obj.price >= 0 &&
    isArray(obj.images) &&
    isObject(obj.inventory) &&
    isObject(obj.ratings)
  );
}

/**
 * Assert that object is a Product (throws if not)
 */
export function assertProduct(obj: any): asserts obj is Product {
  if (!isProduct(obj)) {
    throw new Error(
      `Invalid product data: ${JSON.stringify(obj).substring(0, 100)}`
    );
  }
}

/**
 * Check if object is a valid array of Products
 */
export function isProductArray(obj: any): obj is Product[] {
  return isArray(obj) && obj.every(isProduct);
}

// ============================================================================
// STORE TYPE GUARDS
// ============================================================================

/**
 * Check if object is valid StoreData
 */
export function isStoreData(obj: any): obj is StoreData {
  if (!isObject(obj)) return false;

  return (
    isString(obj.id) &&
    isString(obj.name) &&
    isString(obj.description) &&
    isNumber(obj.rating) &&
    isNumber(obj.reviewCount) &&
    isBoolean(obj.verified)
  );
}

/**
 * Assert that object is StoreData (throws if not)
 */
export function assertStoreData(obj: any): asserts obj is StoreData {
  if (!isStoreData(obj)) {
    throw new Error(
      `Invalid store data: ${JSON.stringify(obj).substring(0, 100)}`
    );
  }
}

// ============================================================================
// LOCATION TYPE GUARDS
// ============================================================================

/**
 * Check if object is valid Location
 */
export function isLocation(obj: any): obj is Location {
  if (!isObject(obj)) return false;

  return (
    isString(obj.city) &&
    isString(obj.state)
  );
}

/**
 * Check if location has valid coordinates
 */
export function hasValidCoordinates(location: any): boolean {
  if (!isObject(location) || !isObject(location.coordinates)) return false;

  const { coordinates } = location;
  const lat = coordinates.lat ?? coordinates.latitude;
  const lng = coordinates.lng ?? coordinates.longitude;

  return (
    isNumber(lat) &&
    isNumber(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// ============================================================================
// REVIEW TYPE GUARDS
// ============================================================================

/**
 * Check if object is valid Review
 */
export function isReview(obj: any): obj is Review {
  if (!isObject(obj)) return false;

  return (
    isString(obj.id) &&
    isString(obj.userId) &&
    isString(obj.userName) &&
    isNumber(obj.rating) &&
    obj.rating >= 0 &&
    obj.rating <= 5 &&
    isString(obj.comment) &&
    isBoolean(obj.verified)
  );
}

/**
 * Check if object is valid array of Reviews
 */
export function isReviewArray(obj: any): obj is Review[] {
  return isArray(obj) && obj.every(isReview);
}

// ============================================================================
// DISCOUNT TYPE GUARDS
// ============================================================================

/**
 * Check if object is valid Discount
 */
export function isDiscount(obj: any): obj is Discount {
  if (!isObject(obj)) return false;

  return (
    isString(obj._id) &&
    isString(obj.name) &&
    (obj.type === 'percentage' || obj.type === 'fixed') &&
    isNumber(obj.value) &&
    isNumber(obj.minOrderValue) &&
    isBoolean(obj.isActive)
  );
}

/**
 * Check if discount is currently valid
 */
export function isDiscountValid(discount: Discount): boolean {
  if (!discount.isActive) return false;

  const now = new Date();
  const validFrom = new Date(discount.validFrom);
  const validUntil = new Date(discount.validUntil);

  return now >= validFrom && now <= validUntil;
}

/**
 * Check if discount can be applied to order value
 */
export function canApplyDiscount(discount: Discount, orderValue: number): boolean {
  if (!isDiscountValid(discount)) return false;
  if (orderValue < discount.minOrderValue) return false;

  if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
    return false;
  }

  return true;
}

// ============================================================================
// PROMOTION TYPE GUARDS
// ============================================================================

/**
 * Check if object is valid Promotion
 */
export function isPromotion(obj: any): obj is Promotion {
  if (!isObject(obj)) return false;

  return (
    isString(obj.id) &&
    isString(obj.title) &&
    isString(obj.description) &&
    isNumber(obj.discountValue) &&
    isBoolean(obj.active)
  );
}

/**
 * Check if promotion is currently active
 */
export function isPromotionActive(promotion: Promotion): boolean {
  if (!promotion.active) return false;

  const now = new Date();
  return now >= promotion.startDate && now <= promotion.endDate;
}

// ============================================================================
// CATEGORY TYPE GUARDS
// ============================================================================

/**
 * Check if object is valid Category
 */
export function isCategory(obj: any): obj is Category {
  if (!isObject(obj)) return false;

  return (
    isString(obj.id) &&
    isString(obj.name) &&
    isString(obj.slug) &&
    isNumber(obj.level) &&
    obj.level >= 0
  );
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (Indian format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

/**
 * Validate price value
 */
export function isValidPrice(price: any): boolean {
  return isNumber(price) && price >= 0 && price <= 10000000;
}

/**
 * Validate rating value
 */
export function isValidRating(rating: any): boolean {
  return isNumber(rating) && rating >= 0 && rating <= 5;
}

/**
 * Validate percentage value
 */
export function isValidPercentage(percentage: any): boolean {
  return isNumber(percentage) && percentage >= 0 && percentage <= 100;
}

// ============================================================================
// API RESPONSE GUARDS
// ============================================================================

/**
 * Check if API response is successful
 */
export function isSuccessResponse<T>(response: any): response is { success: true; data: T } {
  return (
    isObject(response) &&
    response.success === true &&
    'data' in response
  );
}

/**
 * Check if API response is an error
 */
export function isErrorResponse(response: any): response is { success: false; error: string } {
  return (
    isObject(response) &&
    response.success === false &&
    isString(response.error)
  );
}

/**
 * Check if response has pagination data
 */
export function isPaginatedResponse<T>(response: any): response is {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
} {
  return (
    isObject(response) &&
    isArray(response.data) &&
    isNumber(response.total) &&
    isNumber(response.page) &&
    isNumber(response.limit) &&
    isBoolean(response.hasMore)
  );
}

// ============================================================================
// SAFE ACCESSORS
// ============================================================================

/**
 * Safely get nested property value
 */
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (!isObject(current) || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current ?? defaultValue;
}

/**
 * Safely parse JSON string
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

/**
 * Safely convert to number
 */
export function safeNumber(value: any, defaultValue: number = 0): number {
  if (isNumber(value)) return value;

  if (isString(value)) {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? defaultValue : parsed;
  }

  return defaultValue;
}

/**
 * Safely convert to string
 */
export function safeString(value: any, defaultValue: string = ''): string {
  if (isString(value)) return value;
  if (value === null || value === undefined) return defaultValue;
  return String(value);
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  isString,
  isNumber,
  isBoolean,
  isDate,
  isArray,
  isObject,
  isProduct,
  assertProduct,
  isProductArray,
  isStoreData,
  assertStoreData,
  isLocation,
  hasValidCoordinates,
  isReview,
  isReviewArray,
  isDiscount,
  isDiscountValid,
  canApplyDiscount,
  isPromotion,
  isPromotionActive,
  isCategory,
  isValidEmail,
  isValidPhone,
  isValidPrice,
  isValidRating,
  isValidPercentage,
  isSuccessResponse,
  isErrorResponse,
  isPaginatedResponse,
  safeGet,
  safeJsonParse,
  safeNumber,
  safeString,
};
