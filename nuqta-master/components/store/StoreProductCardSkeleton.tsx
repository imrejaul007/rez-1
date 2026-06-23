import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

function StoreProductCardSkeleton() {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <View style={styles.card}>
      {/* Image Skeleton */}
      <Animated.View style={[styles.imageSkeleton, shimmerStyle]} />

      {/* Info Skeleton */}
      <View style={styles.infoContainer}>
        {/* Title Skeleton */}
        <Animated.View style={[styles.titleSkeleton, shimmerStyle]} />
        <Animated.View style={[styles.titleSkeletonShort, shimmerStyle]} />

        {/* Rating Skeleton */}
        <Animated.View style={[styles.ratingSkeleton, shimmerStyle]} />

        {/* Price Skeleton */}
        <Animated.View style={[styles.priceSkeleton, shimmerStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageSkeleton: {
    width: '100%',
    height: 180,
    backgroundColor: colors.gray[200],
  },
  infoContainer: {
    padding: 12,
  },
  titleSkeleton: {
    height: 16,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    marginBottom: 6,
  },
  titleSkeletonShort: {
    height: 16,
    width: '70%',
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    marginBottom: 8,
  },
  ratingSkeleton: {
    height: 14,
    width: '40%',
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    marginBottom: 8,
  },
  priceSkeleton: {
    height: 18,
    width: '50%',
    backgroundColor: colors.gray[200],
    borderRadius: 4,
  },
});

export default React.memo(StoreProductCardSkeleton);
