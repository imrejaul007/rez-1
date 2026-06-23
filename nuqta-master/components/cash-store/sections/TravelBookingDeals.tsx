/**
 * TravelBookingDeals Component
 *
 * 2x2 grid of travel categories with Nuqta palette
 * Glassmorphism container, clean card design
 *
 * Nuqta Palette: Nile Blue (#1a3a52), Light Mustard (#ffcd57),
 * Linen (#faf1e0), Light Peach (#ffd7b5), Lavender Mist (#dfebf7)
 */

import React, { memo, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TravelDeal } from '../../../types/cash-store.types';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 32 - GRID_GAP) / 2; // outerMargin + containerPadding + gap

// Per-category Nuqta-palette card themes
const CATEGORY_THEMES: Record<string, {
  gradient: string[];
  iconBg: string;
  iconColor: string;
  accentColor: string;
}> = {
  flights: {
    gradient: [colors.nileBlue, colors.brand.nileBlueLight],
    iconBg: 'rgba(255,215,181,0.2)',
    iconColor: colors.lightPeach,
    accentColor: colors.lightPeach,
  },
  hotels: {
    gradient: [colors.brand.caramel, colors.brand.sand],
    iconBg: 'rgba(255,255,255,0.25)',
    iconColor: colors.background.primary,
    accentColor: colors.background.primary,
  },
  cabs: {
    gradient: ['#2d4a5f', '#3d6178'],
    iconBg: 'rgba(255,205,87,0.2)',
    iconColor: colors.lightMustard,
    accentColor: colors.lightMustard,
  },
  experiences: {
    gradient: [colors.brand.sand, colors.brand.caramel],
    iconBg: 'rgba(26,58,82,0.15)',
    iconColor: colors.nileBlue,
    accentColor: colors.nileBlue,
  },
  buses: {
    gradient: [colors.nileBlue, '#2d4a5f'],
    iconBg: 'rgba(255,215,181,0.2)',
    iconColor: colors.lightPeach,
    accentColor: colors.lightPeach,
  },
  trains: {
    gradient: ['#3d6178', colors.nileBlue],
    iconBg: 'rgba(255,205,87,0.2)',
    iconColor: colors.lightMustard,
    accentColor: colors.lightMustard,
  },
};

const DEFAULT_THEME = {
  gradient: [colors.nileBlue, colors.brand.nileBlueLight],
  iconBg: 'rgba(255,215,181,0.2)',
  iconColor: colors.lightPeach,
  accentColor: colors.lightPeach,
};

interface TravelBookingDealsProps {
  deals: TravelDeal[];
  isLoading?: boolean;
  onDealPress: (deal: TravelDeal) => void;
  onViewAllPress: () => void;
}

// ─── Travel Card ────────────────────────────────────────────
const TravelCard: React.FC<{
  deal: TravelDeal;
  index: number;
  onPress: () => void;
}> = memo(({ deal, index, onPress }) => {
  const scaleAnim = useSharedValue(0.9);
  const fadeAnim = useSharedValue(0);
  const pressAnim = useSharedValue(1);
  const iconFloatAnim = useSharedValue(0);

  useEffect(() => {
    fadeAnim.value = withDelay(index * 80, withTiming(1, { duration: 350 }));
      scaleAnim.value = withDelay(index * 80, withSpring(1));

    // Gentle floating icon animation
    iconFloatAnim.value = withRepeat(withSequence(withTiming(-3, { duration: 1800 })), -1);
    
    }, [index]);

  const handlePressIn = () => {
    pressAnim.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    pressAnim.value = withSpring(1);
  };

  const theme = CATEGORY_THEMES[deal.category] || DEFAULT_THEME;
  const iconName = deal.icon as any;

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
        style={styles.cardTouchable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
       
      >
        <LinearGradient
          colors={theme.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Subtle decorative circle */}
          <View style={styles.decoCircle} />

          {/* Top row: Icon + Cashback */}
          <View style={styles.cardTop}>
            <Animated.View
              style={[
                styles.iconBox,
                { backgroundColor: theme.iconBg, transform: [{ translateY: iconFloatAnim }] },
              ]}
            >
              <Ionicons name={iconName} size={22} color={theme.iconColor} />
            </Animated.View>
            {deal.bonusCoins ? (
              <View style={styles.bonusPill}>
                <Ionicons name="flash" size={9} color={colors.lightMustard} />
                <Text style={styles.bonusText}>+{deal.bonusCoins}</Text>
              </View>
            ) : null}
          </View>

          {/* Title */}
          <Text style={styles.cardTitle}>{deal.title}</Text>

          {/* Bottom row: Cashback + Arrow */}
          <View style={styles.cardBottom}>
            <View>
              <Text style={[styles.cashbackRate, { color: theme.accentColor }]}>
                Up to {deal.cashbackRate}%
              </Text>
              <Text style={styles.cashbackLabel}>cashback</Text>
            </View>
            <View style={styles.arrowCircle}>
              <Ionicons name="arrow-forward" size={14} color={colors.background.primary} />
            </View>
          </View>
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
          styles.skeletonCard,
          {
            opacity: interpolate(shimmerAnim.value, [0, 1], [0.4, 0.8]),
          },
        ]}
      >
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonRate} />
      </Animated.View>
    </View>
  );
});

// ─── Main Component ─────────────────────────────────────────
const TravelBookingDeals: React.FC<TravelBookingDealsProps> = ({
  deals,
  isLoading = false,
  onDealPress,
  onViewAllPress,
}) => {
  const displayDeals = deals.slice(0, 4);
  const headerFadeAnim = useSharedValue(0);
  const planeAnim = useSharedValue(0);

  useEffect(() => {
    headerFadeAnim.value = withTiming(1, { duration: 400 });

    // Bouncing airplane
    planeAnim.value = withRepeat(withSequence(withTiming(5, { duration: 1000 })), -1);
    
    }, []);

  // Hide section when no deals and not loading
  if (!isLoading && displayDeals.length === 0) {
    return null;
  }

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={['rgba(255,255,255,0.75)', 'rgba(255,240,230,0.5)', 'rgba(255,255,255,0.65)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerFadeAnim }]}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>Travel & Booking</Text>
              <Animated.View style={{ transform: [{ translateX: planeAnim }] }}>
                <Ionicons name="airplane" size={16} color={colors.brand.caramel} />
              </Animated.View>
            </View>
            <Text style={styles.subtitle}>Earn cashback on every trip</Text>
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

        {/* 2x2 Grid */}
        <View style={styles.grid}>
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <SkeletonCard key={`skeleton-${index}`} index={index} />
              ))
            : displayDeals.map((deal, index) => (
                <TravelCard
                  key={deal.id}
                  deal={deal}
                  index={index}
                  onPress={() => onDealPress(deal)}
                />
              ))}
        </View>
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
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,215,181,0.35)',
    overflow: 'hidden',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.nileBlue,
    letterSpacing: -0.2,
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

  // ── Grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },

  // ── Card ──
  cardWrapper: {
    width: CARD_WIDTH,
  },
  cardTouchable: {
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  card: {
    borderRadius: 18,
    padding: 14,
    minHeight: 135,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  decoCircle: {
    position: 'absolute',
    top: -25,
    right: -25,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // ── Card Top ──
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  bonusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bonusText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.lightMustard,
  },

  // ── Card Content ──
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.primary,
    marginTop: 10,
    letterSpacing: -0.2,
  },

  // ── Card Bottom ──
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  cashbackRate: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cashbackLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // ── Skeleton ──
  skeletonCard: {
    borderRadius: 18,
    padding: 14,
    minHeight: 135,
    backgroundColor: '#E8E8E8',
  },
  skeletonIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#D4D4D4',
  },
  skeletonTitle: {
    width: 80,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#D4D4D4',
    marginTop: 12,
  },
  skeletonRate: {
    width: 60,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#D4D4D4',
    marginTop: 8,
  },
});

export default memo(TravelBookingDeals);
