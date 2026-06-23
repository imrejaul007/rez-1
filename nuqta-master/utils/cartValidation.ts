/**
 * Cart Validation Utility
 *
 * Centralized validation logic for cart operations across ProductPage and CartContext.
 * This ensures consistent validation rules and error messages throughout the application.
 */

import { CartItem } from '@/types/cart';
import { IProductVariant } from '@/types/product-variants.types';

// ===========================
// VALIDATION CONSTANTS
// ===========================

/**
 * Maximum quantity allowed per cart item
 */
export const MAX_QUANTITY_PER_ITEM = 10;

/**
 * Minimum quantity allowed per cart item
 */
export const MIN_QUANTITY = 1;

/**
 * Default low stock threshold
 */
export const LOW_STOCK_THRESHOLD = 5;

// ===========================
// VALIDATION TYPES
// ===========================

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Options for cart validation
 */
export interface CartValidationOptions {
  checkStock?: boolean;
  checkVariants?: boolean;
  checkQuantityLimits?: boolean;
  allowBackorder?: boolean;
}

/**
 * Product data for validation (subset of full product details)
 */
export interface ValidatableProduct {
  id: string;
  name: string;
  variants?: IProductVariant[];
  availability?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED';
  inventory?: {
    stock?: number;
    quantity?: number;
    lowStockThreshold?: number;
    trackQuantity?: boolean;
    allowBackorder?: boolean;
  };
}

// ===========================
// VALIDATION ERROR MESSAGES
// ===========================

export const VALIDATION_ERRORS = {
  VARIANT_REQUIRED: 'Please select all product options (size, color, etc.) before adding to cart.',
  OUT_OF_STOCK: 'This product is currently out of stock.',
  INSUFFICIENT_STOCK: (available: number) =>
    `Only ${available} item${available !== 1 ? 's' : ''} available. Please adjust quantity.`,
  QUANTITY_TOO_LOW: `Quantity must be at least ${MIN_QUANTITY}.`,
  QUANTITY_TOO_HIGH: `Maximum ${MAX_QUANTITY_PER_ITEM} items allowed per product.`,
  QUANTITY_EXCEEDS_CART_LIMIT: (currentQty: number, requestedQty: number, maxQty: number) =>
    `Cannot add ${requestedQty} more. You already have ${currentQty} in cart (max: ${maxQty}).`,
  INVALID_CART_ITEM: 'Invalid cart item data.',
  INVALID_PRODUCT: 'Invalid product data.',
  INVALID_QUANTITY: 'Invalid quantity specified.',
} as const;

export const VALIDATION_WARNINGS = {
  LOW_STOCK: (quantity: number) =>
    `Only ${quantity} item${quantity !== 1 ? 's' : ''} left in stock.`,
  APPROACHING_LIMIT: (currentQty: number, maxQty: number) =>
    `You have ${currentQty} of ${maxQty} maximum items in cart.`,
} as const;

// ===========================
// VALIDATION FUNCTIONS
// ===========================

/**
 * Validate if a product can be added to cart
 *
 * @param product - Product to validate
 * @param quantity - Quantity to add
 * @param selectedVariant - Selected variant (if product has variants)
 * @param currentCartQuantity - Current quantity already in cart (optional)
 * @param options - Validation options
 * @returns ValidationResult with valid flag and error message if invalid
 */
export function validateAddToCart(
  product: ValidatableProduct | null | undefined,
  quantity: number,
  selectedVariant?: IProductVariant | null,
  currentCartQuantity: number = 0,
  options: CartValidationOptions = {}
): ValidationResult {
  const {
    checkStock = true,
    checkVariants = true,
    checkQuantityLimits = true,
  } = options;

  // Validate product exists
  if (!product) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.INVALID_PRODUCT,
    };
  }

  // Validate quantity
  const quantityValidation = validateQuantity(quantity, MAX_QUANTITY_PER_ITEM, currentCartQuantity);
  if (!quantityValidation.valid) {
    return quantityValidation;
  }

  // Validate variant selection if product has variants
  if (checkVariants && product.variants && product.variants.length > 0 && !selectedVariant) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.VARIANT_REQUIRED,
    };
  }

  // Validate stock availability
  let stockWarning: string | undefined;
  if (checkStock) {
    const stockValidation = validateStock(product, selectedVariant, quantity);
    if (!stockValidation.valid) {
      return stockValidation;
    }
    stockWarning = stockValidation.warning;
  }

  // All validations passed
  return {
    valid: true,
    warning: stockWarning, // Include any warnings from stock validation
  };
}

/**
 * Validate quantity value
 *
 * @param quantity - Quantity to validate
 * @param maxQuantity - Maximum allowed quantity
 * @param currentCartQuantity - Current quantity in cart
 * @returns ValidationResult
 */
export function validateQuantity(
  quantity: number,
  maxQuantity: number = MAX_QUANTITY_PER_ITEM,
  currentCartQuantity: number = 0
): ValidationResult {
  // Check if quantity is a valid number
  if (typeof quantity !== 'number' || isNaN(quantity) || !isFinite(quantity)) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.INVALID_QUANTITY,
    };
  }

  // Check minimum quantity
  if (quantity < MIN_QUANTITY) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.QUANTITY_TOO_LOW,
    };
  }

  // Check maximum quantity per item
  if (quantity > maxQuantity) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.QUANTITY_TOO_HIGH,
    };
  }

  // Check combined quantity (current + requested)
  const totalQuantity = currentCartQuantity + quantity;
  if (totalQuantity > maxQuantity) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.QUANTITY_EXCEEDS_CART_LIMIT(
        currentCartQuantity,
        quantity,
        maxQuantity
      ),
    };
  }

  // Add warning if approaching limit
  let warning: string | undefined;
  if (totalQuantity >= maxQuantity - 2) {
    warning = VALIDATION_WARNINGS.APPROACHING_LIMIT(totalQuantity, maxQuantity);
  }

  return {
    valid: true,
    warning,
  };
}

/**
 * Validate stock availability for a product or variant
 *
 * @param product - Product to check stock for
 * @param variant - Selected variant (if applicable)
 * @param quantity - Requested quantity
 * @returns ValidationResult
 */
export function validateStock(
  product: ValidatableProduct,
  variant: IProductVariant | null | undefined,
  quantity: number
): ValidationResult {
  // If variant is selected, check variant stock
  if (variant) {
    const variantStock = variant.inventory?.quantity ?? 0;
    const variantAvailable = variant.inventory?.isAvailable ?? false;
    const allowBackorder = variant.inventory?.threshold ? false : true; // If threshold exists, no backorder

    // Check if variant is out of stock
    if (!variantAvailable || variantStock <= 0) {
      if (!allowBackorder) {
        return {
          valid: false,
          error: VALIDATION_ERRORS.OUT_OF_STOCK,
        };
      }
    }

    // Check if requested quantity exceeds variant stock
    if (quantity > variantStock && !allowBackorder) {
      return {
        valid: false,
        error: VALIDATION_ERRORS.INSUFFICIENT_STOCK(variantStock),
      };
    }

    // Add low stock warning
    const threshold = variant.inventory?.threshold ?? LOW_STOCK_THRESHOLD;
    let warning: string | undefined;
    if (variantStock > 0 && variantStock <= threshold) {
      warning = VALIDATION_WARNINGS.LOW_STOCK(variantStock);
    }

    return {
      valid: true,
      warning,
    };
  }

  // Check product-level stock
  const productStock = product.inventory?.stock ?? product.inventory?.quantity ?? 0;
  const productAvailable = product.availability === 'IN_STOCK' || product.availability === 'LIMITED';
  const allowBackorder = product.inventory?.allowBackorder ?? false;

  // Check if product is out of stock
  if (!productAvailable && !allowBackorder) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.OUT_OF_STOCK,
    };
  }

  // Check if requested quantity exceeds available stock
  if (quantity > productStock && !allowBackorder) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.INSUFFICIENT_STOCK(productStock),
    };
  }

  // Add low stock warning
  const threshold = product.inventory?.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
  let warning: string | undefined;
  if (productStock > 0 && productStock <= threshold) {
    warning = VALIDATION_WARNINGS.LOW_STOCK(productStock);
  }

  return {
    valid: true,
    warning,
  };
}

/**
 * Validate a cart item structure
 *
 * @param item - Cart item to validate
 * @returns ValidationResult
 */
export function validateCartItem(item: any): ValidationResult {
  // Check required fields
  if (!item || typeof item !== 'object') {
    return {
      valid: false,
      error: VALIDATION_ERRORS.INVALID_CART_ITEM,
    };
  }

  // Validate required fields
  const requiredFields = ['id', 'name', 'category'];
  for (const field of requiredFields) {
    if (!item[field]) {
      return {
        valid: false,
        error: `${VALIDATION_ERRORS.INVALID_CART_ITEM} Missing field: ${field}`,
      };
    }
  }

  // Validate price is a valid number
  const price = item.price ?? item.discountedPrice ?? item.originalPrice;
  if (typeof price !== 'number' || isNaN(price) || price < 0) {
    return {
      valid: false,
      error: `${VALIDATION_ERRORS.INVALID_CART_ITEM} Invalid price.`,
    };
  }

  // Validate category
  if (item.category !== 'products' && item.category !== 'service') {
    return {
      valid: false,
      error: `${VALIDATION_ERRORS.INVALID_CART_ITEM} Invalid category.`,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Check if a product is available for purchase
 *
 * @param product - Product to check
 * @param variant - Selected variant (if applicable)
 * @returns boolean
 */
export function isProductAvailable(
  product: ValidatableProduct,
  variant?: IProductVariant | null
): boolean {
  if (variant) {
    return variant.inventory?.isAvailable ?? false;
  }

  return product.availability === 'IN_STOCK' || product.availability === 'LIMITED';
}

/**
 * Get maximum available quantity for a product/variant
 *
 * @param product - Product to check
 * @param variant - Selected variant (if applicable)
 * @param respectMaxLimit - Whether to respect MAX_QUANTITY_PER_ITEM limit
 * @returns Maximum available quantity
 */
export function getMaxAvailableQuantity(
  product: ValidatableProduct,
  variant?: IProductVariant | null,
  respectMaxLimit: boolean = true
): number {
  let availableStock: number;

  if (variant) {
    availableStock = variant.inventory?.quantity ?? 0;
  } else {
    availableStock = product.inventory?.stock ?? product.inventory?.quantity ?? 0;
  }

  // Return minimum of available stock and max limit
  if (respectMaxLimit) {
    return Math.min(availableStock, MAX_QUANTITY_PER_ITEM);
  }

  return availableStock;
}

/**
 * Check if product/variant has low stock
 *
 * @param product - Product to check
 * @param variant - Selected variant (if applicable)
 * @returns boolean
 */
export function hasLowStock(
  product: ValidatableProduct,
  variant?: IProductVariant | null
): boolean {
  let stock: number;
  let threshold: number;

  if (variant) {
    stock = variant.inventory?.quantity ?? 0;
    threshold = variant.inventory?.threshold ?? LOW_STOCK_THRESHOLD;
  } else {
    stock = product.inventory?.stock ?? product.inventory?.quantity ?? 0;
    threshold = product.inventory?.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
  }

  return stock > 0 && stock <= threshold;
}

/**
 * Get stock status for UI display
 *
 * @param product - Product to check
 * @param variant - Selected variant (if applicable)
 * @returns Stock status string
 */
export function getStockStatus(
  product: ValidatableProduct,
  variant?: IProductVariant | null
): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (!isProductAvailable(product, variant)) {
    return 'out_of_stock';
  }

  if (hasLowStock(product, variant)) {
    return 'low_stock';
  }

  return 'in_stock';
}

/**
 * Validate cart update operation
 *
 * @param currentQuantity - Current quantity in cart
 * @param newQuantity - New quantity to set
 * @param maxQuantity - Maximum allowed quantity
 * @returns ValidationResult
 */
export function validateCartUpdate(
  currentQuantity: number,
  newQuantity: number,
  maxQuantity: number = MAX_QUANTITY_PER_ITEM
): ValidationResult {
  // Allow quantity to be set to 0 (for removal)
  if (newQuantity === 0) {
    return { valid: true };
  }

  // Otherwise use standard quantity validation
  return validateQuantity(newQuantity, maxQuantity, 0);
}
