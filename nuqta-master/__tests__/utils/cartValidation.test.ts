/**
 * Cart Validation Utility Tests
 *
 * Unit tests for the centralized cart validation functions.
 */

import {
  validateAddToCart,
  validateQuantity,
  validateStock,
  validateCartItem,
  isProductAvailable,
  getMaxAvailableQuantity,
  hasLowStock,
  getStockStatus,
  MAX_QUANTITY_PER_ITEM,
  MIN_QUANTITY,
  LOW_STOCK_THRESHOLD,
  VALIDATION_ERRORS,
  ValidatableProduct,
} from '@/utils/cartValidation';
import { IProductVariant } from '@/types/product-variants.types';

describe('Cart Validation Utility', () => {
  // ===========================
  // Test Data
  // ===========================

  const mockProduct: ValidatableProduct = {
    id: 'product-1',
    name: 'Test Product',
    availability: 'IN_STOCK',
    inventory: {
      stock: 50,
      lowStockThreshold: 5,
      trackQuantity: true,
      allowBackorder: false,
    },
  };

  const mockVariant: IProductVariant = {
    _id: 'variant-1',
    id: 'variant-1',
    sku: 'SKU-001',
    attributes: [{ key: 'Size', value: 'M' }],
    pricing: {
      basePrice: 1000,
      salePrice: 800,
      discount: 20,
      currency: '₹',
    },
    inventory: {
      quantity: 10,
      isAvailable: true,
      reserved: 0,
      threshold: 3,
    },
    images: [],
    isActive: true,
  };

  // ===========================
  // validateQuantity Tests
  // ===========================

  describe('validateQuantity', () => {
    it('should validate valid quantity', () => {
      const result = validateQuantity(5, MAX_QUANTITY_PER_ITEM, 0);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject quantity below minimum', () => {
      const result = validateQuantity(0, MAX_QUANTITY_PER_ITEM, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.QUANTITY_TOO_LOW);
    });

    it('should reject quantity above maximum', () => {
      const result = validateQuantity(15, MAX_QUANTITY_PER_ITEM, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.QUANTITY_TOO_HIGH);
    });

    it('should reject when combined quantity exceeds maximum', () => {
      const result = validateQuantity(5, MAX_QUANTITY_PER_ITEM, 8);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('You already have 8 in cart');
    });

    it('should warn when approaching limit', () => {
      const result = validateQuantity(8, MAX_QUANTITY_PER_ITEM, 0);
      expect(result.valid).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('of 10 maximum items');
    });

    it('should reject invalid number types', () => {
      const result = validateQuantity(NaN, MAX_QUANTITY_PER_ITEM, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.INVALID_QUANTITY);
    });

    it('should reject infinite values', () => {
      const result = validateQuantity(Infinity, MAX_QUANTITY_PER_ITEM, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.INVALID_QUANTITY);
    });
  });

  // ===========================
  // validateStock Tests
  // ===========================

  describe('validateStock', () => {
    it('should validate sufficient stock', () => {
      const result = validateStock(mockProduct, null, 5);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject out of stock product', () => {
      const outOfStockProduct: ValidatableProduct = {
        ...mockProduct,
        availability: 'OUT_OF_STOCK',
        inventory: { ...mockProduct.inventory!, stock: 0 },
      };
      const result = validateStock(outOfStockProduct, null, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.OUT_OF_STOCK);
    });

    it('should reject when quantity exceeds stock', () => {
      const limitedProduct: ValidatableProduct = {
        ...mockProduct,
        inventory: { ...mockProduct.inventory!, stock: 3 },
      };
      const result = validateStock(limitedProduct, null, 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Only 3 item');
    });

    it('should warn about low stock', () => {
      const lowStockProduct: ValidatableProduct = {
        ...mockProduct,
        inventory: { ...mockProduct.inventory!, stock: 3 },
      };
      const result = validateStock(lowStockProduct, null, 2);
      expect(result.valid).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('Only 3 item');
    });

    it('should validate variant stock when variant is provided', () => {
      const result = validateStock(mockProduct, mockVariant, 5);
      expect(result.valid).toBe(true);
    });

    it('should reject out of stock variant', () => {
      const outOfStockVariant: IProductVariant = {
        ...mockVariant,
        inventory: { ...mockVariant.inventory, quantity: 0, isAvailable: false },
      };
      const result = validateStock(mockProduct, outOfStockVariant, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.OUT_OF_STOCK);
    });

    it('should allow backorder if enabled', () => {
      const backorderProduct: ValidatableProduct = {
        ...mockProduct,
        availability: 'OUT_OF_STOCK',
        inventory: { ...mockProduct.inventory!, stock: 0, allowBackorder: true },
      };
      const result = validateStock(backorderProduct, null, 1);
      expect(result.valid).toBe(true);
    });
  });

  // ===========================
  // validateAddToCart Tests
  // ===========================

  describe('validateAddToCart', () => {
    it('should validate successful add to cart', () => {
      const result = validateAddToCart(mockProduct, 5, null, 0);
      expect(result.valid).toBe(true);
    });

    it('should reject null/undefined product', () => {
      const result = validateAddToCart(null, 5, null, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.INVALID_PRODUCT);
    });

    it('should reject when variant required but not selected', () => {
      const productWithVariants: ValidatableProduct = {
        ...mockProduct,
        variants: [mockVariant],
      };
      const result = validateAddToCart(productWithVariants, 5, null, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.VARIANT_REQUIRED);
    });

    it('should validate when variant is selected', () => {
      const productWithVariants: ValidatableProduct = {
        ...mockProduct,
        variants: [mockVariant],
      };
      const result = validateAddToCart(productWithVariants, 5, mockVariant, 0);
      expect(result.valid).toBe(true);
    });

    it('should validate with current cart quantity', () => {
      const result = validateAddToCart(mockProduct, 5, null, 3);
      expect(result.valid).toBe(true);
    });

    it('should reject when combined quantity exceeds max', () => {
      const result = validateAddToCart(mockProduct, 5, null, 8);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already have 8 in cart');
    });

    it('should skip checks when options are disabled', () => {
      const productWithVariants: ValidatableProduct = {
        ...mockProduct,
        variants: [mockVariant],
        availability: 'OUT_OF_STOCK',
      };
      const result = validateAddToCart(productWithVariants, 5, null, 0, {
        checkVariants: false,
        checkStock: false,
      });
      expect(result.valid).toBe(true);
    });
  });

  // ===========================
  // validateCartItem Tests
  // ===========================

  describe('validateCartItem', () => {
    it('should validate valid cart item', () => {
      const validItem = {
        id: 'item-1',
        name: 'Test Item',
        category: 'products' as const,
        price: 100,
      };
      const result = validateCartItem(validItem);
      expect(result.valid).toBe(true);
    });

    it('should reject null/undefined item', () => {
      const result = validateCartItem(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(VALIDATION_ERRORS.INVALID_CART_ITEM);
    });

    it('should reject item missing required fields', () => {
      const invalidItem = {
        id: 'item-1',
        // missing name and category
      };
      const result = validateCartItem(invalidItem);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing field');
    });

    it('should reject item with invalid price', () => {
      const invalidItem = {
        id: 'item-1',
        name: 'Test Item',
        category: 'products',
        price: 'not-a-number',
      };
      const result = validateCartItem(invalidItem);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid price');
    });

    it('should reject item with invalid category', () => {
      const invalidItem = {
        id: 'item-1',
        name: 'Test Item',
        category: 'invalid-category',
        price: 100,
      };
      const result = validateCartItem(invalidItem);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid category');
    });

    it('should validate with discountedPrice', () => {
      const validItem = {
        id: 'item-1',
        name: 'Test Item',
        category: 'products' as const,
        discountedPrice: 80,
      };
      const result = validateCartItem(validItem);
      expect(result.valid).toBe(true);
    });
  });

  // ===========================
  // Utility Function Tests
  // ===========================

  describe('isProductAvailable', () => {
    it('should return true for in stock product', () => {
      expect(isProductAvailable(mockProduct)).toBe(true);
    });

    it('should return false for out of stock product', () => {
      const outOfStock = { ...mockProduct, availability: 'OUT_OF_STOCK' as const };
      expect(isProductAvailable(outOfStock)).toBe(false);
    });

    it('should return true for variant when available', () => {
      expect(isProductAvailable(mockProduct, mockVariant)).toBe(true);
    });

    it('should return false for unavailable variant', () => {
      const unavailableVariant = {
        ...mockVariant,
        inventory: { ...mockVariant.inventory, isAvailable: false },
      };
      expect(isProductAvailable(mockProduct, unavailableVariant)).toBe(false);
    });
  });

  describe('getMaxAvailableQuantity', () => {
    it('should return available stock limited by max quantity', () => {
      const result = getMaxAvailableQuantity(mockProduct, null, true);
      expect(result).toBe(MAX_QUANTITY_PER_ITEM);
    });

    it('should return actual stock when less than max', () => {
      const limitedStock = {
        ...mockProduct,
        inventory: { ...mockProduct.inventory!, stock: 5 },
      };
      const result = getMaxAvailableQuantity(limitedStock, null, true);
      expect(result).toBe(5);
    });

    it('should return unlimited stock when respectMaxLimit is false', () => {
      const result = getMaxAvailableQuantity(mockProduct, null, false);
      expect(result).toBe(50);
    });

    it('should use variant stock when variant provided', () => {
      const result = getMaxAvailableQuantity(mockProduct, mockVariant, true);
      expect(result).toBe(MAX_QUANTITY_PER_ITEM);
    });
  });

  describe('hasLowStock', () => {
    it('should return false for normal stock', () => {
      expect(hasLowStock(mockProduct)).toBe(false);
    });

    it('should return true for low stock', () => {
      const lowStock = {
        ...mockProduct,
        inventory: { ...mockProduct.inventory!, stock: 3 },
      };
      expect(hasLowStock(lowStock)).toBe(true);
    });

    it('should return false for out of stock', () => {
      const outOfStock = {
        ...mockProduct,
        inventory: { ...mockProduct.inventory!, stock: 0 },
      };
      expect(hasLowStock(outOfStock)).toBe(false);
    });

    it('should use variant threshold when variant provided', () => {
      const lowStockVariant = {
        ...mockVariant,
        inventory: { ...mockVariant.inventory, quantity: 2 },
      };
      expect(hasLowStock(mockProduct, lowStockVariant)).toBe(true);
    });
  });

  describe('getStockStatus', () => {
    it('should return in_stock for normal stock', () => {
      expect(getStockStatus(mockProduct)).toBe('in_stock');
    });

    it('should return low_stock for low stock', () => {
      const lowStock = {
        ...mockProduct,
        inventory: { ...mockProduct.inventory!, stock: 3 },
      };
      expect(getStockStatus(lowStock)).toBe('low_stock');
    });

    it('should return out_of_stock for unavailable product', () => {
      const outOfStock = {
        ...mockProduct,
        availability: 'OUT_OF_STOCK' as const,
      };
      expect(getStockStatus(outOfStock)).toBe('out_of_stock');
    });
  });

  // ===========================
  // Constants Tests
  // ===========================

  describe('Constants', () => {
    it('should have correct MAX_QUANTITY_PER_ITEM', () => {
      expect(MAX_QUANTITY_PER_ITEM).toBe(10);
    });

    it('should have correct MIN_QUANTITY', () => {
      expect(MIN_QUANTITY).toBe(1);
    });

    it('should have correct LOW_STOCK_THRESHOLD', () => {
      expect(LOW_STOCK_THRESHOLD).toBe(5);
    });

    it('should have all validation error messages', () => {
      expect(VALIDATION_ERRORS.VARIANT_REQUIRED).toBeDefined();
      expect(VALIDATION_ERRORS.OUT_OF_STOCK).toBeDefined();
      expect(VALIDATION_ERRORS.QUANTITY_TOO_LOW).toBeDefined();
      expect(VALIDATION_ERRORS.QUANTITY_TOO_HIGH).toBeDefined();
      expect(VALIDATION_ERRORS.INVALID_CART_ITEM).toBeDefined();
      expect(VALIDATION_ERRORS.INVALID_PRODUCT).toBeDefined();
      expect(VALIDATION_ERRORS.INVALID_QUANTITY).toBeDefined();
    });
  });
});
