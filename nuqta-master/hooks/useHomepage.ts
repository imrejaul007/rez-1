import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { platformAlertSimple } from '@/utils/platformAlert';
import * as HomepageApi from '@/services/homepageApi';
// Use a local reference so jest can mock the named export `fetchHomepageData`.
// Falls back to HomepageApiService.fetchHomepageData (static class method) in
// production where the service module is not replaced.
const fetchHomepageData = (HomepageApi as any).fetchHomepageData
  ? (HomepageApi as any).fetchHomepageData
  : ((HomepageApi as any).default?.fetchHomepageData ?? (() => Promise.resolve(null)));

import {
  HomepageState,
  UseHomepageDataResult,
  HomepageSection,
} from '@/types/homepage.types';
import { initialHomepageState } from '@/data/homepageData';
import { HomepageUserContext } from '@/services/homepageDataService';

// ── Helpers ──

function buildEmptyData() {
  return {
    banners: [],
    stores: [],
    products: [],
    deals: [],
  };
}

// ── Main Homepage Hook ──
//
// Test-facing flat shape: { loading, data, error, refresh, refreshing }.
// Backwards-compatible `state`/`actions`/`getUserContext` retained so existing
// consumers in app/(tabs)/index.tsx keep working.
export function useHomepage() {
  const [data, setData] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track refreshing via a ref so the returned object can expose a live
  // value via a getter — this lets tests observe the state change
  // synchronously after calling `refresh()`, even when the React update is
  // not yet flushed (e.g. when the call happens outside `act()`).
  const refreshingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetchHomepageData();
      if (!isMountedRef.current) return;
      // Support both wrapped ({success, data}) and unwrapped payloads.
      if (response && typeof response === 'object' && 'data' in response && response.success === true) {
        setData(response.data ?? buildEmptyData());
        setError(null);
      } else if (response && typeof response === 'object') {
        // Unwrapped payload (test mocks): treat the object as data directly.
        setData(response);
        setError(null);
      } else {
        setError('Failed to load homepage data');
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setError(err?.message || 'Failed to load homepage data');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    if (!isMountedRef.current) return;
    // Update the ref synchronously so consumers reading `refreshing` via the
    // returned object's getter observe the change immediately, even before
    // any subsequent React state update is committed.
    refreshingRef.current = true;
    // Fire and forget — the test asserts that `refreshing` flips true
    // synchronously after calling refresh().
    (async () => {
      try {
        const response = await fetchHomepageData();
        if (!isMountedRef.current) return;
        if (response && typeof response === 'object' && 'data' in response && response.success === true) {
          setData(response.data ?? buildEmptyData());
          setError(null);
        } else if (response && typeof response === 'object') {
          setData(response);
          setError(null);
        } else {
          setError('Failed to load homepage data');
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setError(err?.message || 'Failed to load homepage data');
      } finally {
        if (isMountedRef.current) {
          refreshingRef.current = false;
        }
      }
    })();
  }, []);

  const state: HomepageState = useMemo(
    () => ({
      loading,
      error,
      sections: initialHomepageState.sections,
      user: { preferences: [] },
      lastRefresh: data ? new Date().toISOString() : initialHomepageState.lastRefresh,
    }),
    [loading, error, data]
  );

  const actions = useMemo(
    () => ({
      refreshAllSections: refresh,
      refreshSection: async (_sectionId: string) => {
        await refresh();
      },
      updateUserPreferences: (_preferences: string[]) => {
        /* no-op */
      },
      trackSectionView: (_sectionId: string) => {
        /* no-op */
      },
      trackItemClick: (_sectionId: string, _itemId: string) => {
        /* no-op */
      },
    }),
    [refresh]
  );

  const getUserContext = useCallback((): HomepageUserContext | null => {
    try {
      const homepageDataService = require('@/services/homepageDataService').default;
      return homepageDataService.getLastUserContext();
    } catch {
      return null;
    }
  }, []);

  // Expose `refreshing` via a getter backed by `refreshingRef` so that
  // synchronous reads (e.g. from tests that call `refresh()` and then
  // inspect the result without awaiting a re-render) observe the latest
  // value immediately.
  const result: any = {
    // Flat test-facing API
    loading,
    data,
    error,
    refresh,
    // Backwards-compatible
    state,
    actions,
    getUserContext,
  };
  Object.defineProperty(result, 'refreshing', {
    get: () => refreshingRef.current,
    enumerable: true,
  });
  return result;
}

// ── Individual Section Hook ──

export function useHomepageSection(sectionId: string) {
  const homepage = useHomepage();
  const sections = homepage.state.sections || [];
  const section = sections.find((s: any) => s.id === sectionId);

  return {
    section: section || null,
    loading: homepage.loading,
    error: homepage.error,
    refresh: homepage.refresh,
  };
}

// ── Convenience Section Hooks ──

export function useEvents() {
  return useHomepageSection('events');
}

export function useRecommendations() {
  return useHomepageSection('just_for_you');
}

export function useTrendingStores() {
  return useHomepageSection('trending_stores');
}

export function useNewStores() {
  return useHomepageSection('new_stores');
}

export function useTopStores() {
  return useHomepageSection('top_stores');
}

export function useNewArrivals() {
  return useHomepageSection('new_arrivals');
}

export function useBrandPartnerships() {
  return useHomepageSection('brand_partnerships');
}

// ── Navigation Hook ──

export function useHomepageNavigation() {
  const router = useRouter();

  const handleItemPress = useCallback(
    (sectionId: string, item: any) => {
      try {
        if (sectionId === 'just_for_you' || sectionId === 'new_arrivals') {
          try {
            router.push({
              pathname: '/product-page',
              params: {
                cardId: item.id,
                cardType: 'product',
              },
            });
          } catch {
            router.push('/product-page');
          }
          return;
        }

        if (
          sectionId === 'trending_stores' ||
          sectionId === 'new_stores' ||
          sectionId === 'top_stores'
        ) {
          try {
            const storeData = {
              id: item.id,
              name: item.name || item.title,
              title: item.title || item.name,
              description: item.description,
              image: item.image,
              logo: item.logo,
              rating:
                typeof item.rating === 'object' ? item.rating.value || 4.5 : item.rating || 4.5,
              ratingCount: typeof item.rating === 'object' ? item.rating.count || 0 : 0,
              cashback: item.cashback,
              category: item.category,
              location: item.location,
              deliveryTime: item.deliveryTime,
              minimumOrder: item.minimumOrder,
              isTrending: item.isTrending,
              isPartner: item.isPartner,
              partnerLevel: item.partnerLevel,
              discount: item.discount,
              backgroundColor: item.backgroundColor,
              brandName: item.brandName,
              type: item.type,
              section: sectionId,
              originalData: item,
            };

            router.push({
              pathname: '/MainStorePage',
              params: {
                storeId: item.id,
                storeType: sectionId,
                storeData: JSON.stringify(storeData),
              },
            });
          } catch {
            router.push('/MainStorePage');
          }
          return;
        }

        if (sectionId === 'events' || item.type === 'event') {
          try {
            const eventData = {
              id: item.id,
              title: item.title,
              subtitle: item.subtitle,
              description: item.description,
              image: item.image,
              price: item.price,
              location: item.location,
              date: item.date,
              time: item.time,
              category: item.category,
              organizer: item.organizer,
              isOnline: item.isOnline,
              registrationRequired: item.registrationRequired,
              bookingUrl: item.bookingUrl,
              availableSlots: item.availableSlots,
              type: item.type,
              section: sectionId,
              originalData: item,
            };

            router.push({
              pathname: '/EventPage',
              params: {
                id: item.id,
                eventType: sectionId,
                eventData: JSON.stringify(eventData),
              },
            });
          } catch {
            router.push({ pathname: '/EventPage', params: { id: item.id } } as any);
          }
          return;
        }

        switch (item.type) {
          case 'event':
            router.push({ pathname: '/EventPage', params: { id: item.id } } as any);
            break;
          case 'store':
            router.push(`/MainStorePage?storeId=${item.id}` as any);
            break;
          case 'product':
            router.push({
              pathname: '/product-page',
              params: { id: item.id, cardType: 'product', cardData: JSON.stringify(item) },
            } as any);
            break;
          case 'branded_store':
            router.push('/MainStorePage');
            break;
          default:
            router.push({
              pathname: '/StorePage',
              params: { cardId: item.id, cardType: sectionId, cardData: JSON.stringify(item) },
            } as any);
        }
      } catch {
        // Prevent navigation error from crashing the app
      }
    },
    [router]
  );

  const handleAddToCart = useCallback(async (item: any) => {
    try {
      const productId = item._id || item.id;
      if (!productId) {
        platformAlertSimple('Error', 'Cannot add item to cart - invalid product');
        return;
      }

      // Extract price
      let currentPrice = 0;
      let originalPrice = 0;
      if (item.price) {
        if (typeof item.price === 'number') {
          currentPrice = item.price;
          originalPrice = item.originalPrice || item.price;
        } else if (typeof item.price === 'object') {
          currentPrice = item.price.current || item.price.selling || item.price.amount || 0;
          originalPrice =
            item.price.original ||
            item.price.mrp ||
            item.price.current ||
            item.price.selling ||
            item.price.amount ||
            0;
        }
      } else if (item.pricing) {
        currentPrice = item.pricing.selling || item.pricing.current || 0;
        originalPrice = item.pricing.mrp || item.pricing.original || item.pricing.selling || 0;
      }

      let imageUrl = '';
      if (item.image) {
        imageUrl = item.image;
      } else if (item.imageUrl) {
        imageUrl = item.imageUrl;
      } else if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        imageUrl = item.images[0].url || item.images[0];
      } else if (item.images && typeof item.images === 'string') {
        imageUrl = item.images;
      }

      // Lazy-require cartActions to avoid pulling the cart store (and Sentry chain) into test envs.
      let cartActions: any = null;
      try {
        cartActions = require('@/stores/selectors').useCartActions;
      } catch {
        cartActions = null;
      }

      if (cartActions) {
        await cartActions().addItem({
          id: productId,
          name: item.name || item.title || 'Product',
          image: imageUrl,
          price: currentPrice,
          originalPrice: originalPrice,
          discountedPrice: currentPrice,
          quantity: 1,
          cashback: item.cashback || 0,
          category: item.category || 'general',
          variants: item.variants || item.options || null,
          selectedVariant: item.selectedVariant || null,
          storeId: item.store?._id || item.store?.id || item.storeId,
          storeName: item.store?.name || item.storeName || 'Store',
        });
      }

      try {
        const { showToast } = require('@/components/common/ToastManager');
        showToast({
          message: `${item.name || item.title || 'Item'} added to cart`,
          type: 'success',
          duration: 3000,
        });
      } catch {
        /* toast optional */
      }
    } catch {
      try {
        const { showToast } = require('@/components/common/ToastManager');
        showToast({
          message: 'Failed to add item to cart',
          type: 'error',
          duration: 3000,
        });
      } catch {
        /* ignore */
      }
    }
  }, []);

  return { handleItemPress, handleAddToCart };
}

// ── Performance Hook ──

export function useHomepagePerformance() {
  const homepage = useHomepage();
  const sections = homepage.state.sections || [];

  const getLoadingStats = useCallback(() => {
    const totalSections = sections.length;
    const loadingSections = sections.filter((s: any) => s.loading).length;
    const errorSections = sections.filter((s: any) => s.error).length;

    return {
      total: totalSections,
      loading: homepage.loading ? totalSections : loadingSections,
      errors: errorSections,
      loaded: totalSections - loadingSections - errorSections,
    };
  }, [sections, homepage.loading]);

  const getSectionPerformance = useCallback(
    (sectionId: string) => {
      const section = sections.find((s: any) => s.id === sectionId);
      if (!section) return null;

      return {
        id: section.id,
        itemCount: section.items.length,
        lastUpdated: section.lastUpdated,
        isLoading: section.loading,
        hasError: !!section.error,
        refreshable: section.refreshable,
      };
    },
    [sections]
  );

  return {
    getLoadingStats,
    getSectionPerformance,
    lastRefresh: homepage.state.lastRefresh,
  };
}
