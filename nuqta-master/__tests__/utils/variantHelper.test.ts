/**
 * Tests for Variant Helper Utilities
 */

import {
  hasVariants,
  formatVariantDisplay,
  generateVariantSku,
  createCartItemFromVariant,
  variantsMatch,
  mergeVariantWithCartItem,
  getVariantDisplayName,
  isVariantSelectionComplete,
  extractVariantAttributes,
  getVariantPrice,
  isVariantInStock,
} from '@/utils/variantHelper';
import { ProductItem } from '@/types/homepage.types';
import { VariantSelection } from '@/components/cart/ProductVariantModal';

describe('variantHelper', () => {
  // ==================== Mock Data ====================

  const mockProduct: ProductItem = {
    id: 'prod-123',
    title: 'Test T-Shirt',
    name: 'Test T-Shirt',
    brand: 'Test Brand',
    image: 'https://example.com/image.jpg',
    price: {
      current: 999,
      original: 1499,
      currency: 'INR',
    },
    category: 'Fashion',
    type: 'product',
    availabilityStatus: 'in_stock',
    tags: [],
  };

  const mockVariant: VariantSelection = {
    variantId: 'var-123',
    size: 'M',
    color: 'Blue',
    sku: 'TEST-M-BLUE-123',
    price: 999,
    stock: 10,
  };

  // ==================== hasVariants Tests ====================

  describe('hasVariants', () => {
    it('should return true when product has variants property', () => {
      const productWithVariants = {
        ...mockProduct,
        variants: [{ id: 'v1', name: 'Small' }],
      };
      expect(hasVariants(productWithVariants as any)).toBe(true);
    });

    it('should return true when product requires variant selection', () => {
      const productWithRequirement = {
        ...mockProduct,
        requiresVariantSelection: true,
      };
      expect(hasVariants(productWithRequirement as any)).toBe(true);
    });

    it('should return true when product has sizes', () => {
      const productWithSizes = {
        ...mockProduct,
        sizes: ['S', 'M', 'L'],
      };
      expect(hasVariants(productWithSizes as any)).toBe(true);
    });

    it('should return true when product has colors', () => {
      const productWithColors = {
        ...mockProduct,
        colors: ['Red', 'Blue', 'Green'],
      };
      expect(hasVariants(productWithColors as any)).toBe(true);
    });

    it('should return false when product has no variants', () => {
      expect(hasVariants(mockProduct)).toBe(false);
    });
  });

  // ==================== formatVariantDisplay Tests ====================

  describe('formatVariantDisplay', () => {
    it('should format variant with size and color', () => {
      const result = formatVariantDisplay({
        size: 'M',
        color: 'Blue',
      });
      expect(result).toBe('Size: M, Color: Blue');
    });

    it('should format variant with only size', () => {
      const result = formatVariantDisplay({ size: 'L' });
      expect(result).toBe('Size: L');
    });

    it('should format variant with only color', () => {
      const result = formatVariantDisplay({ color: 'Red' });
      expect(result).toBe('Color: Red');
    });

    it('should return "Default" for empty variant', () => {
      const result = formatVariantDisplay({});
      expect(result).toBe('Default');
    });

    it('should include custom attributes', () => {
      const result = formatVariantDisplay({
        size: 'M',
        material: 'Cotton',
      } as any);
      expect(result).toContain('Size: M');
      expect(result).toContain('material: Cotton');
    });
  });

  // ==================== generateVariantSku Tests ====================

  describe('generateVariantSku', () => {
    it('should use existing SKU if provided', () => {
      const variant = { ...mockVariant, sku: 'CUSTOM-SKU' };
      const result = generateVariantSku(mockProduct, variant);
      expect(result).toBe('CUSTOM-SKU');
    });

    it('should generate SKU from product and variant', () => {
      const variant = { size: 'M', color: 'Blue' };
      const result = generateVariantSku(mockProduct, variant);
      expect(result).toMatch(/^PROD-1-M-BLU-/);
    });

    it('should handle variant without size', () => {
      const variant = { color: 'Red' };
      const result = generateVariantSku(mockProduct, variant);
      expect(result).toMatch(/^PROD-1-NA-RED-/);
    });

    it('should handle variant without color', () => {
      const variant = { size: 'XL' };
      const result = generateVariantSku(mockProduct, variant);
      expect(result).toMatch(/^PROD-1-XL-NA-/);
    });

    it('should use variantId if provided', () => {
      const variant = { variantId: 'CUSTOM123', size: 'S', color: 'Green' };
      const result = generateVariantSku(mockProduct, variant);
      expect(result).toBe('PROD-1-S-GRE-CUSTOM123');
    });
  });

  // ==================== createCartItemFromVariant Tests ====================

  describe('createCartItemFromVariant', () => {
    it('should create cart item with all required fields', () => {
      const result = createCartItemFromVariant(mockProduct, mockVariant, 2);

      expect(result).toMatchObject({
        productId: mockProduct.id,
        name: mockProduct.name,
        brand: mockProduct.brand,
        image: mockProduct.image,
        quantity: 2,
        category: mockProduct.category,
      });
      expect(result.variant).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('should use variant price when available', () => {
      const variantWithPrice = { ...mockVariant, price: 1200 };
      const result = createCartItemFromVariant(mockProduct, variantWithPrice);
      expect(result.discountedPrice).toBe(1200);
    });

    it('should use product price when variant price not available', () => {
      const variantWithoutPrice = { size: 'M', color: 'Blue' };
      const result = createCartItemFromVariant(mockProduct, variantWithoutPrice);
      expect(result.discountedPrice).toBe(mockProduct.price.current);
    });

    it('should default quantity to 1', () => {
      const result = createCartItemFromVariant(mockProduct, mockVariant);
      expect(result.quantity).toBe(1);
    });

    it('should include timestamp', () => {
      const result = createCartItemFromVariant(mockProduct, mockVariant);
      expect(result.addedAt).toBeDefined();
      expect(new Date(result.addedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  // ==================== variantsMatch Tests ====================

  describe('variantsMatch', () => {
    it('should return true for identical variants', () => {
      const variant1 = { size: 'M', color: 'Blue' };
      const variant2 = { size: 'M', color: 'Blue' };
      expect(variantsMatch(variant1, variant2)).toBe(true);
    });

    it('should return false for different sizes', () => {
      const variant1 = { size: 'M', color: 'Blue' };
      const variant2 = { size: 'L', color: 'Blue' };
      expect(variantsMatch(variant1, variant2)).toBe(false);
    });

    it('should return false for different colors', () => {
      const variant1 = { size: 'M', color: 'Blue' };
      const variant2 = { size: 'M', color: 'Red' };
      expect(variantsMatch(variant1, variant2)).toBe(false);
    });

    it('should ignore stock differences', () => {
      const variant1 = { size: 'M', color: 'Blue', stock: 10 };
      const variant2 = { size: 'M', color: 'Blue', stock: 5 };
      expect(variantsMatch(variant1, variant2)).toBe(true);
    });

    it('should ignore price differences', () => {
      const variant1 = { size: 'M', color: 'Blue', price: 100 };
      const variant2 = { size: 'M', color: 'Blue', price: 120 };
      expect(variantsMatch(variant1, variant2)).toBe(true);
    });
  });

  // ==================== getVariantDisplayName Tests ====================

  describe('getVariantDisplayName', () => {
    it('should return "Select Size" for products with only sizes', () => {
      const product = { ...mockProduct, sizes: ['S', 'M', 'L'] };
      expect(getVariantDisplayName(product as any)).toBe('Select Size');
    });

    it('should return "Select Color" for products with only colors', () => {
      const product = { ...mockProduct, colors: ['Red', 'Blue'] };
      expect(getVariantDisplayName(product as any)).toBe('Select Color');
    });

    it('should return "Select Size & Color" for products with both', () => {
      const product = {
        ...mockProduct,
        sizes: ['S', 'M', 'L'],
        colors: ['Red', 'Blue'],
      };
      expect(getVariantDisplayName(product as any)).toBe('Select Size & Color');
    });

    it('should return "Select Options" for products without size/color', () => {
      expect(getVariantDisplayName(mockProduct)).toBe('Select Options');
    });
  });

  // ==================== isVariantSelectionComplete Tests ====================

  describe('isVariantSelectionComplete', () => {
    it('should return true when all required attributes are selected', () => {
      const variant = { size: 'M', color: 'Blue' };
      expect(isVariantSelectionComplete(variant, ['size', 'color'])).toBe(true);
    });

    it('should return false when required attribute is missing', () => {
      const variant = { size: 'M' };
      expect(isVariantSelectionComplete(variant, ['size', 'color'])).toBe(false);
    });

    it('should return false when attribute is null', () => {
      const variant = { size: 'M', color: null };
      expect(isVariantSelectionComplete(variant as any, ['size', 'color'])).toBe(false);
    });

    it('should return false when attribute is empty string', () => {
      const variant = { size: 'M', color: '' };
      expect(isVariantSelectionComplete(variant, ['size', 'color'])).toBe(false);
    });

    it('should work with custom required attributes', () => {
      const variant = { material: 'Cotton', pattern: 'Striped' };
      expect(isVariantSelectionComplete(variant as any, ['material', 'pattern'])).toBe(true);
    });
  });

  // ==================== extractVariantAttributes Tests ====================

  describe('extractVariantAttributes', () => {
    it('should extract all variant attributes', () => {
      const product = {
        ...mockProduct,
        sizes: ['S', 'M', 'L'],
        colors: ['Red', 'Blue'],
        attributes: { material: 'Cotton' },
        requiresVariantSelection: true,
        variants: [{ id: 'v1' }],
      };

      const result = extractVariantAttributes(product as any);

      expect(result.sizes).toEqual(['S', 'M', 'L']);
      expect(result.colors).toEqual(['Red', 'Blue']);
      expect(result.attributes).toEqual({ material: 'Cotton' });
      expect(result.requiresVariantSelection).toBe(true);
      expect(result.variants).toEqual([{ id: 'v1' }]);
    });

    it('should return empty arrays/objects for missing attributes', () => {
      const result = extractVariantAttributes(mockProduct);

      expect(result.sizes).toEqual([]);
      expect(result.colors).toEqual([]);
      expect(result.attributes).toEqual({});
      expect(result.requiresVariantSelection).toBe(false);
      expect(result.variants).toEqual([]);
    });
  });

  // ==================== getVariantPrice Tests ====================

  describe('getVariantPrice', () => {
    it('should return variant price when available', () => {
      const variant = { price: 1200 };
      expect(getVariantPrice(999, variant as any)).toBe(1200);
    });

    it('should return base price when variant is null', () => {
      expect(getVariantPrice(999, null)).toBe(999);
    });

    it('should return base price when variant has no price', () => {
      const variant = { size: 'M' };
      expect(getVariantPrice(999, variant as any)).toBe(999);
    });
  });

  // ==================== isVariantInStock Tests ====================

  describe('isVariantInStock', () => {
    it('should return true when stock is sufficient', () => {
      const variant = { stock: 10 };
      expect(isVariantInStock(variant as any, 5)).toBe(true);
    });

    it('should return false when stock is insufficient', () => {
      const variant = { stock: 3 };
      expect(isVariantInStock(variant as any, 5)).toBe(false);
    });

    it('should return true when no stock info is available', () => {
      const variant = { size: 'M' };
      expect(isVariantInStock(variant as any)).toBe(true);
    });

    it('should use minQuantity of 1 by default', () => {
      const variant = { stock: 1 };
      expect(isVariantInStock(variant as any)).toBe(true);

      const variantOutOfStock = { stock: 0 };
      expect(isVariantInStock(variantOutOfStock as any)).toBe(false);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle empty product gracefully', () => {
      const emptyProduct = {} as ProductItem;
      expect(hasVariants(emptyProduct)).toBe(false);
      expect(getVariantDisplayName(emptyProduct)).toBe('Select Options');
    });

    it('should handle variant with special characters', () => {
      const specialVariant = {
        size: 'X-Large',
        color: 'Navy/Blue',
      };
      const display = formatVariantDisplay(specialVariant);
      expect(display).toContain('X-Large');
      expect(display).toContain('Navy/Blue');
    });

    it('should handle very long variant values', () => {
      const longVariant = {
        size: 'Extra Extra Large with Special Padding',
        color: 'Midnight Blue with Silver Accents',
      };
      const display = formatVariantDisplay(longVariant);
      expect(display.length).toBeGreaterThan(0);
    });

    it('should handle numeric variant values', () => {
      const numericVariant = {
        size: '42',
        width: '30' as any,
      };
      const display = formatVariantDisplay(numericVariant);
      expect(display).toContain('42');
    });
  });

  // ==================== Integration Tests ====================

  describe('Integration', () => {
    it('should work end-to-end: product -> variant -> cart item', () => {
      const productWithVariants = {
        ...mockProduct,
        sizes: ['S', 'M', 'L'],
        colors: ['Red', 'Blue'],
        requiresVariantSelection: true,
      };

      // Check if product has variants
      expect(hasVariants(productWithVariants as any)).toBe(true);

      // Get display name
      const displayName = getVariantDisplayName(productWithVariants as any);
      expect(displayName).toBe('Select Size & Color');

      // Create variant selection
      const variant: VariantSelection = {
        size: 'M',
        color: 'Blue',
        price: 999,
        stock: 10,
      };

      // Validate variant selection
      expect(isVariantSelectionComplete(variant)).toBe(true);
      expect(isVariantInStock(variant)).toBe(true);

      // Create cart item
      const cartItem = createCartItemFromVariant(productWithVariants as any, variant, 2);
      expect(cartItem.quantity).toBe(2);
      expect(cartItem.variant.size).toBe('M');
      expect(cartItem.variant.color).toBe('Blue');

      // Format for display
      const formatted = formatVariantDisplay(variant);
      expect(formatted).toBe('Size: M, Color: Blue');
    });
  });
});
