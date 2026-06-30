// Nearby Earn API Service
// Fetches stores near a location with earning opportunities

import apiClient, { ApiResponse } from './apiClient';

export interface EarningOpportunity {
  type: 'cashback' | 'bonus_campaign' | 'multiplier';
  title: string;
  description: string;
  value: number;
  campaignId?: string;
}

export interface NearbyStore {
  _id: string;
  name: string;
  logo?: string;
  category?: string;
  distance?: number; // in meters, may be absent
  location?: {
    coordinates?: [number, number]; // [lng, lat]
    address?: string;
  };
  earningOpportunities?: EarningOpportunity[];
  totalCashbackPercent?: number;
}

class NearbyEarnApi {
  /**
   * Get stores near a location with earning opportunities.
   */
  async getStores(params: {
    lat: number;
    lng: number;
    radius?: number; // km, default 10
    limit?: number;
  }): Promise<ApiResponse<NearbyStore[]>> {
    try {
      const response = await apiClient.get<any>('/earn/nearby', {
        lat: params.lat,
        lng: params.lng,
        radius: params.radius || 10,
        limit: params.limit || 20,
      });
      if (response.success && response.data) {
        const stores = Array.isArray(response.data) ? response.data : response.data.stores || [];
        return { success: true, data: stores };
      }
      return { success: true, data: [] };
    } catch (err: unknown) {
      // FIX: `err: unknown` + instanceof guard — plain objects thrown by some
      // network libraries have `.message === undefined`, making the error
      // silently unreadable to the user without this check.
      const message = err instanceof Error ? err.message : String(err ?? 'Unknown error');
      return { success: false, error: message };
    }
  }
}

export const nearbyEarnApi = new NearbyEarnApi();
export default nearbyEarnApi;
