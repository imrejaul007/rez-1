// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import surveysApiService, { SurveyDetail, SurveyQuestion, SurveyAnswer } from '@/services/surveysApi';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  primary: colors.brand.green, // Survey-specific green — keep unique
  white: Colors.background.primary,
  textDark: Colors.text.primary,
  textMuted: Colors.text.tertiary,
  background: Colors.background.secondary,
  border: 'rgba(0, 0, 0, 0.08)',
  error: Colors.error,
};

function SurveyTakePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [error, setError] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const isMounted = useIsMounted();

  useEffect(() => {
    loadSurvey();
  }, [id]);

  const loadSurvey = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await surveysApiService.getSurveyById(id);
      if (!isMounted()) return;
      setSurvey(data);

      // Resume from existing session if available
      if (data.existingSession) {
        if (!isMounted()) return;
        setCurrentIndex(data.existingSession.currentQuestionIndex);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load survey');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const currentQuestion = survey?.questions?.[currentIndex];
  const totalQuestions = survey?.questions?.length || 0;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  const handleAnswer = (questionId: string, value: string | string[] | number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = async () => {
    if (!currentQuestion) return;

    // Validate required questions
    if (currentQuestion.required && !currentAnswer) {
      platformAlertSimple('Required', 'Please answer this question before continuing');
      return;
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);

      // Save progress periodically
      if ((currentIndex + 1) % 3 === 0 && id) {
        const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        }));
        await surveysApiService.saveProgress(id, answersArray, currentIndex + 1);
      }
    } else {
      // Submit survey
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!id || !survey) return;

    // Check all required questions are answered
    const unanswered = survey.questions?.filter(
      q => q.required && !answers[q.id]
    ) || [];

    if (unanswered.length > 0) {
      platformAlertSimple(
        'Missing Answers',
        `Please answer all required questions. ${unanswered.length} question(s) remaining.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const answersArray: SurveyAnswer[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const result = await surveysApiService.submitSurvey(id, answersArray);

      // Navigate to completion page with result
      router.replace({
        pathname: `/survey/${id}/complete`,
        params: {
          coinsEarned: result.coinsEarned.toString(),
          timeSpent: result.timeSpent.toString(),
        },
      });
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to submit survey');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    platformAlertConfirm(
      'Exit Survey',
      'Your progress will be saved. You can resume later.',
      async () => {
        if (id) {
          const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            answer,
          }));
          await surveysApiService.saveProgress(id, answersArray, currentIndex);
        }
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
      },
      'Exit'
    );
  };

  const renderQuestion = (question: SurveyQuestion) => {
    switch (question.type) {
      case 'single_choice':
        return (
          <View style={styles.optionsContainer}>
            {question.options?.map((option, index) => (
              <Pressable
                key={index}
                style={[
                  styles.optionButton,
                  currentAnswer === option && styles.optionButtonSelected,
                ]}
                onPress={() => handleAnswer(question.id, option)}
              >
                <View style={[
                  styles.radioOuter,
                  currentAnswer === option && styles.radioOuterSelected,
                ]}>
                  {currentAnswer === option && <View style={styles.radioInner} />}
                </View>
                <Text style={[
                  styles.optionText,
                  currentAnswer === option && styles.optionTextSelected,
                ]}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
        );

      case 'multiple_choice':
        const selectedOptions = (currentAnswer as string[]) || [];
        return (
          <View style={styles.optionsContainer}>
            {question.options?.map((option, index) => {
              const isSelected = selectedOptions.includes(option);
              return (
                <Pressable
                  key={index}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                  onPress={() => {
                    const newSelected = isSelected
                      ? selectedOptions.filter(o => o !== option)
                      : [...selectedOptions, option];
                    handleAnswer(question.id, newSelected);
                  }}
                >
                  <View style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color={Colors.text.inverse} />}
                  </View>
                  <Text style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
            <Text style={styles.hint}>Select all that apply</Text>
          </View>
        );

      case 'rating':
        const ratingValue = (currentAnswer as number) || 0;
        return (
          <View style={styles.ratingContainer}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => handleAnswer(question.id, star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= ratingValue ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= ratingValue ? Colors.warning : COLORS.textMuted}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {ratingValue > 0 ? `${ratingValue} star${ratingValue > 1 ? 's' : ''}` : 'Tap to rate'}
            </Text>
          </View>
        );

      case 'scale':
        const scaleValue = (currentAnswer as number) || 0;
        const min = question.minValue || 1;
        const max = question.maxValue || 10;
        return (
          <View style={styles.scaleContainer}>
            <View style={styles.scaleRow}>
              {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((num) => (
                <Pressable
                  key={num}
                  onPress={() => handleAnswer(question.id, num)}
                  style={[
                    styles.scaleButton,
                    scaleValue === num && styles.scaleButtonSelected,
                  ]}
                >
                  <Text style={[
                    styles.scaleText,
                    scaleValue === num && styles.scaleTextSelected,
                  ]}>
                    {num}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabelText}>Not likely</Text>
              <Text style={styles.scaleLabelText}>Very likely</Text>
            </View>
          </View>
        );

      case 'text':
        return (
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              value={(currentAnswer as string) || ''}
              onChangeText={(text) => handleAnswer(question.id, text)}
              placeholder="Type your answer here..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading questions...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (error || !survey || !currentQuestion) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.errorText}>{error || 'No questions found'}</Text>
            <Pressable style={styles.retryButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Text style={styles.retryText}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleExit} style={styles.exitButton}>
            <Ionicons name="close" size={24} color={COLORS.textDark} />
          </Pressable>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              Question {currentIndex + 1} of {totalQuestions}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>

        <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
          {/* Question */}
          <View style={styles.questionSection}>
            <View style={styles.questionHeader}>
              {currentQuestion.required && (
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>Required</Text>
                </View>
              )}
            </View>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </View>

          {/* Answer Options */}
          {renderQuestion(currentQuestion)}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigation}>
          <Pressable
            style={[styles.navButton, styles.prevButton]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={currentIndex === 0 ? COLORS.textMuted : COLORS.textDark}
            />
            <Text style={[
              styles.navButtonText,
              currentIndex === 0 && styles.navButtonTextDisabled,
            ]}>
              Previous
            </Text>
          </Pressable>

          <Pressable
            style={[styles.navButton, styles.nextButton]}
            onPress={handleNext}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.text.inverse} size="small" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentIndex === totalQuestions - 1 ? 'Submit' : 'Next'}
                </Text>
                <Ionicons
                  name={currentIndex === totalQuestions - 1 ? 'checkmark' : 'chevron-forward'}
                  size={20}
                  color={Colors.text.inverse}
                />
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textMuted },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  errorText: { fontSize: 16, color: COLORS.textMuted, marginTop: 16, textAlign: 'center' },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.primary, borderRadius: 12 },
  retryText: { color: Colors.text.inverse, fontSize: 14, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white },
  exitButton: { padding: 8 },
  progressInfo: { flex: 1, alignItems: 'center' },
  progressText: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  progressBarContainer: { height: 4, backgroundColor: 'rgba(0,0,0,0.08)' },
  progressBar: { height: '100%', backgroundColor: COLORS.primary },
  content: { flex: 1, padding: 20 },
  questionSection: { marginBottom: 24 },
  questionHeader: { flexDirection: 'row', marginBottom: 8 },
  requiredBadge: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 },
  requiredText: { fontSize: 11, fontWeight: '600', color: COLORS.error },
  questionText: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, lineHeight: 28 },
  optionsContainer: { gap: 12 },
  optionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  optionButtonSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(0, 192, 106, 0.05)' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  radioOuterSelected: { borderColor: COLORS.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionText: { flex: 1, fontSize: 15, color: COLORS.textDark },
  optionTextSelected: { fontWeight: '600' },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  ratingContainer: { alignItems: 'center', padding: 20 },
  starsRow: { flexDirection: 'row', gap: 8 },
  starButton: { padding: 8 },
  ratingLabel: { marginTop: 16, fontSize: 14, color: COLORS.textMuted },
  scaleContainer: { padding: 10 },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  scaleButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  scaleButtonSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  scaleText: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  scaleTextSelected: { color: Colors.text.inverse },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  scaleLabelText: { fontSize: 12, color: COLORS.textMuted },
  textInputContainer: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  textInput: { padding: 16, fontSize: 15, color: COLORS.textDark, minHeight: 120 },
  navigation: { flexDirection: 'row', padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 12 },
  navButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  prevButton: { backgroundColor: 'rgba(0,0,0,0.05)' },
  nextButton: { backgroundColor: COLORS.primary },
  navButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.textDark },
  navButtonTextDisabled: { color: COLORS.textMuted },
  nextButtonText: { fontSize: 15, fontWeight: '600', color: Colors.text.inverse },
});

export default withErrorBoundary(SurveyTakePage, 'SurveyIdTake');
