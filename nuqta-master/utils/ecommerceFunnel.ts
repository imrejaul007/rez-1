/**
 * E-commerce Funnel Tracking
 *
 * Tracks complete purchase funnel from discovery to purchase
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from '@/services/analytics/AnalyticsService';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';
import { EcommerceFunnel, FunnelStage } from '@/services/analytics/types';

const FUNNEL_KEY = '@analytics:ecommerce_funnel';
const SESSION_FUNNEL_KEY = '@analytics:session_funnel';

export class EcommerceFunnelTracker {
  private static instance: EcommerceFunnelTracker;
  private sessionFunnel: Map<string, number> = new Map();

  private constructor() {
    this.loadSessionFunnel();
  }

  static getInstance(): EcommerceFunnelTracker {
    if (!EcommerceFunnelTracker.instance) {
      EcommerceFunnelTracker.instance = new EcommerceFunnelTracker();
    }
    return EcommerceFunnelTracker.instance;
  }

  /**
   * Stage 1: Product Discovery (browse, search, category view)
   */
  async trackProductDiscovery(method: 'browse' | 'search' | 'category', details?: any): Promise<void> {
    await this.incrementStage('productDiscovery');

    analytics.trackEvent(ANALYTICS_EVENTS.PRODUCT_LIST_VIEWED, {
      discovery_method: method,
      funnel_stage: 1,
      ...details,
    });
  }

  /**
   * Stage 2: Product View (detail page opened)
   */
  async trackProductView(productId: string, productName: string, price: number): Promise<void> {
    await this.incrementStage('productView');

    analytics.trackEvent(ANALYTICS_EVENTS.PRODUCT_VIEWED, {
      product_id: productId,
      product_name: productName,
      price,
      funnel_stage: 2,
    });
  }

  /**
   * Stage 3: Add to Cart
   */
  async trackAddToCart(productId: string, productName: string, price: number, quantity: number): Promise<void> {
    await this.incrementStage('addToCart');

    analytics.trackEvent(ANALYTICS_EVENTS.ADD_TO_CART, {
      product_id: productId,
      product_name: productName,
      price,
      quantity,
      total_value: price * quantity,
      funnel_stage: 3,
    });
  }

  /**
   * Stage 4: View Cart
   */
  async trackViewCart(itemCount: number, totalValue: number): Promise<void> {
    await this.incrementStage('viewCart');

    analytics.trackEvent(ANALYTICS_EVENTS.CART_VIEWED, {
      item_count: itemCount,
      total_value: totalValue,
      funnel_stage: 4,
    });
  }

  /**
   * Stage 5: Checkout Started
   */
  async trackCheckoutStarted(itemCount: number, totalValue: number): Promise<void> {
    await this.incrementStage('checkoutStarted');

    analytics.trackEvent(ANALYTICS_EVENTS.CHECKOUT_STARTED, {
      item_count: itemCount,
      total_value: totalValue,
      funnel_stage: 5,
    });
  }

  /**
   * Stage 6: Payment Info Entered
   */
  async trackPaymentInfo(paymentMethod: string): Promise<void> {
    await this.incrementStage('paymentInfo');

    analytics.trackEvent(ANALYTICS_EVENTS.CHECKOUT_PAYMENT_INFO_ENTERED, {
      payment_method: paymentMethod,
      funnel_stage: 6,
    });
  }

  /**
   * Stage 7: Purchase Completed
   */
  async trackPurchaseCompleted(transactionId: string, revenue: number, itemCount: number): Promise<void> {
    await this.incrementStage('purchaseCompleted');

    analytics.trackEvent(ANALYTICS_EVENTS.CHECKOUT_COMPLETED, {
      transaction_id: transactionId,
      revenue,
      item_count: itemCount,
      funnel_stage: 7,
    });

    // Calculate and save conversion metrics
    await this.calculateConversionRate();
  }

  /**
   * Track abandonment at specific stage
   */
  async trackAbandonment(
    stage: 'discovery' | 'view' | 'cart' | 'checkout' | 'payment',
    reason?: string
  ): Promise<void> {
    analytics.trackEvent(ANALYTICS_EVENTS.CHECKOUT_ABANDONED, {
      stage,
      reason,
      timestamp: Date.now(),
    });
  }

  /**
   * Get current funnel state
   */
  async getFunnelState(): Promise<EcommerceFunnel> {
    try {
      const stored = await AsyncStorage.getItem(FUNNEL_KEY);
      if (!stored) {
        return this.getEmptyFunnel();
      }

      const data = JSON.parse(stored);
      return {
        ...data,
        conversionRate: this.calculateRate(data.purchaseCompleted, data.productDiscovery),
        dropOffRates: this.calculateDropOffRates(data),
      };
    } catch (error) {
      return this.getEmptyFunnel();
    }
  }

  /**
   * Reset funnel tracking
   */
  async resetFunnel(): Promise<void> {
    await AsyncStorage.removeItem(FUNNEL_KEY);
    await AsyncStorage.removeItem(SESSION_FUNNEL_KEY);
    this.sessionFunnel.clear();
  }

  /**
   * Get session funnel (current user session only)
   */
  getSessionFunnel(): Record<string, number> {
    return Object.fromEntries(this.sessionFunnel);
  }

  /**
   * Increment a specific funnel stage
   */
  private async incrementStage(stage: string): Promise<void> {
    try {
      // Update session funnel
      const current = this.sessionFunnel.get(stage) || 0;
      this.sessionFunnel.set(stage, current + 1);
      this.saveSessionFunnel();

      // Update persistent funnel
      const funnel = await this.loadFunnel();
      funnel[stage] = (funnel[stage] || 0) + 1;
      this.saveFunnel(funnel);
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Load funnel from storage
   */
  private async loadFunnel(): Promise<any> {
    try {
      const stored = await AsyncStorage.getItem(FUNNEL_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  private saveFunnelTimer: ReturnType<typeof setTimeout> | null = null;
  private saveSessionTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingFunnel: any = null;

  /**
   * Save funnel to storage (debounced to avoid excessive AsyncStorage writes)
   */
  private saveFunnel(funnel: any): void {
    this.pendingFunnel = funnel;
    if (this.saveFunnelTimer) clearTimeout(this.saveFunnelTimer);
    this.saveFunnelTimer = setTimeout(async () => {
      try {
        if (this.pendingFunnel) {
          await AsyncStorage.setItem(FUNNEL_KEY, JSON.stringify(this.pendingFunnel));
        }
      } catch (_error) {
        // silently handle
      }
    }, 3000);
  }

  /**
   * Load session funnel
   */
  private async loadSessionFunnel(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SESSION_FUNNEL_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.sessionFunnel = new Map(Object.entries(data));
      }
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Save session funnel (debounced)
   */
  private saveSessionFunnel(): void {
    if (this.saveSessionTimer) clearTimeout(this.saveSessionTimer);
    this.saveSessionTimer = setTimeout(async () => {
      try {
        const data = Object.fromEntries(this.sessionFunnel);
        await AsyncStorage.setItem(SESSION_FUNNEL_KEY, JSON.stringify(data));
      } catch (_error) {
        // silently handle
      }
    }, 3000);
  }

  /**
   * Calculate conversion rate
   */
  private async calculateConversionRate(): Promise<void> {
    const funnel = await this.getFunnelState();

    analytics.trackEvent('funnel_conversion_calculated', {
      conversion_rate: funnel.conversionRate,
      total_discoveries: funnel.productDiscovery,
      total_purchases: funnel.purchaseCompleted,
      drop_off_rates: funnel.dropOffRates,
    });
  }

  /**
   * Calculate drop-off rates between stages
   */
  private calculateDropOffRates(data: any): EcommerceFunnel['dropOffRates'] {
    return {
      discovery_to_view: this.calculateRate(data.productDiscovery - data.productView, data.productDiscovery),
      view_to_cart: this.calculateRate(data.productView - data.addToCart, data.productView),
      cart_to_checkout: this.calculateRate(data.addToCart - data.checkoutStarted, data.addToCart),
      checkout_to_payment: this.calculateRate(data.checkoutStarted - data.paymentInfo, data.checkoutStarted),
      payment_to_purchase: this.calculateRate(data.paymentInfo - data.purchaseCompleted, data.paymentInfo),
    };
  }

  /**
   * Calculate percentage rate
   */
  private calculateRate(numerator: number, denominator: number): number {
    if (!denominator || denominator === 0) return 0;
    return Math.round((numerator / denominator) * 100 * 100) / 100; // Round to 2 decimals
  }

  /**
   * Get empty funnel structure
   */
  private getEmptyFunnel(): EcommerceFunnel {
    return {
      productDiscovery: 0,
      productView: 0,
      addToCart: 0,
      viewCart: 0,
      checkoutStarted: 0,
      paymentInfo: 0,
      purchaseCompleted: 0,
      conversionRate: 0,
      dropOffRates: {
        discovery_to_view: 0,
        view_to_cart: 0,
        cart_to_checkout: 0,
        checkout_to_payment: 0,
        payment_to_purchase: 0,
      },
    };
  }
}

// Export singleton
export const ecommerceFunnel = EcommerceFunnelTracker.getInstance();
export default ecommerceFunnel;
