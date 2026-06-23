/**
 * Social Proof API Service
 * Fetches nearby activity and city-wide stats for social proof banners
 */

import apiClient, { ApiResponse } from './apiClient';

// Activity item representing a user's savings
export interface SocialProofActivity {
  id: string;
  firstName: string;
  savings: number;
  savingsType: 'cashback' | 'discount';
  storeName: string;
  storeId?: string;
  storeLogo?: string;
  timeAgo: string;
  distance: string;
}

// Store aggregate showing how many redeemed today
export interface StoreAggregate {
  storeId: string;
  storeName: string;
  storeLogo?: string;
  todayRedemptions: number;
  message: string;
}

// City-wide statistics
export interface CityWideStats {
  totalPeopleToday: number;
  totalSavingsToday: number;
  avgSavings?: number;
  city: string;
  message: string;
}

// Response from nearby activity endpoint
export interface NearbyActivityResponse {
  activities: SocialProofActivity[];
  storeAggregates: StoreAggregate[];
  cityWideStats?: CityWideStats;
  meta: {
    totalNearbyToday: number;
    radiusKm: number;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    cachedAt: string;
  };
}

// Parameters for fetching nearby activity
export interface NearbyActivityParams {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
  city?: string;
}

/**
 * Fetch nearby user activity for social proof display
 */
export const getNearbyActivity = async (
  params: NearbyActivityParams
): Promise<ApiResponse<NearbyActivityResponse>> => {
  try {
    const queryParams = new URLSearchParams({
      latitude: params.latitude.toString(),
      longitude: params.longitude.toString(),
    });

    if (params.radius) {
      queryParams.append('radius', params.radius.toString());
    }
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.city) {
      queryParams.append('city', params.city);
    }

    const response = await apiClient.get<NearbyActivityResponse>(
      `/social-proof/nearby-activity?${queryParams.toString()}`
    );

    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch nearby activity',
    };
  }
};

/**
 * Fetch city-wide statistics when no nearby activity available
 */
export const getCityWideStats = async (
  city: string
): Promise<ApiResponse<CityWideStats>> => {
  try {
    const response = await apiClient.get<CityWideStats>(
      `/social-proof/city-stats?city=${encodeURIComponent(city)}`
    );

    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch city statistics',
    };
  }
};

export const socialProofApi = {
  getNearbyActivity,
  getCityWideStats,
};

export default socialProofApi;
