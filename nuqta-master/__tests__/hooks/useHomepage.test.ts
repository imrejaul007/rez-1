/**
 * Unit Tests for useHomepage hook
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useHomepage } from '@/hooks/useHomepage';

// Mock the API
jest.mock('@/services/homepageApi', () => ({
  fetchHomepageData: jest.fn(() => Promise.resolve({
    banners: [],
    stores: [],
    products: [],
    deals: [],
  })),
}));

describe('useHomepage', () => {
  it('should load homepage data', async () => {
    const { result } = renderHook(() => useHomepage());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should handle errors', async () => {
    const homepageApi = require('@/services/homepageApi');
    homepageApi.fetchHomepageData.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useHomepage());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  it('should refresh data', async () => {
    const { result } = renderHook(() => useHomepage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.refresh();

    expect(result.current.refreshing).toBe(true);
  });
});
