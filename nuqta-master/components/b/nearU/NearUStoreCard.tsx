/**
 * NearUStoreCard — single-store tile for the Near-U vertical lists.
 *
 * Shows the store name, category, distance, ETA, the number of live
 * offers, and a "View store" call-to-action. Stores that have a student
 * discount get a small "Student discount" badge next to the name.
 *
 * Layout
 * ------
 *   [Logo/badge]  Name (bold)             [Student discount?]
 *                 Category · distance · ETA
 *                 3 offers live
 *                 [        View store        ]
 *
 * Visual design
 * -------------
 *   - White surface (`colors.background.primary`) on the linen page
 *     background, with a thin gold-tinted border to read as a "card"
 *     without competing with the gold CTA.
 *   - Logo fallback: when `logoUrl` is missing we render a gold square
 *     with the first letter of the store name so the row always has a
 *     visual anchor.
 *
 * Accessibility
 * -------------
 *   - Whole card has `accessibilityLabel` that reads the store name,
 *     category, distance, ETA, and a student-discount flag if present.
 *   - When `onPress` is supplied the card becomes a button; the inner
 *     "View store" pressable is a separate button with its own label
 *     so taps on either still trigger the same handler.
 */
import React, { useMemo } from 'react';
import {
  AccessibilityRole,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from '@/constants/theme';
import type { NearUStore } from '@/hooks/b/nearU/useNearUStores';

export interface NearUStoreCardProps {
  store: NearUStore;
  onPress?: () => void;
}

/**
 * Format a `distanceKm` number for display.
 *
 * Sub-1km values are rendered as `<n> m away`. Everything else is
 * rendered as `<n.n> km away` with one decimal of precision.
 */
function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return '';
  if (km < 1) {
    const metres = Math.max(1, Math.round(km * 1000));
    return `${metres} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Pull the first printable character out of a store name so we can use
 * it as a fallback badge when no logo is supplied. Always returns a
 * non-empty uppercase string.
 */
function firstLetter(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';
  const ch = trimmed.charAt(0);
  return ch.toUpperCase();
}

function NearUStoreCardBase({
  store,
  onPress,
}: NearUStoreCardProps): React.ReactElement {
  const distance = useMemo(() => formatDistance(store.distanceKm), [store.distanceKm]);
  const eta = useMemo(() => {
    if (!Number.isFinite(store.etaMinutes) || store.etaMinutes <= 0) return '';
    return `${store.etaMinutes} min`;
  }, [store.etaMinutes]);
  const offersLabel = useMemo(
    () => `${store.currentOffersCount} offer${store.currentOffersCount === 1 ? '' : 's'} live`,
    [store.currentOffersCount],
  );

  const accessibilityLabel = useMemo(() => {
    const parts: string[] = [store.name, store.category];
    if (distance) parts.push(`${distance} away`);
    if (eta) parts.push(`ETA ${eta}`);
    if (store.isStudentDiscount) parts.push('student discount');
    if (!store.isOpen) parts.push('closed');
    return parts.join(', ');
  }, [store.name, store.category, distance, eta, store.isStudentDiscount, store.isOpen]);

  const handlePress = (): void => {
    if (onPress) onPress();
  };

  const showLetterBadge = !store.logoUrl;
  const letter = firstLetter(store.name);

  const inner = (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.logoSlot}>
          {showLetterBadge ? (
            <View
              style={styles.letterBadge}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              <Text style={styles.letterBadgeText}>{letter}</Text>
            </View>
          ) : (
            <Image
              source={{ uri: store.logoUrl }}
              style={styles.logo}
              accessibilityIgnoresInvertColors
            />
          )}
        </View>

        <View style={styles.titleBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {store.name}
            </Text>
            {store.isStudentDiscount ? (
              <View
                style={styles.studentBadge}
                accessibilityLabel="Student discount available"
              >
                <Text style={styles.studentBadgeText}>Student</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.category} numberOfLines={1}>
            {store.category}
          </Text>
          <View style={styles.metaRow}>
            {distance ? (
              <Text style={styles.metaText}>{distance}</Text>
            ) : null}
            {distance && eta ? (
              <Text style={styles.metaDot}> · </Text>
            ) : null}
            {eta ? <Text style={styles.metaText}>{eta}</Text> : null}
            {!store.isOpen ? (
              <>
                <Text style={styles.metaDot}> · </Text>
                <Text style={[styles.metaText, styles.metaTextClosed]}>Closed</Text>
              </>
            ) : null}
          </View>
          <Text style={styles.offersLabel}>{offersLabel}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole={'button' as AccessibilityRole}
        accessibilityLabel={`View ${store.name}`}
        onPress={handlePress}
        disabled={!onPress}
        style={({ pressed }) => [
          styles.cta,
          pressed && styles.ctaPressed,
          !onPress && styles.ctaDisabled,
        ]}
      >
        <Text style={styles.ctaText}>View store</Text>
      </Pressable>
    </View>
  );

  if (!onPress) {
    return (
      <View
        style={styles.container}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={'summary' as AccessibilityRole}
      >
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole={'button' as AccessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.subtle,
  },
  containerPressed: {
    opacity: 0.85,
  },
  card: {
    padding: spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logoSlot: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.sm,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  letterBadge: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBadgeText: {
    ...typography.h2,
    color: colors.nileBlue,
    fontWeight: '800',
  },
  titleBlock: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  name: {
    ...typography.h4,
    color: colors.nileBlue,
    flexShrink: 1,
  },
  studentBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.accent,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  studentBadgeText: {
    ...typography.labelSmall,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  category: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  metaTextClosed: {
    color: colors.error ?? colors.text.secondary,
    fontWeight: '700',
  },
  metaDot: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  offersLabel: {
    ...typography.label,
    color: colors.nileBlue,
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  cta: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    ...typography.button,
    color: colors.text.inverse,
    fontWeight: '800',
  },
});

const NearUStoreCard = React.memo(NearUStoreCardBase);
export default NearUStoreCard;