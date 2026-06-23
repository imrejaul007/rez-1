/**
 * Comprehensive Analytics Hook
 *
 * Main hook for tracking events throughout the app
 */

import { useCallback, useRef, useEffect } from 'react';
import { analytics } from '@/services/analytics/AnalyticsService';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';
import {
  StoreEvent,
  ProductEvent,
  CartEvent,
  DealEvent,
  UGCEvent,
  BookingEvent,
  PayBillEvent,
  PurchaseTransaction,
} from '@/services/analytics/types';

export const useComprehensiveAnalytics = () => {
  const screenStartTime = useRef<number>(Date.now());
  const currentScreen = useRef<string>('');

  /**
   * Track generic event
   */
  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    analytics.trackEvent(eventName, properties);
  }, []);

  /**
   * Track screen view
   */
  const trackScreen = useCallback((screenName: string, properties?: Record<string, any>) => {
    currentScreen.current = screenName;
    screenStartTime.current = Date.now();
    analytics.trackScreen(screenName, properties);
  }, []);

  // ============ STORE EVENTS ============

  const trackStoreViewed = useCallback((event: StoreEvent & { source?: string }) => {
    trackEvent(ANALYTICS_EVENTS.STORE_VIEWED, {
      store_id: event.storeId,
      store_name: event.storeName,
      store_category: event.storeCategory,
      source: event.source,
    });
  }, [trackEvent]);

  const trackStoreFollowed = useCallback((event: StoreEvent) => {
    trackEvent(ANALYTICS_EVENTS.STORE_FOLLOWED, {
      store_id: event.storeId,
      store_name: event.storeName,
      store_category: event.storeCategory,
    });
  }, [trackEvent]);

  const trackStoreUnfollowed = useCallback((event: StoreEvent) => {
    trackEvent(ANALYTICS_EVENTS.STORE_UNFOLLOWED, {
      store_id: event.storeId,
      store_name: event.storeName,
      store_category: event.storeCategory,
    });
  }, [trackEvent]);

  const trackStoreShared = useCallback((event: StoreEvent & { platform: string }) => {
    trackEvent(ANALYTICS_EVENTS.STORE_SHARED, {
      store_id: event.storeId,
      store_name: event.storeName,
      platform: event.platform,
    });
  }, [trackEvent]);

  const trackStoreContactClicked = useCallback((
    event: StoreEvent & { contactType: 'phone' | 'email' | 'website' | 'directions' }
  ) => {
    trackEvent(ANALYTICS_EVENTS.STORE_CONTACT_CLICKED, {
      store_id: event.storeId,
      store_name: event.storeName,
      contact_type: event.contactType,
    });
  }, [trackEvent]);

  // ============ PRODUCT EVENTS ============

  const trackProductViewed = useCallback((event: ProductEvent & { source?: string; timeSpent?: number }) => {
    trackEvent(ANALYTICS_EVENTS.PRODUCT_VIEWED, {
      product_id: event.productId,
      product_name: event.productName,
      price: event.price,
      category: event.category,
      brand: event.brand,
      variant: event.variant,
      source: event.source,
      time_spent: event.timeSpent,
    });
  }, [trackEvent]);

  const trackProductQuickViewed = useCallback((event: ProductEvent) => {
    trackEvent(ANALYTICS_EVENTS.PRODUCT_QUICK_VIEWED, {
      product_id: event.productId,
      product_name: event.productName,
      price: event.price,
      category: event.category,
    });
  }, [trackEvent]);

  const trackProductSearched = useCallback((query: string, resultsCount: number, filters?: any) => {
    trackEvent(ANALYTICS_EVENTS.PRODUCT_SEARCHED, {
      query,
      results_count: resultsCount,
      filters,
    });
  }, [trackEvent]);

  const trackProductFiltered = useCallback((filters: Record<string, any>, resultsCount: number) => {
    trackEvent(ANALYTICS_EVENTS.PRODUCT_FILTERED, {
      filters,
      results_count: resultsCount,
    });
  }, [trackEvent]);

  const trackProductSorted = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    trackEvent(ANALYTICS_EVENTS.PRODUCT_SORTED, {
      sort_by: sortBy,
      sort_order: sortOrder,
    });
  }, [trackEvent]);

  const trackProductListViewed = useCallback((
    listName: string,
    products: ProductEvent[],
    source?: string
  ) => {
    trackEvent(ANALYTICS_EVENTS.PRODUCT_LIST_VIEWED, {
      list_name: listName,
      product_count: products.length,
      products: products.map(p => ({
        product_id: p.productId,
        product_name: p.productName,
        price: p.price,
        category: p.category,
      })),
      source,
    });
  }, [trackEvent]);

  const trackProductWishlistAdded = useCallback((event: ProductEvent) => {
    trackEvent(ANALYTICS_EVENTS.PRODUCT_WISHLIST_ADDED, {
      product_id: event.productId,
      product_name: event.productName,
      price: event.price,
      category: event.category,
    });
  }, [trackEvent]);

  const trackProductWishlistRemoved = useCallback((event: ProductEvent) => {
    trackEvent(ANALYTICS_EVENTS.PRODUCT_WISHLIST_REMOVED, {
      product_id: event.productId,
      product_name: event.productName,
    });
  }, [trackEvent]);

  const trackProductVariantSelected = useCallback((
    event: ProductEvent & { attributes: Record<string, string> }
  ) => {
    trackEvent(ANALYTICS_EVENTS.PRODUCT_VARIANT_SELECTED, {
      product_id: event.productId,
      product_name: event.productName,
      variant: event.variant,
      attributes: event.attributes,
    });
  }, [trackEvent]);

  const trackProductShared = useCallback((event: ProductEvent & { platform: string }) => {
    trackEvent(ANALYTICS_EVENTS.PRODUCT_SHARED, {
      product_id: event.productId,
      product_name: event.productName,
      platform: event.platform,
    });
  }, [trackEvent]);

  // ============ CART EVENTS ============

  const trackAddToCart = useCallback((event: CartEvent) => {
    trackEvent(ANALYTICS_EVENTS.ADD_TO_CART, {
      product_id: event.productId,
      product_name: event.productName,
      price: event.price,
      quantity: event.quantity,
      total_value: event.totalValue,
      variant: event.variant,
      category: event.category,
    });
  }, [trackEvent]);

  const trackRemoveFromCart = useCallback((event: CartEvent) => {
    trackEvent(ANALYTICS_EVENTS.REMOVE_FROM_CART, {
      product_id: event.productId,
      product_name: event.productName,
      quantity: event.quantity,
    });
  }, [trackEvent]);

  const trackCartViewed = useCallback((itemCount: number, totalValue: number) => {
    trackEvent(ANALYTICS_EVENTS.CART_VIEWED, {
      item_count: itemCount,
      total_value: totalValue,
    });
  }, [trackEvent]);

  const trackCartUpdated = useCallback((event: CartEvent & { action: 'increase' | 'decrease' }) => {
    trackEvent(ANALYTICS_EVENTS.CART_UPDATED, {
      product_id: event.productId,
      product_name: event.productName,
      action: event.action,
      new_quantity: event.quantity,
    });
  }, [trackEvent]);

  const trackCartCleared = useCallback((itemCount: number, totalValue: number) => {
    trackEvent(ANALYTICS_EVENTS.CART_CLEARED, {
      item_count: itemCount,
      total_value: totalValue,
    });
  }, [trackEvent]);

  const trackCheckoutStarted = useCallback((itemCount: number, totalValue: number, items: any[]) => {
    trackEvent(ANALYTICS_EVENTS.CHECKOUT_STARTED, {
      item_count: itemCount,
      total_value: totalValue,
      items,
    });
  }, [trackEvent]);

  const trackCheckoutCompleted = useCallback((transaction: PurchaseTransaction) => {
    analytics.trackPurchase(transaction);
  }, []);

  const trackCheckoutAbandoned = useCallback((
    step: string,
    itemCount: number,
    totalValue: number
  ) => {
    trackEvent(ANALYTICS_EVENTS.CHECKOUT_ABANDONED, {
      step,
      item_count: itemCount,
      total_value: totalValue,
    });
  }, [trackEvent]);

  // ============ DEAL/OFFER EVENTS ============

  const trackDealViewed = useCallback((event: DealEvent) => {
    trackEvent(ANALYTICS_EVENTS.DEAL_VIEWED, {
      deal_id: event.dealId,
      deal_type: event.dealType,
      deal_value: event.dealValue,
      expiry_date: event.expiryDate,
    });
  }, [trackEvent]);

  const trackVoucherCopied = useCallback((voucherId: string, voucherCode: string) => {
    trackEvent(ANALYTICS_EVENTS.VOUCHER_COPIED, {
      voucher_id: voucherId,
      voucher_code: voucherCode,
    });
  }, [trackEvent]);

  const trackVoucherClaimed = useCallback((voucherId: string, voucherValue: number) => {
    trackEvent(ANALYTICS_EVENTS.VOUCHER_CLAIMED, {
      voucher_id: voucherId,
      voucher_value: voucherValue,
    });
  }, [trackEvent]);

  const trackVoucherRedeemed = useCallback((voucherId: string, voucherValue: number) => {
    trackEvent(ANALYTICS_EVENTS.VOUCHER_REDEEMED, {
      voucher_id: voucherId,
      voucher_value: voucherValue,
    });
  }, [trackEvent]);

  // ============ UGC EVENTS ============

  const trackUGCViewed = useCallback((event: UGCEvent & { duration?: number }) => {
    trackEvent(ANALYTICS_EVENTS.UGC_VIEWED, {
      content_id: event.contentId,
      content_type: event.contentType,
      author_id: event.authorId,
      product_ids: event.productIds,
      duration: event.duration,
    });
  }, [trackEvent]);

  const trackUGCLiked = useCallback((event: UGCEvent) => {
    trackEvent(ANALYTICS_EVENTS.UGC_LIKED, {
      content_id: event.contentId,
      content_type: event.contentType,
      author_id: event.authorId,
    });
  }, [trackEvent]);

  const trackUGCCommented = useCallback((event: UGCEvent & { commentLength: number }) => {
    trackEvent(ANALYTICS_EVENTS.UGC_COMMENTED, {
      content_id: event.contentId,
      content_type: event.contentType,
      comment_length: event.commentLength,
    });
  }, [trackEvent]);

  const trackUGCUploadStarted = useCallback((contentType: 'image' | 'video') => {
    trackEvent(ANALYTICS_EVENTS.UGC_UPLOAD_STARTED, {
      content_type: contentType,
    });
  }, [trackEvent]);

  const trackUGCUploadCompleted = useCallback((
    contentId: string,
    contentType: 'image' | 'video',
    fileSize: number,
    uploadDuration: number
  ) => {
    trackEvent(ANALYTICS_EVENTS.UGC_UPLOAD_COMPLETED, {
      content_id: contentId,
      content_type: contentType,
      file_size: fileSize,
      upload_duration: uploadDuration,
    });
  }, [trackEvent]);

  const trackUGCUploadFailed = useCallback((
    contentType: 'image' | 'video',
    error: string
  ) => {
    trackEvent(ANALYTICS_EVENTS.UGC_UPLOAD_FAILED, {
      content_type: contentType,
      error,
    });
  }, [trackEvent]);

  // ============ BOOKING EVENTS ============

  const trackBookingStarted = useCallback((serviceId: string, serviceName: string) => {
    trackEvent(ANALYTICS_EVENTS.BOOKING_STARTED, {
      service_id: serviceId,
      service_name: serviceName,
    });
  }, [trackEvent]);

  const trackBookingCompleted = useCallback((event: BookingEvent) => {
    trackEvent(ANALYTICS_EVENTS.BOOKING_COMPLETED, {
      booking_id: event.bookingId,
      service_id: event.serviceId,
      service_name: event.serviceName,
      date: event.date,
      time: event.time,
      total_amount: event.totalAmount,
    });
  }, [trackEvent]);

  const trackBookingCancelled = useCallback((bookingId: string, reason?: string) => {
    trackEvent(ANALYTICS_EVENTS.BOOKING_CANCELLED, {
      booking_id: bookingId,
      reason,
    });
  }, [trackEvent]);

  // ============ PAYBILL EVENTS ============

  const trackPayBillInitiated = useCallback((event: PayBillEvent) => {
    trackEvent(ANALYTICS_EVENTS.PAYBILL_INITIATED, {
      bill_id: event.billId,
      merchant_id: event.merchantId,
      merchant_name: event.merchantName,
      amount: event.amount,
    });
  }, [trackEvent]);

  const trackPayBillCompleted = useCallback((event: PayBillEvent) => {
    trackEvent(ANALYTICS_EVENTS.PAYBILL_COMPLETED, {
      bill_id: event.billId,
      merchant_id: event.merchantId,
      merchant_name: event.merchantName,
      amount: event.amount,
      payment_method: event.paymentMethod,
    });
  }, [trackEvent]);

  const trackPayBillFailed = useCallback((event: PayBillEvent & { error: string }) => {
    trackEvent(ANALYTICS_EVENTS.PAYBILL_FAILED, {
      bill_id: event.billId,
      merchant_id: event.merchantId,
      amount: event.amount,
      error: event.error,
    });
  }, [trackEvent]);

  // ============ GENERAL TRACKING ============

  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    analytics.trackError(error, context);
  }, []);

  const setUserId = useCallback((userId: string) => {
    analytics.setUserId(userId);
  }, []);

  const setUserProperties = useCallback((properties: Record<string, any>) => {
    analytics.setUserProperties(properties);
  }, []);

  // Track screen exit on unmount
  useEffect(() => {
    return () => {
      if (currentScreen.current) {
        const timeSpent = Date.now() - screenStartTime.current;
        trackEvent('screen_exited', {
          screen_name: currentScreen.current,
          time_spent: timeSpent,
        });
      }
    };
  }, [trackEvent]);

  return {
    // Generic
    trackEvent,
    trackScreen,
    trackError,
    setUserId,
    setUserProperties,

    // Store
    trackStoreViewed,
    trackStoreFollowed,
    trackStoreUnfollowed,
    trackStoreShared,
    trackStoreContactClicked,

    // Product
    trackProductViewed,
    trackProductQuickViewed,
    trackProductSearched,
    trackProductFiltered,
    trackProductSorted,
    trackProductListViewed,
    trackProductWishlistAdded,
    trackProductWishlistRemoved,
    trackProductVariantSelected,
    trackProductShared,

    // Cart & Checkout
    trackAddToCart,
    trackRemoveFromCart,
    trackCartViewed,
    trackCartUpdated,
    trackCartCleared,
    trackCheckoutStarted,
    trackCheckoutCompleted,
    trackCheckoutAbandoned,

    // Deals & Offers
    trackDealViewed,
    trackVoucherCopied,
    trackVoucherClaimed,
    trackVoucherRedeemed,

    // UGC
    trackUGCViewed,
    trackUGCLiked,
    trackUGCCommented,
    trackUGCUploadStarted,
    trackUGCUploadCompleted,
    trackUGCUploadFailed,

    // Bookings
    trackBookingStarted,
    trackBookingCompleted,
    trackBookingCancelled,

    // PayBill
    trackPayBillInitiated,
    trackPayBillCompleted,
    trackPayBillFailed,
  };
};

export default useComprehensiveAnalytics;
