import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Slot Machine Game
// 3-reel slot machine with spin animation, symbol matching, win logic, visual feedback

import React, { useState,  useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

const nuqtaCoinImage = BRAND.COIN_IMAGE;

const SYMBOLS = ['🍒', '🍋', '🍇', '💎', '⭐', '🔔', '7️⃣'];
const SPIN_COST = 5;

interface SpinResult {
  reels: string[];
  win: boolean;
  winAmount: number;
  winType: 'jackpot' | 'small' | 'none';
}

function getRandomSymbol(): string {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function calculateSpinResult(): SpinResult {
  const reels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

  // Check for jackpot (3 same)
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    const symbol = reels[0];
    let winAmount = 50;
    if (symbol === '7️⃣') winAmount = 200;
    else if (symbol === '💎') winAmount = 100;
    else if (symbol === '⭐') winAmount = 75;
    return { reels, win: true, winAmount, winType: 'jackpot' };
  }

  // Check for 2 same
  if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
    return { reels, win: true, winAmount: 10, winType: 'small' };
  }

  return { reels, win: false, winAmount: 0, winType: 'none' };
}

const ReelView = React.memo(({ reelAnim, symbol }: { reelAnim: Animated.SharedValue<number>; symbol: string }) => {
  const reelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(reelAnim.value, [0, 0.8, 1], [-100, 10, 0]) }],
  }));
  return (
    <Animated.View style={reelStyle}>
      <Text style={styles.reelSymbol}>{symbol}</Text>
    </Animated.View>
  );
});

function SlotsPage() {
  const [balance, setBalance] = useState(100); // Start with 100 NC
  const [currentReels, setCurrentReels] = useState(['🍒', '💎', '⭐']);
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [totalWins, setTotalWins] = useState(0);
  const [totalSpins, setTotalSpins] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // Animated values for each reel
  const reel1Anim = useSharedValue(0);
  const reel2Anim = useSharedValue(0);
  const reel3Anim = useSharedValue(0);
  const winScaleAnim = useSharedValue(0);
  const leverAnim = useSharedValue(0);

  // Array of reel animations to display "spinning" symbols
  const [spinningSymbols, setSpinningSymbols] = useState<string[][]>([[], [], []]);

  const winScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: winScaleAnim.value }],
  }));

  const handleBackPress = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleSpin = useCallback(() => {
    if (spinning) return;
    if (balance < SPIN_COST) {
      platformAlertSimple('Insufficient Balance', `You need at least ${SPIN_COST} ${BRAND.CURRENCY_CODE} to spin.`);
      return;
    }

    setSpinning(true);
    setShowResult(false);
    setBalance(prev => prev - SPIN_COST);
    setTotalSpins(prev => prev + 1);

    // Generate spinning symbol arrays for visual effect
    const reelSymbols = [
      Array.from({ length: 12 }, () => getRandomSymbol()),
      Array.from({ length: 15 }, () => getRandomSymbol()),
      Array.from({ length: 18 }, () => getRandomSymbol()),
    ];
    setSpinningSymbols(reelSymbols);

    // Calculate final result
    const result = calculateSpinResult();

    // Lever pull animation
    leverAnim.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 300 })
    );

    // Reel spin animations (staggered stops)
    reel1Anim.value = 0;
    reel2Anim.value = 0;
    reel3Anim.value = 0;

    reel1Anim.value = withTiming(1, { duration: 1000 });
    reel2Anim.value = withTiming(1, { duration: 1500 });
    reel3Anim.value = withTiming(1, { duration: 2000 });

    // After longest reel stops
    setTimeout(() => {
      setCurrentReels(result.reels);
      setLastResult(result);

      if (result.win) {
        setBalance(prev => prev + result.winAmount);
        setTotalWins(prev => prev + result.winAmount);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        // Win animation
        winScaleAnim.value = 0;
        winScaleAnim.value = withSpring(1);
      }

      setShowResult(true);
      setSpinning(false);
    }, 2000);
  }, [spinning, balance]);

  const renderReel = (symbol: string, reelAnim: Animated.SharedValue<number>, index: number) => (
    <View key={index} style={styles.reelContainer}>
      <View style={styles.reelWindow}>
        {spinning ? (
          <ReelView reelAnim={reelAnim} symbol={spinningSymbols[index]?.[Math.floor(Math.random() * (spinningSymbols[index]?.length || 1))] || symbol} />
        ) : (
          <Text style={styles.reelSymbol}>{symbol}</Text>
        )}
      </View>
    </View>
  );

  const renderIdleOrPlaying = () => (
    <View style={styles.mainContent}>
      {/* Balance Display */}
      <View style={styles.balanceBar}>
        <View style={styles.balanceLeft}>
          <CachedImage source={nuqtaCoinImage} style={styles.balanceCoin} />
          <Text style={styles.balanceText}>{balance} {BRAND.CURRENCY_CODE}</Text>
        </View>
        <View style={styles.balanceRight}>
          <Text style={styles.spinCostText}>Cost: {SPIN_COST} {BRAND.CURRENCY_CODE}/spin</Text>
        </View>
      </View>

      {/* Slot Machine */}
      <View style={styles.machineContainer}>
        <LinearGradient
          colors={[colors.neutral[700], colors.neutral[800], colors.neutral[900]]}
          style={styles.machineBody}
        >
          {/* Machine Header */}
          <View style={styles.machineHeader}>
            <Text style={styles.machineHeaderText}>LUCKY SLOTS</Text>
            <View style={styles.lightRow}>
              {[...Array(7)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.light,
                    { backgroundColor: spinning ? (i % 2 === 0 ? colors.brand.goldBright : colors.error) : colors.neutral[600] },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Reels */}
          <View style={styles.reelsRow}>
            {renderReel(currentReels[0], reel1Anim, 0)}
            <View style={styles.reelDivider} />
            {renderReel(currentReels[1], reel2Anim, 1)}
            <View style={styles.reelDivider} />
            {renderReel(currentReels[2], reel3Anim, 2)}
          </View>

          {/* Payline indicator */}
          <View style={styles.payline}>
            <View style={styles.paylineLeft} />
            <View style={styles.paylineCenter}>
              {showResult && lastResult?.win && (
                <Animated.View style={winScaleStyle}>
                  <Text style={styles.winBadgeText}>
                    {lastResult.winType === 'jackpot' ? 'JACKPOT!' : 'WIN!'}
                  </Text>
                </Animated.View>
              )}
            </View>
            <View style={styles.paylineRight} />
          </View>
        </LinearGradient>
      </View>

      {/* Result Display */}
      {showResult && lastResult && (
        <View style={[
          styles.resultCard,
          lastResult.win ? styles.resultCardWin : styles.resultCardLose,
        ]}>
          {lastResult.win ? (
            <>
              <Ionicons
                name={lastResult.winType === 'jackpot' ? 'star' : 'happy'}
                size={28}
                color={lastResult.winType === 'jackpot' ? colors.brand.goldBright : colors.successScale[400]}
              />
              <View>
                <Text style={styles.resultTitle}>
                  {lastResult.winType === 'jackpot' ? 'JACKPOT!' : 'You Win!'}
                </Text>
                <Text style={styles.resultAmount}>+{lastResult.winAmount} {BRAND.CURRENCY_CODE}</Text>
              </View>
            </>
          ) : (
            <>
              <Ionicons name="sad" size={28} color={Colors.text.tertiary} />
              <Text style={styles.resultTitle}>No match. Try again!</Text>
            </>
          )}
        </View>
      )}

      {/* Spin Button */}
      <Pressable
        style={[styles.spinButton, (spinning || balance < SPIN_COST) && styles.spinButtonDisabled]}
        onPress={handleSpin}
        disabled={spinning || balance < SPIN_COST}
       
      >
        <LinearGradient
          colors={spinning ? [colors.neutral[400], colors.neutral[500]] : [colors.error, colors.error]}
          style={styles.spinButtonGradient}
        >
          {spinning ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <>
              <Ionicons name="play" size={24} color={Colors.text.inverse} />
              <Text style={styles.spinButtonText}>SPIN</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statBoxValue}>{totalSpins}</Text>
          <Text style={styles.statBoxLabel}>Total Spins</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxValue}>{totalWins}</Text>
          <Text style={styles.statBoxLabel}>Total Won</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxValue}>{totalSpins > 0 ? Math.round((totalWins / (totalSpins * SPIN_COST)) * 100) : 0}%</Text>
          <Text style={styles.statBoxLabel}>Return</Text>
        </View>
      </View>

      {/* Paytable */}
      <View style={styles.paytable}>
        <Text style={styles.paytableTitle}>Paytable</Text>
        <View style={styles.paytableRow}>
          <Text style={styles.paytableSymbols}>7️⃣ 7️⃣ 7️⃣</Text>
          <Text style={styles.paytableAmount}>{`200 ${BRAND.CURRENCY_CODE}`}</Text>
        </View>
        <View style={styles.paytableRow}>
          <Text style={styles.paytableSymbols}>💎 💎 💎</Text>
          <Text style={styles.paytableAmount}>{`100 ${BRAND.CURRENCY_CODE}`}</Text>
        </View>
        <View style={styles.paytableRow}>
          <Text style={styles.paytableSymbols}>⭐ ⭐ ⭐</Text>
          <Text style={styles.paytableAmount}>{`75 ${BRAND.CURRENCY_CODE}`}</Text>
        </View>
        <View style={styles.paytableRow}>
          <Text style={styles.paytableSymbols}>Any 3 same</Text>
          <Text style={styles.paytableAmount}>{`50 ${BRAND.CURRENCY_CODE}`}</Text>
        </View>
        <View style={styles.paytableRow}>
          <Text style={styles.paytableSymbols}>Any 2 same</Text>
          <Text style={styles.paytableAmount}>{`10 ${BRAND.CURRENCY_CODE}`}</Text>
        </View>
      </View>

      {/* Back to Games */}
      <Pressable style={styles.backToGamesBtn} onPress={() => router.push('/games' as any)}>
        <Ionicons name="game-controller" size={18} color={Colors.text.primary} />
        <ThemedText style={styles.backToGamesText}>More Games</ThemedText>
      </Pressable>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Slot Machine',
          headerStyle: { backgroundColor: '#FF8B94' },
          headerTintColor: colors.neutral[900],
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <Pressable
              onPress={handleBackPress}
              style={styles.headerBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </Pressable>
          ) }}
      />
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#FF8B94', '#FF7A85', '#FF6976']}
            style={styles.gradient}
          >
            {renderIdleOrPlaying()}
          </LinearGradient>
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 },
  headerBackButton: {
    marginLeft: Platform.OS === 'ios' ? Spacing.sm : Spacing.base,
    padding: Spacing.xs },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120 },
  gradient: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing['3xl'] },
  mainContent: {
    width: '100%',
    alignItems: 'center' },
  // Balance Bar
  balanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: 14,
    marginBottom: Spacing.base,
    ...Shadows.medium },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  balanceCoin: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md },
  balanceText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue },
  balanceRight: {},
  spinCostText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.tertiary },
  // Machine
  machineContainer: {
    width: '100%',
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.strong },
  machineBody: {
    padding: Spacing.lg,
    alignItems: 'center' },
  machineHeader: {
    alignItems: 'center',
    marginBottom: Spacing.base },
  machineHeaderText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brand.goldBright,
    letterSpacing: 3,
    marginBottom: Spacing.sm },
  lightRow: {
    flexDirection: 'row',
    gap: Spacing.sm },
  light: {
    width: 10,
    height: 10,
    borderRadius: 5 },
  reelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: Spacing.sm,
    gap: 0 },
  reelContainer: {
    flex: 1,
    alignItems: 'center' },
  reelWindow: {
    width: 80,
    height: 90,
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border.default,
    overflow: 'hidden' },
  reelSymbol: {
    fontSize: 44 },
  reelDivider: {
    width: 2,
    height: 70,
    backgroundColor: colors.neutral[200] },
  payline: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 12 },
  paylineLeft: {
    flex: 1,
    height: 2,
    backgroundColor: colors.brand.goldBright },
  paylineCenter: {
    paddingHorizontal: 12,
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center' },
  paylineRight: {
    flex: 1,
    height: 2,
    backgroundColor: colors.brand.goldBright },
  winBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brand.goldBright,
    letterSpacing: 2 },
  // Result Card
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 16 },
  resultCardWin: {
    backgroundColor: Colors.successScale[50],
    borderWidth: 1,
    borderColor: Colors.success },
  resultCardLose: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default },
  resultTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary },
  resultAmount: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.success },
  // Spin Button
  spinButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5 },
  spinButtonDisabled: {
    opacity: 0.7 },
  spinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10 },
  spinButtonText: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: 2 },
  // Stats
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginBottom: Spacing.lg },
  statBox: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    ...Shadows.subtle },
  statBoxValue: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary },
  statBoxLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2 },
  // Paytable
  paytable: {
    width: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    ...Shadows.medium },
  paytableTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textAlign: 'center' },
  paytableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary },
  paytableSymbols: {
    ...Typography.bodyLarge,
    color: Colors.text.secondary },
  paytableAmount: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue },
  // Back
  backToGamesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    gap: Spacing.sm,
    ...Shadows.subtle },
  backToGamesText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary } });

export default withErrorBoundary(SlotsPage, 'GamesSlots');
