/**
 * Sentry Initialization for React Native / Expo
 *
 * Call `initSentry()` once at module level in _layout.tsx (before any rendering).
 * Wrap the root component with `Sentry.wrap()`.
 *
 * Requires EXPO_PUBLIC_SENTRY_DSN in .env to activate.
 */
import * as Sentry from '@sentry/react-native';
import { EXTERNAL_SERVICES, APP_CONFIG } from './env';

const PLACEHOLDER_DSNS = ['your-sentry-dsn', 'YOUR_SENTRY_DSN', 'YOUR_SENTRY_DSN_HERE', ''];

let initialized = false;

export function initSentry() {
  if (initialized) return;

  const dsn = EXTERNAL_SERVICES.analytics.sentry;
  if (!dsn || PLACEHOLDER_DSNS.includes(dsn)) {
    return;
  }

  Sentry.init({
    dsn,
    environment: APP_CONFIG.environment,
    release: `nuqta@${APP_CONFIG.version}`,
    enabled: !__DEV__,

    // Performance — 20% of transactions in production, none in dev
    tracesSampleRate: __DEV__ ? 0 : 0.2,

    // Session tracking
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,

    // Error enrichment
    attachStacktrace: true,
    maxBreadcrumbs: 50,

    // Strip sensitive data before sending
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
      return event;
    },

    // Drop noisy console breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console') {
        return null;
      }
      return breadcrumb;
    },
  });

  initialized = true;
}

export function isSentryInitialized() {
  return initialized;
}

export { Sentry };
