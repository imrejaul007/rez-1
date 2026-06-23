/**
 * Unit Tests for useStoreSearch hook
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useStoreSearch } from '@/hooks/useStoreSearch';

jest.mock('@/services/searchApi', () => ({
  searchStores: jest.fn(() => Promise.resolve({ stores: [], products: [] })),
}));

describe('useStoreSearch', () => {
  it('should search stores', async () => {
    const { result } = renderHook(() => useStoreSearch());

    act(() => {
      result.current.search('test query');
    });

    await waitFor(() => {
      expect(result.current.results).toBeDefined();
    });
  });

  it('should debounce search', async () => {
    const searchApi = require('@/services/searchApi');
    const { result } = renderHook(() => useStoreSearch());

    act(() => {
      result.current.search('t');
      result.current.search('te');
      result.current.search('tes');
      result.current.search('test');
    });

    await waitFor(() => {
      expect(searchApi.searchStores).toHaveBeenCalledTimes(1);
    });
  });
});
