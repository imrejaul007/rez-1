/**
 * Unit Tests for useHomepage hook
 */

import { renderHook, waitFor } from '@testing-library/react-native';

const mockFetchAllSectionsWithBatch = jest.fn(() => Promise.resolve({
  justForYou: {
    id: 'just_for_you',
    title: 'Just for you',
    type: 'recommendations',
    showViewAll: false,
    isHorizontalScroll: true,
    items: [],
    loading: false,
    error: null,
    priority: 2,
  },
}));

jest.mock('@/services/homepageDataService', () => ({
  __esModule: true,
  default: {
    fetchAllSectionsWithBatch: mockFetchAllSectionsWithBatch,
    getLastUserContext: jest.fn(() => null),
  },
}));

const { useHomepage } = require('@/hooks/useHomepage');

describe('useHomepage', () => {
  beforeEach(() => {
    mockFetchAllSectionsWithBatch.mockClear();
    mockFetchAllSectionsWithBatch.mockImplementation(() => Promise.resolve({
      justForYou: {
        id: 'just_for_you',
        title: 'Just for you',
        type: 'recommendations',
        showViewAll: false,
        isHorizontalScroll: true,
        items: [],
        loading: false,
        error: null,
        priority: 2,
      },
    }));
  });

  it('should load homepage data', async () => {
    const { result } = renderHook(() => useHomepage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.state.sections[0].id).toBe('just_for_you');
  });

  it('should handle errors', async () => {
    mockFetchAllSectionsWithBatch.mockRejectedValueOnce(new Error('API Error'));

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

    await result.current.refresh();

    expect(mockFetchAllSectionsWithBatch).toHaveBeenCalledTimes(2);
    expect(result.current.refreshing).toBe(false);
  });
});
