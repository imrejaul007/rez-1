/**
 * OfferTile — Standard offer card for Home, Search, Category screens
 *
 * Supports horizontal (list) and vertical (grid) layouts.
 * Uses CachedImage for all images, theme tokens for all styling.
 *
 * @example
 * <OfferTile
 *   title="50% Off Burgers"
 *   imageUri="https://..."
 *   discount="50%"
 *   storeName="Burger King"
 *   validUntil="Mar 31"
 *   onPress={() => router.push(`/offers/${id}`)}
 * />
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import CachedImage from './CachedImage';

// ============================================================================
// Types
// ============================================================================

interface OfferTileProps {
  /** Offer title */
  title: string;
  /** Short description or subtitle */
  description?: string;
  /** Cover image URL */
  imageUri?: string;
  /** Discount label (e.g., "50% OFF", "₹200 Cashback") */
  discount?: string;
  /** Expiry label (e.g., "Mar 31", "2 days left") */
  validUntil?: string;
  /** Store name */
  storeName?: string;
  /** Store logo URL */
  storeLogoUri?: string;
  /** Offer type for visual distinction */
  offerType?: 'cashback' | 'discount' | 'voucher' | 'combo' | 'special';
  /** Press handler */
  onPress?: () => void;
  /** Layout variant */
  variant?: 'horizontal' | 'vertical';
  /** Test ID */
  testID?: string;
}

// ============================================================================
// Type colors
// ============================================================================

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  cashback: { bg: colors.successScale[50], text: colors.successScale[700] },
  discount: { bg: colors.errorScale[50], text: colors.errorScale[500] },
  voucher: { bg: colors.tint.purple, text: colors.brand.purple },
  combo: { bg: colors.tint.orange, text: colors.brand.orange },
  special: { bg: colors.tint.amberLight, text: colors.brand.amberDark },
};

// ============================================================================
// Component
// ============================================================================

function OfferTile({
  title,
  description,
  imageUri,
  discount,
  validUntil,
  storeName,
  storeLogoUri,
  offerType = 'discount',
  onPress,
  variant = 'vertical',
  testID,
}: OfferTileProps) {
  const typeColor = TYPE_COLORS[offerType] || TYPE_COLORS.discount;

  if (variant === 'horizontal') {
    return (
      <Pressable
        style={({ pressed }) => [
          hStyles.card,
          pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
        ]}
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${title}${discount ? `, ${discount}` : ''}`}
      >
        {/* Image */}
        <View style={hStyles.imageContainer}>
          {imageUri ? (
            <CachedImage
              source={{ uri: imageUri }}
              style={hStyles.image}
              contentFit="cover"
            />
          ) : (
            <View style={hStyles.imagePlaceholder}>
              <Ionicons name="pricetag-outline" size={24} color={colors.neutral[300]} />
            </View>
          )}
          {discount && (
            <View style={[hStyles.discountBadge, { backgroundColor: typeColor.bg }]}>
              <Text style={[hStyles.discountText, { color: typeColor.text }]}>
                {discount}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={hStyles.content}>
          {storeName && (
            <View style={hStyles.storeRow}>
              {storeLogoUri ? (
                <CachedImage source={{ uri: storeLogoUri }} style={hStyles.storeLogo} contentFit="cover" />
              ) : null}
              <Text style={hStyles.storeName} numberOfLines={1}>{storeName}</Text>
            </View>
          )}
          <Text style={hStyles.title} numberOfLines={2}>{title}</Text>
          {description && (
            <Text style={hStyles.description} numberOfLines={1}>{description}</Text>
          )}
          {validUntil && (
            <View style={hStyles.validityRow}>
              <Ionicons name="time-outline" size={12} color={colors.neutral[400]} />
              <Text style={hStyles.validityText}>{validUntil}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  // Vertical (grid) variant
  return (
    <Pressable
      style={({ pressed }) => [
        vStyles.card,
        pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}${discount ? `, ${discount}` : ''}`}
    >
      {/* Image */}
      <View style={vStyles.imageContainer}>
        {imageUri ? (
          <CachedImage
            source={{ uri: imageUri }}
            style={vStyles.image}
            contentFit="cover"
          />
        ) : (
          <View style={vStyles.imagePlaceholder}>
            <Ionicons name="pricetag-outline" size={32} color={colors.neutral[300]} />
          </View>
        )}
        {discount && (
          <View style={[vStyles.discountBadge, { backgroundColor: typeColor.bg }]}>
            <Text style={[vStyles.discountText, { color: typeColor.text }]}>
              {discount}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={vStyles.content}>
        <Text style={vStyles.title} numberOfLines={2}>{title}</Text>
        {storeName && (
          <View style={vStyles.storeRow}>
            {storeLogoUri ? (
              <CachedImage source={{ uri: storeLogoUri }} style={vStyles.storeLogo} contentFit="cover" />
            ) : null}
            <Text style={vStyles.storeName} numberOfLines={1}>{storeName}</Text>
          </View>
        )}
        {validUntil && (
          <Text style={vStyles.validityText}>{validUntil}</Text>
        )}
      </View>
    </Pressable>
  );
}

// ============================================================================
// Horizontal Styles
// ============================================================================

const hStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderRadius: 14,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  imageContainer: {
    width: 110,
    height: 100,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    ...typography.overline,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    gap: 3,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  storeLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  storeName: {
    ...typography.labelSmall,
    color: colors.neutral[500],
    flex: 1,
  },
  title: {
    ...typography.label,
    color: colors.text.primary,
  },
  description: {
    ...typography.bodySmall,
    color: colors.neutral[500],
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  validityText: {
    ...typography.overline,
    color: colors.neutral[400],
    textTransform: 'none',
    letterSpacing: 0,
  },
});

// ============================================================================
// Vertical (Grid) Styles
// ============================================================================

const vStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 14,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    ...typography.overline,
    fontWeight: '700',
  },
  content: {
    padding: spacing.md,
    gap: 3,
  },
  title: {
    ...typography.label,
    color: colors.text.primary,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  storeLogo: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  storeName: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    flex: 1,
  },
  validityText: {
    ...typography.overline,
    color: colors.neutral[400],
    textTransform: 'none',
    letterSpacing: 0,
  },
});

export default React.memo(OfferTile);
