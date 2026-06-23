import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useNetworkStatus from '@/hooks/useNetworkStatus';
import { useToast } from '@/hooks/useToast';
import { colors } from '@/constants/theme';

/**
 * Global offline banner that slides down from the top when network is lost,
 * and auto-hides when connection is restored. Also fires toast notifications
 * for connectivity changes.
 */
export function OfflineBanner() {
  const { isOnline, wasOffline, resetWasOffline, connectionQuality } = useNetworkStatus();
  const { showSuccess, showError } = useToast();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-120);
  const isShowingRef = React.useRef(false);
  const hasShownInitialRef = React.useRef(false);

  const resetIsShowing = React.useCallback(() => {
    isShowingRef.current = false;
  }, []);

  const showBanner = React.useCallback(() => {
    isShowingRef.current = true;
    translateY.value = withSpring(0, { damping: 18, stiffness: 120 });
  }, [translateY]);

  const hideBanner = React.useCallback(() => {
    translateY.value = withTiming(-120, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(resetIsShowing)();
      }
    });
  }, [translateY, resetIsShowing]);

  useEffect(() => {
    if (!isOnline) {
      // Went offline
      showBanner();
      if (hasShownInitialRef.current) {
        showError('No internet connection');
      }
      hasShownInitialRef.current = true;
    } else if (isOnline && wasOffline) {
      // Came back online
      showBanner();
      showSuccess('Back online!');
      resetWasOffline();

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        hideBanner();
      }, 3000);
      return () => clearTimeout(timer);
    } else if (isOnline && !wasOffline) {
      // Online and not reconnecting — hide
      hideBanner();
      hasShownInitialRef.current = true;
    }
  }, [isOnline, wasOffline]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backgroundColor = !isOnline
    ? '#FF3B30'
    : connectionQuality === 'poor'
      ? '#FF9500'
      : '#34C759';

  const iconName: keyof typeof Ionicons.glyphMap = !isOnline
    ? 'cloud-offline'
    : connectionQuality === 'poor'
      ? 'wifi'
      : 'checkmark-circle';

  const message = !isOnline
    ? 'No internet connection'
    : connectionQuality === 'poor'
      ? 'Poor connection'
      : 'Back online';

  const subMessage = !isOnline
    ? 'You can still browse, changes will sync later'
    : connectionQuality === 'poor'
      ? 'Some features may be slow'
      : 'All features are available';

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor, paddingTop: insets.top + 8 },
        animatedStyle,
      ]}
      pointerEvents="box-none"
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`${message}. ${subMessage}`}
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={iconName} size={22} color={colors.background.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.mainText}>{message}</Text>
          <Text style={styles.subText}>{subMessage}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  mainText: {
    color: colors.text.white,
    fontSize: 15,
    fontWeight: '600',
  },
  subText: {
    color: colors.text.white,
    fontSize: 12,
    opacity: 0.9,
  },
});

export default React.memo(OfflineBanner);
