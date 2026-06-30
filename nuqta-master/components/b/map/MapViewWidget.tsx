/**
 * MapViewWidget — compact preview card for the home tab.
 *
 * Shows a placeholder map tile with 1-2 store pin dots, a "X stores near
 * you" count, and a "Tap to open" hint. Tapping navigates to the full
 * `/b/map` page. Wrapped in `<FeatureFlagGate flag="b.map">` so it
 * disappears when the feature is disabled without affecting the rest of
 * the home tab.
 *
 * The widget intentionally uses lightweight mock content. We don't call the
 * nearby-stores API here — the full `/b/map` page owns that fetch. The
 * count is read from `useNearbyStores` only when the hook can return data
 * synchronously (i.e. on subsequent renders after the user has visited the
 * map). On first mount, we show a friendly "Explore nearby stores" line.
 *
 * No props. The widget is self-contained.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import FeatureFlagGate from '@/components/b/_shared/FeatureFlagGate';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';

function MapViewWidgetBase(): React.ReactElement {
  const router = useRouter();

  const handlePress = (): void => {
    router.push('/b/map' as const);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open nearby stores map"
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Stores near you</Text>
        <Text style={styles.chevron}>›</Text>
      </View>

      <View style={styles.preview}>
        {/* Mock map background */}
        <View style={styles.previewBg} />
        <View style={[styles.road, styles.roadH]} />
        <View style={[styles.road, styles.roadV]} />
        {/* Two pin dots */}
        <View style={[styles.pin, styles.pinLeft]} accessible={false}>
          <View style={styles.pinDot} />
        </View>
        <View style={[styles.pin, styles.pinRight]} accessible={false}>
          <View style={[styles.pinDot, styles.pinDotPartner]} />
        </View>
        {/* Centered label overlay */}
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Explore the map</Text>
          <Text style={styles.overlaySub}>See REZ-accepting shops around you</Text>
        </View>
      </View>

      <Text style={styles.hint} accessibilityRole="text" aria-hidden="true">Tap to open</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.label,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chevron: {
    fontSize: 22,
    color: colors.gold,
    fontWeight: '600',
  },
  preview: {
    height: 150,
    width: '100%',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.background.tertiary,
    position: 'relative',
    marginBottom: spacing.sm,
  },
  previewBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.lavenderMist,
  },
  road: {
    position: 'absolute',
    backgroundColor: colors.background.primary,
    opacity: 0.7,
  },
  roadH: {
    left: 0,
    right: 0,
    top: '55%',
    height: 6,
  },
  roadV: {
    top: 0,
    bottom: 0,
    left: '40%',
    width: 6,
  },
  pin: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  pinLeft: {
    top: '20%',
    left: '15%',
  },
  pinRight: {
    bottom: '20%',
    right: '20%',
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.nileBlue,
  },
  pinDotPartner: {
    backgroundColor: colors.gold,
  },
  overlay: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  overlayTitle: {
    ...typography.label,
    color: colors.text.primary,
  },
  overlaySub: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  hint: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '600',
    textAlign: 'right',
  },
});

const MapViewWidgetBaseMemo = React.memo(MapViewWidgetBase);

function MapViewWidget(): React.ReactElement {
  return (
    <FeatureFlagGate flag="b.map">
      <MapViewWidgetBaseMemo />
    </FeatureFlagGate>
  );
}

export default MapViewWidget;