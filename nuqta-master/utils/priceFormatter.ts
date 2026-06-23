/**
 * Price Formatting Utilities
 *
 * This module provides functions for formatting prices, calculating discounts,
 * and validating price data across the application.
 */

/**
 * Default currency symbol
 */
const DEFAULT_CURRENCY = '₹';

/**
 * Supported currency symbols and their codes
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '\u20B9', // ₹
  USD: '$',
  EUR: '\u20AC', // €
  GBP: '\u00A3', // £
  JPY: '\u00A5', // ¥
  AUD: 'A$',
  CAD: 'C$',
  AED: '\u062F.\u0625', // د.إ (UAE Dirham)
  CNY: '\u00A5', // ¥ (Chinese Yuan - same symbol as JPY)
  SGD: 'S$',
  SAR: '\u0631.\u0633', // ر.س (Saudi Riyal)
};

/**
 * Locale mapping for proper number formatting
 */
const CURRENCY_LOCALES: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-US',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  AUD: 'en-AU',
  CAD: 'en-CA',
  AED: 'en-AE',
  CNY: 'zh-CN',
  SGD: 'en-SG',
  SAR: 'ar-SA',
};

/**
 * Validates if a price value is valid
 *
 * @param price - Price value to validate
 * @returns Valid number or null if invalid
 *
 * @example
 * validatePrice(100) // 100
 * validatePrice('100') // 100
 * validatePrice(null) // null
 * validatePrice(undefined) // null
 * validatePrice(-10) // null
 */
export function validatePrice(price: any): number | null {
  // Handle null/undefined
  if (price == null) {
    return null;
  }

  // Convert to number if string
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  // Check if valid number
  if (typeof numPrice !== 'number' || isNaN(numPrice)) {
    return null;
  }

  // Check if positive (prices cannot be negative)
  if (numPrice < 0) {
    return null;
  }

  // Check for infinity
  if (!isFinite(numPrice)) {
    return null;
  }

  return numPrice;
}

/**
 * Formats a price value with currency symbol and proper decimal places
 *
 * @param price - Price value to format
 * @param currency - Currency code (INR, USD, EUR, etc.) or custom symbol
 * @param showDecimals - Whether to show decimal places (default: true)
 * @returns Formatted price string or null if invalid
 *
 * @example
 * formatPrice(1234.56) // '₹1,234.56'
 * formatPrice(1234.56, 'USD') // '$1,234.56'
 * formatPrice(1234, 'INR', false) // '₹1,234'
 * formatPrice(null) // null
 * formatPrice(0) // '₹0.00'
 */
export function formatPrice(
  price: number | null | undefined,
  currency: string = 'INR',
  showDecimals: boolean = true
): string | null {
  const validPrice = validatePrice(price);

  if (validPrice === null) {
    return null;
  }

  // Get currency symbol and locale
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency || DEFAULT_CURRENCY;
  let locale = CURRENCY_LOCALES[currency] || 'en-IN';

  // For very large numbers (>= 100 million / 10 crore) in INR, use en-US locale
  // to get standard international comma grouping (999,999,999) rather than the
  // Indian lakh/crore grouping (99,99,99,999). This keeps formatting
  // consistent for huge totals and avoids ambiguity.
  if (currency === 'INR' && validPrice >= 100000000) {
    locale = 'en-US';
  }

  // Format with decimals or without
  const decimals = showDecimals ? 2 : 0;

  try {
    // Try using Intl.NumberFormat for better localization
    const formattedNumber = validPrice.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return `${currencySymbol}${formattedNumber}`;
  } catch {
    // Fallback to basic formatting
    const formattedNumber = validPrice.toFixed(decimals);
    return `${currencySymbol}${formattedNumber}`;
  }
}

/**
 * Formats a price with full Intl.NumberFormat currency support
 * This uses the native currency formatting for the specified currency
 *
 * @param price - Price value to format
 * @param currency - Currency code (INR, USD, AED, CNY, etc.)
 * @returns Formatted price string with native currency formatting
 *
 * @example
 * formatPriceIntl(1234.56, 'AED') // 'AED 1,234.56' or 'د.إ 1,234.56' depending on locale
 * formatPriceIntl(1234.56, 'CNY') // '¥1,234.56'
 */
export function formatPriceIntl(
  price: number | null | undefined,
  currency: string = 'INR'
): string | null {
  const validPrice = validatePrice(price);

  if (validPrice === null) {
    return null;
  }

  const locale = CURRENCY_LOCALES[currency] || 'en-IN';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(validPrice);
  } catch {
    // Fallback to basic formatting
    const currencySymbol = CURRENCY_SYMBOLS[currency] || currency || DEFAULT_CURRENCY;
    return `${currencySymbol}${validPrice.toFixed(2)}`;
  }
}

/**
 * Formats a price range (min-max)
 *
 * @param minPrice - Minimum price
 * @param maxPrice - Maximum price
 * @param currency - Currency code
 * @returns Formatted price range or single price if min equals max
 *
 * @example
 * formatPriceRange(100, 200) // '₹100 - ₹200'
 * formatPriceRange(100, 100) // '₹100.00'
 * formatPriceRange(null, 200) // '₹200.00'
 */
export function formatPriceRange(
  minPrice: number | null | undefined,
  maxPrice: number | null | undefined,
  currency: string = 'INR'
): string | null {
  const validMin = validatePrice(minPrice);
  const validMax = validatePrice(maxPrice);

  // If both are null, return null
  if (validMin === null && validMax === null) {
    return null;
  }

  // If only one is valid, format that one
  if (validMin === null) {
    return formatPrice(validMax, currency);
  }

  if (validMax === null) {
    return formatPrice(validMin, currency);
  }

  // If both are equal, show single price
  if (validMin === validMax) {
    return formatPrice(validMin, currency);
  }

  // Format range
  const formattedMin = formatPrice(validMin, currency);
  const formattedMax = formatPrice(validMax, currency);

  return `${formattedMin} - ${formattedMax}`;
}

/**
 * Calculates discount percentage between original and current price
 *
 * @param originalPrice - Original/MRP price
 * @param currentPrice - Current/selling price
 * @returns Discount percentage (rounded) or null if invalid
 *
 * @example
 * formatDiscount(100, 80) // 20
 * formatDiscount(100, 100) // 0
 * formatDiscount(100, 120) // null (current price higher than original)
 * formatDiscount(null, 80) // null
 */
export function formatDiscount(
  originalPrice: number | null | undefined,
  currentPrice: number | null | undefined
): number | null {
  const validOriginal = validatePrice(originalPrice);
  const validCurrent = validatePrice(currentPrice);

  // Both prices must be valid
  if (validOriginal === null || validCurrent === null) {
    return null;
  }

  // Original price must be greater than current price
  if (validOriginal <= validCurrent) {
    return null;
  }

  // Avoid division by zero
  if (validOriginal === 0) {
    return null;
  }

  // Calculate percentage
  const discountPercent = ((validOriginal - validCurrent) / validOriginal) * 100;

  // Round to nearest integer
  return Math.round(discountPercent);
}

/**
 * Formats discount as a string with percentage symbol
 *
 * @param originalPrice - Original/MRP price
 * @param currentPrice - Current/selling price
 * @returns Formatted discount string or null if invalid
 *
 * @example
 * formatDiscountString(100, 80) // '20% OFF'
 * formatDiscountString(100, 100) // null
 */
export function formatDiscountString(
  originalPrice: number | null | undefined,
  currentPrice: number | null | undefined
): string | null {
  const discount = formatDiscount(originalPrice, currentPrice);

  if (discount === null || discount === 0) {
    return null;
  }

  return `${discount}% OFF`;
}

/**
 * Calculates the amount saved between original and current price
 *
 * @param originalPrice - Original/MRP price
 * @param currentPrice - Current/selling price
 * @returns Amount saved or null if invalid
 *
 * @example
 * calculateSavings(100, 80) // 20
 * calculateSavings(100, 100) // 0
 */
export function calculateSavings(
  originalPrice: number | null | undefined,
  currentPrice: number | null | undefined
): number | null {
  const validOriginal = validatePrice(originalPrice);
  const validCurrent = validatePrice(currentPrice);

  if (validOriginal === null || validCurrent === null) {
    return null;
  }

  if (validOriginal <= validCurrent) {
    return 0;
  }

  return validOriginal - validCurrent;
}

/**
 * Formats savings amount with currency
 *
 * @param originalPrice - Original/MRP price
 * @param currentPrice - Current/selling price
 * @param currency - Currency code
 * @returns Formatted savings string or null if invalid
 *
 * @example
 * formatSavings(100, 80) // 'Save ₹20.00'
 * formatSavings(100, 100) // null
 */
export function formatSavings(
  originalPrice: number | null | undefined,
  currentPrice: number | null | undefined,
  currency: string = 'INR'
): string | null {
  const savings = calculateSavings(originalPrice, currentPrice);

  if (savings === null || savings === 0) {
    return null;
  }

  const formattedSavings = formatPrice(savings, currency);

  if (!formattedSavings) {
    return null;
  }

  return `Save ${formattedSavings}`;
}

/**
 * Formats a complete price display with original, current, and discount
 *
 * @param originalPrice - Original/MRP price
 * @param currentPrice - Current/selling price
 * @param currency - Currency code
 * @returns Object with formatted price components
 *
 * @example
 * formatPriceDisplay(100, 80)
 * // {
 * //   current: '₹80.00',
 * //   original: '₹100.00',
 * //   discount: '20% OFF',
 * //   savings: 'Save ₹20.00'
 * // }
 */
export function formatPriceDisplay(
  originalPrice: number | null | undefined,
  currentPrice: number | null | undefined,
  currency: string = 'INR'
): {
  current: string | null;
  original: string | null;
  discount: string | null;
  savings: string | null;
} {
  return {
    current: formatPrice(currentPrice, currency),
    original: formatPrice(originalPrice, currency),
    discount: formatDiscountString(originalPrice, currentPrice),
    savings: formatSavings(originalPrice, currentPrice, currency),
  };
}

/**
 * Parses a price string and extracts the numeric value
 *
 * @param priceString - Price string (e.g., '₹1,234.56' or '$100')
 * @returns Numeric price value or null if invalid
 *
 * @example
 * parsePrice('₹1,234.56') // 1234.56
 * parsePrice('$100') // 100
 * parsePrice('invalid') // null
 */
export function parsePrice(priceString: string | null | undefined): number | null {
  if (!priceString || typeof priceString !== 'string') {
    return null;
  }

  // Remove all currency symbols (including Arabic), spaces, and currency codes
  // This regex removes: ₹ $ € £ ¥ د.إ ر.س A$ C$ S$ and common currency codes
  // Note: We do NOT strip commas/dots globally because they have semantic meaning
  // (thousands separator vs decimal separator). Instead we detect the last
  // separator and treat it as the decimal point if it appears once with 1-2 digits after.
  const sanitized = priceString
    .replace(/[₹$€£¥\s]/g, '')
    .replace(/[دإ]/g, '')
    .replace(/[رس]/g, '')
    .replace(/A\$/g, '')
    .replace(/C\$/g, '')
    .replace(/S\$/g, '')
    .replace(/AED|INR|USD|EUR|GBP|CNY|JPY|SAR|SGD/gi, '')
    .trim();

  // Detect decimal separator: if both ',' and '.' are present, the rightmost
  // one is the decimal separator. If only one type is present, treat a single
  // occurrence with 1-2 trailing digits as a decimal separator (US format),
  // otherwise treat it as a thousands separator.
  let cleaned = sanitized;
  const hasComma = sanitized.includes(',');
  const hasDot = sanitized.includes('.');

  if (hasComma && hasDot) {
    // Use the rightmost separator as the decimal point
    const lastComma = sanitized.lastIndexOf(',');
    const lastDot = sanitized.lastIndexOf('.');
    if (lastDot > lastComma) {
      // Dot is decimal, comma is thousands
      cleaned = sanitized.replace(/,/g, '');
    } else {
      // Comma is decimal, dot is thousands
      cleaned = sanitized.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma) {
    // Only commas present. If exactly one comma with 1-2 digits after it,
    // treat it as a decimal separator; otherwise treat all as thousands.
    const commaMatches = sanitized.match(/,/g) || [];
    if (commaMatches.length === 1) {
      const afterComma = sanitized.split(',')[1];
      if (afterComma && afterComma.length <= 2) {
        cleaned = sanitized.replace(',', '.');
      } else {
        cleaned = sanitized.replace(/,/g, '');
      }
    } else {
      cleaned = sanitized.replace(/,/g, '');
    }
  } else {
    // Only dots (or none) - dots are decimal separators
    cleaned = sanitized;
  }

  // Parse as float
  const parsed = parseFloat(cleaned);

  return validatePrice(parsed);
}

/**
 * Compares two prices and returns comparison result
 *
 * @param price1 - First price
 * @param price2 - Second price
 * @returns 1 if price1 > price2, -1 if price1 < price2, 0 if equal, null if invalid
 *
 * @example
 * comparePrice(100, 80) // 1
 * comparePrice(80, 100) // -1
 * comparePrice(100, 100) // 0
 */
export function comparePrice(
  price1: number | null | undefined,
  price2: number | null | undefined
): 1 | -1 | 0 | null {
  const valid1 = validatePrice(price1);
  const valid2 = validatePrice(price2);

  if (valid1 === null || valid2 === null) {
    return null;
  }

  if (valid1 > valid2) return 1;
  if (valid1 < valid2) return -1;
  return 0;
}

/**
 * Checks if a price is within a given range
 *
 * @param price - Price to check
 * @param minPrice - Minimum price (inclusive)
 * @param maxPrice - Maximum price (inclusive)
 * @returns True if within range, false otherwise
 *
 * @example
 * isPriceInRange(50, 0, 100) // true
 * isPriceInRange(150, 0, 100) // false
 */
export function isPriceInRange(
  price: number | null | undefined,
  minPrice: number | null | undefined,
  maxPrice: number | null | undefined
): boolean {
  const validPrice = validatePrice(price);
  const validMin = validatePrice(minPrice);
  const validMax = validatePrice(maxPrice);

  if (validPrice === null) {
    return false;
  }

  if (validMin !== null && validPrice < validMin) {
    return false;
  }

  if (validMax !== null && validPrice > validMax) {
    return false;
  }

  return true;
}
