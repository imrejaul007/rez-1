// Offers API Service
// Handles offer operations, search, filtering, favorites, and redemption
// Production-only: uses realOffersApi for all backend calls. No mock fallback.

import {
  ApiResponse,
  PaginatedResponse,
  GetOffersRequest,
  SearchOffersRequest,
  GetOfferDetailsRequest,
  AddToFavoritesRequest,
  RemoveFromFavoritesRequest,
  GetUserFavoritesRequest,
  TrackOfferViewRequest,
  RedeemOfferRequest,
  OffersApiEndpoints,
  ApiConfig,
  DetailedApiError,
  ApiErrorCode
} from '@/types/api.types';
import { Offer, OfferCategory } from '@/types/offers.types';
import { withRetry, createErrorResponse, logApiRequest, logApiResponse } from '@/utils/apiUtils';
import mainApiClient from './apiClient';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// API Configuration
const API_CONFIG: ApiConfig = {
  baseUrl: mainApiClient.getBaseURL(),
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  cache: {
    offersCache: {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 100
    },
    categoriesCache: {
      ttl: 30 * 60 * 1000, // 30 minutes
      maxSize: 50
    },
    userCache: {
      ttl: 60 * 60 * 1000, // 1 hour
      maxSize: 10
    }
  },
  endpoints: {
    offers: '/api/offers',
    categories: '/api/categories',
    favorites: '/api/user/favorites',
    search: '/api/offers/search',
    analytics: '/api/analytics',
    recommendations: '/api/recommendations'
  }
};

// Simple in-memory cache implementation
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  set(key: string, data: T, ttl: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Cache instances
const offersCache = new SimpleCache<ApiResponse<any>>(API_CONFIG.cache.offersCache.maxSize);
const categoriesCache = new SimpleCache<ApiResponse<OfferCategory[]>>(API_CONFIG.cache.categoriesCache.maxSize);
const userCache = new SimpleCache<ApiResponse<any>>(API_CONFIG.cache.userCache.maxSize);

// HTTP Client with region support
class OffersHttpClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    // Get current region from main apiClient for region filtering
    const currentRegion = mainApiClient.getRegion();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Rez-Region': currentRegion, // Include region header for filtering
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Handle different types of errors
      let errorCode: ApiErrorCode = 'SERVER_ERROR';
      let message = 'An unexpected error occurred';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorCode = 'TIMEOUT';
          message = 'Request timed out';
        } else if (error.message.includes('Network')) {
          errorCode = 'NETWORK_ERROR';
          message = 'Network connection failed';
        } else {
          message = error.message;
        }
      }

      throw {
        success: false,
        error: {
          code: errorCode,
          message,
          details: error
        },
        timestamp: new Date().toISOString()
      } as DetailedApiError;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request<T>(url.pathname + url.search);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// API Client instance
const offersApiClient = new OffersHttpClient(API_CONFIG);

// Production: Always use real backend API — no mock fallback
import realOffersApi from './realOffersApi';

export const offersApi = realOffersApi;

// Export utilities
export { API_CONFIG, offersCache, categoriesCache, userCache };

// Export for real API implementation
export { OffersHttpClient };
