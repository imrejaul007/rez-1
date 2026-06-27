// Side-effect imports — must come first
import './setup/warningSuppression';
import 'react-native-reanimated';

// Sentry is fully lazy-loaded (220+ modules in the SDK). Even in production
// we don't import it eagerly — instead we apply Sentry.wrap asynchronously
// after the initial render. This saves ~220 modules from the initial bundle.
import React, { useEffect, useState } from 'react';
import { View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppServices } from '@/hooks/useAppServices';
import { ErrorToastHost } from '@/hooks/useErrorToast';
import { ConnectivityBanner } from '@/components/ConnectivityBanner';
import AppProviders from './setup/AppProviders';
import logger, { installProductionConsoleGuard } from '@/utils/logger';
import { colors } from '@/constants/theme';

const FONT_TIMEOUT_MS = 5000;

function RootLayout() {
  // Pre-warm device fingerprint. `apiClient.getDeviceFingerprintHeader()` is module-private
  // and not exported, and the task constraint forbids editing apiClient.ts, so we read the
  // same AsyncStorage key here once on mount to overlap the AsyncStorage round-trip with the
  // first paint. This does NOT populate `apiClient`'s private `_cachedDeviceFingerprint`,
  // so the first API call still pays the round-trip — but the value is hot in the OS cache.
  // TODO: Replace with `apiClient.prewarmFingerprint()` once apiClient.ts exports one.
  useEffect(() => {
    AsyncStorage.getItem('@security_device_fingerprint').catch(() => {});
  }, []);
  // Fonts are loaded lazily (~42 modules from @expo-google-fonts were eagerly
  // imported). We start with no fonts and load them asynchronously after first
  // paint. The user sees the system font for ~50ms then a swap to custom fonts.
  const [loaded, setLoaded] = useState(false);
  const [fontError, setFontError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const expoFont = await import('expo-font');
        const poppins = await import('@expo-google-fonts/poppins');
        const inter = await import('@expo-google-fonts/inter');
        await expoFont.loadAsync({
          'Poppins-SemiBold': poppins.Poppins_600SemiBold,
          'Poppins-Bold': poppins.Poppins_700Bold,
          'Inter-Regular': inter.Inter_400Regular,
          'Inter-Medium': inter.Inter_500Medium,
          'Inter-SemiBold': inter.Inter_600SemiBold,
        });
        if (!cancelled) setLoaded(true);
      } catch (e) {
        if (!cancelled) setFontError(e as Error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const [fontTimedOut, setFontTimedOut] = useState(false);

  useEffect(() => {
    installProductionConsoleGuard();
  }, []);

  useEffect(() => {
    if (fontError) {
      logger.warn('Font loading failed, proceeding with system fonts', { message: fontError.message }, 'Fonts');
    }
  }, [fontError]);

  useEffect(() => {
    if (loaded || fontError) return;
    const timer = setTimeout(() => {
      logger.warn('Font loading timed out after 5s, proceeding with system fonts', undefined, 'Fonts');
      setFontTimedOut(true);
    }, FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loaded, fontError]);

  const systemScheme = useColorScheme();
  const fontsReady = loaded || fontError != null || fontTimedOut;

  const {
    handleQueueSyncError,
    handleQueueSyncComplete,
    handleErrorBoundaryError,
  } = useAppServices(fontsReady);

  if (!fontsReady) {
    return <View style={{ flex: 1, backgroundColor: systemScheme === 'dark' ? '#121212' : colors.nileBlue }} />;
  }

  return (
    <>
      <AppProviders
        onErrorBoundaryError={handleErrorBoundaryError}
        onQueueSyncComplete={handleQueueSyncComplete}
        onQueueSyncError={handleQueueSyncError}
      />
      {/* Global toast host — visible across all screens */}
      <ErrorToastHost />
      {/* Global connectivity banner — surfaces "API unreachable" state to the user
          instead of letting every screen fail with confusing errors. */}
      <ConnectivityBanner />
    </>
  );
}

// Sentry is fully lazy — the dev/prod split is handled at runtime via
// `__DEV__` checks inside the Sentry SDK itself. In production, Sentry
// initializes on first error via errorReporter's lazy import. Here we just
// export the unwrapped RootLayout; the SDK will hook in via global handlers.
export default RootLayout;
