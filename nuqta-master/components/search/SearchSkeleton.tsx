import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

function ShimmerBar({ width: w, height, borderRadius = 8, style }: { width: number | string; height: number; borderRadius?: number; style?: any }) {
  const opacityAnim = useSharedValue(0.3);

  useEffect(() => {
    opacityAnim.value = withRepeat(withSequence(withTiming(0.7, { duration: 800 }), withTiming(0.3, { duration: 800 })), -1);
  }, [opacityAnim]);

  const animatedOpacityStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value,
  }));

  return (
    <Animated.View
      style={[
        { width: w as any, height, borderRadius, backgroundColor: colors.neutral[200] },
        animatedOpacityStyle,
        style,
      ]}
    />
  );
}

function LandingSkeletonInner() {
  return (
    <View style={styles.container}>
      {/* Quick Actions Skeleton */}
      <View style={styles.quickActionsRow}>
        <ShimmerBar width={(width - 48) / 2} height={100} borderRadius={16} />
        <ShimmerBar width={(width - 48) / 2} height={100} borderRadius={16} />
      </View>

      {/* Recent Searches Skeleton */}
      <View style={styles.section}>
        <ShimmerBar width={140} height={16} style={{ marginBottom: 12 }} />
        <ShimmerBar width={'100%' as any} height={44} borderRadius={12} style={{ marginBottom: 8 }} />
        <ShimmerBar width={'100%' as any} height={44} borderRadius={12} style={{ marginBottom: 8 }} />
        <ShimmerBar width={'100%' as any} height={44} borderRadius={12} />
      </View>

      {/* Trending Skeleton */}
      <View style={styles.section}>
        <ShimmerBar width={160} height={16} style={{ marginBottom: 12 }} />
        {[1, 2, 3, 4].map(i => (
          <ShimmerBar key={i} width={'100%' as any} height={44} borderRadius={10} style={{ marginBottom: 8 }} />
        ))}
      </View>

      {/* Popular Stores Skeleton */}
      <View style={styles.section}>
        <ShimmerBar width={150} height={16} style={{ marginBottom: 12 }} />
        <View style={styles.storesRow}>
          {[1, 2, 3].map(i => (
            <ShimmerBar key={i} width={140} height={160} borderRadius={16} />
          ))}
        </View>
      </View>
    </View>
  );
}

function ResultsSkeletonInner() {
  return (
    <View style={styles.container}>
      {/* Summary Skeleton */}
      <View style={styles.summarySection}>
        <ShimmerBar width={200} height={20} style={{ marginBottom: 8 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <ShimmerBar width={80} height={14} />
          <ShimmerBar width={120} height={14} />
          <ShimmerBar width={100} height={14} />
        </View>
      </View>

      {/* Filter Bar Skeleton */}
      <View style={styles.filterRow}>
        <ShimmerBar width={80} height={36} borderRadius={20} />
        <ShimmerBar width={60} height={36} borderRadius={20} />
        <ShimmerBar width={70} height={36} borderRadius={20} />
        <ShimmerBar width={65} height={36} borderRadius={20} />
      </View>

      {/* Product Cards Skeleton */}
      {[1, 2, 3].map(i => (
        <View key={i} style={styles.cardSkeleton}>
          <ShimmerBar width={200} height={18} style={{ marginBottom: 8 }} />
          <View style={styles.sellerSkeleton}>
            <ShimmerBar width={60} height={60} borderRadius={12} />
            <View style={{ flex: 1, gap: 6 }}>
              <ShimmerBar width={140} height={14} />
              <ShimmerBar width={100} height={12} />
              <ShimmerBar width={80} height={20} />
            </View>
            <ShimmerBar width={80} height={36} borderRadius={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export const LandingSkeleton = React.memo(LandingSkeletonInner);
export const ResultsSkeleton = React.memo(ResultsSkeletonInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  storesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summarySection: {
    paddingVertical: 16,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  cardSkeleton: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sellerSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
