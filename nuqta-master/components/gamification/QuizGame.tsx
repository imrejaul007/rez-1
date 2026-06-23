// Quiz Game Component
// Interactive quiz game with timer and scoring

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { platformAlert } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import gamificationAPI from '@/services/gamificationApi';
import type { QuizGame as QuizGameType, QuizQuestion } from '@/types/gamification.types';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface QuizGameProps {
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  onGameComplete?: (score: number, coinsEarned: number, tournamentUpdate?: any) => void;
}

function QuizGame({ difficulty, category, onGameComplete }: QuizGameProps) {
  const [gameData, setGameData] = useState<QuizGameType | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(30);
  const [score, setScore] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [lastTournamentUpdate, setLastTournamentUpdate] = useState<any>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | undefined>(difficulty);
  const isMounted = useIsMounted();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // If a difficulty was passed in as a prop, start immediately. Otherwise,
    // wait for the user to tap the "Start Quiz" button on the start screen.
    if (difficulty) {
      startQuiz();
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, []);

  // Start quiz
  const startQuiz = async (overrideDifficulty?: 'easy' | 'medium' | 'hard') => {
    try {
      const chosen = overrideDifficulty ?? selectedDifficulty;
      const response = await gamificationAPI.startQuiz(chosen, category);
      if (response.success && response.data) {
        if (!isMounted()) return;
        setGameData(response.data);
        // Initialize the running score from the server response if provided
        // so the header can display the starting value immediately.
        if (typeof (response.data as any).score === 'number') {
          setScore((response.data as any).score);
        }
        if (response.data.questions.length > 0) {
          if (!isMounted()) return;
          setCurrentQuestion(response.data.questions[0]);
          startTimer(response.data.questions[0].timeLimit);
        }
      }
    } catch (error: any) {
      platformAlert('Error', `Failed to start quiz: ${error.message || 'Unknown error'}`);
    }
  };

  // Triggered by the start screen's "Start Quiz" button — flips the
  // component into in-quiz mode and kicks off the API call.
  const handleStartPress = () => {
    setHasStarted(true);
    // Pass the live selectedDifficulty directly to startQuiz so we don't
    // depend on React having committed the state update from a previous
    // click on a difficulty chip.
    startQuiz(selectedDifficulty);
  };

  // Start timer
  const startTimer = (timeLimit: number) => {
    setTimer(timeLimit);
    if (timerInterval.current) clearInterval(timerInterval.current);

    timerInterval.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle timeout
  const handleTimeout = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    platformAlert('Time\'s Up!', 'Moving to next question...', [
      { text: 'OK', onPress: () => submitAnswer(-1) },
    ]);
  };

  // Submit answer
  const submitAnswer = async (answerIndex: number) => {
    if (isSubmitting || !gameData || !currentQuestion) return;

    try {
      setIsSubmitting(true);
      if (timerInterval.current) clearInterval(timerInterval.current);

      const response = await gamificationAPI.submitQuizAnswer(
        gameData.id,
        currentQuestion.id,
        answerIndex
      );
      if (response.success && response.data) {
        const { isCorrect, coinsEarned, currentScore, nextQuestion, gameCompleted, totalCoins: serverTotalCoins } = response.data;
        if ((response.data as any).tournamentUpdate) {
          if (!isMounted()) return;
          setLastTournamentUpdate((response.data as any).tournamentUpdate);
        }

        // Update score and coins (compute new values inline for use in completion alert).
        // Prefer server-reported totalCoins when provided, otherwise accumulate locally.
        const newScore = currentScore;
        const newTotalCoins = typeof serverTotalCoins === 'number' ? serverTotalCoins : totalCoins + coinsEarned;
        if (!isMounted()) return;
        setScore(newScore);
        if (newTotalCoins !== totalCoins) {
          setTotalCoins(newTotalCoins);
        }

        // Track the next question index in gameData so the counter advances
        const newQuestionIndex = gameData
          ? Math.min(
              gameData.questions.length - 1,
              (gameData.currentQuestionIndex || 0) + 1
            )
          : 0;

        // Show feedback
        const message = isCorrect
          ? `Correct! +${coinsEarned} coins 🎉`
          : `Wrong! The correct answer was: ${currentQuestion.options[currentQuestion.correctAnswer]}`;

        platformAlert(isCorrect ? 'Correct!' : 'Wrong!', message, [
          {
            text: 'Continue',
            onPress: () => {
              if (gameCompleted) {
                handleGameComplete(newScore, newTotalCoins);
              } else if (nextQuestion) {
                if (!isMounted()) return;
                setGameData((prev) =>
                  prev ? { ...prev, currentQuestionIndex: newQuestionIndex } : prev
                );
                setCurrentQuestion(nextQuestion);
                setSelectedAnswer(null);
                startTimer(nextQuestion.timeLimit);
              }
            },
          },
        ]);
      }
    } catch (error: any) {
      platformAlert('Error', `Failed to submit answer: ${error.message || 'Unknown error'}`);
    } finally {
      if (!isMounted()) return;
      setIsSubmitting(false);
    }
  };

  // Handle game complete
  const handleGameComplete = (finalScore?: number, finalCoins?: number) => {
    if (timerInterval.current) clearInterval(timerInterval.current);

    const displayScore = finalScore ?? score;
    const displayCoins = finalCoins ?? totalCoins;

    platformAlert(
      'Quiz Complete! 🎉',
      `Final Score: ${displayScore}\nTotal Coins Earned: ${displayCoins}`,
      [
        {
          text: 'Great!',
          onPress: () => {
            onGameComplete?.(displayScore, displayCoins, lastTournamentUpdate);
          },
        },
      ]
    );
  };

  // Render option button
  const renderOption = (option: string, index: number) => {
    const isSelected = selectedAnswer === index;
    const optionLabels = ['A', 'B', 'C', 'D'];

    return (
      <Pressable
        key={index}
        style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
        onPress={() => setSelectedAnswer(index)}
        disabled={isSubmitting}
      >
        <View style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
          <ThemedText style={[styles.optionLabelText, isSelected && { color: colors.background.primary }]}>
            {optionLabels[index]}
          </ThemedText>
        </View>
        <ThemedText style={[styles.optionText, isSelected && styles.optionTextSelected]}>
          {option}
        </ThemedText>
      </Pressable>
    );
  };

  if (!hasStarted && !difficulty) {
    // Start screen — only shown when no difficulty was supplied via props.
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>Quiz Game</ThemedText>
        <ThemedText style={styles.subtitle}>Pick a difficulty to begin</ThemedText>

        <View style={styles.difficultyRow}>
          {(['easy', 'medium', 'hard'] as const).map((level) => {
            const isActive = selectedDifficulty === level;
            return (
              <Pressable
                key={level}
                onPress={() => setSelectedDifficulty(level)}
                accessibilityRole="button"
                accessibilityLabel={`${level} difficulty`}
                style={[styles.difficultyChip, isActive && styles.difficultyChipActive]}
              >
                <ThemedText style={[styles.difficultyChipText, isActive && styles.difficultyChipTextActive]}>
                  {level[0].toUpperCase() + level.slice(1)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          testID="start-quiz-button"
          accessibilityRole="button"
          accessibilityLabel="Start Quiz"
          onPress={handleStartPress}
          style={styles.startButton}
        >
          <LinearGradient
            colors={[colors.brand.purpleLight, colors.brand.purple]}
            style={styles.startButtonGradient}
          >
            <ThemedText style={styles.startButtonText}>Start</ThemedText>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  if (!currentQuestion) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText>Loading quiz...</ThemedText>
      </View>
    );
  }

  const questionNumber = (gameData?.currentQuestionIndex || 0) + 1;
  const totalQuestions = gameData?.questions.length || 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[colors.brand.purpleLight, colors.brand.purple]} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.scoreBox}>
            <Ionicons name="star" size={16} color={colors.background.primary} />
            <ThemedText testID="quiz-score" style={styles.scoreText}>{score}</ThemedText>
          </View>
          <ThemedText style={styles.questionCounter}>
            {questionNumber}/{totalQuestions}
          </ThemedText>
          <View style={styles.coinsBox}>
            <Ionicons name="diamond" size={16} color={colors.background.primary} />
            <ThemedText testID="quiz-coins" style={styles.coinsText}>{totalCoins}</ThemedText>
          </View>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer} testID="timer">
          <View style={styles.timerBar}>
            <View
              style={[
                styles.timerProgress,
                {
                  width: `${(timer / (currentQuestion?.timeLimit || 30)) * 100}%`,
                  backgroundColor: timer <= 5 ? colors.error : colors.successScale[400],
                },
              ]}
            />
          </View>
          <ThemedText style={styles.timerText}>{timer}s</ThemedText>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Question */}
        <View style={styles.questionContainer}>
          <View style={styles.difficultyBadge}>
            <ThemedText style={styles.difficultyText}>
              {currentQuestion.difficulty.toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText style={styles.questionText}>{currentQuestion.question}</ThemedText>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => renderOption(option, index))}
        </View>

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitButton,
            (selectedAnswer === null || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={() => selectedAnswer !== null && submitAnswer(selectedAnswer)}
          disabled={selectedAnswer === null || isSubmitting}
        >
          <LinearGradient
            colors={selectedAnswer !== null ? [colors.successScale[400], colors.successScale[700]] : [colors.neutral[400], colors.neutral[500]]}
            style={styles.submitButtonGradient}
          >
            <ThemedText style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </ThemedText>
            <Ionicons name="checkmark-circle" size={24} color={colors.background.primary} />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    color: colors.neutral[900],
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    color: colors.neutral[600],
  },
  difficultyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  difficultyChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.background.primary,
  },
  difficultyChipActive: {
    backgroundColor: colors.brand.purple,
    borderColor: colors.brand.purple,
  },
  difficultyChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  difficultyChipTextActive: {
    color: colors.background.primary,
  },
  startButton: {
    marginHorizontal: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButtonText: {
    color: colors.background.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  scoreText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionCounter: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  coinsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  coinsText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  timerProgress: {
    height: '100%',
    borderRadius: 4,
  },
  timerText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 40,
  },
  scrollView: {
    flex: 1,
  },
  questionContainer: {
    margin: 20,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.neutral[500],
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
    lineHeight: 26,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionButtonSelected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.purpleLight,
  },
  optionLabel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLabelSelected: {
    backgroundColor: colors.brand.purpleLight,
  },
  optionLabelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.neutral[500],
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[700],
  },
  optionTextSelected: {
    color: colors.neutral[900],
    fontWeight: '600',
  },
  submitButton: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  submitButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default React.memo(QuizGame);
