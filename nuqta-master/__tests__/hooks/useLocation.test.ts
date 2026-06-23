/**
 * Unit Tests for useLocation hook
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useLocation } from '@/hooks/useLocation';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: { latitude: 28.7041, longitude: 77.1025 }
  })),
}));

describe('useLocation', () => {
  it('should get current location', async () => {
    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      expect(result.current.location).toBeDefined();
    });
  });
});
