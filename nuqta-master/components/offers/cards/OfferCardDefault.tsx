/**
 * OfferCardDefault Component (220px width)
 *
 * Standard offer card for horizontal scroll sections
 * ReZ brand styling
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { DiscountBadge } from '../common/DiscountBadge';
import { Typography, Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface OfferCardDefaultProps {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  storeName: string;
  storeLogo?: string;
  cashbackPercentage: number;
  saveAmount?: number;
  rating?: number;
  distance?: string;
  deliveryTime?: string;
  deliveryFee?: number;
  isFreeDelivery?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  onPress: () => void;
}

export const OfferCardDefault: React.FC<OfferCardDefaultProps> = ({
  id,
  title,
  subtitle,
  image,
  storeName,
  storeLogo,
  cashbackPercentage,
  saveAmount,
  rating,
  distance,
  deliveryTime,
  deliveryFee,
  isFreeDelivery,
  isNew,
  isTrending,
  onPress,
}) => {
  const { theme, isDark } = useOffersTheme();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const styles = StyleSheet.create({
    container: {
      width: 220,
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: isDark ? theme.colors.border.light : colors.neutral[200],
      overflow: 'hidden',
      ...(isDark ? {} : Shadows.medium),
    },
    imageContainer: {
      height: 130,
      position: 'relative',
      backgroundColor: '#F7FAFC',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    badgeContainer: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      gap: 6,
    },
    newBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.primary[600],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    newBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.background.primary,
      marginLeft: 3,
    },
    trendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.error,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    trendingBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.background.primary,
      marginLeft: 3,
    },
    cashbackBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.primary[600],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    cashbackText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.background.primary,
    },
    storeLogoContainer: {
      position: 'absolute',
      bottom: -18,
      left: 12,
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.background.primary,
      borderWidth: 2,
      borderColor: colors.background.primary,
      overflow: 'hidden',
      ...Shadows.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    storeLogo: {
      width: 36,
      height: 36,
    },
    storeLogoPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: Colors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
    },
    storeLogoText: {
      color: colors.background.primary,
      fontSize: 18,
      fontWeight: '700',
    },
    content: {
      padding: Spacing.md,
      paddingTop: Spacing.lg + 4,
    },
    storeName: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.text.tertiary,
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text.secondary,
      marginBottom: Spacing.sm,
    },
    saveRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: Spacing.sm,
    },
    saveAmount: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: Colors.primary[700],
      marginRight: 4,
    },
    savePercent: {
      fontSize: 11,
      fontWeight: '500' as const,
      color: theme.colors.text.tertiary,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    deliveryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    freeDeliveryBadge: {
      backgroundColor: colors.linen,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      marginRight: 6,
    },
    freeDeliveryText: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.nileBlue,
    },
    deliveryText: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tint.amberLight,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    ratingText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.warningScale[700],
      marginLeft: 2,
    },
  });

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
     
    >
      <View style={styles.imageContainer}>
        <CachedImage
          source={image}
          style={styles.image}
          contentFit="cover"
        />

        {/* Top Left Badges */}
        <View style={styles.badgeContainer}>
          {isNew && (
            <View style={styles.newBadge}>
              <Ionicons name="sparkles" size={10} color={colors.background.primary} />
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          {isTrending && !isNew && (
            <View style={styles.trendingBadge}>
              <Ionicons name="trending-up" size={10} color={colors.background.primary} />
              <Text style={styles.trendingBadgeText}>HOT</Text>
            </View>
          )}
        </View>

        {/* Cashback badge */}
        {cashbackPercentage > 0 && (
          <View style={styles.cashbackBadge}>
            <Text style={styles.cashbackText}>{cashbackPercentage}% Cashback</Text>
          </View>
        )}

        {/* Store Logo */}
        <View style={styles.storeLogoContainer}>
          {storeLogo ? (
            <CachedImage
              source={storeLogo}
              style={styles.storeLogo}
              contentFit="contain"
            />
          ) : (
            <View style={styles.storeLogoPlaceholder}>
              <Text style={styles.storeLogoText}>
                {storeName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.storeName} numberOfLines={1}>
          {storeName}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>

        {/* Savings display — ₹ amount when available, % fallback */}
        {(saveAmount != null && saveAmount > 0) ? (
          <View style={styles.saveRow}>
            <Text style={styles.saveAmount}>SAVE {currencySymbol}{saveAmount.toLocaleString()}</Text>
            <Text style={styles.savePercent}>({cashbackPercentage}%)</Text>
          </View>
        ) : cashbackPercentage > 0 ? (
          <View style={styles.saveRow}>
            <Text style={styles.saveAmount}>Up to {cashbackPercentage}% off</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.deliveryInfo}>
            {isFreeDelivery ? (
              <View style={styles.freeDeliveryBadge}>
                <Text style={styles.freeDeliveryText}>FREE</Text>
              </View>
            ) : deliveryFee !== undefined ? (
              <Text style={styles.deliveryText}>
                {currencySymbol}{deliveryFee.toFixed(0)}
              </Text>
            ) : null}
            {deliveryTime && (
              <Text style={styles.deliveryText}>
                {isFreeDelivery || deliveryFee !== undefined ? ' · ' : ''}
                {deliveryTime}
              </Text>
            )}
            {distance && (
              <Text style={styles.deliveryText}> · {distance}</Text>
            )}
          </View>

          {rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={10} color={colors.warningScale[700]} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default React.memo(OfferCardDefault);
