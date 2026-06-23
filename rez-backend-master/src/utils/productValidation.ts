/**
 * Product Validation Utility
 * Provides comprehensive validation functions for product data
 */

export interface PriceValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SKUValidationResult {
  isValid: boolean;
  error?: string;
}

export interface CashbackValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface InventoryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validate pricing logic
 * Ensures selling price <= original price and cost price < selling price
 */
export function validatePriceLogic(
  sellingPrice: number,
  originalPrice?: number,
  costPrice?: number
): PriceValidationResult {
  const errors: string[] = [];

  // Basic validation
  if (sellingPrice === null || sellingPrice === undefined) {
    errors.push('Selling price is required');
  }

  if (sellingPrice < 0) {
    errors.push('Selling price cannot be negative');
  }

  // Original price validation
  if (originalPrice !== undefined && originalPrice !== null) {
    if (originalPrice < 0) {
      errors.push('Original price cannot be negative');
    }

    if (originalPrice < sellingPrice) {
      errors.push(
        `Original price (${originalPrice}) must be greater than or equal to selling price (${sellingPrice})`
      );
    }
  }

  // Cost price validation
  if (costPrice !== undefined && costPrice !== null) {
    if (costPrice < 0) {
      errors.push('Cost price cannot be negative');
    }

    if (costPrice >= sellingPrice) {
      errors.push(
        `Cost price (${costPrice}) must be less than selling price (${sellingPrice}) to maintain profit margin`
      );
    }

    if (originalPrice && costPrice >= originalPrice) {
      errors.push(
        `Cost price (${costPrice}) must be less than original price (${originalPrice})`
      );
    }
  }

  // Check for reasonable pricing (warning level)
  if (originalPrice && sellingPrice) {
    const discountPercentage = ((originalPrice - sellingPrice) / originalPrice) * 100;
    if (discountPercentage > 90) {
      errors.push(
        `Discount of ${discountPercentage.toFixed(1)}% seems unusually high. Please verify pricing.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate SKU format
 * Ensures SKU follows proper format (alphanumeric, uppercase, hyphens allowed)
 */
export function validateSKUFormat(sku: string): SKUValidationResult {
  if (!sku || sku.trim() === '') {
    return {
      isValid: false,
      error: 'SKU is required'
    };
  }

  // Convert to uppercase for validation
  const normalizedSKU = sku.trim().toUpperCase();

  // Check minimum length
  if (normalizedSKU.length < 3) {
    return {
      isValid: false,
      error: 'SKU must be at least 3 characters long'
    };
  }

  // Check maximum length
  if (normalizedSKU.length > 50) {
    return {
      isValid: false,
      error: 'SKU must not exceed 50 characters'
    };
  }

  // Check format: alphanumeric, hyphens, underscores allowed
  const skuRegex = /^[A-Z0-9_-]+$/;
  if (!skuRegex.test(normalizedSKU)) {
    return {
      isValid: false,
      error: 'SKU can only contain uppercase letters, numbers, hyphens, and underscores'
    };
  }

  // Check for consecutive hyphens or underscores
  if (normalizedSKU.includes('--') || normalizedSKU.includes('__')) {
    return {
      isValid: false,
      error: 'SKU cannot contain consecutive hyphens or underscores'
    };
  }

  // Check if starts or ends with hyphen or underscore
  if (normalizedSKU.startsWith('-') || normalizedSKU.startsWith('_') ||
      normalizedSKU.endsWith('-') || normalizedSKU.endsWith('_')) {
    return {
      isValid: false,
      error: 'SKU cannot start or end with hyphen or underscore'
    };
  }

  return {
    isValid: true
  };
}

/**
 * Validate cashback logic
 * Ensures cashback percentage and max amount are reasonable
 */
export function validateCashbackLogic(
  percentage: number,
  maxAmount?: number,
  productPrice?: number
): CashbackValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Percentage validation
  if (percentage === null || percentage === undefined) {
    errors.push('Cashback percentage is required');
  } else {
    if (percentage < 0) {
      errors.push('Cashback percentage cannot be negative');
    }

    if (percentage > 100) {
      errors.push('Cashback percentage cannot exceed 100%');
    }

    // Warning for very high cashback
    if (percentage > 50) {
      warnings.push(
        `Cashback percentage of ${percentage}% is unusually high. This may impact profitability.`
      );
    }

    // Warning for very low cashback
    if (percentage > 0 && percentage < 0.5) {
      warnings.push(
        `Cashback percentage of ${percentage}% is very low and may not be attractive to customers.`
      );
    }
  }

  // Max amount validation
  if (maxAmount !== undefined && maxAmount !== null) {
    if (maxAmount < 0) {
      errors.push('Cashback max amount cannot be negative');
    }

    // If product price is provided, validate max amount against calculated cashback
    if (productPrice && percentage) {
      const calculatedCashback = (productPrice * percentage) / 100;

      if (maxAmount < calculatedCashback * 0.1) {
        warnings.push(
          `Max cashback amount (${maxAmount}) is very low compared to calculated cashback (${calculatedCashback.toFixed(2)})`
        );
      }

      // Check if max amount makes the cashback unreachable
      const minPriceForMaxCashback = (maxAmount * 100) / percentage;
      if (productPrice < minPriceForMaxCashback) {
        warnings.push(
          `Max cashback of ${maxAmount} will never be reached at current price (${productPrice}). Minimum price needed: ${minPriceForMaxCashback.toFixed(2)}`
        );
      }
    }

    // Warning for very high max amount
    if (productPrice && maxAmount > productPrice * 0.5) {
      warnings.push(
        `Max cashback amount (${maxAmount}) exceeds 50% of product price (${productPrice})`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate inventory settings
 * Ensures stock levels and thresholds are properly configured
 */
export function validateInventory(
  stock: number,
  lowStockThreshold?: number,
  allowBackorders?: boolean,
  trackInventory: boolean = true
): InventoryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Stock validation
  if (stock === null || stock === undefined) {
    errors.push('Stock quantity is required');
  } else {
    if (stock < 0) {
      errors.push('Stock quantity cannot be negative');
    }

    if (!Number.isInteger(stock)) {
      errors.push('Stock quantity must be a whole number');
    }

    // Warning for zero stock without backorders
    if (stock === 0 && !allowBackorders && trackInventory) {
      warnings.push(
        'Product is out of stock and backorders are not allowed. Consider enabling backorders or restocking.'
      );
    }

    // Warning for very high stock
    if (stock > 10000) {
      warnings.push(
        `Stock quantity (${stock}) is very high. Please verify this is correct.`
      );
    }
  }

  // Low stock threshold validation
  if (lowStockThreshold !== undefined && lowStockThreshold !== null) {
    if (lowStockThreshold < 0) {
      errors.push('Low stock threshold cannot be negative');
    }

    if (!Number.isInteger(lowStockThreshold)) {
      errors.push('Low stock threshold must be a whole number');
    }

    // Warning if stock is below threshold
    if (trackInventory && stock !== null && stock <= lowStockThreshold && stock > 0) {
      warnings.push(
        `Current stock (${stock}) is at or below low stock threshold (${lowStockThreshold}). Consider restocking.`
      );
    }

    // Warning if threshold is unreasonably high
    if (stock !== null && lowStockThreshold > stock * 0.5) {
      warnings.push(
        `Low stock threshold (${lowStockThreshold}) is more than 50% of current stock (${stock}). Consider adjusting.`
      );
    }

    // Recommendation for threshold
    if (lowStockThreshold === 0 && trackInventory) {
      warnings.push(
        'Low stock threshold is 0. Consider setting a threshold to receive alerts before running out of stock.'
      );
    }
  } else if (trackInventory) {
    warnings.push(
      'No low stock threshold set. Consider setting one to receive stock alerts.'
    );
  }

  // Backorder validation
  if (allowBackorders && stock === 0 && !trackInventory) {
    warnings.push(
      'Backorders are allowed but inventory tracking is disabled. This may cause issues with order fulfillment.'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate variant pricing
 * Ensures variant prices are consistent with base product price
 */
export function validateVariantPricing(
  basePrice: number,
  variantPrice: number,
  variantName: string
): PriceValidationResult {
  const errors: string[] = [];

  if (variantPrice < 0) {
    errors.push(`Variant "${variantName}" price cannot be negative`);
  }

  // Allow variants to be more or less expensive, but warn if dramatically different
  const priceDifference = Math.abs(variantPrice - basePrice);
  const percentageDifference = (priceDifference / basePrice) * 100;

  if (percentageDifference > 200) {
    errors.push(
      `Variant "${variantName}" price (${variantPrice}) differs by more than 200% from base price (${basePrice}). Please verify.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Comprehensive product validation
 * Validates all product data at once
 */
export interface ComprehensiveValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProduct(data: {
  name?: string;
  sku?: string;
  price?: number;
  originalPrice?: number;
  costPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  cashbackPercentage?: number;
  cashbackMaxAmount?: number;
  allowBackorders?: boolean;
  trackInventory?: boolean;
}): ComprehensiveValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Name validation
  if (!data.name || data.name.trim() === '') {
    errors.push('Product name is required');
  } else if (data.name.length < 2) {
    errors.push('Product name must be at least 2 characters long');
  } else if (data.name.length > 200) {
    errors.push('Product name must not exceed 200 characters');
  }

  // SKU validation
  if (data.sku) {
    const skuValidation = validateSKUFormat(data.sku);
    if (!skuValidation.isValid && skuValidation.error) {
      errors.push(skuValidation.error);
    }
  }

  // Price validation
  if (data.price !== undefined) {
    const priceValidation = validatePriceLogic(
      data.price,
      data.originalPrice,
      data.costPrice
    );
    errors.push(...priceValidation.errors);
  }

  // Inventory validation
  if (data.stock !== undefined) {
    const inventoryValidation = validateInventory(
      data.stock,
      data.lowStockThreshold,
      data.allowBackorders,
      data.trackInventory !== false
    );
    errors.push(...inventoryValidation.errors);
    if (inventoryValidation.warnings) {
      warnings.push(...inventoryValidation.warnings);
    }
  }

  // Cashback validation
  if (data.cashbackPercentage !== undefined) {
    const cashbackValidation = validateCashbackLogic(
      data.cashbackPercentage,
      data.cashbackMaxAmount,
      data.price
    );
    errors.push(...cashbackValidation.errors);
    if (cashbackValidation.warnings) {
      warnings.push(...cashbackValidation.warnings);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize product data
 * Removes invalid characters and normalizes data
 */
export function sanitizeProductData(data: any): any {
  const sanitized = { ...data };

  // Sanitize name
  if (sanitized.name) {
    sanitized.name = sanitized.name.trim();
  }

  // Sanitize and normalize SKU
  if (sanitized.sku) {
    sanitized.sku = sanitized.sku.trim().toUpperCase();
  }

  // Ensure positive numbers
  if (sanitized.price !== undefined) {
    sanitized.price = Math.max(0, Number(sanitized.price));
  }

  if (sanitized.stock !== undefined) {
    sanitized.stock = Math.max(0, Math.floor(Number(sanitized.stock)));
  }

  if (sanitized.lowStockThreshold !== undefined) {
    sanitized.lowStockThreshold = Math.max(0, Math.floor(Number(sanitized.lowStockThreshold)));
  }

  return sanitized;
}
