/**
 * CashbackSummaryHeaderCard Component
 *
 * Header-optimized version of CashbackSummaryCard
 * Displays in the header area when CashStore tab is active
 * Styled to blend with the gradient header background
 *
 * Uses Nuqta Palette: Nile Blue, Light Mustard (#ffcd57), Light Peach, Linen
 */

import React, { memo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface CashbackSummaryHeaderCardProps {
  total: number;
  pending: number;
  confirmed: number;
  available: number;
  isLoading?: boolean;
}

const CashbackSummaryHeaderCard: React.FC<CashbackSummaryHeaderCardProps> = ({
  total,
  pending,
  confirmed,
  available,
  isLoading = false,
}) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const currencySymbol = getCurrencySymbol();
  const locale = getLocale();

  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.95);
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    // Entry animation
    fadeAnim.value = withTiming(1, { duration: 400 });
    scaleAnim.value = withSpring(1);

    // Shimmer animation for loading
    if (isLoading) {
      shimmerAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0, { duration: 1000 })
        ),
        -1,
        false
      );
    } else {
      shimmerAnim.value = 0;
    }
  }, [isLoading]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.6, 1]),
  }));

  const handlePress = () => {
    router.push('/account/cashback' as any);
  };

  const formatAmount = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString(locale)}`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.cardWrapper,
            shimmerStyle,
          ]}
        >
          <LinearGradient
            colors={[colors.nileBlue, '#243f55', '#2d4a5f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.skeletonContainer}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonAmount} />
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonStat} />
                <View style={styles.skeletonStat} />
                <View style={styles.skeletonStat} />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.cardWrapper,
          cardAnimStyle,
        ]}
      >
        <Pressable onPress={handlePress}>
          <LinearGradient
            colors={[colors.nileBlue, '#1f3d56', '#243f55']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Decorative circles */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            <View style={styles.decorativeCircle3} />

            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={styles.titleSection}>
                <Text style={styles.label}>TOTAL CASHBACK</Text>
                <Text style={styles.totalAmount}>{formatAmount(total)}</Text>
              </View>
              <LinearGradient
                colors={['rgba(255,205,87,0.25)', 'rgba(255,205,87,0.1)']}
                style={styles.walletIconContainer}
              >
                <Ionicons name="wallet" size={22} color={colors.lightMustard} />
              </LinearGradient>
            </View>

            {/* Divider with subtle gold accent */}
            <LinearGradient
              colors={['transparent', 'rgba(255,205,87,0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.divider}
            />

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconRow}>
                  <View style={[styles.statusDot, { backgroundColor: colors.lightPeach }]} />
                  <Text style={styles.statLabel}>PENDING</Text>
                </View>
                <Text style={styles.statValue}>{formatAmount(pending)}</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIconRow}>
                  <View style={[styles.statusDot, { backgroundColor: '#4ADE80' }]} />
                  <Text style={styles.statLabel}>CONFIRMED</Text>
                </View>
                <Text style={styles.statValue}>{formatAmount(confirmed)}</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIconRow}>
                  <View style={[styles.statusDot, { backgroundColor: colors.lightMustard }]} />
                  <Text style={styles.statLabel}>AVAILABLE</Text>
                </View>
                <Text style={[styles.statValue, styles.availableValue]}>{formatAmount(available)}</Text>
              </View>
            </View>

            {/* View Details Link */}
            <Pressable style={styles.viewDetailsContainer} onPress={handlePress}>
              <Text style={styles.viewDetailsText}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,205,87,0.15)',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,205,87,0.06)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,215,181,0.06)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: 30,
    right: 60,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,205,87,0.04)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleSection: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 1,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.background.primary,
    letterSpacing: -1,
  },
  walletIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,205,87,0.2)',
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.primary,
  },
  availableValue: {
    color: colors.lightMustard,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewDetailsText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  // Skeleton styles
  skeletonContainer: {
    gap: 12,
  },
  skeletonTitle: {
    width: 100,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
  },
  skeletonAmount: {
    width: 140,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  skeletonStat: {
    width: 70,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
});

export default memo(CashbackSummaryHeaderCard);
