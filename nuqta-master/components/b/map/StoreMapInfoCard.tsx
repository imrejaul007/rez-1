/**
 * StoreMapInfoCard — bottom sheet that surfaces when a marker is tapped.
 *
 * Shows: store name, category, distance, current offers count, a "View
 * store" button (primary) and a "Get directions" button (secondary), and
 * an X to dismiss. Slides up from the bottom on mount via `Animated`.
 *
 * The card is purely presentational. Parent owns:
 *   - which store is selected (`store`)
 *   - what "view store" does (`onViewStore`)
 *   - what "get directions" does (`onNavigate`)
 *   - how the card closes (`onClose`)
 *
 * Theming: the spec calls for `colors.background.elevated` when available,
 * else `colors.background.secondary`. The Nuqta design tokens don't define
 * `background.elevated` today, so we fall back to `secondary` — but the
 * lookup is structured so adding `elevated` to the theme later is a no-op.
 *
 * Accessibility: each action has its own `accessibilityLabel`; the card
 * root is `accessibilityRole="summary"` so screen readers announce it as
 * a coherent unit.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityRole,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';
import { formatDistance } from '@/utils/geoUtils';
import type { NearbyStore } from '@/hooks/b/map/useNearbyStores';

export interface StoreMapInfoCardProps {
  store: NearbyStore;
  onClose: () => void;
  /** Wired to the "Get directions" button (open maps app, etc.). */
  onNavigate: () => void;
  /** Wired to the "View store" button (push the store detail page). */
  onViewStore?: () => void;
}

const SLIDE_DURATION_MS = 240;

function StoreMapInfoCardBase({
  store,
  onClose,
  onNavigate,
  onViewStore,
}: StoreMapInfoCardProps): React.ReactElement {
  const translateY = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    translateY.setValue(120);
    const animation = Animated.timing(translateY, {
      toValue: 0,
      duration: SLIDE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [store.id]);

  // The design tokens don't yet expose `background.elevated`. Resolve to
  // `secondary` so the call site is forward-compatible.
  const surface =
    (colors.background as { elevated?: string }).elevated ?? colors.background.secondary;

  // ponytail: useMemo avoids re-computing derived strings on unrelated parent re-renders.
  const offersLabel = useMemo(
    () => `${store.offersCount} offer${store.offersCount === 1 ? '' : 's'} live`,
    [store.offersCount],
  );
  const cashbackLabel = useMemo(
    () =>
      typeof store.cashbackPercent === 'number' && store.cashbackPercent > 0
        ? `${store.cashbackPercent}% cashback`
        : null,
    [store.cashbackPercent],
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: surface, transform: [{ translateY }] },
      ]}
      accessibilityRole={'dialog' as AccessibilityRole}
      accessibilityLabel={`Store details for ${store.name}. ${formatDistance(store.distanceKm)} away${
        store.category ? `, ${store.category}` : ''
      }. ${offersLabel}${cashbackLabel ? `. ${cashbackLabel}` : ''}.`}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {store.name}
          </Text>
          {store.category ? (
            <Text style={styles.category} numberOfLines={1}>
              {store.category}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close store details for ${store.name}`}
          onPress={onClose}
          hitSlop={spacing.sm}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
        >
          <Text style={styles.closeText}>X</Text>
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Distance</Text>
          <Text style={styles.metaValue}>{formatDistance(store.distanceKm)} away</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Offers</Text>
          <Text style={styles.metaValue}>{offersLabel}</Text>
        </View>
        {cashbackLabel ? (
          <>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Reward</Text>
              <Text style={[styles.metaValue, styles.metaValueGold]}>
                {cashbackLabel}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${store.name}`}
          onPress={onViewStore}
          disabled={!onViewStore}
          style={({ pressed }) => [
            styles.primaryBtn,
            !onViewStore && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={styles.primaryBtnText}>View store</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Get directions to ${store.name}`}
          onPress={onNavigate}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
        >
          <Text style={styles.secondaryBtnText}>Get directions</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    bottom: spacing.base,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...(Platform.OS === 'web' ? null : shadows.strong),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  name: {
    ...typography.h3,
    color: colors.text.primary,
  },
  category: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.circular(22),
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    opacity: 0.7,
  },
  closeText: {
    ...typography.label,
    color: colors.text.primary,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.base,
  },
  metaItem: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border.light,
  },
  metaLabel: {
    ...typography.overline,
    color: colors.text.tertiary,
  },
  metaValue: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  metaValueGold: {
    color: colors.gold,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.gold,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    ...typography.button,
    color: colors.text.inverse,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  secondaryBtnText: {
    ...typography.button,
    color: colors.text.primary,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

const StoreMapInfoCard = React.memo(StoreMapInfoCardBase);
export default StoreMapInfoCard;
