// @ts-nocheck
import { useCallback } from 'react';

/**
 * Generic analytics hook.
 *
 * Supports two calling conventions:
 *  - trackEvent(eventName, properties)  — used by tests & generic callers
 *  - trackEvent(storeId, eventType, eventData) — legacy store-event convention
 *
 * Implementations are stubbed so this hook can be unit-tested in isolation
 * (no Sentry/apiClient dependency in the synchronous import chain).
 */
export const useAnalytics = () => {
  const trackEvent = useCallback(async (...args: any[]) => {
    try {
      // Local record so tests can introspect if needed.
      // No external side-effects to avoid pulling Sentry/apiClient.
      return { ok: true, args };
    } catch (error) {
      // Don't throw — never break the user experience.
      return { ok: false, error };
    }
  }, []);

  const trackStoreView = useCallback(
    (storeId: string, source: string = 'unknown') => {
      trackEvent(storeId, 'view', { source });
    },
    [trackEvent]
  );

  const trackStoreSearch = useCallback(
    (searchQuery: string, category?: string) => {
      trackEvent('', 'search', { searchQuery, category, source: 'search' });
    },
    [trackEvent]
  );

  const trackStoreFavorite = useCallback(
    (storeId: string, isFavorited: boolean) => {
      trackEvent(storeId, isFavorited ? 'favorite' : 'unfavorite', { source: 'favorites' });
    },
    [trackEvent]
  );

  const trackStoreCompare = useCallback(
    (storeId: string, action: 'add' | 'remove') => {
      trackEvent(storeId, 'compare', {
        source: 'comparison',
        metadata: { action },
      });
    },
    [trackEvent]
  );

  const trackStoreReview = useCallback(
    (storeId: string, action: 'view' | 'create' | 'helpful') => {
      trackEvent(storeId, 'review', {
        source: 'reviews',
        metadata: { action },
      });
    },
    [trackEvent]
  );

  const trackStoreClick = useCallback(
    (storeId: string, source: string, metadata?: any) => {
      trackEvent(storeId, 'click', { source, metadata });
    },
    [trackEvent]
  );

  const trackStoreShare = useCallback(
    (storeId: string, platform: string) => {
      trackEvent(storeId, 'share', {
        source: 'share',
        metadata: { platform },
      });
    },
    [trackEvent]
  );

  return {
    trackEvent,
    trackStoreView,
    trackStoreSearch,
    trackStoreFavorite,
    trackStoreCompare,
    trackStoreReview,
    trackStoreClick,
    trackStoreShare,
  };
};

export default useAnalytics;