/**
 * Tests for Product Data Normalizer Utilities
 * Covers all 10 normalization functions with comprehensive edge cases
 */

import {
  normalizeProductPrice,
  normalizeProductRating,
  normalizeProductId,
  normalizeProductImage,
  normalizeStoreId,
  normalizeStoreName,
  normalizeProduct,
  normalizeProducts,
  normalizeStore,
  normalizeStores,
} from '@/utils/productDataNormalizer';

describe('productDataNormalizer', () => {
  describe('normalizeProductPrice', () => {
    it('should normalize price.current and price.original', () => {
      const product = {
        price: {
          current: 100,
          original: 150,
        },
      };

      const result = normalizeProductPrice(product);

      expect(result.current).toBe(100);
      expect(result.original).toBe(150);
      expect(result.discount).toBe(33);
    });

    it('should normalize pricing.selling and pricing.mrp', () => {
      const product = {
        pricing: {
          selling: 80,
          mrp: 100,
        },
      };

      const result = normalizeProductPrice(product);

      expect(result.current).toBe(80);
      expect(result.original).toBe(100);
      expect(result.discount).toBe(20);
    });

    it('should normalize sellingPrice and mrp (legacy)', () => {
      const product = {
        sellingPrice: 50,
        mrp: 75,
      };

      const result = normalizeProductPrice(product);

      expect(result.current).toBe(50);
      expect(result.original).toBe(75);
      expect(result.discount).toBe(33);
    });

    it('should return null values for invalid product', () => {
      const result = normalizeProductPrice(null);

      expect(result.current).toBeNull();
      expect(result.original).toBeNull();
      expect(result.discount).toBeNull();
    });

    it('should return null discount when no discount exists', () => {
      const product = {
        price: {
          current: 100,
          original: 100,
        },
      };

      const result = normalizeProductPrice(product);

      expect(result.current).toBe(100);
      expect(result.original).toBe(100);
      expect(result.discount).toBeNull();
    });

    it('should handle missing original price', () => {
      const product = {
        price: {
          current: 100,
        },
      };

      const result = normalizeProductPrice(product);

      expect(result.current).toBe(100);
      expect(result.original).toBeNull();
      expect(result.discount).toBeNull();
    });

    it('should prioritize price over pricing', () => {
      const product = {
        price: {
          current: 100,
          original: 150,
        },
        pricing: {
          selling: 80,
          mrp: 120,
        },
      };

      const result = normalizeProductPrice(product);

      expect(result.current).toBe(100); // Should use price.current
    });

    it('should handle zero prices', () => {
      const product = {
        price: {
          current: 0,
          original: 0,
        },
      };

      const result = normalizeProductPrice(product);

      expect(result.current).toBe(0);
      expect(result.original).toBe(0);
      expect(result.discount).toBeNull();
    });
  });

  describe('normalizeProductRating', () => {
    it('should normalize rating.value and rating.count', () => {
      const product = {
        rating: {
          value: 4.5,
          count: 120,
        },
      };

      const result = normalizeProductRating(product);

      expect(result.value).toBe(4.5);
      expect(result.count).toBe(120);
    });

    it('should normalize ratings.average and ratings.total', () => {
      const product = {
        ratings: {
          average: 4.2,
          total: 85,
        },
      };

      const result = normalizeProductRating(product);

      expect(result.value).toBe(4.2);
      expect(result.count).toBe(85);
    });

    it('should normalize ratingValue and ratingCount (legacy)', () => {
      const product = {
        ratingValue: 3.8,
        ratingCount: 50,
      };

      const result = normalizeProductRating(product);

      expect(result.value).toBe(3.8);
      expect(result.count).toBe(50);
    });

    it('should return null values for invalid product', () => {
      const result = normalizeProductRating(null);

      expect(result.value).toBeNull();
      expect(result.count).toBeNull();
    });

    it('should prioritize rating over ratings', () => {
      const product = {
        rating: {
          value: 4.5,
          count: 120,
        },
        ratings: {
          average: 3.5,
          total: 80,
        },
      };

      const result = normalizeProductRating(product);

      expect(result.value).toBe(4.5); // Should use rating.value
      expect(result.count).toBe(120); // Should use rating.count
    });

    it('should handle missing rating data', () => {
      const product = {};

      const result = normalizeProductRating(product);

      expect(result.value).toBeNull();
      expect(result.count).toBeNull();
    });
  });

  describe('normalizeProductId', () => {
    it('should normalize id field', () => {
      const product = { id: '12345' };
      expect(normalizeProductId(product)).toBe('12345');
    });

    it('should normalize _id field (MongoDB)', () => {
      const product = { _id: '67890' };
      expect(normalizeProductId(product)).toBe('67890');
    });

    it('should normalize productId field', () => {
      const product = { productId: 'abc123' };
      expect(normalizeProductId(product)).toBe('abc123');
    });

    it('should return null for invalid product', () => {
      expect(normalizeProductId(null)).toBeNull();
    });

    it('should prioritize id over _id', () => {
      const product = { id: 'id-value', _id: 'mongodb-id' };
      expect(normalizeProductId(product)).toBe('id-value');
    });

    it('should convert numeric IDs to string', () => {
      const product = { id: 12345 };
      expect(normalizeProductId(product)).toBe('12345');
    });
  });

  describe('normalizeProductImage', () => {
    it('should normalize images array', () => {
      const product = {
        name: 'Test Product',
        images: [
          { url: 'image1.jpg', alt: 'Image 1' },
          { url: 'image2.jpg' },
        ],
      };

      const result = normalizeProductImage(product);

      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('image1.jpg');
      expect(result[0].alt).toBe('Image 1');
      expect(result[1].url).toBe('image2.jpg');
      expect(result[1].alt).toBe('Test Product image 2');
    });

    it('should normalize images as string array', () => {
      const product = {
        name: 'Test Product',
        images: ['image1.jpg', 'image2.jpg'],
      };

      const result = normalizeProductImage(product);

      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('image1.jpg');
      expect(result[1].url).toBe('image2.jpg');
    });

    it('should normalize single image object', () => {
      const product = {
        name: 'Test Product',
        image: { url: 'image.jpg', alt: 'Product Image' },
      };

      const result = normalizeProductImage(product);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('image.jpg');
      expect(result[0].alt).toBe('Product Image');
    });

    it('should normalize single image string', () => {
      const product = {
        name: 'Test Product',
        image: 'image.jpg',
      };

      const result = normalizeProductImage(product);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('image.jpg');
      expect(result[0].alt).toBe('Test Product image');
    });

    it('should normalize imageUrl field', () => {
      const product = {
        name: 'Test Product',
        imageUrl: 'image.jpg',
      };

      const result = normalizeProductImage(product);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('image.jpg');
    });

    it('should normalize thumbnail field', () => {
      const product = {
        name: 'Test Product',
        thumbnail: 'thumb.jpg',
      };

      const result = normalizeProductImage(product);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('thumb.jpg');
      expect(result[0].alt).toBe('Test Product thumbnail');
    });

    it('should return empty array for invalid product', () => {
      expect(normalizeProductImage(null)).toEqual([]);
    });

    it('should filter out images without URLs', () => {
      const product = {
        images: [
          { url: 'image1.jpg' },
          { alt: 'No URL' },
          { url: 'image2.jpg' },
        ],
      };

      const result = normalizeProductImage(product);

      expect(result).toHaveLength(2);
    });

    it('should handle images with src instead of url', () => {
      const product = {
        images: [{ src: 'image.jpg' }],
      };

      const result = normalizeProductImage(product);

      expect(result[0].url).toBe('image.jpg');
    });
  });

  describe('normalizeStoreId', () => {
    it('should normalize id field', () => {
      const store = { id: '12345' };
      expect(normalizeStoreId(store)).toBe('12345');
    });

    it('should normalize _id field', () => {
      const store = { _id: '67890' };
      expect(normalizeStoreId(store)).toBe('67890');
    });

    it('should normalize storeId field', () => {
      const store = { storeId: 'abc123' };
      expect(normalizeStoreId(store)).toBe('abc123');
    });

    it('should return null for invalid store', () => {
      expect(normalizeStoreId(null)).toBeNull();
    });

    it('should prioritize id over _id', () => {
      const store = { id: 'id-value', _id: 'mongodb-id' };
      expect(normalizeStoreId(store)).toBe('id-value');
    });
  });

  describe('normalizeStoreName', () => {
    it('should normalize name field', () => {
      const store = { name: 'Store Name' };
      expect(normalizeStoreName(store)).toBe('Store Name');
    });

    it('should normalize storeName field', () => {
      const store = { storeName: 'My Store' };
      expect(normalizeStoreName(store)).toBe('My Store');
    });

    it('should normalize title field', () => {
      const store = { title: 'Store Title' };
      expect(normalizeStoreName(store)).toBe('Store Title');
    });

    it('should return null for invalid store', () => {
      expect(normalizeStoreName(null)).toBeNull();
    });

    it('should prioritize name over storeName', () => {
      const store = { name: 'Name Value', storeName: 'Store Name Value' };
      expect(normalizeStoreName(store)).toBe('Name Value');
    });
  });

  describe('normalizeProduct', () => {
    it('should normalize complete product object', () => {
      const rawProduct = {
        _id: '12345',
        name: 'Test Product',
        price: { current: 100, original: 150 },
        rating: { value: 4.5, count: 120 },
        images: ['image1.jpg'],
        storeId: 'store123',
      };

      const result = normalizeProduct(rawProduct);

      expect(result.id).toBe('12345');
      expect(result.name).toBe('Test Product');
      expect(result.price.current).toBe(100);
      expect(result.rating.value).toBe(4.5);
      expect(result.images).toHaveLength(1);
      expect(result.storeId).toBe('store123');
    });

    it('should normalize product with store object', () => {
      const rawProduct = {
        id: '12345',
        name: 'Test Product',
        price: { current: 100 },
        store: { _id: 'store123', name: 'Test Store' },
      };

      const result = normalizeProduct(rawProduct);

      expect(result.storeId).toBe('store123');
    });

    it('should return null for invalid product', () => {
      expect(normalizeProduct(null)).toBeNull();
    });

    it('should preserve original _id field', () => {
      const rawProduct = {
        _id: '12345',
        name: 'Test Product',
        price: { current: 100 },
      };

      const result = normalizeProduct(rawProduct);

      expect(result._id).toBe('12345');
    });
  });

  describe('normalizeProducts', () => {
    it('should normalize array of products', () => {
      const rawProducts = [
        { id: '1', name: 'Product 1', price: { current: 100 } },
        { id: '2', name: 'Product 2', price: { current: 200 } },
      ];

      const result = normalizeProducts(rawProducts);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should filter out null products', () => {
      const rawProducts = [
        { id: '1', name: 'Product 1', price: { current: 100 } },
        null,
        { id: '2', name: 'Product 2', price: { current: 200 } },
      ];

      const result = normalizeProducts(rawProducts);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for non-array input', () => {
      expect(normalizeProducts(null as any)).toEqual([]);
      expect(normalizeProducts({} as any)).toEqual([]);
    });

    it('should handle empty array', () => {
      expect(normalizeProducts([])).toEqual([]);
    });
  });

  describe('normalizeStore', () => {
    it('should normalize complete store object', () => {
      const rawStore = {
        _id: 'store123',
        name: 'Test Store',
        rating: { value: 4.5, count: 200 },
      };

      const result = normalizeStore(rawStore);

      expect(result.id).toBe('store123');
      expect(result.name).toBe('Test Store');
      expect(result.rating.value).toBe(4.5);
    });

    it('should return null for invalid store', () => {
      expect(normalizeStore(null)).toBeNull();
    });

    it('should preserve original _id field', () => {
      const rawStore = {
        _id: 'store123',
        name: 'Test Store',
      };

      const result = normalizeStore(rawStore);

      expect(result._id).toBe('store123');
    });
  });

  describe('normalizeStores', () => {
    it('should normalize array of stores', () => {
      const rawStores = [
        { id: '1', name: 'Store 1' },
        { id: '2', name: 'Store 2' },
      ];

      const result = normalizeStores(rawStores);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should filter out null stores', () => {
      const rawStores = [
        { id: '1', name: 'Store 1' },
        null,
        { id: '2', name: 'Store 2' },
      ];

      const result = normalizeStores(rawStores);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for non-array input', () => {
      expect(normalizeStores(null as any)).toEqual([]);
      expect(normalizeStores({} as any)).toEqual([]);
    });

    it('should handle empty array', () => {
      expect(normalizeStores([])).toEqual([]);
    });
  });
});
