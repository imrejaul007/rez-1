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
  TextInput,
  ActivityIndicator
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  Easing} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import gameApi from '../../services/gameApi';
import { useGamification } from '@/contexts/GamificationContext';
import { useGetCurrencySymbol, useRezBalance, useRefreshWallet, useAdjustBalance } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// Nuqta App Theme Colors
const COLORS = {
  primary: Colors.gold,
  primaryLight: '#ffe082',
  primaryDark: colors.brand.goldRich,
  primaryBg: Colors.background.tertiary,

  gold: colors.brand.goldWarm,
  goldDark: '#F5A623',
  goldBg: colors.tint.amber,

  emerald: colors.successScale[400],
  emeraldDark: colors.successScale[700],
  emeraldBg: Colors.successScale[50],

  background: Colors.background.secondary,
  surface: Colors.background.primary,
  surfaceSecondary: '#F0F4F8',

  navy: Colors.nileBlue,
  text: Colors.text.primary,
  textSecondary: Colors.text.secondary,
  textMuted: Colors.text.tertiary,
  textLight: Colors.text.tertiary,

  border: Colors.border.default,
  success: Colors.success,
  successBg: Colors.successScale[50],
  warning: Colors.warning,
  warningBg: Colors.warningScale[50],
  error: Colors.error,
  errorBg: Colors.errorScale[50],

  shadow: 'rgba(26, 58, 82, 0.08)' };

interface Product {
  id: number;
  name: string;
  image: string;
  actualPrice: number;
  category: string;
}

interface Feedback {
  message: string;
  earnedCoins: number;
  actualPrice: number;
  difference: number;
  percentDiff: string;
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
    <Animated.View
      style={[styles.confetti, { backgroundColor: color, transform: [{ translateY }, { translateX }, { rotate: spin }], opacity }]}
    />
  );
};

const GuessPrice = () => {
  const router = useRouter();
  const { actions: gamificationActions } = useGamification();
  const getCurrencySymbol = useGetCurrencySymbol();
  const walletBalance = useRezBalance();
  const refreshWallet = useRefreshWallet();
  const adjustBalance = useAdjustBalance();
  const currencySymbol = getCurrencySymbol();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'result' | 'error'>('start');
  const [currentProduct, setCurrentProduct] = useState(0);
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [todayPlays, setTodayPlays] = useState(0);
  const [maxPlays, setMaxPlays] = useState(5);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingGame, setStartingGame] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const scaleAnim = useSharedValue(1);
  const isMounted = useIsMounted();

  // Fetch daily limits and wallet balance
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [limitsResponse] = await Promise.all([
          gameApi.getDailyLimits(),
          refreshWallet(),
        ]);

        if (limitsResponse.data) {
          const guessLimits = limitsResponse.data.guess_price;
          if (guessLimits) {
            setTodayPlays(guessLimits.used);
            setMaxPlays(guessLimits.limit);
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

  const startGame = async () => {
    if (todayPlays >= maxPlays || startingGame) return;

    setStartingGame(true);
    setError(null);
    setCurrentProduct(0);
    setScore(0);
    setGuess('');
    setFeedback(null);

    try {
      const response = await gameApi.startGuessPrice();
      if (response.success && response.data) {
        setSessionId(response.data.sessionId);
        if (response.data.products && response.data.products.length > 0) {
          const backendProducts = response.data.products.map((p: any, idx: number) => ({
            id: idx + 1,
            name: p.name,
            image: p.image || '📦',
            actualPrice: p.actualPrice || p.price,
            category: p.category || 'General'
          }));
          setProducts(backendProducts);
          setGameState('playing');
        } else if (response.data.product) {
          const backendProduct = response.data.product;
          setProducts([{
            id: 1,
            name: backendProduct.name,
            image: backendProduct.image || '📦',
            actualPrice: backendProduct.actualPrice || backendProduct.price,
            category: backendProduct.category || 'General'
          }]);
          setGameState('playing');
        } else {
          setError('No products available for the game');
          setGameState('error');
        }
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to start game');
        if (!isMounted()) return;
        setGameState('error');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Unable to start game. Please try again.');
      if (!isMounted()) return;
      setGameState('error');
    } finally {
      if (!isMounted()) return;
      setStartingGame(false);
    }
  };

  const retryGame = () => {
    setError(null);
    setGameState('start');
  };

  const submitGuess = async () => {
    if (!guess || parseInt(guess) <= 0) return;

    const product = products[currentProduct];
    const guessValue = parseInt(guess);
    const actualPrice = product.actualPrice;
    const difference = Math.abs(guessValue - actualPrice);
    const percentDiff = (difference / actualPrice) * 100;

    let earnedCoins = 0;
    let message = '';

    if (percentDiff <= 5) { earnedCoins = 50; message = 'Perfect! Within 5%'; }
    else if (percentDiff <= 10) { earnedCoins = 30; message = 'Great! Within 10%'; }
    else if (percentDiff <= 20) { earnedCoins = 15; message = 'Good! Within 20%'; }
    else { earnedCoins = 5; message = 'Try again!'; }

    if (sessionId) {
      try {
        const response = await gameApi.submitGuessPrice(sessionId, guessValue);
        if (response.data) {
          earnedCoins = response.data.coins;
          const percentOff = 100 - response.data.accuracy;
          if (percentOff <= 5) message = 'Perfect! Within 5%';
          else if (percentOff <= 10) message = 'Great! Within 10%';
          else if (percentOff <= 20) message = 'Good! Within 20%';
          else message = response.data.message || 'Try again!';
          if (response.data.newBalance !== undefined) {
            adjustBalance(earnedCoins);
            refreshWallet(); // Reconcile with server
          }
        }
      } catch (err) {
        // silently handle
      }
    }

    // Feedback animation
    scaleAnim.value = withSequence(
      withTiming(1.03, { duration: 150 }),
      withTiming(1, { duration: 150 }),
    );

    if (!isMounted()) return;
    setScore(score + earnedCoins);
    if (!isMounted()) return;
    setFeedback({ message, earnedCoins, actualPrice, difference, percentDiff: percentDiff.toFixed(1) });

    setTimeout(async () => {
      if (currentProduct < products.length - 1) {
        setCurrentProduct(currentProduct + 1);
        setGuess('');
        setFeedback(null);
      } else {
        setGameState('result');
        try {
          const limitsResponse = await gameApi.getDailyLimits();
          if (limitsResponse.data?.guess_price) {
            setTodayPlays(limitsResponse.data.guess_price.used);
          } else {
            if (!isMounted()) return;
            setTodayPlays(todayPlays + 1);
          }
          await gamificationActions.syncCoinsFromWallet();
        } catch (err) {
          if (!isMounted()) return;
          setTodayPlays(todayPlays + 1);
        }
      }
    }, 2000);
  };

  const getAccuracyColor = (pct: number) => {
    if (pct <= 5) return COLORS.success;
    if (pct <= 10) return Colors.info;
    if (pct <= 20) return COLORS.warning;
    return COLORS.error;
  };

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
            <Text style={styles.headerIconText}>💰</Text>
            <Text style={styles.headerTitle}>Guess the Price</Text>
          </View>
          <Text style={styles.headerSubtitle}>How well do you know prices?</Text>
        </View>

        {gameState === 'playing' ? (
          <View style={styles.scoreBadge}>
            <CachedImage source={BRAND.COIN_IMAGE} style={styles.miniCoin} contentFit="contain" />
            <Text style={styles.scoreText}>{score}</Text>
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
            {/* Hero Card */}
            <LinearGradient
              colors={[COLORS.emerald, COLORS.emeraldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroIconBg}>
                <Text style={styles.heroIconText}>💰</Text>
              </View>
              <Text style={styles.heroTitle}>Guess the Price</Text>
              <Text style={styles.heroSubtitle}>Guess product prices correctly and win coins!</Text>
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatBox}>
                  <CachedImage source={BRAND.COIN_IMAGE} style={styles.heroStatIcon} contentFit="contain" />
                  <Text style={styles.heroStatValue}>50</Text>
                  <Text style={styles.heroStatLabel}>Max Coins</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatBox}>
                  <Ionicons name="game-controller" size={24} color={colors.background.primary} />
                  <Text style={styles.heroStatValue}>{maxPlays - todayPlays}/{maxPlays}</Text>
                  <Text style={styles.heroStatLabel}>Plays Left</Text>
                </View>
              </View>
              <View style={[styles.decorCircle, styles.decorCircle1]} />
              <View style={[styles.decorCircle, styles.decorCircle2]} />
            </LinearGradient>

            {/* Scoring Rules */}
            <View style={styles.rulesCard}>
              <View style={styles.rulesHeader}>
                <Ionicons name="medal" size={20} color={COLORS.emerald} />
                <Text style={styles.rulesTitle}>Scoring Rules</Text>
              </View>
              {[
                { range: 'Within 5%', coins: 50, color: COLORS.success, icon: 'star' },
                { range: 'Within 10%', coins: 30, color: Colors.info, icon: 'trophy' },
                { range: 'Within 20%', coins: 15, color: COLORS.warning, icon: 'thumbs-up' },
                { range: 'Over 20%', coins: 5, color: COLORS.error, icon: 'happy' }
              ].map((rule, idx) => (
                <View key={idx} style={styles.ruleRow}>
                  <View style={[styles.ruleIconBg, { backgroundColor: `${rule.color}15` }]}>
                    <Ionicons name={rule.icon as any} size={16} color={rule.color} />
                  </View>
                  <Text style={styles.ruleRange}>{rule.range}</Text>
                  <View style={[styles.ruleCoinsBadge, { backgroundColor: `${rule.color}15` }]}>
                    <CachedImage source={BRAND.COIN_IMAGE} style={styles.ruleCoinIcon} contentFit="contain" />
                    <Text style={[styles.ruleCoins, { color: rule.color }]}>+{rule.coins}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Start Button */}
            <Pressable
              onPress={startGame}
              disabled={todayPlays >= maxPlays || startingGame}
             
              style={styles.startButtonWrapper}
            >
              <LinearGradient
                colors={todayPlays >= maxPlays ? [colors.neutral[400], colors.neutral[500]] : [COLORS.emerald, COLORS.emeraldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButton}
              >
                {startingGame ? (
                  <ActivityIndicator size="small" color={colors.background.primary} />
                ) : (
                  <>
                    <Ionicons name={todayPlays >= maxPlays ? "time-outline" : "play"} size={22} color={colors.background.primary} />
                    <Text style={styles.startButtonText}>
                      {todayPlays >= maxPlays ? 'Come Back Tomorrow' : 'Start Game'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Error Screen */}
        {gameState === 'error' && (
          <View style={styles.content}>
            <View style={styles.errorContainer}>
              <View style={styles.errorIconBg}>
                <Ionicons name="alert-circle" size={48} color={COLORS.error} />
              </View>
              <Text style={styles.errorTitle}>Game Failed</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={retryGame}>
                <LinearGradient colors={[COLORS.emerald, COLORS.emeraldDark]} style={styles.retryButton}>
                  <Ionicons name="refresh" size={18} color={colors.background.primary} />
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
          </View>
        )}

        {/* Playing Screen */}
        {gameState === 'playing' && products.length > 0 && products[currentProduct] && (
          <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.progressText}>
              Product {currentProduct + 1} of {products.length}
            </Text>

            <View style={styles.productCard}>
              <View style={styles.productImageContainer}>
                <Text style={styles.productImage}>{products[currentProduct].image}</Text>
              </View>
              <Text style={styles.productName}>{products[currentProduct].name}</Text>
              <View style={styles.categoryBadge}>
                <Ionicons name="pricetag" size={12} color={COLORS.emerald} />
                <Text style={styles.categoryText}>{products[currentProduct].category}</Text>
              </View>

              {!feedback && (
                <View style={styles.guessContainer}>
                  <Text style={styles.guessLabel}>Enter your guess (in {currencySymbol})</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
                    <TextInput
                      style={styles.guessInput}
                      value={guess}
                      onChangeText={setGuess}
                      placeholder="Enter price..."
                      placeholderTextColor={COLORS.textLight}
                      keyboardType="numeric"
                    />
                  </View>
                  <Pressable
                    onPress={submitGuess}
                    disabled={!guess || parseInt(guess) <= 0}
                   
                  >
                    <LinearGradient
                      colors={!guess || parseInt(guess) <= 0 ? [colors.neutral[400], colors.neutral[500]] : [COLORS.emerald, COLORS.emeraldDark]}
                      style={styles.submitButton}
                    >
                      <Ionicons name="checkmark" size={20} color={colors.background.primary} />
                      <Text style={styles.submitButtonText}>Submit Guess</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              )}

              {feedback && (
                <View style={styles.feedbackContainer}>
                  <View style={[styles.feedbackCard, { backgroundColor: `${getAccuracyColor(parseFloat(feedback.percentDiff))}10`, borderColor: `${getAccuracyColor(parseFloat(feedback.percentDiff))}30` }]}>
                    <Ionicons
                      name={feedback.earnedCoins >= 30 ? "checkmark-circle" : "alert-circle"}
                      size={32}
                      color={getAccuracyColor(parseFloat(feedback.percentDiff))}
                    />
                    <Text style={[styles.feedbackMessage, { color: getAccuracyColor(parseFloat(feedback.percentDiff)) }]}>
                      {feedback.message}
                    </Text>
                    <View style={styles.feedbackCoins}>
                      <CachedImage source={BRAND.COIN_IMAGE} style={styles.feedbackCoinIcon} contentFit="contain" />
                      <Text style={[styles.feedbackCoinsText, { color: getAccuracyColor(parseFloat(feedback.percentDiff)) }]}>+{feedback.earnedCoins}</Text>
                    </View>
                  </View>
                  <View style={styles.actualPriceCard}>
                    <Text style={styles.actualPriceLabel}>Actual Price</Text>
                    <Text style={styles.actualPriceValue}>{currencySymbol}{feedback.actualPrice.toLocaleString()}</Text>
                    <Text style={styles.percentOffText}>You were {feedback.percentDiff}% off</Text>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Result Screen */}
        {gameState === 'result' && (
          <View style={styles.content}>
            {/* Confetti */}
            {score >= 30 && (
              <View style={styles.confettiContainer}>
                {[...Array(15)].map((_, i) => (
                  <ConfettiParticle
                    key={i}
                    delay={i * 150}
                    color={[COLORS.emerald, COLORS.gold, Colors.info, COLORS.primary][i % 4]}
                  />
                ))}
              </View>
            )}

            {/* Result Card */}
            <View style={styles.resultCard}>
              <LinearGradient
                colors={score >= 30 ? [COLORS.emerald, COLORS.emeraldDark] : [COLORS.surfaceSecondary, COLORS.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultGradient}
              >
                <View style={[styles.resultIconWrapper, { backgroundColor: score >= 30 ? 'rgba(255,255,255,0.2)' : COLORS.emeraldBg }]}>
                  <Ionicons
                    name={score >= 30 ? "trophy" : "thumbs-up"}
                    size={48}
                    color={score >= 30 ? colors.background.primary : COLORS.emerald}
                  />
                </View>
                <Text style={[styles.resultTitle, { color: score >= 30 ? colors.background.primary : COLORS.navy }]}>
                  {score >= 40 ? 'Amazing!' : score >= 20 ? 'Good Job!' : 'Nice Try!'}
                </Text>
                <Text style={[styles.resultSubtitle, { color: score >= 30 ? 'rgba(255,255,255,0.9)' : COLORS.textMuted }]}>
                  You guessed {products.length} product{products.length > 1 ? 's' : ''}
                </Text>
                <View style={[styles.earnedBox, { backgroundColor: score >= 30 ? 'rgba(255,255,255,0.15)' : COLORS.goldBg }]}>
                  <View style={styles.earnedRow}>
                    <CachedImage source={BRAND.COIN_IMAGE} style={styles.earnedCoin} contentFit="contain" />
                    <Text style={[styles.earnedValue, { color: score >= 30 ? colors.background.primary : COLORS.gold }]}>+{score}</Text>
                  </View>
                  <Text style={[styles.earnedLabel, { color: score >= 30 ? 'rgba(255,255,255,0.8)' : COLORS.textMuted }]}>
                    Coins Earned
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <Pressable
                onPress={startGame}
                disabled={todayPlays >= maxPlays || startingGame}
               
              >
                <LinearGradient
                  colors={todayPlays >= maxPlays ? [colors.neutral[400], colors.neutral[500]] : [COLORS.emerald, COLORS.emeraldDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryAction}
                >
                  {startingGame ? (
                    <ActivityIndicator size="small" color={colors.background.primary} />
                  ) : (
                    <>
                      <Ionicons name={todayPlays >= maxPlays ? "time-outline" : "refresh"} size={20} color={colors.background.primary} />
                      <Text style={styles.primaryActionText}>
                        {todayPlays >= maxPlays
                          ? `No Plays Left (${todayPlays}/${maxPlays})`
                          : `Play Again (${maxPlays - todayPlays} left)`}
                      </Text>
                    </>
                  )}
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
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 52, paddingBottom: 16, gap: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconText: { fontSize: 24 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.navy },
  headerSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  scoreBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.emeraldBg },
  scoreText: { fontSize: 15, fontWeight: '700', color: COLORS.emerald },
  coinsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.goldBg },
  coinIcon: { width: 20, height: 20 },
  coinsText: { fontSize: 15, fontWeight: '700', color: COLORS.goldDark },
  miniCoin: { width: 18, height: 18 },

  scrollView: { flex: 1 },
  content: { padding: 16 },

  // Hero Card
  heroCard: {
    padding: 28, borderRadius: 24, alignItems: 'center', marginBottom: 20,
    overflow: 'hidden', position: 'relative' },
  heroIconBg: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroIconText: { fontSize: 40 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.background.primary, marginBottom: 8 },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: 24 },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  heroStatBox: { alignItems: 'center' },
  heroStatIcon: { width: 28, height: 28, marginBottom: 8 },
  heroStatValue: { fontSize: 24, fontWeight: '800', color: colors.background.primary },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  heroStatDivider: { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.3)' },
  decorCircle: { position: 'absolute', borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)' },
  decorCircle1: { width: 120, height: 120, top: -40, right: -40 },
  decorCircle2: { width: 100, height: 100, bottom: -30, left: -30 },

  // Rules Card
  rulesCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  rulesTitle: { fontSize: 17, fontWeight: '700', color: COLORS.navy },
  ruleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, backgroundColor: COLORS.surfaceSecondary, marginBottom: 8 },
  ruleIconBg: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  ruleRange: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.navy },
  ruleCoinsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  ruleCoinIcon: { width: 14, height: 14 },
  ruleCoins: { fontSize: 14, fontWeight: '700' },

  // Start Button
  startButtonWrapper: { borderRadius: 16, overflow: 'hidden' },
  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18, borderRadius: 16 },
  startButtonText: { fontSize: 17, fontWeight: '700', color: colors.background.primary },

  // Error
  errorContainer: { padding: 24, alignItems: 'center', gap: 16 },
  errorIconBg: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.errorBg,
    justifyContent: 'center', alignItems: 'center' },
  errorTitle: { fontSize: 24, fontWeight: '700', color: COLORS.error },
  errorText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: colors.background.primary },

  // Playing
  progressText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  productCard: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, alignItems: 'center',
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 },
  productImageContainer: {
    width: 128, height: 128, borderRadius: 20, backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  productImage: { fontSize: 64 },
  productName: { fontSize: 22, fontWeight: '700', color: COLORS.navy, marginBottom: 8 },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.emeraldBg, marginBottom: 24 },
  categoryText: { fontSize: 13, fontWeight: '600', color: COLORS.emerald },
  guessContainer: { width: '100%' },
  guessLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8, fontWeight: '500' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14, borderWidth: 2, borderColor: COLORS.border, marginBottom: 16, overflow: 'hidden' },
  currencyPrefix: {
    fontSize: 20, fontWeight: '700', color: COLORS.textMuted, paddingLeft: 16, paddingRight: 4 },
  guessInput: {
    flex: 1, padding: 16, color: COLORS.navy, fontSize: 24, fontWeight: '700' },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14 },
  submitButtonText: { fontSize: 15, fontWeight: '700', color: colors.background.primary },
  feedbackContainer: { width: '100%', gap: 12 },
  feedbackCard: {
    padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, gap: 8 },
  feedbackMessage: { fontSize: 18, fontWeight: '700' },
  feedbackCoins: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedbackCoinIcon: { width: 24, height: 24 },
  feedbackCoinsText: { fontSize: 24, fontWeight: '800' },
  actualPriceCard: {
    padding: 16, borderRadius: 14, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center' },
  actualPriceLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4, fontWeight: '500' },
  actualPriceValue: { fontSize: 24, fontWeight: '700', color: COLORS.navy },
  percentOffText: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },

  // Confetti
  confettiContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 200, pointerEvents: 'none', overflow: 'hidden' },
  confetti: { position: 'absolute', width: 10, height: 10, borderRadius: 2, left: '50%', top: -10 },

  // Result Card
  resultCard: {
    borderRadius: 24, overflow: 'hidden', marginBottom: 20,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20, elevation: 8 },
  resultGradient: { padding: 32, alignItems: 'center' },
  resultIconWrapper: {
    width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  resultTitle: { fontSize: 32, fontWeight: '800', marginBottom: 8 },
  resultSubtitle: { fontSize: 15, marginBottom: 24 },
  earnedBox: { paddingHorizontal: 32, paddingVertical: 20, borderRadius: 16, alignItems: 'center' },
  earnedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  earnedCoin: { width: 36, height: 36 },
  earnedValue: { fontSize: 44, fontWeight: '800' },
  earnedLabel: { fontSize: 13 },

  // Actions
  actionsContainer: { gap: 12 },
  primaryAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18, borderRadius: 16 },
  primaryActionText: { fontSize: 16, fontWeight: '700', color: colors.background.primary },
  secondaryAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  secondaryActionText: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted } });

export default withErrorBoundary(GuessPrice, 'PlayandearnGuessprice');
