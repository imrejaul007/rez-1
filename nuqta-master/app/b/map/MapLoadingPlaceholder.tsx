/**
 * MapLoadingPlaceholder — skeleton shown while the map screen is loading.
 *
 * Mirrors the layout of MapPage so there's no visible jump when the real
 * screen mounts. The shimmer/skeleton approach keeps the user oriented while
 * the native module bundle for react-native-maps downloads.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/constants/theme';

export default function MapLoadingPlaceholder(): React.ReactElement {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header skeleton */}
      <View style={styles.headerRow}>
        <View style={styles.backBtnSkeleton} />
        <View style={styles.headerTitleSkeleton} />
        <View style={styles.headerSpacer} />
      </View>

      {/* Filter chips skeleton */}
      <View style={styles.filterBar}>
        <View style={[styles.chipSkeleton, styles.chipSkeletonActive]} />
        <View style={styles.chipSkeleton} />
        <View style={styles.chipSkeleton} />
        <View style={styles.chipSkeleton} />
      </View>

      {/* Map area skeleton */}
      <View style={styles.mapSkeleton}>
        <View style={styles.shimmer} />
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </View>

      {/* Footer skeleton */}
      <View style={styles.footerBar}>
        <View style={styles.refreshBtnSkeleton} />
        <View style={styles.footerMetaSkeleton} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  backBtnSkeleton: {
    width: 50,
    height: 24,
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
  headerTitleSkeleton: {
    width: 120,
    height: 24,
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
  headerSpacer: {
    width: 64,
  },
  filterBar: {
    flexGrow: 0,
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chipSkeleton: {
    width: 70,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[200],
  },
  chipSkeletonActive: {
    backgroundColor: colors.gold,
    opacity: 0.7,
  },
  mapSkeleton: {
    flex: 1,
    margin: spacing.base,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.neutral[100],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  refreshBtnSkeleton: {
    width: 90,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[200],
  },
  footerMetaSkeleton: {
    width: 100,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.neutral[200],
  },
});
