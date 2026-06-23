/**
 * OfferCardList Component (Full width)
 *
 * Horizontal list card for detailed view
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
import { CountdownTimer } from '../common/CountdownTimer';
import { Spacing, BorderRadius, Shadows, Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface OfferCardListProps {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  storeName: string;
  storeLogo?: string;
  cashbackPercentage?: number;
  discountPercentage?: number;
  rating?: number;
  distance?: string;
  redemptionCount?: number;
  expiresAt?: string;
  isNew?: boolean;
  isTrending?: boolean;
  isFreeDelivery?: boolean;
  onPress: () => void;
}

export const OfferCardList: React.FC<OfferCardListProps> = ({
  id,
  title,
  subtitle,
  image,
  storeName,
  storeLogo,
  cashbackPercentage,
  discountPercentage,
  rating,
  distance,
  redemptionCount,
  expiresAt,
  isNew,
  isTrending,
  isFreeDelivery,
  onPress,
}) => {
  const { theme, isDark } = useOffersTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: isDark ? theme.colors.border.light : colors.neutral[200],
      overflow: 'hidden',
      marginHorizontal: Spacing.base,
      marginBottom: Spacing.md,
      ...(isDark ? {} : Shadows.medium),
    },
    imageContainer: {
      width: 110,
      height: 'auto',
      minHeight: 110,
      position: 'relative',
      backgroundColor: '#F7FAFC',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    badgeContainer: {
      position: 'absolute',
      top: 8,
      left: 8,
    },
    newBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.primary[600],
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 5,
    },
    newBadgeText: {
      fontSize: 8,
      fontWeight: '700',
      color: colors.background.primary,
      marginLeft: 2,
    },
    trendingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.error,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 5,
    },
    trendingBadgeText: {
      fontSize: 8,
      fontWeight: '700',
      color: colors.background.primary,
      marginLeft: 2,
    },
    storeLogoOverlay: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      width: 28,
      height: 28,
      borderRadius: 7,
      backgroundColor: colors.background.primary,
      borderWidth: 1.5,
      borderColor: colors.background.primary,
      overflow: 'hidden',
      ...Shadows.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    storeLogoSmall: {
      width: 22,
      height: 22,
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
      fontSize: 12,
      fontWeight: '700',
    },
    content: {
      flex: 1,
      padding: Spacing.md,
      justifyContent: 'space-between',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    titleContainer: {
      flex: 1,
      marginRight: Spacing.sm,
    },
    storeName: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.text.tertiary,
      marginBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginBottom: 2,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    discountContainer: {
      alignItems: 'flex-end',
    },
    discountBadge: {
      backgroundColor: colors.errorScale[100],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    discountText: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.error,
    },
    cashbackBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(0, 192, 106, 0.1)' : '#E6F9F0',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      marginTop: 4,
    },
    cashbackText: {
      fontSize: 10,
      fontWeight: '700',
      color: Colors.primary[600],
      marginLeft: 3,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.sm,
    },
    metaInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaText: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
      marginLeft: 3,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tint.amberLight,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    ratingText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.warningScale[700],
      marginLeft: 2,
    },
    freeDeliveryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tint.green,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    freeDeliveryText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.successScale[700],
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

        {/* Top Left Badge */}
        <View style={styles.badgeContainer}>
          {isNew && (
            <View style={styles.newBadge}>
              <Ionicons name="sparkles" size={8} color={colors.background.primary} />
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          {isTrending && !isNew && (
            <View style={styles.trendingBadge}>
              <Ionicons name="trending-up" size={8} color={colors.background.primary} />
              <Text style={styles.trendingBadgeText}>HOT</Text>
            </View>
          )}
        </View>

        {/* Store Logo */}
        <View style={styles.storeLogoOverlay}>
          {storeLogo ? (
            <CachedImage
              source={storeLogo}
              style={styles.storeLogoSmall}
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
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.storeName} numberOfLines={1}>
              {storeName}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          <View style={styles.discountContainer}>
            {discountPercentage && discountPercentage > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
              </View>
            )}
            {cashbackPercentage && cashbackPercentage > 0 && (
              <View style={styles.cashbackBadge}>
                <Ionicons name="wallet-outline" size={10} color={Colors.primary[600]} />
                <Text style={styles.cashbackText}>+{cashbackPercentage}%</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.metaInfo}>
            {rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={10} color={colors.warningScale[700]} />
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              </View>
            )}
            {distance && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="location"
                  size={11}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.metaText}>{distance}</Text>
              </View>
            )}
            {redemptionCount && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="people"
                  size={11}
                  color={theme.colors.text.tertiary}
                />
                <Text style={styles.metaText}>{redemptionCount}+</Text>
              </View>
            )}
            {isFreeDelivery && (
              <View style={styles.freeDeliveryBadge}>
                <Ionicons name="bicycle" size={10} color={colors.successScale[700]} />
                <Text style={styles.freeDeliveryText}>FREE</Text>
              </View>
            )}
          </View>

          {expiresAt && (
            <CountdownTimer endTime={expiresAt} size="small" showIcon={false} />
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default React.memo(OfferCardList);
