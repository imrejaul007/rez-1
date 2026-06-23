/**
 * TravelResultCard — single search result card.
 *
 * Renders one `TravelResult` (flight, hotel, train, cab, or bus) as
 * a self-contained pressable card. The card surfaces:
 *
 *  - Provider badge (e.g. "IndiGo", "OYO", "IRCTC").
 *  - Title (flight number, hotel name, train name, etc.).
 *  - Price in ₹, with a strikethrough `originalPricePaise` when
 *    discounted.
 *  - Optional duration ("2h 45m") and optional star rating.
 *  - A "Select" call-to-action.
 *
 * When `onPress` is supplied the whole card is pressable; tapping
 * anywhere on it triggers the callback. The "Select" button is a
 * styled visual element and does not need its own handler — keeping
 * the surface area small avoids double-fire issues on mobile.
 *
 * Accessibility
 * -------------
 *  - `accessibilityLabel` reads: "<Provider> <Title>, <price> rupees,
 *    duration X, rating Y, Select to continue".
 *  - Role is "button" when `onPress` is set.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice } from '@/utils/priceFormatter';
import type { TravelResult } from '@/types/travel.types';

export interface TravelResultCardProps {
  result: TravelResult;
  onPress?: () => void;
  /** Optional override for the CTA label. */
  ctaLabel?: string;
}

const MS_PER_MINUTE = 60 * 1000;

/** Human-friendly "Xh Ym" duration label. */
function buildDurationLabel(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '';
  const totalMinutes = Math.round(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function TravelResultCardBase({
  result,
  onPress,
  ctaLabel = 'Select',
}: TravelResultCardProps) {
  const priceRupees = useMemo(
    () => formatPrice(result.pricePaise / 100, 'INR', false) ?? '₹0',
    [result.pricePaise],
  );
  const originalRupees = useMemo(() => {
    if (result.originalPricePaise === undefined) return null;
    if (result.originalPricePaise <= result.pricePaise) return null;
    return formatPrice(result.originalPricePaise / 100, 'INR', false) ?? null;
  }, [result.originalPricePaise, result.pricePaise]);

  const durationLabel = useMemo(
    () =>
      typeof result.durationMinutes === 'number'
        ? buildDurationLabel(result.durationMinutes)
        : '',
    [result.durationMinutes],
  );

  const ratingLabel = useMemo(() => {
    if (typeof result.rating !== 'number') return '';
    return `${result.rating.toFixed(1)} ★`;
  }, [result.rating]);

  const a11yParts: string[] = [
    result.provider,
    result.title,
    `Price ${priceRupees}`,
  ];
  if (durationLabel.length > 0) a11yParts.push(`Duration ${durationLabel}`);
  if (ratingLabel.length > 0) a11yParts.push(`Rating ${ratingLabel}`);
  a11yParts.push('Select to continue');
  const a11yLabel = a11yParts.join(', ');

  const inner = (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {result.provider}
          </Text>
        </View>
        {ratingLabel.length > 0 ? (
          <Text style={styles.rating} numberOfLines={1}>
            {ratingLabel}
          </Text>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {result.title}
      </Text>
      <View style={styles.metaRow}>
        {durationLabel.length > 0 ? (
          <Text style={styles.metaText} numberOfLines={1}>
            {durationLabel}
          </Text>
        ) : null}
        {result.category ? (
          <Text style={styles.metaCategory} numberOfLines={1}>
            {result.category.toUpperCase()}
          </Text>
        ) : null}
      </View>
      <View style={styles.priceRow}>
        <View style={styles.priceWrap}>
          <Text style={styles.price} numberOfLines={1}>
            {priceRupees}
          </Text>
          {originalRupees !== null ? (
            <Text style={styles.originalPrice} numberOfLines={1}>
              {originalRupees}
            </Text>
          ) : null}
        </View>
        <View style={styles.ctaWrap}>
          <Text style={styles.ctaText} numberOfLines={1}>
            {ctaLabel}
          </Text>
        </View>
      </View>
    </View>
  );

  if (!onPress) {
    return (
      <View
        accessibilityLabel={a11yLabel}
        style={styles.pressableWrap}
      >
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.pressableWrap, pressed && styles.pressed]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableWrap: {
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  badge: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border.light,
    maxWidth: '70%',
  },
  badgeText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  rating: {
    ...typography.caption,
    color: colors.gold,
    fontWeight: '700',
  },
  title: {
    ...typography.label,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  metaText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  metaCategory: {
    ...typography.caption,
    color: colors.nileBlue,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 1,
  },
  price: {
    ...typography.h3,
    color: colors.nileBlue,
  },
  originalPrice: {
    ...typography.caption,
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
    marginLeft: spacing.sm,
  },
  ctaWrap: {
    backgroundColor: colors.gold,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  ctaText: {
    ...typography.label,
    color: colors.nileBlue,
    fontWeight: '700',
  },
});

const TravelResultCard = React.memo(TravelResultCardBase);
export default TravelResultCard;