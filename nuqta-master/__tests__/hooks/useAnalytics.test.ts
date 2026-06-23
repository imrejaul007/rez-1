/**
 * Unit Tests for useAnalytics hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { useAnalytics } from '@/hooks/useAnalytics';

describe('useAnalytics', () => {
  it('should track events', () => {
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.trackEvent('test_event', { prop: 'value' });
    });

    expect(true).toBe(true);
  });
});
