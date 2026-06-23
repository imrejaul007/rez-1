/**
 * Price Parser Utility
 *
 * Safely parses price strings with currency symbols and formatting
 * Fixes the bug where "View Products" or invalid strings return NaN
 *
 * Usage:
 * ```ts
 * import { parsePrice, formatPrice } from '@/utils/priceParser';
 *
 * const price = parsePrice("₹2,199"); // 2199
 * const price = parsePrice("View Products"); // 0 (safe fallback)
 * const formatted = formatPrice(2199); // "₹2,199"
 * const formatted = formatPrice(2199, 'USD'); // "$2,199"
 * ```
 */

export interface PriceParseOptions {
  /**
   * Fallback value if parsing fails
   * @default 0
   */
  fallback?: number;

  /**
   * Allow negative numbers
   * @default false
   */
  allowNegative?: boolean;

  /**
   * Allow decimal values
   * @default true
   */
  allowDecimal?: boolean;
}

export interface PriceFormatOptions {
  /**
   * Currency symbol or code
   * @default '₹' (Indian Rupee)
   */
  currency?: string;

  /**
   * Show currency symbol
   * @default true
   */
  showCurrency?: boolean;

  /**
   * Use comma thousands separator
   * @default true
   */
  useCommas?: boolean;

  /**
   * Number of decimal places (0 for whole numbers)
   * @default 0
   */
  decimals?: number;
}

/**
 * Parse a price string and return a safe number
 *
 * Handles various formats:
 * - "₹2,199" → 2199
 * - "$1,234.56" → 1234.56
 * - "2199" → 2199
 * - "View Products" → 0 (fallback)
 * - "" → 0 (fallback)
 * - null/undefined → 0 (fallback)
 *
 * @param priceString - The price string to parse
 * @param options - Parse options
 * @returns Parsed price number or fallback value
 */
export function parsePrice(
  priceString: string | number | null | undefined,
  options: PriceParseOptions = {}
): number {
  const {
    fallback = 0,
    allowNegative = false,
    allowDecimal = true,
  } = options;

  // Handle null/undefined
  if (priceString == null) {
    return fallback;
  }

  // If already a number, validate and return
  if (typeof priceString === 'number') {
    if (isNaN(priceString) || !isFinite(priceString)) {
      return fallback;
    }
    if (!allowNegative && priceString < 0) {
      return fallback;
    }
    return priceString;
  }

  // Convert to string and trim
  const cleaned = String(priceString).trim();

  // Handle empty string
  if (cleaned === '') {
    return fallback;
  }

  // Remove currency symbols, commas, and spaces
  // Supports: ₹, $, €, £, ¥, and other common symbols
  let numericString = cleaned
    .replace(/[₹$€£¥₩₪₨₱฿₫﷼]/g, '') // Currency symbols
    .replace(/,/g, '') // Commas
    .replace(/\s/g, ''); // Whitespace

  // Try to parse as number
  const parsed = allowDecimal
    ? parseFloat(numericString)
    : parseInt(numericString, 10);

  // Check if parse failed
  if (isNaN(parsed) || !isFinite(parsed)) {
    return fallback;
  }

  // Check negative constraint
  if (!allowNegative && parsed < 0) {
    return fallback;
  }

  return parsed;
}

/**
 * Format a number as a price string with currency symbol
 *
 * @param amount - The numeric amount to format
 * @param options - Formatting options
 * @returns Formatted price string
 */
export function formatPrice(
  amount: number,
  options: PriceFormatOptions = {}
): string {
  const {
    currency = '₹',
    showCurrency = true,
    useCommas = true,
    decimals = 0,
  } = options;

  // Handle invalid numbers
  if (!isFinite(amount) || isNaN(amount)) {
    return showCurrency ? `${currency}0` : '0';
  }

  // Round to specified decimal places
  const rounded = decimals > 0
    ? amount.toFixed(decimals)
    : Math.round(amount).toString();

  // Add comma separators if enabled
  const formatted = useCommas
    ? rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : rounded;

  // Add currency symbol if enabled
  return showCurrency ? `${currency}${formatted}` : formatted;
}

/**
 * Parse price and return formatted string
 *
 * Useful for cleaning up user input or API data
 *
 * @param priceString - Input price string
 * @param formatOptions - Format options
 * @returns Cleaned and formatted price string
 */
export function cleanPrice(
  priceString: string | number | null | undefined,
  formatOptions: PriceFormatOptions = {}
): string {
  const parsed = parsePrice(priceString);
  return formatPrice(parsed, formatOptions);
}

/**
 * Calculate discount percentage between two prices
 *
 * @param originalPrice - Original price before discount
 * @param salePrice - Sale price after discount
 * @returns Discount percentage (0-100)
 */
export function calculateDiscount(
  originalPrice: number,
  salePrice: number
): number {
  if (originalPrice <= 0 || salePrice < 0 || salePrice > originalPrice) {
    return 0;
  }

  const discount = ((originalPrice - salePrice) / originalPrice) * 100;
  return Math.round(discount);
}

/**
 * Calculate discount amount between two prices
 *
 * @param originalPrice - Original price before discount
 * @param salePrice - Sale price after discount
 * @returns Discount amount
 */
export function calculateDiscountAmount(
  originalPrice: number,
  salePrice: number
): number {
  if (originalPrice <= 0 || salePrice < 0 || salePrice > originalPrice) {
    return 0;
  }

  return originalPrice - salePrice;
}

/**
 * Convert price between currencies (simple conversion, not real-time rates)
 *
 * @param amount - Amount in source currency
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param exchangeRate - Exchange rate (from source to target)
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  return Math.round(amount * exchangeRate);
}

export default {
  parse: parsePrice,
  format: formatPrice,
  clean: cleanPrice,
  calculateDiscount,
  calculateDiscountAmount,
  convertCurrency,
};
