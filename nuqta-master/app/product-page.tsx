// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Modal, Pressable, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import StoreHeader from './StoreSection/StoreHeader';
import ProductInfo from './StoreSection/ProductInfo';
import StoreActionButtons from './StoreSection/StoreActionButtons';
import NewSection from './StoreSection/NewSection';
import Section3 from './StoreSection/Section3';
import Section4 from './StoreSection/Section4';
import Section5 from './StoreSection/Section5';
import Section6 from './StoreSection/Section6';
import CombinedSection78 from './StoreSection/CombinedSection78';
import ReviewForm from '@/components/reviews/ReviewForm';
import SimilarProducts from '@/components/products/SimilarProducts';
import FrequentlyBoughtTogether from '@/components/products/FrequentlyBoughtTogether';
import BundleDeals from '@/components/products/BundleDeals';
import useRecommendations from '@/hooks/useRecommendations';
import AddedToCartModal from '@/components/cart/AddedToCartModal';
import RelatedProductsSection from '@/components/product/RelatedProductsSection';
import ProductGallerySection from '@/components/product/ProductGallerySection';
import LockPriceModal from '@/components/product/LockPriceModal';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// NEW COMPONENTS FOR REDESIGNED PRODUCT PAGE
import CompletePurchaseSection from '@/components/product/CompletePurchaseSection';
import PayWithRezSection from '@/components/product/PayWithRezSection';
import DeliveryPickupCards from '@/components/product/DeliveryPickupCards';
import WhyGoodDealSection from '@/components/product/WhyGoodDealSection';
import ProductTabbedSection from '@/components/product/ProductTabbedSection';
import BottomBanner from '@/components/product/BottomBanner';
import ProductStickyBottomBar from '@/components/product/ProductStickyBottomBar';
import { showAlert } from '@/components/common/CrossPlatformAlert';
import { prefetchImages } from '@/components/ui/CachedImage';
import { useIsAuthenticated, useAuthLoading, useCartState, useRefreshCart, useGetCurrencySymbol } from '@/stores/selectors';
import cartApi from '@/services/cartApi';
import asyncStorageService from '@/services/asyncStorageService';
import reviewsService from '@/services/reviewsApi';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useIsMounted } from '@/hooks/useIsMounted';

interface Store {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  logo?: string;
  banner?: string;
  phone?: string;
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    whatsapp?: string;
  };
  ratings?: {
    average?: number;
    count?: number;
  };
  location?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    coordinates?: [number, number]; // [longitude, latitude]
    deliveryRadius?: number;
    landmark?: string;
  };
  operationalInfo?: {
    deliveryTime?: string;
    minimumOrder?: number;
  };
  // Action buttons configuration for ProductPage
  actionButtons?: {
    enabled: boolean;
    buttons: Array<{
      id: 'call' | 'product' | 'location' | 'custom';
      enabled: boolean;
      label?: string;
      destination?: {
        type: 'phone' | 'url' | 'maps' | 'internal';
        value: string;
      };
      order?: number;
    }>;
  };
}

interface ProductAnalytics {
  peopleBoughtToday?: number;
  delivery?: {
    estimated?: string;
  };
  cashback?: {
    percentage?: number;
    amount?: number;
  };
}

interface DynamicCardData {
  id?: string;
  _id?: string;
  title?: string;
  name?: string;
  description?: string;
  image?: string;
  images?: string[];
  price?: number;
  originalPrice?: number;
  rating?: number | { value?: number; count?: number };
  reviewCount?: number;
  category?: string;
  merchant?: string;
  type?: string;
  section?: string;
  discount?: number;
  isAvailable?: boolean;
  stock?: number;
  store?: Store;
  storeId?: string;
  selectedVariant?: {
    id?: string;
  };
  pricing?: {
    selling?: number;
    compare?: number;
    discount?: number;
  };
  ratings?: {
    average?: number;
    count?: number;
  };
  inventory?: {
    isAvailable?: boolean;
    stock?: number;
  };
  analytics?: ProductAnalytics;
  availabilityStatus?: string;
  location?: string;
  originalRating?: {
    value?: number;
    count?: number;
  };
  cashback?: {
    percentage?: number;
    maxAmount?: number;
  };
  computedCashback?: {
    amount?: number;
    percentage?: number;
  };
  computedDelivery?: string;
  todayPurchases?: number;
  todayViews?: number;
  deliveryInfo?: {
    estimatedDays?: string;
    standardDeliveryTime?: string;
    expressDeliveryTime?: string;
  };
  productType?: 'product' | 'service';
  features?: string[];
}

// Stable empty array to avoid breaking React.memo on child components
const EMPTY_ARRAY: string[] = [];

// Helper function to format review date (pure function, outside component)
function formatReviewDate(dateString: string): string {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
}

function StorePage() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const cartState = useCartState();
  const refreshCart = useRefreshCart();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [cardData, setCardData] = useState<DynamicCardData | null>(null);
  const [isDynamic, setIsDynamic] = useState(false);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showAddedToCartModal, setShowAddedToCartModal] = useState(false);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storeReviews, setStoreReviews] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showLockPriceModal, setShowLockPriceModal] = useState(false);
  const fetchedProductIdRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef<string | null>(null); // Prevents stale responses from overwriting
  const scrollViewRef = useRef<ScrollView>(null);

  // Responsive breakpoints
  const screenWidth = Dimensions.get('window').width;
  const isWeb = Platform.OS === 'web';
  const isDesktop = screenWidth >= 1024;

  // Memoized computed values for new sections
  const productPrice = useMemo(() => cardData?.price || cardData?.pricing?.selling || 0, [cardData?.price, cardData?.pricing?.selling]);
  const originalPrice = useMemo(() => cardData?.originalPrice || cardData?.pricing?.compare || productPrice, [cardData?.originalPrice, cardData?.pricing?.compare, productPrice]);
  const earnableCoins = useMemo(() => Math.floor(productPrice * 0.1), [productPrice]);
  const cashbackAmount = useMemo(() => cardData?.computedCashback?.amount || cardData?.cashback?.maxAmount || Math.floor(productPrice * 0.05), [cardData?.computedCashback?.amount, cardData?.cashback?.maxAmount, productPrice]);
  const savingsAmount = useMemo(() => originalPrice > productPrice ? originalPrice - productPrice : 0, [originalPrice, productPrice]);

  // Get product ID for recommendations
  const productId = useMemo(() => cardData?.id || cardData?._id || (params.cardId as string), [cardData?.id, cardData?._id, params.cardId]);
  const isMounted = useIsMounted();

  // Sync quantity from cart if this product is already in the cart
  useEffect(() => {
    if (!productId || !cartState?.items?.length) return;
    const existingItem = cartState.items.find(
      (item: any) => (item.productId || item.product?._id || item.product) === productId
    );
    if (existingItem?.quantity && existingItem.quantity > 1) {
      setQuantity(existingItem.quantity);
    }
  }, [productId, cartState?.items]);

  // Fetch recommendations for Similar Products, Frequently Bought Together, and Bundle Deals
  const {
    similar,
    frequentlyBought,
    bundles,
    loading: recommendationsLoading
  } = useRecommendations({
    productId: productId || '',
    autoFetch: !!productId,
    trackView: false  // Disable view tracking to prevent infinite API calls
  });

  // Function to fetch backend data for a product
  const fetchBackendData = async (productId: string) => {
    // Track active request to prevent stale responses from overwriting
    activeRequestIdRef.current = productId;
    setIsLoadingBackend(true);
    setError(null);
    try {
      // Import productsApi dynamically to avoid circular dependencies
      const { default: productsApi } = await import('@/services/productsApi');

      // Fetch product details from backend
      const response = await productsApi.getProductById(productId);

      // Abort if user navigated to a different product while this was loading
      if (activeRequestIdRef.current !== productId) return;

      if (response.success && response.data) {
        const productData = response.data;

        // Update cardData with real backend data using the correct structure
        const productType = (productData as any).productType || 'product';

        // Determine correct price: check if price is a direct number or an object
        const priceField = (productData as any).price;
        const actualPrice = typeof priceField === 'number' ? priceField :
          (priceField?.current || priceField?.selling ||
            (productData as any).pricing?.selling ||
            (productData as any).pricing?.basePrice ||
            0);
        // Get original price - check unified price object first, then raw pricing
        const unifiedPriceOriginal = (productData as any).price?.original;
        const originalPriceField = (productData as any).originalPrice;
        const actualOriginalPrice =
          unifiedPriceOriginal ||
          (typeof originalPriceField === 'number' ? originalPriceField : null) ||
          originalPriceField?.original ||
          (productData as any).pricing?.original ||
          (productData as any).pricing?.compare ||
          (productData as any).pricing?.mrp ||
          undefined;
        const actualDiscount = (productData as any).discount ||
          (productData as any).price?.discount ||
          (productData as any).pricing?.discount ||
          0;

        // Determine correct rating: prioritize rating.value over ratings.average if rating object exists
        const actualRatingValue = (productData as any).rating?.value ||
          productData.ratings?.average ||
          0;
        const actualReviewCount = (productData as any).rating?.count ||
          productData.ratings?.count ||
          0;

        const updatedCardData: DynamicCardData = {
          id: (productData as any)._id || productData.id,
          _id: (productData as any)._id,
          title: productData.name || (productData as any).title,
          name: productData.name,
          description: productData.description,
          price: actualPrice,
          originalPrice: actualOriginalPrice,
          rating: actualRatingValue,
          reviewCount: actualReviewCount,
          ratings: productData.ratings, // Full ratings object
          category: (productData.category as any)?.name || (productData.category as any) || 'General',
          merchant: productData.store?.name || (productData as any).merchant || 'Store',
          image: (typeof productData.images?.[0] === 'string' ? productData.images[0] : (productData.images?.[0] as any)?.url) || (productData as any).image,
          images: (productData.images as any)?.map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean) || [],
          discount: actualDiscount,
          isAvailable: (productData as any).inventory?.isAvailable || (productData as any).availabilityStatus === 'in_stock',
          availabilityStatus: (productData as any).inventory?.isAvailable ? 'in_stock' : 'out_of_stock',
          stock: (productData as any).inventory?.stock || 0,
          productType: productType, // 'product' or 'service'
          pricing: (productData as any).pricing,
          inventory: (productData as any).inventory,
          // Add full store data for navigation to MainStorePage
          store: productData.store as any,
          storeId: (productData.store as any)?._id || productData.store?.id,
          // Add computed fields from backend
          computedCashback: (productData as any).computedCashback,
          computedDelivery: (productData as any).computedDelivery,
          todayPurchases: (productData as any).todayPurchases,
          todayViews: (productData as any).todayViews,
          cashback: (productData as any).cashback,
          deliveryInfo: (productData as any).deliveryInfo,
          features: (productData as any).features || [],
        };

        if (!isMounted()) return;
        setCardData(updatedCardData);

        // Prefetch product images for faster gallery experience
        if (updatedCardData.images && updatedCardData.images.length > 1) {
          const urlsToPrefetch = updatedCardData.images.slice(1, 4).filter(Boolean);
          if (urlsToPrefetch.length > 0) {
            prefetchImages(urlsToPrefetch);
          }
        }

        // Track this product as recently viewed
        asyncStorageService.addRecentlyViewedProduct({
          _id: updatedCardData.id || updatedCardData._id,
          name: updatedCardData.name,
          title: updatedCardData.title,
          image: updatedCardData.image,
          images: updatedCardData.images,
          price: updatedCardData.price ? {
            current: updatedCardData.price,
            original: updatedCardData.originalPrice,
          } : undefined,
          rating: {
            value: updatedCardData.rating || 0,
            count: updatedCardData.reviewCount || 0,
          },
          cashback: updatedCardData.cashback,
        }).catch(() => {});

        // Fire analytics + view tracking in parallel (non-blocking)
        Promise.allSettled([
          productsApi.trackProductView(productId),
          productsApi.getProductAnalytics(productId).then(analyticsResponse => {
            if (analyticsResponse.success && analyticsResponse.data) {
              if (!isMounted()) return;
              setProductAnalytics(analyticsResponse.data);
            }
          }),
        ]).catch(() => {});

        // Lock status is checked via useFocusEffect (checkLockStatus)
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Failed to load product');
      }
    } catch (error) {
      if (!isMounted()) return;
      setError('Unable to load product. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsLoadingBackend(false);
    }
  };

  const retryFetch = useCallback(() => {
    const productId = params.cardId as string;
    if (productId) {
      fetchBackendData(productId);
    }
  }, [params.cardId]);

  // Check if product is locked (call this when page comes into focus)
  const checkLockStatus = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    const productId = cardData?.id || cardData?._id || params.cardId;
    if (!productId) return;

    try {
      const lockedResponse = await cartApi.getLockedItems();

      if (lockedResponse.success && lockedResponse.data) {
        const lockedItem = lockedResponse.data.lockedItems.find(
          (item: any) => item.product?._id === productId || item.product?.id === productId
        );
        if (!isMounted()) return;
        setIsLocked(!!lockedItem);
      }
    } catch (error) {
      // silently handle
    }
  }, [cardData?.id, cardData?._id, params.cardId, authLoading, isAuthenticated]);

  // Refresh lock status when page comes into focus
  useFocusEffect(
    useCallback(() => {
      checkLockStatus();
    }, [checkLockStatus])
  );

  // Parse dynamic card data from navigation params
  useEffect(() => {
    // Only process if we have the required params and haven't already processed this cardId
    if (params.cardId && params.cardType && fetchedProductIdRef.current !== params.cardId) {

      // Check if we have cardData passed from navigation
      if (params.cardData) {
        try {
          // Parse and use the passed card data immediately for fast display
          const parsedData = JSON.parse(params.cardData as string);
          setCardData(parsedData);
          setIsDynamic(true);
          fetchedProductIdRef.current = params.cardId as string;

          // Also fetch latest backend data in background to ensure freshness
          fetchBackendData(params.cardId as string);
        } catch (error) {

          // Fallback: Create basic card data and fetch from backend
          const cardDataFromParams: DynamicCardData = {
            id: params.cardId as string,
            title: 'Product Details',
            description: 'Loading product information...',
            category: params.category as string || 'general',
            type: params.cardType as string
          };

          setCardData(cardDataFromParams);
          setIsDynamic(true);
          fetchedProductIdRef.current = params.cardId as string;
          fetchBackendData(params.cardId as string);
        }
      } else {
        // No cardData passed - fetch from backend only
        const cardDataFromParams: DynamicCardData = {
          id: params.cardId as string,
          title: 'Product Details',
          description: 'Loading product information...',
          category: params.category as string || 'general',
          type: params.cardType as string
        };

        setCardData(cardDataFromParams);
        setIsDynamic(true);
        fetchedProductIdRef.current = params.cardId as string;
        fetchBackendData(params.cardId as string);
      }
    } else {
      setIsDynamic(false);
    }
  }, [params.cardId, params.cardType, params.category, params.cardData]);

  // Fetch reviews for the store
  useEffect(() => {
    const fetchStoreReviews = async () => {
      const storeId = cardData?.storeId || cardData?.store?.id || cardData?.store?._id;
      if (!storeId) return;

      try {
        // Fetch reviews from API
        const response = await reviewsService.getTargetReviews('store', storeId, {
          limit: 5,
          sortBy: 'newest'
        });

        if (response.data?.reviews) {
          // Transform reviews to match the ProductTabbedSection format
          const formattedReviews = response.data.reviews.map((review: any) => ({
            id: review.id || review._id,
            userName: review.user?.name || review.userName || 'Anonymous',
            userAvatar: review.user?.avatar,
            rating: review.rating || 5,
            date: formatReviewDate(review.createdAt),
            text: review.content || review.comment || review.text || '',
            cashbackEarned: review.metadata?.cashbackEarned || null
          }));
          if (!isMounted()) return;
          setStoreReviews(formattedReviews);
        }
      } catch (err) {
        // Keep empty array - component will show default reviews
      }
    };

    fetchStoreReviews();
  }, [cardData?.storeId, cardData?.store?.id, cardData?.store?._id]);

  // Determine store type from backend productType (defaults to PRODUCT)
  const storeType = useMemo(() => cardData?.productType === 'service' ? 'SERVICE' : 'PRODUCT', [cardData?.productType]);

  // ============================================
  // PRODUCTION-READY BUTTON HANDLERS
  // ============================================

  const handleBuyPress = useCallback(async () => {
    try {
      if (!cardData?.id && !cardData?._id) {
        showAlert('Error', 'Product information not available', [{ text: 'OK' }], 'error');
        return;
      }

      const productId = cardData.id || cardData._id;

      // Add to cart via API with selected quantity
      const cartResponse = await cartApi.addToCart({
        productId: productId!,
        quantity: quantity,
        variant: cardData.selectedVariant as any
      });

      if (cartResponse.success) {
        // Refresh cart context to update cart badge/count
        await refreshCart();
        // Show the added to cart modal
        if (!isMounted()) return;
        setShowAddedToCartModal(true);
      } else {
        showAlert('Error', cartResponse.message || 'Failed to add to cart', [{ text: 'OK' }], 'error');
      }
    } catch (error) {
      showAlert('Error', 'Unable to add to cart. Please try again.', [{ text: 'OK' }], 'error');
    }
  }, [cardData?.id, cardData?._id, cardData?.selectedVariant, quantity, refreshCart]);

  const handleLockPress = useCallback(() => {
    // Open the paid lock modal instead of directly locking
    if (!cardData?.id && !cardData?._id) {
      showAlert('Error', 'Product information not available', [{ text: 'OK' }], 'error');
      return;
    }

    // Open the LockPriceModal for paid lock (MakeMyTrip style)
    setShowLockPriceModal(true);
  }, [cardData?.id, cardData?._id]);

  // Handle successful lock with payment
  const handleLockSuccess = useCallback(async (lockDetails: {
    lockFee: number;
    duration: number;
    expiresAt: string;
    message: string;
  }) => {
    // Refresh cart context to update locked items count
    await refreshCart();

    // Update lock state
    setIsLocked(true);

    // Show success alert using cross-platform modal
    showAlert(
      'Price Locked!',
      lockDetails.message,
      [
        { text: 'OK', style: 'cancel' },
        { text: 'View Cart', onPress: () => router.push('/cart') }
      ],
      'success'
    );
  }, [refreshCart, router]);

  // Memoized navigation callbacks to prevent child re-renders
  const handleVisitStore = useCallback(() => {
    const storeId = cardData?.store?._id || cardData?.store?.id || cardData?.storeId;
    if (storeId) {
      router.push(`/MainStorePage?storeId=${storeId}` as any);
    }
  }, [cardData?.store?._id, cardData?.store?.id, cardData?.storeId, router]);

  const handleProductPress = useCallback((prodId: string) => {
    router.push({
      pathname: '/product-page',
      params: { cardId: prodId, cardType: 'product' }
    } as any);
  }, [router]);

  const handleViewAllReviews = useCallback(() => {
    const storeId = cardData?.storeId || cardData?.store?.id || cardData?.store?._id;
    if (storeId) {
      router.push(`/reviews/${storeId}`);
    }
  }, [cardData?.storeId, cardData?.store?.id, cardData?.store?._id, router]);

  const handleWriteReviewPress = useCallback(() => setShowReviewForm(true), []);
  const handleCloseReviewForm = useCallback(() => setShowReviewForm(false), []);
  const handleCloseAddedToCart = useCallback(() => setShowAddedToCartModal(false), []);
  const handleViewCart = useCallback(() => router.push('/cart'), [router]);
  const handleCloseLockModal = useCallback(() => setShowLockPriceModal(false), []);
  const handleBundleAddToCart = useCallback(async (products: any[]) => {
    try {
      for (const product of products) {
        const productId = product._id || product.id;
        if (productId) {
          await cartApi.addToCart({
            productId,
            quantity: 1,
          });
        }
      }
      await refreshCart();
      if (!isMounted()) return;
      setShowAddedToCartModal(true);
    } catch (error) {
      platformAlertSimple('Error', 'Failed to add bundle to cart. Please try again.');
    }
  }, [refreshCart]);
  const handleCardOffersPress = useCallback(() => {
    const storeId = cardData?.store?._id || cardData?.store?.id || cardData?.storeId;
    const storeName = cardData?.store?.name || 'Store';
    if (storeId) {
      router.push(`/CardOffersPage?storeId=${storeId}&storeName=${encodeURIComponent(storeName)}&orderValue=${productPrice}` as any);
    }
  }, [cardData?.store?._id, cardData?.store?.id, cardData?.storeId, cardData?.store?.name, productPrice, router]);

  // Memoized store info for CompletePurchaseSection
  const storeInfo = useMemo(() => ({
    name: cardData?.store?.name || 'Store',
    location: cardData?.store?.location?.address ||
      `${cardData?.store?.location?.city || ''}, ${cardData?.store?.location?.state || ''}`.trim() ||
      'Location available at store',
    hours: (cardData?.store as any)?.operatingHours || '9 AM - 9 PM',
  }), [cardData?.store]);

  // Memoized insights for WhyGoodDealSection
  const dealInsights = useMemo(() => [
    {
      icon: 'bulb',
      iconColor: Colors.warning,
      text: savingsAmount > 0
        ? `This product is usually bought on weekends — locking now saves ${currencySymbol}${savingsAmount}`
        : 'Lock the price now to avoid future price increases',
    },
    {
      icon: 'flame',
      iconColor: Colors.error,
      text: 'High demand item — price may change later',
    },
    {
      icon: 'gift',
      iconColor: Colors.gold,
      text: `Earn ${earnableCoins} ${BRAND.COIN_NAME} + ${currencySymbol}${cashbackAmount} cashback on this purchase`,
    },
  ], [savingsAmount, currencySymbol, earnableCoins, cashbackAmount]);

  // Memoized specifications for ProductTabbedSection
  const specifications = useMemo(() => [
    { key: 'Category', value: cardData?.category || 'N/A' },
    { key: 'Store', value: cardData?.store?.name || cardData?.merchant || 'N/A' },
    { key: 'Availability', value: cardData?.isAvailable ? 'In Stock' : 'Out of Stock' },
    { key: 'Delivery Time', value: cardData?.store?.operationalInfo?.deliveryTime || '30-45 mins' },
    { key: 'Minimum Order', value: cardData?.store?.operationalInfo?.minimumOrder ? `${currencySymbol}${cardData.store!.operationalInfo.minimumOrder}` : 'N/A' },
    { key: 'Cashback', value: `Up to ${(cardData?.store as any)?.offers?.cashback || 5}%` },
    { key: BRAND.COIN_NAME, value: '10% of purchase' },
    { key: 'Lock Duration', value: 'Up to 48 hours' },
  ].filter(spec => spec.value !== 'N/A'), [cardData, currencySymbol]);

  // Memoized storeData for StoreActionButtons
  const storeActionData = useMemo(() => ({
    storeId: cardData?.store?._id || cardData?.store?.id || cardData?.storeId,
    storeName: cardData?.store?.name,
    phone: cardData?.store?.phone || cardData?.store?.contact?.phone,
    location: cardData?.store?.location,
    name: cardData?.store?.name,
  }), [cardData?.store, cardData?.storeId]);

  // Memoized dynamic data with analytics for ProductInfo
  const productInfoData = useMemo(() =>
    isDynamic && cardData ? { ...cardData, analytics: productAnalytics } : null,
  [isDynamic, cardData, productAnalytics]);

  // Memoized product object for AddedToCartModal
  const addedToCartProduct = useMemo(() => cardData ? {
    id: cardData.id || cardData._id || '',
    name: cardData.title || cardData.name || '',
    image: cardData.image || cardData.images?.[0] || '',
    price: cardData.price || 0,
    quantity: quantity,
  } : null, [cardData?.id, cardData?._id, cardData?.title, cardData?.name, cardData?.image, cardData?.images, cardData?.price, quantity]);

  // Memoized lock details for ProductTabbedSection
  const lockDetails = useMemo(() => ({ isLocked }), [isLocked]);

  // Content max width for web
  const MAX_CONTENT_WIDTH = isDesktop ? 1200 : undefined;

  return (
    <ThemedView style={styles.container}>
      {/* Sticky Header - Outside ScrollView */}
      <View style={styles.stickyHeader}>
        <StoreHeader
          dynamicData={isDynamic ? cardData : null}
          cardType={params.cardType as string}
          isInStore={cardData?.availabilityStatus === 'in_stock' || cardData?.isAvailable}
          showImage={false}
          showHeaderBar={true}
        />
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          isWeb ? styles.webScrollContent : undefined,
          {
            paddingBottom: 100, // Space for sticky bottom bar
            paddingTop: Platform.OS === 'ios' ? 120 : 75, // Space for sticky header
          },
        ]}
      >
        <View style={[
          styles.contentWrapper,
          MAX_CONTENT_WIDTH && { maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', width: '100%' }
        ]}>
          {/* 1. Product Image Section */}
          <StoreHeader
            dynamicData={isDynamic ? cardData : null}
            cardType={params.cardType as string}
            isInStore={cardData?.availabilityStatus === 'in_stock' || cardData?.isAvailable}
            showImage={true}
            showHeaderBar={false}
          />

          {/* 2. Product Info with Brand & Category */}
          <ProductInfo
            dynamicData={productInfoData}
            cardType={params.cardType as string}
            quantity={quantity}
            isLocked={isLocked}
            onLockSuccess={handleLockSuccess}
          />

          {/* Loading indicator when fetching backend data */}
          {isLoadingBackend && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.gold} />
              <ThemedText style={styles.loadingText}>Loading product details...</ThemedText>
            </View>
          )}

          {/* Error state with retry */}
          {error && !isLoadingBackend && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
              <ThemedText style={styles.errorTitle}>Oops! Something went wrong</ThemedText>
              <ThemedText style={styles.errorMessage}>{error}</ThemedText>
              <Pressable style={styles.retryButton} onPress={retryFetch}>
                <Ionicons name="refresh-outline" size={20} color={Colors.text.inverse} />
                <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
              </Pressable>
            </View>
          )}

          {/* ========== NEW REDESIGNED SECTIONS ========== */}

          
          {/* Locked Product Badge (when already locked) */}
          {isLocked && (
            <View style={styles.lockedBadgeContainer}>
              <View style={styles.lockedBadge}>
                <Ionicons name="lock-closed" size={20} color={Colors.gold} />
                <ThemedText style={styles.lockedBadgeText}>Price Locked</ThemedText>
              </View>
              <ThemedText style={styles.lockedSubtext}>
                This product is reserved for you. Complete your purchase before the lock expires.
              </ThemedText>
              <Pressable
                style={styles.viewCartButton}
                onPress={handleViewCart}
              >
                <ThemedText style={styles.viewCartButtonText}>View in Cart</ThemedText>
                <Ionicons name="arrow-forward" size={16} color={Colors.gold} />
              </Pressable>
            </View>
          )}

          {/* 8. Complete Purchase Section */}
          {!isLoadingBackend && cardData && (
            <CompletePurchaseSection
              storeInfo={storeInfo}
              deliveryFee={(cardData?.store as any)?.deliveryFee || (cardData?.store as any)?.operationalInfo?.deliveryFee || 49}
              onVisitStore={handleVisitStore}
              onBuyOnline={handleBuyPress}
              isLocked={isLocked}
            />
          )}

          {/* 9. Pay with ReZ Section */}
          {!isLoadingBackend && cardData && productPrice > 0 && (
            <PayWithRezSection
              productPrice={productPrice}
              earnableCoins={earnableCoins}
            />
          )}

          {/* 10. Delivery & Pickup Cards */}
          {!isLoadingBackend && cardData && (
            <DeliveryPickupCards />
          )}

          {/* 11. Why This is a Good Deal */}
          {!isLoadingBackend && cardData && (
            <WhyGoodDealSection
              savingsAmount={savingsAmount}
              insights={dealInsights}
            />
          )}

          {/* 12. Product Tabbed Section (Description/Specs/Reviews/Lock Info) */}
          {!isLoadingBackend && cardData && (
            <ProductTabbedSection
              description={cardData.description || 'No description available for this product.'}
              features={cardData.features || EMPTY_ARRAY}
              specifications={specifications}
              reviews={storeReviews}
              averageRating={cardData.ratings?.average || (typeof cardData.rating === 'object' ? cardData.rating?.value : cardData.rating) || 0}
              reviewCount={cardData.ratings?.count || (typeof cardData.rating === 'object' ? cardData.rating?.count : cardData.reviewCount) || 0}
              lockDetails={lockDetails}
              onViewAllReviews={handleViewAllReviews}
            />
          )}

          {/* Similar Products Section */}
          <SimilarProducts
            similarProducts={similar}
            loading={recommendationsLoading}
            onProductPress={handleProductPress}
          />

          {/* Frequently Bought Together Section - uses bundles as fallback if frequentlyBought is empty */}
          <FrequentlyBoughtTogether
            bundles={frequentlyBought.length > 0 ? frequentlyBought : bundles}
            loading={recommendationsLoading}
            onAddToCart={handleBundleAddToCart}
            onProductPress={handleProductPress}
          />

          {/* Bundle Deals Section */}
          <BundleDeals
            bundles={bundles}
            loading={recommendationsLoading}
            onAddToCart={handleBundleAddToCart}
            onProductPress={handleProductPress}
          />

          {/* 13. Write a Review Card */}
          {!isLoadingBackend && cardData && (
            <Pressable
              style={styles.writeReviewCard}
              onPress={handleWriteReviewPress}
             
            >
              <View style={styles.writeReviewContent}>
                <View style={styles.writeReviewIcon}>
                  <Ionicons name="create-outline" size={20} color={Colors.gold} />
                </View>
                <View style={styles.writeReviewText}>
                  <ThemedText style={styles.writeReviewTitle}>Write a review</ThemedText>
                  <ThemedText style={styles.writeReviewSubtitle}>
                    Earn {cashbackAmount > 0 ? `${currencySymbol}${cashbackAmount}` : '5%'} cashback instantly
                  </ThemedText>
                </View>
              </View>
              <View style={styles.writeReviewBadge}>
                <Ionicons name="gift-outline" size={16} color={Colors.gold} />
                <ThemedText style={styles.writeReviewBadgeText}>
                  {currencySymbol}{cashbackAmount || Math.floor(productPrice * 0.05)}
                </ThemedText>
              </View>
            </Pressable>
          )}

          {/* 14. Related Products (You May Also Like) */}
          {isDynamic && cardData && (cardData.id || cardData._id) && (
            <View style={styles.relatedProductsSection}>
              <ErrorBoundary
                fallback={
                  <View style={styles.errorFallback}>
                    <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
                    <ThemedText style={styles.errorText}>
                      Unable to load recommendations
                    </ThemedText>
                  </View>
                }
              >
                <RelatedProductsSection
                  productId={cardData.id || cardData._id!}
                  title="You May Also Like"
                  type="similar"
                  limit={6}
                  onProductPress={handleProductPress}
                />
              </ErrorBoundary>
            </View>
          )}

          {/* ========== EXISTING SECTIONS (Moved to Bottom) ========== */}

          {/* 15. Instagram Card */}
          <NewSection
            dynamicData={isDynamic ? cardData : null}
            cardType={params.cardType as string}
          />

          {/* 16. Mega Sale Offers */}
          <Section3
            productPrice={productPrice || 1000}
            storeId={cardData?.storeId || cardData?.store?.id || cardData?.store?._id}
          />

          {/* 17. Card Offers */}
          <Section4
            productPrice={productPrice || 1000}
            storeId={cardData?.storeId || cardData?.store?.id || cardData?.store?._id}
            onPress={handleCardOffersPress}
          />

          {/* 18. Store Action Buttons */}
          <StoreActionButtons
            storeType={storeType}
            storeActionConfig={cardData?.store?.actionButtons}
            storeData={storeActionData}
            dynamicData={isDynamic ? cardData : null}
            buttonGroup="store-actions"
          />

          {/* 19. Section 5 */}
          <Section5
            dynamicData={isDynamic ? cardData : null}
            cardType={params.cardType as string}
          />

          {/* 20. Section 6 */}
          <Section6
            dynamicData={isDynamic ? cardData : null}
            cardType={params.cardType as string}
          />

          {/* 21. Combined Section 7 & 8 */}
          <CombinedSection78
            dynamicData={isDynamic ? cardData : null}
            cardType={params.cardType as string}
          />

          {/* Product Gallery Section */}
          {isDynamic && cardData && (cardData.id || cardData._id) && (
            <ProductGallerySection
              productId={cardData.id || cardData._id!}
              variantId={cardData.selectedVariant?.id}
            />
          )}

          {/* 22. Bottom Banner */}
          <BottomBanner />
        </View>
      </ScrollView>

      {/* Review Form Modal */}
      <Modal
        visible={showReviewForm}
        animationType="slide"
        statusBarTranslucent
        presentationStyle="pageSheet"
        onRequestClose={handleCloseReviewForm}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Write a Review</ThemedText>
            <Pressable
              onPress={handleCloseReviewForm}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color={Colors.text.primary} />
            </Pressable>
          </View>

          {(cardData?.storeId || cardData?.store?.id || cardData?.store?._id) && (
            <ReviewForm
              storeId={cardData.storeId || cardData.store!.id || cardData.store!._id!}
              onSubmit={handleCloseReviewForm}
              onCancel={handleCloseReviewForm}
            />
          )}
        </View>
      </Modal>

      {/* Added to Cart Modal */}
      {cardData && addedToCartProduct && (
        <AddedToCartModal
          visible={showAddedToCartModal}
          onClose={handleCloseAddedToCart}
          onViewCart={handleViewCart}
          product={addedToCartProduct}
          cartItemCount={cartState.items.length}
          cartTotal={(cartState as any).total || 0}
        />
      )}

      {/* Lock Price Modal (MakeMyTrip style) */}
      {cardData && (
        <LockPriceModal
          visible={showLockPriceModal}
          onClose={handleCloseLockModal}
          productId={cardData.id || cardData._id || ''}
          productName={cardData.title || cardData.name || ''}
          productPrice={cardData.price || cardData.pricing?.selling || 0}
          quantity={quantity}
          variant={cardData.selectedVariant as any}
          onLockSuccess={handleLockSuccess}
        />
      )}

      {/* Sticky Bottom Bar with Price and Lock Now Button */}
      {cardData && productPrice > 0 && (
        <ProductStickyBottomBar
          price={productPrice}
          originalPrice={originalPrice}
          isLocked={isLocked}
          onLockPress={handleLockPress}
          onAddToCart={handleBuyPress}
          quantity={quantity}
          onQuantityChange={setQuantity}
          maxQuantity={cardData?.stock || cardData?.inventory?.stock || 99}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Colors.background.primary,
  },
  webScrollContent: {
    paddingBottom: Platform.OS === 'web' ? 40 : 20,
  },
  contentWrapper: {
    flex: 1,
  },
  relatedProductsSection: {
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.xl,
    marginHorizontal: 0,
    backgroundColor: Colors.background.primary,
  },
  // Write Review Card styles (ReZ brand colors: green #ffcd57, golden #F59E0B)
  writeReviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 192, 106, 0.15)',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  writeReviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  writeReviewIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  writeReviewText: {
    flex: 1,
  },
  writeReviewTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  writeReviewSubtitle: {
    ...Typography.bodySmall,
    color: Colors.gold,
    fontWeight: '500',
  },
  writeReviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    gap: 6,
  },
  writeReviewBadgeText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.gold,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    margin: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  errorContainer: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    backgroundColor: colors.errorScale[50],
    margin: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  errorTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  errorFallback: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorScale[50],
    borderRadius: BorderRadius.md,
    margin: Spacing.base,
  },
  errorText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  // Locked Product Badge Styles
  lockedBadgeContainer: {
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: colors.linen,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: 'center',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  lockedBadgeText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  lockedSubtext: {
    ...Typography.body,
    color: '#065F46',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.base,
  },
  viewCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gold,
    gap: Spacing.sm,
  },
  viewCartButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.gold,
  },
});
export default withErrorBoundary(StorePage, 'ProductPage');
