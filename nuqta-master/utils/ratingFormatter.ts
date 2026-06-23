/**
 * Rating Formatting Utilities
 *
 * This module provides functions for formatting ratings, displaying review counts,
 * and validating rating data across the application.
 */

/**
 * Maximum rating value (5 stars)
 */
const MAX_RATING = 5;

/**
 * Minimum rating value
 */
const MIN_RATING = 0;

/**
 * Validates if a rating value is valid
 *
 * @param rating - Rating value to validate
 * @returns Valid number or null if invalid
 *
 * @example
 * validateRating(4.5) // 4.5
 * validateRating('4.5') // 4.5
 * validateRating(6) // null (exceeds max)
 * validateRating(-1) // null (below min)
 * validateRating(null) // null
 */
export function validateRating(rating: any): number | null {
  // Handle null/undefined
  if (rating == null) {
    return null;
  }

  // Convert to number if string
  const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;

  // Check if valid number
  if (typeof numRating !== 'number' || isNaN(numRating)) {
    return null;
  }

  // Check if within valid range
  if (numRating < MIN_RATING || numRating > MAX_RATING) {
    return null;
  }

  // Check for infinity
  if (!isFinite(numRating)) {
    return null;
  }

  return numRating;
}

/**
 * Validates if a review count is valid
 *
 * @param count - Review count to validate
 * @returns Valid number or null if invalid
 *
 * @example
 * validateReviewCount(100) // 100
 * validateReviewCount('100') // 100
 * validateReviewCount(-10) // null
 * validateReviewCount(null) // null
 */
export function validateReviewCount(count: any): number | null {
  // Handle null/undefined
  if (count == null) {
    return null;
  }

  // Convert to number if string
  const numCount = typeof count === 'string' ? parseInt(count, 10) : count;

  // Check if valid number
  if (typeof numCount !== 'number' || isNaN(numCount)) {
    return null;
  }

  // Review count must be non-negative
  if (numCount < 0) {
    return null;
  }

  // Check for infinity
  if (!isFinite(numCount)) {
    return null;
  }

  return Math.floor(numCount); // Ensure integer
}

/**
 * Formats a rating value to a specific number of decimal places
 *
 * @param rating - Rating value to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted rating number or null if invalid
 *
 * @example
 * formatRating(4.567) // 4.6
 * formatRating(4.567, 2) // 4.57
 * formatRating(null) // null
 * formatRating(4) // 4.0
 */
export function formatRating(
  rating: number | null | undefined,
  decimals: number = 1
): number | null {
  const validRating = validateRating(rating);

  if (validRating === null) {
    return null;
  }

  // Round to specified decimal places
  const multiplier = Math.pow(10, decimals);
  return Math.round(validRating * multiplier) / multiplier;
}

/**
 * Gets a rating display string with optional review count
 *
 * @param rating - Rating value
 * @param reviewCount - Optional number of reviews
 * @param decimals - Number of decimal places for rating (default: 1)
 * @returns Formatted rating display string or null if invalid
 *
 * @example
 * getRatingDisplay(4.5) // '4.5'
 * getRatingDisplay(4.5, 120) // '4.5 (120)'
 * getRatingDisplay(4.567, 120, 2) // '4.57 (120)'
 * getRatingDisplay(null) // null
 */
export function getRatingDisplay(
  rating: number | null | undefined,
  reviewCount?: number | null | undefined,
  decimals: number = 1
): string | null {
  const validRating = formatRating(rating, decimals);

  if (validRating === null) {
    return null;
  }

  const ratingStr = validRating.toFixed(decimals);

  // If review count is provided and valid, include it
  const validCount = validateReviewCount(reviewCount);
  if (validCount !== null && validCount > 0) {
    return `${ratingStr} (${formatReviewCount(validCount)})`;
  }

  return ratingStr;
}

/**
 * Gets a star rating display with filled/unfilled stars
 *
 * @param rating - Rating value
 * @returns Object with full, half, and empty star counts
 *
 * @example
 * getStarDisplay(4.5)
 * // { full: 4, half: 1, empty: 0 }
 *
 * getStarDisplay(3.2)
 * // { full: 3, half: 0, empty: 2 }
 */
export function getStarDisplay(rating: number | null | undefined): {
  full: number;
  half: number;
  empty: number;
} {
  const validRating = validateRating(rating);

  if (validRating === null) {
    return { full: 0, half: 0, empty: MAX_RATING };
  }

  const full = Math.floor(validRating);
  const remainder = validRating - full;
  const half = remainder >= 0.25 && remainder < 0.75 ? 1 : remainder >= 0.75 ? 0 : 0;
  const adjustedFull = remainder >= 0.75 ? full + 1 : full;
  const empty = MAX_RATING - adjustedFull - half;

  return {
    full: adjustedFull,
    half,
    empty: Math.max(0, empty),
  };
}

/**
 * Formats review count with K/M suffixes for large numbers
 *
 * @param count - Review count
 * @returns Formatted count string or null if invalid
 *
 * @example
 * formatReviewCount(100) // '100'
 * formatReviewCount(1500) // '1.5K'
 * formatReviewCount(1500000) // '1.5M'
 * formatReviewCount(null) // null
 */
export function formatReviewCount(count: number | null | undefined): string | null {
  const validCount = validateReviewCount(count);

  if (validCount === null) {
    return null;
  }

  if (validCount === 0) {
    return '0';
  }

  // Less than 1000
  if (validCount < 1000) {
    return validCount.toString();
  }

  // Thousands (K)
  if (validCount < 1000000) {
    const thousands = validCount / 1000;
    if (thousands % 1 === 0) {
      return `${thousands}K`;
    }
    // Round down to 1 decimal place to avoid 1000.0K
    const rounded = Math.floor(thousands * 10) / 10;
    return `${rounded.toFixed(1)}K`;
  }

  // Millions (M)
  const millions = validCount / 1000000;
  if (millions % 1 === 0) {
    return `${millions}M`;
  }
  // Round down to 1 decimal place to avoid 1000.0M
  const rounded = Math.floor(millions * 10) / 10;
  return `${rounded.toFixed(1)}M`;
}

/**
 * Gets a review count display text
 *
 * @param count - Review count
 * @param showZero - Whether to show "0 reviews" or null for zero count
 * @returns Formatted review count text
 *
 * @example
 * getReviewCountText(100) // '100 reviews'
 * getReviewCountText(1) // '1 review'
 * getReviewCountText(0) // null
 * getReviewCountText(0, true) // '0 reviews'
 * getReviewCountText(1500) // '1.5K reviews'
 */
export function getReviewCountText(
  count: number | null | undefined,
  showZero: boolean = false
): string | null {
  const validCount = validateReviewCount(count);

  if (validCount === null || (validCount === 0 && !showZero)) {
    return null;
  }

  const formattedCount = formatReviewCount(validCount);

  if (!formattedCount) {
    return null;
  }

  const reviewText = validCount === 1 ? 'review' : 'reviews';
  return `${formattedCount} ${reviewText}`;
}

/**
 * Calculates rating percentage (for progress bars, etc.)
 *
 * @param rating - Rating value
 * @returns Percentage (0-100) or null if invalid
 *
 * @example
 * getRatingPercentage(4.5) // 90
 * getRatingPercentage(5) // 100
 * getRatingPercentage(0) // 0
 */
export function getRatingPercentage(rating: number | null | undefined): number | null {
  const validRating = validateRating(rating);

  if (validRating === null) {
    return null;
  }

  return Math.round((validRating / MAX_RATING) * 100);
}

/**
 * Gets a rating color based on the rating value
 *
 * @param rating - Rating value
 * @returns Color code for the rating
 *
 * @example
 * getRatingColor(4.5) // '#4CAF50' (green)
 * getRatingColor(3.5) // '#FFC107' (amber)
 * getRatingColor(2) // '#F44336' (red)
 */
export function getRatingColor(rating: number | null | undefined): string {
  const validRating = validateRating(rating);

  if (validRating === null) {
    return '#9E9E9E'; // Gray for invalid/no rating
  }

  // Excellent: 4.5-5 (green)
  if (validRating >= 4.5) {
    return '#4CAF50';
  }

  // Good: 3.5-4.4 (light green)
  if (validRating >= 3.5) {
    return '#8BC34A';
  }

  // Average: 2.5-3.4 (amber)
  if (validRating >= 2.5) {
    return '#FFC107';
  }

  // Below Average: 1.5-2.4 (orange)
  if (validRating >= 1.5) {
    return '#FF9800';
  }

  // Poor: 0-1.4 (red)
  return '#F44336';
}

/**
 * Gets a rating category label
 *
 * @param rating - Rating value
 * @returns Category label string
 *
 * @example
 * getRatingCategory(4.5) // 'Excellent'
 * getRatingCategory(3.5) // 'Good'
 * getRatingCategory(2.5) // 'Average'
 */
export function getRatingCategory(rating: number | null | undefined): string {
  const validRating = validateRating(rating);

  if (validRating === null) {
    return 'No rating';
  }

  if (validRating >= 4.5) return 'Excellent';
  if (validRating >= 3.5) return 'Good';
  if (validRating >= 2.5) return 'Average';
  if (validRating >= 1.5) return 'Below Average';
  return 'Poor';
}

/**
 * Formats a complete rating display with all components
 *
 * @param rating - Rating value
 * @param reviewCount - Review count
 * @returns Object with formatted rating components
 *
 * @example
 * formatRatingDisplay(4.5, 120)
 * // {
 * //   value: 4.5,
 * //   display: '4.5 (120)',
 * //   stars: { full: 4, half: 1, empty: 0 },
 * //   reviewText: '120 reviews',
 * //   percentage: 90,
 * //   color: '#4CAF50',
 * //   category: 'Excellent'
 * // }
 */
export function formatRatingDisplay(
  rating: number | null | undefined,
  reviewCount?: number | null | undefined
): {
  value: number | null;
  display: string | null;
  stars: { full: number; half: number; empty: number };
  reviewText: string | null;
  percentage: number | null;
  color: string;
  category: string;
} {
  return {
    value: formatRating(rating),
    display: getRatingDisplay(rating, reviewCount),
    stars: getStarDisplay(rating),
    reviewText: getReviewCountText(reviewCount),
    percentage: getRatingPercentage(rating),
    color: getRatingColor(rating),
    category: getRatingCategory(rating),
  };
}

/**
 * Compares two ratings
 *
 * @param rating1 - First rating
 * @param rating2 - Second rating
 * @returns 1 if rating1 > rating2, -1 if rating1 < rating2, 0 if equal, null if invalid
 *
 * @example
 * compareRating(4.5, 3.5) // 1
 * compareRating(3.5, 4.5) // -1
 * compareRating(4.5, 4.5) // 0
 */
export function compareRating(
  rating1: number | null | undefined,
  rating2: number | null | undefined
): 1 | -1 | 0 | null {
  const valid1 = validateRating(rating1);
  const valid2 = validateRating(rating2);

  if (valid1 === null || valid2 === null) {
    return null;
  }

  if (valid1 > valid2) return 1;
  if (valid1 < valid2) return -1;
  return 0;
}

/**
 * Checks if a rating is within a given range
 *
 * @param rating - Rating to check
 * @param minRating - Minimum rating (inclusive)
 * @param maxRating - Maximum rating (inclusive)
 * @returns True if within range, false otherwise
 *
 * @example
 * isRatingInRange(4.5, 4, 5) // true
 * isRatingInRange(3.5, 4, 5) // false
 */
export function isRatingInRange(
  rating: number | null | undefined,
  minRating: number | null | undefined,
  maxRating: number | null | undefined
): boolean {
  const validRating = validateRating(rating);
  const validMin = validateRating(minRating);
  const validMax = validateRating(maxRating);

  if (validRating === null) {
    return false;
  }

  if (validMin !== null && validRating < validMin) {
    return false;
  }

  if (validMax !== null && validRating > validMax) {
    return false;
  }

  return true;
}

/**
 * Calculates average rating from an array of ratings
 *
 * @param ratings - Array of rating values
 * @returns Average rating or null if invalid
 *
 * @example
 * calculateAverageRating([4, 5, 3, 4]) // 4.0
 * calculateAverageRating([]) // null
 */
export function calculateAverageRating(ratings: number[]): number | null {
  if (!Array.isArray(ratings) || ratings.length === 0) {
    return null;
  }

  const validRatings = ratings.map(validateRating).filter((r): r is number => r !== null);

  if (validRatings.length === 0) {
    return null;
  }

  const sum = validRatings.reduce((acc, r) => acc + r, 0);
  const average = sum / validRatings.length;

  return formatRating(average);
}

/**
 * Gets rating distribution (how many 5-star, 4-star, etc.)
 *
 * @param ratings - Array of rating values
 * @returns Object with count for each star rating
 *
 * @example
 * getRatingDistribution([5, 4, 5, 3, 4, 5])
 * // { 5: 3, 4: 2, 3: 1, 2: 0, 1: 0 }
 */
export function getRatingDistribution(ratings: number[]): Record<number, number> {
  const distribution: Record<number, number> = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  if (!Array.isArray(ratings) || ratings.length === 0) {
    return distribution;
  }

  ratings.forEach((rating) => {
    const valid = validateRating(rating);
    if (valid !== null) {
      const rounded = Math.round(valid);
      if (rounded >= 1 && rounded <= 5) {
        distribution[rounded]++;
      }
    }
  });

  return distribution;
}
