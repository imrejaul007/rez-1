// @ts-nocheck
import apiClient from '@/services/apiClient';

export interface ServiceabilityResult {
  isServiceable: boolean;
  nearbyStoreCount: number;
  suggestedMode: 'near-u' | 'mall';
}

/**
 * Check if a location has local stores within Near U range.
 * Uses GET /stores/nearby with a small radius (5km).
 */
export async function checkAreaServiceability(
  latitude: number,
  longitude: number
): Promise<ServiceabilityResult> {
  try {
    const res = await apiClient.get('/stores/nearby', {
      lat: latitude,
      lng: longitude,
      radius: 5,
      limit: 1,
    });

    const count = res.data?.stores?.length ?? res.data?.length ?? 0;

    return {
      isServiceable: count > 0,
      nearbyStoreCount: count,
      suggestedMode: count > 0 ? 'near-u' : 'mall',
    };
  } catch {
    // Default to serviceable on error — don't disrupt users
    return { isServiceable: true, nearbyStoreCount: 0, suggestedMode: 'near-u' };
  }
}
