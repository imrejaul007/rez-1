/**
 * Type Validators
 *
 * Validation functions to ensure data integrity and correctness.
 * These validators can be used before saving data or processing API responses.
 */

import {
  Product,
  ProductPrice,
  ProductRating,
  ProductInventory,
} from './Product';
import { Store, StoreLocation, StoreContact } from './Store';
import { CartItem } from './Cart';
import { User, UserProfile, UserAddress } from './User';
import { Order, OrderItem, OrderPricing } from './Order';
import { Review, ReviewSubmission } from './Review';

// ============================================================================
// VALIDATION RESULT
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// PRODUCT VALIDATORS
// ============================================================================

/**
 * Validate Product data
 */
export function validateProduct(product: Partial<Product>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!product.id) {
    errors.push({
      field: 'id',
      message: 'Product ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!product.name || product.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Product name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!product.storeId) {
    errors.push({
      field: 'storeId',
      message: 'Store ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!product.productType || !['product', 'service'].includes(product.productType)) {
    errors.push({
      field: 'productType',
      message: 'Product type must be "product" or "service"',
      code: 'INVALID_VALUE',
    });
  }

  // Price validation
  if (product.price) {
    const priceErrors = validateProductPrice(product.price);
    errors.push(...priceErrors.errors);
  } else {
    errors.push({
      field: 'price',
      message: 'Price is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Images validation - only required for physical products, not services
  if (product.productType !== 'service' && (!product.images || product.images.length === 0)) {
    errors.push({
      field: 'images',
      message: 'At least one product image is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Inventory validation
  if (product.inventory) {
    const inventoryErrors = validateProductInventory(product.inventory);
    errors.push(...inventoryErrors.errors);
  }

  // Rating validation
  if (product.rating) {
    const ratingErrors = validateProductRating(product.rating);
    errors.push(...ratingErrors.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate ProductPrice
 */
export function validateProductPrice(price: ProductPrice): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof price.current !== 'number' || price.current < 0) {
    errors.push({
      field: 'price.current',
      message: 'Current price must be a positive number',
      code: 'INVALID_VALUE',
    });
  }

  // Note: original < current is a data quality issue but should not block product display
  // Merchants may set pricing incorrectly — handle gracefully in UI instead

  if (price.discount !== undefined && (price.discount < 0 || price.discount > 100)) {
    errors.push({
      field: 'price.discount',
      message: 'Discount must be between 0 and 100',
      code: 'INVALID_VALUE',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate ProductRating
 */
export function validateProductRating(rating: ProductRating): ValidationResult {
  const errors: ValidationError[] = [];
  const maxValue = rating.maxValue || 5;

  if (rating.value < 0 || rating.value > maxValue) {
    errors.push({
      field: 'rating.value',
      message: `Rating value must be between 0 and ${maxValue}`,
      code: 'INVALID_VALUE',
    });
  }

  if (rating.count < 0) {
    errors.push({
      field: 'rating.count',
      message: 'Rating count cannot be negative',
      code: 'INVALID_VALUE',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate ProductInventory
 */
export function validateProductInventory(
  inventory: ProductInventory
): ValidationResult {
  const errors: ValidationError[] = [];

  if (inventory.stock < 0) {
    errors.push({
      field: 'inventory.stock',
      message: 'Stock cannot be negative',
      code: 'INVALID_VALUE',
    });
  }

  if (
    inventory.lowStockThreshold !== undefined &&
    inventory.lowStockThreshold < 0
  ) {
    errors.push({
      field: 'inventory.lowStockThreshold',
      message: 'Low stock threshold cannot be negative',
      code: 'INVALID_VALUE',
    });
  }

  if (
    inventory.maxOrderQuantity !== undefined &&
    inventory.minOrderQuantity !== undefined &&
    inventory.maxOrderQuantity < inventory.minOrderQuantity
  ) {
    errors.push({
      field: 'inventory.maxOrderQuantity',
      message: 'Max order quantity cannot be less than min order quantity',
      code: 'INVALID_VALUE',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// STORE VALIDATORS
// ============================================================================

/**
 * Validate Store data
 */
export function validateStore(store: Partial<Store>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!store.id) {
    errors.push({
      field: 'id',
      message: 'Store ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!store.name || store.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Store name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!store.storeType || !['physical', 'online', 'both'].includes(store.storeType)) {
    errors.push({
      field: 'storeType',
      message: 'Store type must be "physical", "online", or "both"',
      code: 'INVALID_VALUE',
    });
  }

  // Location validation
  if (store.location) {
    const locationErrors = validateStoreLocation(store.location);
    errors.push(...locationErrors.errors);
  }

  // Contact validation
  if (store.contact) {
    const contactErrors = validateStoreContact(store.contact);
    errors.push(...contactErrors.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate StoreLocation
 */
export function validateStoreLocation(location: StoreLocation): ValidationResult {
  const errors: ValidationError[] = [];

  if (!location.address || location.address.trim().length === 0) {
    errors.push({
      field: 'location.address',
      message: 'Address is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!location.city || location.city.trim().length === 0) {
    errors.push({
      field: 'location.city',
      message: 'City is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!location.state || location.state.trim().length === 0) {
    errors.push({
      field: 'location.state',
      message: 'State is required',
      code: 'REQUIRED_FIELD',
    });
  }

  const { latitude, longitude } = location.coordinates;

  if (latitude < -90 || latitude > 90) {
    errors.push({
      field: 'location.coordinates.latitude',
      message: 'Latitude must be between -90 and 90',
      code: 'INVALID_VALUE',
    });
  }

  if (longitude < -180 || longitude > 180) {
    errors.push({
      field: 'location.coordinates.longitude',
      message: 'Longitude must be between -180 and 180',
      code: 'INVALID_VALUE',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate StoreContact
 */
export function validateStoreContact(contact: StoreContact): ValidationResult {
  const errors: ValidationError[] = [];

  if (!contact.phone || contact.phone.trim().length === 0) {
    errors.push({
      field: 'contact.phone',
      message: 'Phone number is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!contact.email || !isValidEmail(contact.email)) {
    errors.push({
      field: 'contact.email',
      message: 'Valid email address is required',
      code: 'INVALID_FORMAT',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// CART VALIDATORS
// ============================================================================

/**
 * Validate CartItem
 */
export function validateCartItem(item: Partial<CartItem>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!item.id) {
    errors.push({
      field: 'id',
      message: 'Cart item ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!item.productId) {
    errors.push({
      field: 'productId',
      message: 'Product ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!item.quantity || item.quantity < 1) {
    errors.push({
      field: 'quantity',
      message: 'Quantity must be at least 1',
      code: 'INVALID_VALUE',
    });
  }

  if (item.maxQuantity && item.quantity && item.quantity > item.maxQuantity) {
    errors.push({
      field: 'quantity',
      message: `Quantity cannot exceed ${item.maxQuantity}`,
      code: 'EXCEEDED_LIMIT',
    });
  }

  if (typeof item.price !== 'number' || item.price < 0) {
    errors.push({
      field: 'price',
      message: 'Price must be a positive number',
      code: 'INVALID_VALUE',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// USER VALIDATORS
// ============================================================================

/**
 * Validate User data
 */
export function validateUser(user: Partial<User>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!user.id) {
    errors.push({
      field: 'id',
      message: 'User ID is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!user.email || !isValidEmail(user.email)) {
    errors.push({
      field: 'email',
      message: 'Valid email address is required',
      code: 'INVALID_FORMAT',
    });
  }

  if (user.profile) {
    const profileErrors = validateUserProfile(user.profile);
    errors.push(...profileErrors.errors);
  }

  if (!user.role || !['user', 'merchant', 'admin', 'moderator'].includes(user.role)) {
    errors.push({
      field: 'role',
      message: 'Valid user role is required',
      code: 'INVALID_VALUE',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate UserProfile
 */
export function validateUserProfile(profile: UserProfile): ValidationResult {
  const errors: ValidationError[] = [];

  if (!profile.name || profile.name.trim().length === 0) {
    errors.push({
      field: 'profile.name',
      message: 'Name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (profile.phone && !isValidPhone(profile.phone)) {
    errors.push({
      field: 'profile.phone',
      message: 'Invalid phone number format',
      code: 'INVALID_FORMAT',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate UserAddress
 */
export function validateUserAddress(address: UserAddress): ValidationResult {
  const errors: ValidationError[] = [];

  if (!address.name || address.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Name is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!address.phone || !isValidPhone(address.phone)) {
    errors.push({
      field: 'phone',
      message: 'Valid phone number is required',
      code: 'INVALID_FORMAT',
    });
  }

  if (!address.addressLine1 || address.addressLine1.trim().length === 0) {
    errors.push({
      field: 'addressLine1',
      message: 'Address line 1 is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!address.city || address.city.trim().length === 0) {
    errors.push({
      field: 'city',
      message: 'City is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!address.state || address.state.trim().length === 0) {
    errors.push({
      field: 'state',
      message: 'State is required',
      code: 'REQUIRED_FIELD',
    });
  }

  if (!address.postalCode || !isValidPostalCode(address.postalCode)) {
    errors.push({
      field: 'postalCode',
      message: 'Valid postal code is required',
      code: 'INVALID_FORMAT',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// REVIEW VALIDATORS
// ============================================================================

/**
 * Validate Review submission
 */
export function validateReviewSubmission(
  submission: ReviewSubmission
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!['product', 'store', 'order'].includes(submission.type)) {
    errors.push({
      field: 'type',
      message: 'Review type must be "product", "store", or "order"',
      code: 'INVALID_VALUE',
    });
  }

  if (submission.rating < 1 || submission.rating > 5) {
    errors.push({
      field: 'rating',
      message: 'Rating must be between 1 and 5',
      code: 'INVALID_VALUE',
    });
  }

  if (!submission.comment || submission.comment.trim().length < 10) {
    errors.push({
      field: 'comment',
      message: 'Comment must be at least 10 characters long',
      code: 'INVALID_LENGTH',
    });
  }

  if (submission.comment && submission.comment.length > 1000) {
    errors.push({
      field: 'comment',
      message: 'Comment cannot exceed 1000 characters',
      code: 'EXCEEDED_LENGTH',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// HELPER VALIDATORS
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (international E.164 format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleaned);
}

/**
 * Validate postal code (Indian PIN code)
 */
export function isValidPostalCode(postalCode: string): boolean {
  const pinRegex = /^[1-9][0-9]{5}$/;
  return pinRegex.test(postalCode);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date is not in the past
 */
export function isNotPastDate(date: string | Date): boolean {
  const inputDate = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return inputDate >= now;
}

/**
 * Validate date range
 */
export function isValidDateRange(
  startDate: string | Date,
  endDate: string | Date
): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
}
