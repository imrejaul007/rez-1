import productsService from './productsApi';
import storesService from './storesApi';
import eventsApiService from './eventsApi';
import realOffersApi from './realOffersApi';
import brandApiService from './brandApi';
import cacheService from './cacheService';
import locationService from './locationService';
import recommendationService from './recommendationApi';
import apiClient from './apiClient';
import { ProductItem, RecommendationItem, HomepageSection, EventItem, HomepageBatchResponse } from '@/types/homepage.types';
import { getSectionById } from '@/data/homepageData';
import {
  getFallbackSectionData,
  getAllFallbackSections
} from '@/data/offlineFallbackData';
import HomepageApiService from './homepageApi';

// Region currency getter - will be set by RegionContext
let getCurrencySymbolFn: (() => string) | null = null;

export function setHomepageCurrencyGetter(fn: (() => string) | null) {
  getCurrencySymbolFn = fn;
}

// Helper to get current currency symbol
function getCurrentCurrencySymbol(): string {
  return getCurrencySymbolFn ? getCurrencySymbolFn() : '₹'; // Default to INR if not set
}

/**
 * Homepage Data Service
 * Handles fetching real data from backend with intelligent caching and offline support
 * Features:
 * - Stale-while-revalidate caching
 * - Offline fallback data
 * - TTL-based cache invalidation
 * - Smart cache warming
 * - NEW: Batch endpoint support with feature flag
 */
// User context data returned alongside homepage batch (avoids separate API call)
export interface HomepageUserContext {
  walletBalance: number;
  totalSaved: number;
  voucherCount: number;
  offersCount: number;
  cartItemCount: number;
  subscription: { tier: string; status: string };
}

class HomepageDataService {
  private backendAvailable: boolean | null = null;
  private lastBackendCheck: number = 0;
  private BACKEND_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes (for successful checks)
  private BACKEND_RETRY_INTERVAL = 15 * 1000; // 15 seconds (for failed checks - retry quickly)
  private CACHE_TTL = 60 * 60 * 1000; // 1 hour cache TTL
  private STALE_TTL = 30 * 60 * 1000; // 30 minutes before considering stale

  // Last userContext received from homepage batch (avoids separate /user-context call)
  private _lastUserContext: HomepageUserContext | null = null;
  private _userContextTimestamp: number = 0;

  // FEATURE FLAG: Enable/disable batch endpoint
  // OPTIMIZATION: Enable in production to reduce API calls from 6 to 1
  private USE_BATCH_ENDPOINT = true; // Enabled for performance

  // Performance metrics
  private performanceMetrics = {
    batchCalls: 0,
    individualCalls: 0,
    batchSuccesses: 0,
    batchFailures: 0,
    avgBatchTime: 0,
    avgIndividualTime: 0
  };

  /**
   * Get the last userContext received from homepage batch.
   * Returns null if no recent context (older than 60s or never fetched).
   */
  getLastUserContext(): HomepageUserContext | null {
    if (!this._lastUserContext) return null;
    // Stale after 60s — caller should fetch fresh data
    if (Date.now() - this._userContextTimestamp > 60_000) return null;
    return this._lastUserContext;
  }

  /**
   * Get region-aware cache key
   * Cache keys include region to prevent serving wrong region's data
   */
  private getCacheKey(section: string): string {
    const region = apiClient.getRegion();
    return `homepage_${section}_${region}`;
  }

  /**
   * Check if backend is available (with asymmetric caching)
   * - Cache positive results for 5 minutes (backend is stable)
   * - Retry negative results after 15 seconds (don't stay stuck in fallback mode)
   */
  private async checkBackendAvailability(): Promise<boolean> {
    const now = Date.now();
    const elapsed = now - this.lastBackendCheck;

    // Use cached result if recent - different TTLs for true vs false
    if (this.backendAvailable !== null) {
      const cacheTTL = this.backendAvailable
        ? this.BACKEND_CHECK_INTERVAL   // 5 min for positive
        : this.BACKEND_RETRY_INTERVAL;  // 15 sec for negative
      if (elapsed < cacheTTL) {
        return this.backendAvailable;
      }
    }

    try {
      // Check both products and stores availability in parallel
      const [productsAvailable, storesAvailable] = await Promise.all([
        productsService.isBackendAvailable(),
        storesService.isBackendAvailable(),
      ]);

      this.backendAvailable = productsAvailable && storesAvailable;
      this.lastBackendCheck = now;

      return this.backendAvailable;
    } catch (error) {
      this.backendAvailable = false;
      this.lastBackendCheck = now;
      return false;
    }
  }

  /**
   * Get cached data or fallback
   */
  private async getWithCacheAndFallback<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    fallbackData: T
  ): Promise<{ data: T; fromCache: boolean; isOffline: boolean }> {
    try {
      // Try to get from cache first
      const cachedData = await cacheService.get<T>(cacheKey);

      if (cachedData) {
        // Return cached data immediately, refresh in background (non-blocking)
        this.checkBackendAvailability().then(isAvailable => {
          if (isAvailable) {
            fetchFn()
              .then(async freshData => {
                await cacheService.set(cacheKey, freshData, {
                  ttl: this.CACHE_TTL,
                  priority: 'high'
                });
              })
              .catch(() => {});
          }
        }).catch(() => {});

        return { data: cachedData, fromCache: true, isOffline: false };
      }

      // No cache, try to fetch from backend
      const isBackendAvailable = await this.checkBackendAvailability();

      if (isBackendAvailable) {
        try {
          const freshData = await fetchFn();

          // Cache the fresh data
          await cacheService.set(cacheKey, freshData, {
            ttl: this.CACHE_TTL,
            priority: 'high'
          });

          return { data: freshData, fromCache: false, isOffline: false };
        } catch (error) {
          // Fall through to use fallback data
        }
      }

      // Backend unavailable or fetch failed, use fallback data
      return { data: fallbackData, fromCache: false, isOffline: true };

    } catch (error) {
      return { data: fallbackData, fromCache: false, isOffline: true };
    }
  }

  /**
   * Get "Just for You" section data (Location-Aware Personalized Recommendations)
   * Uses hybrid approach: mix of nearby products + general recommendations
   */
  async getJustForYouSection(): Promise<HomepageSection> {

    const sectionTemplate = getSectionById('just_for_you');
    const fallbackSection = getFallbackSectionData('just_for_you');

    if (!sectionTemplate) {
      // Return fallback if template not found
      return fallbackSection || {
        id: 'just_for_you',
        title: 'Just for you',
        type: 'recommendations',
        showViewAll: false,
        isHorizontalScroll: true,
        items: [],
        loading: false,
        error: 'Section configuration not found',
        lastUpdated: new Date().toISOString(),
        refreshable: true,
        priority: 2
      };
    }

    const cacheKey = this.getCacheKey('just_for_you');

    // Try to get user location for location-aware recommendations
    let userLocation: { latitude: number; longitude: number } | undefined;
    try {
      const cachedLocation = await locationService.getCachedLocation();
      if (cachedLocation?.coordinates) {
        userLocation = cachedLocation.coordinates;
      }
    } catch (error) {
      // Location not available, will use general recommendations
    }

    const { data: recommendations, fromCache, isOffline } = await this.getWithCacheAndFallback(
      cacheKey,
      async () => {
        // Try location-aware recommendations first
        if (userLocation) {
          try {
            const pickedForYouResponse = await recommendationService.getPickedForYou(20, userLocation);
            if (pickedForYouResponse.success && pickedForYouResponse.data?.recommendations?.length > 0) {
              // Transform recommendations to ProductItem format
              return pickedForYouResponse.data.recommendations.map((rec: any) => ({
                ...rec,
                recommendationReason: rec.recommendationReason || 'Recommended for you',
                recommendationScore: rec.recommendationScore || 0.85,
              }));
            }
          } catch (error) {
            // Fall through to featured products
          }
        }

        // Fallback: Get featured products without location
        const items = await productsService.getFeaturedForHomepage(20);
        return items;
      },
      fallbackSection?.items || []
    );

    // Use real backend data, no fallbacks (unless offline)
    const result: HomepageSection = {
      ...sectionTemplate,
      items: recommendations,
      lastUpdated: new Date().toISOString(),
      loading: false,
      error: isOffline ? 'Showing offline data' : null
    };

    return result;
  }

  /**
   * Get "New Arrivals" section data
   */
  async getNewArrivalsSection(): Promise<HomepageSection> {
    const sectionTemplate = getSectionById('new_arrivals');

    if (!sectionTemplate) {
      return {
        id: 'new_arrivals',
        title: 'New Arrivals',
        type: 'products',
        showViewAll: false,
        isHorizontalScroll: true,
        items: [],
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
        refreshable: true,
        priority: 6
      };
    }

    const cacheKey = this.getCacheKey('new_arrivals');

    try {
      // Try to get from cache first
      const cachedData = await cacheService.get<ProductItem[]>(cacheKey);
      
      if (cachedData && cachedData.length > 0) {
        // Return cached data immediately, refresh in background (non-blocking)
        this.checkBackendAvailability().then(isAvailable => {
          if (isAvailable) {
            productsService.getNewArrivalsForHomepage(20)
              .then(async freshData => {
                if (freshData && freshData.length > 0) {
                  await cacheService.set(cacheKey, freshData, {
                    ttl: this.CACHE_TTL,
                    priority: 'high'
                  });
                }
              })
              .catch(() => {});
          }
        }).catch(() => {});

        return {
          ...sectionTemplate,
          items: cachedData,
          lastUpdated: new Date().toISOString(),
          loading: false,
          error: null
        };
      }

      // No cache, try to fetch from backend
      const isBackendAvailable = await this.checkBackendAvailability();
      
      if (isBackendAvailable) {
        try {
          const freshData = await productsService.getNewArrivalsForHomepage(20);
          
          // Only cache and return if we have real data
          if (freshData && freshData.length > 0) {
            await cacheService.set(cacheKey, freshData, {
              ttl: this.CACHE_TTL,
              priority: 'high'
            });
            
            return {
              ...sectionTemplate,
              items: freshData,
              lastUpdated: new Date().toISOString(),
              loading: false,
              error: null
            };
          }
        } catch (error) {
          // Silently fail - return empty section
        }
      }
      
      // No data available - return empty section (will be filtered out)
      return {
        ...sectionTemplate,
        items: [],
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: null
      };
    } catch (error) {
      // Return empty section on error (will be filtered out)
      return {
        ...sectionTemplate,
        items: [],
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: null
      };
    }
  }

  /**
   * Get product details for StorePage
   */
  async getProductForStorePage(productId: string): Promise<ProductItem | null> {
    try {
      const isBackendAvailable = await this.checkBackendAvailability();
      
      if (isBackendAvailable) {
        // Check if this is a dummy ID (starts with rec_, product_arrival_, etc.)
        const isDummyId = productId.startsWith('rec_') || 
                         productId.startsWith('product_arrival_') || 
                         productId.length < 24; // MongoDB ObjectIds are 24 characters
        
        if (isDummyId) {

          return null; // Don't attempt to fetch dummy IDs from backend
        }

        const productDetails = await productsService.getProductDetails(productId);
        
        if (productDetails) {
          return productDetails;
        }
      }

      return null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Get store products for StorePage
   */
  async getStoreProductsForStorePage(
    storeId: string,
    options?: {
      category?: string;
      sortBy?: 'price_low' | 'price_high' | 'rating' | 'newest';
      limit?: number;
    }
  ): Promise<{ store: any; products: ProductItem[] } | null> {
    try {
      const isBackendAvailable = await this.checkBackendAvailability();
      
      if (isBackendAvailable) {

        const storeData = await productsService.getStoreProducts(storeId, options);
        
        if (storeData) {
          return storeData;
        }
      }

      return null;

    } catch (error) {
      return null;
    }
  }

  /**
   * Force refresh backend availability check
   */
  async refreshBackendStatus(): Promise<boolean> {
    this.backendAvailable = null;
    this.lastBackendCheck = 0;
    return await this.checkBackendAvailability();
  }

  /**
   * Get "Trending Stores" section data
   */
  async getTrendingStoresSection(): Promise<HomepageSection> {

    const sectionTemplate = getSectionById('trending_stores');
    const fallbackSection = getFallbackSectionData('trending_stores');

    if (!sectionTemplate) {
      return fallbackSection || {
        id: 'trending_stores',
        title: 'Trending Stores',
        type: 'stores',
        showViewAll: false,
        isHorizontalScroll: true,
        items: [],
        loading: false,
        error: 'Section configuration not found',
        lastUpdated: new Date().toISOString(),
        refreshable: true,
        priority: 3
      };
    }

    const cacheKey = this.getCacheKey('trending_stores');

    const { data: trendingStores, fromCache, isOffline } = await this.getWithCacheAndFallback(
      cacheKey,
      async () => {
        const items = await storesService.getFeaturedForHomepage(15);
        return items;
      },
      fallbackSection?.items || []
    );

    // Use real backend data, no fallbacks (unless offline)
    const result: HomepageSection = {
      ...sectionTemplate,
      items: trendingStores,
      lastUpdated: new Date().toISOString(),
      loading: false,
      error: isOffline ? 'Showing offline data' : null
    };

    return result;
  }

  /**
   * Get "Events" section data
   */
  async getEventsSection(): Promise<HomepageSection> {

    const sectionTemplate = getSectionById('events');
    const fallbackSection = getFallbackSectionData('events');

    if (!sectionTemplate) {
      return fallbackSection || {
        id: 'events',
        title: 'Events',
        type: 'events',
        showViewAll: false,
        isHorizontalScroll: true,
        items: [],
        loading: false,
        error: 'Section configuration not found',
        lastUpdated: new Date().toISOString(),
        refreshable: true,
        priority: 1
      };
    }

    const cacheKey = this.getCacheKey('events');

    const { data: events, fromCache, isOffline } = await this.getWithCacheAndFallback(
      cacheKey,
      async () => {
        // Get events from today onwards (includes today's events even if time passed)
        const result = await eventsApiService.getEvents({ todayAndFuture: true }, 10, 0);
        return result.events;
      },
      fallbackSection?.items || []
    );
    
    // Use real backend data, no fallbacks (unless offline)
    const result: HomepageSection = {
      ...sectionTemplate,
      items: events,
      lastUpdated: new Date().toISOString(),
      loading: false,
      error: isOffline ? 'Showing offline data' : null
    };

    return result;
  }

  /**
   * Get "Offers" section data
   */
  async getOffersSection(): Promise<HomepageSection> {

    const sectionTemplate = getSectionById('offers');

    // Create default template if doesn't exist
    const defaultTemplate: HomepageSection = {
      id: 'offers',
      title: 'Special Offers',
      type: 'products',
      items: [],
      loading: false,
      error: null,
      lastUpdated: new Date().toISOString(),
      refreshable: true,
      showViewAll: true,
      isHorizontalScroll: true,
      priority: 4
    };

    const template = sectionTemplate || defaultTemplate;

    try {
      const isBackendAvailable = await this.checkBackendAvailability();

      if (isBackendAvailable) {

        try {
          const response = await realOffersApi.getOffers({
            featured: true,
            limit: 10
          });

          if (response.success && response.data && response.data.items) {
            const offers = response.data.items || [];

            // Transform offers to homepage format
            const transformedItems = offers.map(offer => ({
              id: offer._id,
              type: 'product' as const,
              title: offer.title,
              name: offer.title,
              description: offer.description || offer.subtitle,
              image: offer.image,
              price: {
                current: offer.discountedPrice || 0,
                original: offer.originalPrice || 0,
                currency: getCurrentCurrencySymbol(),
                discount: offer.cashbackPercentage || 0
              },
              store: offer.store,
              category: offer.category,
              validity: offer.validity,
              cashback: offer.cashbackPercentage
            })) as unknown as ProductItem[];

            return {
              ...template,
              items: transformedItems,
              lastUpdated: new Date().toISOString(),
              loading: false,
              error: null
            };
          }
        } catch (error) {
          throw error;
        }
      }

      // If backend is not available, return empty with error message

      return {
        ...template,
        items: [],
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: 'Unable to connect to server. Please check your connection.'
      };

    } catch (error) {

      return {
        ...template,
        items: [],
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load offers'
      };
    }
  }

  /**
   * Get "Flash Sales" section data
   */
  async getFlashSalesSection(): Promise<HomepageSection> {

    const sectionTemplate = getSectionById('flash_sales');

    // Create default template if doesn't exist
    const defaultTemplate: HomepageSection = {
      id: 'flash_sales',
      title: 'Flash Sales',
      type: 'products',
      items: [],
      loading: false,
      error: null,
      lastUpdated: new Date().toISOString(),
      refreshable: true,
      showViewAll: true,
      isHorizontalScroll: true,
      priority: 5
    };

    const template = sectionTemplate || defaultTemplate;

    try {
      const isBackendAvailable = await this.checkBackendAvailability();

      if (isBackendAvailable) {

        try {
          // Get offers with flash sale metadata
          const response = await realOffersApi.getOffers({
            featured: true,
            limit: 10
          });

          if (response.success && response.data && response.data.items) {
            // Filter for flash sale offers
            const flashSales = response.data.items.filter(offer =>
              offer.metadata?.flashSale?.isActive
            );

            // Transform flash sales to homepage format
            const transformedItems = (flashSales || []).map(offer => ({
              id: offer._id,
              type: 'product' as const,
              title: offer.title,
              name: offer.title,
              description: offer.description || offer.subtitle,
              image: offer.image,
              price: {
                current: offer.metadata?.flashSale?.salePrice || offer.discountedPrice || 0,
                original: offer.metadata?.flashSale?.originalPrice || offer.originalPrice || 0,
                currency: getCurrentCurrencySymbol(),
                discount: Math.round(((offer.metadata?.flashSale?.originalPrice || offer.originalPrice || 0) -
                  (offer.metadata?.flashSale?.salePrice || offer.discountedPrice || 0)) /
                  (offer.metadata?.flashSale?.originalPrice || offer.originalPrice || 1) * 100)
              },
              store: offer.store,
              category: offer.category,
              validity: offer.validity,
            })) as unknown as ProductItem[];

            return {
              ...template,
              items: transformedItems,
              lastUpdated: new Date().toISOString(),
              loading: false,
              error: null
            };
          }
        } catch (error) {
          throw error;
        }
      }

      // If backend is not available, return empty with error message

      return {
        ...template,
        items: [],
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: 'Unable to connect to server. Please check your connection.'
      };

    } catch (error) {

      return {
        ...template,
        items: [],
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load flash sales'
      };
    }
  }

  /**
   * Get "Brand Partnerships" section data
   */
  async getBrandPartnershipsSection(): Promise<HomepageSection> {
    const sectionTemplate = getSectionById('brand_partnerships') || {
      id: 'brand_partnerships',
      title: 'Brand Partnerships',
      type: 'brands',
      showViewAll: false,
      isHorizontalScroll: false,
      priority: 7
    };

    const cacheKey = this.getCacheKey('brand_partnerships');

    try {
      const isBackendAvailable = await this.checkBackendAvailability();

      if (isBackendAvailable) {
        try {
          const brands = await brandApiService.getFeaturedBrands(6);

          if (brands && brands.length > 0) {
            // Cache the data
            await cacheService.set(cacheKey, brands, {
              ttl: this.CACHE_TTL,
              priority: 'high'
            });

            return {
              ...sectionTemplate,
              items: brands as any,
              lastUpdated: new Date().toISOString(),
              loading: false,
              error: null
            };
          }
        } catch (_error) {
          // silently handle
        }
      }

      // Try to get from cache
      const cachedData = await cacheService.get<any[]>(cacheKey);
      if (cachedData && cachedData.length > 0) {
        return {
          ...sectionTemplate,
          items: cachedData,
          lastUpdated: new Date().toISOString(),
          loading: false,
          error: null
        };
      }

      // No data available - return empty section (will be hidden)
      return {
        ...sectionTemplate,
        items: [],
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: null
      };

    } catch (error) {
      return {
        ...sectionTemplate,
        items: [],
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: null
      };
    }
  }

  /**
   * Get current backend status
   */
  getBackendStatus(): {
    available: boolean | null;
    lastChecked: Date | null;
    nextCheck: Date | null;
  } {
    return {
      available: this.backendAvailable,
      lastChecked: this.lastBackendCheck > 0 ? new Date(this.lastBackendCheck) : null,
      nextCheck: this.lastBackendCheck > 0
        ? new Date(this.lastBackendCheck + this.BACKEND_CHECK_INTERVAL)
        : null
    };
  }

  /**
   * Warm cache with all homepage sections
   * Call this on app launch or when network becomes available
   */
  async warmCache(): Promise<void> {

    try {
      const sections = ['just_for_you', 'new_arrivals', 'trending_stores', 'events'];

      await Promise.allSettled(
        sections.map(async (sectionId) => {
          switch (sectionId) {
            case 'just_for_you':
              return this.getJustForYouSection();
            case 'new_arrivals':
              return this.getNewArrivalsSection();
            case 'trending_stores':
              return this.getTrendingStoresSection();
            case 'events':
              return this.getEventsSection();
          }
        })
      );
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Clear all homepage cache for current region
   */
  async clearCache(): Promise<void> {

    try {
      // Use region-aware cache keys
      const keys = [
        this.getCacheKey('just_for_you'),
        this.getCacheKey('new_arrivals'),
        this.getCacheKey('trending_stores'),
        this.getCacheKey('events'),
        this.getCacheKey('offers'),
        this.getCacheKey('flash_sales'),
        this.getCacheKey('brand_partnerships')
      ];

      await Promise.all(keys.map(key => cacheService.remove(key)));

    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await cacheService.getStats();
  }

  /**
   * Force refresh all sections (bypasses cache)
   */
  async forceRefreshAll(): Promise<void> {

    await this.clearCache();
    await this.warmCache();
  }

  /**
   * NEW: Fetch all sections using batch endpoint
   * Returns all sections in a single API call
   */
  async fetchAllSectionsBatch(userId?: string): Promise<{
    justForYou: HomepageSection;
    newArrivals: HomepageSection;
    trendingStores: HomepageSection;
    events: HomepageSection;
    offers: HomepageSection;
    flashSales: HomepageSection;
  }> {
    const startTime = Date.now();

    try {
      this.performanceMetrics.batchCalls++;

      const response = await HomepageApiService.fetchHomepageBatch(userId);

      if (!response.success || !response.data) {
        throw new Error('Batch endpoint returned unsuccessful response');
      }


      const batchTime = Date.now() - startTime;
      this.performanceMetrics.avgBatchTime =
        (this.performanceMetrics.avgBatchTime * (this.performanceMetrics.batchSuccesses) + batchTime) /
        (this.performanceMetrics.batchSuccesses + 1);
      this.performanceMetrics.batchSuccesses++;

      // Extract userContext if present (backend includes it for authenticated users)
      const rawData = response.data;
      if (rawData?.userContext) {
        this._lastUserContext = rawData.userContext;
        this._userContextTimestamp = Date.now();
      }

      // Transform batch response to individual sections
      const transformed = this.transformBatchResponseToSections(response.data);
      return transformed;

    } catch (error) {
      this.performanceMetrics.batchFailures++;
      // Log once, don't spam — caller handles fallback
      if (this.performanceMetrics.batchFailures <= 1) {
      }
      throw error;
    }
  }

  /**
   * Transform batch response to individual HomepageSection objects
   * Handles both legacy (data.sections) and current (data.{sectionName}) formats
   */
  private transformBatchResponseToSections(response: HomepageBatchResponse): {
    justForYou: HomepageSection;
    newArrivals: HomepageSection;
    trendingStores: HomepageSection;
    events: HomepageSection;
    offers: HomepageSection;
    flashSales: HomepageSection;
  } {
    // apiClient already unwraps backend data, so response may or may not have .data
    const data = response.data || response;
    const sections = data.sections || {
      justForYou: data.featuredProducts || [],
      newArrivals: data.newArrivals || [],
      trendingStores: data.trendingStores || data.featuredStores || [],
      events: data.upcomingEvents || [],
      offers: data.megaOffers || data.studentOffers || [],
      flashSales: data.flashSales || [],
    };
    const metadata = data.metadata;
    const timestamp = new Date().toISOString();

    // Get section templates
    const justForYouTemplate = getSectionById('just_for_you');
    const newArrivalsTemplate = getSectionById('new_arrivals');
    const trendingStoresTemplate = getSectionById('trending_stores');
    const eventsTemplate = getSectionById('events');
    const offersTemplate = getSectionById('offers');
    const flashSalesTemplate = getSectionById('flash_sales');

    return {
      justForYou: {
        ...(justForYouTemplate || {}),
        id: 'just_for_you',
        title: 'Just for you',
        type: 'recommendations',
        // Add recommendation defaults for plain products (batch path returns featuredProducts
        // which lack recommendationReason/Score that RecommendationCard expects)
        items: (sections.justForYou || []).map((item: any) => ({
          ...item,
          recommendationReason: item.recommendationReason || 'Recommended for you',
          recommendationScore: item.recommendationScore ?? 0.85,
          personalizedFor: item.personalizedFor || '',
        })),
        lastUpdated: timestamp,
        loading: false,
        error: null,
        showViewAll: false,
        isHorizontalScroll: true,
        refreshable: true,
        priority: 2
      } as HomepageSection,

      newArrivals: (() => {
        const apiItems = sections.newArrivals || [];
        
        // Only return section if there's real data (no fallback)
        if (apiItems.length === 0) {
          return {
            ...(newArrivalsTemplate || {}),
            id: 'new_arrivals',
            title: 'New Arrivals',
            type: 'products',
            items: [],
            lastUpdated: timestamp,
            loading: false, // Set to false when no data
            error: null,
            showViewAll: false,
            isHorizontalScroll: true,
            refreshable: true,
            priority: 6
          } as HomepageSection;
        }
        
        return {
          ...(newArrivalsTemplate || {}),
          id: 'new_arrivals',
          title: 'New Arrivals',
          type: 'products',
          items: apiItems,
          lastUpdated: timestamp,
          loading: false, // Set to false when data is loaded
          error: null,
          showViewAll: false,
          isHorizontalScroll: true,
          refreshable: true,
          priority: 6
        } as HomepageSection;
      })(),

      trendingStores: {
        ...(trendingStoresTemplate || {}),
        id: 'trending_stores',
        title: 'Trending Stores',
        type: 'stores',
        items: sections.trendingStores || [],
        lastUpdated: timestamp,
        loading: false,
        error: null,
        showViewAll: false,
        isHorizontalScroll: true,
        refreshable: true,
        priority: 3
      } as HomepageSection,

      events: {
        ...(eventsTemplate || {}),
        id: 'events',
        title: 'Events',
        type: 'events',
        items: sections.events || [],
        lastUpdated: timestamp,
        loading: false,
        error: null,
        showViewAll: false,
        isHorizontalScroll: true,
        refreshable: true,
        priority: 1
      } as HomepageSection,

      offers: {
        ...(offersTemplate || {}),
        id: 'offers',
        title: 'Special Offers',
        type: 'products',
        items: sections.offers || [],
        lastUpdated: timestamp,
        loading: false,
        error: null,
        showViewAll: true,
        isHorizontalScroll: true,
        refreshable: true,
        priority: 4
      } as HomepageSection,

      flashSales: {
        ...(flashSalesTemplate || {}),
        id: 'flash_sales',
        title: 'Flash Sales',
        type: 'products',
        items: sections.flashSales || [],
        lastUpdated: timestamp,
        loading: false,
        error: null,
        showViewAll: true,
        isHorizontalScroll: true,
        refreshable: true,
        priority: 5
      } as HomepageSection
    };
  }

  /**
   * NEW: Fetch all sections with batch endpoint (with fallback)
   * Uses batch endpoint if enabled, falls back to individual calls
   * Implements stale-while-revalidate: cached data returned immediately, refresh in background
   */
  async fetchAllSectionsWithBatch(userId?: string): Promise<{
    justForYou: HomepageSection;
    newArrivals: HomepageSection;
    trendingStores: HomepageSection;
    events: HomepageSection;
    offers: HomepageSection;
    flashSales: HomepageSection;
  }> {
    // Check feature flag
    if (this.USE_BATCH_ENDPOINT) {
      const batchCacheKey = this.getCacheKey('batch_all_sections');

      // Check cache first for instant response
      try {
        const cachedSections = await cacheService.get<{
          justForYou: HomepageSection;
          newArrivals: HomepageSection;
          trendingStores: HomepageSection;
          events: HomepageSection;
          offers: HomepageSection;
          flashSales: HomepageSection;
        }>(batchCacheKey);

        if (cachedSections) {
          // Verify cache has real data (not empty sections from a failed load)
          const cacheHasData = Object.values(cachedSections).some(
            (s: any) => s.items && s.items.length > 0
          );
          if (cacheHasData) {
            // Return cached data immediately, refresh in background (non-blocking)
            // Skip background refresh if batch has been failing (prevent error spam)
            if (this.performanceMetrics.batchFailures > 0) return cachedSections;
            this.fetchAllSectionsBatch(userId)
              .then(async freshSections => {
                const freshHasData = Object.values(freshSections).some(
                  (s: any) => s.items && s.items.length > 0
                );
                if (freshHasData) {
                  await cacheService.set(batchCacheKey, freshSections, {
                    ttl: this.CACHE_TTL,
                    priority: 'high'
                  });
                }
              })
              .catch(() => {});
            return cachedSections;
          }
          // Cache was empty — ignore it and fetch fresh
        }
      } catch (e) {
        // Cache read failed, proceed to fetch
      }

      try {
        const sections = await this.fetchAllSectionsBatch(userId);
        // Only cache if we got real data (at least one section with items)
        const hasRealData = Object.values(sections).some(
          (s: any) => s.items && s.items.length > 0
        );
        if (hasRealData) {
          cacheService.set(batchCacheKey, sections, {
            ttl: this.CACHE_TTL,
            priority: 'high'
          }).catch(() => {});
        }
        return sections;
      } catch (error) {
        // Don't fall through to individual calls — if batch timed out, they will too
        const emptySection = (id: string, title: string, type: string, priority: number): HomepageSection => ({
          id,
          title,
          type: type as any,
          items: [],
          loading: false,
          error: null,
          lastUpdated: new Date().toISOString(),
          refreshable: true,
          showViewAll: false,
          isHorizontalScroll: true,
          priority,
        });
        return {
          justForYou: emptySection('just_for_you', 'Just for you', 'recommendations', 2),
          newArrivals: emptySection('new_arrivals', 'New Arrivals', 'products', 6),
          trendingStores: emptySection('trending_stores', 'Trending Stores', 'stores', 3),
          events: emptySection('events', 'Events', 'events', 1),
          offers: emptySection('offers', 'Special Offers', 'products', 4),
          flashSales: emptySection('flash_sales', 'Flash Sales', 'products', 5),
        };
      }
    }

    // Fallback: Only fetch 3 critical sections to reduce startup API load
    // Non-critical sections (offers, flashSales, events) will load lazily when scrolled into view
    const startTime = Date.now();
    this.performanceMetrics.individualCalls++;

    const [justForYou, newArrivals, trendingStores] = await Promise.all([
      this.getJustForYouSection(),
      this.getNewArrivalsSection(),
      this.getTrendingStoresSection(),
    ]);

    // Return empty sections for non-critical ones — they'll load via LazySection
    const emptySection = (id: string, title: string, type: string, priority: number): HomepageSection => ({
      id,
      title,
      type: type as any,
      items: [],
      loading: false,
      error: null,
      lastUpdated: new Date().toISOString(),
      refreshable: true,
      showViewAll: false,
      isHorizontalScroll: true,
      priority,
    });

    const individualTime = Date.now() - startTime;
    this.performanceMetrics.avgIndividualTime =
      (this.performanceMetrics.avgIndividualTime * (this.performanceMetrics.individualCalls - 1) + individualTime) /
      this.performanceMetrics.individualCalls;

    return {
      justForYou,
      newArrivals,
      trendingStores,
      events: emptySection('events', 'Events', 'events', 1),
      offers: emptySection('offers', 'Special Offers', 'products', 4),
      flashSales: emptySection('flash_sales', 'Flash Sales', 'products', 5),
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      featureFlagEnabled: this.USE_BATCH_ENDPOINT,
      batchSuccessRate: this.performanceMetrics.batchCalls > 0
        ? (this.performanceMetrics.batchSuccesses / this.performanceMetrics.batchCalls * 100).toFixed(2) + '%'
        : 'N/A',
      avgTimeSaved: this.performanceMetrics.avgIndividualTime - this.performanceMetrics.avgBatchTime
    };
  }

  /**
   * Toggle feature flag (for testing)
   */
  toggleBatchEndpoint(enabled: boolean) {
    this.USE_BATCH_ENDPOINT = enabled;
  }
}

// Create singleton instance
const homepageDataService = new HomepageDataService();

export default homepageDataService;
export { HomepageDataService };
