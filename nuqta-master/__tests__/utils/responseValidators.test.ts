/**
 * Tests for Response Validators
 * Tests validation and normalization of API responses
 */

import {
  validateProduct,
  validateStore,
  validateProductArray,
  validateStoreArray,
  validateCriticalFields,
  normalizeId,
} from '@/utils/responseValidators';

describe('responseValidators', () => {
  describe('validateProduct', () => {
    it('should validate and normalize valid product', () => {
      const rawProduct = {
        _id: '123',
        name: 'Test Product',
        price: { current: 100, original: 150 },
        rating: { value: 4.5, count: 120 },
        images: ['image1.jpg'],
      };

      const result = validateProduct(rawProduct);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('123');
      expect(result?.name).toBe('Test Product');
      expect(result?.price.current).toBe(100);
      expect(result?.rating.value).toBe(4.5);
    });

    it('should normalize pricing field to price', () => {
      const rawProduct = {
        id: '123',
        name: 'Test Product',
        pricing: { salePrice: 80, basePrice: 100 },
      };

      const result = validateProduct(rawProduct);

      expect(result).not.toBeNull();
      expect(result?.price.current).toBe(80);
      expect(result?.price.original).toBe(100);
    });

    it('should normalize ratings field to rating', () => {
      const rawProduct = {
        id: '123',
        name: 'Test Product',
        price: { current: 100 },
        ratings: { average: 4.2, total: 85 },
      };

      const result = validateProduct(rawProduct);

      expect(result).not.toBeNull();
      expect(result?.rating.value).toBe(4.2);
      expect(result?.rating.count).toBe(85);
    });

    it('should return null for invalid product (no ID)', () => {
      const rawProduct = {
        name: 'Test Product',
        price: { current: 100 },
      };

      const result = validateProduct(rawProduct);

      expect(result).toBeNull();
    });

    it('should return null for invalid product (no name)', () => {
      const rawProduct = {
        id: '123',
        price: { current: 100 },
      };

      const result = validateProduct(rawProduct);

      expect(result).toBeNull();
    });

    it('should return null for invalid product (no price)', () => {
      const rawProduct = {
        id: '123',
        name: 'Test Product',
      };

      const result = validateProduct(rawProduct);

      expect(result).toBeNull();
    });

    it('should return null for non-object input', () => {
      expect(validateProduct(null)).toBeNull();
      expect(validateProduct('invalid')).toBeNull();
      expect(validateProduct(123)).toBeNull();
    });

    it('should normalize brand from store name', () => {
      const rawProduct = {
        id: '123',
        name: 'Test Product',
        price: { current: 100 },
        store: { name: 'Test Store' },
      };

      const result = validateProduct(rawProduct);

      expect(result?.brand).toBe('Test Store');
    });

    it('should set default brand if not provided', () => {
      const rawProduct = {
        id: '123',
        name: 'Test Product',
        price: { current: 100 },
      };

      const result = validateProduct(rawProduct);

      expect(result?.brand).toBe('Unknown Brand');
    });

    it('should normalize category', () => {
      const rawProduct = {
        id: '123',
        name: 'Test Product',
        price: { current: 100 },
        category: { name: 'Electronics' },
      };

      const result = validateProduct(rawProduct);

      expect(result?.category).toBe('Electronics');
    });

    it('should normalize cashback', () => {
      const rawProduct = {
        id: '123',
        name: 'Test Product',
        price: { current: 100 },
        cashback: { percentage: 10, maxAmount: 50 },
      };

      const result = validateProduct(rawProduct);

      expect(result?.cashback).toEqual({ percentage: 10, maxAmount: 50 });
    });

    it('should normalize availability status', () => {
      const rawProduct = {
        id: '123',
        name: 'Test Product',
        price: { current: 100 },
        availabilityStatus: 'in_stock',
      };

      const result = validateProduct(rawProduct);

      expect(result?.availabilityStatus).toBe('in_stock');
    });

    it('should normalize inventory', () => {
      const rawProduct = {
        id: '123',
        name: 'Test Product',
        price: { current: 100 },
        inventory: { quantity: 50, lowStockThreshold: 10 },
      };

      const result = validateProduct(rawProduct);

      expect(result?.inventory).toEqual({ stock: 50, lowStockThreshold: 10 });
    });
  });

  describe('validateStore', () => {
    it('should validate and normalize valid store', () => {
      const rawStore = {
        _id: 'store123',
        name: 'Test Store',
        rating: { value: 4.5, count: 200 },
      };

      const result = validateStore(rawStore);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('store123');
      expect(result?.name).toBe('Test Store');
      expect(result?.rating.value).toBe(4.5);
    });

    it('should return null for invalid store (no ID)', () => {
      const rawStore = {
        name: 'Test Store',
      };

      const result = validateStore(rawStore);

      expect(result).toBeNull();
    });

    it('should return null for invalid store (no name)', () => {
      const rawStore = {
        id: 'store123',
      };

      const result = validateStore(rawStore);

      expect(result).toBeNull();
    });

    it('should set isTopRated for high ratings', () => {
      const rawStore = {
        id: 'store123',
        name: 'Test Store',
        rating: { value: 4.7, count: 200 },
      };

      const result = validateStore(rawStore);

      expect(result?.isTopRated).toBe(true);
    });

    it('should not set isTopRated for low ratings', () => {
      const rawStore = {
        id: 'store123',
        name: 'Test Store',
        rating: { value: 4.0, count: 200 },
      };

      const result = validateStore(rawStore);

      expect(result?.isTopRated).toBe(false);
    });

    it('should normalize location', () => {
      const rawStore = {
        id: 'store123',
        name: 'Test Store',
        location: { address: '123 Main St', city: 'New York' },
      };

      const result = validateStore(rawStore);

      expect(result?.location).toEqual({
        address: '123 Main St',
        city: 'New York',
        distance: undefined,
      });
    });

    it('should normalize delivery time and minimum order', () => {
      const rawStore = {
        id: 'store123',
        name: 'Test Store',
        deliveryTime: '20-30 mins',
        minimumOrder: 100,
      };

      const result = validateStore(rawStore);

      expect(result?.deliveryTime).toBe('20-30 mins');
      expect(result?.minimumOrder).toBe(100);
    });
  });

  describe('validateProductArray', () => {
    it('should validate array of products', () => {
      const rawProducts = [
        { id: '1', name: 'Product 1', price: { current: 100 } },
        { id: '2', name: 'Product 2', price: { current: 200 } },
      ];

      const result = validateProductArray(rawProducts);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should filter out invalid products', () => {
      const rawProducts = [
        { id: '1', name: 'Product 1', price: { current: 100 } },
        { id: '2' }, // Missing name
        { name: 'Product 3', price: { current: 300 } }, // Missing ID
        { id: '4', name: 'Product 4', price: { current: 400 } },
      ];

      const result = validateProductArray(rawProducts);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('4');
    });

    it('should return empty array for non-array input', () => {
      expect(validateProductArray(null as any)).toEqual([]);
      expect(validateProductArray({} as any)).toEqual([]);
      expect(validateProductArray('invalid' as any)).toEqual([]);
    });

    it('should handle empty array', () => {
      expect(validateProductArray([])).toEqual([]);
    });
  });

  describe('validateStoreArray', () => {
    it('should validate array of stores', () => {
      const rawStores = [
        { id: '1', name: 'Store 1' },
        { id: '2', name: 'Store 2' },
      ];

      const result = validateStoreArray(rawStores);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should filter out invalid stores', () => {
      const rawStores = [
        { id: '1', name: 'Store 1' },
        { id: '2' }, // Missing name
        { name: 'Store 3' }, // Missing ID
        { id: '4', name: 'Store 4' },
      ];

      const result = validateStoreArray(rawStores);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('4');
    });

    it('should return empty array for non-array input', () => {
      expect(validateStoreArray(null as any)).toEqual([]);
      expect(validateStoreArray({} as any)).toEqual([]);
    });
  });

  describe('validateCriticalFields', () => {
    it('should return true if all critical fields exist', () => {
      const data = { id: '123', name: 'Test', price: 100 };
      const result = validateCriticalFields(data, ['id', 'name', 'price']);

      expect(result).toBe(true);
    });

    it('should return false if any field is missing', () => {
      const data = { id: '123', name: 'Test' };
      const result = validateCriticalFields(data, ['id', 'name', 'price']);

      expect(result).toBe(false);
    });

    it('should return false if field is undefined', () => {
      const data = { id: '123', name: 'Test', price: undefined };
      const result = validateCriticalFields(data, ['id', 'name', 'price']);

      expect(result).toBe(false);
    });

    it('should return false if field is null', () => {
      const data = { id: '123', name: 'Test', price: null };
      const result = validateCriticalFields(data, ['id', 'name', 'price']);

      expect(result).toBe(false);
    });

    it('should return true for empty required fields array', () => {
      const data = { id: '123' };
      const result = validateCriticalFields(data, []);

      expect(result).toBe(true);
    });
  });

  describe('normalizeId', () => {
    it('should normalize id field', () => {
      expect(normalizeId({ id: '123' })).toBe('123');
    });

    it('should normalize _id field', () => {
      expect(normalizeId({ _id: '123' })).toBe('123');
    });

    it('should prioritize id over _id', () => {
      expect(normalizeId({ id: 'id-value', _id: 'mongodb-id' })).toBe('id-value');
    });

    it('should return null if no ID field', () => {
      expect(normalizeId({})).toBeNull();
      expect(normalizeId(null)).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle product with multiple price formats', () => {
      const rawProduct = {
        id: '123',
        name: 'Test Product',
        pricing: { salePrice: 80, basePrice: 100 },
        price: { current: 90 }, // Should prioritize price over pricing
      };

      const result = validateProduct(rawProduct);

      expect(result?.price.current).toBe(90);
    });

    it('should handle store with featured flag', () => {
      const rawStore = {
        id: 'store123',
        name: 'Test Store',
        featured: true,
      };

      const result = validateStore(rawStore);

      expect(result?.isTrending).toBe(true);
    });

    it('should handle missing optional fields gracefully', () => {
      const rawProduct = {
        id: '123',
        name: 'Test Product',
        price: { current: 100 },
      };

      const result = validateProduct(rawProduct);

      expect(result?.tags).toEqual([]);
      expect(result?.description).toBe('');
      expect(result?.isNewArrival).toBe(false);
    });
  });
});
