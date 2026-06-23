import { logger } from '../config/logger';
import { Types } from 'mongoose';

/**
 * Product Diversity Service
 *
 * This service provides algorithms to ensure product recommendations are diverse
 * across multiple dimensions: category, brand, price range, etc.
 *
 * The goal is to eliminate duplicate products and ensure variety in recommendation sections.
 *
 * @module diversityService
 */

/**
 * Interface for product objects used in diversity calculations
 */
export interface DiversityProduct {
  _id: Types.ObjectId | string;
  name: string;
  category?: Types.ObjectId | string | { _id: string; name: string };
  brand?: string;
  store?: Types.ObjectId | string | { _id: string; name: string };
  pricing?: {
    selling: number;
    original?: number;
    currency?: string;
  };
  price?: {
    current: number;
    original?: number;
  };
  ratings?: {
    average: number;
    count: number;
  };
  rating?: {
    value: number;
    count: number;
  };
  [key: string]: any;
}

/**
 * Options for diversity mode application
 */
export interface DiversityOptions {
  maxPerCategory?: number;
  maxPerBrand?: number;
  priceRanges?: number;
  minRating?: number;
  targetDiversityScore?: number;
}

/**
 * Diversity metadata returned with results
 */
export interface DiversityMetadata {
  categoriesShown: string[];
  brandsShown: string[];
  diversityScore: number;
  deduplicatedCount: number;
  priceDistribution: {
    budget: number;
    mid: number;
    premium: number;
  };
}

/**
 * Extracts the price value from a product, handling multiple pricing schemas
 */
function getProductPrice(product: DiversityProduct): number {
  if (product.pricing?.selling) return product.pricing.selling;
  if (product.price?.current) return product.price.current;
  if (product.pricing?.original) return product.pricing.original;
  if (product.price?.original) return product.price.original;
  return 0;
}

/**
 * Extracts the rating value from a product, handling multiple rating schemas
 */
function getProductRating(product: DiversityProduct): number {
  if (product.ratings?.average) return product.ratings.average;
  if (product.rating?.value) return product.rating.value;
  return 0;
}

/**
 * Extracts the category name from a product
 */
function getCategoryName(product: DiversityProduct): string {
  if (!product.category) return 'uncategorized';

  if (typeof product.category === 'string') return product.category;
  if (typeof product.category === 'object' && 'name' in product.category) {
    return product.category.name;
  }
  if (typeof product.category === 'object' && '_id' in product.category) {
    return product.category._id.toString();
  }

  return 'uncategorized';
}

/**
 * Extracts the brand name from a product
 */
function getBrandName(product: DiversityProduct): string {
  if (product.brand) return product.brand;

  // Try to get brand from store
  if (product.store) {
    if (typeof product.store === 'object' && 'name' in product.store) {
      return product.store.name;
    }
  }

  return 'generic';
}

/**
 * Balance products by limiting items per category
 *
 * This ensures no single category dominates the recommendation list.
 *
 * @param products - Array of products to balance
 * @param maxPerCategory - Maximum products allowed per category (default: 2)
 * @returns Balanced array of products
 *
 * @example
 * ```typescript
 * const balanced = balanceByCategory(products, 2);
 * // Returns at most 2 products per category
 * ```
 */
export function balanceByCategory(
  products: DiversityProduct[],
  maxPerCategory: number = 2
): DiversityProduct[] {
  logger.info('🎨 [DIVERSITY] Balancing by category. Input:', products.length, 'Max per category:', maxPerCategory);

  const categoryCount = new Map<string, number>();
  const balanced: DiversityProduct[] = [];

  for (const product of products) {
    const category = getCategoryName(product);
    const count = categoryCount.get(category) || 0;

    if (count < maxPerCategory) {
      balanced.push(product);
      categoryCount.set(category, count + 1);
    }
  }

  logger.info('✅ [DIVERSITY] Category balance complete. Output:', balanced.length);
  logger.info('📊 [DIVERSITY] Categories represented:', Array.from(categoryCount.keys()).length);

  return balanced;
}

/**
 * Balance products by limiting items per brand/store
 *
 * This prevents a single brand from dominating recommendations.
 *
 * @param products - Array of products to balance
 * @param maxPerBrand - Maximum products allowed per brand (default: 2)
 * @returns Balanced array of products
 *
 * @example
 * ```typescript
 * const balanced = balanceByBrand(products, 2);
 * // Returns at most 2 products per brand
 * ```
 */
export function balanceByBrand(
  products: DiversityProduct[],
  maxPerBrand: number = 2
): DiversityProduct[] {
  logger.info('🎨 [DIVERSITY] Balancing by brand. Input:', products.length, 'Max per brand:', maxPerBrand);

  const brandCount = new Map<string, number>();
  const balanced: DiversityProduct[] = [];

  for (const product of products) {
    const brand = getBrandName(product);
    const count = brandCount.get(brand) || 0;

    if (count < maxPerBrand) {
      balanced.push(product);
      brandCount.set(brand, count + 1);
    }
  }

  logger.info('✅ [DIVERSITY] Brand balance complete. Output:', balanced.length);
  logger.info('📊 [DIVERSITY] Brands represented:', Array.from(brandCount.keys()).length);

  return balanced;
}

/**
 * Balance products by price range stratification
 *
 * Divides products into price ranges (budget, mid-tier, premium) and
 * ensures representation from each tier.
 *
 * @param products - Array of products to balance
 * @param ranges - Number of price ranges to create (default: 3)
 * @returns Balanced array of products with diverse pricing
 *
 * @example
 * ```typescript
 * const balanced = balanceByPriceRange(products, 3);
 * // Returns products from budget, mid, and premium tiers
 * ```
 */
export function balanceByPriceRange(
  products: DiversityProduct[],
  ranges: number = 3
): DiversityProduct[] {
  logger.info('🎨 [DIVERSITY] Balancing by price range. Input:', products.length, 'Ranges:', ranges);

  if (products.length === 0) return [];

  // Get all prices and sort
  const prices = products.map(p => getProductPrice(p)).filter(p => p > 0);
  if (prices.length === 0) return products;

  prices.sort((a, b) => a - b);
  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];

  logger.info('💰 [DIVERSITY] Price range:', minPrice, '-', maxPrice);

  // If all products have same price, return as-is
  if (minPrice === maxPrice) {
    logger.info('⚠️ [DIVERSITY] All products have same price');
    return products;
  }

  // Calculate price range boundaries
  const rangeSize = (maxPrice - minPrice) / ranges;
  const rangeBuckets: DiversityProduct[][] = Array.from({ length: ranges }, () => []);

  // Assign products to price buckets
  for (const product of products) {
    const price = getProductPrice(product);
    if (price === 0) {
      rangeBuckets[0].push(product); // Put zero-price items in budget bucket
      continue;
    }

    let rangeIndex = Math.floor((price - minPrice) / rangeSize);
    if (rangeIndex >= ranges) rangeIndex = ranges - 1; // Handle max price edge case

    rangeBuckets[rangeIndex].push(product);
  }

  // Calculate items per bucket to maintain balance
  const targetPerBucket = Math.ceil(products.length / ranges);

  logger.info('📊 [DIVERSITY] Price buckets:', rangeBuckets.map(b => b.length));

  // Round-robin selection from each bucket
  const balanced: DiversityProduct[] = [];
  let round = 0;

  while (balanced.length < products.length) {
    let addedThisRound = false;

    for (let i = 0; i < ranges; i++) {
      if (rangeBuckets[i].length > round) {
        balanced.push(rangeBuckets[i][round]);
        addedThisRound = true;

        if (balanced.length >= products.length) break;
      }
    }

    if (!addedThisRound) break; // No more products to add
    round++;
  }

  logger.info('✅ [DIVERSITY] Price balance complete. Output:', balanced.length);

  return balanced;
}

/**
 * Calculate diversity score using Gini coefficient
 *
 * The Gini coefficient measures inequality. A score of 0 indicates perfect diversity,
 * while 1 indicates complete homogeneity.
 *
 * We invert this (1 - gini) so higher scores mean better diversity.
 *
 * @param products - Array of products to score
 * @returns Diversity score between 0 (poor) and 1 (excellent)
 *
 * @example
 * ```typescript
 * const score = calculateDiversityScore(products);
 * logger.info('Diversity score:', score); // 0.75 = good diversity
 * ```
 */
export function calculateDiversityScore(products: DiversityProduct[]): number {
  logger.info('📊 [DIVERSITY] Calculating diversity score for', products.length, 'products');

  if (products.length === 0) return 0;
  if (products.length === 1) return 1;

  // Count categories
  const categoryCount = new Map<string, number>();
  const brandCount = new Map<string, number>();
  const priceRanges = new Map<string, number>();

  // Calculate price range buckets
  const prices = products.map(p => getProductPrice(p)).filter(p => p > 0);
  let minPrice = 0, maxPrice = 0;

  if (prices.length > 0) {
    minPrice = Math.min(...prices);
    maxPrice = Math.max(...prices);
  }

  for (const product of products) {
    // Count categories
    const category = getCategoryName(product);
    categoryCount.set(category, (categoryCount.get(category) || 0) + 1);

    // Count brands
    const brand = getBrandName(product);
    brandCount.set(brand, (brandCount.get(brand) || 0) + 1);

    // Count price ranges
    const price = getProductPrice(product);
    if (price > 0 && maxPrice > minPrice) {
      const rangeSize = (maxPrice - minPrice) / 3;
      let range: string;

      if (price <= minPrice + rangeSize) {
        range = 'budget';
      } else if (price <= minPrice + 2 * rangeSize) {
        range = 'mid';
      } else {
        range = 'premium';
      }

      priceRanges.set(range, (priceRanges.get(range) || 0) + 1);
    }
  }

  // Calculate Gini coefficient for categories
  const categoryValues = Array.from(categoryCount.values()).sort((a, b) => a - b);
  const brandValues = Array.from(brandCount.values()).sort((a, b) => a - b);

  const categoryGini = calculateGini(categoryValues, products.length);
  const brandGini = calculateGini(brandValues, products.length);

  // Price diversity score (0 to 1, higher is better)
  const priceRangeScore = priceRanges.size / 3; // 3 possible ranges

  // Combined diversity score (weighted average, inverted from Gini)
  const diversityScore = (
    (1 - categoryGini) * 0.4 + // 40% weight on category diversity
    (1 - brandGini) * 0.3 +    // 30% weight on brand diversity
    priceRangeScore * 0.3       // 30% weight on price diversity
  );

  logger.info('📈 [DIVERSITY] Score breakdown:', {
    categories: categoryCount.size,
    brands: brandCount.size,
    priceRanges: priceRanges.size,
    categoryGini: categoryGini.toFixed(3),
    brandGini: brandGini.toFixed(3),
    priceRangeScore: priceRangeScore.toFixed(3),
    finalScore: diversityScore.toFixed(3)
  });

  return parseFloat(diversityScore.toFixed(3));
}

/**
 * Calculate Gini coefficient for a distribution
 *
 * @param values - Sorted array of values
 * @param total - Total sum of values
 * @returns Gini coefficient (0 = perfect equality, 1 = complete inequality)
 */
function calculateGini(values: number[], total: number): number {
  if (values.length === 0 || total === 0) return 0;

  const n = values.length;
  let sumOfDifferences = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumOfDifferences += Math.abs(values[i] - values[j]);
    }
  }

  const gini = sumOfDifferences / (2 * n * n * (total / n));
  return Math.min(gini, 1); // Cap at 1
}

/**
 * Apply diversity mode to product list
 *
 * This is the main algorithm that applies diversity transformations based on the mode.
 *
 * Modes:
 * - `balanced`: Balances across categories, brands, and price ranges
 * - `category_diverse`: Focuses on category diversity, allows more brand repetition
 * - `price_diverse`: Focuses on price stratification, allows category repetition
 *
 * @param products - Array of products to diversify
 * @param mode - Diversity mode to apply
 * @param options - Configuration options
 * @returns Diversified array of products
 *
 * @example
 * ```typescript
 * const diverse = await diversityService.applyDiversityMode(
 *   products,
 *   'balanced',
 *   { maxPerCategory: 2, maxPerBrand: 2 }
 * );
 * ```
 */
export async function applyDiversityMode(
  products: DiversityProduct[],
  mode: 'balanced' | 'category_diverse' | 'price_diverse',
  options: DiversityOptions = {}
): Promise<DiversityProduct[]> {
  logger.info('🎨 [DIVERSITY] Applying diversity mode:', mode);
  logger.info('📦 [DIVERSITY] Input products:', products.length);
  logger.info('⚙️ [DIVERSITY] Options:', options);

  if (products.length === 0) {
    logger.info('⚠️ [DIVERSITY] No products to diversify');
    return [];
  }

  const {
    maxPerCategory = 2,
    maxPerBrand = 2,
    priceRanges = 3,
    minRating = 3.0
  } = options;

  // Filter by minimum rating if specified
  let filtered = products;
  if (minRating > 0) {
    filtered = products.filter(p => {
      const rating = getProductRating(p);
      return rating === 0 || rating >= minRating; // Include unrated products
    });

    logger.info('⭐ [DIVERSITY] Filtered by rating ≥', minRating, ':', filtered.length, 'remaining');
  }

  let result: DiversityProduct[] = [];

  switch (mode) {
    case 'balanced':
      // Apply all balancing algorithms in sequence
      result = balanceByCategory(filtered, maxPerCategory);
      result = balanceByBrand(result, maxPerBrand);
      result = balanceByPriceRange(result, priceRanges);
      break;

    case 'category_diverse':
      // Focus on category diversity, allow more brand repetition
      result = balanceByCategory(filtered, maxPerCategory);
      result = balanceByBrand(result, maxPerBrand * 2); // Double brand allowance
      break;

    case 'price_diverse':
      // Focus on price diversity first
      result = balanceByPriceRange(filtered, priceRanges);
      result = balanceByCategory(result, maxPerCategory * 2); // Allow more per category
      break;

    default:
      logger.warn('⚠️ [DIVERSITY] Unknown mode:', mode);
      result = filtered;
  }

  const diversityScore = calculateDiversityScore(result);

  logger.info('✅ [DIVERSITY] Applied mode:', mode);
  logger.info('📊 [DIVERSITY] Output:', result.length, 'products');
  logger.info('🎯 [DIVERSITY] Score:', diversityScore);

  return result;
}

/**
 * Diversity Service Export
 */
export const diversityService = {
  balanceByCategory,
  balanceByBrand,
  balanceByPriceRange,
  calculateDiversityScore,
  applyDiversityMode,

  /**
   * Utility to extract diversity metadata from products
   */
  getMetadata(products: DiversityProduct[]): DiversityMetadata {
    const categories = new Set<string>();
    const brands = new Set<string>();
    let budget = 0, mid = 0, premium = 0;

    const prices = products.map(p => getProductPrice(p)).filter(p => p > 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const rangeSize = (maxPrice - minPrice) / 3;

    for (const product of products) {
      categories.add(getCategoryName(product));
      brands.add(getBrandName(product));

      const price = getProductPrice(product);
      if (price <= minPrice + rangeSize) budget++;
      else if (price <= minPrice + 2 * rangeSize) mid++;
      else premium++;
    }

    return {
      categoriesShown: Array.from(categories),
      brandsShown: Array.from(brands),
      diversityScore: calculateDiversityScore(products),
      deduplicatedCount: 0, // Will be set by caller
      priceDistribution: { budget, mid, premium }
    };
  }
};

export default diversityService;
