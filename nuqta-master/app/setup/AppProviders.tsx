// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Full provider tree for the app.
 * Composes all eager and deferred context providers in the correct nesting order.
 *
 * Removed providers (now Zustand stores):
 * - NuqtaThemeProvider → themeStore
 * - CrossPlatformAlertProvider → alertStore
 * - ToastProvider → toastStore
 * - DeferredOfflineQueue → offlineQueueStore
 * - DeferredSubscription → subscriptionStore
 * - RegionProvider → regionStore
 * - DeferredNotification → notificationStore
 * - SharedSkeletonProvider → module-level singleton
 * - AppProvider → appStore
 * - HomeTabProvider → homeTabStore
 * - RewardPopupProvider → rewardPopupStore
 * - DeferredSecurity → securityStore
 * - DeferredWishlist → wishlistStore
 * - DeferredProfile → profileStore
 * - DeferredGreeting → greetingStore
 * - DeferredOffers → offersThemeStore
 * - DeferredAppPreferences → appPreferencesStore
 * - DeferredCategory → categoryStore
 * - DeferredRecommendation → recommendationStore
 */
import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
// React Query is lazy-loaded: it's 23+23=46 modules and the QueryClientProvider
// is only needed when components actually useQuery/useMutation. We defer the
// import until first render.
import { queryClient } from '@/lib/queryClient';
const QueryClientProviderLazy = React.lazy(() =>
  import('@tanstack/react-query').then(m => ({ default: m.QueryClientProvider }))
);
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import analytics from '@/services/analytics/AnalyticsService';

import { useTheme } from '@/contexts/ThemeContext';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { LocationProvider } from '@/contexts/LocationContext';
import ToastManager from '@/components/common/ToastManager';
import { CrossPlatformAlertRenderer } from '@/components/common/CrossPlatformAlert';
import LocationRegionSync from '@/components/common/LocationRegionSync';
import OfflineBanner from '@/components/common/OfflineBanner';

// Stripe Provider — native only (web uses @stripe/stripe-js)
let StripeProvider: React.ComponentType<any> | null = null;
if (Platform.OS !== 'web') {
  try {
    StripeProvider = require('@stripe/stripe-react-native').StripeProvider;
  } catch {
    // @stripe/stripe-react-native not available
  }
}


import {
  DeferredSocket,
  DeferredWallet,
  DeferredGamification,
  DeferredCart,
} from './DeferredProviders';
import { useIsAuthenticated } from '@/stores/selectors';
import { useAuth } from '@/contexts/AuthContext';
import { useUserIdentityStore } from '@/stores/userIdentityStore';
import { fetchIdentityFromProfile } from '@/services/identityApi';

const RewardPopupManager = React.lazy(() => import('@/components/gamification/RewardPopupManager'));
const BottomNavigation = React.lazy(() => import('@/components/navigation/BottomNavigation'));

/**
 * Hydrates identity store on auth ready — ensures featureLevel is correct
 * regardless of which screen loads first (deep links, non-home screens).
 */
const IdentityHydrator = React.memo(function IdentityHydrator() {
  const isAuthenticated = useIsAuthenticated();
  let authLoading = false;
  try {
    const auth = useAuth();
    authLoading = auth?.loading ?? false;
  } catch {
    // useAuth may not be available yet
  }

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    fetchIdentityFromProfile()
      .then((data) => {
        if (data) useUserIdentityStore.getState().hydrateFromBackend(data);
      })
      .catch(() => {});
  }, [isAuthenticated, authLoading]);

  return null;
});

interface AppProvidersProps {
  onErrorBoundaryError: (error: Error, errorInfo: React.ErrorInfo) => void;
  onQueueSyncComplete: (result: any) => void;
  onQueueSyncError: (error: Error) => void;
}

function AppProviders({
  onErrorBoundaryError,
  // Queue sync callbacks kept in interface for backwards compat with _layout.tsx
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onQueueSyncComplete: _onQueueSyncComplete,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onQueueSyncError: _onQueueSyncError,
}: AppProvidersProps) {
  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  const content = (
    <React.Suspense fallback={null}>
      <QueryClientProviderLazy client={queryClient}>
        <ErrorBoundary onError={onErrorBoundaryError}>
          <AuthProvider>
            <IdentityHydrator />
            <DeferredWallet>
              <DeferredGamification>
                <LocationProvider>
                  <LocationRegionSync />
                  <DeferredSocket>
                    <DeferredCart>
                      <ThemedNavigation />
                    </DeferredCart>
                  </DeferredSocket>
                </LocationProvider>
              </DeferredGamification>
            </DeferredWallet>
          </AuthProvider>
        </ErrorBoundary>
      </QueryClientProviderLazy>
    </React.Suspense>
  );

  // Wrap with StripeProvider on native platforms only
  if (StripeProvider && stripeKey) {
    return (
      <StripeProvider
        publishableKey={stripeKey}
        merchantIdentifier="merchant.com.rez.app"
        urlScheme="rez"
      >
        {content}
      </StripeProvider>
    );
  }

  return content;
}

/**
 * Auto screen tracker — fires analytics.trackScreen() on every route change.
 */
const ScreenTrackerInner = React.memo(function ScreenTrackerInner() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);
  const lastTrackTime = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (
      pathname &&
      pathname !== prevPathRef.current &&
      now - lastTrackTime.current > 1000
    ) {
      prevPathRef.current = pathname;
      lastTrackTime.current = now;
      analytics.trackScreen(pathname, { route: pathname });
    }
  }, [pathname]);

  return null;
});

function ThemedNavigation() {
  const { isDark } = useTheme();

  // Initialize analytics, remote feature flags, and offline sync queue (fire-and-forget)
  useEffect(() => {
    analytics.initialize().catch(() => {});
    import('@/services/remoteFeatureConfig').then(m => m.remoteFeatureConfig.initialize()).catch(() => {});
    import('@/services/offlineSyncService').then(m => m.default.initialize()).catch(() => {});
  }, []);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <ScreenTrackerInner />
      <Stack screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
      }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ToastManager />
      <CrossPlatformAlertRenderer />
      <OfflineBanner />
      <React.Suspense fallback={null}>
        <RewardPopupManager />
      </React.Suspense>
      <React.Suspense fallback={null}>
        <BottomNavigation />
      </React.Suspense>
    </ThemeProvider>
  );
}

export default withErrorBoundary(AppProviders, 'SetupAppProviders');
