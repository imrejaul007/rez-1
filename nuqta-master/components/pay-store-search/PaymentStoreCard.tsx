/**
 * PaymentStoreCard Component
 *
 * Premium store card with detailed information display.
 * Shows: tags, ratings, distance, delivery time, open status, offers, features
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import {
  PaymentStoreCardProps,
  SEARCH_ANIMATIONS,
} from '@/types/paymentStoreSearch.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = {
  damping: SEARCH_ANIMATIONS.pressScale.damping,
  stiffness: SEARCH_ANIMATIONS.pressScale.stiffness,
};

// New Color Palette
const COLORS = {
  primary: colors.lightMustard,           // Light Mustard
  primaryDark: '#e6b84e',
  primaryLight: 'rgba(255, 205, 87, 0.12)',  // Mustard light
  primaryGlow: 'rgba(255, 205, 87, 0.15)',   // Mustard glow
  nileBlue: colors.nileBlue,

  // Status colors
  open: colors.success,
  closed: colors.error,

  // Tag colors
  tagTop: colors.brand.orange,
  tagBrand: colors.infoScale[400],
  tagHot: colors.error,
  tagLocal: colors.lightMustard,
  tagOnline: colors.neutral[500],
  tagVerified: colors.brand.purpleLight,
  tagFast: colors.brand.cyan,
  tagPremium: colors.warningScale[400],
  tagOrganic: colors.success,

  // Partner levels
  partnerBronze: '#CD7F32',
  partnerSilver: '#C0C0C0',
  partnerGold: colors.brand.goldBright,
  partnerPlatinum: '#E5E4E2',

  // Category logo colors
  grocery: colors.brand.orange,
  fashion: colors.brand.purpleLight,
  restaurant: colors.error,
  organic: colors.success,
  electronics: colors.infoScale[400],
  entertainment: colors.brand.pink,
  travel: colors.brand.cyan,
  beauty: '#F472B6',
  default: colors.brand.navyDark,

  // Text
  textPrimary: colors.neutral[800],
  textSecondary: colors.neutral[500],
  textMuted: colors.neutral[400],

  // Backgrounds
  surface: colors.background.primary,
  glassWhite: 'rgba(255, 255, 255, 0.92)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',

  // Rating
  ratingBg: colors.tint.amberLight,
  ratingStar: colors.warningScale[400],
};

export const PaymentStoreCard: React.FC<PaymentStoreCardProps> = ({
  store,
  onPress,
  onView,
  index = 0,
  variant = 'full',
  showCTA = true,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, SPRING_CONFIG);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Helper functions
  const formatDistance = (distance?: number): string => {
    if (!distance) return '';
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  const formatOrders = (count?: number): string => {
    if (!count) return '';
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k+ orders`;
    return `${count}+ orders`;
  };

  const getCategoryColor = (categoryName: string): string => {
    const category = (categoryName || '').toLowerCase();
    if (category.includes('grocery') || category.includes('supermarket')) return COLORS.grocery;
    if (category.includes('fashion') || category.includes('clothing')) return COLORS.fashion;
    if (category.includes('restaurant') || category.includes('food') || category.includes('cafe')) return COLORS.restaurant;
    if (category.includes('organic') || category.includes('health')) return COLORS.organic;
    if (category.includes('electronics') || category.includes('tech')) return COLORS.electronics;
    if (category.includes('entertainment') || category.includes('cinema')) return COLORS.entertainment;
    if (category.includes('travel')) return COLORS.travel;
    if (category.includes('beauty') || category.includes('salon')) return COLORS.beauty;
    return COLORS.default;
  };

  const getPartnerColor = (level?: string): string => {
    switch (level) {
      case 'platinum': return COLORS.partnerPlatinum;
      case 'gold': return COLORS.partnerGold;
      case 'silver': return COLORS.partnerSilver;
      case 'bronze': return COLORS.partnerBronze;
      default: return COLORS.primary;
    }
  };

  const getAccentColor = (): string => {
    if (store.isFeatured) return COLORS.tagTop;
    if (store.isBrand) return COLORS.tagBrand;
    if (store.isHot) return COLORS.tagHot;
    if (store.isLocal) return COLORS.tagLocal;
    if (store.deliveryCategories?.premium) return COLORS.tagPremium;
    if (store.deliveryCategories?.organic) return COLORS.tagOrganic;
    return COLORS.primary;
  };

  // Compact variant
  if (variant === 'compact') {
    const logoColor = getCategoryColor(store.category?.name || '');
    return (
      <AnimatedPressable
        onPress={() => onPress(store)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        entering={FadeInDown.delay(index * 60).springify().damping(15)}
        style={[styles.compactContainer, animatedStyle]}
      >
        <View style={[styles.compactLogo, { backgroundColor: store.logo ? colors.neutral[100] : logoColor }]}>
          {store.logo ? (
            <CachedImage source={{ uri: store.logo }} style={styles.compactLogoImage} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <Ionicons name="storefront" size={22} color={colors.background.primary} />
          )}
        </View>
        <Text style={styles.compactName} numberOfLines={2}>{store.name}</Text>
        {store.distance !== undefined && (
          <Text style={styles.compactDistance}>{formatDistance(store.distance)}</Text>
        )}
      </AnimatedPressable>
    );
  }

  // Full variant - Build data
  const logoColor = getCategoryColor(store.category?.name || '');
  const accentColor = getAccentColor();
  // Get cashback/discount percentage (prioritize offers.cashback which has actual data)
  const discount = store.offers?.cashback || store.offers?.discount || store.maxCashback;
  const isOpen = store.isOpen ?? store.operationalInfo?.isOpenNow ?? true;

  // Build tags array
  const tags: { label: string; color: string; icon: string }[] = [];
  if (store.isFeatured) tags.push({ label: 'Top', color: COLORS.tagTop, icon: 'trophy' });
  if (store.isBrand) tags.push({ label: 'Brand', color: COLORS.tagBrand, icon: 'ribbon' });
  if (store.isHot) tags.push({ label: 'Hot', color: COLORS.tagHot, icon: 'flame' });
  if (store.isLocal) tags.push({ label: 'Local', color: COLORS.tagLocal, icon: 'leaf' });
  if (store.isOnline) tags.push({ label: 'Online', color: COLORS.tagOnline, icon: 'globe' });
  if (store.isVerified) tags.push({ label: 'Verified', color: COLORS.tagVerified, icon: 'checkmark-circle' });

  // Build feature badges
  const features: { label: string; color: string; icon: string }[] = [];
  if (store.deliveryCategories?.fastDelivery) features.push({ label: 'Fast', color: COLORS.tagFast, icon: 'flash' });
  if (store.deliveryCategories?.premium) features.push({ label: 'Premium', color: COLORS.tagPremium, icon: 'diamond' });
  if (store.deliveryCategories?.organic) features.push({ label: 'Organic', color: COLORS.tagOrganic, icon: 'leaf' });
  if (store.deliveryCategories?.lowestPrice) features.push({ label: 'Best Price', color: COLORS.primary, icon: 'pricetag' });

  return (
    <AnimatedPressable
      onPress={() => onPress(store)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      entering={FadeInDown.delay(index * 80).springify().damping(15)}
      style={[styles.card, animatedStyle]}
    >
      {/* Left Accent */}
      <View style={[styles.accent, { backgroundColor: accentColor }]} />

      <View style={styles.cardContent}>
        {/* Row 1: Logo + Info + Discount */}
        <View style={styles.topRow}>
          {/* Logo */}
          <View style={[styles.logo, { backgroundColor: store.logo ? colors.tint.coolGray : logoColor }]}>
            {store.logo ? (
              <CachedImage source={{ uri: store.logo }} style={styles.logoImage} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <Ionicons name="storefront" size={26} color={colors.background.primary} />
            )}
            {/* Partner Badge on Logo */}
            {store.offers?.partnerLevel && (
              <View style={[styles.partnerBadge, { backgroundColor: getPartnerColor(store.offers.partnerLevel) }]}>
                <Ionicons name="star" size={8} color={colors.background.primary} />
              </View>
            )}
          </View>

          {/* Store Info */}
          <View style={styles.info}>
            {/* Name Row with Tags */}
            <View style={styles.nameRow}>
              <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
              {tags.length > 0 && (
                <View style={styles.tagsInline}>
                  {tags.slice(0, 2).map((tag, i) => (
                    <View key={i} style={[styles.tagSmall, { backgroundColor: tag.color }]}>
                      <Ionicons name={tag.icon as any} size={9} color={colors.background.primary} />
                      <Text style={styles.tagSmallText}>{tag.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Category */}
            <Text style={styles.category}>{store.category?.name || 'General'}</Text>

            {/* Meta Row: Rating + Distance + Orders */}
            <View style={styles.metaRow}>
              {store.ratings?.average > 0 && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={10} color={COLORS.ratingStar} />
                  <Text style={styles.ratingText}>{store.ratings.average.toFixed(1)}</Text>
                  <Text style={styles.ratingCount}>({store.ratings.count})</Text>
                </View>
              )}
              {store.distance !== undefined && (
                <View style={styles.distanceBadge}>
                  <Ionicons name="location" size={10} color={COLORS.primary} />
                  <Text style={styles.distanceText}>{formatDistance(store.distance)}</Text>
                </View>
              )}
              {store.analytics?.totalOrders && store.analytics.totalOrders > 50 && (
                <Text style={styles.ordersText}>{formatOrders(store.analytics.totalOrders)}</Text>
              )}
            </View>
          </View>

          {/* Discount Badge */}
          {discount && discount > 0 && (
            <View style={styles.discountBadge}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.discountGradient}>
                <Ionicons name="pricetag" size={10} color={colors.nileBlue} />
                <Text style={styles.discountText}>{discount}%</Text>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* Row 2: Features + Open Status */}
        <View style={styles.featuresRow}>
          {/* Feature badges */}
          {features.length > 0 && (
            <View style={styles.featureBadges}>
              {features.slice(0, 3).map((f, i) => (
                <View key={i} style={[styles.featureBadge, { backgroundColor: `${f.color}15` }]}>
                  <Ionicons name={f.icon as any} size={10} color={f.color} />
                  <Text style={[styles.featureText, { color: f.color }]}>{f.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Delivery Time */}
          {store.operationalInfo?.deliveryTime && (
            <View style={styles.deliveryBadge}>
              <Ionicons name="time-outline" size={11} color={COLORS.textSecondary} />
              <Text style={styles.deliveryText}>{store.operationalInfo.deliveryTime}</Text>
            </View>
          )}

          {/* Open/Closed Status */}
          <View style={[styles.statusBadge, { backgroundColor: isOpen ? `${COLORS.open}15` : `${COLORS.closed}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: isOpen ? COLORS.open : COLORS.closed }]} />
            <Text style={[styles.statusText, { color: isOpen ? COLORS.open : COLORS.closed }]}>
              {isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>

        {/* Row 3: Coins Info */}
        {(store.hasRezPay || store.brandedCoinsMessage) && (
          <View style={styles.coinsRow}>
            <Ionicons name={store.hasRezPay ? "wallet" : "gift"} size={14} color={COLORS.nileBlue} />
            <Text style={styles.coinsText}>
              {store.hasRezPay ? `${BRAND.COIN_NAME} accepted here` : store.brandedCoinsMessage}
            </Text>
            {store.operationalInfo?.freeDeliveryAbove && (
              <Text style={styles.freeDeliveryText}>
                Free delivery above {currencySymbol}{store.operationalInfo.freeDeliveryAbove}
              </Text>
            )}
          </View>
        )}

        {/* Row 4: CTA Buttons */}
        {showCTA && (
          <View style={styles.ctaRow}>
            <Pressable style={styles.payButton} onPress={() => onPress(store)}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.payGradient}
              >
                <Text style={styles.payText}>Pay Now</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.nileBlue} />
              </LinearGradient>
            </Pressable>

            {onView && (
              <Pressable style={styles.viewButton} onPress={() => onView(store)}>
                <Text style={styles.viewArrow}>→</Text>
                <Text style={styles.viewText}>View</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  // Main Card
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    flexDirection: 'row',
    backgroundColor: COLORS.glassWhite,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },

  accent: {
    width: 4,
  },

  cardContent: {
    flex: 1,
    padding: 12,
  },

  // Top Row
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  logo: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  logoImage: {
    width: '100%',
    height: '100%',
  },

  partnerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },

  info: {
    flex: 1,
    marginLeft: 10,
    marginRight: 50,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },

  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },

  tagsInline: {
    flexDirection: 'row',
    gap: 4,
  },

  tagSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },

  tagSmallText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.background.primary,
  },

  category: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 8,
  },

  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.ratingBg,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },

  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  ratingCount: {
    fontSize: 9,
    color: COLORS.textMuted,
  },

  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },

  distanceText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
  },

  ordersText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },

  // Discount Badge
  discountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
  },

  discountGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },

  discountText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.nileBlue,  // Nile Blue for contrast
  },

  // Features Row
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
    flexWrap: 'wrap',
  },

  featureBadges: {
    flexDirection: 'row',
    gap: 6,
  },

  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },

  featureText: {
    fontSize: 10,
    fontWeight: '600',
  },

  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  deliveryText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginLeft: 'auto',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Coins Row
  coinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.primaryGlow,
    borderRadius: 8,
    gap: 6,
  },

  coinsText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.nileBlue,
    flex: 1,
  },

  freeDeliveryText: {
    fontSize: 10,
    color: COLORS.nileBlue,
    fontWeight: '500',
  },

  // CTA Row
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },

  payButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },

  payGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 6,
  },

  payText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nileBlue,  // Nile Blue for contrast on Mustard
  },

  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    gap: 4,
  },

  viewArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  viewText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Compact Variant
  compactContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 10,
    width: 100,
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  compactLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },

  compactLogoImage: {
    width: '100%',
    height: '100%',
  },

  compactName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },

  compactDistance: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});

export default React.memo(PaymentStoreCard);
