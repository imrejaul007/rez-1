// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Memory Match Game
// 4x4 card grid, flip animation, match checking, score tracking, timer, backend integration

import { colors } from '@/constants/theme';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { platformAlertSimple } from '@/utils/platformAlert';
import apiClient from '@/services/apiClient';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';

const CARD_EMOJIS = ['🍎', '🍋', '🍇', '🍒', '🌟', '🎯', '🎨', '🎵'];
const GRID_SIZE = 4; // 4x4 = 16 cards = 8 pairs
const nuqtaCoinImage = BRAND.COIN_IMAGE;

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

type GameState = 'idle' | 'playing' | 'completed';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createDeck(): Card[] {
  const pairs = [...CARD_EMOJIS, ...CARD_EMOJIS];
  const shuffled = shuffleArray(pairs);
  return shuffled.map((emoji, index) => ({
    id: index,
    emoji,
    isFlipped: false,
    isMatched: false,
  }));
}

const MemoryCardView = React.memo(({ card, index, flipAnim, onPress, disabled }: {
  card: Card;
  index: number;
  flipAnim: Animated.SharedValue<number>;
  onPress: () => void;
  disabled: boolean;
}) => {
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipAnim.value, [0, 1], [0, 180])}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipAnim.value, [0, 1], [180, 360])}deg` }],
  }));

  return (
    <Pressable
      style={styles.cardContainer}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.card,
          styles.cardBack,
          card.isMatched && styles.cardMatched,
          frontStyle,
        ]}
      >
        {card.isMatched ? (
          <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
        ) : (
          <Text style={styles.cardBackText}>?</Text>
        )}
      </Animated.View>
      <Animated.View
        style={[
          styles.card,
          styles.cardFront,
          backStyle,
        ]}
      >
        <Text style={styles.cardEmoji}>{card.emoji}</Text>
      </Animated.View>
    </Pressable>
  );
});

function MemoryPage() {
  const isMounted = useIsMounted();
  const [gameState, setGameState] = useState<GameState>('idle');
  const [cards, setCards] = useState<Card[]>(createDeck());
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [timer, setTimer] = useState(0);
  const [sessionId, setSessionId] = useState('');
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [loading, setLoading] = useState(false);
  const [canFlip, setCanFlip] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flipAnimations = useRef<any[]>(
    Array.from({ length: 16 }, () => useSharedValue(0))
  ).current;

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Check if game is complete
  useEffect(() => {
    if (gameState === 'playing' && matches === CARD_EMOJIS.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameState('completed');
      handleGameComplete();
    }
  }, [matches, gameState]);

  const handleBackPress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const startGame = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post<any>('/games/memory-match/start', {
        difficulty: 'easy',
      });
      if (response.success && response.data) {
        if (!isMounted()) return;
        setSessionId(response.data.sessionId || response.data._id || '');
      }
    } catch (error) {
      // silently handle
    }

    // Reset game state
    const newDeck = createDeck();
    if (!isMounted()) return;
    setCards(newDeck);
    if (!isMounted()) return;
    setFlippedCards([]);
    if (!isMounted()) return;
    setMatches(0);
    if (!isMounted()) return;
    setAttempts(0);
    if (!isMounted()) return;
    setTimer(0);
    if (!isMounted()) return;
    setCoinsEarned(0);
    if (!isMounted()) return;
    setCanFlip(true);
    if (!isMounted()) return;
    flipAnimations.forEach(anim => anim.value = 0);
    if (!isMounted()) return;
    setGameState('playing');
    if (!isMounted()) return;
    setLoading(false);
  };

  const handleGameComplete = async () => {
    const score = Math.max(0, 100 - attempts * 2 - Math.floor(timer / 5));
    try {
      const response = await apiClient.post<any>('/games/memory-match/complete', {
        sessionId,
        score,
        timeSpent: timer,
        moves: attempts,
      });
      if (response.success && response.data) {
        const earned = response.data.coins || response.data.coinsEarned || 0;
        if (!isMounted()) return;
        setCoinsEarned(earned);
        // Haptic feedback on coins earned
        if (earned > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      }
    } catch (error) {
      // silently handle
    }
  };

  const flipCard = (index: number) => {
    flipAnimations[index].value = withTiming(1, { duration: 300 });
  };

  const unflipCard = (index: number) => {
    flipAnimations[index].value = withTiming(0, { duration: 300 });
  };

  const handleCardPress = useCallback((index: number) => {
    if (!canFlip) return;
    if (gameState !== 'playing') return;
    if (cards[index].isFlipped || cards[index].isMatched) return;
    if (flippedCards.length >= 2) return;
    if (flippedCards.includes(index)) return;

    // Flip the card
    flipCard(index);
    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    setCards(prev => prev.map((card, i) =>
      i === index ? { ...card, isFlipped: true } : card
    ));

    if (newFlipped.length === 2) {
      setAttempts(prev => prev + 1);
      setCanFlip(false);

      const [first, second] = newFlipped;
      if (cards[first].emoji === cards[index].emoji) {
        // Match found
        setTimeout(() => {
          setCards(prev => prev.map((card, i) =>
            i === first || i === second ? { ...card, isMatched: true } : card
          ));
          setMatches(prev => prev + 1);
          setFlippedCards([]);
          setCanFlip(true);
        }, 500);
      } else {
        // No match - flip back
        setTimeout(() => {
          unflipCard(first);
          unflipCard(second);
          setCards(prev => prev.map((card, i) =>
            i === first || i === second ? { ...card, isFlipped: false } : card
          ));
          setFlippedCards([]);
          setCanFlip(true);
        }, 1000);
      }
    }
  }, [canFlip, gameState, cards, flippedCards]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCard = (card: Card, index: number) => (
    <MemoryCardView
      key={card.id}
      card={card}
      index={index}
      flipAnim={flipAnimations[index]}
      onPress={() => handleCardPress(index)}
      disabled={card.isFlipped || card.isMatched || !canFlip}
    />
  );

  const renderIdleScreen = () => (
    <View style={styles.centerContent}>
      <View style={styles.gameIconContainer}>
        <LinearGradient
          colors={[colors.brand.indigo, '#4F46E5']}
          style={styles.gameIconGradient}
        >
          <Text style={styles.gameIcon}>&#x1F0CF;</Text>
        </LinearGradient>
      </View>
      <ThemedText style={styles.gameTitle}>Memory Match</ThemedText>
      <ThemedText style={styles.gameSubtitle}>
        Match all 8 pairs as fast as you can!
      </ThemedText>

      <View style={styles.rulesCard}>
        <ThemedText style={styles.rulesTitle}>How to Play</ThemedText>
        <View style={styles.ruleItem}>
          <Ionicons name="hand-left" size={18} color={colors.brand.indigo} />
          <ThemedText style={styles.ruleText}>Tap a card to flip it</ThemedText>
        </View>
        <View style={styles.ruleItem}>
          <Ionicons name="search" size={18} color={colors.brand.indigo} />
          <ThemedText style={styles.ruleText}>Find matching pairs of cards</ThemedText>
        </View>
        <View style={styles.ruleItem}>
          <Ionicons name="timer" size={18} color={colors.brand.indigo} />
          <ThemedText style={styles.ruleText}>Faster completion = more coins</ThemedText>
        </View>
        <View style={styles.ruleItem}>
          <Ionicons name="trophy" size={18} color={colors.brand.indigo} />
          <ThemedText style={styles.ruleText}>Fewer attempts = higher score</ThemedText>
        </View>
      </View>

      <Pressable style={styles.startButton} onPress={startGame} disabled={loading}>
        <LinearGradient
          colors={[colors.brand.indigo, '#4F46E5']}
          style={styles.startButtonGradient}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <>
              <Ionicons name="play" size={22} color={Colors.text.inverse} />
              <ThemedText style={styles.startButtonText}>Start Game</ThemedText>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderCompletedScreen = () => (
    <View style={styles.centerContent}>
      <View style={styles.completedIcon}>
        <Ionicons name="trophy" size={64} color={Colors.gold} />
      </View>
      <ThemedText style={styles.completedTitle}>Well Done!</ThemedText>
      <ThemedText style={styles.completedSubtitle}>
        You matched all pairs!
      </ThemedText>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Ionicons name="timer" size={22} color={colors.brand.indigo} />
          <ThemedText style={styles.statValue}>{formatTime(timer)}</ThemedText>
          <ThemedText style={styles.statLabel}>Time</ThemedText>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="swap-horizontal" size={22} color={Colors.warning} />
          <ThemedText style={styles.statValue}>{attempts}</ThemedText>
          <ThemedText style={styles.statLabel}>Moves</ThemedText>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-done" size={22} color={Colors.success} />
          <ThemedText style={styles.statValue}>{matches}/{CARD_EMOJIS.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Matches</ThemedText>
        </View>
      </View>

      {coinsEarned > 0 && (
        <View style={styles.coinsEarnedCard}>
          <CachedImage source={nuqtaCoinImage} style={styles.coinIcon} />
          <ThemedText style={styles.coinsEarnedText}>
            +{coinsEarned} {BRAND.CURRENCY_CODE} earned!
          </ThemedText>
        </View>
      )}

      <View style={styles.actionButtons}>
        <Pressable style={styles.playAgainButton} onPress={startGame}>
          <LinearGradient
            colors={[colors.brand.indigo, '#4F46E5']}
            style={styles.startButtonGradient}
          >
            <Ionicons name="refresh" size={20} color={Colors.text.inverse} />
            <ThemedText style={styles.startButtonText}>Play Again</ThemedText>
          </LinearGradient>
        </Pressable>
        <Pressable style={styles.backToGamesBtn} onPress={() => router.push('/games' as any)}>
          <Ionicons name="game-controller" size={18} color={Colors.text.primary} />
          <ThemedText style={styles.backToGamesText}>More Games</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Memory Match',
          headerStyle: { backgroundColor: '#A8E6CF' },
          headerTintColor: Colors.text.primary,
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <Pressable
              onPress={handleBackPress}
              style={styles.headerBackButton}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
            </Pressable>
          ),
        }}
      />
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#A8E6CF', '#8FD9B8', '#7CCCA0']}
            style={styles.gradient}
          >
            {gameState === 'idle' && renderIdleScreen()}

            {gameState === 'playing' && (
              <>
                {/* Game Stats Bar */}
                <View style={styles.gameStatsBar}>
                  <View style={styles.gameStat}>
                    <Ionicons name="timer" size={16} color={Colors.text.primary} />
                    <Text style={styles.gameStatText}>{formatTime(timer)}</Text>
                  </View>
                  <View style={styles.gameStat}>
                    <Ionicons name="swap-horizontal" size={16} color={Colors.text.primary} />
                    <Text style={styles.gameStatText}>Moves: {attempts}</Text>
                  </View>
                  <View style={styles.gameStat}>
                    <Ionicons name="checkmark-done" size={16} color={Colors.success} />
                    <Text style={styles.gameStatText}>{matches}/{CARD_EMOJIS.length}</Text>
                  </View>
                </View>

                {/* Card Grid */}
                <View style={styles.grid}>
                  {cards.map((card, index) => renderCard(card, index))}
                </View>
              </>
            )}

            {gameState === 'completed' && renderCompletedScreen()}
          </LinearGradient>
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBackButton: {
    marginLeft: Platform.OS === 'ios' ? Spacing.sm : Spacing.base,
    padding: Spacing.xs,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  centerContent: {
    alignItems: 'center',
    width: '100%',
  },
  gameIconContainer: {
    marginBottom: Spacing.lg,
    ...Shadows.strong,
  },
  gameIconGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameIcon: {
    fontSize: 48,
  },
  gameTitle: {
    ...Typography.h1,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  gameSubtitle: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.text.secondary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  rulesCard: {
    width: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.medium,
  },
  rulesTitle: {
    ...Typography.h4,
    fontWeight: '700',
    fontSize: 17,
    color: Colors.text.primary,
    marginBottom: 14,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  ruleText: {
    ...Typography.body,
    color: Colors.text.secondary,
    flex: 1,
  },
  startButton: {
    width: '100%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: colors.brand.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  startButtonText: {
    ...Typography.h4,
    fontWeight: '700',
    fontSize: 17,
    color: Colors.text.inverse,
  },
  // Game playing
  gameStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: 14,
    marginBottom: Spacing.base,
    ...Shadows.subtle,
  },
  gameStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gameStatText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  cardContainer: {
    width: '22%',
    aspectRatio: 0.75,
    perspective: 1000,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    ...Shadows.medium,
  },
  cardBack: {
    backgroundColor: colors.brand.indigo,
  },
  cardFront: {
    backgroundColor: Colors.background.primary,
  },
  cardMatched: {
    backgroundColor: Colors.successScale[50],
    borderWidth: 2,
    borderColor: Colors.success,
  },
  cardBackText: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text.inverse,
  },
  cardEmoji: {
    fontSize: 28,
  },
  // Completed
  completedIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gold + '26',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  completedTitle: {
    ...Typography.h1,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  completedSubtitle: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  statValue: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 6,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  coinsEarnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    gap: 10,
    marginBottom: Spacing.xl,
    ...Shadows.subtle,
  },
  coinIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  coinsEarnedText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  actionButtons: {
    width: '100%',
    gap: Spacing.md,
  },
  playAgainButton: {
    width: '100%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: colors.brand.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  backToGamesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    gap: Spacing.sm,
    ...Shadows.subtle,
  },
  backToGamesText: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});

export default withErrorBoundary(MemoryPage, 'GamesMemory');
