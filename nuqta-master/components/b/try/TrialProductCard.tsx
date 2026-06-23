/**
 * TrialProductCard — single trial-product card for the Try catalogue.
 *
 * Renders one `TrialProduct`:
 *   - Product image (with a brand-coloured placeholder fallback)
 *   - Brand badge (top-left)
 *   - Product name (bold) + one-line description
 *   - "Try for ₹X" pill vs. strikethrough full price
 *   - Duration + rating row
 *   - "Try now" CTA button (or full-card press when `onBook` is provided)
 *
 * Accessibility
 * -------------
 *  - `accessibilityLabel` reads: "<name> by <brand>. Try for ₹<trial>.
 *    Full price ₹<full>. <duration> day trial. Rated <rating> stars.
 *    Button: Try now."
 *  - When `onBook` is provided, role = "button".
 *  - The CTA button is also focusable and labelled separately.
 */
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/constants/theme';
import { formatPrice, formatDiscountString } from '@/utils/priceFormatter';
import type { TrialProduct } from '@/types/try.types';

export interface TrialProductCardProps {
  product: TrialProduct;
  /**
   * Optional book handler. When supplied the entire card is pressable
   * and the inline CTA button is omitted to avoid double-tap confusion.
   */
  onBook?: (id: string) => void;
  /** When true, the CTA button shows a loading state. */
  isBooking?: boolean;
}

/**
 * Map a brand name to a stable accent colour. The hash is intentionally
 * tiny — we just need products in a long list to read distinct.
 */
function brandAccent(brand: string): string {
  const palette = [
    '#1a3a52', // nileBlue
    '#ffcd57', // gold
    '#2ECC71', // emerald
    '#E67E22', // orange
    '#7E57C2', // violet
    '#26A69A', // teal
    '#D81B60', // rose
    '#5D4037', // cocoa
  ];
  let hash = 0;
  for (let i = 0; i < brand.length; i += 1) {
    hash = (hash * 31 + brand.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length] ?? colors.nileBlue;
}

/** Format a one-decimal rating, e.g. 4.3. */
function formatRating(rating: number): string {
  if (!Number.isFinite(rating) || rating <= 0) return 'New';
  const rounded = Math.round(rating * 10) / 10;
  return rounded.toFixed(1);
}

function TrialProductCardBase({
  product,
  onBook,
  isBooking,
}: TrialProductCardProps) {
  const accent = brandAccent(product.brand);

  const trialRupees = useMemo(() => {
    const formatted = formatPrice(product.trialPricePaise / 100, 'INR', false);
    return formatted ?? '—';
  }, [product.trialPricePaise]);

  const fullRupees = useMemo(() => {
    const formatted = formatPrice(product.fullPricePaise / 100, 'INR', false);
    return formatted ?? '—';
  }, [product.fullPricePaise]);

  const discount = useMemo(() => {
    return formatDiscountString(
      product.fullPricePaise / 100,
      product.trialPricePaise / 100,
    );
  }, [product.fullPricePaise, product.trialPricePaise]);

  const accessibilityLabel = useMemo(() => {
    const safeBrand = product.brand || 'Unknown brand';
    return (
      `${product.name} by ${safeBrand}. ` +
      `Try for ${trialRupees}. ` +
      `Full price ${fullRupees}. ` +
      `${product.durationDays}-day trial. ` +
      `Rated ${formatRating(product.rating)} stars. ` +
      `Button: Try now.`
    );
  }, [product, trialRupees, fullRupees]);

  const inner = (
    <View style={[styles.card, { borderColor: accent }]}>
      <View style={styles.headerRow}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={[styles.thumb, { backgroundColor: `${accent}22` }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : (
          <View
            style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: `${accent}22` }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <Text style={[styles.thumbInitial, { color: accent }]}>
              {(product.brand[0] ?? '?').toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.headerText}>
          <View
            style={[styles.brandBadge, { backgroundColor: `${accent}1A`, borderColor: accent }]}
            accessibilityLabel={`Brand: ${product.brand}`}
          >
            <Text style={[styles.brandBadgeText, { color: accent }]} numberOfLines={1}>
              {product.brand}
            </Text>
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          {product.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {product.description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <Text style={styles.trialPrice} accessibilityLabel={`Trial price ${trialRupees}`}>
            {`Try for ${trialRupees}`}
          </Text>
          <Text style={styles.fullPrice} accessibilityElementsHidden importantForAccessibility="no">
            {fullRupees}
          </Text>
          {discount !== null ? (
            <View
              style={[styles.discountBadge, { backgroundColor: accent }]}
              accessibilityLabel={`Save ${discount}`}
            >
              <Text style={styles.discountBadgeText}>{discount}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaRight}>
          <Text style={styles.duration} accessibilityElementsHidden importantForAccessibility="no">
            {`${product.durationDays}-day trial`}
          </Text>
          <Text style={styles.rating} accessibilityElementsHidden importantForAccessibility="no">
            {`★ ${formatRating(product.rating)}`}
          </Text>
        </View>
      </View>

      {onBook ? null : (
        <View
          accessibilityRole="button"
          accessibilityLabel={
            isBooking === true
              ? `Booking ${product.name}, please wait`
              : `Try now: book a trial of ${product.name}`
          }
          style={[styles.ctaBtn, { backgroundColor: accent }]}
        >
          <Text style={styles.ctaBtnText}>
            {isBooking === true ? 'Booking…' : 'Try now'}
          </Text>
        </View>
      )}
    </View>
  );

  if (!onBook) {
    return (
      <View accessibilityLabel={accessibilityLabel} style={styles.wrap}>
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        onBook(product.id);
      }}
      disabled={isBooking === true}
      style={({ pressed }) => [
        styles.wrap,
        pressed && styles.pressed,
        isBooking === true && styles.pressedDisabled,
      ]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: spacing.base,
  },
  pressed: {
    opacity: 0.92,
  },
  pressedDisabled: {
    opacity: 0.5,
  },
  card: {
    borderRadius: borderRadius.lg ?? 16,
    borderWidth: 1,
    backgroundColor: colors.background.primary,
    padding: spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md ?? 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  thumbPlaceholder: {
    borderWidth: 1,
  },
  thumbInitial: {
    ...typography.h2,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
  },
  brandBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full ?? 999,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  brandBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  name: {
    ...typography.h4,
    color: colors.nileBlue,
    fontWeight: '700',
  },
  description: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  metaRight: {
    alignItems: 'flex-end',
  },
  trialPrice: {
    ...typography.label,
    color: colors.success ?? '#2ECC71',
    fontWeight: '800',
    marginRight: spacing.sm,
  },
  fullPrice: {
    ...typography.caption,
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
    marginRight: spacing.sm,
  },
  discountBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full ?? 999,
  },
  discountBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  duration: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  rating: {
    ...typography.caption,
    color: colors.gold ?? '#ffcd57',
    fontWeight: '700',
    marginTop: 2,
  },
  ctaBtn: {
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md ?? 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnPressed: {
    opacity: 0.85,
  },
  ctaBtnDisabled: {
    opacity: 0.5,
  },
  ctaBtnText: {
    ...typography.label,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

const TrialProductCard = React.memo(TrialProductCardBase);
export default TrialProductCard;
