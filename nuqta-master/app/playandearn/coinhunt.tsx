// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  interpolate,
  Easing} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import gameApi from '../../services/gameApi';
import { useGamification } from '@/contexts/GamificationContext';
import { useRezBalance, useRefreshWallet } from '@/stores/selectors';
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
  goldLight: '#FFE4A0',
  goldDark: '#F5A623',
  goldBg: colors.tint.amber,

  amber: colors.warningScale[400],
  amberDark: colors.warningScale[700],
  amberBg: colors.tint.amberLight,

  background: colors.linen,
  surface: colors.background.primary,
  surfaceSecondary: '#F0F4F8',

  navy: colors.nileBlue,
  text: colors.nileBlue,
  textSecondary: '#334E68',
  textMuted: '#627D98',
  textLight: colors.gray[400],

  border: colors.slateLight,
  success: colors.success,
  successBg: colors.successScale[50],
  error: colors.error,
  errorBg: colors.errorScale[50],

  shadow: 'rgba(26, 58, 82, 0.08)'};

interface Coin {
  id: number;
  x: number;
  y: number;
  value: number;
}

// Animated Coin Component
const AnimatedCoin: React.FC<{ coin: Coin; onCatch: () => void }> = ({ coin, onCatch }) => {
  const scaleAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    // Pop-in animation
    scaleAnim.value = withSpring(1, { damping: 6, stiffness: 120 });

    // Pulse animation
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1
    );
    return () => {
      scaleAnim.value = 0;
      pulseAnim.value = 1;
    };
  }, []);

  const bgColors: [string, string] = coin.value >= 20 ? [COLORS.goldDark, COLORS.amber] : [COLORS.gold, COLORS.primary];

  return (
    <Pressable
      onPress={onCatch}
      style={[styles.coinButton, { left: `${coin.x}%`, top: `${coin.y}%` }]}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim.value * pulseAnim.value }] }}>
        <LinearGradient
          colors={bgColors}
          style={styles.coinGradient}
        >
          <Text style={styles.coinValue}>+{coin.value}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

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
    <Animated.View
      style={[styles.confetti, { backgroundColor: color, transform: [{ translateY }, { translateX }, { rotate: spin }], opacity }]}
    />
  );
};

const CoinHunt = () => {
  const router = useRouter();
  const { actions: gamificationActions } = useGamification();
  const walletBalance = useRezBalance();
  const refreshWallet = useRefreshWallet();
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'result'>('start');
  const [coins, setCoins] = useState<Coin[]>([]);
  const [todayPlays, setTodayPlays] = useState(0);
  const [maxPlays, setMaxPlays] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [coinsCollected, setCoinsCollected] = useState(0);

  const progressAnim = useSharedValue(1);

  const isMounted = useIsMounted();

  // Fetch daily limits and wallet balance on mount
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [limitsResponse] = await Promise.all([
        gameApi.getDailyLimits(),
        refreshWallet(),
      ]);

      if (limitsResponse.data) {
        const huntLimits = limitsResponse.data.coin_hunt;
        if (huntLimits) {
          setTodayPlays(huntLimits.used);
          setMaxPlays(huntLimits.limit);
        }
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load game data. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
        progressAnim.value = withTiming((timeLeft - 1) / 30, { duration: 1000 });
      }, 1000);
      return () => {
        clearTimeout(timer);
      };
    } else if (timeLeft === 0 && gameState === 'playing') {
      endGame();
    }
  }, [gameState, timeLeft]);

  const endGame = async () => {
    setGameState('result');

    if (sessionId) {
      try {
        const response = await gameApi.completeCoinHunt(sessionId, coinsCollected, score);
        if (response.data) {
          if (response.data.coinsEarned !== undefined) {
            setScore(response.data.coinsEarned);
          }
        }
        await refreshWallet();
        const limitsResponse = await gameApi.getDailyLimits();
        if (limitsResponse.data?.coin_hunt) {
          setTodayPlays(limitsResponse.data.coin_hunt.used);
        }
        await gamificationActions.syncCoinsFromWallet();
      } catch (err) {
        if (!isMounted()) return;
        setTodayPlays(todayPlays + 1);
      }
    } else {
      if (!isMounted()) return;
      setTodayPlays(todayPlays + 1);
    }
  };

  useEffect(() => {
    if (gameState === 'playing') {
      const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();
      const interval = setInterval(() => {
        const newCoin: Coin = {
          id: Date.now(),
          x: Math.random() * 70 + 10,
          y: Math.random() * 55 + 5,
          value: [5, 10, 15, 25][Math.floor(Math.random() * 4)]
        };
        setCoins(prev => [...prev, newCoin]);
        const t = setTimeout(() => {
          setCoins(prev => prev.filter(c => c.id !== newCoin.id));
          pendingTimeouts.delete(t);
        }, 2000);
        pendingTimeouts.add(t);
      }, 800);
      return () => {
        clearInterval(interval);
        pendingTimeouts.forEach(t => clearTimeout(t));
        pendingTimeouts.clear();
      };
    }
  }, [gameState]);

  const startGame = async () => {
    if (todayPlays >= maxPlays) return;

    setError(null);
    setScore(0);
    setTimeLeft(30);
    setCoins([]);
    setCoinsCollected(0);
    progressAnim.value = 1;

    try {
      const response = await gameApi.startCoinHunt();
      if (response.data?.sessionId) {
        setSessionId(response.data.sessionId);
      }
      if (!isMounted()) return;
      setGameState('playing');
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to start the game. Please try again.');
    }
  };

  const catchCoin = (coin: Coin) => {
    setScore(prev => prev + coin.value);
    setCoins(prev => prev.filter(c => c.id !== coin.id));
    setCoinsCollected(prev => prev + 1);
  };

  const getPerformanceRating = () => {
    if (score >= 200) return { text: 'Amazing!', icon: 'star' as const, color: COLORS.gold };
    if (score >= 100) return { text: 'Great Job!', icon: 'trophy' as const, color: COLORS.amber };
    if (score >= 50) return { text: 'Good Try!', icon: 'thumbs-up' as const, color: COLORS.primary };
    return { text: 'Keep Hunting!', icon: 'refresh' as const, color: COLORS.textMuted };
  };

  const progressWidth = interpolate(progressAnim.value, [0, 1], ['0%', '100%']);

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
            <Text style={styles.headerIconText}>🪙</Text>
            <Text style={styles.headerTitle}>Coin Hunt</Text>
          </View>
          <Text style={styles.headerSubtitle}>Catch falling coins!</Text>
        </View>

        {gameState === 'playing' ? (
          <View style={[styles.timerBadge, timeLeft <= 10 && styles.timerBadgeWarning]}>
            <Ionicons name="time-outline" size={16} color={timeLeft <= 10 ? COLORS.error : COLORS.amber} />
            <Text style={[styles.timerText, timeLeft <= 10 && styles.timerTextWarning]}>{timeLeft}s</Text>
          </View>
        ) : (
          <Pressable style={styles.coinsBadge} onPress={() => router.push('/wallet' as any)}>
            <CachedImage source={BRAND.COIN_IMAGE} style={styles.coinIcon} contentFit="contain" />
            <Text style={styles.coinsText}>{walletBalance.toLocaleString()}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Start Screen */}
        {gameState === 'start' && (
          <View style={styles.content}>
            {/* Error State */}
            {error && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={32} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={() => { setError(null); fetchData(); }} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {/* Hero Card */}
            <LinearGradient
              colors={[COLORS.amber, COLORS.amberDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroIconBg}>
                <Text style={styles.heroIconText}>🪙</Text>
              </View>

              <Text style={styles.heroTitle}>Coin Hunt</Text>
              <Text style={styles.heroSubtitle}>Tap coins before they disappear! You have 30 seconds.</Text>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatBox}>
                  <CachedImage source={BRAND.COIN_IMAGE} style={styles.heroStatIcon} contentFit="contain" />
                  <Text style={styles.heroStatValue}>200+</Text>
                  <Text style={styles.heroStatLabel}>Max Coins</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatBox}>
                  <Ionicons name="game-controller" size={24} color={Colors.text.inverse} />
                  <Text style={styles.heroStatValue}>{maxPlays - todayPlays}/{maxPlays}</Text>
                  <Text style={styles.heroStatLabel}>Plays Left</Text>
                </View>
              </View>

              <View style={[styles.decorCircle, styles.decorCircle1]} />
              <View style={[styles.decorCircle, styles.decorCircle2]} />
            </LinearGradient>

            {/* How to Play */}
            <View style={styles.howToPlayCard}>
              <View style={styles.howToPlayHeader}>
                <Ionicons name="help-circle" size={20} color={COLORS.amber} />
                <Text style={styles.howToPlayTitle}>How to Play</Text>
              </View>

              <View style={styles.stepsContainer}>
                {[
                  { num: '1', color: COLORS.amber, title: 'Tap coins before they vanish', desc: 'Each coin appears for 2 seconds', icon: 'hand-left' },
                  { num: '2', color: COLORS.gold, title: 'Each coin is worth 5-25 points', desc: 'Bigger coins = more points', icon: 'cash' },
                  { num: '3', color: colors.brand.pink, title: 'Collect as many as you can', desc: '30 seconds on the clock!', icon: 'timer' },
                ].map((step, idx) => (
                  <View key={idx} style={styles.stepRow}>
                    <View style={[styles.stepBadge, { backgroundColor: `${step.color}15` }]}>
                      <Text style={[styles.stepBadgeText, { color: step.color }]}>{step.num}</Text>
                    </View>
                    <View style={styles.stepTextContainer}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDesc}>{step.desc}</Text>
                    </View>
                    <View style={[styles.stepIconBg, { backgroundColor: `${step.color}10` }]}>
                      <Ionicons name={step.icon as any} size={18} color={step.color} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Start Button */}
            <Pressable
              onPress={startGame}
              disabled={todayPlays >= maxPlays}
             
              style={styles.startButtonWrapper}
            >
              <LinearGradient
                colors={todayPlays >= maxPlays ? [Colors.text.tertiary, Colors.neutral[500]] : [COLORS.amber, COLORS.amberDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButton}
              >
                <Ionicons name={todayPlays >= maxPlays ? "time-outline" : "play"} size={22} color={Colors.text.inverse} />
                <Text style={styles.startButtonText}>
                  {todayPlays >= maxPlays ? 'Come Back Tomorrow' : 'Start Game'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Playing Screen */}
        {gameState === 'playing' && (
          <View style={styles.content}>
            {/* Stats Bar */}
            <View style={styles.gameStatsBar}>
              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatLabel}>COLLECTED</Text>
                <Text style={styles.gameStatValue}>{coinsCollected}</Text>
              </View>
              <View style={styles.gameStatDivider} />
              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatLabel}>SCORE</Text>
                <View style={styles.scoreRow}>
                  <CachedImage source={BRAND.COIN_IMAGE} style={styles.miniCoin} contentFit="contain" />
                  <Text style={[styles.gameStatValue, { color: COLORS.amber }]}>{score}</Text>
                </View>
              </View>
            </View>

            {/* Game Area */}
            <View style={styles.gameContainer}>
              <LinearGradient
                colors={[COLORS.surface, COLORS.surfaceSecondary]}
                style={styles.gameArea}
              >
                {coins.map(coin => (
                  <AnimatedCoin key={coin.id} coin={coin} onCatch={() => catchCoin(coin)} />
                ))}

                {coins.length === 0 && (
                  <View style={styles.waitingLabel}>
                    <Ionicons name="hourglass-outline" size={24} color={COLORS.textLight} />
                    <Text style={styles.waitingText}>Coins incoming...</Text>
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressWrapper}>
              <View style={styles.progressBg}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
                  <LinearGradient
                    colors={timeLeft <= 10 ? [COLORS.error, Colors.error] : [COLORS.amber, COLORS.gold]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressGradient}
                  />
                </Animated.View>
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>0s</Text>
                <Text style={[styles.progressLabel, styles.progressLabelCenter, timeLeft <= 10 && { color: COLORS.error }]}>
                  {timeLeft}s remaining
                </Text>
                <Text style={styles.progressLabel}>30s</Text>
              </View>
            </View>
          </View>
        )}

        {/* Result Screen */}
        {gameState === 'result' && (
          <View style={styles.content}>
            {/* Confetti */}
            {score >= 100 && (
              <View style={styles.confettiContainer}>
                {[...Array(15)].map((_, i) => (
                  <ConfettiParticle
                    key={i}
                    delay={i * 150}
                    color={[COLORS.amber, COLORS.gold, colors.brand.pink, COLORS.primary][i % 4]}
                  />
                ))}
              </View>
            )}

            {/* Result Card */}
            <View style={styles.resultCard}>
              <LinearGradient
                colors={score >= 100 ? [COLORS.amber, COLORS.amberDark] : [COLORS.surfaceSecondary, COLORS.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultGradient}
              >
                <View style={[styles.resultIconWrapper, { backgroundColor: score >= 100 ? 'rgba(255,255,255,0.2)' : COLORS.amberBg }]}>
                  <Ionicons
                    name={getPerformanceRating().icon}
                    size={48}
                    color={score >= 100 ? Colors.text.inverse : getPerformanceRating().color}
                  />
                </View>

                <Text style={[styles.resultTitle, { color: score >= 100 ? Colors.text.inverse : COLORS.navy }]}>
                  {getPerformanceRating().text}
                </Text>
                <Text style={[styles.resultSubtitle, { color: score >= 100 ? 'rgba(255,255,255,0.9)' : COLORS.textMuted }]}>
                  You collected {coinsCollected} coins in 30 seconds
                </Text>

                <View style={[styles.earnedBox, { backgroundColor: score >= 100 ? 'rgba(255,255,255,0.15)' : COLORS.goldBg }]}>
                  <View style={styles.earnedRow}>
                    <CachedImage source={BRAND.COIN_IMAGE} style={styles.earnedCoin} contentFit="contain" />
                    <Text style={[styles.earnedValue, { color: score >= 100 ? Colors.text.inverse : COLORS.gold }]}>+{score}</Text>
                  </View>
                  <Text style={[styles.earnedLabel, { color: score >= 100 ? 'rgba(255,255,255,0.8)' : COLORS.textMuted }]}>
                    Coins Earned
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.amberBg }]}>
                  <Ionicons name="wallet" size={22} color={COLORS.amber} />
                </View>
                <Text style={styles.statValue}>{coinsCollected}</Text>
                <Text style={styles.statLabel}>Collected</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: colors.tint.blueLight }]}>
                  <Ionicons name="time" size={22} color={Colors.info} />
                </View>
                <Text style={styles.statValue}>30s</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.successBg }]}>
                  <Ionicons name="trending-up" size={22} color={COLORS.success} />
                </View>
                <Text style={styles.statValue}>{coinsCollected > 0 ? (score / coinsCollected).toFixed(1) : 0}</Text>
                <Text style={styles.statLabel}>Avg/Coin</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <Pressable
                onPress={startGame}
                disabled={todayPlays >= maxPlays}
               
              >
                <LinearGradient
                  colors={todayPlays >= maxPlays ? [Colors.text.tertiary, Colors.neutral[500]] : [COLORS.amber, COLORS.amberDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryAction}
                >
                  <Ionicons name={todayPlays >= maxPlays ? "time-outline" : "refresh"} size={20} color={Colors.text.inverse} />
                  <Text style={styles.primaryActionText}>
                    {todayPlays >= maxPlays
                      ? `No Plays Left (${todayPlays}/${maxPlays})`
                      : `Play Again (${maxPlays - todayPlays} left)`}
                  </Text>
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
          </View>
        )}

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
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border},
  backButton: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    backgroundColor: COLORS.surfaceSecondary, justifyContent: 'center', alignItems: 'center'},
  headerCenter: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerIconText: { ...Typography.h2, fontSize: 24 },
  headerTitle: { ...Typography.h3, fontWeight: '700', color: COLORS.navy },
  headerSubtitle: { ...Typography.bodySmall, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl, backgroundColor: COLORS.amberBg},
  timerBadgeWarning: { backgroundColor: COLORS.errorBg },
  timerText: { ...Typography.body, fontSize: 15, fontWeight: '700', color: COLORS.amber },
  timerTextWarning: { color: COLORS.error },
  coinsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xl, backgroundColor: COLORS.goldBg},
  coinIcon: { width: 20, height: 20 },
  coinsText: { ...Typography.body, fontSize: 15, fontWeight: '700', color: COLORS.goldDark },

  scrollView: { flex: 1 },
  content: { padding: Spacing.base },

  // Error
  errorCard: {
    padding: Spacing.base, backgroundColor: COLORS.errorBg, borderRadius: BorderRadius.md, marginBottom: Spacing.base, alignItems: 'center', gap: Spacing.sm},
  errorText: { color: '#991B1B', ...Typography.body, textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: COLORS.error, borderRadius: BorderRadius.sm},
  retryBtnText: { color: Colors.text.inverse, fontWeight: '600' },

  // Hero Card
  heroCard: {
    padding: 28, borderRadius: BorderRadius['2xl'], alignItems: 'center', marginBottom: Spacing.lg,
    overflow: 'hidden', position: 'relative'},
  heroIconBg: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.base},
  heroIconText: { fontSize: 40 },
  heroTitle: { ...Typography.h1, fontWeight: '800', color: Colors.text.inverse, marginBottom: Spacing.sm },
  heroSubtitle: { ...Typography.body, fontSize: 15, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: Spacing.xl },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2xl'] },
  heroStatBox: { alignItems: 'center' },
  heroStatIcon: { width: 28, height: 28, marginBottom: Spacing.sm },
  heroStatValue: { ...Typography.h2, fontWeight: '800', color: Colors.text.inverse },
  heroStatLabel: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)', marginTop: Spacing.xs },
  heroStatDivider: { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.3)' },
  decorCircle: { position: 'absolute', borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)' },
  decorCircle1: { width: 120, height: 120, top: -40, right: -40 },
  decorCircle2: { width: 100, height: 100, bottom: -30, left: -30 },

  // How to Play
  howToPlayCard: {
    backgroundColor: COLORS.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4},
  howToPlayHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.base },
  howToPlayTitle: { ...Typography.h4, fontSize: 17, fontWeight: '700', color: COLORS.navy },
  stepsContainer: { gap: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepBadge: { width: 32, height: 32, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  stepBadgeText: { ...Typography.body, fontWeight: '700' },
  stepTextContainer: { flex: 1 },
  stepTitle: { ...Typography.body, fontWeight: '600', color: COLORS.navy, marginBottom: 2 },
  stepDesc: { ...Typography.bodySmall, color: COLORS.textMuted },
  stepIconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // Start Button
  startButtonWrapper: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18, borderRadius: BorderRadius.lg},
  startButtonText: { ...Typography.h4, fontSize: 17, fontWeight: '700', color: Colors.text.inverse },

  // Game Stats Bar
  gameStatsBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.base,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2},
  gameStatItem: { flex: 1, alignItems: 'center' },
  gameStatLabel: { ...Typography.overline, fontWeight: '600', color: COLORS.textLight, marginBottom: Spacing.xs, letterSpacing: 0.5 },
  gameStatValue: { ...Typography.h3, fontWeight: '700', color: COLORS.navy },
  gameStatDivider: { width: 1, height: 32, backgroundColor: COLORS.border },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  miniCoin: { width: 18, height: 18 },

  // Game Area
  gameContainer: {
    borderRadius: BorderRadius['2xl'], overflow: 'hidden', marginBottom: Spacing.base,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4},
  gameArea: {
    aspectRatio: 4 / 3, borderRadius: BorderRadius['2xl'], borderWidth: 2, borderColor: COLORS.border, position: 'relative'},
  coinButton: {
    position: 'absolute', width: 56, height: 56},
  coinGradient: {
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.amber, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8},
  coinValue: { ...Typography.bodySmall, fontSize: 13, fontWeight: '800', color: Colors.text.inverse },
  waitingLabel: {
    position: 'absolute', top: '45%', left: 0, right: 0, alignItems: 'center', gap: Spacing.sm},
  waitingText: { ...Typography.body, color: COLORS.textLight, fontWeight: '500' },

  // Progress Bar
  progressWrapper: { marginBottom: Spacing.sm },
  progressBg: { height: 10, backgroundColor: COLORS.surfaceSecondary, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5, overflow: 'hidden' },
  progressGradient: { flex: 1 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  progressLabel: { ...Typography.caption, color: COLORS.textLight },
  progressLabelCenter: { fontWeight: '600', color: COLORS.textMuted },

  // Confetti
  confettiContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 200, pointerEvents: 'none', overflow: 'hidden'},
  confetti: { position: 'absolute', width: 10, height: 10, borderRadius: 2, left: '50%', top: -10 },

  // Result Card
  resultCard: {
    borderRadius: BorderRadius['2xl'], overflow: 'hidden', marginBottom: Spacing.lg,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 8},
  resultGradient: { padding: Spacing['2xl'], alignItems: 'center' },
  resultIconWrapper: {
    width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg},
  resultTitle: { ...Typography.display, fontWeight: '800', marginBottom: Spacing.sm },
  resultSubtitle: { ...Typography.body, fontSize: 15, marginBottom: Spacing.xl },
  earnedBox: { paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center' },
  earnedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  earnedCoin: { width: 36, height: 36 },
  earnedValue: { fontSize: 44, fontWeight: '800' },
  earnedLabel: { fontSize: 13 },

  // Stats Grid
  statsGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, alignItems: 'center',
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2},
  statIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { ...Typography.h3, fontWeight: '700', color: COLORS.navy, marginBottom: Spacing.xs },
  statLabel: { ...Typography.caption, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Actions
  actionsContainer: { gap: Spacing.md },
  primaryAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: BorderRadius.lg},
  primaryActionText: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.inverse },
  secondaryAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.base, borderRadius: BorderRadius.lg, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border},
  secondaryActionText: { ...Typography.body, fontSize: 15, fontWeight: '600', color: COLORS.textMuted }});

export default withErrorBoundary(CoinHunt, 'PlayandearnCoinhunt');
