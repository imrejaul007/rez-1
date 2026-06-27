/**
 * Monitoring Configuration
 *
 * Centralized configuration for:
 * - Error tracking (Sentry)
 * - Performance monitoring
 * - Analytics (Google Analytics, Mixpanel)
 * - Crash reporting
 * - User behavior tracking
 *
 * NOTE: Sentry is optional. Install with: npm install @sentry/react-native
 * Until installed, monitoring functions will log to console only.
 */

import { Platform } from 'react-native';
import { Sentry, isSentryInitialized } from './sentry';

/**
 * Sentry Configuration
 */
/**
 * SentryConfig is kept for backward compatibility.
 * Actual Sentry initialization is in config/sentry.ts (called from _layout.tsx).
 */
export const SentryConfig = {
  enabled: !__DEV__ && isSentryInitialized(),
};

/**
 * Initialize Sentry — delegates to config/sentry.ts (already called from _layout.tsx).
 * Kept for backward compatibility.
 */
export const initializeSentry = () => {
  // No-op: Sentry is initialized in config/sentry.ts
};

/**
 * Google Analytics Configuration
 */
export const GoogleAnalyticsConfig = {
  trackingId: process.env.GA_TRACKING_ID || 'UA-XXXXX-Y',
  enabled: !__DEV__,

  // Custom Dimensions
  customDimensions: {
    userId: 1,
    platform: 2,
    appVersion: 3,
  },

  // Events to track
  events: {
    // Ecommerce
    productView: 'product_view',
    addToCart: 'add_to_cart',
    removeFromCart: 'remove_from_cart',
    beginCheckout: 'begin_checkout',
    purchase: 'purchase',

    // Engagement
    search: 'search',
    shareProduct: 'share_product',
    writeReview: 'write_review',
    likeReview: 'like_review',

    // Notifications
    subscribeStockNotification: 'subscribe_stock_notification',
    createPriceAlert: 'create_price_alert',

    // User
    signUp: 'sign_up',
    signIn: 'sign_in',
    signOut: 'sign_out',
  },
};

/**
 * Mixpanel Configuration
 */
export const MixpanelConfig = {
  token: process.env.MIXPANEL_TOKEN || 'YOUR_MIXPANEL_TOKEN',
  enabled: !__DEV__,

  // Track everything by default
  trackAutomaticEvents: true,

  // Super Properties (sent with every event)
  superProperties: {
    platform: Platform.OS,
    app_version: '1.0.0',
    environment: process.env.NODE_ENV,
  },
};

/**
 * Performance Monitoring Configuration
 */
export const PerformanceConfig = {
  enabled: !__DEV__,

  // Thresholds (in milliseconds)
  thresholds: {
    pageLoad: 3000, // 3 seconds
    apiCall: 1000, // 1 second
    render: 16, // 16ms (60fps)
    interaction: 100, // 100ms
  },

  // Sampling
  sampleRate: __DEV__ ? 0 : 0.1, // 10% in production

  // Metrics to track
  metrics: {
    // Core Web Vitals
    firstContentfulPaint: true,
    largestContentfulPaint: true,
    firstInputDelay: true,
    cumulativeLayoutShift: true,

    // Custom Metrics
    timeToInteractive: true,
    appLoadTime: true,
    screenLoadTime: true,
    apiResponseTime: true,
  },
};

/**
 * Crash Reporting Configuration
 */
export const CrashReportingConfig = {
  enabled: !__DEV__,

  // Auto-send crash reports
  autoSend: true,

  // User consent required
  requireConsent: true,

  // Include user data
  includeUserData: true,

  // Maximum reports to store offline
  maxOfflineReports: 10,
};

/**
 * Analytics Configuration
 */
export const AnalyticsConfig = {
  enabled: !__DEV__,

  // User tracking
  trackUsers: true,
  anonymizeIp: true,

  // Session tracking
  sessionTimeout: 30 * 60 * 1000, // 30 minutes

  // Event batching
  batchEvents: true,
  batchSize: 10,
  batchInterval: 5000, // 5 seconds

  // Offline support
  offlineTracking: true,
  maxOfflineEvents: 100,
};

/**
 * Monitoring Service URLs
 */
export const MonitoringURLs = {
  sentry: 'https://sentry.io',
  googleAnalytics: 'https://analytics.google.com',
  mixpanel: 'https://mixpanel.com',
  newRelic: 'https://newrelic.com',
  datadog: 'https://datadoghq.com',
};

/**
 * Initialize all monitoring services
 */
export const initializeMonitoring = () => {
  // Initialize Sentry
  initializeSentry();

  // Initialize Google Analytics
  if (GoogleAnalyticsConfig.enabled) {
    // TODO: Initialize GA
  }

  // Initialize Mixpanel
  if (MixpanelConfig.enabled) {
    // TODO: Initialize Mixpanel
  }

  // Initialize Performance Monitoring
  if (PerformanceConfig.enabled) {
  }
};

/**
 * Monitoring Helper Functions
 */
export const MonitoringHelpers = {
  /**
   * Track page view
   */
  trackPageView: (screenName: string, params?: Record<string, any>) => {
    if (!AnalyticsConfig.enabled) return;

    // Google Analytics
    // ga('send', 'pageview', screenName);

    // Mixpanel
    // mixpanel.track('Page View', { screen: screenName, ...params });
  },

  /**
   * Track event
   */
  trackEvent: (
    event: string,
    properties?: Record<string, any>
  ) => {
    if (!AnalyticsConfig.enabled) return;

    // Google Analytics
    // ga('send', 'event', event, properties);

    // Mixpanel
    // mixpanel.track(event, properties);
  },

  /**
   * Track error
   */
  trackError: (
    error: Error,
    context?: Record<string, any>
  ) => {
    if (!CrashReportingConfig.enabled) return;

    // Sentry
    if (Sentry) {
      Sentry.captureException(error, {
        contexts: context,
      });
    }

  },

  /**
   * Track performance
   */
  trackPerformance: (
    metric: string,
    value: number,
    context?: Record<string, any>
  ) => {
    if (!PerformanceConfig.enabled) return;

    // Check threshold
    const threshold = PerformanceConfig.thresholds[
      metric as keyof typeof PerformanceConfig.thresholds
    ];

    if (threshold && value > threshold) {

      // Track slow performance
      if (Sentry) {
        Sentry.captureMessage(`Slow ${metric}: ${value}ms`, {
          level: 'warning',
          contexts: { performance: { metric, value, threshold, ...context } },
        });
      }
    }
  },

  /**
   * Set user context
   */
  setUser: (userId: string, traits?: Record<string, any>) => {
    if (!AnalyticsConfig.trackUsers) return;

    // Sentry
    if (Sentry) {
      Sentry.setUser({ id: userId, ...traits });
    }

    // Google Analytics
    // ga('set', 'userId', userId);

    // Mixpanel
    // mixpanel.identify(userId);
    // mixpanel.people.set(traits);
  },

  /**
   * Clear user context
   */
  clearUser: () => {
    // Sentry
    if (Sentry) {
      Sentry.setUser(null);
    }

    // Google Analytics
    // ga('set', 'userId', null);

    // Mixpanel
    // mixpanel.reset();
  },

  /**
   * Add breadcrumb
   */
  addBreadcrumb: (
    message: string,
    category?: string,
    level?: string,
    data?: Record<string, any>
  ) => {
    if (Sentry) {
      Sentry.addBreadcrumb({
        message,
        category: category || 'default',
        level: level || 'info',
        data,
      });
    }
  },

  /**
   * Start transaction
   */
  startTransaction: (name: string, op: string) => {
    if (!PerformanceConfig.enabled || !Sentry) return null;

    return Sentry.startTransaction({
      name,
      op,
    });
  },

  /**
   * Finish transaction
   */
  finishTransaction: (transaction: any) => {
    if (transaction) {
      transaction.finish();
    }
  },
};

/**
 * Export all configs
 */
export default {
  SentryConfig,
  GoogleAnalyticsConfig,
  MixpanelConfig,
  PerformanceConfig,
  CrashReportingConfig,
  AnalyticsConfig,
  MonitoringURLs,
  initializeMonitoring,
  MonitoringHelpers,
};
