/**
 * CashStoreSkeleton Component
 *
 * Skeleton loaders for Cash Store sections
 */

import React, { memo, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Dimensions} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

// Shimmer animation component
const ShimmerBlock: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}> = ({ width: blockWidth, height, borderRadius = 8, style }) => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 })), -1);
    
    }, [shimmerAnim]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: blockWidth,
          height,
          borderRadius,
          backgroundColor: colors.neutral[200],
        },
        shimmerStyle,
        style,
      ]}
    />
  );
};

// Cashback Summary Skeleton
export const CashbackSummarySkeleton: React.FC = memo(() => (
  <View style={styles.summaryContainer}>
    <View style={styles.summaryGradient}>
      <ShimmerBlock width={120} height={16} borderRadius={4} />
      <ShimmerBlock width={80} height={32} borderRadius={6} style={{ marginTop: 8 }} />
      <View style={styles.summaryStats}>
        <ShimmerBlock width={60} height={40} borderRadius={8} />
        <ShimmerBlock width={60} height={40} borderRadius={8} />
        <ShimmerBlock width={60} height={40} borderRadius={8} />
      </View>
    </View>
  </View>
));

// Hero Banner Skeleton
export const HeroBannerSkeleton: React.FC = memo(() => (
  <View style={styles.heroBannerContainer}>
    <ShimmerBlock width={width - 32} height={160} borderRadius={16} />
  </View>
));

// Quick Actions Skeleton
export const QuickActionsSkeleton: React.FC = memo(() => (
  <View style={styles.quickActionsContainer}>
    <ShimmerBlock width={(width - 44) / 2} height={100} borderRadius={16} />
    <ShimmerBlock width={(width - 44) / 2} height={100} borderRadius={16} />
  </View>
));

// Brand Grid Skeleton
export const BrandGridSkeleton: React.FC = memo(() => (
  <View style={styles.sectionContainer}>
    <ShimmerBlock width={150} height={20} borderRadius={4} style={{ marginBottom: 16 }} />
    <View style={styles.brandGrid}>
      {Array.from({ length: 9 }).map((_, i) => (
        <View key={i} style={styles.brandCard}>
          <ShimmerBlock width={50} height={50} borderRadius={25} />
          <ShimmerBlock width={60} height={12} borderRadius={4} style={{ marginTop: 8 }} />
          <ShimmerBlock width={40} height={10} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  </View>
));

// Horizontal Deals Skeleton
export const HorizontalDealsSkeleton: React.FC = memo(() => (
  <View style={styles.sectionContainer}>
    <ShimmerBlock width={150} height={20} borderRadius={4} style={{ marginBottom: 16 }} />
    <View style={styles.horizontalScroll}>
      {Array.from({ length: 3 }).map((_, i) => (
        <ShimmerBlock key={i} width={200} height={120} borderRadius={16} style={{ marginRight: 12 }} />
      ))}
    </View>
  </View>
));

// Coupon Codes Skeleton
export const CouponCodesSkeleton: React.FC = memo(() => (
  <View style={styles.sectionContainer}>
    <ShimmerBlock width={150} height={20} borderRadius={4} style={{ marginBottom: 16 }} />
    <View style={styles.couponList}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={styles.couponCard}>
          <View style={styles.couponLeft}>
            <ShimmerBlock width={40} height={40} borderRadius={8} />
            <View style={{ marginLeft: 12 }}>
              <ShimmerBlock width={100} height={14} borderRadius={4} />
              <ShimmerBlock width={80} height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
          </View>
          <ShimmerBlock width={60} height={32} borderRadius={8} />
        </View>
      ))}
    </View>
  </View>
));

// Full page skeleton
const CashStoreSkeleton: React.FC = () => (
  <View style={styles.container}>
    <CashbackSummarySkeleton />
    <HeroBannerSkeleton />
    <QuickActionsSkeleton />
    <BrandGridSkeleton />
    <HorizontalDealsSkeleton />
    <CouponCodesSkeleton />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    paddingTop: 16,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryGradient: {
    backgroundColor: colors.neutral[200],
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    gap: 12,
  },
  heroBannerContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  brandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandCard: {
    width: (width - 48) / 3,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  horizontalScroll: {
    flexDirection: 'row',
  },
  couponList: {
    gap: 12,
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 12,
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default memo(CashStoreSkeleton);
