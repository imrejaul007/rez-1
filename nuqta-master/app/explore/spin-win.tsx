// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Easing,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import { GamePageSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import gamificationApi, { SpinWheelSegment } from '@/services/gamificationApi';
import { useRezBalance, useRefreshWallet, useGetCurrencySymbol } from '@/stores/selectors';
import { useGamification } from '@/contexts/GamificationContext';
import { platformAlert } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

/** Calculate time remaining until next UTC midnight */
function getTimeUntilReset(): string {
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function SpinWinPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { actions: gamificationActions } = useGamification();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const spinAnim = useSharedValue(0);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinAnim.value}deg` }],
  }));
  const fetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  // API state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prizes, setPrizes] = useState<SpinWheelSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<SpinWheelSegment | null>(null);
  const [spinsLeft, setSpinsLeft] = useState(0);
  const [todayCoinsWon, setTodayCoinsWon] = useState(0);
  const [currentRotation, setCurrentRotation] = useState(0);
  const walletBalance = useRezBalance();
  const refreshWallet = useRefreshWallet();
  const [resetTimer, setResetTimer] = useState(() => getTimeUntilReset());

  // Countdown timer — update every minute
  useEffect(() => {
    setResetTimer(getTimeUntilReset());
    const interval = setInterval(() => {
      setResetTimer(getTimeUntilReset());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch spin wheel data and wallet balance
  const fetchSpinData = useCallback(async (isRefresh = false) => {
    if (fetchingRef.current) return;
    if (!isRefresh && hasFetchedRef.current) return;

    fetchingRef.current = true;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch spin data + refresh wallet in parallel
      const [wheelResponse] = await Promise.all([
        gamificationApi.getSpinWheelData(),
        refreshWallet(),
      ]);

      if (wheelResponse.success && wheelResponse.data) {
        const data = wheelResponse.data;
        if (data.segments && data.segments.length > 0) {
          if (!isMounted()) return;
          setPrizes(data.segments);
          setError(null);
        } else {
          if (!isMounted()) return;
          setError('Unable to load spin wheel prizes');
        }
        // Use spinsRemaining from the wheel data (single source of truth)
        if (!isMounted()) return;
        setSpinsLeft(data.spinsRemaining);
        if (!isMounted()) return;
        setTodayCoinsWon(data.stats.todayCoinsWon);
      } else {
        if (!isMounted()) return;
        setError(wheelResponse.error || 'Unable to load spin wheel data');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Unable to load spin wheel. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      fetchingRef.current = false;
      hasFetchedRef.current = true;
    }
  }, []);

  useEffect(() => {
    fetchSpinData();
  }, [fetchSpinData]);

  const onRefresh = useCallback(() => {
    fetchSpinData(true);
  }, [fetchSpinData]);

  const handleSpin = async () => {
    if (spinsLeft <= 0 || spinning) return;

    setSpinning(true);
    setWonPrize(null);

    try {
      const response = await gamificationApi.executeSpin();

      if (response.success && response.data) {
        const { segmentId, rewardValue, spinsRemaining, newBalance, coinsAdded } = response.data;

        const selectedPrize = prizes.find(p => p.id === segmentId) || prizes[0];

        // Calculate rotation to land on the correct segment
        const prizeIndex = prizes.findIndex(p => p.id === segmentId);
        const degreesPerSlice = 360 / prizes.length;
        const prizeAngle = prizeIndex * degreesPerSlice;
        const fullSpins = 5;
        const newRotation = currentRotation + (fullSpins * 360) + (360 - prizeAngle);

        if (!isMounted()) return;
        setCurrentRotation(newRotation);

        const actualCoinsWon = coinsAdded || rewardValue || 0;
        const updatedBalance = newBalance;

        const onSpinComplete = () => {
          if (!isMounted()) return;
          setSpinning(false);
          if (!isMounted()) return;
          setWonPrize(selectedPrize);
          if (!isMounted()) return;
          setSpinsLeft(spinsRemaining);
          if (!isMounted()) return;
          setTodayCoinsWon(prev => prev + actualCoinsWon);
          refreshWallet();
          gamificationActions.syncCoinsFromWallet();
          // Haptic feedback on spin win
          if (actualCoinsWon > 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
        };

        spinAnim.value = withTiming(newRotation, {
          duration: 4000,
          easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
        }, (finished) => {
          if (finished) runOnJS(onSpinComplete)();
        });
      } else {
        if (!isMounted()) return;
        setSpinning(false);
        platformAlert('Spin Failed', response.error || 'Unable to spin. Please try again.');
      }
    } catch (error: any) {
      if (!isMounted()) return;
      setSpinning(false);
      platformAlert('Error', error.message || 'Something went wrong');
    }
  };

  // Rotation handled by spinStyle useAnimatedStyle above

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="flash" size={20} color={Colors.warning} />
          <Text style={styles.headerTitle}>Spin & Win</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.historyButton}
            onPress={() => router.push('/explore/spin-history' as any)}
          >
            <Ionicons name="time-outline" size={20} color={Colors.text.tertiary} />
          </Pressable>
          <Pressable
            style={styles.coinsBadge}
            onPress={() => router.push('/wallet' as any)}
          >
            <CachedImage
              source={BRAND.COIN_IMAGE}
              style={styles.coinIcon}
              contentFit="contain"
            />
            <Text style={styles.coinsText}>{walletBalance.toLocaleString()}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.warning]} />
        }
      >
        {/* Loading State */}
        {loading && (
          <GamePageSkeleton />
        )}

        {/* Error State */}
        {!loading && error && prizes.length === 0 && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={Colors.error} />
            <Text style={styles.errorTitle}>Unable to Load</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchSpinData(true)}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Stats */}
        {!loading && (
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }]}>
            <Ionicons name="flash" size={20} color={Colors.info} />
            <Text style={styles.statValue}>{spinsLeft}</Text>
            <Text style={styles.statLabel}>Spins left</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
            <Ionicons name="trending-up" size={20} color={Colors.success} />
            <Text style={styles.statValue}>{todayCoinsWon}</Text>
            <Text style={styles.statLabel}>Won today</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)' }]}>
            <Ionicons name="time" size={20} color={Colors.brand.purple} />
            <Text style={styles.statValue}>{resetTimer}</Text>
            <Text style={styles.statLabel}>Resets in</Text>
          </View>
        </View>
        )}

        {/* Info Banner */}
        {!loading && (
        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={[colors.warningScale[400], colors.brand.orange]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.banner}
          >
            <Ionicons name="gift" size={20} color={Colors.text.inverse} />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Daily Free Spins</Text>
              <Text style={styles.bannerSubtitle}>Get 3 free spins every day! Win coins, cashback, discounts & vouchers.</Text>
            </View>
          </LinearGradient>
        </View>
        )}

        {/* Spin Wheel */}
        {prizes.length > 0 && (
        <View style={styles.wheelContainer}>
          <View style={styles.wheelOuter}>
            <Animated.View
              style={[
                styles.wheel,
                spinStyle,
              ]}
            >
              {prizes.map((prize, index) => {
                const rotation = (360 / prizes.length) * index;
                return (
                  <View
                    key={prize.id}
                    style={[
                      styles.wheelSegment,
                      {
                        backgroundColor: prize.color,
                        transform: [
                          { rotate: `${rotation}deg` },
                        ],
                      },
                    ]}
                  >
                    <Text style={[styles.prizeLabel, { transform: [{ rotate: '60deg' }] }]}>
                      {prize.label}
                    </Text>
                  </View>
                );
              })}
            </Animated.View>

            {/* Center Button */}
            <Pressable
              onPress={handleSpin}
              disabled={spinning || spinsLeft <= 0}
              style={[
                styles.spinButton,
                (spinning || spinsLeft <= 0) && styles.spinButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={spinning || spinsLeft <= 0 ? [Colors.text.tertiary, Colors.text.tertiary] : [colors.success, colors.brand.greenDark]}
                style={styles.spinButtonGradient}
              >
                {spinning ? (
                  <Ionicons name="flash" size={24} color={Colors.text.inverse} />
                ) : spinsLeft > 0 ? (
                  <Text style={styles.spinButtonText}>SPIN</Text>
                ) : (
                  <Text style={styles.spinButtonText}>Done</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Pointer */}
          <View style={styles.pointer} />
        </View>
        )}

        {/* Result */}
        {wonPrize && (
          <View style={styles.resultContainer}>
            <LinearGradient
              colors={[colors.successScale[400], colors.tealGreen]}
              style={styles.resultCard}
            >
              <Ionicons name="star" size={48} color={Colors.text.inverse} />
              <Text style={styles.resultTitle}>You Won {wonPrize.label}!</Text>
              <Text style={styles.resultSubtitle}>
                {wonPrize.type === 'coins'
                  ? 'Coins added to your wallet'
                  : wonPrize.type === 'cashback'
                  ? 'Cashback coupon added to your coupons'
                  : wonPrize.type === 'discount'
                  ? 'Discount coupon added to your coupons'
                  : 'Voucher added to your coupons'}
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Prize Table */}
        {prizes.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prize Distribution</Text>
            <Pressable onPress={() => router.push('/explore/spin-history' as any)}>
              <Text style={styles.seeAllText}>History</Text>
            </Pressable>
          </View>
          {prizes.map((prize) => (
            <View key={prize.id} style={styles.prizeRow}>
              <View style={styles.prizeRowLeft}>
                <View style={[styles.prizeColor, { backgroundColor: prize.color }]} />
                <Text style={styles.prizeRowLabel}>{prize.label}</Text>
              </View>
              <Text style={styles.prizeRowChance}>{prize.probability}% chance</Text>
            </View>
          ))}
        </View>
        )}

        {/* How to Get More Spins */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>How It Works</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>You get 3 free spins every day</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>Win coins, cashback, discounts, or vouchers</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>Spins reset daily at midnight UTC</Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>Coins are added to your wallet instantly</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const WHEEL_SIZE = width * 0.75;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: 50,
    paddingBottom: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  historyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warning + '33',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
  },
  coinIcon: {
    width: 18,
    height: 18,
  },
  coinsText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    ...Typography.overline,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  bannerContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  bannerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.inverse + 'E6',
  },
  wheelContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  wheelOuter: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: Colors.background.secondary,
    borderWidth: 8,
    borderColor: Colors.border.default,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.strong,
  },
  wheel: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  wheelSegment: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    top: 0,
    left: '25%',
    transformOrigin: 'bottom center',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  prizeLabel: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  spinButton: {
    position: 'absolute',
    zIndex: 10,
  },
  spinButtonDisabled: {
    opacity: 0.8,
  },
  spinButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.strong,
  },
  spinButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  pointer: {
    position: 'absolute',
    top: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.error,
    zIndex: 20,
  },
  resultContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  resultCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  resultTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resultSubtitle: {
    ...Typography.body,
    color: Colors.text.inverse + 'E6',
  },
  sectionContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  seeAllText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.warning,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  prizeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  prizeColor: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
  },
  prizeRowLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  prizeRowChance: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  tipsContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xl,
  },
  tipsTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  tipsList: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginTop: 6,
  },
  tipText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  errorContainer: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.base,
  },
  errorTitle: {
    ...Typography.h3,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.warning,
  },
  retryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(SpinWinPage, 'ExploreSpinWin');
