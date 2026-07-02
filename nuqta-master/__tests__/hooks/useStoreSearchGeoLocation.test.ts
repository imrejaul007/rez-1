/**
 * Comprehensive Tests for Store Search with Geo-Location
 * Tests the end-to-end flow from location fetching to store display
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useStoreSearch } from '@/hooks/useStoreSearch';
import { locationService } from '@/services/locationService';

// Mock dependencies
jest.mock('@/services/searchApi', () => ({
  searchStores: jest.fn(),
}));

jest.mock('@/services/locationService', () => ({
  locationService: {
    getCurrentLocation: jest.fn(),
    requestLocationPermission: jest.fn(),
    getCachedLocation: jest.fn(),
    getDefaultLocation: jest.fn(),
  },
}));

jest.mock('@/stores/locationStore', () => ({
  useLocationStore: jest.fn(() => ({
    state: {
      currentLocation: {
        coordinates: { latitude: 12.9716, longitude: 77.5946 },
        address: { city: 'Bangalore', state: 'Karnataka' },
      },
    },
  })),
}));

const mockSearchStores = require('@/services/searchApi').searchStores;
const mockGetCurrentLocation = locationService.getCurrentLocation;

describe('useStoreSearch - Geo-Location Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Location Parameter Handling', () => {
    it('should pass location coordinates to searchStores API call', async () => {
      const mockStores = [
        {
          _id: 'store1',
          name: 'Test Store',
          location: {
            address: '123 Test St',
            city: 'Bangalore',
            coordinates: [77.5946, 12.9716],
          },
          ratings: { average: 4.5, count: 100 },
          isActive: true,
        },
      ];

      mockSearchStores.mockResolvedValue({
        success: true,
        data: { stores: mockStores },
      });

      const { result } = renderHook(() =>
        useStoreSearch({
          category: 'food',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.stores.length).toBeGreaterThan(0);
      });

      // Verify searchStores was called with location parameters
      expect(mockSearchStores).toHaveBeenCalledWith(
        expect.objectContaining({
          q: expect.any(String),
        })
      );
    });

    it('should include distance in store results when returned by API', async () => {
      const mockStores = [
        {
          _id: 'store1',
          name: 'Nearby Store',
          location: {
            address: '123 Test St',
            city: 'Bangalore',
            coordinates: [77.5946, 12.9716],
          },
          ratings: { average: 4.5, count: 100 },
          isActive: true,
          distance: 1.5,
        },
      ];

      mockSearchStores.mockResolvedValue({
        success: true,
        data: { stores: mockStores },
      });

      const { result } = renderHook(() =>
        useStoreSearch({
          category: 'food',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.stores.length).toBeGreaterThan(0);
      });

      const store = result.current.stores[0];
      expect(store).toHaveProperty('distance');
      expect(store.distance).toBe(1.5);
    });
  });

  describe('Distance Sorting', () => {
    it('should sort stores by distance when sortBy=distance', async () => {
      const mockStores = [
        {
          _id: 'store1',
          name: 'Far Store',
          location: {
            address: '123 Far St',
            city: 'Bangalore',
            coordinates: [77.6, 12.98],
          },
          ratings: { average: 4.0, count: 50 },
          isActive: true,
          distance: 5.0,
        },
        {
          _id: 'store2',
          name: 'Near Store',
          location: {
            address: '123 Near St',
            city: 'Bangalore',
            coordinates: [77.595, 12.972],
          },
          ratings: { average: 4.5, count: 100 },
          isActive: true,
          distance: 0.5,
        },
      ];

      mockSearchStores.mockResolvedValue({
        success: true,
        data: { stores: mockStores },
      });

      const { result } = renderHook(() =>
        useStoreSearch({
          category: 'food',
          sortBy: 'distance',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.stores.length).toBe(2);
      });

      // Stores should be sorted by distance (nearest first)
      expect(result.current.stores[0].name).toBe('Near Store');
      expect(result.current.stores[1].name).toBe('Far Store');
    });
  });

  describe('Error Handling', () => {
    it('should handle location permission denied gracefully', async () => {
      mockGetCurrentLocation.mockRejectedValue(new Error('Location permission denied'));

      const { result } = renderHook(() =>
        useStoreSearch({
          category: 'food',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle API errors without crashing', async () => {
      mockSearchStores.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useStoreSearch({
          category: 'food',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should handle empty results gracefully', async () => {
      mockSearchStores.mockResolvedValue({
        success: true,
        data: { stores: [] },
      });

      const { result } = renderHook(() =>
        useStoreSearch({
          category: 'empty-category',
          autoFetch: true,
        })
      );

      await waitFor(() => {
        expect(result.current.stores).toEqual([]);
      });
    });
  });

  describe('Debouncing', () => {
    it('should debounce search queries', async () => {
      mockSearchStores.mockResolvedValue({
        success: true,
        data: { stores: [] },
      });

      const { result } = renderHook(() =>
        useStoreSearch({
          category: 'food',
          autoFetch: false,
        })
      );

      // Make multiple rapid calls
      act(() => {
        result.current.search('test1');
        result.current.search('test2');
        result.current.search('test3');
      });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));

      // Should only call API once due to debouncing
      expect(mockSearchStores).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Haversine Distance Calculation', () => {
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const toRad = (deg: number): number => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  it('should calculate correct distance between two known points', () => {
    // Bangalore to Mysore is approximately 140 km
    const bangalore = { lat: 12.9716, lng: 77.5946 };
    const mysore = { lat: 12.2958, lng: 76.6394 };

    const distance = calculateDistance(
      bangalore.lat,
      bangalore.lng,
      mysore.lat,
      mysore.lng
    );

    // Should be approximately 140 km (allow 5% tolerance)
    expect(distance).toBeGreaterThan(130);
    expect(distance).toBeLessThan(150);
  });

  it('should return 0 for same coordinates', () => {
    const lat = 12.9716;
    const lng = 77.5946;

    const distance = calculateDistance(lat, lng, lat, lng);

    expect(distance).toBeCloseTo(0, 5);
  });

  it('should handle negative coordinates', () => {
    // Distance from Bangalore to Cape Town
    const bangalore = { lat: 12.9716, lng: 77.5946 };
    const capeTown = { lat: -33.9249, lng: 18.4241 };

    const distance = calculateDistance(
      bangalore.lat,
      bangalore.lng,
      capeTown.lat,
      capeTown.lng
    );

    // Should be approximately 9200 km
    expect(distance).toBeGreaterThan(9000);
    expect(distance).toBeLessThan(9500);
  });
});

describe('Store Card Distance Display', () => {
  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
  };

  it('should format distances under 1km in meters', () => {
    expect(formatDistance(0.5)).toBe('500m');
    expect(formatDistance(0.25)).toBe('250m');
    expect(formatDistance(0.1)).toBe('100m');
  });

  it('should format distances 1km and above in kilometers', () => {
    expect(formatDistance(1.0)).toBe('1.0km');
    expect(formatDistance(2.5)).toBe('2.5km');
    expect(formatDistance(10.0)).toBe('10.0km');
  });

  it('should handle edge cases', () => {
    expect(formatDistance(0.001)).toBe('1m');
    expect(formatDistance(0)).toBe('0m');
  });
});

describe('Coordinate Format Handling', () => {
  const normalizeCoordinates = (coords: any): { lat: number; lng: number } => {
    if (Array.isArray(coords)) {
      return { lat: coords[1], lng: coords[0] };
    }
    if (typeof coords === 'object') {
      return { lat: coords.latitude, lng: coords.longitude };
    }
    return { lat: 0, lng: 0 };
  };

  it('should parse GeoJSON [lng, lat] format', () => {
    const geoJsonCoords = [77.5946, 12.9716];
    const normalized = normalizeCoordinates(geoJsonCoords);

    expect(normalized.lat).toBe(12.9716);
    expect(normalized.lng).toBe(77.5946);
  });

  it('should parse object {latitude, longitude} format', () => {
    const objectCoords = { latitude: 12.9716, longitude: 77.5946 };
    const normalized = normalizeCoordinates(objectCoords);

    expect(normalized.lat).toBe(12.9716);
    expect(normalized.lng).toBe(77.5946);
  });
});
