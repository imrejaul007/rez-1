// ConnectivityBanner
// Renders a dismissable "Connection issue" banner when the API is unreachable.
// Mount once near the root of the app (e.g. inside AuthProvider / root layout).

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import connectivityService, {
  ConnectivityResult,
  ConnectivityStatus,
} from '@/services/connectivityService';

export interface ConnectivityBannerProps {
  // Custom colors; defaults are tuned for both light and dark themes.
  backgroundColor?: string;
  textColor?: string;
  // Hide the banner until the first check completes (skips the "checking…" flicker).
  hideUntilChecked?: boolean;
}

export function ConnectivityBanner({
  backgroundColor = '#FEF3C7',
  textColor = '#92400E',
  hideUntilChecked = false,
}: ConnectivityBannerProps) {
  const [result, setResult] = useState<ConnectivityResult | null>(
    connectivityService.getSnapshot(),
  );
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = connectivityService.subscribe(setResult);
    if (!result) {
      // Kick off the first check; the snapshot will arrive via subscribe().
      connectivityService.check().catch(() => undefined);
    }
    return unsubscribe;
  }, [result]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await connectivityService.check({ force: true });
    } finally {
      setRetrying(false);
    }
  }, []);

  const status: ConnectivityStatus = result?.status ?? 'unknown';

  if (hideUntilChecked && status === 'unknown') return null;
  if (status === 'online') return null;
  if (dismissed) return null;

  const isChecking = status === 'unknown' || retrying;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor, paddingTop: insets.top + 6, paddingBottom: 8 },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID="connectivity-banner"
    >
      <View style={styles.row}>
        {isChecking ? (
          <ActivityIndicator size="small" color={textColor} style={styles.spinner} />
        ) : (
          <Text style={[styles.icon, { color: textColor }]}>⚠️</Text>
        )}
        <Text style={[styles.message, { color: textColor }]} numberOfLines={2}>
          {isChecking
            ? 'Checking server connection…'
            : "Connection issue — we can't reach the server right now."}
        </Text>
        {!isChecking && (
          <Pressable
            onPress={handleRetry}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Retry connection"
            testID="connectivity-retry"
            style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
          >
            <Text style={[styles.retryText, { color: textColor }]}>Retry</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setDismissed(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          testID="connectivity-dismiss"
          style={({ pressed }) => [styles.dismissBtn, pressed && styles.pressed]}
        >
          <Text style={[styles.dismissText, { color: textColor }]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: { fontSize: 16, marginRight: 8 },
  spinner: { marginRight: 8 },
  message: { flex: 1, fontSize: 13, fontWeight: '500' },
  retryBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  retryText: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  dismissBtn: { paddingHorizontal: 6, paddingVertical: 4, marginLeft: 4 },
  dismissText: { fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});

export default ConnectivityBanner;