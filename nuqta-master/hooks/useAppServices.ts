/**
 * App-level service initialization, lifecycle management, and cache warming.
 * Extracts all side-effect logic from _layout.tsx into a single hook.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus, InteractionManager, Platform } from 'react-native';
import { router } from 'expo-router';
import apiClient from '@/services/apiClient';
import { API_CONFIG, APP_CONFIG, getApiUrl, EXTERNAL_SERVICES, FEATURE_FLAGS } from '@/config/env';
import { errorReporter } from '@/utils/errorReporter';
import ReferralHandler from '@/utils/referralHandler';

export function useAppServices(fontsLoaded: boolean) {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [cacheWarmed, setCacheWarmed] = useState(false);
  const netInfoUnsubscribeRef = useRef<(() => void) | null>(null);
  const deepLinkCleanupRef = useRef<(() => void) | null>(null);

  // Initialize app services on mount
  useEffect(() => {
    initializeApp();
    return () => {
      if (netInfoUnsubscribeRef.current) {
        netInfoUnsubscribeRef.current();
        netInfoUnsubscribeRef.current = null;
      }
      if (deepLinkCleanupRef.current) {
        deepLinkCleanupRef.current();
        deepLinkCleanupRef.current = null;
      }
    };
  }, []);

  // Monitor app state for cache warming + cleanup
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const previousState = appState.current;
      appState.current = nextAppState;

      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        import('@/services/cacheWarmingService').then(mod => {
          mod.default.onAppForeground();
        }).catch((err) => {
          console.error('[useAppServices] Error (foreground):', err);
        });
      }

      if (nextAppState === 'background') {
        import('@/services/cacheWarmingService').then(mod => {
          mod.default.onAppBackground();
        }).catch((err) => {
          console.error('[useAppServices] Error (background):', err);
        });
      }
    });

    return () => { subscription.remove(); };
  }, []);

  // In web dev, unregister any stale service workers to avoid update/reload loops.
  useEffect(() => {
    if (Platform.OS !== 'web' || !__DEV__) return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch((err) => {
        console.error('[useAppServices] Error (service worker):', err);
      });
  }, []);

  // Start cache warming after first interactive render (deferred by 3s)
  useEffect(() => {
    if (fontsLoaded && !cacheWarmed) {
      const interaction = InteractionManager.runAfterInteractions(() => {
        const timer = setTimeout(() => { startCacheWarming(); }, 3000);
        (interaction as any)._timer = timer;
      });

      return () => {
        interaction.cancel();
        if ((interaction as any)._timer) {
          clearTimeout((interaction as any)._timer);
        }
      };
    }
  }, [fontsLoaded, cacheWarmed]);

  const initializeApp = async () => {
    try {
      const apiUrl = API_CONFIG.baseUrl || getApiUrl() || apiClient.getBaseURL();
      apiClient.setBaseURL(apiUrl);
      apiClient.setCurrentAppVersion(APP_CONFIG.version);

      apiClient.setMaintenanceCallback(() => {
        try { router.replace('/system/maintenance' as any); } catch (_e) { /* navigation may fail if unmounted */ }
      });
      apiClient.setAppUpdateCallback((_minVersion) => {
        try { router.replace('/system/app-update' as any); } catch (_e) { /* navigation may fail if unmounted */ }
      });
      apiClient.setSlowRequestCallback(() => {
        // Lazy-import ToastManager to avoid circular deps at init time
        import('@/components/common/ToastManager').then(mod => {
          mod.showToast?.({ message: 'Taking longer than usual...', type: 'info', duration: 3000 });
        }).catch((err) => {
          console.error('[useAppServices] Error (toast):', err);
        });
      });

      errorReporter.setAppVersion(APP_CONFIG.version);
      errorReporter.setEnabled(Boolean(
        EXTERNAL_SERVICES.analytics.sentry ||
        FEATURE_FLAGS.enableCrashReporting ||
        APP_CONFIG.environment === 'production'
      ));

      try {
        deepLinkCleanupRef.current = ReferralHandler.initializeDeepLinking();
      } catch (_e) {
        // silently handle
      }

      // Cache warming is handled by the deferred startCacheWarming() (3s after
      // first interactive render). Calling startWarming() here too would either
      // duplicate the work or trigger an unnecessary early warm before the UI
      // is ready — so it's intentionally omitted.

      if (netInfoUnsubscribeRef.current) {
        netInfoUnsubscribeRef.current();
        netInfoUnsubscribeRef.current = null;
      }

      import('@react-native-community/netinfo').then(({ default: NetInfo }) => {
        netInfoUnsubscribeRef.current = NetInfo.addEventListener(state => {
          const isConnected = state.isConnected ?? false;
          errorReporter.addBreadcrumb({
            type: 'network',
            message: `Network ${isConnected ? 'connected' : 'disconnected'}`,
            data: { type: state.type, isInternetReachable: state.isInternetReachable },
          });
        });
      }).catch((err) => {
        console.error('[useAppServices] Error (NetInfo):', err);
      });
    } catch (error) {
      errorReporter.captureError(
        error instanceof Error ? error : new Error('App initialization failed'),
        { context: 'RootLayout.initializeApp' }
      );
    }
  };

  const startCacheWarming = async () => {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
      if (onboardingCompleted !== 'true') {
        setCacheWarmed(true);
        return;
      }

      const { default: cacheWarmingService } = await import('@/services/cacheWarmingService');
      cacheWarmingService.startWarming().then(() => {
        setCacheWarmed(true);
      }).catch((err) => {
        console.error('[useAppServices] Error (cache warming):', err);
        setCacheWarmed(true);
      });
    } catch (err) {
      console.error('[useAppServices] Error (cache warming):', err);
      setCacheWarmed(true);
    }
  };

  const handleQueueSyncError = useCallback((error: Error) => {
    errorReporter.captureError(error, {
      context: 'OfflineQueue.syncError',
      component: 'RootLayout',
    });
  }, []);

  const handleQueueSyncComplete = useCallback((result: any) => {
    import('@/services/billUploadAnalytics').then(({ billUploadAnalytics }) => {
      billUploadAnalytics.trackSyncCompleted(result.processed || 0);
    }).catch((err) => {
      console.error('[useAppServices] Error (bill analytics):', err);
    });
  }, []);

  const handleErrorBoundaryError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    errorReporter.captureError(error, {
      context: 'ErrorBoundary',
      component: 'RootLayout',
      metadata: { componentStack: errorInfo.componentStack },
    });
  }, []);

  return {
    handleQueueSyncError,
    handleQueueSyncComplete,
    handleErrorBoundaryError,
  };
}
