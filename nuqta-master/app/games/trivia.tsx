// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Trivia Challenge Game
// Multiple choice quiz, 10 questions, timer per question, score tracking, backend integration

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { router, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { platformAlertSimple } from '@/utils/platformAlert';
import apiClient from '@/services/apiClient';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const nuqtaCoinImage = BRAND.COIN_IMAGE;

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
}

const HARDCODED_QUESTIONS: Question[] = [
  {
    id: '1',
    question: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctIndex: 2,
    category: 'Geography',
  },
  {
    id: '2',
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctIndex: 1,
    category: 'Science',
  },
  {
    id: '3',
    question: 'Who painted the Mona Lisa?',
    options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Monet'],
    correctIndex: 2,
    category: 'Art',
  },
  {
    id: '4',
    question: 'What is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correctIndex: 3,
    category: 'Geography',
  },
  {
    id: '5',
    question: 'What year did the first iPhone launch?',
    options: ['2005', '2006', '2007', '2008'],
    correctIndex: 2,
    category: 'Technology',
  },
  {
    id: '6',
    question: 'What gas do plants absorb from the atmosphere?',
    options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'],
    correctIndex: 2,
    category: 'Science',
  },
  {
    id: '7',
    question: 'Which country is home to the kangaroo?',
    options: ['New Zealand', 'South Africa', 'Brazil', 'Australia'],
    correctIndex: 3,
    category: 'Geography',
  },
  {
    id: '8',
    question: 'What is the hardest natural substance on Earth?',
    options: ['Gold', 'Iron', 'Diamond', 'Platinum'],
    correctIndex: 2,
    category: 'Science',
  },
  {
    id: '9',
    question: 'How many continents are there?',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
    category: 'Geography',
  },
  {
    id: '10',
    question: 'What is the speed of light approximately?',
    options: ['300,000 km/s', '150,000 km/s', '600,000 km/s', '100,000 km/s'],
    correctIndex: 0,
    category: 'Science',
  },
];

const SECONDS_PER_QUESTION = 15;
const TOTAL_QUESTIONS = 10;

type GameState = 'idle' | 'playing' | 'answered' | 'completed';

function TriviaPage() {
  const isMounted = useIsMounted();
  const [gameState, setGameState] = useState<GameState>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [answers, setAnswers] = useState<{ questionId: string; correct: boolean; timeTaken: number }[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useSharedValue(1);
  const optionAnimations = useRef(
    [0, 1, 2, 3].map(() => useSharedValue(0))
  ).current;

  // Timer countdown
  useEffect(() => {
    let progressAnimation: any | undefined;
    if (gameState === 'playing') {
      progressAnim.value = 1;
      progressAnimation = withTiming(0, { duration: SECONDS_PER_QUESTION * 1000 });

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      progressAnimation?.stop();
    };
  }, [gameState, currentIndex]);

  // Animate options appearing
  useEffect(() => {
    if (gameState === 'playing') {
      const anims = optionAnimations.map((anim, i) => {
        anim.value = 0;
        return withTiming(1, { duration: 300,
          delay: i * 100 });
      });
      anims.forEach(a => a);
      return () => anims.forEach(a => a.stop());
    }
  }, [gameState, currentIndex]);

  const handleBackPress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  function shuffleQuestions(): Question[] {
    const shuffled = [...HARDCODED_QUESTIONS];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, TOTAL_QUESTIONS);
  }

  const startGame = async () => {
    setLoading(true);

    // Try to fetch questions from backend quiz endpoint
    try {
      const response = await apiClient.post<any>('/games/quiz/create', {
        category: 'general',
        difficulty: 'medium',
      });
      if (response.success && response.data) {
        if (!isMounted()) return;
        setSessionId(response.data.sessionId || response.data._id || '');
      }
    } catch {
    }

    // Use hardcoded questions
    const shuffled = shuffleQuestions();
    if (!isMounted()) return;
    setQuestions(shuffled);
    if (!isMounted()) return;
    setCurrentIndex(0);
    if (!isMounted()) return;
    setSelectedOption(null);
    if (!isMounted()) return;
    setScore(0);
    if (!isMounted()) return;
    setCorrectCount(0);
    if (!isMounted()) return;
    setCoinsEarned(0);
    if (!isMounted()) return;
    setTimeLeft(SECONDS_PER_QUESTION);
    if (!isMounted()) return;
    setAnswers([]);
    if (!isMounted()) return;
    setGameState('playing');
    if (!isMounted()) return;
    setLoading(false);
  };

  const handleTimeUp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswers(prev => [...prev, {
      questionId: questions[currentIndex].id,
      correct: false,
      timeTaken: SECONDS_PER_QUESTION,
    }]);
    setGameState('answered');
    setSelectedOption(-1); // -1 = timed out

    setTimeout(() => {
      moveToNext();
    }, 1500);
  };

  const handleOptionPress = (optionIndex: number) => {
    if (gameState !== 'playing' || selectedOption !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = SECONDS_PER_QUESTION - timeLeft;
    const isCorrect = optionIndex === questions[currentIndex].correctIndex;

    setSelectedOption(optionIndex);
    setGameState('answered');

    if (isCorrect) {
      const timeBonus = Math.max(0, timeLeft * 2);
      setScore(prev => prev + 10 + timeBonus);
      setCorrectCount(prev => prev + 1);
    }

    setAnswers(prev => [...prev, {
      questionId: questions[currentIndex].id,
      correct: isCorrect,
      timeTaken,
    }]);

    setTimeout(() => {
      moveToNext();
    }, 1500);
  };

  const moveToNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setGameState('completed');
      submitScore();
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setTimeLeft(SECONDS_PER_QUESTION);
      setGameState('playing');
    }
  };

  const submitScore = async () => {
    try {
      const finalScore = score;
      const response = await apiClient.post<any>('/games/quiz/submit', {
        sessionId,
        score: finalScore,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        answers,
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
    } catch {
    }
  };

  const getOptionStyle = (optionIndex: number) => {
    if (gameState !== 'answered') return styles.option;
    const correctIndex = questions[currentIndex]?.correctIndex;
    if (optionIndex === correctIndex) return [styles.option, styles.optionCorrect];
    if (optionIndex === selectedOption) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDimmed];
  };

  const getOptionTextStyle = (optionIndex: number) => {
    if (gameState !== 'answered') return styles.optionText;
    const correctIndex = questions[currentIndex]?.correctIndex;
    if (optionIndex === correctIndex) return [styles.optionText, { color: Colors.text.inverse }];
    if (optionIndex === selectedOption) return [styles.optionText, { color: Colors.text.inverse }];
    return [styles.optionText, { color: Colors.text.tertiary }];
  };

  const currentQuestion = questions[currentIndex];

  const renderIdleScreen = () => (
    <View style={styles.centerContent}>
      <View style={styles.gameIconContainer}>
        <LinearGradient
          colors={['#FF6B6B', colors.error]}
          style={styles.gameIconGradient}
        >
          <Text style={styles.gameIconText}>?</Text>
        </LinearGradient>
      </View>
      <ThemedText style={styles.gameTitle}>Trivia Challenge</ThemedText>
      <ThemedText style={styles.gameSubtitle}>
        Test your knowledge across multiple categories!
      </ThemedText>

      <View style={styles.rulesCard}>
        <ThemedText style={styles.rulesTitle}>How to Play</ThemedText>
        <View style={styles.ruleItem}>
          <Text style={styles.ruleNumber}>1</Text>
          <ThemedText style={styles.ruleText}>{TOTAL_QUESTIONS} questions, 4 options each</ThemedText>
        </View>
        <View style={styles.ruleItem}>
          <Text style={styles.ruleNumber}>2</Text>
          <ThemedText style={styles.ruleText}>{SECONDS_PER_QUESTION} seconds per question</ThemedText>
        </View>
        <View style={styles.ruleItem}>
          <Text style={styles.ruleNumber}>3</Text>
          <ThemedText style={styles.ruleText}>Faster answers earn more points</ThemedText>
        </View>
        <View style={styles.ruleItem}>
          <Text style={styles.ruleNumber}>4</Text>
          <ThemedText style={styles.ruleText}>Earn coins based on your score</ThemedText>
        </View>
      </View>

      <Pressable style={styles.startButton} onPress={startGame} disabled={loading}>
        <LinearGradient
          colors={['#FF6B6B', colors.error]}
          style={styles.startButtonGradient}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <>
              <Ionicons name="play" size={22} color={Colors.text.inverse} />
              <ThemedText style={styles.startButtonText}>Start Quiz</ThemedText>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderPlayingScreen = () => {
    if (!currentQuestion) return null;

    const progressWidth = interpolate(progressAnim.value, [0, 1], ['0%', '100%']);

    return (
      <View style={styles.playingContent}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: progressWidth },
                timeLeft <= 5 && { backgroundColor: Colors.error },
              ]}
            />
          </View>
          <View style={styles.progressInfo}>
            <Text style={styles.questionCounter}>
              {currentIndex + 1}/{questions.length}
            </Text>
            <View style={styles.timerBadge}>
              <Ionicons name="timer" size={14} color={timeLeft <= 5 ? Colors.error : Colors.info} />
              <Text style={[styles.timerText, timeLeft <= 5 && { color: Colors.error }]}>
                {timeLeft}s
              </Text>
            </View>
          </View>
        </View>

        {/* Category + Score */}
        <View style={styles.topMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{currentQuestion.category}</Text>
          </View>
          <Text style={styles.scoreBadge}>Score: {score}</Text>
        </View>

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, i) => (
            <Animated.View
              key={i}
              style={{
                opacity: optionAnimations[i],
                transform: [{
                  translateY: interpolate(optionAnimations[i].value, [0, 1], [20, 0]),
                }],
              }}
            >
              <Pressable
                style={getOptionStyle(i)}
                onPress={() => handleOptionPress(i)}
                disabled={gameState === 'answered'}
               
              >
                <View style={styles.optionLetter}>
                  <Text style={styles.optionLetterText}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text style={getOptionTextStyle(i)} numberOfLines={2}>{option}</Text>
                {gameState === 'answered' && i === currentQuestion.correctIndex && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.text.inverse} style={{ marginLeft: 'auto' }} />
                )}
                {gameState === 'answered' && i === selectedOption && i !== currentQuestion.correctIndex && (
                  <Ionicons name="close-circle" size={22} color={Colors.text.inverse} style={{ marginLeft: 'auto' }} />
                )}
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </View>
    );
  };

  const renderCompletedScreen = () => {
    const percentage = Math.round((correctCount / questions.length) * 100);
    let grade = 'Keep Trying!';
    let gradeColor = Colors.error;
    if (percentage >= 90) { grade = 'Excellent!'; gradeColor = Colors.success; }
    else if (percentage >= 70) { grade = 'Great Job!'; gradeColor = Colors.info; }
    else if (percentage >= 50) { grade = 'Good Effort!'; gradeColor = Colors.warning; }

    return (
      <View style={styles.centerContent}>
        <View style={[styles.completedIconBg, { backgroundColor: `${gradeColor}20` }]}>
          <Ionicons
            name={percentage >= 70 ? 'trophy' : 'ribbon'}
            size={56}
            color={gradeColor}
          />
        </View>
        <ThemedText style={[styles.completedTitle, { color: gradeColor }]}>{grade}</ThemedText>
        <ThemedText style={styles.completedSubtitle}>
          You got {correctCount} out of {questions.length} correct
        </ThemedText>

        <View style={styles.scoreCard}>
          <Text style={styles.scoreCardLabel}>Final Score</Text>
          <Text style={styles.scoreCardValue}>{score}</Text>
          <Text style={styles.scoreCardPercent}>{percentage}% accuracy</Text>
        </View>

        {coinsEarned > 0 && (
          <View style={styles.coinsEarnedCard}>
            <CachedImage source={nuqtaCoinImage} style={styles.coinIcon} />
            <ThemedText style={styles.coinsEarnedText}>+{coinsEarned} {BRAND.CURRENCY_CODE} earned!</ThemedText>
          </View>
        )}

        <View style={styles.actionButtons}>
          <Pressable style={styles.playAgainButton} onPress={startGame}>
            <LinearGradient
              colors={['#FF6B6B', colors.error]}
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
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Trivia Challenge',
          headerStyle: { backgroundColor: '#FFD93D' },
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['#FFD93D', '#FFC93D', '#FFB93D']}
            style={styles.gradient}
          >
            {gameState === 'idle' && renderIdleScreen()}
            {(gameState === 'playing' || gameState === 'answered') && renderPlayingScreen()}
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
    paddingBottom: Spacing['2xl'],
  },
  centerContent: {
    alignItems: 'center',
    width: '100%',
  },
  gameIconContainer: {
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  gameIconGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameIconText: {
    ...Typography.h1,
    fontSize: 48,
    fontWeight: '800',
    color: Colors.text.inverse,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  rulesTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  ruleNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.warningScale[50],
    textAlign: 'center',
    lineHeight: 26,
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.warning,
    overflow: 'hidden',
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
    shadowColor: colors.error,
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
    color: Colors.text.inverse,
  },
  // Playing
  playingContent: {
    width: '100%',
  },
  progressContainer: {
    marginBottom: Spacing.base,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.info,
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionCounter: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  timerText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.info,
  },
  topMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  categoryText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  scoreBadge: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  questionCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    minHeight: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  questionText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    lineHeight: 26,
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionCorrect: {
    backgroundColor: Colors.success,
  },
  optionWrong: {
    backgroundColor: Colors.error,
  },
  optionDimmed: {
    opacity: 0.5,
  },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.tertiary,
  },
  optionText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  // Completed
  completedIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  completedTitle: {
    ...Typography.h1,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  completedSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xl,
  },
  scoreCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreCardLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  scoreCardValue: {
    ...Typography.h1,
    fontSize: 48,
    fontWeight: '800',
    color: Colors.text.primary,
    marginVertical: Spacing.xs,
  },
  scoreCardPercent: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.info,
  },
  coinsEarnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  coinIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
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
    shadowColor: colors.error,
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
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  backToGamesText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});

export default withErrorBoundary(TriviaPage, 'GamesTrivia');
