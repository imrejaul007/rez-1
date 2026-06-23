import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Coin Hunt Game - Converted from V2 Web
 * Exact match to Rez_v-2-main/src/pages/earn/CoinHunt.jsx
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GAME_AREA_HEIGHT = SCREEN_HEIGHT * 0.5;

interface Coin {
  id: number;
  x: number;
  y: number;
  value: number;
}

const CoinItem = React.memo(({ coin, onCatch }: { coin: Coin; onCatch: (coin: Coin) => void }) => {
  const anim = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ scale: anim.value }],
  }));

  const handlePress = () => {
    anim.value = withTiming(0, { duration: 150 });
    onCatch(coin);
  };

  return (
    <Animated.View
      style={[
        styles.coinWrapper,
        { left: coin.x, top: coin.y },
        animStyle,
      ]}
    >
      <Pressable onPress={handlePress}>
        <LinearGradient
          colors={[colors.warningScale[400], Colors.warning]}
          style={styles.coin}
        >
          <Text style={styles.coinValue}>+{coin.value}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

const CoinHuntScreen: React.FC = () => {
  const router = useRouter();
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [coins, setCoins] = useState<Coin[]>([]);
  const coinIdRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const coinSpawnRef = useRef<NodeJS.Timeout | null>(null);
  const coinTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Game timer
  useEffect(() => {
    if (gameStarted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameStarted(false);
            setGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameStarted]);

  // Coin spawner
  useEffect(() => {
    if (gameStarted) {
      coinSpawnRef.current = setInterval(() => {
        spawnCoin();
      }, 800);
      return () => {
        if (coinSpawnRef.current) clearInterval(coinSpawnRef.current);
      };
    }
  }, [gameStarted]);

  const spawnCoin = () => {
    const newCoin: Coin = {
      id: coinIdRef.current++,
      x: Math.random() * (SCREEN_WIDTH - 80) + 20,
      y: Math.random() * (GAME_AREA_HEIGHT - 100) + 20,
      value: [5, 10, 15, 25][Math.floor(Math.random() * 4)],
    };

    setCoins(prev => [...prev, newCoin]);

    // Auto-remove coin after 2 seconds (tracked for cleanup)
    const timeout = setTimeout(() => {
      setCoins(prev => prev.filter(c => c.id !== newCoin.id));
      coinTimeoutsRef.current.delete(timeout);
    }, 2000);
    coinTimeoutsRef.current.add(timeout);
  };

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setTimeLeft(30);
    setCoins([]);
    coinIdRef.current = 0;
  };

  const catchCoin = useCallback((coin: Coin) => {
    setScore(prev => prev + coin.value);
    setCoins(prev => prev.filter(c => c.id !== coin.id));
  }, []);

  // Cleanup all coin timeouts on unmount
  useEffect(() => {
    return () => {
      coinTimeoutsRef.current.forEach(t => clearTimeout(t));
      coinTimeoutsRef.current.clear();
    };
  }, []);

  const handleGoBack = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (coinSpawnRef.current) clearInterval(coinSpawnRef.current);
    coinTimeoutsRef.current.forEach(t => clearTimeout(t));
    coinTimeoutsRef.current.clear();
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={20} color={Colors.nileBlue} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>🪙 Coin Hunt</Text>
          <Text style={styles.headerSubtitle}>Catch falling coins!</Text>
        </View>
      </View>

      {/* Score & Timer */}
      <View style={styles.statsRow}>
        <View style={styles.statBadge}>
          <Ionicons name="wallet" size={18} color={colors.warningScale[400]} />
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={[styles.statBadge, styles.timerBadge]}>
          <Ionicons name="time" size={18} color={colors.infoScale[400]} />
          <Text style={[styles.statValue, styles.timerValue]}>{timeLeft}s</Text>
        </View>
      </View>

      {/* Game Container */}
      <View style={styles.gameContainer}>
        {!gameStarted && !gameOver ? (
          // Start Screen
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.2)']}
            style={styles.startScreen}
          >
            <Text style={styles.trophyIcon}>🏆</Text>
            <Text style={styles.readyTitle}>Ready to Hunt?</Text>
            <Text style={styles.readySubtitle}>
              Tap coins before they disappear!{'\n'}You have 30 seconds
            </Text>
            <Pressable onPress={startGame}>
              <LinearGradient
                colors={[Colors.brand.purple, colors.brand.pink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButton}
              >
                <Text style={styles.startButtonText}>Start Game</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        ) : (
          // Game Area
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.1)', 'rgba(139, 92, 246, 0.1)']}
            style={styles.gameArea}
          >
            {/* Coins */}
            {gameStarted && coins.map(coin => (
              <CoinItem key={coin.id} coin={coin} onCatch={catchCoin} />
            ))}

            {/* Game Over Overlay */}
            {gameOver && (
              <View style={styles.gameOverOverlay}>
                <Text style={styles.gameOverTrophy}>🏆</Text>
                <Text style={styles.gameOverTitle}>Game Over!</Text>
                <Text style={styles.gameOverScore}>You earned {score} coins</Text>
                <Pressable onPress={startGame}>
                  <LinearGradient
                    colors={[Colors.success, colors.tealGreen]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.playAgainButton}
                  >
                    <Text style={styles.playAgainText}>Play Again</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </LinearGradient>
        )}
      </View>

      {/* How to Play */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How to play:</Text>
        <Text style={styles.infoItem}>• Tap coins before they disappear</Text>
        <Text style={styles.infoItem}>• Each coin is worth 5-25 points</Text>
        <Text style={styles.infoItem}>• Play unlimited times per day</Text>
        <Text style={styles.infoItem}>• Earn bonus multipliers for streaks</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  timerBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.warningScale[400],
  },
  timerValue: {
    color: colors.infoScale[400],
  },
  gameContainer: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  startScreen: {
    flex: 1,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  trophyIcon: {
    fontSize: 80,
    marginBottom: Spacing.base,
  },
  readyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
  },
  readySubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  startButton: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  gameArea: {
    flex: 1,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  coinWrapper: {
    position: 'absolute',
  },
  coin: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  coinValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
  },
  gameOverTrophy: {
    fontSize: 64,
  },
  gameOverTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  gameOverScore: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  playAgainButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  playAgainText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  infoCard: {
    margin: Spacing.base,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
  },
  infoItem: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginBottom: Spacing.xs,
  },
});

export default withErrorBoundary(CoinHuntScreen, 'CoinHunt');
