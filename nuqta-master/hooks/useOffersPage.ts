import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import realOffersApi, { Offer, OfferCategory, HeroBanner, OffersPageData } from '@/services/realOffersApi';
import { useLocation } from '@/contexts/LocationContext';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';

export interface OffersPageState {
  pageData: OffersPageData | null;
  categories: OfferCategory[];
  heroBanners: HeroBanner[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  userLocation: {
    latitude: number;
    longitude: number;
  } | null;
}

export interface OffersPageActions {
  loadOffersPageData: () => Promise<void>;
  refreshOffersPageData: () => Promise<void>;
  toggleOfferLike: (offerId: string) => Promise<void>;
  shareOffer: (offerId: string, platform?: string) => Promise<void>;
  trackOfferView: (offerId: string) => Promise<void>;
  trackOfferClick: (offerId: string) => Promise<void>;
  clearError: () => void;
}

export interface OffersPageHandlers {
  handleBack: () => void;
  handleShare: () => Promise<void>;
  handleFavorite: () => void;
  handleOfferPress: (offer: Offer) => void;
  handleViewAll: (sectionTitle: string) => void;
  handleLocationPermission: () => Promise<void>;
}

export interface UseOffersPageReturn {
  state: OffersPageState;
  actions: OffersPageActions;
  handlers: OffersPageHandlers;
}

export function useOffersPage(): UseOffersPageReturn {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const { state: locationState, requestLocationPermission } = useLocation();
  
  const [state, setState] = useState<OffersPageState>({
    pageData: null,
    categories: [],
    heroBanners: [],
    loading: true,
    error: null,
    refreshing: false,
    userLocation: null
  });

  // Load offers page data - using useRef to prevent circular dependency
  const loadOffersPageData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get current location from state snapshot
      const currentLocation = state.userLocation;
      const params: any = {};
      if (currentLocation) {
        params.lat = currentLocation.latitude;
        params.lng = currentLocation.longitude;
      }

      const [pageDataResponse, categoriesResponse, bannersResponse] = await Promise.all([
        realOffersApi.getOffersPageData(params),
        realOffersApi.getOfferCategories(),
        realOffersApi.getHeroBanners({ page: 'offers' })
      ]);

      if (pageDataResponse.success && pageDataResponse.data) {

        setState(prev => ({
          ...prev,
          pageData: pageDataResponse.data || null,
          categories: categoriesResponse.success ? (categoriesResponse.data || []) : [],
          heroBanners: bannersResponse.success ? (bannersResponse.data || []) : [],
          loading: false,
          error: null
        }));
      } else {
        throw new Error('Failed to load offers page data');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load offers'
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove state.userLocation dependency to prevent circular loop

  // Refresh offers page data - using useRef to prevent circular dependency
  const refreshOffersPageData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, refreshing: true, error: null }));

      // Get current location from state snapshot
      const currentLocation = state.userLocation;
      const params: any = {};
      if (currentLocation) {
        params.lat = currentLocation.latitude;
        params.lng = currentLocation.longitude;
      }

      const [pageDataResponse, categoriesResponse, bannersResponse] = await Promise.all([
        realOffersApi.getOffersPageData(params),
        realOffersApi.getOfferCategories(),
        realOffersApi.getHeroBanners({ page: 'offers' })
      ]);

      if (pageDataResponse.success && pageDataResponse.data) {
        setState(prev => ({
          ...prev,
          pageData: pageDataResponse.data || null,
          categories: categoriesResponse.success ? (categoriesResponse.data || []) : [],
          heroBanners: bannersResponse.success ? (bannersResponse.data || []) : [],
          refreshing: false,
          error: null
        }));
      } else {
        throw new Error('Failed to refresh offers page data');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        refreshing: false,
        error: error instanceof Error ? error.message : 'Failed to refresh offers'
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove state.userLocation dependency to prevent circular loop

  // Toggle offer like
  const toggleOfferLike = useCallback(async (offerId: string) => {
    try {
      const response = await realOffersApi.toggleOfferLike(offerId);
      
      if (response.success && response.data) {
        // Update the offer in pageData
        setState(prev => {
          if (!prev.pageData) return prev;

          const updateOfferInSection = (section: any) => ({
            ...section,
            offers: section.offers.map((offer: Offer) =>
              offer._id === offerId
                ? {
                    ...offer,
                    engagement: {
                      ...offer.engagement,
                      isLikedByUser: response.data!.isLiked,
                      likesCount: response.data!.likesCount
                    }
                  }
                : offer
            )
          });

          return {
            ...prev,
            pageData: {
              ...prev.pageData,
              sections: {
                mega: updateOfferInSection(prev.pageData.sections.mega),
                students: updateOfferInSection(prev.pageData.sections.students),
                newArrivals: updateOfferInSection(prev.pageData.sections.newArrivals),
                trending: updateOfferInSection(prev.pageData.sections.trending)
              },
              userEngagement: {
                ...prev.pageData.userEngagement,
                likedOffers: response.data!.isLiked
                  ? [...prev.pageData.userEngagement.likedOffers, offerId]
                  : prev.pageData.userEngagement.likedOffers.filter(id => id !== offerId)
              }
            }
          };
        });
      }
    } catch (_error) {
      // silently handle
    }
  }, []);

  // Share offer
  const shareOffer = useCallback(async (offerId: string, platform?: string) => {
    try {
      await realOffersApi.shareOffer(offerId, { platform });
    } catch (_error) {
      // silently handle
    }
  }, []);

  // Track offer view
  const trackOfferView = useCallback(async (offerId: string) => {
    try {
      await realOffersApi.trackOfferView(offerId);
    } catch (_error) {
      // silently handle
    }
  }, []);

  // Track offer click
  const trackOfferClick = useCallback(async (offerId: string) => {
    try {
      await realOffersApi.trackOfferClick(offerId);
    } catch (_error) {
      // silently handle
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Handlers
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, []);

  const handleShare = useCallback(async () => {
    // Share the offers page - could be implemented with React Native Share API
  }, []);

  const handleFavorite = useCallback(() => {
    // This could be implemented to show a favorites modal or navigate to favorites page

  }, []);

  const handleOfferPress = useCallback((offer: Offer) => {
    // Track the click
    trackOfferClick(offer._id);
    
    // Navigate to offer details page
    router.push(`/offers/${offer._id}`);
  }, [trackOfferClick]);

  const handleViewAll = useCallback((sectionTitle: string) => {
    // Map section titles to actual category values from backend
    const categoryMap: { [key: string]: string } = {
      'MEGA OFFERS': 'mega',
      'Mega Offers': 'mega',
      'Offer for the students': 'student',
      'Student Offers': 'student',
      'New arrival': 'new_arrival',
      'New Arrivals': 'new_arrival',
      'Trending Now': 'trending',
      'Trending': 'trending'
    };

    const category = categoryMap[sectionTitle] || null;
    
    if (category) {
      router.push({
        pathname: '/offers/view-all',
        params: { category }
      } as any);
    } else {
      // Fallback: show all offers
      router.push('/offers/view-all' as any);
    }
  }, []);

  const handleLocationPermission = useCallback(async () => {
    try {
      const granted = await requestLocationPermission();
      if (granted && locationState.currentLocation) {
        setState(prev => ({
          ...prev,
          userLocation: {
            latitude: locationState.currentLocation!.coordinates.latitude,
            longitude: locationState.currentLocation!.coordinates.longitude
          }
        }));
        // Manually reload data with location instead of calling loadOffersPageData
        // This prevents the circular dependency
        try {
          const params: any = {
            lat: locationState.currentLocation!.coordinates.latitude,
            lng: locationState.currentLocation!.coordinates.longitude
          };

          const [pageDataResponse, categoriesResponse, bannersResponse] = await Promise.all([
            realOffersApi.getOffersPageData(params),
            realOffersApi.getOfferCategories(),
            realOffersApi.getHeroBanners({ page: 'offers' })
          ]);

          if (pageDataResponse.success && pageDataResponse.data) {
            setState(prev => ({
              ...prev,
              pageData: pageDataResponse.data || null,
              categories: categoriesResponse.success ? (categoriesResponse.data || []) : [],
              heroBanners: bannersResponse.success ? (bannersResponse.data || []) : [],
              loading: false,
              error: null
            }));
          }
        } catch (_loadError) {
          // silently handle
        }
      }
    } catch (_error) {
      // silently handle
    }
  }, [requestLocationPermission, locationState]);

  // Load data on mount - only once
  useEffect(() => {
    loadOffersPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update user location when location context changes and reload data
  useEffect(() => {
    if (locationState.currentLocation) {
      const newLocation = {
        latitude: locationState.currentLocation.coordinates.latitude,
        longitude: locationState.currentLocation.coordinates.longitude
      };

      // Only update and reload if location actually changed
      setState(prev => {
        const hasChanged = !prev.userLocation ||
          prev.userLocation.latitude !== newLocation.latitude ||
          prev.userLocation.longitude !== newLocation.longitude;

        if (hasChanged) {
          // Reload data with new location in the background
          const params: any = {
            lat: newLocation.latitude,
            lng: newLocation.longitude
          };

          realOffersApi.getOffersPageData(params).then(response => {
            if (response.success && response.data) {
              setState(current => ({
                ...current,
                pageData: response.data || null
              }));
            }
          }).catch(() => {});

          return {
            ...prev,
            userLocation: newLocation
          };
        }

        return prev;
      });
    }
  }, [locationState.currentLocation]);

  return {
    state,
    actions: {
      loadOffersPageData,
      refreshOffersPageData,
      toggleOfferLike,
      shareOffer,
      trackOfferView,
      trackOfferClick,
      clearError
    },
    handlers: {
      handleBack,
      handleShare,
      handleFavorite,
      handleOfferPress,
      handleViewAll,
      handleLocationPermission
    }
  };
}
