/**
 * Unit Tests for usePlayPageData hook
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { usePlayPageData } from '@/hooks/usePlayPageData';

jest.mock('@/services/videosApi', () => ({
  fetchVideos: jest.fn(() => Promise.resolve([])),
}));

describe('usePlayPageData', () => {
  it('should load play page data', async () => {
    const { result } = renderHook(() => usePlayPageData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
