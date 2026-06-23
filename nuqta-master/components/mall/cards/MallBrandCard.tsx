/**
 * MallBrandCard Component
 *
 * Card component for displaying mall store information
 * Clean, modern design with prominent image and clear info hierarchy
 */

import React, { memo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MallBrand, BrandBadge } from '../../../types/mall.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface MallBrandCardProps {
  brand: MallBrand;
  onPress: (brand: MallBrand) => void;
  width?: number;
  showCategory?: boolean;
}

// Nuqta palette gradient colors for fallback backgrounds
const GRADIENT_COLORS: string[][] = [
  [colors.nileBlue, colors.brand.nileBlueLight],
  [colors.brand.sky, colors.brand.skyDark],
  [colors.lavenderMist, colors.nileBlue],
  [colors.brand.nileBlueLight, colors.nileBlue],
  [colors.brand.skyDark, colors.brand.sky],
  [colors.nileBlue, '#2d5c7e'],
  [colors.brand.nileBlueLight, colors.brand.skyDark],
  [colors.brand.sky, colors.nileBlue],
];

const BADGE_COLORS: Record<BrandBadge, { bg: string; text: string }> = {
  exclusive: { bg: colors.brand.sky, text: colors.background.primary },
  premium: { bg: colors.nileBlue, text: colors.background.primary },
  new: { bg: colors.brand.sky, text: colors.background.primary },
  trending: { bg: colors.error, text: colors.background.primary },
  'top-rated': { bg: colors.successScale[700], text: colors.background.primary },
  verified: { bg: colors.brand.purple, text: colors.background.primary },
};

const MallBrandCard: React.FC<MallBrandCardProps> = ({
  brand,
  onPress,
  width = 170,
  showCategory = false,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [imageError, setImageError] = useState(false);

  // For in-app stores (no externalUrl), show Nuqta Coins. For external brands, show cashback.
  const isInAppStore = !brand.externalUrl;
  const rewardPercent = brand.cashback?.percentage ?? 0;

  // Get initials for fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get consistent gradient based on brand name
  const getGradientColors = (name: string): string[] => {
    const index = name.charCodeAt(0) % GRADIENT_COLORS.length;
    return GRADIENT_COLORS[index];
  };

  const brandName = brand.name || 'Brand';
  const gradientColors = getGradientColors(brandName);

  // Get first relevant badge (not tier, not 'new' if already shown as NEW overlay)
  const displayBadge = brand.badges
    ?.filter(b => b !== brand.tier && !(brand.isNewArrival && b === 'new'))
    ?.[0];

  return (
    <Pressable
      style={[styles.container, { width }]}
      onPress={() => onPress(brand)}
     
    >
      <View style={styles.card}>
        {/* Image Area */}
        <View style={styles.imageWrapper}>
          {!imageError && brand.logo ? (
            <CachedImage
              source={brand.logo}
              style={styles.image}
              contentFit="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <LinearGradient
              colors={gradientColors as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imageFallback}
            >
              <Text style={styles.fallbackText}>{getInitials(brandName)}</Text>
            </LinearGradient>
          )}

          {/* Bottom gradient for readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)']}
            style={styles.imageOverlay}
          />

          {/* NEW badge */}
          {brand.isNewArrival && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}

          {/* Coin reward pill - bottom left of image */}
          {rewardPercent > 0 && (
            <View style={styles.coinPill}>
              <Ionicons name="flash" size={10} color={colors.background.primary} />
              <Text style={styles.coinPillText}>{rewardPercent}% coins</Text>
            </View>
          )}
        </View>

        {/* Info Area */}
        <View style={styles.infoArea}>
          {/* Name + verified */}
          <View style={styles.nameRow}>
            <Text style={styles.brandName} numberOfLines={1}>
              {brandName}
            </Text>
            {brand.badges?.includes('verified') && (
              <Ionicons name="checkmark-circle" size={14} color={colors.brand.sky} />
            )}
          </View>

          {/* Rating + Badge row */}
          <View style={styles.metaRow}>
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={10} color={colors.warningScale[400]} />
              <Text style={styles.ratingText}>
                {(brand.ratings?.average || 0) > 0 ? (brand.ratings?.average || 0).toFixed(1) : 'New'}
              </Text>
            </View>
            {displayBadge && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: BADGE_COLORS[displayBadge]?.bg || colors.brand.sky },
                ]}
              >
                <Text style={[styles.badgeText, { color: BADGE_COLORS[displayBadge]?.text || colors.background.primary }]}>
                  {displayBadge.charAt(0).toUpperCase() + displayBadge.slice(1)}
                </Text>
              </View>
            )}
          </View>

          {/* Category */}
          {showCategory && brand.mallCategory && (
            <Text style={styles.categoryText} numberOfLines={1}>
              {brand.mallCategory.name}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 12,
    marginVertical: 4,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8F0F8',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 10px rgba(26, 58, 82, 0.08)',
      },
    }),
  },
  // Image area
  imageWrapper: {
    width: '100%',
    height: 110,
    position: 'relative',
    backgroundColor: '#F0F4F8',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.background.primary,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      android: {
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      web: {
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.5,
  },
  coinPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  coinPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // Info area
  infoArea: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.nileBlue,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9EC',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.amberDark,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryText: {
    fontSize: 11,
    color: colors.neutral[400],
    marginTop: 6,
  },
});

export default memo(MallBrandCard);
