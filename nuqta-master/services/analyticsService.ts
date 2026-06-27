/**
 * Analytics Service
 *
 * Comprehensive analytics and event tracking system
 * Features:
 * - User behavior tracking
 * - Product interaction events
 * - Purchase funnel tracking
 * - Session management
 * - Error tracking
 * - Performance metrics
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

export interface ProductViewEvent {
  productId: string;
  productName: string;
  productPrice: number;
  category: string;
  brand: string;
  variantId?: string;
  referrer?: string;
  timeSpent?: number;
}

export interface AddToCartEvent {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  variantId?: string;
  variantDetails?: string;
  totalValue: number;
}

export interface PurchaseEvent {
  orderId: string;
  products: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  currency: string;
}

export interface ShareEvent {
  productId: string;
  platform: string;
  referralCode?: string;
}

class AnalyticsService {
  private static readonly MAX_QUEUE_SIZE = 1000;
  private sessionId: string;
  private userId: string | null = null;
  private sessionStartTime: Date;
  private eventQueue: AnalyticsEvent[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = new Date();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  track(eventName: string, properties?: Record<string, any>) {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: new Date(),
      userId: this.userId || undefined,
      sessionId: this.sessionId,
    };

    this.eventQueue.push(event);

    // Cap queue size to prevent unbounded growth
    if (this.eventQueue.length > AnalyticsService.MAX_QUEUE_SIZE) {
      this.eventQueue = this.eventQueue.slice(-AnalyticsService.MAX_QUEUE_SIZE);
    }
  }

  trackPageView(pageName: string, properties?: Record<string, any>) {
    this.track('page_view', { page: pageName, ...properties });
  }

  trackProductView(data: ProductViewEvent) {
    this.track('product_view', {
      product_id: data.productId,
      product_name: data.productName,
      product_price: data.productPrice,
      category: data.category,
      brand: data.brand,
      variant_id: data.variantId,
      referrer: data.referrer,
      time_spent: data.timeSpent,
    });
  }

  trackAddToCart(data: AddToCartEvent) {
    this.track('add_to_cart', {
      product_id: data.productId,
      product_name: data.productName,
      price: data.price,
      quantity: data.quantity,
      variant_id: data.variantId,
      variant_details: data.variantDetails,
      total_value: data.totalValue,
      currency: 'INR',
    });
  }

  trackRemoveFromCart(productId: string, productName: string, quantity: number) {
    this.track('remove_from_cart', { product_id: productId, product_name: productName, quantity });
  }

  trackPurchase(data: PurchaseEvent) {
    this.track('purchase', {
      order_id: data.orderId,
      products: data.products,
      total_amount: data.totalAmount,
      payment_method: data.paymentMethod,
      currency: data.currency,
    });
  }

  trackWishlist(action: 'add' | 'remove', productId: string, productName: string) {
    this.track(`wishlist_${action}`, { product_id: productId, product_name: productName });
  }

  trackShare(data: ShareEvent) {
    this.track('product_share', {
      product_id: data.productId,
      platform: data.platform,
      referral_code: data.referralCode,
    });
  }

  trackVariantSelection(productId: string, variantId: string, attributes: Record<string, string>) {
    this.track('variant_selected', { product_id: productId, variant_id: variantId, attributes });
  }

  trackSizeGuideView(productId: string, tab?: string) {
    this.track('size_guide_view', { product_id: productId, tab });
  }

  trackQAInteraction(action: 'view' | 'ask' | 'answer' | 'vote', productId: string, questionId?: string) {
    this.track('qa_interaction', { action, product_id: productId, question_id: questionId });
  }

  trackReviewInteraction(
    action: 'view' | 'write' | 'helpful' | 'filter' | 'sort',
    productId: string,
    reviewId?: string,
    rating?: number
  ) {
    this.track('review_interaction', { action, product_id: productId, review_id: reviewId, rating });
  }

  trackSearch(query: string, resultsCount: number, filters?: Record<string, any>) {
    this.track('search', { query, results_count: resultsCount, filters });
  }

  trackImageInteraction(action: 'view' | 'zoom' | 'swipe', productId: string, imageIndex: number) {
    this.track('image_interaction', { action, product_id: productId, image_index: imageIndex });
  }

  trackVideoInteraction(
    action: 'play' | 'pause' | 'complete' | 'skip',
    productId: string,
    videoId?: string,
    duration?: number
  ) {
    this.track('video_interaction', { action, product_id: productId, video_id: videoId, duration });
  }

  trackDeliveryCheck(productId: string, pinCode: string, isAvailable: boolean) {
    this.track('delivery_check', { product_id: productId, pin_code: pinCode, is_available: isAvailable });
  }

  // ── Fulfillment analytics ──

  trackFulfillmentTypeSelected(data: {
    fulfillmentType: string;
    storeId: string;
    cartValue: number;
    previousType?: string;
  }) {
    this.track('fulfillment_type_selected', data);
  }

  trackFulfillmentOrderPlaced(data: {
    fulfillmentType: string;
    storeId: string;
    orderId: string;
    cartValue: number;
    paymentMethod: string;
  }) {
    this.track('fulfillment_order_placed', data);
  }

  trackDineInScanStarted(data: { storeId?: string }) {
    this.track('dine_in_scan_started', data);
  }

  trackDineInScanCompleted(data: {
    storeId: string;
    storeName: string;
    tableNumber?: string;
    scanMethod: 'qr_dine_in' | 'qr_store' | 'params';
  }) {
    this.track('dine_in_scan_completed', data);
  }

  trackStockNotification(productId: string, variantId?: string, notificationMethod?: string) {
    this.track('stock_notification_request', {
      product_id: productId,
      variant_id: variantId,
      notification_method: notificationMethod,
    });
  }

  trackError(error: Error, context?: Record<string, any>) {
    this.track('error', { error_message: error.message, error_stack: error.stack, ...context });
  }

  trackPerformance(metric: string, value: number, unit: string = 'ms') {
    this.track('performance', { metric, value, unit });
  }

  trackSessionEnd() {
    const sessionDuration = Date.now() - this.sessionStartTime.getTime();
    this.track('session_end', { duration: sessionDuration, events_count: this.eventQueue.length });
  }

  getSessionStats() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.sessionStartTime,
      duration: Date.now() - this.sessionStartTime.getTime(),
      eventsCount: this.eventQueue.length,
    };
  }

  // ── Store discovery analytics ──

  trackCategoryClick(categoryId: string, categoryName: string, position: number) {
    this.track('category_click', {
      category_id: categoryId,
      category_name: categoryName,
      position,
    });
  }

  trackStoreImpression(storeId: string, storeName: string, position: number, source: string) {
    this.track('store_impression', {
      store_id: storeId,
      store_name: storeName,
      position,
      source,
    });
  }

  trackNuqtaPayFilter(enabled: boolean, resultCount: number) {
    this.track('nuqta_pay_filter', {
      enabled,
      result_count: resultCount,
    });
  }

  trackStoreListSearch(query: string, category: string, resultCount: number) {
    this.track('store_list_search', {
      query,
      category,
      result_count: resultCount,
    });
  }

  trackProductClick(productId: string, storeId: string, position: number, source: string) {
    this.track('product_click', {
      product_id: productId,
      store_id: storeId,
      position,
      source,
    });
  }

  trackConversionFunnel(step: string, metadata: Record<string, any>) {
    this.track('conversion_funnel', {
      step,
      ...metadata,
    });
  }

  async flush() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Dynamic import to avoid circular dependency
      const { default: apiClient } = await import('./apiClient');
      await apiClient.post('/analytics/batch', { events });
    } catch {
      // Re-queue events on failure, capped to MAX_QUEUE_SIZE
      this.eventQueue = [...events, ...this.eventQueue].slice(-AnalyticsService.MAX_QUEUE_SIZE);
    }
  }

  startAutoFlush(intervalMs: number = 30000) {
    if (this._autoFlushInterval) return;
    this._autoFlushInterval = setInterval(() => {
      this.flush();
    }, intervalMs);
  }

  stopAutoFlush() {
    if (this._autoFlushInterval) {
      clearInterval(this._autoFlushInterval);
      this._autoFlushInterval = null;
    }
  }

  private _autoFlushInterval: ReturnType<typeof setInterval> | null = null;
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const ANALYTICS_SERVICE_KEY = '__rezAnalyticsService__';

function getAnalyticsService(): AnalyticsService {
  // Use globalThis to persist across module re-evaluations in SSR
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[ANALYTICS_SERVICE_KEY]) {
      (globalThis as any)[ANALYTICS_SERVICE_KEY] = new AnalyticsService();
    }
    return (globalThis as any)[ANALYTICS_SERVICE_KEY];
  }
  // Fallback for environments without globalThis
  return new AnalyticsService();
}

const analyticsService = getAnalyticsService();
export default analyticsService;

// Identity Layer Analytics Events
export const IdentityAnalyticsEvents = {
  // Onboarding funnel
  IDENTITY_GATE_SEEN: 'identity_gate_seen',
  IDENTITY_SELECTED: 'identity_selected',
  IDENTITY_SKIP_CLICKED: 'identity_skip_clicked',
  VERIFICATION_STARTED: 'verification_started',
  VERIFICATION_COMPLETED: 'verification_completed',
  VERIFICATION_SKIPPED: 'verification_skipped',
  ZONE_UNLOCK_SEEN: 'zone_unlock_seen',
  FIRST_OFFER_CLICKED: 'first_offer_clicked',

  // Retention
  NOTIF_RECEIVED: 'notif_received',
  NOTIF_OPENED: 'notif_opened',
  DEAL_FROM_NOTIF_CLICKED: 'deal_from_notif_clicked',

  // Growth
  LEADERBOARD_OPENED: 'leaderboard_opened',
  LEADERBOARD_SHARED: 'leaderboard_shared',
  INSTITUTE_REFERRAL_STARTED: 'institute_referral_started',
  INSTITUTE_REFERRAL_SUBMITTED: 'institute_referral_submitted',
  FEATURE_LEVEL_UPGRADED: 'feature_level_upgraded',

  // Banner interactions
  VERIFY_PROMPT_DISMISSED: 'verification_prompt_dismissed',
  INSTITUTE_BANNER_DISMISSED: 'institute_banner_dismissed',
} as const;
