// @ts-nocheck
// Homepage API Service
// Handles homepage data fetching, section management, and analytics
// Enhanced with comprehensive error handling, validation, and logging

import {
  HomepageApiResponse,
  SectionApiResponse,
  HomepageSection,
  HomepageAnalytics,
  HomepageBatchResponse,
  ProductItem,
  StoreItem,
  EventItem,
  SectionFilters,
  SectionSortOptions
} from '@/types/homepage.types';
import { withDeduplication, createRequestKey } from '@/utils/requestDeduplicator';
import { withRetry, createErrorResponse, logApiRequest, logApiResponse } from '@/utils/apiUtils';
import { validateProductArray, validateStoreArray } from '@/utils/responseValidators';
import apiClient, { ApiResponse } from './apiClient';
import cacheService from './cacheService';
import { useUserIdentityStore } from '@/stores/userIdentityStore';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// Cache configuration
const HOMEPAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const SECTION_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// API endpoints (relative paths - apiClient prepends base URL)
const ENDPOINTS = {
  HOMEPAGE: '/homepage',
  SECTION: (id: string) => `/homepage/sections/${id}`,
  ANALYTICS: '/analytics/homepage',
  USER_PREFERENCES: '/users/preferences',
} as const;

// Custom API Error class
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isTimeout(): boolean {
    return this.status === 408;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

// ===== VALIDATION HELPERS =====

/**
 * Validates user ID format
 */
function validateUserId(userId?: string): boolean {
  if (!userId) return true; // Optional parameter
  if (typeof userId !== 'string') return false;
  return userId.trim().length > 0;
}

/**
 * Validates section ID format
 */
function validateSectionId(sectionId: string): boolean {
  if (!sectionId || typeof sectionId !== 'string') {
    devLog.warn('[HOMEPAGE API] Invalid section ID');
    return false;
  }
  return sectionId.trim().length > 0;
}

/**
 * Validates pagination parameters
 */
function validatePaginationParams(page?: number, limit?: number): boolean {
  if (page !== undefined && (typeof page !== 'number' || page < 1)) {
    devLog.warn('[HOMEPAGE API] Invalid page parameter');
    return false;
  }
  if (limit !== undefined && (typeof limit !== 'number' || limit < 1 || limit > 100)) {
    devLog.warn('[HOMEPAGE API] Invalid limit parameter (must be 1-100)');
    return false;
  }
  return true;
}

/**
 * Validates filter parameters
 */
function validateFilters(filters?: SectionFilters): boolean {
  if (!filters) return true; // Optional parameter

  if (typeof filters !== 'object') {
    devLog.warn('[HOMEPAGE API] Filters must be an object');
    return false;
  }

  // Validate price range if provided
  if (filters.priceRange) {
    const { min, max } = filters.priceRange;
    if (typeof min !== 'number' || typeof max !== 'number' || min < 0 || max < min) {
      devLog.warn('[HOMEPAGE API] Invalid price range');
      return false;
    }
  }

  // Validate rating if provided
  if (filters.rating !== undefined) {
    if (typeof filters.rating !== 'number' || filters.rating < 0 || filters.rating > 5) {
      devLog.warn('[HOMEPAGE API] Invalid rating (must be 0-5)');
      return false;
    }
  }

  return true;
}

/**
 * Validates homepage response structure
 */
function validateHomepageResponse(response: any): boolean {
  if (!response || typeof response !== 'object') {
    devLog.warn('[HOMEPAGE API] Invalid response: not an object');
    return false;
  }

  if (!Array.isArray(response.sections)) {
    devLog.warn('[HOMEPAGE API] Response missing sections array');
    return false;
  }

  return true;
}

/**
 * Validates section response structure
 */
function validateSectionResponse(response: any): boolean {
  if (!response || typeof response !== 'object') {
    devLog.warn('[HOMEPAGE API] Invalid section response: not an object');
    return false;
  }

  if (!response.section || typeof response.section !== 'object') {
    devLog.warn('[HOMEPAGE API] Section response missing section object');
    return false;
  }

  return true;
}

/**
 * Validates batch response structure
 * Accepts both formats: 
 * - Legacy: data.sections.{sectionName}
 * - Current: data.{sectionName} (e.g., data.featuredProducts, data.newArrivals)
 */
function validateBatchResponse(response: any): boolean {
  if (!response || typeof response !== 'object') {
    devLog.warn('[HOMEPAGE API] Invalid batch response: not an object');
    return false;
  }

  // apiClient already unwraps the backend's data field,
  // so response IS the data object (not response.data)
  const data = response.data || response;

  // Accept either format: data.sections or data directly containing arrays
  const hasLegacyFormat = data.sections && typeof data.sections === 'object';
  const hasCurrentFormat = Array.isArray(data.featuredProducts) ||
                           Array.isArray(data.newArrivals) ||
                           Array.isArray(data.trendingStores);

  if (!hasLegacyFormat && !hasCurrentFormat) {
    devLog.warn('[HOMEPAGE API] Batch response missing valid data structure');
    return false;
  }

  return true;
}

// Homepage API Service
export class HomepageApiService {
  /**
   * Fetch complete homepage data including all sections
   * Enhanced with validation, error handling, and logging
   */
  private static async _fetchHomepageData(userId?: string): Promise<ApiResponse<HomepageApiResponse>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!validateUserId(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format',
          message: 'User ID must be a valid string',
        };
      }

      const queryParams: Record<string, any> = {};
      if (userId) queryParams.userId = userId;

      logApiRequest('GET', ENDPOINTS.HOMEPAGE);

      const apiResponse = await withRetry(
        () => apiClient.get<HomepageApiResponse>(ENDPOINTS.HOMEPAGE, Object.keys(queryParams).length > 0 ? queryParams : undefined),
        { maxRetries: 2 }
      );

      logApiResponse('GET', ENDPOINTS.HOMEPAGE, apiResponse, Date.now() - startTime);

      if (!apiResponse.success || !apiResponse.data) {
        return {
          success: false,
          error: apiResponse.error || 'Failed to fetch homepage data',
          message: 'Failed to load homepage. Please try again.',
        };
      }

      const response = apiResponse.data;

      // Validate response structure
      if (response && !validateHomepageResponse(response)) {
        devLog.error('[HOMEPAGE API] Homepage data validation failed');
        return {
          success: false,
          error: 'Invalid homepage data structure',
          message: 'Failed to load homepage. Please try again.',
        };
      }

      // Validate section items based on type
      if (response && response.sections) {
        response.sections.forEach((section: HomepageSection) => {
          if (section.type === 'products' && Array.isArray(section.items)) {
            const validItems = validateProductArray(section.items as ProductItem[]);
            section.items = validItems;

            if (validItems.length < section.items.length) {
              devLog.warn(`[HOMEPAGE API] Filtered invalid products in section ${section.id}`);
            }
          } else if (section.type === 'stores' && Array.isArray(section.items)) {
            const validItems = validateStoreArray(section.items as StoreItem[]);
            section.items = validItems;

            if (validItems.length < section.items.length) {
              devLog.warn(`[HOMEPAGE API] Filtered invalid stores in section ${section.id}`);
            }
          }
        });
      }

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      devLog.error('[HOMEPAGE API] Error fetching homepage data:', error);
      return createErrorResponse(error, 'Failed to load homepage. Please try again.');
    }
  }

  // Deduplicated version
  static fetchHomepageData = withDeduplication(
    HomepageApiService._fetchHomepageData,
    (userId?: string) => createRequestKey(ENDPOINTS.HOMEPAGE, { userId })
  );

  /**
   * Fetch homepage data using batch endpoint (GET /api/v1/homepage)
   * Returns all sections in a single request
   * Enhanced with validation, error handling, and logging
   *
   * Response format:
   * {
   *   success: true,
   *   data: {
   *     sections: {
   *       events: EventItem[],
   *       justForYou: ProductItem[],
   *       newArrivals: ProductItem[],
   *       trendingStores: StoreItem[],
   *       offers: ProductItem[],
   *       flashSales: ProductItem[]
   *     },
   *     metadata: {
   *       cached: boolean,
   *       timestamp: string
   *     }
   *   }
   * }
   */
  private static async _fetchHomepageBatch(userId?: string): Promise<ApiResponse<HomepageBatchResponse>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!validateUserId(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format',
          message: 'User ID must be a valid string',
        };
      }

      // Include region in URL params to prevent browser caching issues
      // Browser caches by URL, so different regions should have different URLs
      const currentRegion = apiClient.getRegion();
      const batchParams: Record<string, any> = { region: currentRegion };
      if (userId) batchParams.userId = userId;

      // Send identity segment for server-side personalization context
      const identityState = useUserIdentityStore.getState();
      if (identityState.segment && identityState.segment !== 'normal') {
        batchParams.segment = identityState.segment;
      }
      if (identityState.featureLevel > 1) {
        batchParams.featureLevel = identityState.featureLevel;
      }

      logApiRequest('GET', ENDPOINTS.HOMEPAGE, { batch: true, region: currentRegion });

      const apiResponse = await apiClient.get<HomepageBatchResponse>(ENDPOINTS.HOMEPAGE, batchParams, { timeout: 4000 });

      logApiResponse('GET', ENDPOINTS.HOMEPAGE, apiResponse, Date.now() - startTime);

      if (!apiResponse.success || !apiResponse.data) {
        return {
          success: false,
          error: apiResponse.error || 'Failed to fetch homepage batch data',
          message: 'Failed to load homepage data. Please try again.',
        };
      }

      const response = apiResponse.data;

      // Validate response structure
      if (!validateBatchResponse(response)) {
        devLog.error('[HOMEPAGE API] Batch response validation failed');
        return {
          success: false,
          error: 'Invalid batch response structure',
          message: 'Failed to load homepage data. Please try again.',
        };
      }

      // Handle both formats: data.sections or data directly containing arrays
      // Backend returns: { featuredProducts, newArrivals, trendingStores, ... }
      // Frontend expects: { sections: { justForYou, newArrivals, trendingStores, ... } }
      // apiClient already unwraps the backend's data field, so response IS the data
      const rawData = response.data || response;
      const sections = rawData.sections || {
        justForYou: rawData.featuredProducts || [],
        newArrivals: rawData.newArrivals || [],
        trendingStores: rawData.trendingStores || rawData.featuredStores || [],
        events: rawData.upcomingEvents || [],
        offers: rawData.megaOffers || rawData.studentOffers || [],
        flashSales: rawData.flashSales || [],
      };
      const validatedSections: any = {};

      // Validate products sections
      if (sections.justForYou) {
        validatedSections.justForYou = validateProductArray(sections.justForYou);
        if (validatedSections.justForYou.length < sections.justForYou.length) {
          devLog.warn(`[HOMEPAGE API] Filtered ${sections.justForYou.length - validatedSections.justForYou.length} invalid products from justForYou`);
        }
      }

      if (sections.newArrivals) {
        validatedSections.newArrivals = validateProductArray(sections.newArrivals);
        if (validatedSections.newArrivals.length < sections.newArrivals.length) {
          devLog.warn(`[HOMEPAGE API] Filtered ${sections.newArrivals.length - validatedSections.newArrivals.length} invalid products from newArrivals`);
        }
      }

      // Offers and flash sales are NOT products - they have different schemas
      // (cashbackPercentage, optional originalPrice/discountedPrice, no pricing object)
      if (sections.offers) {
        validatedSections.offers = sections.offers;
      }

      if (sections.flashSales) {
        validatedSections.flashSales = sections.flashSales;
      }

      // Validate stores section
      if (sections.trendingStores) {
        validatedSections.trendingStores = validateStoreArray(sections.trendingStores);
        if (validatedSections.trendingStores.length < sections.trendingStores.length) {
          devLog.warn(`[HOMEPAGE API] Filtered ${sections.trendingStores.length - validatedSections.trendingStores.length} invalid stores from trendingStores`);
        }
      }

      // Keep events as-is (no specific validator yet)
      if (sections.events) {
        validatedSections.events = sections.events;
      }

      // Return with sections wrapper so transformBatchResponseToSections can consume it
      // Pass through userContext if present (backend includes it for authenticated users)
      return {
        success: true,
        data: {
          sections: validatedSections,
          metadata: rawData._metadata || rawData.metadata,
          userContext: rawData.userContext || null,
        },
      };
    } catch (error: any) {
      devLog.error('❌ [HOMEPAGE API] Batch endpoint failed:', error);
      return createErrorResponse(error, 'Failed to load homepage data. Please try again.');
    }
  }

  // Deduplicated version - include region in dedup key
  static fetchHomepageBatch = withDeduplication(
    HomepageApiService._fetchHomepageBatch,
    (userId?: string) => createRequestKey(`${ENDPOINTS.HOMEPAGE}_batch`, { userId, region: apiClient.getRegion() })
  );

  /**
   * Fetch homepage data with persistent cache and stale-while-revalidate
   * Returns cached data instantly if available, refreshes in background if stale
   */
  static async fetchHomepageDataCached(userId?: string): Promise<HomepageApiResponse> {
    const cacheKey = `homepage:${userId || 'anonymous'}`;

    return cacheService.getWithRevalidation(
      cacheKey,
      () => HomepageApiService.fetchHomepageData(userId),
      {
        ttl: HOMEPAGE_CACHE_TTL,
        priority: 'high',
      }
    );
  }

  /**
   * Fetch data for a specific section
   * Enhanced with validation, error handling, and logging
   */
  private static async _fetchSectionData(
    sectionId: string,
    userId?: string,
    filters?: SectionFilters,
    pagination?: { page?: number; limit?: number },
    sort?: SectionSortOptions
  ): Promise<ApiResponse<SectionApiResponse>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!validateSectionId(sectionId)) {
        return {
          success: false,
          error: 'Section ID is required',
          message: 'Please provide a valid section ID',
        };
      }

      if (!validateUserId(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format',
          message: 'User ID must be a valid string',
        };
      }

      if (!validateFilters(filters)) {
        return {
          success: false,
          error: 'Invalid filter parameters',
          message: 'Please check your filter settings',
        };
      }

      if (pagination && !validatePaginationParams(pagination.page, pagination.limit)) {
        return {
          success: false,
          error: 'Invalid pagination parameters',
          message: 'Page and limit must be positive numbers',
        };
      }

      // Build query parameters
      const searchParams = new URLSearchParams();

      if (userId) searchParams.append('userId', userId);

      // Add filter parameters
      if (filters) {
        if (filters.category && Array.isArray(filters.category)) {
          filters.category.forEach(cat => searchParams.append('category', cat));
        }
        if (filters.priceRange) {
          searchParams.append('minPrice', String(filters.priceRange.min));
          searchParams.append('maxPrice', String(filters.priceRange.max));
        }
        if (filters.rating !== undefined) {
          searchParams.append('rating', String(filters.rating));
        }
        if (filters.location) {
          searchParams.append('location', filters.location);
        }
        if (filters.availability) {
          searchParams.append('availability', filters.availability);
        }
      }

      // Add pagination parameters
      if (pagination) {
        if (pagination.page) searchParams.append('page', String(pagination.page));
        if (pagination.limit) searchParams.append('limit', String(pagination.limit));
      }

      // Add sort parameters
      if (sort) {
        searchParams.append('sortBy', sort.field);
        searchParams.append('sortOrder', sort.direction);
      }

      const queryString = searchParams.toString();
      const sectionEndpoint = `${ENDPOINTS.SECTION(sectionId)}${queryString ? `?${queryString}` : ''}`;

      logApiRequest('GET', sectionEndpoint, { sectionId, filters, pagination, sort });

      const apiResponse = await withRetry(
        () => apiClient.get<SectionApiResponse>(sectionEndpoint),
        { maxRetries: 2 }
      );

      logApiResponse('GET', sectionEndpoint, apiResponse, Date.now() - startTime);

      if (!apiResponse.success || !apiResponse.data) {
        return {
          success: false,
          error: apiResponse.error || 'Failed to fetch section data',
          message: 'Failed to load section. Please try again.',
        };
      }

      const response = apiResponse.data;

      // Validate response structure
      if (!validateSectionResponse(response)) {
        devLog.error(`[HOMEPAGE API] Section ${sectionId} response validation failed`);
        return {
          success: false,
          error: 'Invalid section data structure',
          message: 'Failed to load section. Please try again.',
        };
      }

      // Validate section items based on type
      if (response.section) {
        const section = response.section;

        if (section.type === 'products' && Array.isArray(section.items)) {
          const validItems = validateProductArray(section.items as ProductItem[]);
          section.items = validItems;

          if (validItems.length < section.items.length) {
            devLog.warn(`[HOMEPAGE API] Filtered ${section.items.length - validItems.length} invalid products from section ${sectionId}`);
          }
        } else if (section.type === 'stores' && Array.isArray(section.items)) {
          const validItems = validateStoreArray(section.items as StoreItem[]);
          section.items = validItems;

          if (validItems.length < section.items.length) {
            devLog.warn(`[HOMEPAGE API] Filtered ${section.items.length - validItems.length} invalid stores from section ${sectionId}`);
          }
        }
      }

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      devLog.error(`[HOMEPAGE API] Error fetching section ${sectionId}:`, error);
      return createErrorResponse(error, `Failed to load section. Please try again.`);
    }
  }

  // Deduplicated version
  static fetchSectionData = withDeduplication(
    HomepageApiService._fetchSectionData,
    (sectionId: string, userId?: string, filters?: Record<string, any>) =>
      createRequestKey(ENDPOINTS.SECTION(sectionId), { userId, ...filters })
  );

  /**
   * Fetch section data with persistent cache and stale-while-revalidate
   * Returns cached data instantly if available, refreshes in background if stale
   */
  static async fetchSectionDataCached(
    sectionId: string,
    userId?: string,
    filters?: Record<string, any>
  ): Promise<SectionApiResponse> {
    const cacheKey = HomepageCacheManager.getSectionKey(sectionId, userId, filters);

    return cacheService.getWithRevalidation(
      cacheKey,
      () => HomepageApiService.fetchSectionData(sectionId, userId, filters),
      {
        ttl: SECTION_CACHE_TTL,
        priority: 'medium',
      }
    );
  }

  /**
   * Send analytics data to backend
   * Enhanced with validation and error handling
   */
  static async trackAnalytics(analytics: Partial<HomepageAnalytics>): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!analytics || typeof analytics !== 'object') {
        return {
          success: false,
          error: 'Invalid analytics data',
          message: 'Analytics data must be an object',
        };
      }

      if (Object.keys(analytics).length === 0) {
        return {
          success: false,
          error: 'Empty analytics data',
          message: 'Analytics data cannot be empty',
        };
      }

      const payload = {
        ...analytics,
        timestamp: new Date().toISOString(),
      };

      logApiRequest('POST', ENDPOINTS.ANALYTICS, payload);

      // Note: Analytics failures shouldn't block the app, so we don't use retry here
      const apiResponse = await apiClient.post<{ message: string }>(ENDPOINTS.ANALYTICS, payload);

      logApiResponse('POST', ENDPOINTS.ANALYTICS, apiResponse, Date.now() - startTime);

      return apiResponse;
    } catch (error: any) {
      // Analytics failures shouldn't block the app
      devLog.warn('[HOMEPAGE API] Failed to send analytics:', error);
      return {
        success: false,
        error: error?.message || 'Analytics tracking failed',
        message: 'Failed to track analytics',
      };
    }
  }

  /**
   * Track section view
   * Enhanced with validation
   */
  static async trackSectionView(sectionId: string, userId?: string): Promise<ApiResponse<{ message: string }>> {
    try {
      // Validate input
      if (!validateSectionId(sectionId)) {
        return {
          success: false,
          error: 'Invalid section ID',
          message: 'Section ID is required',
        };
      }

      return this.trackAnalytics({
        sectionViews: { [sectionId]: 1 }
      });
    } catch (error: any) {
      devLog.warn('[HOMEPAGE API] Failed to track section view:', error);
      return {
        success: false,
        error: error?.message || 'Section view tracking failed',
        message: 'Failed to track section view',
      };
    }
  }

  /**
   * Track item click
   * Enhanced with validation
   */
  static async trackItemClick(
    sectionId: string,
    itemId: string,
    userId?: string
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      // Validate input
      if (!validateSectionId(sectionId)) {
        return {
          success: false,
          error: 'Invalid section ID',
          message: 'Section ID is required',
        };
      }

      if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
        return {
          success: false,
          error: 'Invalid item ID',
          message: 'Item ID is required',
        };
      }

      return this.trackAnalytics({
        itemClicks: { [`${sectionId}:${itemId}`]: 1 }
      });
    } catch (error: any) {
      devLog.warn('[HOMEPAGE API] Failed to track item click:', error);
      return {
        success: false,
        error: error?.message || 'Item click tracking failed',
        message: 'Failed to track item click',
      };
    }
  }

  /**
   * Update user preferences
   * Enhanced with validation and error handling
   */
  static async updateUserPreferences(
    userId: string,
    preferences: string[]
  ): Promise<ApiResponse<{ message: string }>> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        return {
          success: false,
          error: 'User ID is required',
          message: 'Please provide a valid user ID',
        };
      }

      if (!Array.isArray(preferences)) {
        return {
          success: false,
          error: 'Preferences must be an array',
          message: 'Preferences must be provided as an array',
        };
      }

      if (preferences.length === 0) {
        return {
          success: false,
          error: 'Preferences cannot be empty',
          message: 'Please select at least one preference',
        };
      }

      // Validate each preference is a string
      const invalidPreferences = preferences.filter(p => typeof p !== 'string' || p.trim().length === 0);
      if (invalidPreferences.length > 0) {
        return {
          success: false,
          error: 'Invalid preference values',
          message: 'All preferences must be non-empty strings',
        };
      }

      const payload = {
        userId,
        preferences,
        updatedAt: new Date().toISOString()
      };

      logApiRequest('PUT', ENDPOINTS.USER_PREFERENCES, { userId, preferenceCount: preferences.length });

      const apiResponse = await withRetry(
        () => apiClient.put<{ message: string }>(ENDPOINTS.USER_PREFERENCES, payload),
        { maxRetries: 2 }
      );

      logApiResponse('PUT', ENDPOINTS.USER_PREFERENCES, apiResponse, Date.now() - startTime);

      return apiResponse;
    } catch (error: any) {
      devLog.error('[HOMEPAGE API] Failed to update user preferences:', error);
      return createErrorResponse(error, 'Failed to update preferences. Please try again.');
    }
  }

  /**
   * Refresh section with retry logic
   * Enhanced with validation and error handling
   */
  static async refreshSectionWithRetry(
    sectionId: string,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<ApiResponse<SectionApiResponse>> {
    try {
      // Validate input
      if (!validateSectionId(sectionId)) {
        return {
          success: false,
          error: 'Invalid section ID',
          message: 'Section ID is required',
        };
      }

      if (typeof maxRetries !== 'number' || maxRetries < 1 || maxRetries > 5) {
        return {
          success: false,
          error: 'Invalid maxRetries parameter',
          message: 'maxRetries must be between 1 and 5',
        };
      }

      if (typeof retryDelay !== 'number' || retryDelay < 100 || retryDelay > 10000) {
        return {
          success: false,
          error: 'Invalid retryDelay parameter',
          message: 'retryDelay must be between 100ms and 10000ms',
        };
      }

      devLog.log(`[HOMEPAGE API] Refreshing section ${sectionId} with ${maxRetries} retries`);

      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await this.fetchSectionData(sectionId);

          if (result.success) {
            devLog.log(`[HOMEPAGE API] Section ${sectionId} refreshed successfully on attempt ${attempt}`);
            return result;
          }

          lastError = new Error(result.error || 'Unknown error');

          // Don't retry validation errors
          if (result.error?.includes('Invalid') || result.error?.includes('validation')) {
            return result;
          }

          if (attempt < maxRetries) {
            const delay = retryDelay * attempt;
            devLog.log(`[HOMEPAGE API] Retry ${attempt}/${maxRetries} for section ${sectionId} in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          lastError = error as Error;

          if (error instanceof ApiError && error.isClientError) {
            // Don't retry client errors (4xx)
            devLog.error(`[HOMEPAGE API] Client error for section ${sectionId}, not retrying`);
            return createErrorResponse(error, 'Failed to refresh section');
          }

          if (attempt < maxRetries) {
            const delay = retryDelay * attempt;
            devLog.log(`[HOMEPAGE API] Retry ${attempt}/${maxRetries} for section ${sectionId} in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      devLog.error(`[HOMEPAGE API] All ${maxRetries} retry attempts failed for section ${sectionId}`);
      return createErrorResponse(lastError, 'Failed to refresh section after multiple attempts');
    } catch (error: any) {
      devLog.error('[HOMEPAGE API] Error in refreshSectionWithRetry:', error);
      return createErrorResponse(error, 'Failed to refresh section');
    }
  }

  /**
   * Batch refresh multiple sections
   * Enhanced with validation and error handling
   * Benefits from automatic deduplication - identical section requests share promises
   */
  static async refreshMultipleSections(
    sectionIds: string[],
    userId?: string
  ): Promise<ApiResponse<Record<string, SectionApiResponse | { error: string }>>> {
    try {
      // Validate input
      if (!Array.isArray(sectionIds)) {
        return {
          success: false,
          error: 'sectionIds must be an array',
          message: 'Please provide an array of section IDs',
        };
      }

      if (sectionIds.length === 0) {
        return {
          success: false,
          error: 'sectionIds cannot be empty',
          message: 'Please provide at least one section ID',
        };
      }

      if (sectionIds.length > 20) {
        return {
          success: false,
          error: 'Too many sections',
          message: 'Cannot refresh more than 20 sections at once',
        };
      }

      // Validate each section ID
      const invalidSections = sectionIds.filter(id => !validateSectionId(id));
      if (invalidSections.length > 0) {
        return {
          success: false,
          error: `Invalid section IDs: ${invalidSections.join(', ')}`,
          message: 'Some section IDs are invalid',
        };
      }

      if (!validateUserId(userId)) {
        return {
          success: false,
          error: 'Invalid user ID format',
          message: 'User ID must be a valid string',
        };
      }

      devLog.log(`[HOMEPAGE API] Refreshing ${sectionIds.length} sections in parallel`);

      const results: Record<string, SectionApiResponse | { error: string }> = {};

      // All concurrent calls to same section will be deduplicated automatically
      const settledResults = await Promise.allSettled(
        sectionIds.map(async (sectionId) => {
          try {
            const result = await this.fetchSectionData(sectionId, userId);
            if (result.success && result.data) {
              results[sectionId] = result.data;
            } else {
              results[sectionId] = { error: result.error || 'Unknown error' };
            }
          } catch (error: any) {
            results[sectionId] = { error: error?.message || 'Unknown error' };
          }
        })
      );

      const successCount = Object.values(results).filter(r => !('error' in r)).length;
      const failureCount = sectionIds.length - successCount;

      devLog.log(`[HOMEPAGE API] Batch refresh completed: ${successCount} succeeded, ${failureCount} failed`);

      return {
        success: true,
        data: results,
        message: `Refreshed ${successCount} of ${sectionIds.length} sections successfully`,
      };
    } catch (error: any) {
      devLog.error('[HOMEPAGE API] Error in refreshMultipleSections:', error);
      return createErrorResponse(error, 'Failed to refresh sections');
    }
  }
}

// Cache manager for API responses
export class HomepageCacheManager {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 50;

  /**
   * Get cached data if still valid
   */
  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set data in cache
   */
  static set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Implement simple LRU eviction
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear specific cache entry
   */
  static clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  static clearAll(): void {
    this.cache.clear();
  }

  /**
   * Generate cache key for section
   */
  static getSectionKey(sectionId: string, userId?: string, filters?: Record<string, any>): string {
    const parts = [sectionId];
    if (userId) parts.push(`user:${userId}`);
    if (filters) parts.push(`filters:${JSON.stringify(filters)}`);
    return parts.join('|');
  }
}

// Higher-order function to add caching to API calls
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttl?: number
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args);
    
    // Try to get from cache first
    const cached = HomepageCacheManager.get<R>(key);
    if (cached) return cached;
    
    // Fetch from API and cache the result
    const result = await fn(...args);
    HomepageCacheManager.set(key, result, ttl);
    
    return result;
  };
}

// Cached API methods
export const CachedHomepageApi = {
  fetchHomepageData: withCache(
    HomepageApiService.fetchHomepageData,
    (userId?: string) => `homepage:${userId || 'anonymous'}`
  ),

  fetchSectionData: withCache(
    HomepageApiService.fetchSectionData,
    (sectionId: string, userId?: string, filters?: Record<string, any>) =>
      HomepageCacheManager.getSectionKey(sectionId, userId, filters)
  ),
};

/**
 * Cache warming utilities for homepage
 */
export class HomepageCacheWarmer {
  /**
   * Warm homepage cache on app start
   * Preloads critical homepage data into persistent cache
   */
  static async warmHomepageCache(userId?: string): Promise<void> {
    try {
      devLog.log('🔥 [HOMEPAGE] Warming homepage cache...');

      // Warm homepage data
      await HomepageApiService.fetchHomepageDataCached(userId);

      devLog.log('✅ [HOMEPAGE] Homepage cache warmed successfully');
    } catch (error) {
      devLog.error('❌ [HOMEPAGE] Failed to warm homepage cache:', error);
      // Don't throw - cache warming failures shouldn't block app
    }
  }

  /**
   * Warm specific sections cache
   */
  static async warmSectionsCache(sectionIds: string[], userId?: string): Promise<void> {
    try {
      devLog.log(`🔥 [HOMEPAGE] Warming ${sectionIds.length} section caches...`);

      await Promise.all(
        sectionIds.map(sectionId =>
          HomepageApiService.fetchSectionDataCached(sectionId, userId)
        )
      );

      devLog.log('✅ [HOMEPAGE] Section caches warmed successfully');
    } catch (error) {
      devLog.error('❌ [HOMEPAGE] Failed to warm section caches:', error);
      // Don't throw - cache warming failures shouldn't block app
    }
  }

  /**
   * Invalidate all homepage caches
   */
  static async invalidateHomepageCache(): Promise<void> {
    try {
      devLog.log('🗑️ [HOMEPAGE] Invalidating homepage cache...');

      // Invalidate all homepage-related caches
      await cacheService.invalidatePattern('^homepage:');

      // Also clear old in-memory cache
      HomepageCacheManager.clearAll();

      devLog.log('✅ [HOMEPAGE] Homepage cache invalidated');
    } catch (error) {
      devLog.error('❌ [HOMEPAGE] Failed to invalidate homepage cache:', error);
    }
  }

  /**
   * Invalidate specific section cache
   */
  static async invalidateSectionCache(sectionId: string, userId?: string, filters?: Record<string, any>): Promise<void> {
    try {
      const cacheKey = HomepageCacheManager.getSectionKey(sectionId, userId, filters);
      await cacheService.remove(cacheKey);
      HomepageCacheManager.clear(cacheKey);
      devLog.log(`🗑️ [HOMEPAGE] Invalidated section cache: ${sectionId}`);
    } catch (error) {
      devLog.error(`❌ [HOMEPAGE] Failed to invalidate section cache: ${sectionId}`, error);
    }
  }

  /**
   * Get cache statistics for homepage
   */
  static async getHomepageCacheStats() {
    return await cacheService.getStats();
  }

  /**
   * Fetch all user-specific homepage data in a single request.
   * Combines: wallet balance, voucher count, offers count, cart count, subscription tier.
   */
  static async getUserContext(): Promise<{
    success: boolean;
    data?: {
      walletBalance: number;
      totalSaved: number;
      voucherCount: number;
      offersCount: number;
      cartItemCount: number;
      subscription: { tier: string; status: string };
    };
  }> {
    try {
      const response = await apiClient.get('/homepage/user-context');
      return response;
    } catch (error) {
      devLog.error('❌ [HOMEPAGE] Error fetching user context:', error);
      return { success: false };
    }
  }
}

export default HomepageApiService;