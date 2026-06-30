/**
 * StoreMapMarker — circular badge marker for the `/b/map` map view.
 *
 * Renders a small badge with the store's first letter. Partner (gold) stores
 * use `colors.gold`; non-partner stores use `colors.nileBlue`. The marker is
 * wrapped in a `Pressable` so screen readers announce it as a button and
 * `onPress` fires on tap.
 *
 * This is a pure view component — it does not own selection state, animation,
 * or the surrounding `MapView`. The parent is responsible for rendering it
 * inside a `react-native-maps` `<Marker>` element (using its `children`
 * slot) or as a stand-alone overlay (e.g. on the web mock map).
 *
 * @example
 *   ```tsx
 *   <Marker coordinate={{ latitude, longitude }}>
 *     <StoreMapMarker store={store} onPress={onSelect} />
 *   </Marker>
 *   ```
 */

import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';
import type { NearbyStore } from '@/hooks/b/map/useNearbyStores';

export interface StoreMapMarkerProps {
  store: NearbyStore;
  onPress?: () => void;
  /** Pixel size of the circular badge. Defaults to 36. */
  size?: number;
}

const DEFAULT_SIZE = 36;

/**
 * Format the accessibility label so screen readers announce the distance
 * in a consistent, human-readable form (e.g. "1.2 km" not "1.234 km").
 */
function formatAccessibilityDistance(distanceKm: number): string {
  if (!Number.isFinite(distanceKm)) return 'unknown distance';
  if (distanceKm < 1) {
    const metres = Math.max(1, Math.round(distanceKm * 1000));
    return `${metres} metres`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

function StoreMapMarkerBase({
  store,
  onPress,
  size = DEFAULT_SIZE,
}: StoreMapMarkerProps): React.ReactElement {
  const initial = (store.name ?? '?').trim().charAt(0).toUpperCase() || '?';
  const badgeColor = store.isPartner ? colors.gold : colors.nileBlue;
  const a11yLabel = `Store: ${store.name}, ${formatAccessibilityDistance(
    store.distanceKm,
  )} away`;

  // ponytail: useMemo avoids re-allocating the style array on every render.
  // size and badgeColor are both derived from stable props, so this is cheap.
  const badgeStyle = useMemo(
    () => [
      styles.badge,
      {
        width: size,
        height: size,
        borderRadius: borderRadius.circular(size),
        backgroundColor: badgeColor,
      },
    ],
    [size, badgeColor],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={({ pressed }) => [
        styles.outer,
        Platform.OS === 'web' ? null : shadows.medium,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={badgeStyle}
        accessible={false}
        accessibilityElementsHidden
      >
        <Text
          style={[styles.initial, size >= 44 && styles.initialLarge]}
          accessible={false}
        >
          {initial}
        </Text>
      </View>
      {/* Small pointer underneath the badge — purely decorative. */}
      <View
        style={[
          styles.tail,
          { borderTopColor: badgeColor },
        ]}
        accessible={false}
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  initial: {
    ...typography.label,
    color: colors.text.inverse,
    fontWeight: '800',
  },
  initialLarge: {
    fontSize: 16,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
});

const StoreMapMarker = React.memo(StoreMapMarkerBase);
export default StoreMapMarker;
