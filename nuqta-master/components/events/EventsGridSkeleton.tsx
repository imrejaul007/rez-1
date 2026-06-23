/**
 * EventsGridSkeleton Component
 * Loading skeleton for events grid
 */

import React, { memo, useEffect } from 'react';
import { colors } from '@/constants/theme';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat, interpolate } from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 48) / 2;
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 0.75;

interface EventsGridSkeletonProps {
  count?: number;
}

const SkeletonCard: React.FC = () => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1);
      }, [shimmerAnim]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <View style={styles.card}>
      {/* Image Skeleton */}
      <Animated.View style={[styles.imageSkeleton, shimmerStyle]} />

      {/* Content Skeleton */}
      <View style={styles.content}>
        {/* Title Lines */}
        <Animated.View style={[styles.titleLine1, shimmerStyle]} />
        <Animated.View style={[styles.titleLine2, shimmerStyle]} />

        {/* Date Line */}
        <Animated.View style={[styles.dateLine, shimmerStyle]} />

        {/* Price */}
        <Animated.View style={[styles.priceLine, shimmerStyle]} />
      </View>
    </View>
  );
};

const EventsGridSkeleton: React.FC<EventsGridSkeletonProps> = ({ count = 6 }) => {
  const cards = Array.from({ length: count }, (_, i) => i);

  return (
    <View style={styles.container}>
      {cards.map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  imageSkeleton: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: colors.neutral[200],
  },
  content: {
    padding: 10,
  },
  titleLine1: {
    height: 14,
    width: '90%',
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginBottom: 6,
  },
  titleLine2: {
    height: 14,
    width: '60%',
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginBottom: 8,
  },
  dateLine: {
    height: 12,
    width: '70%',
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginBottom: 8,
  },
  priceLine: {
    height: 16,
    width: '40%',
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
  },
});

export default memo(EventsGridSkeleton);
