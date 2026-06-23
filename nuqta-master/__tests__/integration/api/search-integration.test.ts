/**
 * Search Integration Tests
 */

import { searchApi } from '@/services/searchApi';
import apiClient from '@/services/apiClient';
import { generateMockProducts, generateMockStores, cleanupAfterTest } from '../utils/testHelpers';

jest.mock('@/services/apiClient');

describe('Search Integration Tests', () => {
  afterEach(async () => {
    await cleanupAfterTest();
  });

  it('should search products with autocomplete', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        suggestions: ['laptop', 'laptop bag', 'laptop stand'],
      },
    });

    const suggestions = await searchApi.getSearchSuggestions('lap');
    expect(suggestions.suggestions).toHaveLength(3);
  });

  it('should search across products and stores', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        products: generateMockProducts(5),
        stores: generateMockStores(3),
      },
    });

    const results = await searchApi.globalSearch('electronics');
    expect(results.products).toBeDefined();
    expect(results.stores).toBeDefined();
  });

  it('should filter search results', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        products: generateMockProducts(10),
        filters: {
          applied: { category: 'electronics', priceRange: '1000-5000' },
        },
      },
    });

    const results = await searchApi.searchProducts('laptop', {
      category: 'electronics',
      minPrice: 1000,
      maxPrice: 5000,
    });
    expect(results.products.length).toBeGreaterThan(0);
  });

  it('should save search history', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: { saved: true },
    });

    await searchApi.saveSearchQuery('laptop');
    expect(apiClient.post).toHaveBeenCalledWith('/search/history', { query: 'laptop' });
  });
});
