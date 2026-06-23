// @ts-nocheck
/**
 * BuyCouponSection Component
 *
 * Premium section for buying gift cards/coupons with discounts
 * Features: Animated cards, brand-colored headers, savings preview, ratings
 */

import React, { memo, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GiftCardBrand } from '../../../types/cash-store.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface BuyCouponSectionProps {
  brands: GiftCardBrand[];
  isLoading?: boolean;
  onBrandPress: (brand: GiftCardBrand) => void;
  onViewAllPress: () => void;
}

const GiftCardCard: React.FC<{
  brand: GiftCardBrand;
  index: number;
  onPress: () => void;
}> = memo(({ brand, index, onPress }) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const scaleAnim = useSharedValue(0.9);
  const fadeAnim = useSharedValue(0);
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    // Staggered entry animation
    fadeAnim.value = withDelay(index * 80, withTiming(1, { duration: 400 }));
      scaleAnim.value = withDelay(index * 80, withSpring(1));

    // Subtle shimmer on header
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 2000 })), -1);
    
    }, [index]);

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1);
  };

  const isBestValue = brand.cashbackRate && brand.cashbackRate >= 8;
  const minDenom = brand.denominations[0] || 100;
  const maxDenom = brand.denominations[brand.denominations.length - 1] || 10000;
  const potentialSavings = Math.round((maxDenom * (brand.cashbackRate || 0)) / 100);

  // Generate brand gradient colors
  const brandGradient = brand.backgroundColor
    ? [brand.backgroundColor, adjustColor(brand.backgroundColor, -20)]
    : [colors.nileBlue, '#243f55'];

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
       
      >
        {/* Best Value Badge */}
        {isBestValue && (
          <View style={styles.bestValueBadge}>
            <Ionicons name="trophy" size={10} color={colors.background.primary} />
            <Text style={styles.bestValueText}>BEST VALUE</Text>
          </View>
        )}

        {/* Brand Header with Gradient */}
        <LinearGradient
          colors={brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardHeader}
        >
          {/* Decorative elements */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />

          {brand.logo?.startsWith('http') ? (
            <View style={styles.logoWrapper}>
              <CachedImage source={brand.logo} style={styles.brandLogo} contentFit="contain" />
            </View>
          ) : (
            <View style={styles.logoWrapper}>
              <Text style={styles.logoInitial}>{brand.logo || brand.name.charAt(0)}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.brandName} numberOfLines={1}>
            {brand.name}
          </Text>

          {/* Denominations Preview */}
          <Text style={styles.denominationsText}>
            {currencySymbol}{minDenom.toLocaleString()} - {currencySymbol}{maxDenom.toLocaleString()}
          </Text>

          {/* Cashback Highlight */}
          <LinearGradient
            colors={[colors.lightPeach, colors.brand.sand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cashbackBadge}
          >
            <Ionicons name="gift" size={12} color={colors.background.primary} />
            <Text style={styles.cashbackText}>{brand.cashbackRate}% Cashback</Text>
          </LinearGradient>

          {/* Potential Savings Preview */}
          {potentialSavings > 0 && (
            <View style={styles.savingsRow}>
              <Ionicons name="wallet-outline" size={12} color={colors.nileBlue} />
              <Text style={styles.savingsText}>Save up to {currencySymbol}{potentialSavings.toLocaleString()}</Text>
            </View>
          )}

          {/* Badges */}
          <View style={styles.badgeRow}>
            {brand.isNewlyAdded && (
              <View style={[styles.badge, styles.newBadge]}>
                <Ionicons name="sparkles" size={8} color={colors.nileBlue} />
                <Text style={[styles.badgeText, { color: colors.nileBlue }]}>NEW</Text>
              </View>
            )}
            {brand.isFeatured && (
              <View style={[styles.badge, styles.featuredBadge]}>
                <Ionicons name="star" size={8} color={colors.lightMustard} />
                <Text style={[styles.badgeText, { color: colors.lightMustard }]}>Featured</Text>
              </View>
            )}
          </View>

          {/* Rating */}
          {brand.rating && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={colors.lightMustard} />
              <Text style={styles.ratingText}>{brand.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({brand.reviewCount || 0})</Text>
            </View>
          )}
        </View>

        {/* Buy Button */}
        <Pressable style={styles.buyButton} onPress={onPress}>
          <LinearGradient
            colors={[colors.lightPeach, colors.brand.sand]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buyButtonGradient}
          >
            <Text style={styles.buyButtonText}>Buy Now</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.background.primary} />
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
});

// Helper function to adjust color brightness
function adjustColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

const SkeletonCard: React.FC<{ index: number }> = memo(({ index }) => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 })), -1);
    
    }, [index]);

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: interpolate(shimmerAnim.value, [0, 1], [0.5, 1]),
        },
      ]}
    >
      <View style={styles.card}>
        <View style={[styles.cardHeader, styles.skeleton]} />
        <View style={styles.cardContent}>
          <View style={[styles.skeletonText, { width: 100 }]} />
          <View style={[styles.skeletonText, { width: 80 }]} />
          <View style={[styles.skeletonBadge]} />
        </View>
        <View style={[styles.skeletonButton]} />
      </View>
    </Animated.View>
  );
});

const BuyCouponSection: React.FC<BuyCouponSectionProps> = ({
  brands,
  isLoading = false,
  onBrandPress,
  onViewAllPress,
}) => {
  const headerFadeAnim = useSharedValue(0);
  const giftBounceAnim = useSharedValue(0);

  useEffect(() => {
    headerFadeAnim.value = withTiming(1, { duration: 400 });

    // Gift icon bounce animation
    giftBounceAnim.value = withRepeat(withSequence(withTiming(-4, { duration: 400 })), -1);
    
    }, []);

  const renderGiftCardItem = useCallback(({ item, index }: { item: unknown; index: number }) =>
    isLoading ? (
      <SkeletonCard key={`skeleton-${index}`} index={index} />
    ) : (
      <GiftCardCard
        brand={item as GiftCardBrand}
        index={index}
        onPress={() => onBrandPress(item as GiftCardBrand)}
      />
    ), [isLoading, onBrandPress]);

  if (brands.length === 0 && !isLoading) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFadeAnim }]}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <LinearGradient
              colors={[colors.brand.sand, colors.brand.caramel]}
              style={styles.headerIconContainer}
            >
              <Ionicons name="card" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.title}>Buy Coupon & Save</Text>
            <Animated.View style={{ transform: [{ translateY: giftBounceAnim }] }}>
              <Ionicons name="gift" size={20} color={colors.nileBlue} />
            </Animated.View>
          </View>
          <Text style={styles.subtitle}>Get extra cashback on gift cards</Text>
        </View>
        <Pressable
          onPress={onViewAllPress}
          style={styles.viewAllButton}
         
        >
          <Text style={styles.viewAllText}>View All</Text>
          <View style={styles.viewAllArrow}>
            <Ionicons name="chevron-forward" size={14} color={colors.background.primary} />
          </View>
        </Pressable>
      </Animated.View>

      {/* Horizontal List */}
      <FlashList
        data={isLoading ? Array.from({ length: 4 }) : brands}
        renderItem={renderGiftCardItem}
        keyExtractor={(item, index) => (isLoading ? `skeleton-${index}` : (item as GiftCardBrand).id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        estimatedItemSize={150}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    backgroundColor: colors.background.primary,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.nileBlue,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background.primary,
  },
  viewAllArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  cardWrapper: {
    marginRight: 12,
  },
  card: {
    width: 175,
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bestValueBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightMustard,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    zIndex: 10,
  },
  bestValueText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.5,
  },
  cardHeader: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  logoWrapper: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  brandLogo: {
    width: 40,
    height: 40,
  },
  logoInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.nileBlue,
  },
  cardContent: {
    padding: 14,
  },
  brandName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 4,
  },
  denominationsText: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 10,
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    marginBottom: 10,
  },
  cashbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    backgroundColor: colors.linen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  newBadge: {
    backgroundColor: colors.lavenderMist,
  },
  featuredBadge: {
    backgroundColor: colors.linen,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  reviewCount: {
    fontSize: 11,
    color: colors.neutral[400],
  },
  buyButton: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  buyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
  },
  // Skeleton
  skeleton: {
    backgroundColor: colors.neutral[200],
  },
  skeletonText: {
    height: 14,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonBadge: {
    width: 100,
    height: 28,
    backgroundColor: colors.neutral[200],
    borderRadius: 10,
    marginBottom: 8,
  },
  skeletonButton: {
    height: 44,
    backgroundColor: colors.neutral[200],
  },
});

export default memo(BuyCouponSection);
