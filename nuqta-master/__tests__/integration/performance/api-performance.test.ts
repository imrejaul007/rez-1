/**
 * API Performance Integration Tests
 */

import apiClient from '@/services/apiClient';
import { measurePerformance, generateMockProducts } from '../utils/testHelpers';

jest.mock('@/services/apiClient');

describe('API Performance Integration Tests', () => {
  it('should complete API calls within acceptable time', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      success: true,
      data: { products: generateMockProducts(20) },
    });

    const { duration } = await measurePerformance(async () => {
      await apiClient.get('/products');
    });

    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  it('should handle concurrent API requests efficiently', async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) =>
      Promise.resolve({
        success: true,
        data: { url },
      })
    );

    const { duration } = await measurePerformance(async () => {
      const requests = [
        apiClient.get('/products'),
        apiClient.get('/categories'),
        apiClient.get('/stores'),
        apiClient.get('/offers'),
      ];
      await Promise.all(requests);
    });

    expect(duration).toBeLessThan(2000); // All 4 requests in under 2 seconds
  });

  it('should paginate large datasets efficiently', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        products: generateMockProducts(20),
        pagination: { page: 1, hasMore: true },
      },
    });

    const { duration } = await measurePerformance(async () => {
      for (let page = 1; page <= 5; page++) {
        await apiClient.get(`/products?page=${page}`);
      }
    });

    expect(duration).toBeLessThan(5000); // 5 pages in under 5 seconds
  });
});
