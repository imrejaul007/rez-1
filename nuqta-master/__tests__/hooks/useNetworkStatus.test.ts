/**
 * Unit Tests for useNetworkStatus hook
 */

import { renderHook } from '@testing-library/react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

describe('useNetworkStatus', () => {
  it('should check network status', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isConnected).toBeDefined();
  });
});
