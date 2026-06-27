// @ts-nocheck
/**
 * TrendingCashback Component
 *
 * Premium horizontal scroll section showing trending cashback deals
 * Features: Animated countdown timer, pulsing live indicator, progress bars
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
import { colors } from '@/constants/theme';
import {
  TrendingDeal,
  formatTimeRemaining,
  getTimeRemainingMs,
  getBadgeColor,
} from '../../../types/cash-store.types';

interface TrendingCashbackProps {
  deals: TrendingDeal[];
  isLoading?: boolean;
  onDealPress: (deal: TrendingDeal) => void;
  onViewAllPress: () => void;
}

const TrendingDealCard: React.FC<{
  deal: TrendingDeal;
  index: number;
  onPress: () => void;
}> = memo(({ deal, index, onPress }) => {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemainingMs(deal.validUntil));
  const scaleAnim = useSharedValue(0.9);
  const fadeAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const coinBounceAnim = useSharedValue(0);

  // Calculate progress — use 24h as reference window, clamped [0, 1]
  // As time remaining decreases, progress fills up (urgency indicator)
  const maxWindow = 24 * 60 * 60 * 1000; // 24 hours
  const elapsed = maxWindow - Math.min(timeRemaining, maxWindow);
  const progress = Math.min(Math.max(elapsed / maxWindow, 0), 1);

  useEffect(() => {
    // Staggered entry animation
    fadeAnim.value = withDelay(index * 80, withTiming(1, { duration: 400 }));
      scaleAnim.value = withDelay(index * 80, withSpring(1));

    // Pulse animation for live indicator
    pulseAnim.value = withRepeat(withSequence(withTiming(1.2, { duration: 800 })), -1);
    
    // Coin bounce animation
    coinBounceAnim.value = withRepeat(withSequence(withTiming(-3, { duration: 400 })), -1);
    
    // Update timer
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemainingMs(deal.validUntil));
    }, 1000); // Update every second

    // Cleanup: stop all animations and interval
    return () => {
      clearInterval(interval);
      // animation auto-cancels
      // animation auto-cancels
    };
  }, [deal.validUntil, index]);

  const handlePressIn = () => {
    scaleAnim.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scaleAnim.value = withSpring(1);
  };

  const isFlashSale = deal.isFlashSale || deal.badge === 'trending';

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
        {/* Flash Sale / Live Indicator */}
        {isFlashSale && (
          <Animated.View
            style={[
              styles.liveIndicator,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </Animated.View>
        )}

        {/* Badge */}
        {deal.badge && !isFlashSale && (
          <LinearGradient
            colors={[getBadgeColor(deal.badge), getBadgeColor(deal.badge)]}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>{deal.badge.toUpperCase()}</Text>
          </LinearGradient>
        )}

        {/* Brand Logo */}
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

        {/* Brand Name */}
        <Text style={styles.brandName} numberOfLines={1}>
          {deal.brand.name}
        </Text>

        {/* Cashback Rate - Highlighted */}
        <LinearGradient
          colors={[colors.brand.sand, colors.brand.caramel]}
          style={styles.cashbackContainer}
        >
          <Text style={styles.cashbackRate}>{deal.cashbackRate}%</Text>
          <Text style={styles.cashbackLabel}>Cashback</Text>
        </LinearGradient>

        {/* Bonus Coins */}
        {deal.bonusCoins && (
          <Animated.View
            style={[
              styles.bonusContainer,
              {
                transform: [{ translateY: coinBounceAnim }],
              },
            ]}
          >
            <Ionicons name="flash" size={14} color={colors.lightMustard} />
            <Text style={styles.bonusText}>+{deal.bonusCoins} coins</Text>
          </Animated.View>
        )}

        {/* Timer with Progress Bar */}
        <View style={styles.timerWrapper}>
          <View style={styles.timerContainer}>
            <Ionicons name="time" size={12} color={colors.lightPeach} />
            <Text style={styles.timerText}>{formatTimeRemaining(timeRemaining)}</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>
        </View>
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
        <View style={[styles.skeletonBadge]} />
        <View style={[styles.skeletonText, { width: 60 }]} />
      </View>
    </Animated.View>
  );
});

const TrendingCashback: React.FC<TrendingCashbackProps> = ({
  deals,
  isLoading = false,
  onDealPress,
  onViewAllPress,
}) => {
  const headerFadeAnim = useSharedValue(0);
  const flamePulseAnim = useSharedValue(1);

  useEffect(() => {
    headerFadeAnim.value = withTiming(1, { duration: 400 });

    // Flame pulse animation
    flamePulseAnim.value = withRepeat(withSequence(withTiming(1.15, { duration: 500 })), -1);
    
    }, []);

  const renderTrendingItem = useCallback(({ item, index }: { item: unknown; index: number }) =>
    isLoading ? (
      <SkeletonCard key={`skeleton-${index}`} index={index} />
    ) : (
      <TrendingDealCard
        deal={item as TrendingDeal}
        index={index}
        onPress={() => onDealPress(item as TrendingDeal)}
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
              colors={[colors.nileBlue, colors.brand.nileBlueLight]}
              style={styles.headerIconContainer}
            >
              <Ionicons name="trending-up" size={16} color={colors.lightMustard} />
            </LinearGradient>
            <Text style={styles.title}>Trending Cashback</Text>
            <Animated.View style={{ transform: [{ scale: flamePulseAnim }] }}>
              <Ionicons name="flame" size={18} color={colors.lightMustard} />
            </Animated.View>
          </View>
          <Text style={styles.subtitle}>Limited time offers - Don't miss out!</Text>
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
        data={isLoading ? Array.from({ length: 4 }) : deals}
        renderItem={renderTrendingItem}
        keyExtractor={(item, index) =>
          isLoading ? `skeleton-${index}` : (item as TrendingDeal).id
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
    marginLeft: 40,
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
    width: 150,
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
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
  liveIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightPeach,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    zIndex: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.background.primary,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.5,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: 0.3,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  brandLogo: {
    width: 44,
    height: 44,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.background.primary,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.nileBlue,
    marginBottom: 8,
    textAlign: 'center',
  },
  cashbackContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  cashbackRate: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.background.primary,
    letterSpacing: -0.5,
  },
  cashbackLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    backgroundColor: colors.linen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  bonusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.caramel,
  },
  timerWrapper: {
    width: '100%',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.linen,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 6,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lightPeach,
    letterSpacing: -0.2,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: colors.linen,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.lightPeach,
    borderRadius: 2,
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
    width: 80,
    height: 36,
    backgroundColor: colors.neutral[200],
    borderRadius: 14,
    marginBottom: 8,
  },
});

export default memo(TrendingCashback);
