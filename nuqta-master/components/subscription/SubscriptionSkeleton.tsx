import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat, interpolate } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SkeletonBlock = React.memo(({ width, height, style, borderRadius = 8 }: {
  width: number | string;
  height: number;
  style?: any;
  borderRadius?: number;
}) => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1);
  }, [shimmerAnim]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.neutral[200],
        },
        animStyle,
        style,
      ]}
    />
  );
});

/** Skeleton for the Manage Subscription page */
export const ManageSubscriptionSkeleton = React.memo(() => (
  <View style={styles.container}>
    {/* Tier Card Skeleton */}
    <View style={styles.tierCard}>
      <SkeletonBlock width={60} height={60} borderRadius={30} />
      <View style={{ marginTop: 12 }}>
        <SkeletonBlock width={160} height={24} />
      </View>
      <View style={{ marginTop: 8 }}>
        <SkeletonBlock width={120} height={16} />
      </View>
    </View>

    {/* Benefits Section */}
    <View style={styles.section}>
      <SkeletonBlock width={140} height={20} style={{ marginBottom: 12 }} />
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.benefitRow}>
          <SkeletonBlock width={24} height={24} borderRadius={12} />
          <SkeletonBlock width={SCREEN_WIDTH - 100} height={16} style={{ marginLeft: 12 }} />
        </View>
      ))}
    </View>

    {/* Usage Section */}
    <View style={styles.section}>
      <SkeletonBlock width={100} height={20} style={{ marginBottom: 12 }} />
      <SkeletonBlock width="100%" height={80} borderRadius={12} />
    </View>

    {/* CTA Button */}
    <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
      <SkeletonBlock width="100%" height={52} borderRadius={26} />
    </View>
  </View>
));

/** Skeleton for the Plans page */
export const PlansPageSkeleton = React.memo(() => (
  <View style={styles.container}>
    {/* Billing Toggle */}
    <View style={styles.toggleRow}>
      <SkeletonBlock width={200} height={40} borderRadius={20} />
    </View>

    {/* Plan Cards */}
    {[1, 2, 3].map((i) => (
      <View key={i} style={styles.planCard}>
        <SkeletonBlock width={120} height={24} style={{ marginBottom: 8 }} />
        <SkeletonBlock width={80} height={32} style={{ marginBottom: 16 }} />
        {[1, 2, 3].map((j) => (
          <View key={j} style={styles.featureRow}>
            <SkeletonBlock width={20} height={20} borderRadius={10} />
            <SkeletonBlock width={SCREEN_WIDTH - 140} height={14} style={{ marginLeft: 10 }} />
          </View>
        ))}
        <SkeletonBlock width="100%" height={48} borderRadius={24} style={{ marginTop: 16 }} />
      </View>
    ))}
  </View>
));

/** Skeleton for the Upgrade Confirmation page */
export const UpgradeConfirmationSkeleton = React.memo(() => (
  <View style={styles.container}>
    {/* Tier Transition */}
    <View style={styles.transitionRow}>
      <SkeletonBlock width={80} height={80} borderRadius={40} />
      <SkeletonBlock width={40} height={20} style={{ marginHorizontal: 16 }} />
      <SkeletonBlock width={80} height={80} borderRadius={40} />
    </View>

    {/* Pricing */}
    <View style={styles.section}>
      <SkeletonBlock width={180} height={28} style={{ alignSelf: 'center', marginBottom: 8 }} />
      <SkeletonBlock width={120} height={18} style={{ alignSelf: 'center' }} />
    </View>

    {/* Benefits */}
    <View style={styles.section}>
      <SkeletonBlock width={160} height={20} style={{ marginBottom: 12 }} />
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.benefitRow}>
          <SkeletonBlock width={24} height={24} borderRadius={12} />
          <SkeletonBlock width={SCREEN_WIDTH - 100} height={16} style={{ marginLeft: 12 }} />
        </View>
      ))}
    </View>

    {/* CTA */}
    <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
      <SkeletonBlock width="100%" height={52} borderRadius={26} />
    </View>
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  tierCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    marginBottom: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
  },
  transitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
});
