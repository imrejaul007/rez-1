/**
 * Comprehensive Analytics Service
 *
 * Centralized analytics tracking with multi-provider support
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../apiClient';
import { ANALYTICS_EVENTS } from './events';
import { CustomAnalyticsProvider } from './providers/CustomProvider';

interface ProviderConfig {
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
  providers: ProviderConfig[];
  batchSize: number;
  flushInterval: number;
  offlineQueueEnabled: boolean;
  privacyMode: boolean;
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  debug: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
  providers: [
    { name: 'custom', enabled: true, config: {} },
    { name: 'firebase', enabled: true, config: {} },
  ],
  batchSize: 50,
  flushInterval: 30000,
  offlineQueueEnabled: true,
  privacyMode: false,
};

export class AnalyticsService {
  private static instance: AnalyticsService;
  private providers: BaseAnalyticsProviderLite[] = [];
  private userProperties: Record<string, any> = {};
  private userId: string | null = null;
  private consentGranted = true;
  private readonly CONSENT_KEY = '@analytics:consent';
  private readonly SESSION_KEY = '@analytics:session';
  private initialized = false;
  private lastScreenName: string | null = null;
  private lastScreenTime = 0;
  private config: AnalyticsConfig;
  private sessionId: string;
  private sessionStartTime: number;

  private constructor() {
    this.config = DEFAULT_CONFIG;
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Initialize analytics with configuration
   */
  async initialize(config?: Partial<AnalyticsConfig>) {
    if (this.initialized) return;
    this.initialized = true;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Load consent
    await this.loadConsent();
    if (!this.consentGranted) {
      this.config.enabled = false;
      return;
    }

    // Initialize providers
    await this.initializeProviders();

    // Track session start
    this.trackEvent(ANALYTICS_EVENTS.SESSION_STARTED, {
      platform: Platform.OS,
      platform_version: String(Platform.Version),
      session_id: this.sessionId,
    });
  }

  /**
   * Initialize configured providers
   */
  private async initializeProviders() {
    this.providers = [];
    for (const providerConfig of this.config.providers) {
      if (!providerConfig.enabled) continue;
      let provider: BaseAnalyticsProviderLite | null = null;
      switch (providerConfig.name) {
        case 'custom':
          provider = new CustomAnalyticsProvider();
          await provider.initialize({
            apiUrl: apiClient.getBaseURL(),
            ...providerConfig.config,
          });
          break;

        // Add more providers here (firebase, mixpanel, etc.)
        case 'google_analytics':
        case 'mixpanel':
        case 'amplitude':
          break;
        default:
          break;
      }
      if (provider) {
        this.providers.push(provider);
      }
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, properties?: Record<string, any>) {
    if (!this.config.enabled || !this.consentGranted) return;
    const enrichedProperties = {
      timestamp: Date.now(),
      session_id: this.sessionId,
      user_id: this.userId,
      platform: Platform.OS,
      ...(properties || {}),
    };
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[Analytics] ${eventName}`, enrichedProperties);
    }
    this.providers.forEach((provider) => {
      try {
        provider.trackEvent(eventName, enrichedProperties);
      } catch (_error) {
        // silently handle
      }
    });
  }

  /**
   * Track screen view
   */
  trackScreen(screenName: string, properties?: Record<string, any>) {
    if (!this.config.enabled || !this.consentGranted) return;

    // Deduplicate: skip if same screen within 10 seconds
    const now = Date.now();
    if (screenName === this.lastScreenName && now - this.lastScreenTime < 10000) {
      return;
    }
    this.lastScreenName = screenName;
    this.lastScreenTime = now;
    const enrichedProperties = {
      screen_name: screenName,
      timestamp: Date.now(),
      ...(properties || {}),
    };
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log(`[Analytics] screen_viewed ${screenName}`, enrichedProperties);
    }
    this.providers.forEach((provider) => {
      try {
        provider.trackScreen(screenName, enrichedProperties);
      } catch (_error) {
        // silently handle
      }
    });
  }

  /**
   * Set user ID
   */
  setUserId(userId: string) {
    this.userId = userId;
    if (!this.config.enabled || !this.consentGranted) return;
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log('[Analytics] setUserId', userId);
    }
    this.providers.forEach((provider) => {
      try {
        provider.setUserId(userId);
      } catch (_error) {
        // silently handle
      }
    });
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>) {
    this.userProperties = { ...this.userProperties, ...properties };
    if (!this.config.enabled || !this.consentGranted) return;
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log('[Analytics] setUserProperties', properties);
    }
    this.providers.forEach((provider) => {
      try {
        provider.setUserProperties(properties);
      } catch (_error) {
        // silently handle
      }
    });
  }

  /**
   * Track purchase transaction
   */
  trackPurchase(transaction: {
    transactionId: string;
    revenue: number;
    currency: string;
    items: any[];
    tax?: number;
    shipping?: number;
    coupon?: string;
    discount?: number;
    paymentMethod?: string;
  }) {
    if (!this.config.enabled || !this.consentGranted) return;
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log('[Analytics] trackPurchase', transaction);
    }
    this.providers.forEach((provider) => {
      try {
        provider.trackPurchase(transaction);
      } catch (_error) {
        // silently handle
      }
    });

    // Also track as event
    this.trackEvent(ANALYTICS_EVENTS.CHECKOUT_COMPLETED, {
      transaction_id: transaction.transactionId,
      revenue: transaction.revenue,
      currency: transaction.currency,
      item_count: transaction.items.length,
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, any>) {
    if (!this.config.enabled) return; // Track errors even without consent

    const errorData = {
      error_message: error.message,
      error_name: error.name,
      error_stack: error.stack,
      ...(context || {}),
    };
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log('[Analytics] trackError', errorData);
    }
    this.providers.forEach((provider) => {
      try {
        provider.trackError(error, context);
      } catch (_err) {
        // silently handle
      }
    });
  }

  /**
   * Flush all pending events
   */
  async flush() {
    if (!this.config.enabled) return;
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.log('[Analytics] flush');
    }
    await Promise.all(
      this.providers.map(async (provider) => {
        try {
          await provider.flush();
        } catch (_error) {
          // silently handle
        }
      })
    );
  }

  /**
   * Set analytics consent
   */
  async setConsent(granted: boolean) {
    this.consentGranted = granted;
    await AsyncStorage.setItem(
      this.CONSENT_KEY,
      JSON.stringify({ granted, timestamp: Date.now() })
    );
    if (!granted) {
      // Disable analytics and clear data
      this.config.enabled = false;
      await this.clearAllData();
    } else {
      this.config.enabled = true;
    }
  }

  /**
   * Get current consent status
   */
  async getConsent() {
    return this.consentGranted;
  }

  /**
   * Load consent from storage
   */
  private async loadConsent() {
    try {
      const stored = await AsyncStorage.getItem(this.CONSENT_KEY);
      if (stored) {
        const { granted } = JSON.parse(stored);
        this.consentGranted = granted;
      }
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Clear all analytics data
   */
  private async clearAllData() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const analyticsKeys = keys.filter((key) => key.startsWith('@analytics:'));
      await AsyncStorage.multiRemove(analyticsKeys);
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Track session end
   */
  async trackSessionEnd() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    this.trackEvent(ANALYTICS_EVENTS.SESSION_ENDED, {
      session_id: this.sessionId,
      duration: sessionDuration,
    });
    await this.flush();
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.sessionStartTime,
      duration: Date.now() - this.sessionStartTime,
      consentGranted: this.consentGranted,
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  /**
   * Check if analytics is enabled
   */
  isEnabled() {
    return this.config.enabled && this.consentGranted;
  }
}

// Minimal interface to avoid a circular import of BaseProvider types
interface BaseAnalyticsProviderLite {
  initialize(config?: Record<string, any>): Promise<void>;
  trackEvent(name: string, properties?: Record<string, any>): void;
  trackScreen(name: string, properties?: Record<string, any>): void;
  setUserId(userId: string): void;
  setUserProperties(properties: Record<string, any>): void;
  trackPurchase(transaction: any): void;
  trackError(error: Error, context?: Record<string, any>): void;
  flush(): Promise<void>;
}

// Export singleton instance
export const analytics = AnalyticsService.getInstance();
export default analytics;
