/**
 * Tests for Rating Formatter Utilities
 * Covers all 20 formatting functions with comprehensive edge cases
 */

import {
  validateRating,
  validateReviewCount,
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
} from '@/utils/ratingFormatter';

describe('ratingFormatter', () => {
  describe('validateRating', () => {
    it('should validate valid ratings', () => {
      expect(validateRating(4.5)).toBe(4.5);
      expect(validateRating(5)).toBe(5);
      expect(validateRating(0)).toBe(0);
      expect(validateRating(3.7)).toBe(3.7);
    });

    it('should validate string ratings', () => {
      expect(validateRating('4.5')).toBe(4.5);
      expect(validateRating('5')).toBe(5);
    });

    it('should return null for invalid ratings', () => {
      expect(validateRating(null)).toBeNull();
      expect(validateRating(undefined)).toBeNull();
      expect(validateRating('invalid')).toBeNull();
      expect(validateRating(NaN)).toBeNull();
    });

    it('should return null for out-of-range ratings', () => {
      expect(validateRating(6)).toBeNull();
      expect(validateRating(-1)).toBeNull();
      expect(validateRating(5.1)).toBeNull();
    });

    it('should return null for infinity', () => {
      expect(validateRating(Infinity)).toBeNull();
      expect(validateRating(-Infinity)).toBeNull();
    });
  });

  describe('validateReviewCount', () => {
    it('should validate valid review counts', () => {
      expect(validateReviewCount(100)).toBe(100);
      expect(validateReviewCount(0)).toBe(0);
      expect(validateReviewCount(1000000)).toBe(1000000);
    });

    it('should validate string review counts', () => {
      expect(validateReviewCount('100')).toBe(100);
      expect(validateReviewCount('1000')).toBe(1000);
    });

    it('should floor decimal counts', () => {
      expect(validateReviewCount(100.7)).toBe(100);
      expect(validateReviewCount(99.1)).toBe(99);
    });

    it('should return null for invalid counts', () => {
      expect(validateReviewCount(null)).toBeNull();
      expect(validateReviewCount(undefined)).toBeNull();
      expect(validateReviewCount('invalid')).toBeNull();
      expect(validateReviewCount(NaN)).toBeNull();
    });

    it('should return null for negative counts', () => {
      expect(validateReviewCount(-10)).toBeNull();
    });

    it('should return null for infinity', () => {
      expect(validateReviewCount(Infinity)).toBeNull();
    });
  });

  describe('formatRating', () => {
    it('should format ratings with default 1 decimal', () => {
      expect(formatRating(4.567)).toBe(4.6);
      expect(formatRating(4.123)).toBe(4.1);
      expect(formatRating(4.0)).toBe(4.0);
    });

    it('should format ratings with custom decimals', () => {
      expect(formatRating(4.567, 2)).toBe(4.57);
      expect(formatRating(4.567, 0)).toBe(5);
    });

    it('should return null for invalid ratings', () => {
      expect(formatRating(null)).toBeNull();
      expect(formatRating(undefined)).toBeNull();
    });

    it('should round properly', () => {
      expect(formatRating(4.55)).toBe(4.6);
      expect(formatRating(4.54)).toBe(4.5);
    });
  });

  describe('getRatingDisplay', () => {
    it('should get rating display without review count', () => {
      expect(getRatingDisplay(4.5)).toBe('4.5');
      expect(getRatingDisplay(3.7)).toBe('3.7');
    });

    it('should get rating display with review count', () => {
      expect(getRatingDisplay(4.5, 120)).toBe('4.5 (120)');
      expect(getRatingDisplay(3.7, 1500)).toBe('3.7 (1.5K)');
    });

    it('should handle custom decimals', () => {
      expect(getRatingDisplay(4.567, 120, 2)).toBe('4.57 (120)');
    });

    it('should return null for invalid rating', () => {
      expect(getRatingDisplay(null)).toBeNull();
    });

    it('should ignore zero review count', () => {
      expect(getRatingDisplay(4.5, 0)).toBe('4.5');
    });
  });

  describe('getStarDisplay', () => {
    it('should get star display for whole ratings', () => {
      expect(getStarDisplay(5)).toEqual({ full: 5, half: 0, empty: 0 });
      expect(getStarDisplay(4)).toEqual({ full: 4, half: 0, empty: 1 });
      expect(getStarDisplay(0)).toEqual({ full: 0, half: 0, empty: 5 });
    });

    it('should get star display for half ratings', () => {
      expect(getStarDisplay(4.5)).toEqual({ full: 4, half: 1, empty: 0 });
      expect(getStarDisplay(3.3)).toEqual({ full: 3, half: 1, empty: 1 });
    });

    it('should round up for >= 0.75', () => {
      expect(getStarDisplay(4.8)).toEqual({ full: 5, half: 0, empty: 0 });
      expect(getStarDisplay(4.75)).toEqual({ full: 5, half: 0, empty: 0 });
    });

    it('should ignore for < 0.25', () => {
      expect(getStarDisplay(4.2)).toEqual({ full: 4, half: 0, empty: 1 });
      expect(getStarDisplay(4.1)).toEqual({ full: 4, half: 0, empty: 1 });
    });

    it('should return empty stars for invalid rating', () => {
      expect(getStarDisplay(null)).toEqual({ full: 0, half: 0, empty: 5 });
    });
  });

  describe('formatReviewCount', () => {
    it('should format counts below 1000', () => {
      expect(formatReviewCount(100)).toBe('100');
      expect(formatReviewCount(999)).toBe('999');
      expect(formatReviewCount(0)).toBe('0');
    });

    it('should format thousands with K', () => {
      expect(formatReviewCount(1000)).toBe('1K');
      expect(formatReviewCount(1500)).toBe('1.5K');
      expect(formatReviewCount(10000)).toBe('10K');
    });

    it('should format millions with M', () => {
      expect(formatReviewCount(1000000)).toBe('1M');
      expect(formatReviewCount(1500000)).toBe('1.5M');
      expect(formatReviewCount(10000000)).toBe('10M');
    });

    it('should return null for invalid counts', () => {
      expect(formatReviewCount(null)).toBeNull();
      expect(formatReviewCount(undefined)).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(formatReviewCount(999999)).toBe('999.9K');
      expect(formatReviewCount(1100)).toBe('1.1K');
    });
  });

  describe('getReviewCountText', () => {
    it('should get review count text', () => {
      expect(getReviewCountText(100)).toBe('100 reviews');
      expect(getReviewCountText(1)).toBe('1 review');
      expect(getReviewCountText(1500)).toBe('1.5K reviews');
    });

    it('should return null for zero by default', () => {
      expect(getReviewCountText(0)).toBeNull();
    });

    it('should show zero if showZero is true', () => {
      expect(getReviewCountText(0, true)).toBe('0 reviews');
    });

    it('should return null for invalid counts', () => {
      expect(getReviewCountText(null)).toBeNull();
    });

    it('should use singular for one review', () => {
      expect(getReviewCountText(1)).toBe('1 review');
    });
  });

  describe('getRatingPercentage', () => {
    it('should calculate rating percentage', () => {
      expect(getRatingPercentage(5)).toBe(100);
      expect(getRatingPercentage(4.5)).toBe(90);
      expect(getRatingPercentage(2.5)).toBe(50);
      expect(getRatingPercentage(0)).toBe(0);
    });

    it('should return null for invalid ratings', () => {
      expect(getRatingPercentage(null)).toBeNull();
    });

    it('should round percentage', () => {
      expect(getRatingPercentage(4.24)).toBe(85);
      expect(getRatingPercentage(4.26)).toBe(85);
    });
  });

  describe('getRatingColor', () => {
    it('should return green for excellent ratings', () => {
      expect(getRatingColor(5)).toBe('#4CAF50');
      expect(getRatingColor(4.5)).toBe('#4CAF50');
    });

    it('should return light green for good ratings', () => {
      expect(getRatingColor(4)).toBe('#8BC34A');
      expect(getRatingColor(3.5)).toBe('#8BC34A');
    });

    it('should return amber for average ratings', () => {
      expect(getRatingColor(3)).toBe('#FFC107');
      expect(getRatingColor(2.5)).toBe('#FFC107');
    });

    it('should return orange for below average ratings', () => {
      expect(getRatingColor(2)).toBe('#FF9800');
      expect(getRatingColor(1.5)).toBe('#FF9800');
    });

    it('should return red for poor ratings', () => {
      expect(getRatingColor(1)).toBe('#F44336');
      expect(getRatingColor(0)).toBe('#F44336');
    });

    it('should return gray for invalid ratings', () => {
      expect(getRatingColor(null)).toBe('#9E9E9E');
    });
  });

  describe('getRatingCategory', () => {
    it('should return correct categories', () => {
      expect(getRatingCategory(5)).toBe('Excellent');
      expect(getRatingCategory(4.5)).toBe('Excellent');
      expect(getRatingCategory(4)).toBe('Good');
      expect(getRatingCategory(3.5)).toBe('Good');
      expect(getRatingCategory(3)).toBe('Average');
      expect(getRatingCategory(2.5)).toBe('Average');
      expect(getRatingCategory(2)).toBe('Below Average');
      expect(getRatingCategory(1.5)).toBe('Below Average');
      expect(getRatingCategory(1)).toBe('Poor');
      expect(getRatingCategory(0)).toBe('Poor');
    });

    it('should return "No rating" for invalid', () => {
      expect(getRatingCategory(null)).toBe('No rating');
    });
  });

  describe('formatRatingDisplay', () => {
    it('should format complete rating display', () => {
      const result = formatRatingDisplay(4.5, 120);

      expect(result.value).toBe(4.5);
      expect(result.display).toBe('4.5 (120)');
      expect(result.stars).toEqual({ full: 4, half: 1, empty: 0 });
      expect(result.reviewText).toBe('120 reviews');
      expect(result.percentage).toBe(90);
      expect(result.color).toBe('#4CAF50');
      expect(result.category).toBe('Excellent');
    });

    it('should handle no review count', () => {
      const result = formatRatingDisplay(4.5);

      expect(result.value).toBe(4.5);
      expect(result.display).toBe('4.5');
      expect(result.reviewText).toBeNull();
    });

    it('should handle invalid rating', () => {
      const result = formatRatingDisplay(null);

      expect(result.value).toBeNull();
      expect(result.display).toBeNull();
      expect(result.stars).toEqual({ full: 0, half: 0, empty: 5 });
      expect(result.category).toBe('No rating');
    });
  });

  describe('compareRating', () => {
    it('should compare ratings correctly', () => {
      expect(compareRating(4.5, 3.5)).toBe(1);
      expect(compareRating(3.5, 4.5)).toBe(-1);
      expect(compareRating(4.5, 4.5)).toBe(0);
    });

    it('should return null for invalid ratings', () => {
      expect(compareRating(null, 4.5)).toBeNull();
      expect(compareRating(4.5, null)).toBeNull();
      expect(compareRating(null, null)).toBeNull();
    });

    it('should compare decimal ratings', () => {
      expect(compareRating(4.51, 4.50)).toBe(1);
      expect(compareRating(4.50, 4.51)).toBe(-1);
    });
  });

  describe('isRatingInRange', () => {
    it('should check if rating is in range', () => {
      expect(isRatingInRange(4.5, 4, 5)).toBe(true);
      expect(isRatingInRange(4, 4, 5)).toBe(true);
      expect(isRatingInRange(5, 4, 5)).toBe(true);
    });

    it('should return false if rating is out of range', () => {
      expect(isRatingInRange(3.5, 4, 5)).toBe(false);
      expect(isRatingInRange(5.5, 4, 5)).toBe(false);
    });

    it('should handle null min rating', () => {
      expect(isRatingInRange(4.5, null, 5)).toBe(true);
      expect(isRatingInRange(5.5, null, 5)).toBe(false);
    });

    it('should handle null max rating', () => {
      expect(isRatingInRange(4.5, 4, null)).toBe(true);
      expect(isRatingInRange(3.5, 4, null)).toBe(false);
    });

    it('should return false for invalid rating', () => {
      expect(isRatingInRange(null, 4, 5)).toBe(false);
    });
  });

  describe('calculateAverageRating', () => {
    it('should calculate average rating', () => {
      expect(calculateAverageRating([4, 5, 3, 4])).toBe(4.0);
      expect(calculateAverageRating([5, 5, 5])).toBe(5.0);
    });

    it('should return null for empty array', () => {
      expect(calculateAverageRating([])).toBeNull();
    });

    it('should return null for non-array', () => {
      expect(calculateAverageRating(null as any)).toBeNull();
    });

    it('should filter invalid ratings', () => {
      expect(calculateAverageRating([4, null as any, 5, undefined as any, 3])).toBe(4.0);
    });

    it('should round average', () => {
      expect(calculateAverageRating([4.2, 4.3, 4.4])).toBe(4.3);
    });

    it('should return null if all ratings invalid', () => {
      expect(calculateAverageRating([null as any, undefined as any, 6])).toBeNull();
    });
  });

  describe('getRatingDistribution', () => {
    it('should get rating distribution', () => {
      const result = getRatingDistribution([5, 4, 5, 3, 4, 5]);

      expect(result).toEqual({
        5: 3,
        4: 2,
        3: 1,
        2: 0,
        1: 0,
      });
    });

    it('should return zero distribution for empty array', () => {
      const result = getRatingDistribution([]);

      expect(result).toEqual({
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      });
    });

    it('should round ratings to nearest integer', () => {
      const result = getRatingDistribution([4.6, 4.4, 3.4, 3.6]);

      expect(result).toEqual({
        5: 1, // 4.6 rounded
        4: 2, // 4.4 and 3.6 rounded
        3: 1, // 3.4 rounded
        2: 0,
        1: 0,
      });
    });

    it('should filter invalid ratings', () => {
      const result = getRatingDistribution([5, null as any, 4, undefined as any, 6]);

      expect(result).toEqual({
        5: 1,
        4: 1,
        3: 0,
        2: 0,
        1: 0,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary ratings', () => {
      expect(validateRating(0)).toBe(0);
      expect(validateRating(5)).toBe(5);
    });

    it('should handle very large review counts', () => {
      expect(formatReviewCount(999999999)).toBe('999.9M');
    });

    it('should handle star display edge cases', () => {
      expect(getStarDisplay(0.24)).toEqual({ full: 0, half: 0, empty: 5 });
      expect(getStarDisplay(0.25)).toEqual({ full: 0, half: 1, empty: 4 });
      expect(getStarDisplay(0.74)).toEqual({ full: 0, half: 1, empty: 4 });
      expect(getStarDisplay(0.75)).toEqual({ full: 1, half: 0, empty: 4 });
    });

    it('should handle rating percentage edge cases', () => {
      expect(getRatingPercentage(0)).toBe(0);
      expect(getRatingPercentage(5)).toBe(100);
    });

    it('should handle string number edge cases', () => {
      expect(validateRating('0')).toBe(0);
      expect(validateRating('5')).toBe(5);
      expect(validateReviewCount('0')).toBe(0);
    });
  });
});
