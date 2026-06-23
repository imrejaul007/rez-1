// useMainStorePageData.ts - Data fetching, state management, and transformation for MainStorePage
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { InteractionManager, Share, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthUser, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { useGamification } from '@/contexts/GamificationContext';
import { useStoreData } from '@/hooks/useStoreData';
import { useStoreReviews } from '@/hooks/useStoreReviews';
import { MainStoreProduct, MainStorePageProps } from '@/types/mainstore';
import { TabKey } from '@/app/MainStoreSection';
import reviewsApi from '@/services/reviewsApi';
import apiClient from '@/services/apiClient';
import wishlistApi from '@/services/wishlistApi';
import { storesApi } from '@/services/storesApi';
import { showAlert } from '@/components/common/CrossPlatformAlert';
import asyncStorageService from '@/services/asyncStorageService';
import { platformAlert, platformAlertSimple } from '@/utils/platformAlert';
import { errorReporter } from '@/utils/errorReporter';

interface LocationData {
  address?: string;
  city?: string;
  distance?: string;
  [key: string]: unknown;
}

export interface DynamicStoreData {
  id: string;
  name: string;
  title: string;
  description?: string;
  image?: string;
  logo?: string;
  rating: number;
  ratingCount: number;
  category?: string;
  location?: string | LocationData;
  deliveryTime?: string;
  minimumOrder?: number;
  cashback?: number | { percentage?: number; [key: string]: unknown };
  discount?: number | Record<string, unknown>;
  section?: string;
  operationalInfo?: {
    hours?: {
      monday?: { open: string; close: string; closed?: boolean };
      tuesday?: { open: string; close: string; closed?: boolean };
      wednesday?: { open: string; close: string; closed?: boolean };
      thursday?: { open: string; close: string; closed?: boolean };
      friday?: { open: string; close: string; closed?: boolean };
      saturday?: { open: string; close: string; closed?: boolean };
      sunday?: { open: string; close: string; closed?: boolean };
    };
    deliveryTime?: string;
    minimumOrder?: number;
    deliveryFee?: number;
    freeDeliveryAbove?: number;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    whatsapp?: string;
  };
  tags?: string[];
  createdAt?: string | Date;
  [key: string]: unknown;
}

export function useMainStorePageData({ productId, initialProduct }: MainStorePageProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const { state: gamificationState } = useGamification();
  const userCoins = gamificationState?.coinBalance?.total || 0;
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [screenData, setScreenData] = useState(Dimensions.get("window"));
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic store data state
  const [storeData, setStoreData] = useState<DynamicStoreData | null>(null);
  const [isDynamic, setIsDynamic] = useState(false);
  const initializedRef = useRef(false);
  const fullStoreDataRef = useRef<any>(null);

  const storeDataParam = params.storeData as string | undefined;
  const storeIdParam = params.storeId as string | undefined;
  const storeTypeParam = params.storeType as string | undefined;

  const shouldFetchStore = !!storeIdParam;
  const {
    data: fetchedStoreData,
    loading: storeLoading,
    error: storeError,
    refetch: refetchStore,
  } = useStoreData(shouldFetchStore ? storeIdParam : '');

  // UI state
  const [activeTab, setActiveTab] = useState<TabKey>("menu");
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showDealsModal, setShowDealsModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showWriteReviewModal, setShowWriteReviewModal] = useState(false);
  const [canReview, setCanReview] = useState<boolean | null>(null);
  const [ugcContent, setUgcContent] = useState<any[]>([]);
  const [ugcLoading, setUgcLoading] = useState(false);
  const [userVisitsData, setUserVisitsData] = useState<{
    visitsCompleted: number;
    totalVisitsRequired: number;
    nextReward: string;
    visitsRemaining: number;
    progress: number;
    hasCompletedMilestone: boolean;
  } | null>(null);

  // Transform fetched store data to DynamicStoreData format
  useEffect(() => {
    if (fetchedStoreData && storeIdParam) {
      try {
        let locationValue: string | LocationData = '';
        if (fetchedStoreData.location) {
          if (typeof fetchedStoreData.location === 'object') {
            locationValue = {
              address: fetchedStoreData.location.address || '',
              city: fetchedStoreData.location.city || '',
              state: fetchedStoreData.location.state || '',
              pincode: fetchedStoreData.location.pincode || '',
              landmark: fetchedStoreData.location.landmark || '',
              coordinates: fetchedStoreData.location.coordinates || undefined,
              deliveryRadius: fetchedStoreData.location.deliveryRadius || undefined,
            };
          } else {
            locationValue = fetchedStoreData.location;
          }
        }

        const transformedData: DynamicStoreData = {
          id: fetchedStoreData._id || fetchedStoreData.id || storeIdParam,
          name: fetchedStoreData.name || 'Unnamed Store',
          title: fetchedStoreData.name || 'Unnamed Store',
          description: fetchedStoreData.description || '',
          image: fetchedStoreData.banner || fetchedStoreData.image || '',
          logo: fetchedStoreData.logo || '',
          rating: fetchedStoreData.ratings?.average || 0,
          ratingCount: fetchedStoreData.ratings?.count || 0,
          category: fetchedStoreData.category?.name || fetchedStoreData.category || '',
          location: locationValue,
          deliveryTime: fetchedStoreData.operationalInfo?.deliveryTime || '',
          minimumOrder: fetchedStoreData.operationalInfo?.minimumOrder || 0,
          cashback: fetchedStoreData.offers?.cashback || 0,
          discount: fetchedStoreData.offers?.discounts?.length || 0,
          section: 'store',
          operationalInfo: fetchedStoreData.operationalInfo,
          contact: fetchedStoreData.contact,
          tags: fetchedStoreData.tags || [],
          createdAt: fetchedStoreData.createdAt,
        };
        setStoreData(transformedData);
        setIsDynamic(true);
        fullStoreDataRef.current = fetchedStoreData;

        // Track recently viewed + store visit
        asyncStorageService.addRecentlyViewedStore({
          _id: transformedData.id,
          name: transformedData.name,
          slug: fetchedStoreData.slug,
          logo: transformedData.logo,
          banner: transformedData.image,
          address: fetchedStoreData.address ? {
            street: fetchedStoreData.address.street,
            city: fetchedStoreData.address.city,
            state: fetchedStoreData.address.state,
          } : undefined,
          ratings: { average: transformedData.rating, count: transformedData.ratingCount },
          offers: {
            cashback: typeof transformedData.cashback === 'number' && transformedData.cashback > 0
              ? transformedData.cashback : undefined,
          },
        }).catch(() => {}); // Silent: non-critical AsyncStorage write

        asyncStorageService.trackStoreVisit({
          _id: transformedData.id,
          name: transformedData.name,
          slug: fetchedStoreData.slug,
          logo: transformedData.logo,
          banner: transformedData.image,
          description: fetchedStoreData.description || '',
          address: fetchedStoreData.address ? {
            street: fetchedStoreData.address.street || '',
            city: fetchedStoreData.address.city || '',
            state: fetchedStoreData.address.state || '',
            pincode: fetchedStoreData.address.pincode || '',
            landmark: fetchedStoreData.address.landmark || '',
          } : undefined,
          location: fetchedStoreData.location ? {
            address: fetchedStoreData.location.address || '',
            city: fetchedStoreData.location.city || '',
            state: fetchedStoreData.location.state || '',
            pincode: fetchedStoreData.location.pincode || '',
          } : undefined,
          ratings: { average: transformedData.rating, count: transformedData.ratingCount },
          offers: {
            cashback: typeof transformedData.cashback === 'number' && transformedData.cashback > 0
              ? transformedData.cashback : undefined,
          },
          operationalInfo: { deliveryTime: fetchedStoreData.operationalInfo?.deliveryTime || '' },
        }).catch(() => {}); // Silent: non-critical AsyncStorage write
      } catch (err) {
        errorReporter.captureError(
          err instanceof Error ? err : new Error('Failed to transform store data'),
          { context: 'useMainStorePageData.transformStoreData' },
          'warning'
        );
        setError('Failed to load store details');
      }
    }
  }, [fetchedStoreData, storeIdParam, storeDataParam]);

  // Handle store loading state + store error
  useEffect(() => {
    if (storeLoading) {
      setPageLoading(true);
      return;
    }
    if (storeError) {
      if (storeDataParam) {
        try {
          const parsedData = JSON.parse(storeDataParam);
          setStoreData({
            id: parsedData.id || storeIdParam || '',
            name: parsedData.name || parsedData.title || 'Store',
            title: parsedData.title || parsedData.name || 'Store',
            description: parsedData.description || '',
            image: parsedData.image || parsedData.banner || '',
            logo: parsedData.logo || '',
            rating: parsedData.rating || 0,
            ratingCount: parsedData.ratingCount || 0,
            category: parsedData.category || '',
            location: parsedData.location || '',
            deliveryTime: parsedData.deliveryTime || '',
            minimumOrder: parsedData.minimumOrder || 0,
            cashback: parsedData.cashback || 0,
            discount: parsedData.discount || 0,
            section: 'store',
            tags: parsedData.tags || [],
          });
          setIsDynamic(true);
          setError(null);
        } catch (err) {
          errorReporter.captureError(
            err instanceof Error ? err : new Error('Failed to parse store data from params'),
            { context: 'useMainStorePageData.parseStoreParams' },
            'warning'
          );
          setError(storeError.message || 'Failed to load store details');
        }
      } else {
        setError(storeError.message || 'Failed to load store details');
      }
      setPageLoading(false);
      return;
    }
    loadingTimeoutRef.current = setTimeout(() => setPageLoading(false), 300);
  }, [storeLoading, storeError, storeDataParam, storeIdParam]);

  // Initialize store data from params
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setPageLoading(true);

    const task = InteractionManager.runAfterInteractions(() => {
      if (storeDataParam && storeIdParam && storeTypeParam) {
        try {
          setStoreData(JSON.parse(storeDataParam));
          setIsDynamic(true);
        } catch (err) {
          errorReporter.captureError(
            err instanceof Error ? err : new Error('Failed to parse initial storeData param'),
            { context: 'useMainStorePageData.initStoreData' },
            'info'
          );
          setIsDynamic(false);
        }
      } else if (!storeIdParam) {
        setIsDynamic(false);
      }
    });

    return () => {
      task.cancel();
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      initializedRef.current = false;
    };
  }, [storeDataParam, storeIdParam, storeTypeParam]);

  // Screen resize listener
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => setScreenData(window), 100);
    });
    return () => {
      subscription?.remove();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, []);

  // Reviews
  const reviewStoreId = storeIdParam || storeData?.id || (isDynamic && storeData ? storeData.id : undefined);
  const {
    reviews: storeReviews,
    stats: reviewStats,
    ratingBreakdown: reviewRatingBreakdown,
    loading: reviewsLoading,
    refetch: refetchReviews,
  } = useStoreReviews(reviewStoreId, { limit: 20, sort: 'newest' });

  // Fetch canReview + UGC when reviews tab is active
  useEffect(() => {
    if ((activeTab === "reviews" || showReviewModal) && reviewStoreId) {
      const fetchReviewTabData = async () => {
        await Promise.allSettled([
          (async () => {
            try {
              const response = await reviewsApi.canUserReviewStore(reviewStoreId);
              if (response.success && response.data) setCanReview(response.data.canReview);
            } catch (err) {
              errorReporter.captureError(
                err instanceof Error ? err : new Error('Failed to check review eligibility'),
                { context: 'useMainStorePageData.canUserReviewStore' },
                'info'
              );
              setCanReview(true);
            }
          })(),
          (async () => {
            try {
              setUgcLoading(true);
              const response = await apiClient.get(`/ugc/store/${reviewStoreId}`, { limit: 20, offset: 0 });
              if (response.success && response.data) {
                const content = (response.data as any).content || [];
                setUgcContent(content.map((item: any) => ({
                  id: item._id || item.id,
                  userId: item.userId || item.user?._id,
                  userName: item.user?.profile?.firstName
                    ? `${item.user.profile.firstName} ${item.user.profile.lastName || ''}`.trim()
                    : 'Anonymous',
                  userAvatar: item.user?.profile?.avatar || '',
                  contentType: item.type === 'video' ? 'video' : 'image',
                  uri: item.url || item.thumbnail || '',
                  caption: item.caption || '',
                  likes: item.likes || 0,
                  isLiked: item.isLiked || false,
                  isBookmarked: item.isBookmarked || false,
                  date: new Date(item.createdAt || item.updatedAt),
                  productTags: item.tags || [],
                })));
              }
            } catch (err) {
              errorReporter.captureError(
                err instanceof Error ? err : new Error('Failed to fetch UGC content'),
                { context: 'useMainStorePageData.fetchUgcContent' },
                'warning'
              );
              setUgcContent([]);
            } finally {
              setUgcLoading(false);
            }
          })(),
        ]);
      };
      fetchReviewTabData();
    }
  }, [activeTab, showReviewModal, reviewStoreId]);

  // Check follow status on focus
  useFocusEffect(
    useCallback(() => {
      const storeIdToCheck = storeIdParam || storeData?.id;
      if (storeIdToCheck && isAuthenticated) {
        wishlistApi.checkWishlistStatus('store', storeIdToCheck)
          .then(response => {
            if (response.success && response.data) setIsFavorited(response.data.inWishlist || false);
          })
          .catch(() => {}); // Silent: non-critical wishlist status check
      }
    }, [storeIdParam, storeData?.id, isAuthenticated])
  );

  // Refetch store data when review stats change
  const lastFetchedStatsRef = useRef<{ totalReviews: number; averageRating: number } | null>(null);
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current);
    if (reviewStats && reviewStats.totalReviews > 0 && refetchStore) {
      const currentStats = { totalReviews: reviewStats.totalReviews, averageRating: reviewStats.averageRating };
      const lastStats = lastFetchedStatsRef.current;
      if (!lastStats || lastStats.totalReviews !== currentStats.totalReviews ||
        Math.abs(lastStats.averageRating - currentStats.averageRating) > 0.01) {
        lastFetchedStatsRef.current = currentStats;
        refetchTimeoutRef.current = setTimeout(() => {
          if (refetchStore) refetchStore();
          refetchTimeoutRef.current = null;
        }, 1000);
      }
    }
    return () => {
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
        refetchTimeoutRef.current = null;
      }
    };
  }, [reviewStats?.totalReviews, reviewStats?.averageRating]);

  // Review action handlers
  const handleReviewHelpful = useCallback(async (reviewId: string) => {
    try {
      const response = await reviewsApi.markHelpful(reviewId);
      if (response.success) await refetchReviews();
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to mark review as helpful'),
        { context: 'useMainStorePageData.handleReviewHelpful' },
        'info'
      );
    }
  }, [refetchReviews]);

  const handleReviewReport = useCallback(async (reviewId: string) => {
    try {
      const response = await reviewsApi.reportReview(reviewId, 'inappropriate');
      if (response.success) {
        platformAlertSimple('Success', 'Review reported successfully. Thank you for helping keep our community safe.');
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to report review'),
        { context: 'useMainStorePageData.handleReviewReport' },
        'warning'
      );
      platformAlertSimple('Error', 'Failed to report review. Please try again.');
    }
  }, []);

  const handleReviewLike = useCallback(async (reviewId: string) => {
    await handleReviewHelpful(reviewId);
  }, [handleReviewHelpful]);

  // Build productData
  const productData: MainStoreProduct = useMemo(() => {
    if (isDynamic && storeData) {
      let locationStr = "";
      let cityStr = "";
      let stateStr = "";
      let pincodeStr = "";

      if (storeData.location) {
        if (typeof storeData.location === 'object') {
          const locObj = storeData.location as LocationData;
          locationStr = locObj.address || "";
          cityStr = locObj.city || "";
          stateStr = (locObj as any).state || "";
          pincodeStr = (locObj as any).pincode || (locObj as any).pinCode || "";
        } else if (typeof storeData.location === 'string') {
          locationStr = storeData.location;
        }
      }

      const locationParts = [locationStr, cityStr].filter(Boolean);
      const statePinParts = [stateStr, pincodeStr].filter(Boolean);
      const fullLocation = locationParts.length > 0
        ? locationParts.join(", ") + (statePinParts.length > 0 ? `, ${statePinParts.join(" - ")}` : "")
        : "Location not available";

      const distanceStr = (storeData as any).distance ? `${(storeData as any).distance} Km` : "";

      const getBannerArray = (): string[] => {
        if (!storeData.image) return storeData.logo ? [storeData.logo] : [];
        if (Array.isArray(storeData.image)) {
          return storeData.image.length > 0 ? storeData.image : (storeData.logo ? [storeData.logo] : []);
        }
        return [storeData.image];
      };

      const bannerImages = getBannerArray();
      const storeImages = bannerImages.map((uri, index) => ({
        id: `banner-${index + 1}`,
        uri: typeof uri === 'string' ? uri : String(uri)
      }));

      if (storeData.logo && !bannerImages.includes(storeData.logo)) {
        storeImages.push({ id: "logo", uri: storeData.logo });
      }

      return {
        id: storeData.id,
        title: storeData.name || storeData.title || "Store",
        description: storeData.description || `Discover amazing products and services at ${storeData.name}.`,
        price: "View Products",
        location: fullLocation,
        distance: distanceStr,
        isOpen: (() => {
          const storeDataToUse = fullStoreDataRef.current;
          if (storeDataToUse?.operationalInfo?.hours) {
            const now = new Date();
            const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const dayHours = storeDataToUse.operationalInfo.hours[currentDayName as keyof typeof storeDataToUse.operationalInfo.hours];
            if (dayHours && !dayHours.closed && dayHours.open && dayHours.close) {
              const [openHour, openMin] = dayHours.open.split(':').map(Number);
              const [closeHour, closeMin] = dayHours.close.split(':').map(Number);
              const currentTime = now.getHours() * 60 + now.getMinutes();
              return currentTime >= (openHour * 60 + openMin) && currentTime <= (closeHour * 60 + closeMin);
            }
            return dayHours?.closed === false || dayHours?.closed === undefined;
          }
          return true;
        })(),
        images: storeImages,
        logo: storeData.logo || '',
        cashbackPercentage: typeof storeData.cashback === 'object'
          ? (storeData.cashback as any).percentage?.toString() || "0"
          : storeData.cashback?.toString() || "0",
        storeName: storeData.name || storeData.title || "Store",
        storeId: storeData.id,
        category: storeData.category || "General",
      };
    }

    return initialProduct || {
      id: productId || "product-001",
      title: "Little Big Comfort Tee",
      description: "Little Big Comfort Tee offers a perfect blend of relaxed fit and soft fabric for all-day comfort and effortless style.",
      price: `${currencySymbol}2,199`,
      location: "BTM",
      distance: "0.7 Km",
      isOpen: true,
      images: [],
      cashbackPercentage: "0",
      storeName: "Reliance Trends",
      storeId: storeIdParam || "store-001",
      category: "Fashion",
    };
  }, [initialProduct, productId, isDynamic, storeData, currencySymbol]);

  // Fetch user visits data
  useEffect(() => {
    if (!isDynamic || pageLoading) return;
    const storeId = storeIdParam || storeData?.id || productData.storeId;
    if (!storeId) return;

    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        const response = await storesApi.getUserStoreVisits(storeId);
        if (response.success && response.data) {
          setUserVisitsData({
            visitsCompleted: response.data.visitsCompleted,
            totalVisitsRequired: response.data.totalVisitsRequired,
            nextReward: response.data.nextReward,
            visitsRemaining: response.data.visitsRemaining,
            progress: response.data.progress,
            hasCompletedMilestone: response.data.hasCompletedMilestone,
          });
        }
      } catch (err) {
        errorReporter.captureError(
          err instanceof Error ? err : new Error('Failed to fetch user store visits'),
          { context: 'useMainStorePageData.fetchUserVisits' },
          'info'
        );
      }
    });
    return () => task.cancel();
  }, [storeIdParam, storeData?.id, productData.storeId, isDynamic, pageLoading]);

  // Action handlers
  const handleSharePress = useCallback(async () => {
    try {
      setIsLoading(true);
      await Share.share({
        message: `Check out ${productData.title} at ${productData.storeName} for ${productData.price}`,
        url: `https://store.example.com/products/${productData.id}`,
        title: productData.title,
      });
    } catch { // Silent: Share API cancellation is expected
      setError("Failed to share product.");
    } finally {
      setIsLoading(false);
    }
  }, [productData]);

  const handleFavoritePress = useCallback(async () => {
    if (!isAuthenticated) {
      showAlert('Sign In Required', 'Please sign in to follow stores and get updates on their offers.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign In', onPress: () => router.push('/sign-in') }], 'info');
      return;
    }
    const storeIdToUse = storeIdParam || storeData?.id || productData.storeId;
    if (!storeIdToUse) {
      showAlert('Error', 'Store information not available', undefined, 'error');
      return;
    }

    const wasFollowing = isFavorited;
    setIsFavorited(!wasFollowing);
    setIsFollowLoading(true);

    try {
      if (wasFollowing) {
        const response = await wishlistApi.removeFromWishlist('store', storeIdToUse);
        if (response.success) {
          showAlert('Unfollowed', `You've unfollowed ${productData.title || productData.storeName}.`, undefined, 'info');
        } else {
          throw new Error(response.message || 'Failed to unfollow');
        }
      } else {
        const response = await wishlistApi.addToWishlist({
          itemType: 'store', itemId: storeIdToUse,
          notes: `Following ${productData.title || productData.storeName}`, priority: 'medium',
        });
        if (response.success) {
          showAlert('Store Followed!', `You're now following ${productData.title || productData.storeName}. You'll see their latest offers in your feed.`, undefined, 'success');
        } else {
          throw new Error(response.message || 'Failed to follow');
        }
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to toggle store follow'),
        { context: 'useMainStorePageData.handleFavoritePress' },
        'warning'
      );
      setIsFavorited(wasFollowing);
      showAlert('Error', 'Something went wrong. Please try again.', undefined, 'error');
    } finally {
      setIsFollowLoading(false);
    }
  }, [isAuthenticated, isFavorited, storeIdParam, storeData?.id, productData.storeId, productData.title, productData.storeName, router]);

  const handleTabChange = useCallback((tab: TabKey) => setActiveTab(tab), []);
  const handleCloseAboutModal = useCallback(() => setShowAboutModal(false), []);
  const handleCloseDealsModal = useCallback(() => setShowDealsModal(false), []);
  const handleCloseReviewModal = useCallback(() => setShowReviewModal(false), []);
  const handleWriteReview = useCallback(() => {
    if (canReview === false) {
      platformAlert('Already Reviewed', 'You have already reviewed this store. You can edit your existing review from your profile.', [{ text: 'OK' }]);
      return;
    }
    setShowReviewModal(false);
    setTimeout(() => setShowWriteReviewModal(true), 300);
  }, [canReview]);
  const handleCloseWriteReviewModal = useCallback(() => setShowWriteReviewModal(false), []);
  const handleReviewSubmitted = useCallback(async () => {
    if (reviewStoreId) {
      if (refetchReviews) await refetchReviews();
      platformAlert('Review Submitted', 'Your review has been submitted successfully! It will be visible after merchant approval.', [{ text: 'OK' }]);
    }
  }, [reviewStoreId, refetchReviews]);

  const handleViewAllPress = useCallback(() => platformAlert("UGC", "View all UGC"), []);
  const handleImagePress = useCallback((imageId: string) => router.push(`/ugc/${imageId}`), [router]);
  const handleBackPress = useCallback(() => router.back(), [router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (storeIdParam && !storeDataParam) {
        await refetchStore();
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to refresh store data'),
        { context: 'useMainStorePageData.onRefresh' },
        'warning'
      );
      setError('Failed to refresh store data');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Auto-dismiss error
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 4500);
    return () => clearTimeout(id);
  }, [error]);

  // Menu tab label
  const menuTabLabel = useMemo(() => {
    const cat = (storeData?.category || '').toLowerCase();
    if (['food', 'dining', 'restaurant', 'cafe', 'bakery', 'kitchen', 'street food'].some(k => cat.includes(k))) return 'Menu';
    if (['service', 'repair', 'cleaning', 'plumbing', 'electrical', 'pest', 'laundry', 'tutor', 'nursing'].some(k => cat.includes(k))) return 'Services';
    return 'Products';
  }, [storeData?.category]);

  // Derived values
  const currentStoreId = storeIdParam || storeData?.id || productData.storeId;
  const currentStoreName = isDynamic && storeData ? storeData.name || storeData.title : productData.storeName;
  const currentStoreLogo = storeData?.logo || '';
  const avgRating = reviewStats?.averageRating || storeData?.rating || 0;
  const totalReviewCount = reviewStats?.totalReviews || storeData?.ratingCount || 0;

  return {
    // Data
    storeData,
    isDynamic,
    productData,
    fullStoreDataRef,
    fetchedStoreData,
    screenData,
    userCoins,
    userVisitsData,
    storeIdParam,

    // Reviews
    storeReviews,
    reviewStats,
    reviewRatingBreakdown,
    reviewsLoading,
    reviewStoreId,
    canReview,
    ugcContent,
    ugcLoading,

    // UI state
    activeTab,
    isFavorited,
    pageLoading,
    refreshing,
    error,
    showAboutModal,
    showDealsModal,
    showReviewModal,
    showWriteReviewModal,
    menuTabLabel,

    // Derived
    currentStoreId,
    currentStoreName,
    currentStoreLogo,
    avgRating,
    totalReviewCount,

    // Setters
    setIsFavorited,
    setError,

    // Handlers
    handleSharePress,
    handleFavoritePress,
    handleTabChange,
    handleCloseAboutModal,
    handleCloseDealsModal,
    handleCloseReviewModal,
    handleWriteReview,
    handleCloseWriteReviewModal,
    handleReviewSubmitted,
    handleReviewHelpful,
    handleReviewReport,
    handleReviewLike,
    handleViewAllPress,
    handleImagePress,
    handleBackPress,
    onRefresh,
    openWriteReviewModal: useCallback(() => setShowWriteReviewModal(true), []),
  };
}
