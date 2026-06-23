// @ts-nocheck
import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  interpolate,
  Easing} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import gameApi, { QuizQuestion } from '../../services/gameApi';
import gamificationApi from '../../services/gamificationApi';
import { useGetCurrencySymbol, useRezBalance, useRefreshWallet, useAdjustBalance } from '@/stores/selectors';
import { useGamification } from '@/contexts/GamificationContext';
import { platformAlert } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// Nuqta App Theme Colors - mapped to DesignSystem tokens
const COLORS = {
  primary: Colors.gold,
  primaryLight: Colors.primary[200],
  primaryDark: Colors.primary[700],
  primaryBg: Colors.background.tertiary,
  primaryBgLight: Colors.background.secondary,

  gold: Colors.gold,
  goldLight: Colors.primary[200],
  goldDark: Colors.primary[900],
  goldBg: Colors.background.accent,

  purple: colors.brand.purpleMedium,
  purpleLight: '#C084FC',
  purpleDark: Colors.brand.purple,
  purpleBg: colors.tint.purpleLight,

  background: Colors.background.secondary,
  surface: Colors.background.primary,
  surfaceSecondary: Colors.secondary[50],

  navy: Colors.nileBlue,
  text: Colors.text.primary,
  textSecondary: Colors.gray[800],
  textMuted: Colors.gray[600],
  textLight: Colors.text.tertiary,

  border: Colors.border.default,
  borderLight: Colors.secondary[50],

  success: Colors.success,
  successBg: Colors.successScale[50],
  warning: Colors.warning,
  warningBg: Colors.warningScale[50],
  error: Colors.error,
  errorBg: Colors.errorScale[50],

  shadow: 'rgba(26, 58, 82, 0.08)'};

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
      style={[
        styles.confetti,
        {
          backgroundColor: color,
          transform: [{ translateY }, { translateX }, { rotate: spin }],
          opacity},
      ]}
    />
  );
};

const Quiz = () => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const { actions: gamificationActions } = useGamification();
  const walletBalance = useRezBalance();
  const refreshWallet = useRefreshWallet();
  const adjustBalance = useAdjustBalance();
  const currencySymbol = getCurrencySymbol();
  const [gameState, setGameState] = useState<'start' | 'playing' | 'result'>('start');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [todayPlays, setTodayPlays] = useState(0);
  const [maxPlays, setMaxPlays] = useState(5);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Array<{ questionId: string; selectedAnswer: number; timeSpent: number }>>([]);
  const [correctCount, setCorrectCount] = useState(0);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [fetchingQuestions, setFetchingQuestions] = useState(false);
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);

  const progressAnim = useSharedValue(1);
  const scaleAnim = useSharedValue(1);
  const isMounted = useIsMounted();

  // Fetch daily limits and wallet balance on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [limitsResponse] = await Promise.all([
          gameApi.getDailyLimits(),
          refreshWallet(),
        ]);

        if (limitsResponse.data) {
          const quizLimits = limitsResponse.data.quiz;
          if (quizLimits) {
            setTodayPlays(quizLimits.used);
            setMaxPlays(quizLimits.limit);
          }
        }
      } catch (error) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && selectedAnswer === null) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        progressAnim.value = withTiming((timeLeft - 1) / 15, { duration: 1000 });
      }, 1000);
      return () => {
        clearTimeout(timer);
      };
    } else if (timeLeft === 0 && selectedAnswer === null) {
      handleAnswer(-1);
    }
  }, [timeLeft, gameState, selectedAnswer]);

  const startGame = async () => {
    if (todayPlays >= maxPlays) return;

    setFetchingQuestions(true);
    try {
      const response = await gamificationApi.startQuiz('medium');

      if (response.success && response.data) {
        const mappedQuestions: QuizQuestion[] = response.data.questions.map((q: any) => ({
          _id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          coins: q.coins,
          category: 'General',
          difficulty: 'medium'}));

        if (mappedQuestions.length === 0) {
          platformAlert('No Questions', 'No quiz questions are available right now. Please try again later.');
          return;
        }

        if (!isMounted()) return;
        setQuizQuestions(mappedQuestions);
        if (!isMounted()) return;
        setQuizSessionId(response.data.id);
        if (!isMounted()) return;
        setGameState('playing');
        if (!isMounted()) return;
        setCurrentQuestion(0);
        if (!isMounted()) return;
        setScore(0);
        if (!isMounted()) return;
        setSelectedAnswer(null);
        if (!isMounted()) return;
        setTimeLeft(15);
        if (!isMounted()) return;
        setStreak(0);
        if (!isMounted()) return;
        setBestStreak(0);
        if (!isMounted()) return;
        setCorrectCount(0);
        if (!isMounted()) return;
        setAnswers([]);
        progressAnim.value = 1;
      } else {
        platformAlert('Error', response.error || 'Failed to load quiz questions. Please try again.');
      }
    } catch (error) {
      platformAlert('Error', 'Something went wrong while loading the quiz. Please try again.');
    } finally {
      if (!isMounted()) return;
      setFetchingQuestions(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answerIndex);
    const currentQ = quizQuestions[currentQuestion];
    const isCorrect = answerIndex === currentQ.correctAnswer;

    // Track answer
    const timeSpent = 15 - timeLeft;
    setAnswers(prev => [...prev, {
      questionId: currentQ._id,
      selectedAnswer: answerIndex,
      timeSpent
    }]);

    if (isCorrect) {
      setScore(score + currentQ.coins);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setCorrectCount(prev => prev + 1);

      // Pulse animation for correct answer
      scaleAnim.value = withSequence(
        withTiming(1.05, { duration: 150 }),
        withTiming(1, { duration: 150 }),
      );
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setTimeLeft(15);
        progressAnim.value = 1;
      } else {
        submitQuizResults();
      }
    }, 1500);
  };

  const submitQuizResults = async () => {
    setSubmitting(true);
    try {
      const response = await gameApi.submitQuiz(answers);
      if (response.data) {
        setScore(response.data.totalCoins);
        if (response.data.totalCoins > 0) adjustBalance(response.data.totalCoins);
      }
      // Refresh limits
      const limitsResponse = await gameApi.getDailyLimits();
      if (limitsResponse.data?.quiz) {
        setTodayPlays(limitsResponse.data.quiz.used);
      } else {
        if (!isMounted()) return;
        setTodayPlays(todayPlays + 1);
      }
      // Refresh wallet then sync coins
      await refreshWallet();
      await gamificationActions.syncCoinsFromWallet();
    } catch (error) {
      if (!isMounted()) return;
      setTodayPlays(todayPlays + 1);
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
      if (!isMounted()) return;
      setGameState('result');
    }
  };

  const getStreakBonus = () => {
    if (bestStreak >= 5) return score * 0.5;
    if (bestStreak >= 3) return score * 0.25;
    return 0;
  };

  const totalEarned = score + getStreakBonus();

  const getPerformanceRating = () => {
    const pct = quizQuestions.length > 0 ? correctCount / quizQuestions.length : 0;
    if (pct === 1) return { text: 'Perfect Score!', icon: 'star' as const, color: COLORS.gold };
    if (pct >= 0.8) return { text: 'Excellent!', icon: 'trophy' as const, color: COLORS.purple };
    if (pct >= 0.6) return { text: 'Good Job!', icon: 'thumbs-up' as const, color: COLORS.primary };
    if (pct >= 0.4) return { text: 'Nice Try!', icon: 'happy' as const, color: COLORS.warning };
    return { text: 'Keep Practicing!', icon: 'refresh' as const, color: COLORS.textMuted };
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
            <Text style={styles.headerIcon}>🧠</Text>
            <Text style={styles.headerTitle}>Quiz Master</Text>
          </View>
          <Text style={styles.headerSubtitle}>Test your knowledge, earn coins</Text>
        </View>

        {gameState === 'playing' ? (
          <View style={[styles.timerBadge, timeLeft <= 5 && styles.timerBadgeWarning]}>
            <Ionicons name="time-outline" size={16} color={timeLeft <= 5 ? COLORS.error : COLORS.purple} />
            <Text style={[styles.timerText, timeLeft <= 5 && styles.timerTextWarning]}>{timeLeft}s</Text>
          </View>
        ) : (
          <Pressable style={styles.coinsBadge} onPress={() => router.push('/wallet' as any)}>
            <CachedImage
              source={BRAND.COIN_IMAGE}
              style={styles.coinIcon}
              contentFit="contain"
            />
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
              colors={[COLORS.purple, COLORS.purpleDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroIconWrapper}>
                <View style={styles.heroIconBg}>
                  <Text style={styles.heroIconText}>🧠</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>Quiz Master</Text>
              <Text style={styles.heroSubtitle}>Answer questions correctly and earn coins!</Text>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatBox}>
                  <CachedImage
                    source={BRAND.COIN_IMAGE}
                    style={styles.heroStatIcon}
                    contentFit="contain"
                  />
                  <Text style={styles.heroStatValue}>250</Text>
                  <Text style={styles.heroStatLabel}>Max Coins</Text>
                </View>

                <View style={styles.heroStatDivider} />

                <View style={styles.heroStatBox}>
                  <Ionicons name="game-controller" size={24} color={Colors.text.inverse} />
                  <Text style={styles.heroStatValue}>{maxPlays - todayPlays}/{maxPlays}</Text>
                  <Text style={styles.heroStatLabel}>Plays Left</Text>
                </View>
              </View>

              {/* Decorative circles */}
              <View style={[styles.decorCircle, styles.decorCircle1]} />
              <View style={[styles.decorCircle, styles.decorCircle2]} />
            </LinearGradient>

            {/* How to Play */}
            <View style={styles.howToPlayCard}>
              <View style={styles.howToPlayHeader}>
                <Ionicons name="help-circle" size={20} color={COLORS.purple} />
                <Text style={styles.howToPlayTitle}>How to Play</Text>
              </View>

              <View style={styles.stepsContainer}>
                {[
                  { num: '1', color: COLORS.purple, title: 'Answer 5 questions', desc: 'Each question has 15 seconds', icon: 'bulb' },
                  { num: '2', color: COLORS.gold, title: 'Earn 50 coins per correct answer', desc: 'Plus streak bonuses!', icon: 'cash' },
                  { num: '3', color: colors.brand.pink, title: 'Get streak bonuses', desc: '3+ streak: +25% | 5 streak: +50%', icon: 'flash' },
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
              disabled={todayPlays >= maxPlays || fetchingQuestions}
             
              style={styles.startButtonWrapper}
            >
              <LinearGradient
                colors={todayPlays >= maxPlays ? [Colors.text.tertiary, Colors.gray[600]] : [COLORS.purple, COLORS.purpleDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButton}
              >
                {fetchingQuestions ? (
                  <ActivityIndicator size="small" color={Colors.text.inverse} />
                ) : (
                  <>
                    <Ionicons
                      name={todayPlays >= maxPlays ? "time-outline" : "play"}
                      size={22}
                      color={Colors.text.inverse}
                    />
                    <Text style={styles.startButtonText}>
                      {todayPlays >= maxPlays ? 'Come Back Tomorrow' : 'Start Quiz'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Playing Screen */}
        {gameState === 'playing' && (
          <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
            {/* Stats Bar */}
            <View style={styles.gameStatsBar}>
              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatLabel}>QUESTION</Text>
                <Text style={styles.gameStatValue}>{currentQuestion + 1}<Text style={styles.gameStatTotal}>/{quizQuestions.length}</Text></Text>
              </View>

              <View style={styles.gameStatDivider} />

              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatLabel}>STREAK</Text>
                <View style={styles.streakRow}>
                  <Ionicons name="flash" size={16} color={streak > 0 ? COLORS.warning : COLORS.textLight} />
                  <Text style={[styles.gameStatValue, streak > 0 && { color: COLORS.warning }]}>{streak}</Text>
                </View>
              </View>

              <View style={styles.gameStatDivider} />

              <View style={styles.gameStatItem}>
                <Text style={styles.gameStatLabel}>SCORE</Text>
                <View style={styles.scoreRow}>
                  <CachedImage source={BRAND.COIN_IMAGE} style={styles.miniCoin} contentFit="contain" />
                  <Text style={[styles.gameStatValue, { color: COLORS.primary }]}>{score}</Text>
                </View>
              </View>
            </View>

            {/* Question Card */}
            <View style={styles.questionCard}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{quizQuestions[currentQuestion]?.category}</Text>
              </View>
              <Text style={styles.questionText}>{quizQuestions[currentQuestion]?.question}</Text>

              {/* Answer Options */}
              <View style={styles.optionsContainer}>
                {quizQuestions[currentQuestion]?.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = index === quizQuestions[currentQuestion].correctAnswer;
                  const showResult = selectedAnswer !== null;

                  return (
                    <Pressable
                      key={index}
                      onPress={() => handleAnswer(index)}
                      disabled={selectedAnswer !== null}
                     
                      style={[
                        styles.optionButton,
                        showResult && isCorrect && styles.optionCorrect,
                        showResult && isSelected && !isCorrect && styles.optionWrong,
                        !showResult && isSelected && styles.optionSelected,
                      ]}
                    >
                      <View style={[
                        styles.optionLetter,
                        showResult && isCorrect && { backgroundColor: COLORS.successBg, borderColor: COLORS.success },
                        showResult && isSelected && !isCorrect && { backgroundColor: COLORS.errorBg, borderColor: COLORS.error },
                      ]}>
                        <Text style={[
                          styles.optionLetterText,
                          showResult && isCorrect && { color: COLORS.success },
                          showResult && isSelected && !isCorrect && { color: COLORS.error },
                        ]}>
                          {String.fromCharCode(65 + index)}
                        </Text>
                      </View>
                      <Text style={[
                        styles.optionText,
                        showResult && isCorrect && { color: COLORS.success, fontWeight: '700' },
                        showResult && isSelected && !isCorrect && { color: COLORS.error },
                      ]}>{option}</Text>
                      {showResult && isCorrect && (
                        <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <Ionicons name="close-circle" size={22} color={COLORS.error} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Time Progress Bar */}
            <View style={styles.progressWrapper}>
              <View style={styles.progressBg}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
                  <LinearGradient
                    colors={timeLeft <= 5 ? [COLORS.error, Colors.errorScale[700]] : [COLORS.purple, COLORS.purpleLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressGradient}
                  />
                </Animated.View>
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>0s</Text>
                <Text style={[styles.progressLabel, styles.progressLabelCenter, timeLeft <= 5 && { color: COLORS.error }]}>
                  {timeLeft}s remaining
                </Text>
                <Text style={styles.progressLabel}>15s</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Result Screen */}
        {gameState === 'result' && (
          <View style={styles.content}>
            {/* Confetti */}
            {correctCount === quizQuestions.length && (
              <View style={styles.confettiContainer}>
                {[...Array(15)].map((_, i) => (
                  <ConfettiParticle
                    key={i}
                    delay={i * 150}
                    color={[COLORS.purple, COLORS.gold, colors.brand.pink, COLORS.primary][i % 4]}
                  />
                ))}
              </View>
            )}

            {/* Result Card */}
            <View style={styles.resultCard}>
              <LinearGradient
                colors={correctCount >= 3 ? [COLORS.purple, COLORS.purpleDark] : [COLORS.surfaceSecondary, COLORS.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultGradient}
              >
                <View style={[styles.resultIconWrapper, { backgroundColor: correctCount >= 3 ? 'rgba(255,255,255,0.2)' : COLORS.purpleBg }]}>
                  <Ionicons
                    name={getPerformanceRating().icon}
                    size={48}
                    color={correctCount >= 3 ? Colors.text.inverse :getPerformanceRating().color}
                  />
                </View>

                <Text style={[styles.resultTitle, { color: correctCount >= 3 ? Colors.text.inverse :COLORS.navy }]}>
                  {getPerformanceRating().text}
                </Text>
                <Text style={[styles.resultSubtitle, { color: correctCount >= 3 ? 'rgba(255,255,255,0.9)' : COLORS.textMuted }]}>
                  You answered {correctCount} of {quizQuestions.length} correctly
                </Text>

                <View style={[styles.earnedBox, { backgroundColor: correctCount >= 3 ? 'rgba(255,255,255,0.15)' : COLORS.goldBg }]}>
                  <View style={styles.earnedRow}>
                    <CachedImage source={BRAND.COIN_IMAGE} style={styles.earnedCoin} contentFit="contain" />
                    <Text style={[styles.earnedValue, { color: correctCount >= 3 ? Colors.text.inverse :COLORS.gold }]}>+{Math.round(totalEarned)}</Text>
                  </View>
                  <Text style={[styles.earnedLabel, { color: correctCount >= 3 ? 'rgba(255,255,255,0.8)' : COLORS.textMuted }]}>
                    Coins Earned
                  </Text>
                </View>

                {getStreakBonus() > 0 && (
                  <View style={[styles.streakBonusCard, { backgroundColor: correctCount >= 3 ? 'rgba(245,158,11,0.25)' : COLORS.warningBg }]}>
                    <Ionicons name="flash" size={16} color={COLORS.warning} />
                    <Text style={[styles.streakBonusText, { color: correctCount >= 3 ? Colors.text.inverse :COLORS.warning }]}>
                      +{Math.round(getStreakBonus())} Streak Bonus!
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.purpleBg }]}>
                  <Ionicons name="locate" size={22} color={COLORS.purple} />
                </View>
                <Text style={styles.statValue}>{quizQuestions.length > 0 ? ((correctCount / quizQuestions.length) * 100).toFixed(0) : 0}%</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.warningBg }]}>
                  <Ionicons name="flash" size={22} color={COLORS.warning} />
                </View>
                <Text style={styles.statValue}>{bestStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: COLORS.successBg }]}>
                  <Ionicons name="checkmark-done" size={22} color={COLORS.success} />
                </View>
                <Text style={styles.statValue}>{correctCount}/{quizQuestions.length}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <Pressable
                onPress={startGame}
                disabled={todayPlays >= maxPlays || fetchingQuestions}
               
              >
                <LinearGradient
                  colors={todayPlays >= maxPlays ? [Colors.text.tertiary, Colors.gray[600]] : [COLORS.purple, COLORS.purpleDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryAction}
                >
                  {fetchingQuestions ? (
                    <ActivityIndicator size="small" color={Colors.text.inverse} />
                  ) : (
                    <>
                      <Ionicons
                        name={todayPlays >= maxPlays ? "time-outline" : "refresh"}
                        size={20}
                        color={Colors.text.inverse}
                      />
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background},

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border},
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center'},
  headerCenter: {
    flex: 1},
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8},
  headerIcon: {
    fontSize: 24},
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.navy},
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2},
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.purpleBg},
  timerBadgeWarning: {
    backgroundColor: COLORS.errorBg},
  timerText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.purple},
  timerTextWarning: {
    color: COLORS.error},
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.goldBg},
  coinIcon: {
    width: 20,
    height: 20},
  coinsText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.goldDark},

  scrollView: {
    flex: 1},
  content: {
    padding: 16},

  // Hero Card
  heroCard: {
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative'},
  heroIconWrapper: {
    marginBottom: 16},
  heroIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'},
  heroIconText: {
    fontSize: 40},
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: 8},
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 24},
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32},
  heroStatBox: {
    alignItems: 'center'},
  heroStatIcon: {
    width: 28,
    height: 28,
    marginBottom: 8},
  heroStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.inverse},
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4},
  heroStatDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.3)'},
  decorCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)'},
  decorCircle1: {
    width: 120,
    height: 120,
    top: -40,
    right: -40},
  decorCircle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -30},

  // How to Play
  howToPlayCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4},
  howToPlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16},
  howToPlayTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.navy},
  stepsContainer: {
    gap: 14},
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12},
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'},
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '700'},
  stepTextContainer: {
    flex: 1},
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 2},
  stepDesc: {
    fontSize: 12,
    color: COLORS.textMuted},
  stepIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'},

  // Start Button
  startButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden'},
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16},
  startButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.inverse},

  // Game Stats Bar
  gameStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2},
  gameStatItem: {
    flex: 1,
    alignItems: 'center'},
  gameStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 4,
    letterSpacing: 0.5},
  gameStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.navy},
  gameStatTotal: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted},
  gameStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border},
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4},
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4},
  miniCoin: {
    width: 18,
    height: 18},

  // Question Card
  questionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4},
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.purpleBg,
    marginBottom: 16},
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.purple},
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 24,
    lineHeight: 26},
  optionsContainer: {
    gap: 12},
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 12},
  optionSelected: {
    borderColor: COLORS.purple,
    backgroundColor: COLORS.purpleBg},
  optionCorrect: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.success},
  optionWrong: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.error},
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center'},
  optionLetterText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted},
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.navy},

  // Progress Bar
  progressWrapper: {
    marginBottom: 8},
  progressBg: {
    height: 10,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 5,
    overflow: 'hidden'},
  progressFill: {
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden'},
  progressGradient: {
    flex: 1},
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8},
  progressLabel: {
    fontSize: 11,
    color: COLORS.textLight},
  progressLabelCenter: {
    fontWeight: '600',
    color: COLORS.textMuted},

  // Confetti
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    pointerEvents: 'none',
    overflow: 'hidden'},
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
    left: '50%',
    top: -10},

  // Result Card
  resultCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8},
  resultGradient: {
    padding: 32,
    alignItems: 'center'},
  resultIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20},
  resultTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8},
  resultSubtitle: {
    fontSize: 15,
    marginBottom: 24},
  earnedBox: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12},
  earnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6},
  earnedCoin: {
    width: 36,
    height: 36},
  earnedValue: {
    fontSize: 44,
    fontWeight: '800'},
  earnedLabel: {
    fontSize: 13},
  streakBonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12},
  streakBonusText: {
    fontSize: 14,
    fontWeight: '700'},

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20},
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2},
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10},
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 4},
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5},

  // Actions
  actionsContainer: {
    gap: 12},
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16},
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.inverse},
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border},
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMuted}});

export default withErrorBoundary(Quiz, 'Quiz');
