// @ts-nocheck
import { Platform } from 'react-native';
import React from 'react';

/**
 * Invisible component that initializes push notifications.
 * Lazy-loaded to defer importing expo-notifications + expo-device
 * until after the homepage has rendered.
 * On web, this is a no-op since expo-notifications doesn't resolve.
 */

// Native-only inner component that safely uses the hook
const NativePushInit = React.lazy(() =>
  import('@/hooks/usePushNotifications').then(mod => ({
    default: () => { mod.usePushNotifications(); return null; },
  }))
);

const PushNotificationInitializer = () => {
  if (Platform.OS === 'web') return null;
  return (
    <React.Suspense fallback={null}>
      <NativePushInit />
    </React.Suspense>
  );
};

export default PushNotificationInitializer;
