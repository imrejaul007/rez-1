// @ts-nocheck
/**
 * Firebase Analytics Provider
 *
 * Integrates with Firebase Analytics for event tracking.
 *
 * NOTE: @react-native-firebase/analytics does NOT support web.
 * On web, initialize() will disable this provider gracefully —
 * the custom backend provider still handles web analytics.
 */

import { Platform } from 'react-native';
import { BaseAnalyticsProvider } from './BaseProvider';
import { PurchaseTransaction } from '../types';

interface FirebaseProviderConfig {
  debug?: boolean;
}

export class FirebaseAnalyticsProvider extends BaseAnalyticsProvider {
  name = 'Firebase';
  private firebaseAnalytics: any = null;
  private userId?: string;

  async initialize(config: FirebaseProviderConfig): Promise<void> {
    this.log('Initializing Firebase Analytics');

    try {
      // Firebase Analytics is not supported on web
      if (Platform.OS === 'web') {
        this.warn('Firebase Analytics is not supported on web — disabling provider');
        this.setEnabled(false);
        return;
      }

      const { default: analytics } = await import('@react-native-firebase/analytics');
      this.firebaseAnalytics = analytics();

      this.setDebug(config.debug || false);
      this.log('Firebase Analytics initialized successfully');
    } catch (error) {
      this.error('Failed to initialize Firebase Analytics:', error);
      this.setEnabled(false);
    }
  }

  trackEvent(name: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.firebaseAnalytics) return;

    try {
      const sanitizedName = this.sanitizeEventName(name);
      const sanitizedProps = this.sanitizeProperties(properties);

      this.log('Tracking event:', sanitizedName, sanitizedProps);

      this.firebaseAnalytics.logEvent(sanitizedName, sanitizedProps);
    } catch (error) {
      this.error('Failed to track event:', error);
    }
  }

  trackScreen(name: string, properties?: Record<string, any>): void {
    if (!this.enabled || !this.firebaseAnalytics) return;

    try {
      this.log('Tracking screen:', name);

      this.firebaseAnalytics.logScreenView({
        screen_name: name,
        screen_class: name,
      });

      // Also track as event with extra properties
      if (properties && Object.keys(properties).length > 0) {
        this.trackEvent('screen_view', {
          screen_name: name,
          ...properties,
        });
      }
    } catch (error) {
      this.error('Failed to track screen:', error);
    }
  }

  setUserId(userId: string): void {
    this.userId = userId;

    if (!this.enabled || !this.firebaseAnalytics) return;

    try {
      this.log('Setting user ID:', userId);
      this.firebaseAnalytics.setUserId(userId);
    } catch (error) {
      this.error('Failed to set user ID:', error);
    }
  }

  setUserProperties(properties: Record<string, any>): void {
    if (!this.enabled || !this.firebaseAnalytics) return;

    try {
      this.log('Setting user properties:', properties);

      // Firebase only allows string values for user properties
      const sanitizedProps: Record<string, string> = {};
      Object.entries(properties).forEach(([key, value]) => {
        sanitizedProps[key] = String(value);
      });

      Object.entries(sanitizedProps).forEach(([key, value]) => {
        this.firebaseAnalytics.setUserProperty(key, value);
      });
    } catch (error) {
      this.error('Failed to set user properties:', error);
    }
  }

  trackPurchase(transaction: PurchaseTransaction): void {
    if (!this.enabled || !this.firebaseAnalytics) return;

    try {
      this.log('Tracking purchase:', transaction);

      this.firebaseAnalytics.logEvent('purchase', {
        transaction_id: transaction.transactionId,
        value: transaction.revenue,
        currency: transaction.currency,
        tax: transaction.tax,
        shipping: transaction.shipping,
        coupon: transaction.coupon,
        items: transaction.items.map(item => ({
          item_id: item.productId,
          item_name: item.name,
          item_category: item.category,
          price: item.price,
          quantity: item.quantity,
        })),
      });
    } catch (error) {
      this.error('Failed to track purchase:', error);
    }
  }

  private sanitizeEventName(name: string): string {
    // Firebase event names must be alphanumeric with underscores, max 40 chars
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .substring(0, 40);
  }

  private sanitizeProperties(properties?: Record<string, any>): Record<string, any> {
    if (!properties) return {};

    const sanitized: Record<string, any> = {};

    Object.entries(properties).forEach(([key, value]) => {
      const sanitizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 40);

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[sanitizedKey] = value;
      } else if (value !== null && value !== undefined) {
        sanitized[sanitizedKey] = JSON.stringify(value);
      }
    });

    return sanitized;
  }
}
