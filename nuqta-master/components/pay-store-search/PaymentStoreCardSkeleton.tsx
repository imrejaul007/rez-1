/**
 * PaymentStoreCardSkeleton Component
 *
 * Shimmer loading skeleton for PaymentStoreCard with animated gradient.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';
import {
  PaymentStoreCardSkeletonProps,
  PAYMENT_SEARCH_COLORS,
  PAYMENT_SEARCH_SHADOWS,
  PAYMENT_SEARCH_GRADIENTS,
  SEARCH_ANIMATIONS,
} from '@/types/paymentStoreSearch.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}

const Shimmer: React.FC<ShimmerProps> = ({ width, height, borderRadius = 8, style }) => {
  const shimmerTranslate = useSharedValue(-SCREEN_WIDTH);

  useEffect(() => {
    shimmerTranslate.value = withRepeat(
      withTiming(SCREEN_WIDTH, {
        duration: SEARCH_ANIMATIONS.shimmer.duration,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [shimmerTranslate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslate.value }],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.neutral[200],
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmerOverlay, animatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
};

const FullCardSkeleton: React.FC = () => (
  <View style={[styles.container, PAYMENT_SEARCH_SHADOWS.card]}>
    {/* Header Row */}
    <View style={styles.headerRow}>
      <Shimmer width={56} height={56} borderRadius={12} />
      <View style={styles.headerInfo}>
        <Shimmer width="70%" height={18} borderRadius={6} />
        <Shimmer width="50%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
      <Shimmer width={48} height={24} borderRadius={8} />
    </View>

    {/* Badges Row */}
    <View style={styles.badgesRow}>
      <Shimmer width={70} height={24} borderRadius={8} />
      <Shimmer width={100} height={24} borderRadius={8} />
    </View>

    {/* CTA Button */}
    <Shimmer width="100%" height={44} borderRadius={12} style={{ marginTop: 16 }} />
  </View>
);

const CompactCardSkeleton: React.FC = () => (
  <View style={[styles.compactContainer, PAYMENT_SEARCH_SHADOWS.card]}>
    <Shimmer width={56} height={56} borderRadius={28} />
    <Shimmer width={80} height={14} borderRadius={4} style={{ marginTop: 8 }} />
    <Shimmer width={50} height={10} borderRadius={4} style={{ marginTop: 4 }} />
  </View>
);

export const PaymentStoreCardSkeleton: React.FC<PaymentStoreCardSkeletonProps> = ({
  variant = 'full',
  count = 3,
}) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  if (variant === 'compact') {
    return (
      <View style={styles.compactListContainer}>
        {skeletons.map((index) => (
          <CompactCardSkeleton key={index} />
        ))}
      </View>
    );
  }

  return (
    <View>
      {skeletons.map((index) => (
        <FullCardSkeleton key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Full variant styles
  container: {
    backgroundColor: PAYMENT_SEARCH_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },

  // Compact variant styles
  compactContainer: {
    backgroundColor: PAYMENT_SEARCH_COLORS.surface,
    borderRadius: 12,
    padding: 12,
    width: 120,
    alignItems: 'center',
    marginRight: 12,
  },
  compactListContainer: {
    flexDirection: 'row',
    paddingLeft: 16,
  },

  // Shimmer overlay
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    flex: 1,
    width: SCREEN_WIDTH * 0.5,
  },
});

export default React.memo(PaymentStoreCardSkeleton);
