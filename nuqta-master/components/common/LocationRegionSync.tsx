// @ts-nocheck
/**
 * LocationRegionSync Component
 *
 * Syncs the LocationContext with the region store on app initialization.
 * Ensures that when the app loads, the location defaults to the current region's location.
 */

import React, { useEffect, useRef } from 'react';
import { useRegionStore, type RegionId } from '@/stores/regionStore';
import { useLocation } from '@/contexts/LocationContext';
import { UserLocation } from '@/types/location.types';

// Region location data
const REGION_LOCATIONS: Record<RegionId, { name: string; coords: { lat: number; lng: number }; country: string; timezone: string }> = {
  dubai: {
    name: 'Dubai',
    coords: { lat: 25.2048, lng: 55.2708 },
    country: 'United Arab Emirates',
    timezone: 'Asia/Dubai'
  },
  bangalore: {
    name: 'Bangalore',
    coords: { lat: 12.9716, lng: 77.5946 },
    country: 'India',
    timezone: 'Asia/Kolkata'
  },
  china: {
    name: 'Shanghai',
    coords: { lat: 31.2304, lng: 121.4737 },
    country: 'China',
    timezone: 'Asia/Shanghai'
  },
};

function LocationRegionSync() {
  const regionState = useRegionStore((s) => s.state);
  const { state: locationState, setManualLocation } = useLocation();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!regionState.isInitialized || hasInitialized.current) return;
    hasInitialized.current = true;

    const regionData = REGION_LOCATIONS[regionState.currentRegion];
    if (!regionData) return;

    const currentCity = locationState.currentLocation?.address?.city;
    const regionCity = regionData.name;

    if (!locationState.currentLocation || currentCity !== regionCity) {
      const defaultLocation: UserLocation = {
        coordinates: {
          latitude: regionData.coords.lat,
          longitude: regionData.coords.lng,
        },
        address: {
          address: `${regionData.name}, ${regionData.country}`,
          city: regionData.name,
          state: regionData.name,
          country: regionData.country,
          pincode: '',
          formattedAddress: `${regionData.name}, ${regionData.country}`,
        },
        timezone: regionData.timezone,
        lastUpdated: new Date(),
        source: 'manual' as const,
      };

      setManualLocation(defaultLocation).catch((err) => {
        console.error('[LocationRegionSync] Error:', err);
      });
    }
  }, [regionState.isInitialized, regionState.currentRegion, setManualLocation]);

  // This component doesn't render anything
  return null;
}

export default React.memo(LocationRegionSync);
