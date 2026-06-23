import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import analyticsService from '@/services/analyticsService';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

/**
 * Hook for tracking product page analytics
 *
 * Automatically tracks:
 * - Product views with time spent
 * - User interactions
 * - Scroll depth
 * - Exit intent
 */

interface UseProductAnalyticsProps {
  productId: string;
  productName: string;
  productPrice: number;
  category: string;
  brand: string;
  variantId?: string;
}

interface UseProductAnalyticsReturn {
  trackAddToCart: (quantity: number, variantDetails?: string) => void;
  trackWishlistAdd: () => void;
  trackWishlistRemove: () => void;
  trackShare: (platform: string, referralCode?: string) => void;
  trackVariantSelect: (variantId: string, attributes: Record<string, string>) => void;
  trackSizeGuide: (tab?: string) => void;
  trackQA: (action: 'view' | 'ask' | 'answer' | 'vote', questionId?: string) => void;
  trackReview: (action: 'view' | 'write' | 'helpful' | 'filter' | 'sort', reviewId?: string, rating?: number) => void;
  trackImage: (action: 'view' | 'zoom' | 'swipe', imageIndex: number) => void;
  trackVideo: (action: 'play' | 'pause' | 'complete' | 'skip', videoId?: string, duration?: number) => void;
  trackDelivery: (pinCode: string, isAvailable: boolean) => void;
  trackStockNotify: (variantId?: string, method?: string) => void;
}

export const useProductAnalytics = ({
  productId,
  productName,
  productPrice,
  category,
  brand,
  variantId,
}: UseProductAnalyticsProps): UseProductAnalyticsReturn => {
  const startTimeRef = useRef<Date>(new Date());
  const isTrackedRef = useRef(false);
  const scrollDepthRef = useRef(0);

  /**
   * Track product view on mount
   */
  useEffect(() => {
    if (!isTrackedRef.current) {
      devLog.log('📊 [ProductAnalytics] Tracking product view:', productId);

      analyticsService.trackProductView({
        productId,
        productName,
        productPrice,
        category,
        brand,
        variantId,
        referrer: Platform.OS === 'web' && typeof document !== 'undefined' ? document.referrer : undefined,
      });

      isTrackedRef.current = true;
    }
  }, [productId, productName, productPrice, category, brand, variantId]);

  /**
   * Track time spent on page cleanup
   */
  useEffect(() => {
    return () => {
      const timeSpent = Date.now() - startTimeRef.current.getTime();
      devLog.log(`⏱️ [ProductAnalytics] Time spent on product page: ${timeSpent}ms`);

      analyticsService.trackPerformance('product_page_time', timeSpent);

      // Track product view with time spent
      analyticsService.trackProductView({
        productId,
        productName,
        productPrice,
        category,
        brand,
        variantId,
        timeSpent,
      });
    };
  }, [productId, productName, productPrice, category, brand, variantId]);

  /**
   * Track add to cart
   */
  const trackAddToCart = useCallback(
    (quantity: number, variantDetails?: string) => {
      devLog.log('🛒 [ProductAnalytics] Tracking add to cart');

      analyticsService.trackAddToCart({
        productId,
        productName,
        price: productPrice,
        quantity,
        variantId,
        variantDetails,
        totalValue: productPrice * quantity,
      });
    },
    [productId, productName, productPrice, variantId]
  );

  /**
   * Track wishlist add
   */
  const trackWishlistAdd = useCallback(() => {
    devLog.log('❤️ [ProductAnalytics] Tracking wishlist add');
    analyticsService.trackWishlist('add', productId, productName);
  }, [productId, productName]);

  /**
   * Track wishlist remove
   */
  const trackWishlistRemove = useCallback(() => {
    devLog.log('💔 [ProductAnalytics] Tracking wishlist remove');
    analyticsService.trackWishlist('remove', productId, productName);
  }, [productId, productName]);

  /**
   * Track share
   */
  const trackShare = useCallback(
    (platform: string, referralCode?: string) => {
      devLog.log('📤 [ProductAnalytics] Tracking share:', platform);
      analyticsService.trackShare({ productId, platform, referralCode });
    },
    [productId]
  );

  /**
   * Track variant selection
   */
  const trackVariantSelect = useCallback(
    (variantId: string, attributes: Record<string, string>) => {
      devLog.log('🎨 [ProductAnalytics] Tracking variant selection');
      analyticsService.trackVariantSelection(productId, variantId, attributes);
    },
    [productId]
  );

  /**
   * Track size guide interaction
   */
  const trackSizeGuide = useCallback(
    (tab?: string) => {
      devLog.log('📏 [ProductAnalytics] Tracking size guide view');
      analyticsService.trackSizeGuideView(productId, tab);
    },
    [productId]
  );

  /**
   * Track Q&A interaction
   */
  const trackQA = useCallback(
    (action: 'view' | 'ask' | 'answer' | 'vote', questionId?: string) => {
      devLog.log('💬 [ProductAnalytics] Tracking Q&A interaction:', action);
      analyticsService.trackQAInteraction(action, productId, questionId);
    },
    [productId]
  );

  /**
   * Track review interaction
   */
  const trackReview = useCallback(
    (action: 'view' | 'write' | 'helpful' | 'filter' | 'sort', reviewId?: string, rating?: number) => {
      devLog.log('⭐ [ProductAnalytics] Tracking review interaction:', action);
      analyticsService.trackReviewInteraction(action, productId, reviewId, rating);
    },
    [productId]
  );

  /**
   * Track image interaction
   */
  const trackImage = useCallback(
    (action: 'view' | 'zoom' | 'swipe', imageIndex: number) => {
      devLog.log('🖼️ [ProductAnalytics] Tracking image interaction:', action);
      analyticsService.trackImageInteraction(action, productId, imageIndex);
    },
    [productId]
  );

  /**
   * Track video interaction
   */
  const trackVideo = useCallback(
    (action: 'play' | 'pause' | 'complete' | 'skip', videoId?: string, duration?: number) => {
      devLog.log('🎥 [ProductAnalytics] Tracking video interaction:', action);
      analyticsService.trackVideoInteraction(action, productId, videoId, duration);
    },
    [productId]
  );

  /**
   * Track delivery check
   */
  const trackDelivery = useCallback(
    (pinCode: string, isAvailable: boolean) => {
      devLog.log('🚚 [ProductAnalytics] Tracking delivery check');
      analyticsService.trackDeliveryCheck(productId, pinCode, isAvailable);
    },
    [productId]
  );

  /**
   * Track stock notification request
   */
  const trackStockNotify = useCallback(
    (variantId?: string, method?: string) => {
      devLog.log('🔔 [ProductAnalytics] Tracking stock notification request');
      analyticsService.trackStockNotification(productId, variantId, method);
    },
    [productId]
  );

  return {
    trackAddToCart,
    trackWishlistAdd,
    trackWishlistRemove,
    trackShare,
    trackVariantSelect,
    trackSizeGuide,
    trackQA,
    trackReview,
    trackImage,
    trackVideo,
    trackDelivery,
    trackStockNotify,
  };
};

export default useProductAnalytics;
