// @ts-nocheck
/**
 * BestCouponCodes Component
 *
 * Premium section showing verified coupon codes with copy functionality
 * Features: Copy animation, success rate bar, verified/exclusive badges, dashed coupon style
 */

import React, { memo, useState, useEffect, useCallback} from 'react';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { CashStoreCoupon } from '../../../types/cash-store.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface BestCouponCodesProps {
  coupons: CashStoreCoupon[];
  isLoading?: boolean;
  onCouponCopy: (coupon: CashStoreCoupon) => void;
  onViewAllPress: () => void;
}

const CouponCard: React.FC<{
  coupon: CashStoreCoupon;
  index: number;
  onCopy: () => void;
}> = memo(({ coupon, index, onCopy }) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [isCopied, setIsCopied] = useState(false);
  const scaleAnim = useSharedValue(0.9);
  const fadeAnim = useSharedValue(0);
  const copyScaleAnim = useSharedValue(1);
  const checkmarkAnim = useSharedValue(0);

  useEffect(() => {
    // Staggered entry animation
    fadeAnim.value = withDelay(index * 80, withTiming(1, { duration: 400 }));
    scaleAnim.value = withDelay(index * 80, withSpring(1));
  }, [index]);

  const handleCopy = () => {
    copyScaleAnim.value = withTiming(0.9, { duration: 100 });
    copyScaleAnim.value = withSpring(1);

    // Show checkmark animation
    setIsCopied(true);
    checkmarkAnim.value = withTiming(1, { duration: 200 });

    onCopy();

    // Reset after 2 seconds
    setTimeout(() => {
      setIsCopied(false);
      checkmarkAnim.value = withTiming(0, { duration: 200 });
    }, 2000);
  };

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1);
  };

  const discountDisplay =
    coupon.discountType === 'PERCENTAGE'
      ? `${coupon.discountValue}% OFF`
      : `${currencySymbol}${coupon.discountValue} OFF`;

  const successRate = coupon.successRate || 90;

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
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
       
      >
        {/* Verified Badge */}
        {coupon.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={10} color={colors.background.primary} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}

        {/* Exclusive Badge */}
        {coupon.isExclusive && (
          <View style={styles.exclusiveBadge}>
            <Ionicons name="diamond" size={10} color={colors.lightMustard} />
            <Text style={styles.exclusiveText}>Exclusive</Text>
          </View>
        )}

        {/* Brand Logo */}
        <View style={styles.logoContainer}>
          {coupon.brand.logo?.startsWith('http') ? (
            <CachedImage source={coupon.brand.logo} style={styles.brandLogo} contentFit="contain" />
          ) : coupon.brand.logo ? (
            <Text style={{ fontSize: 28 }}>{coupon.brand.logo}</Text>
          ) : (
            <LinearGradient
              colors={[colors.lightPeach, colors.brand.sand]}
              style={styles.logoPlaceholder}
            >
              <Text style={styles.logoInitial}>{coupon.brand.name.charAt(0)}</Text>
            </LinearGradient>
          )}
        </View>

        {/* Brand Name */}
        <Text style={styles.brandName}>{coupon.brand.name}</Text>

        {/* Discount Display */}
        <View style={styles.discountContainer}>
          <Text style={styles.discount}>{discountDisplay}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {coupon.title}
        </Text>

        {/* Min Order */}
        {coupon.minOrderValue && (
          <Text style={styles.minOrder}>Min. order {currencySymbol}{coupon.minOrderValue}</Text>
        )}

        {/* Success Rate Bar */}
        <View style={styles.successRateContainer}>
          <View style={styles.successRateHeader}>
            <Text style={styles.successRateLabel}>Success Rate</Text>
            <Text style={styles.successRateValue}>{successRate}%</Text>
          </View>
          <View style={styles.successRateBarBg}>
            <View style={[styles.successRateBarFill, { width: `${successRate}%` }]} />
          </View>
        </View>

        {/* Code Section with Dashed Border */}
        <View style={styles.codeSection}>
          <View style={styles.codeContainer}>
            <View style={styles.dashedBorder}>
              <Text style={styles.codeText}>{coupon.code}</Text>
            </View>
          </View>
          <Animated.View style={{ transform: [{ scale: copyScaleAnim }] }}>
            <Pressable
              style={[styles.copyButton, isCopied && styles.copyButtonCopied]}
              onPress={handleCopy}
             
            >
              <LinearGradient
                colors={isCopied ? [colors.nileBlue, colors.brand.nileBlueLight] : [colors.brand.sand, colors.brand.caramel]}
                style={styles.copyButtonGradient}
              >
                {isCopied ? (
                  <>
                    <Ionicons name="checkmark" size={14} color={colors.background.primary} />
                    <Text style={styles.copyText}>COPIED</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="copy" size={14} color={colors.background.primary} />
                    <Text style={styles.copyText}>COPY</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>

        {/* Validity */}
        {coupon.validUntil && (
          <View style={styles.validityRow}>
            <Ionicons name="time-outline" size={12} color={colors.neutral[500]} />
            <Text style={styles.validityText}>
              Valid till {new Date(coupon.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

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
        <View style={[styles.logoContainer, styles.skeleton]} />
        <View style={[styles.skeletonText, { width: 80 }]} />
        <View style={[styles.skeletonDiscount]} />
        <View style={[styles.skeletonText, { width: 140 }]} />
        <View style={[styles.skeletonText, { width: 100 }]} />
        <View style={[styles.skeletonCode]} />
      </View>
    </Animated.View>
  );
});

const BestCouponCodes: React.FC<BestCouponCodesProps> = ({
  coupons,
  isLoading = false,
  onCouponCopy,
  onViewAllPress,
}) => {
  const headerFadeAnim = useSharedValue(0);
  const shieldPulseAnim = useSharedValue(1);

  useEffect(() => {
    headerFadeAnim.value = withTiming(1, { duration: 400 });

    // Shield pulse animation
    shieldPulseAnim.value = withRepeat(withSequence(withTiming(1.1, { duration: 600 })), -1);
    
    }, []);

  const renderCouponItem = useCallback(({ item, index }: { item: unknown; index: number }) =>
    isLoading ? (
      <SkeletonCard key={`skeleton-${index}`} index={index} />
    ) : (
      <CouponCard
        coupon={item as CashStoreCoupon}
        index={index}
        onCopy={() => onCouponCopy(item as CashStoreCoupon)}
      />
    ), [isLoading, onCouponCopy]);

  if (coupons.length === 0 && !isLoading) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFadeAnim }]}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <LinearGradient
              colors={[colors.nileBlue, colors.brand.nileBlueLight]}
              style={styles.headerIconContainer}
            >
              <Ionicons name="pricetags" size={18} color={colors.lightMustard} />
            </LinearGradient>
            <Text style={styles.headerTitle}>Best Coupon Codes</Text>
            <Animated.View style={{ transform: [{ scale: shieldPulseAnim }] }}>
              <Ionicons name="shield-checkmark" size={20} color={colors.brand.sand} />
            </Animated.View>
          </View>
          <Text style={styles.subtitle}>Verified & tested daily</Text>
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
        data={isLoading ? Array.from({ length: 3 }) : coupons}
        renderItem={renderCouponItem}
        keyExtractor={(item, index) => (isLoading ? `skeleton-${index}` : (item as CashStoreCoupon).id)}
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
  headerTitle: {
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
    backgroundColor: colors.brand.sand,
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
    width: 220,
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 181, 0.3)',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightPeach,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lightPeach,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.background.primary,
  },
  exclusiveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.linen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  exclusiveText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.lightMustard,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  brandLogo: {
    width: 40,
    height: 40,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.background.primary,
  },
  brandName: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 6,
    fontWeight: '500',
  },
  discountContainer: {
    marginBottom: 8,
  },
  discount: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.brand.sand,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 13,
    color: colors.nileBlue,
    lineHeight: 18,
    marginBottom: 6,
    fontWeight: '500',
  },
  minOrder: {
    fontSize: 11,
    color: colors.neutral[400],
    marginBottom: 12,
  },
  successRateContainer: {
    marginBottom: 14,
  },
  successRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  successRateLabel: {
    fontSize: 10,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  successRateValue: {
    fontSize: 11,
    color: colors.brand.sand,
    fontWeight: '700',
  },
  successRateBarBg: {
    height: 6,
    backgroundColor: colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  successRateBarFill: {
    height: '100%',
    backgroundColor: colors.brand.sand,
    borderRadius: 3,
  },
  codeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  codeContainer: {
    flex: 1,
  },
  dashedBorder: {
    backgroundColor: colors.neutral[50],
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.lightPeach,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.nileBlue,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  copyButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  copyButtonCopied: {},
  copyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  copyText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.5,
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  validityText: {
    fontSize: 11,
    color: colors.neutral[500],
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
  skeletonDiscount: {
    width: 100,
    height: 28,
    backgroundColor: colors.neutral[200],
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonCode: {
    height: 44,
    backgroundColor: colors.neutral[200],
    borderRadius: 10,
    marginTop: 8,
  },
});

export default memo(BestCouponCodes);
