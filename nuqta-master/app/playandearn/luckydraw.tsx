// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import gameApi from '../../services/gameApi';
import { useGamification } from '@/contexts/GamificationContext';
import { useRezBalance, useRefreshWallet, useAdjustBalance } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// Nuqta App Theme Colors
const COLORS = {
  primary: colors.lightMustard,
  primaryLight: '#ffe082',
  primaryDark: colors.brand.goldRich,
  primaryBg: colors.lavenderMist,

  gold: colors.brand.goldWarm,
  goldDark: '#F5A623',
  goldBg: colors.tint.amber,

  amber: colors.warningScale[400],
  amberDark: colors.warningScale[700],
  amberBg: colors.tint.amberLight,

  orange: colors.brand.orange,
  orangeDark: colors.brand.orangeDark,
  orangeBg: colors.tint.orange,

  background: colors.linen,
  surface: colors.background.primary,
  surfaceSecondary: '#F0F4F8',

  navy: colors.nileBlue,
  text: colors.nileBlue,
  textMuted: '#627D98',
  textLight: colors.gray[400],

  border: colors.slateLight,
  success: colors.success,
  successBg: colors.successScale[50],
  error: colors.error,
  errorBg: colors.errorScale[50],

  shadow: 'rgba(26, 58, 82, 0.08)' };

interface Prize {
  id: number;
  name: string;
  value: number;
  icon: string;
  chance: number;
  color: [string, string];
}

// Confetti particle for celebration
const ConfettiParticle: React.FC<{ delay: number; color: string }> = ({ delay, color }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const startAnimation = () => {
      translateY.value = 0;
      translateX.value = Math.random() * 200 - 100;
      opacity.value = 1;
      rotate.value = 0;

      translateY.value = withTiming(300, { duration: 2500, easing: Easing.out(Easing.quad) });
      opacity.value = withTiming(0, { duration: 2500 });
      rotate.value = withTiming(1, { duration: 2500 });
    };
    const timeout = setTimeout(startAnimation, delay);
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const spin = interpolate(rotate.value, [0, 1], ['0deg', '360deg']);

  return (
    <Animated.View style={[styles.confetti, { backgroundColor: color, transform: [{ translateY }, { translateX }, { rotate: spin }], opacity }]} />
  );
};

const LuckyDraw = () => {
  const router = useRouter();
  const { actions: gamificationActions } = useGamification();
  const walletBalance = useRezBalance();
  const refreshWallet = useRefreshWallet();
  const adjustBalance = useAdjustBalance();
  const [gameState, setGameState] = useState<'start' | 'spinning' | 'result' | 'error'>('start');
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [todayPlays, setTodayPlays] = useState(0);
  const [maxPlays, setMaxPlays] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const spinValue = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const isMounted = useIsMounted();

  const prizes: Prize[] = [
    { id: 1, name: '1000 Coins', value: 1000, icon: '💰', chance: 5, color: [COLORS.amber, COLORS.amberDark] },
    { id: 2, name: '500 Coins', value: 500, icon: '🪙', chance: 10, color: [Colors.success, colors.successScale[700]] },
    { id: 3, name: '250 Coins', value: 250, icon: '💵', chance: 20, color: [Colors.info, colors.brand.blue] },
    { id: 4, name: '100 Coins', value: 100, icon: '💳', chance: 30, color: [Colors.brand.purpleLight, Colors.brand.purple] },
    { id: 5, name: '50 Coins', value: 50, icon: '🎁', chance: 35, color: [COLORS.orange, COLORS.orangeDark] }
  ];

  // Fetch daily limits and wallet balance
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [limitsResponse] = await Promise.all([
          gameApi.getDailyLimits(),
          refreshWallet(),
        ]);
        if (limitsResponse.data) {
          const spinLimits = limitsResponse.data.spin_wheel;
          if (spinLimits) {
            setTodayPlays(spinLimits.used);
            setMaxPlays(spinLimits.limit);
          }
        }
      } catch (err) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Pulse animation for spin button
  useEffect(() => {
    if (gameState === 'start' && todayPlays < maxPlays) {
      pulseAnim.value = withRepeat(withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ), -1);
    }
  }, [gameState, todayPlays, maxPlays]);

  const spin = async () => {
    if (todayPlays >= maxPlays || spinning) return;

    setSpinning(true);
    setGameState('spinning');
    setError(null);

    spinValue.value = 0;
    spinValue.value = withTiming(1, { duration: 3000, easing: Easing.out(Easing.cubic) });

    try {
      const response = await gameApi.spinWheel();

      setTimeout(async () => {
        if (response.success && response.data?.result?.prize) {
          const coinsWon = response.data.result.prize.value;
          let wonPrize = prizes.find(p => p.value === coinsWon) || prizes[prizes.length - 1];
          setPrize({ ...wonPrize, value: coinsWon });
          setSpinning(false);
          setGameState('result');
          setTodayPlays(todayPlays + 1);
          adjustBalance(coinsWon);
          await refreshWallet();
          await gamificationActions.syncCoinsFromWallet();
        } else {
          if (!isMounted()) return;
          setSpinning(false);
          if (!isMounted()) return;
          setError(response.error || 'Failed to get spin result');
          if (!isMounted()) return;
          setGameState('error');
        }
      }, 3000);
    } catch (err) {
      setTimeout(() => {
        setSpinning(false);
        setError('Unable to spin the wheel. Please try again.');
        setGameState('error');
      }, 3000);
    }
  };

  const retryGame = () => {
    setError(null);
    setGameState('start');
  };

  const spinRotation = interpolate(spinValue.value, [0, 1], ['0deg', '1800deg']);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="chevron-back" size={24} color={COLORS.navy} />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerIconText}>🎰</Text>
            <Text style={styles.headerTitle}>Lucky Draw</Text>
          </View>
          <Text style={styles.headerSubtitle}>Spin once daily, win big!</Text>
        </View>

        <Pressable style={styles.coinsBadge} onPress={() => router.push('/wallet' as any)}>
          <CachedImage source={BRAND.COIN_IMAGE} style={styles.coinIcon} contentFit="contain" />
          <Text style={styles.coinsText}>{walletBalance.toLocaleString()}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.content}>
          {/* Hero */}
          <LinearGradient
            colors={[COLORS.amber, COLORS.orange]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroIconBg}>
              <Text style={styles.heroIconText}>🎰</Text>
            </View>
            <Text style={styles.heroTitle}>Daily Lucky Draw</Text>
            <Text style={styles.heroSubtitle}>One free spin every day!</Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatBox}>
                <CachedImage source={BRAND.COIN_IMAGE} style={styles.heroStatIcon} contentFit="contain" />
                <Text style={styles.heroStatValue}>1000</Text>
                <Text style={styles.heroStatLabel}>Max Prize</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatBox}>
                <Ionicons name="game-controller" size={24} color={Colors.text.inverse} />
                <Text style={styles.heroStatValue}>{maxPlays - todayPlays}/{maxPlays}</Text>
                <Text style={styles.heroStatLabel}>Spins Left</Text>
              </View>
            </View>
            <View style={[styles.decorCircle, styles.decorCircle1]} />
            <View style={[styles.decorCircle, styles.decorCircle2]} />
          </LinearGradient>

          {/* Wheel */}
          {gameState !== 'result' && gameState !== 'error' && (
            <View style={styles.wheelContainer}>
              <View style={styles.wheelShadow}>
                <Animated.View
                  style={[
                    styles.wheel,
                    spinning && { transform: [{ rotate: spinRotation }] },
                  ]}
                >
                  <LinearGradient
                    colors={[COLORS.surface, COLORS.surfaceSecondary]}
                    style={styles.wheelGradient}
                  >
                    <Text style={styles.wheelIcon}>🎰</Text>
                    {!spinning && (
                      <Text style={styles.wheelText}>Tap to Spin!</Text>
                    )}
                    {spinning && (
                      <ActivityIndicator size="small" color={COLORS.amber} style={{ marginTop: 8 }} />
                    )}
                  </LinearGradient>
                </Animated.View>
              </View>
              <Pressable
                onPress={spin}
                disabled={todayPlays >= maxPlays || spinning}
                style={styles.wheelTouchable}
              />
            </View>
          )}

          {/* Result */}
          {gameState === 'result' && prize && (
            <View style={styles.resultContainer}>
              {/* Confetti */}
              <View style={styles.confettiContainer}>
                {[...Array(20)].map((_, i) => (
                  <ConfettiParticle
                    key={i}
                    delay={i * 120}
                    color={[COLORS.amber, COLORS.gold, colors.brand.pink, colors.infoScale[400], COLORS.primary][i % 5]}
                  />
                ))}
              </View>

              <View style={styles.resultCard}>
                <LinearGradient
                  colors={prize.color}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.resultGradient}
                >
                  <View style={styles.resultIconWrapper}>
                    <Text style={styles.resultIconText}>{prize.icon}</Text>
                  </View>
                  <Text style={styles.resultTitle}>Congratulations!</Text>
                  <Text style={styles.resultSubtitleText}>You Won!</Text>

                  <View style={styles.earnedBox}>
                    <View style={styles.earnedRow}>
                      <CachedImage source={BRAND.COIN_IMAGE} style={styles.earnedCoin} contentFit="contain" />
                      <Text style={styles.earnedValue}>+{prize.value}</Text>
                    </View>
                    <Text style={styles.earnedLabel}>Coins Added to Wallet</Text>
                  </View>
                </LinearGradient>
              </View>

              <Pressable
                onPress={() => router.push('/playandearn' as any)}
                style={styles.secondaryAction}
              >
                <Ionicons name="arrow-back" size={18} color={COLORS.textMuted} />
                <Text style={styles.secondaryActionText}>Back to Games</Text>
              </Pressable>
            </View>
          )}

          {/* Error State */}
          {gameState === 'error' && (
            <View style={styles.errorContainer}>
              <View style={styles.errorIconBg}>
                <Ionicons name="alert-circle" size={48} color={COLORS.error} />
              </View>
              <Text style={styles.errorTitle}>Spin Failed</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={retryGame}>
                <LinearGradient colors={[COLORS.amber, COLORS.orange]} style={styles.retryButton}>
                  <Ionicons name="refresh" size={18} color={Colors.text.inverse} />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                onPress={() => router.push('/playandearn' as any)}
                style={styles.secondaryAction}
              >
                <Ionicons name="arrow-back" size={18} color={COLORS.textMuted} />
                <Text style={styles.secondaryActionText}>Back to Games</Text>
              </Pressable>
            </View>
          )}

          {/* Prize Table */}
          {gameState === 'start' && (
            <View style={styles.prizeTable}>
              <View style={styles.prizeTableHeader}>
                <Ionicons name="gift" size={20} color={COLORS.amber} />
                <Text style={styles.prizeTableTitle}>Possible Prizes</Text>
              </View>
              {prizes.map((p) => (
                <View key={p.id} style={styles.prizeRow}>
                  <View style={[styles.prizeIconBg, { backgroundColor: `${p.color[0]}15` }]}>
                    <Text style={styles.prizeIcon}>{p.icon}</Text>
                  </View>
                  <View style={styles.prizeInfo}>
                    <Text style={styles.prizeName}>{p.name}</Text>
                    <View style={styles.prizeChanceBadge}>
                      <Text style={styles.prizeChance}>{p.chance}% chance</Text>
                    </View>
                  </View>
                  <View style={[styles.prizeValueBadge, { backgroundColor: `${p.color[0]}15` }]}>
                    <CachedImage source={BRAND.COIN_IMAGE} style={styles.prizeValueIcon} contentFit="contain" />
                    <Text style={[styles.prizeValue, { color: p.color[0] }]}>{p.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Spin Button */}
          {gameState === 'start' && (
            <Animated.View style={[styles.spinButtonWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <Pressable
                onPress={spin}
                disabled={todayPlays >= maxPlays}
               
              >
                <LinearGradient
                  colors={todayPlays >= maxPlays ? [Colors.text.tertiary, Colors.neutral[500]] : [COLORS.amber, COLORS.orange]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.spinButton}
                >
                  <Ionicons name={todayPlays >= maxPlays ? "time-outline" : "dice"} size={22} color={Colors.text.inverse} />
                  <Text style={styles.spinButtonText}>
                    {todayPlays >= maxPlays ? 'Come Back Tomorrow' : 'Spin Now!'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base,
    paddingTop: 52, paddingBottom: Spacing.base, gap: Spacing.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    backgroundColor: COLORS.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerIconText: { ...Typography.h2, fontSize: 24 },
  headerTitle: { ...Typography.h3, fontWeight: '700', color: COLORS.navy },
  headerSubtitle: { ...Typography.bodySmall, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  coinsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl, backgroundColor: COLORS.goldBg },
  coinIcon: { width: 20, height: 20 },
  coinsText: { ...Typography.body, fontSize: 15, fontWeight: '700', color: COLORS.goldDark },

  scrollView: { flex: 1 },
  content: { padding: Spacing.base },

  // Hero Card
  heroCard: {
    padding: 28, borderRadius: BorderRadius['2xl'], alignItems: 'center', marginBottom: Spacing.lg,
    overflow: 'hidden', position: 'relative' },
  heroIconBg: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.base },
  heroIconText: { fontSize: 40 },
  heroTitle: { ...Typography.h1, fontWeight: '800', color: Colors.text.inverse, marginBottom: Spacing.sm },
  heroSubtitle: { ...Typography.body, fontSize: 15, color: 'rgba(255,255,255,0.9)', marginBottom: Spacing.xl },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2xl'] },
  heroStatBox: { alignItems: 'center' },
  heroStatIcon: { width: 28, height: 28, marginBottom: Spacing.sm },
  heroStatValue: { ...Typography.h2, fontWeight: '800', color: Colors.text.inverse },
  heroStatLabel: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)', marginTop: Spacing.xs },
  heroStatDivider: { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.3)' },
  decorCircle: { position: 'absolute', borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)' },
  decorCircle1: { width: 120, height: 120, top: -40, right: -40 },
  decorCircle2: { width: 100, height: 100, bottom: -30, left: -30 },

  // Wheel
  wheelContainer: {
    alignItems: 'center', marginBottom: Spacing.lg, position: 'relative' },
  wheelShadow: {
    shadowColor: COLORS.amber, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 8 },
  wheel: {
    width: width - 80, aspectRatio: 1, borderRadius: (width - 80) / 2, overflow: 'hidden' },
  wheelGradient: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: COLORS.border, borderRadius: (width - 80) / 2 },
  wheelIcon: { fontSize: 64 },
  wheelText: { ...Typography.h4, fontWeight: '700', color: COLORS.navy, marginTop: Spacing.sm },
  wheelTouchable: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  // Result
  resultContainer: { gap: Spacing.base },
  resultCard: {
    borderRadius: BorderRadius['2xl'], overflow: 'hidden',
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 8 },
  resultGradient: { padding: Spacing['2xl'], alignItems: 'center' },
  resultIconWrapper: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg },
  resultIconText: { fontSize: 48 },
  resultTitle: { ...Typography.display, fontWeight: '800', color: Colors.text.inverse, marginBottom: Spacing.xs },
  resultSubtitleText: { ...Typography.h3, fontWeight: '700', color: Colors.text.inverse, marginBottom: Spacing.lg },
  earnedBox: {
    paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  earnedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  earnedCoin: { width: 36, height: 36 },
  earnedValue: { fontSize: 44, fontWeight: '800', color: Colors.text.inverse },
  earnedLabel: { ...Typography.bodySmall, fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  // Confetti
  confettiContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 200, pointerEvents: 'none', overflow: 'hidden', zIndex: 10 },
  confetti: { position: 'absolute', width: 10, height: 10, borderRadius: 2, left: '50%', top: -10 },

  // Error
  errorContainer: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.base },
  errorIconBg: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.errorBg,
    justifyContent: 'center', alignItems: 'center' },
  errorTitle: { ...Typography.h2, fontWeight: '700', color: COLORS.error },
  errorText: { ...Typography.body, color: COLORS.textMuted, textAlign: 'center' },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 14, paddingHorizontal: Spacing['2xl'], borderRadius: BorderRadius.md },
  retryButtonText: { ...Typography.body, fontWeight: '600', color: Colors.text.inverse },

  // Prize Table
  prizeTable: {
    backgroundColor: COLORS.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 },
  prizeTableHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.base },
  prizeTableTitle: { ...Typography.h4, fontSize: 17, fontWeight: '700', color: COLORS.navy },
  prizeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: 14, backgroundColor: COLORS.surfaceSecondary, marginBottom: Spacing.sm },
  prizeIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  prizeIcon: { fontSize: 24 },
  prizeInfo: { flex: 1 },
  prizeName: { ...Typography.body, fontSize: 15, fontWeight: '600', color: COLORS.navy, marginBottom: 2 },
  prizeChanceBadge: {
    alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm,
    backgroundColor: COLORS.amberBg },
  prizeChance: { ...Typography.caption, fontWeight: '600', color: COLORS.amber },
  prizeValueBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md },
  prizeValueIcon: { width: 16, height: 16 },
  prizeValue: { ...Typography.body, fontSize: 15, fontWeight: '700' },

  // Spin Button
  spinButtonWrapper: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  spinButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18, borderRadius: BorderRadius.lg },
  spinButtonText: { ...Typography.h4, fontSize: 17, fontWeight: '700', color: Colors.text.inverse },

  // Actions
  secondaryAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.base, borderRadius: BorderRadius.lg, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  secondaryActionText: { ...Typography.body, fontSize: 15, fontWeight: '600', color: COLORS.textMuted } });

export default withErrorBoundary(LuckyDraw, 'PlayandearnLuckydraw');
