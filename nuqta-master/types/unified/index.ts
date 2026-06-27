/**
 * Unified Types - Central Export
 *
 * This file exports all unified types, utilities, and helpers.
 * Import from this file to use the standardized type system.
 *
 * @example
 * import { Product, Store, toProduct, isProductAvailable } from '@/types/unified';
 */

// ============================================================================
// CORE TYPES
// ============================================================================

// Product Types
export * from './Product';

// Store Types
export * from './Store';

// Cart Types
export * from './Cart';

// User Types
export * from './User';

// Order Types
export * from './Order';

// Review Types
export * from './Review';

// ============================================================================
// TYPE UTILITIES
// ============================================================================

// Type Guards
export * from './guards';

// Type Converters
export * from './converters';

// Type Validators
export * from './validators';

// Migration Utilities
export * from './migrations';

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

import {
  Product,
  ProductPrice,
  ProductRating,
  ProductInventory,
  ProductImage,
  ProductAvailabilityStatus,
  ProductCategory,
  ProductStoreInfo,
  ProductCashback,
  ProductVariant,
} from './Product';

import {
  Store,
  StoreLocation,
  StoreContact,
  StoreBusinessHours,
  StoreStatus,
  StoreRating,
  StoreCategory,
  StoreService,
  StoreFeature,
} from './Store';

import {
  CartItem,
  LockedProduct,
  CartState,
  CartSummary,
  CartValidation,
} from './Cart';

import {
  User,
  UserProfile,
  UserPreferences,
  UserAddress,
  UserPaymentMethod,
} from './User';

import {
  Order,
  OrderItem,
  OrderPricing,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
} from './Order';

import {
  Review,
  ReviewUser,
  ReviewImage,
  ReviewStats,
  RatingDistribution,
  ReviewFilters,
} from './Review';

import {
  isProduct,
  isProductAvailable,
  isStore,
  isStoreOpen,
  isCartItem,
  isUser,
  isOrder,
  isReview,
} from './guards';

import {
  toProduct,
  toStore,
  toCartItem,
  toOrder,
  toReview,
  normalizeId,
  normalizeIds,
} from './converters';

import {
  validateProduct,
  validateStore,
  validateCartItem,
  validateUser,
  validateReviewSubmission,
} from './validators';

import {
  migrateId,
  migrateIds,
  deepMigrateIds,
  migrateToUnifiedType,
  batchMigrate,
  generateMigrationReport,
} from './migrations';

// ============================================================================
// TYPE COLLECTIONS (for convenience)
// ============================================================================

export const ProductTypes = {
  Product,
  ProductPrice,
  ProductRating,
  ProductInventory,
  ProductImage,
  ProductAvailabilityStatus,
  ProductCategory,
  ProductStoreInfo,
  ProductCashback,
  ProductVariant,
};

export const StoreTypes = {
  Store,
  StoreLocation,
  StoreContact,
  StoreBusinessHours,
  StoreStatus,
  StoreRating,
  StoreCategory,
  StoreService,
  StoreFeature,
};

export const CartTypes = {
  CartItem,
  LockedProduct,
  CartState,
  CartSummary,
  CartValidation,
};

export const UserTypes = {
  User,
  UserProfile,
  UserPreferences,
  UserAddress,
  UserPaymentMethod,
};

export const OrderTypes = {
  Order,
  OrderItem,
  OrderPricing,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
};

export const ReviewTypes = {
  Review,
  ReviewUser,
  ReviewImage,
  ReviewStats,
  RatingDistribution,
  ReviewFilters,
};

// ============================================================================
// UTILITY COLLECTIONS
// ============================================================================

export const TypeGuards = {
  isProduct,
  isProductAvailable,
  isStore,
  isStoreOpen,
  isCartItem,
  isUser,
  isOrder,
  isReview,
};

export const TypeConverters = {
  toProduct,
  toStore,
  toCartItem,
  toOrder,
  toReview,
  normalizeId,
  normalizeIds,
};

export const TypeValidators = {
  validateProduct,
  validateStore,
  validateCartItem,
  validateUser,
  validateReviewSubmission,
};

export const MigrationUtils = {
  migrateId,
  migrateIds,
  deepMigrateIds,
  migrateToUnifiedType,
  batchMigrate,
  generateMigrationReport,
};

// ============================================================================
// USAGE EXAMPLES (for documentation)
// ============================================================================

/**
 * @example Basic Usage
 * ```typescript
 * import { Product, toProduct, isProductAvailable } from '@/types/unified';
 *
 * // Convert API response to unified Product
 * const product = toProduct(apiResponse.data);
 *
 * // Check availability
 * if (isProductAvailable(product)) {
 *   console.log('Product is available!');
 * }
 * ```
 */

/**
 * @example Migration
 * ```typescript
 * import { migrateToUnifiedType, batchMigrate } from '@/types/unified';
 *
 * // Migrate single product
 * const migratedProduct = migrateToUnifiedType(oldProduct, 'product');
 *
 * // Batch migrate products
 * const migratedProducts = batchMigrate(oldProducts, 'product');
 * ```
 */

/**
 * @example Validation
 * ```typescript
 * import { validateProduct, ValidationResult } from '@/types/unified';
 *
 * const result: ValidationResult = validateProduct(product);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
