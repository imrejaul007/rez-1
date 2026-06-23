/**
 * Data Formatters - Central Export
 *
 * This module exports all data formatting and normalization utilities
 * for easy importing throughout the application.
 *
 * @example
 * // Import specific utilities
 * import { formatPrice, formatRating, normalizeProduct } from '@/utils/dataFormatters';
 *
 * // Or import all
 * import * as DataFormatters from '@/utils/dataFormatters';
 */

// Export all price formatting utilities
export {
  formatPrice,
  formatPriceRange,
  formatDiscount,
  formatDiscountString,
  calculateSavings,
  formatSavings,
  formatPriceDisplay,
  parsePrice,
  comparePrice,
  isPriceInRange,
  validatePrice,
} from './priceFormatter';

// Export all rating formatting utilities
export {
  formatRating,
  getRatingDisplay,
  getStarDisplay,
  formatReviewCount,
  getReviewCountText,
  getRatingPercentage,
  getRatingColor,
  getRatingCategory,
  formatRatingDisplay,
  compareRating,
  isRatingInRange,
  calculateAverageRating,
  getRatingDistribution,
  validateRating,
  validateReviewCount,
} from './ratingFormatter';

// Export all product normalization utilities
export {
  normalizeProductPrice,
  normalizeProductRating,
  normalizeProductId,
  normalizeProductImage,
  normalizeStoreId,
  normalizeStoreName,
  normalizeProduct,
  normalizeProducts,
  normalizeStore,
  normalizeStores,
} from './productDataNormalizer';
