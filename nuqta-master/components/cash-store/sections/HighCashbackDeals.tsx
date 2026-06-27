// @ts-nocheck
/**
 * HighCashbackDeals Component
 *
 * Premium section showing high cashback deals (10%+) with animated percentage display
 * Features: Large animated numbers, gradient borders, Shop Now with arrow animation
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { HighCashbackDeal, getBadgeColor } from '../../../types/cash-store.types';
import { colors } from '@/constants/theme';

interface HighCashbackDealsProps {
  deals: HighCashbackDeal[];
  isLoading?: boolean;
  onDealPress: (deal: HighCashbackDeal) => void;
  onViewAllPress: () => void;
}

const DealCard: React.FC<{
  deal: HighCashbackDeal;
  index: number;
  onPress: () => void;
}> = memo(({ deal, index, onPress }) => {
  const scaleAnim = useSharedValue(0.9);
  const fadeAnim = useSharedValue(0);
  const arrowAnim = useSharedValue(0);
  const percentAnim = useSharedValue(0.8);

  useEffect(() => {
    // Staggered entry animation
    fadeAnim.value = withDelay(index * 80, withTiming(1, { duration: 400 }));
      scaleAnim.value = withDelay(index * 80, withSpring(1));
      percentAnim.value = withDelay(index * 80 + 200, withSpring(1));

    // Arrow animation
    arrowAnim.value = withRepeat(withSequence(withTiming(4, { duration: 500 })), -1);
    
    }, [index]);

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1);
  };

  const isLimitedStock = deal.badge === 'hot' || deal.badge === 'best-deal';

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
        {/* Badge */}
        {deal.badge && (
          <LinearGradient
            colors={[getBadgeColor(deal.badge), getBadgeColor(deal.badge)]}
            style={styles.badge}
          >
            <Ionicons
              name={deal.badge === 'hot' ? 'flame' : 'star'}
              size={10}
              color={colors.background.primary}
            />
            <Text style={styles.badgeText}>{deal.badge.toUpperCase()}</Text>
          </LinearGradient>
        )}

        {/* Limited Stock Indicator */}
        {isLimitedStock && (
          <View style={styles.limitedStock}>
            <Ionicons name="warning" size={10} color={colors.brand.caramel} />
            <Text style={styles.limitedStockText}>Limited</Text>
          </View>
        )}

        {/* Brand Section */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            {deal.brand.logo?.startsWith('http') ? (
              <CachedImage
                source={deal.brand.logo}
                style={styles.brandLogo}
                contentFit="contain"
              />
            ) : deal.brand.logo ? (
              <Text style={{ fontSize: 28 }}>{deal.brand.logo}</Text>
            ) : (
              <LinearGradient
                colors={[colors.lightPeach, colors.brand.sand]}
                style={styles.logoPlaceholder}
              >
                <Text style={styles.logoInitial}>{(deal.brand.name || '?').charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
          </View>
          <View style={styles.brandInfo}>
            <Text style={styles.brandName} numberOfLines={1}>
              {deal.brand.name}
            </Text>
            <Text style={styles.dealTitle} numberOfLines={1}>
              {deal.title || 'Special Offer'}
            </Text>
          </View>
        </View>

        {/* Cashback Highlight - Animated */}
        <Animated.View
          style={[
            styles.cashbackHighlight,
            {
              transform: [{ scale: percentAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.brand.sand, colors.brand.caramel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cashbackGradient}
          >
            <Text style={styles.cashbackRate}>{deal.cashbackRate}%</Text>
            <Text style={styles.cashbackLabel}>Cashback</Text>
          </LinearGradient>
        </Animated.View>

        {/* Bonus Coins */}
        {deal.bonusCoins && (
          <View style={styles.bonusRow}>
            <Ionicons name="flash" size={14} color={colors.lightMustard} />
            <Text style={styles.bonusText}>+{deal.bonusCoins} bonus coins</Text>
          </View>
        )}

        {/* Shop Now Button */}
        <Pressable style={styles.shopButton} onPress={onPress}>
          <LinearGradient
            colors={[colors.brand.sand, colors.brand.caramel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shopButtonGradient}
          >
            <Text style={styles.shopButtonText}>Shop Now</Text>
            <Animated.View style={{ transform: [{ translateX: arrowAnim }] }}>
              <Ionicons name="arrow-forward" size={16} color={colors.background.primary} />
            </Animated.View>
          </LinearGradient>
        </Pressable>
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
        <View style={styles.brandSection}>
          <View style={[styles.logoContainer, styles.skeleton]} />
          <View style={styles.brandInfo}>
            <View style={[styles.skeletonText, { width: 80 }]} />
            <View style={[styles.skeletonText, { width: 100 }]} />
          </View>
        </View>
        <View style={[styles.skeletonCashback]} />
        <View style={[styles.skeletonButton]} />
      </View>
    </Animated.View>
  );
});

const HighCashbackDeals: React.FC<HighCashbackDealsProps> = ({
  deals,
  isLoading = false,
  onDealPress,
  onViewAllPress,
}) => {
  const headerFadeAnim = useSharedValue(0);
  const rocketAnim = useSharedValue(0);

  useEffect(() => {
    headerFadeAnim.value = withTiming(1, { duration: 400 });

    // Rocket bounce animation
    rocketAnim.value = withRepeat(withSequence(withTiming(-4, { duration: 400 })), -1);
    
    }, []);

  const renderDealItem = useCallback(({ item, index }: { item: unknown; index: number }) =>
    isLoading ? (
      <SkeletonCard key={`skeleton-${index}`} index={index} />
    ) : (
      <DealCard
        deal={item as HighCashbackDeal}
        index={index}
        onPress={() => onDealPress(item as HighCashbackDeal)}
      />
    ), [isLoading, onDealPress]);

  if (deals.length === 0 && !isLoading) {
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
              <Ionicons name="rocket" size={18} color={colors.background.primary} />
            </LinearGradient>
            <Text style={styles.headerTitle}>High Cashback Deals</Text>
            <Animated.View style={{ transform: [{ translateY: rocketAnim }] }}>
              <Ionicons name="rocket" size={20} color={colors.brand.sand} />
            </Animated.View>
          </View>
          <Text style={styles.subtitle}>10%+ cashback on these brands</Text>
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
        data={isLoading ? Array.from({ length: 3 }) : deals}
        renderItem={renderDealItem}
        keyExtractor={(item, index) =>
          isLoading ? `skeleton-${index}` : (item as HighCashbackDeal).id
        }
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
    width: 190,
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 181, 0.3)',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: colors.lightPeach,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.3,
  },
  limitedStock: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.linen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    zIndex: 1,
  },
  limitedStockText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.brand.caramel,
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 24,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  brandLogo: {
    width: 34,
    height: 34,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.background.primary,
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 2,
  },
  dealTitle: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  cashbackHighlight: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cashbackGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  cashbackRate: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.background.primary,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cashbackLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
    backgroundColor: colors.linen,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  bonusText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.caramel,
  },
  shopButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  shopButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  shopButtonText: {
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
    marginBottom: 6,
  },
  skeletonCashback: {
    height: 80,
    backgroundColor: colors.neutral[200],
    borderRadius: 16,
    marginBottom: 12,
  },
  skeletonButton: {
    height: 44,
    backgroundColor: colors.neutral[200],
    borderRadius: 14,
  },
});

export default memo(HighCashbackDeals);
