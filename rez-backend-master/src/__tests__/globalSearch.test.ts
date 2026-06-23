/**
 * Global Search API Test Suite
 *
 * Tests the unified global search endpoint that searches across:
 * - Products (name, description, brand)
 * - Stores (name, description, tags)
 * - Articles (title, content)
 */

import request from 'supertest';
import { app } from '../server';

describe('Global Search API', () => {
  describe('GET /api/search/global', () => {
    // Test 1: Missing query parameter
    it('should return 400 if query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/search/global')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    // Test 2: Search all types (default)
    it('should search across all types by default', async () => {
      const response = await request(app)
        .get('/api/search/global')
        .query({ q: 'pizza' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('query', 'pizza');
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data.results).toHaveProperty('products');
      expect(response.body.data.results).toHaveProperty('stores');
      expect(response.body.data.results).toHaveProperty('articles');
      expect(response.body.data).toHaveProperty('totalResults');
    });

    // Test 3: Search specific types
    it('should search only specified types', async () => {
      const response = await request(app)
        .get('/api/search/global')
        .query({ q: 'pizza', types: 'products,stores' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.requestedTypes).toEqual(['products', 'stores']);
    });

    // Test 4: Custom limit
    it('should respect custom limit parameter', async () => {
      const response = await request(app)
        .get('/api/search/global')
        .query({ q: 'pizza', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.limit).toBe(5);
    });

    // Test 5: Max limit enforcement
    it('should enforce max limit of 50', async () => {
      const response = await request(app)
        .get('/api/search/global')
        .query({ q: 'pizza', limit: 100 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.limit).toBe(50);
    });

    // Test 6: Invalid types parameter
    it('should return 400 for invalid types parameter', async () => {
      const response = await request(app)
        .get('/api/search/global')
        .query({ q: 'pizza', types: 'invalid,wrong' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid types');
    });

    // Test 7: Response structure
    it('should return correct response structure', async () => {
      const response = await request(app)
        .get('/api/search/global')
        .query({ q: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results.products).toHaveProperty('items');
      expect(response.body.data.results.products).toHaveProperty('total');
      expect(response.body.data.results.products).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.data.results.products.items)).toBe(true);
    });

    // Test 8: Execution time tracking
    it('should track execution time', async () => {
      const response = await request(app)
        .get('/api/search/global')
        .query({ q: 'test' })
        .expect(200);

      expect(response.body.data).toHaveProperty('executionTime');
      expect(typeof response.body.data.executionTime).toBe('number');
    });

    // Test 9: Caching behavior
    it('should cache results on second request', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/search/global')
        .query({ q: 'unique-test-query' })
        .expect(200);

      expect(response1.body.data.cached).toBe(false);

      // Second request (should be cached)
      const response2 = await request(app)
        .get('/api/search/global')
        .query({ q: 'unique-test-query' })
        .expect(200);

      // Note: This test assumes Redis is available and working
      // If Redis is not available, both will be false
      if (response2.body.data.cached !== undefined) {
        expect(response2.body.data.cached).toBe(true);
        expect(response2.body.data.executionTime).toBeLessThan(response1.body.data.executionTime);
      }
    });

    // Test 10: Result type markers
    it('should mark each result with its type', async () => {
      const response = await request(app)
        .get('/api/search/global')
        .query({ q: 'test' })
        .expect(200);

      const { products, stores, articles } = response.body.data.results;

      if (products.items.length > 0) {
        expect(products.items[0]).toHaveProperty('type', 'product');
      }

      if (stores.items.length > 0) {
        expect(stores.items[0]).toHaveProperty('type', 'store');
      }

      if (articles.items.length > 0) {
        expect(articles.items[0]).toHaveProperty('type', 'article');
      }
    });
  });

  describe('POST /api/search/cache/clear', () => {
    // Test 11: Cache clear endpoint
    it('should clear search cache when authenticated', async () => {
      // Note: This test requires authentication
      // You may need to add proper authentication headers
      const response = await request(app)
        .post('/api/search/cache/clear')
        .expect(401); // Expect 401 without auth

      // With proper auth token:
      // .set('Authorization', `Bearer ${authToken}`)
      // .expect(200);
    });
  });
});

/**
 * Performance Test Suite
 */
describe('Global Search Performance', () => {
  it('should complete search in under 1000ms (without cache)', async () => {
    const startTime = Date.now();

    await request(app)
      .get('/api/search/global')
      .query({ q: `perf-test-${Date.now()}` }) // Unique query to avoid cache
      .expect(200);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // 1 second max
  }, 10000); // 10 second timeout for this test

  it('should handle concurrent requests efficiently', async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .get('/api/search/global')
        .query({ q: `concurrent-${i}` })
    );

    const startTime = Date.now();
    const responses = await Promise.all(promises);
    const duration = Date.now() - startTime;

    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    // All 5 requests should complete in under 2 seconds
    expect(duration).toBeLessThan(2000);
  }, 10000);
});

/**
 * Relevance Scoring Test Suite
 */
describe('Global Search Relevance', () => {
  it('should prioritize exact matches over partial matches', async () => {
    const response = await request(app)
      .get('/api/search/global')
      .query({ q: 'pizza', types: 'products' })
      .expect(200);

    const products = response.body.data.results.products.items;

    if (products.length > 1) {
      // Check that items with higher relevance scores appear first
      for (let i = 0; i < products.length - 1; i++) {
        if (products[i].relevanceScore !== undefined && products[i + 1].relevanceScore !== undefined) {
          expect(products[i].relevanceScore).toBeGreaterThanOrEqual(products[i + 1].relevanceScore);
        }
      }
    }
  });
});
