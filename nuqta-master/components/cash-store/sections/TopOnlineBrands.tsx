// @ts-nocheck
/**
 * TopOnlineBrands Component
 *
 * Horizontal scrolling brand cards with glassmorphism design
 * Warm peach palette with frosted glass cards
 */

import React, { memo, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CashStoreBrand } from '../../../types/cash-store.types';
import { colors } from '@/constants/theme';

interface TopOnlineBrandsProps {
  brands: CashStoreBrand[];
  isLoading?: boolean;
  onBrandPress: (brand: CashStoreBrand) => void;
  onViewAllPress: () => void;
  totalBrandsCount?: number;
  activeFilter?: string;
  onResetFilter?: () => void;
}

// ─── Brand Card (Glassmorphism) ─────────────────────────────
const BrandCard: React.FC<{
  brand: CashStoreBrand;
  index: number;
  onPress: () => void;
}> = memo(({ brand, index, onPress }) => {
  const scaleAnim = useSharedValue(0.9);
  const fadeAnim = useSharedValue(0);
  const pressAnim = useSharedValue(1);

  useEffect(() => {
    fadeAnim.value = withDelay(index * 60, withTiming(1, { duration: 350 }));
      scaleAnim.value = withDelay(index * 60, withSpring(1));
    
}, [index]);

  const handlePressIn = () => {
    pressAnim.value = withSpring(0.94);
  };

  const handlePressOut = () => {
    pressAnim.value = withSpring(1);
  };

  const isHot = brand.cashbackRate && brand.cashbackRate >= 10;

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim.value * pressAnim.value }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
       
        style={styles.cardTouchable}
      >
        {/* Glassmorphism card background */}
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,245,238,0.7)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Hot indicator */}
          {isHot && (
            <View style={styles.hotDot}>
              <Ionicons name="flame" size={7} color={colors.background.primary} />
            </View>
          )}

          {/* Logo */}
          <View style={styles.logoArea}>
            {brand.logo?.startsWith('http') ? (
              <CachedImage
                source={brand.logo}
                style={styles.logo}
                contentFit="contain"
              />
            ) : brand.logo ? (
              <Text style={{ fontSize: 28 }}>{brand.logo}</Text>
            ) : (
              <LinearGradient
                colors={[colors.lightPeach, colors.brand.sand]}
                style={styles.logoPlaceholder}
              >
                <Text style={styles.logoInitial}>{brand.name.charAt(0)}</Text>
              </LinearGradient>
            )}
          </View>

          {/* Brand Name */}
          <Text style={styles.brandName} numberOfLines={1}>
            {brand.name}
          </Text>

          {/* Cashback - prominent */}
          <View style={styles.cashbackPill}>
            <Text style={styles.cashbackPercent}>
              {brand.cashbackRate || 0}%
            </Text>
          </View>

          {/* Rating */}
          {brand.rating ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={9} color={colors.brand.caramel} />
              <Text style={styles.ratingText}>{brand.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

// ─── Skeleton Card ──────────────────────────────────────────
const SkeletonCard: React.FC<{ index: number }> = memo(({ index }) => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 })), -1);
    
    }, [index]);

  return (
    <View style={styles.cardWrapper}>
      <Animated.View
        style={[
          styles.card,
          styles.skeletonCard,
          {
            opacity: interpolate(shimmerAnim.value, [0, 1], [0.5, 1]),
          },
        ]}
      >
        <View style={[styles.logoArea, styles.skeletonBg]} />
        <View style={[styles.skeletonLine, { width: 56 }]} />
        <View style={[styles.skeletonLine, { width: 40, marginTop: 6 }]} />
      </Animated.View>
    </View>
  );
});

// ─── Empty State ────────────────────────────────────────────
const EmptyState: React.FC<{ onViewAllPress: () => void }> = memo(({ onViewAllPress }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconWrap}>
      <Ionicons name="storefront-outline" size={28} color={colors.brand.caramel} />
    </View>
    <Text style={styles.emptyTitle}>Discover Top Brands</Text>
    <Text style={styles.emptySubtitle}>Shop online and earn cashback</Text>
    <Pressable onPress={onViewAllPress}>
      <LinearGradient colors={[colors.nileBlue, colors.brand.nileBlueLight]} style={styles.emptyCTA}>
        <Text style={styles.emptyCTAText}>Explore Brands</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.background.primary} />
      </LinearGradient>
    </Pressable>
  </View>
));

// ─── Filter Names + Empty State ─────────────────────────────
const FILTER_DISPLAY_NAMES: Record<string, string> = {
  'all': 'All', 'most-popular': 'Popular', 'high-cashback': 'High Cashback',
  'fashion': 'Fashion', 'electronics': 'Electronics', 'food': 'Food',
  'travel': 'Travel', 'beauty': 'Beauty', 'shopping': 'Shopping',
  'groceries': 'Groceries', 'entertainment': 'Entertainment', 'finance': 'Finance',
};

const FilteredEmptyState: React.FC<{
  filterName: string;
  onResetFilter?: () => void;
}> = memo(({ filterName, onResetFilter }) => {
  const displayName = FILTER_DISPLAY_NAMES[filterName] || filterName;
  return (
    <View style={styles.filteredEmptyContainer}>
      <Ionicons name="search-outline" size={28} color={colors.neutral[300]} />
      <Text style={styles.filteredEmptyTitle}>No brands found</Text>
      <Text style={styles.filteredEmptySubtitle}>
        No brands match "{displayName}". Try another category.
      </Text>
      {onResetFilter && (
        <Pressable onPress={onResetFilter} style={styles.resetBtn}>
          <Ionicons name="refresh-outline" size={14} color={colors.nileBlue} />
          <Text style={styles.resetBtnText}>Show All</Text>
        </Pressable>
      )}
    </View>
  );
});

// ─── Main Component ─────────────────────────────────────────
const TopOnlineBrands: React.FC<TopOnlineBrandsProps> = ({
  brands,
  isLoading = false,
  onBrandPress,
  onViewAllPress,
  totalBrandsCount,
  activeFilter,
  onResetFilter,
}) => {
  const displayBrands = brands.slice(0, 12);
  const headerFadeAnim = useSharedValue(0);

  const displayCount = totalBrandsCount
    ? (totalBrandsCount >= 1000 ? '1000+' : `${totalBrandsCount}+`)
    : (brands.length > 0 ? `${brands.length}+` : null);

  useEffect(() => {
    headerFadeAnim.value = withTiming(1, { duration: 400 });
  }, []);

  const hasActiveFilter = activeFilter && activeFilter !== 'all';
  const hasNoBrands = !isLoading && brands.length === 0;
  const isFilteredEmpty = hasNoBrands && hasActiveFilter;

  const renderBrandCard = useCallback(({ item, index }: { item: CashStoreBrand; index: number }) => (
    <BrandCard brand={item} index={index} onPress={() => onBrandPress(item)} />
  ), [onBrandPress]);

  const renderSkeletonCard = useCallback(({ index }: { item: unknown; index: number }) => (
    <SkeletonCard index={index} />
  ), []);

  return (
    <View style={styles.outerContainer}>
      {/* Frosted glass container */}
      <LinearGradient
        colors={['rgba(255,255,255,0.75)', 'rgba(255,240,230,0.5)', 'rgba(255,255,255,0.65)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Subtle decorative circles */}
        <View style={styles.decoCircle1} />
        <View style={styles.decoCircle2} />

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFadeAnim }]}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Top Online Brands</Text>
              {displayCount && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{displayCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>Earn cashback on every purchase</Text>
          </View>
          <Pressable
            onPress={onViewAllPress}
            style={styles.viewAllBtn}
           
          >
            <Text style={styles.viewAllText}>See All</Text>
            <View style={styles.viewAllArrow}>
              <Ionicons name="chevron-forward" size={12} color={colors.nileBlue} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Content */}
        {isFilteredEmpty ? (
          <FilteredEmptyState filterName={activeFilter} onResetFilter={onResetFilter} />
        ) : hasNoBrands ? (
          <EmptyState onViewAllPress={onViewAllPress} />
        ) : isLoading ? (
          <FlashList
            data={Array.from({ length: 6 })}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            keyExtractor={(_, i) => `skeleton-${i}`}
            renderItem={renderSkeletonCard}
            estimatedItemSize={150}
          />
        ) : (
          <FlashList
            data={displayBrands}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            keyExtractor={(item) => item.id}
            renderItem={renderBrandCard}
            estimatedItemSize={150}
          />
        )}
      </LinearGradient>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  outerContainer: {
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 22,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.caramel,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  container: {
    paddingTop: 18,
    paddingBottom: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,215,181,0.35)',
    overflow: 'hidden',
    position: 'relative',
  },

  // ── Decorative ──
  decoCircle1: {
    position: 'absolute',
    top: -20,
    right: -15,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,215,181,0.15)',
  },
  decoCircle2: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(232,184,150,0.1)',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
    zIndex: 1,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.nileBlue,
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: 'rgba(212,160,122,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.caramel,
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral[400],
    fontWeight: '500',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 6,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,160,122,0.2)',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  viewAllArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(212,160,122,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 14,
    gap: 10,
    paddingBottom: 2,
  },

  // ── Card ──
  cardWrapper: {
    width: 115,
  },
  cardTouchable: {
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.caramel,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  card: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,181,0.3)',
  },
  skeletonCard: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderColor: 'rgba(0,0,0,0.04)',
  },

  // ── Logo ──
  logoArea: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  logo: {
    width: 38,
    height: 38,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.background.primary,
  },
  hotDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
  },

  // ── Text ──
  brandName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.nileBlue,
    textAlign: 'center',
    marginBottom: 5,
  },
  cashbackPill: {
    backgroundColor: 'rgba(212,160,122,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cashbackPercent: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brand.caramel,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 5,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B0B0B0',
  },

  // ── Skeleton ──
  skeletonBg: {
    backgroundColor: colors.neutral[200],
  },
  skeletonLine: {
    height: 10,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginTop: 4,
  },

  // ── Empty States ──
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(212,160,122,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.neutral[400],
    marginBottom: 16,
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 6,
  },
  emptyCTAText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background.primary,
  },
  filteredEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  filteredEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.nileBlue,
    marginTop: 8,
    marginBottom: 4,
  },
  filteredEmptySubtitle: {
    fontSize: 13,
    color: colors.neutral[400],
    textAlign: 'center',
    marginBottom: 14,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
  },
});

export default memo(TopOnlineBrands);
