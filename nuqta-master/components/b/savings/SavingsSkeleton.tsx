/**
 * SavingsSkeleton — placeholder shown while the savings dashboard loads.
 *
 * Mirrors the layout of the dashboard:
 *   1. Big balance card (number + progress bar).
 *   2. Streak pill.
 *   3. Goal carousel strip.
 *   4. Recommendations carousel strip.
 *   5. Activity row stack (5 placeholders).
 *
 * Built on top of the shared `<SkeletonLoader>` so it picks up the same
 * shimmer animation + theme colors as the rest of the app.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonLoader } from '@/components/skeletons';
import { colors, spacing, borderRadius } from '@/constants/theme';

function SavingsSkeletonBase() {
  return (
    <View
      style={styles.container}
      accessibilityLabel="Loading savings"
      accessibilityRole="progressbar"
    >
      {/* Balance card */}
      <View style={styles.balanceCard}>
        <SkeletonLoader width={120} height={12} borderRadius={4} />
        <SkeletonLoader
          width={180}
          height={36}
          borderRadius={6}
          style={styles.balanceAmount}
        />
        <SkeletonLoader
          width={'100%'}
          height={8}
          borderRadius={4}
          style={styles.balanceProgress}
        />
      </View>

      {/* Streak pill */}
      <View style={styles.streakRow}>
        <SkeletonLoader width={36} height={36} variant="circle" />
        <View style={styles.streakText}>
          <SkeletonLoader width={120} height={14} borderRadius={4} />
          <SkeletonLoader
            width={80}
            height={10}
            borderRadius={4}
            style={styles.streakSubtext}
          />
        </View>
      </View>

      {/* Goals strip */}
      <View style={styles.carouselRow}>
        <SkeletonLoader
          width={200}
          height={120}
          borderRadius={borderRadius.md}
          style={styles.carouselCard}
        />
        <SkeletonLoader
          width={200}
          height={120}
          borderRadius={borderRadius.md}
          style={styles.carouselCard}
        />
        <SkeletonLoader
          width={200}
          height={120}
          borderRadius={borderRadius.md}
          style={styles.carouselCard}
        />
      </View>

      {/* Recommendations strip */}
      <View style={styles.carouselRow}>
        <SkeletonLoader
          width={220}
          height={80}
          borderRadius={borderRadius.md}
          style={styles.carouselCard}
        />
        <SkeletonLoader
          width={220}
          height={80}
          borderRadius={borderRadius.md}
          style={styles.carouselCard}
        />
      </View>

      {/* Activity rows */}
      <View style={styles.activityStack}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={`activity-${i}`} style={styles.activityRow}>
            <SkeletonLoader width={36} height={36} variant="circle" />
            <View style={styles.activityText}>
              <SkeletonLoader width={'70%'} height={14} borderRadius={4} />
              <SkeletonLoader
                width={'45%'}
                height={12}
                borderRadius={4}
                style={styles.activitySubtext}
              />
            </View>
            <SkeletonLoader width={60} height={16} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  balanceCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  balanceAmount: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  balanceProgress: {
    marginTop: spacing.xs,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.base,
  },
  streakText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  streakSubtext: {
    marginTop: 4,
  },
  carouselRow: {
    flexDirection: 'row',
    marginBottom: spacing.base,
  },
  carouselCard: {
    marginRight: spacing.sm,
  },
  activityStack: {
    marginTop: spacing.xs,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  activityText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  activitySubtext: {
    marginTop: 4,
  },
});

const SavingsSkeleton = React.memo(SavingsSkeletonBase);
export default SavingsSkeleton;