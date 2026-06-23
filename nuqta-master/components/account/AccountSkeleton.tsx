// AccountSkeleton - Section-aware shimmer loading placeholder
// Shows section headers + grouped card placeholders matching the redesigned layout

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

const SHIMMER_DURATION = 1500;

function ShimmerBlock({
  width,
  height,
  borderRadius = 6,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(
      withTiming(1, { duration: SHIMMER_DURATION }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: interpolate(shimmerAnim.value, [0, 1], [-200, 200]) }],
  }));

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#F0EDE6',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={shimmerStyle}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

function SkeletonRow({ isLast }: { isLast: boolean }) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <ShimmerBlock width={40} height={40} borderRadius={BorderRadius.md} />
      <View style={styles.textBlock}>
        <ShimmerBlock width={120} height={14} />
        <ShimmerBlock width={180} height={10} style={{ marginTop: 6 }} />
      </View>
      <ShimmerBlock width={18} height={18} borderRadius={4} />
    </View>
  );
}

function SkeletonSection({ itemCount }: { itemCount: number }) {
  return (
    <View style={styles.section}>
      {/* Section header */}
      <ShimmerBlock
        width={140}
        height={12}
        style={styles.sectionHeader}
      />
      {/* Card */}
      <View style={styles.card}>
        {Array.from({ length: itemCount }, (_, i) => (
          <SkeletonRow key={i} isLast={i === itemCount - 1} />
        ))}
      </View>
    </View>
  );
}

function AccountSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonSection itemCount={2} />
      <SkeletonSection itemCount={4} />
      <SkeletonSection itemCount={2} />
      <SkeletonSection itemCount={3} />
    </View>
  );
}

export default React.memo(AccountSkeleton);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...Platform.select({
      ios: Shadows.subtle,
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' } as any,
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
  },
  textBlock: {
    flex: 1,
    marginLeft: Spacing.md,
  },
});
