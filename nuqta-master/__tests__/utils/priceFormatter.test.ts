/**
 * Tests for Price Formatter Utilities
 * Covers all 15 formatting functions with comprehensive edge cases
 */

import {
  validatePrice,
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
} from '@/utils/priceFormatter';

describe('priceFormatter', () => {
  describe('validatePrice', () => {
    it('should validate valid number prices', () => {
      expect(validatePrice(100)).toBe(100);
      expect(validatePrice(0)).toBe(0);
      expect(validatePrice(99.99)).toBe(99.99);
    });

    it('should validate string prices', () => {
      expect(validatePrice('100')).toBe(100);
      expect(validatePrice('99.99')).toBe(99.99);
    });

    it('should return null for invalid prices', () => {
      expect(validatePrice(null)).toBeNull();
      expect(validatePrice(undefined)).toBeNull();
      expect(validatePrice('invalid')).toBeNull();
      expect(validatePrice(NaN)).toBeNull();
    });

    it('should return null for negative prices', () => {
      expect(validatePrice(-10)).toBeNull();
      expect(validatePrice(-0.01)).toBeNull();
    });

    it('should return null for infinity', () => {
      expect(validatePrice(Infinity)).toBeNull();
      expect(validatePrice(-Infinity)).toBeNull();
    });
  });

  describe('formatPrice', () => {
    it('should format prices with currency symbol', () => {
      expect(formatPrice(100)).toBe('₹100.00');
      expect(formatPrice(1234.56)).toBe('₹1,234.56');
    });

    it('should format prices with different currencies', () => {
      expect(formatPrice(100, 'USD')).toBe('$100.00');
      expect(formatPrice(100, 'EUR')).toBe('€100.00');
      expect(formatPrice(100, 'GBP')).toBe('£100.00');
    });

    it('should format prices without decimals', () => {
      expect(formatPrice(1234, 'INR', false)).toBe('₹1,234');
      expect(formatPrice(99, 'INR', false)).toBe('₹99');
    });

    it('should handle zero price', () => {
      expect(formatPrice(0)).toBe('₹0.00');
    });

    it('should return null for invalid prices', () => {
      expect(formatPrice(null)).toBeNull();
      expect(formatPrice(undefined)).toBeNull();
      expect(formatPrice(-10)).toBeNull();
    });

    it('should format large numbers with commas', () => {
      expect(formatPrice(1000000)).toBe('₹10,00,000.00');
    });

    it('should handle custom currency symbols', () => {
      expect(formatPrice(100, '¥')).toBe('¥100.00');
    });
  });

  describe('formatPriceRange', () => {
    it('should format price range', () => {
      expect(formatPriceRange(100, 200)).toBe('₹100.00 - ₹200.00');
    });

    it('should format single price when min equals max', () => {
      expect(formatPriceRange(100, 100)).toBe('₹100.00');
    });

    it('should format when only min is valid', () => {
      expect(formatPriceRange(100, null)).toBe('₹100.00');
    });

    it('should format when only max is valid', () => {
      expect(formatPriceRange(null, 200)).toBe('₹200.00');
    });

    it('should return null when both are invalid', () => {
      expect(formatPriceRange(null, null)).toBeNull();
    });

    it('should format with different currencies', () => {
      expect(formatPriceRange(100, 200, 'USD')).toBe('$100.00 - $200.00');
    });
  });

  describe('formatDiscount', () => {
    it('should calculate discount percentage', () => {
      expect(formatDiscount(100, 80)).toBe(20);
      expect(formatDiscount(100, 50)).toBe(50);
      expect(formatDiscount(100, 75)).toBe(25);
    });

    it('should round discount percentage', () => {
      expect(formatDiscount(100, 67)).toBe(33);
      expect(formatDiscount(100, 66)).toBe(34);
    });

    it('should return null when no discount', () => {
      expect(formatDiscount(100, 100)).toBeNull();
      expect(formatDiscount(100, 120)).toBeNull();
    });

    it('should return null for invalid prices', () => {
      expect(formatDiscount(null, 80)).toBeNull();
      expect(formatDiscount(100, null)).toBeNull();
    });

    it('should return null when original price is zero', () => {
      expect(formatDiscount(0, 0)).toBeNull();
    });
  });

  describe('formatDiscountString', () => {
    it('should format discount string', () => {
      expect(formatDiscountString(100, 80)).toBe('20% OFF');
      expect(formatDiscountString(100, 50)).toBe('50% OFF');
    });

    it('should return null when no discount', () => {
      expect(formatDiscountString(100, 100)).toBeNull();
      expect(formatDiscountString(100, 120)).toBeNull();
    });

    it('should return null for invalid prices', () => {
      expect(formatDiscountString(null, 80)).toBeNull();
      expect(formatDiscountString(100, null)).toBeNull();
    });
  });

  describe('calculateSavings', () => {
    it('should calculate savings amount', () => {
      expect(calculateSavings(100, 80)).toBe(20);
      expect(calculateSavings(100, 50)).toBe(50);
    });

    it('should return 0 when no savings', () => {
      expect(calculateSavings(100, 100)).toBe(0);
      expect(calculateSavings(100, 120)).toBe(0);
    });

    it('should return null for invalid prices', () => {
      expect(calculateSavings(null, 80)).toBeNull();
      expect(calculateSavings(100, null)).toBeNull();
    });
  });

  describe('formatSavings', () => {
    it('should format savings with currency', () => {
      expect(formatSavings(100, 80)).toBe('Save ₹20.00');
      expect(formatSavings(100, 50)).toBe('Save ₹50.00');
    });

    it('should return null when no savings', () => {
      expect(formatSavings(100, 100)).toBeNull();
      expect(formatSavings(100, 120)).toBeNull();
    });

    it('should return null for invalid prices', () => {
      expect(formatSavings(null, 80)).toBeNull();
      expect(formatSavings(100, null)).toBeNull();
    });

    it('should format with different currencies', () => {
      expect(formatSavings(100, 80, 'USD')).toBe('Save $20.00');
    });
  });

  describe('formatPriceDisplay', () => {
    it('should format complete price display', () => {
      const result = formatPriceDisplay(100, 80);

      expect(result.current).toBe('₹80.00');
      expect(result.original).toBe('₹100.00');
      expect(result.discount).toBe('20% OFF');
      expect(result.savings).toBe('Save ₹20.00');
    });

    it('should handle no discount', () => {
      const result = formatPriceDisplay(100, 100);

      expect(result.current).toBe('₹100.00');
      expect(result.original).toBe('₹100.00');
      expect(result.discount).toBeNull();
      expect(result.savings).toBeNull();
    });

    it('should handle invalid prices', () => {
      const result = formatPriceDisplay(null, null);

      expect(result.current).toBeNull();
      expect(result.original).toBeNull();
      expect(result.discount).toBeNull();
      expect(result.savings).toBeNull();
    });

    it('should format with different currencies', () => {
      const result = formatPriceDisplay(100, 80, 'USD');

      expect(result.current).toBe('$80.00');
      expect(result.original).toBe('$100.00');
    });
  });

  describe('parsePrice', () => {
    it('should parse price strings', () => {
      expect(parsePrice('₹1,234.56')).toBe(1234.56);
      expect(parsePrice('$100')).toBe(100);
      expect(parsePrice('€99.99')).toBe(99.99);
    });

    it('should parse numbers without symbols', () => {
      expect(parsePrice('1234.56')).toBe(1234.56);
      expect(parsePrice('100')).toBe(100);
    });

    it('should return null for invalid strings', () => {
      expect(parsePrice('')).toBeNull();
      expect(parsePrice(null)).toBeNull();
      expect(parsePrice('invalid')).toBeNull();
    });

    it('should handle prices with spaces', () => {
      expect(parsePrice('₹ 1,234.56')).toBe(1234.56);
      expect(parsePrice('$ 100')).toBe(100);
    });

    it('should return null for negative prices', () => {
      expect(parsePrice('₹-10')).toBeNull();
    });
  });

  describe('comparePrice', () => {
    it('should compare prices correctly', () => {
      expect(comparePrice(100, 80)).toBe(1);
      expect(comparePrice(80, 100)).toBe(-1);
      expect(comparePrice(100, 100)).toBe(0);
    });

    it('should return null for invalid prices', () => {
      expect(comparePrice(null, 100)).toBeNull();
      expect(comparePrice(100, null)).toBeNull();
      expect(comparePrice(null, null)).toBeNull();
    });

    it('should compare decimal prices', () => {
      expect(comparePrice(99.99, 99.98)).toBe(1);
      expect(comparePrice(99.98, 99.99)).toBe(-1);
    });
  });

  describe('isPriceInRange', () => {
    it('should check if price is in range', () => {
      expect(isPriceInRange(50, 0, 100)).toBe(true);
      expect(isPriceInRange(0, 0, 100)).toBe(true);
      expect(isPriceInRange(100, 0, 100)).toBe(true);
    });

    it('should return false if price is out of range', () => {
      expect(isPriceInRange(150, 0, 100)).toBe(false);
      expect(isPriceInRange(-10, 0, 100)).toBe(false);
    });

    it('should handle null min price', () => {
      expect(isPriceInRange(50, null, 100)).toBe(true);
      expect(isPriceInRange(150, null, 100)).toBe(false);
    });

    it('should handle null max price', () => {
      expect(isPriceInRange(50, 0, null)).toBe(true);
      expect(isPriceInRange(-10, 0, null)).toBe(false);
    });

    it('should return false for invalid price', () => {
      expect(isPriceInRange(null, 0, 100)).toBe(false);
    });

    it('should handle both null min and max', () => {
      expect(isPriceInRange(50, null, null)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const result = formatPrice(999999999.99);
      expect(result).not.toBeNull();
      expect(result).toContain('999,999,999.99');
    });

    it('should handle very small decimals', () => {
      const result = formatPrice(0.01);
      expect(result).toBe('₹0.01');
    });

    it('should handle discount calculation edge cases', () => {
      // 99.99% discount
      expect(formatDiscount(10000, 1)).toBe(100);

      // Very small discount
      expect(formatDiscount(1000, 999)).toBe(0);
    });

    it('should handle string number edge cases', () => {
      expect(validatePrice('0')).toBe(0);
      expect(validatePrice('0.00')).toBe(0);
      expect(validatePrice(' 100 ')).toBe(100);
    });

    it('should handle price range edge cases', () => {
      expect(formatPriceRange(0, 0)).toBe('₹0.00');
      expect(formatPriceRange(0.01, 0.02)).toBe('₹0.01 - ₹0.02');
    });
  });
});
