// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, StatusBar, ActivityIndicator, TextInput } from 'react-native';
import { DetailPageSkeleton } from '@/components/skeletons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import surveyApiService, { SurveyDetail, SurveyAnswer } from '@/services/surveysApi';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const categoryEmojis: Record<string, string> = {
  'Shopping': '📦',
  'Food': '🍔',
  'Fashion': '👗',
  'Finance': '🏦',
  'Health': '💊',
  'Technology': '📱',
  'Travel': '✈️',
  'Entertainment': '🎬',
  'Lifestyle': '🏡',
  'General': '📋',
};

function SurveyDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const loadSurvey = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await surveyApiService.getSurveyById(id);
      if (!isMounted()) return;
      setSurvey(data);
      if (data.existingSession) {
        if (!isMounted()) return;
        setCurrentQuestion(data.existingSession.currentQuestionIndex);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to load survey. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, [id]);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadSurvey();
  }, [loadSurvey]);

  const handleStartSurvey = async () => {
    setStarting(true);
    try {
      const session = await surveyApiService.startSurvey(id!);
      if (!isMounted()) return;
      setStartTime(new Date());
      if (!isMounted()) return;
      setShowQuestions(true);
      if (session.resumed && session.answers) {
        if (!isMounted()) return;
        setAnswers(session.answers);
        if (!isMounted()) return;
        setCurrentQuestion(session.currentQuestionIndex);
      }
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to start survey');
    } finally {
      if (!isMounted()) return;
      setStarting(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string | string[] | number) => {
    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === questionId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { questionId, answer };
        return updated;
      }
      return [...prev, { questionId, answer }];
    });
  };

  const handleNext = async () => {
    if (!survey) return;

    if (currentQuestion < survey.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      // Save progress
      try {
        await surveyApiService.saveProgress(id!, answers, currentQuestion + 1);
      } catch (error) {
        // silently handle
      }
    } else {
      // Submit survey
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!survey) return;

    // Check required questions
    const unanswered = survey.questions.filter(q =>
      q.required && !answers.find(a => a.questionId === q.id)
    );

    if (unanswered.length > 0) {
      platformAlertSimple('Incomplete', 'Please answer all required questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await surveyApiService.submitSurvey(id!, answers);
      router.replace({
        pathname: '/survey/complete',
        params: {
          coinsEarned: result.coinsEarned.toString(),
          timeSpent: result.timeSpent.toString(),
          surveyTitle: survey.title,
        },
      });
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to submit survey');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  const handleAbandon = () => {
    platformAlertDestructive(
      'Abandon Survey?',
      'Your progress will be saved and you can continue later.',
      'Leave',
      async () => {
        try {
          await surveyApiService.saveProgress(id!, answers, currentQuestion);
        } catch (error) {
          // silently handle
        }
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
      }
    );
  };

  const getCurrentAnswer = () => {
    if (!survey) return undefined;
    const question = survey.questions[currentQuestion];
    const answer = answers.find(a => a.questionId === question.id);
    return answer?.answer;
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailPageSkeleton />
      </>
    );
  }

  if (!survey) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <Text style={styles.errorText}>Survey not found</Text>
            <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Text style={styles.backBtnText}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // Survey Taking View
  if (showQuestions) {
    const question = survey.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / survey.questions.length) * 100;
    const currentAnswerValue = getCurrentAnswer();

    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle="dark-content" backgroundColor={Colors.background.secondary} />

          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.closeButton} onPress={handleAbandon}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </Pressable>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                Question {currentQuestion + 1} of {survey.questions.length}
              </Text>
            </View>
            <View style={styles.rewardBadge}>
              <Ionicons name="wallet" size={14} color={Colors.gold} />
              <Text style={styles.rewardBadgeText}>+{survey.reward}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>

          <ScrollView
        style={styles.questionContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
            {/* Question */}
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{question.question}</Text>
              {question.required && (
                <Text style={styles.requiredText}>* Required</Text>
              )}
            </View>

            {/* Answer Options */}
            <View style={styles.optionsContainer}>
              {question.type === 'single_choice' && question.options?.map((option, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.optionButton,
                    currentAnswerValue === option && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleAnswer(question.id, option)}
                >
                  <View style={[
                    styles.radioCircle,
                    currentAnswerValue === option && styles.radioCircleSelected,
                  ]}>
                    {currentAnswerValue === option && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[
                    styles.optionText,
                    currentAnswerValue === option && styles.optionTextSelected,
                  ]}>
                    {option}
                  </Text>
                </Pressable>
              ))}

              {question.type === 'multiple_choice' && question.options?.map((option, index) => {
                const selected = Array.isArray(currentAnswerValue) && currentAnswerValue.includes(option);
                return (
                  <Pressable
                    key={index}
                    style={[
                      styles.optionButton,
                      selected && styles.optionButtonSelected,
                    ]}
                    onPress={() => {
                      const current = Array.isArray(currentAnswerValue) ? currentAnswerValue : [];
                      if (selected) {
                        handleAnswer(question.id, current.filter(o => o !== option));
                      } else {
                        handleAnswer(question.id, [...current, option]);
                      }
                    }}
                  >
                    <View style={[
                      styles.checkbox,
                      selected && styles.checkboxSelected,
                    ]}>
                      {selected && <Ionicons name="checkmark" size={14} color={Colors.text.inverse} />}
                    </View>
                    <Text style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                    ]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}

              {(question.type === 'rating' || question.type === 'scale') && (
                <View style={styles.ratingContainer}>
                  <View style={styles.ratingLabels}>
                    <Text style={styles.ratingLabelText}>{question.minValue || 1}</Text>
                    <Text style={styles.ratingLabelText}>{question.maxValue || (question.type === 'scale' ? 10 : 5)}</Text>
                  </View>
                  <View style={styles.ratingButtons}>
                    {Array.from({ length: (question.maxValue || (question.type === 'scale' ? 10 : 5)) - (question.minValue || 1) + 1 }, (_, i) => (question.minValue || 1) + i).map((value) => (
                      <Pressable
                        key={value}
                        style={[
                          styles.ratingButton,
                          question.type === 'scale' && styles.scaleButton,
                          currentAnswerValue === value && styles.ratingButtonSelected,
                        ]}
                        onPress={() => handleAnswer(question.id, value)}
                      >
                        <Text style={[
                          styles.ratingText,
                          question.type === 'scale' && styles.scaleText,
                          currentAnswerValue === value && styles.ratingTextSelected,
                        ]}>
                          {value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {question.type === 'text' && (
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Type your answer here..."
                    placeholderTextColor={Colors.text.tertiary}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    value={typeof currentAnswerValue === 'string' ? currentAnswerValue : ''}
                    onChangeText={(text) => handleAnswer(question.id, text)}
                    maxLength={question.maxLength || 500}
                  />
                  <Text style={styles.textInputHint}>
                    {typeof currentAnswerValue === 'string' ? currentAnswerValue.length : 0}/{question.maxLength || 500} characters
                    {question.minLength ? ` (min: ${question.minLength})` : ''}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Navigation Buttons */}
          <View style={styles.navButtons}>
            <Pressable
              style={[styles.navButton, styles.navButtonSecondary]}
              onPress={handlePrevious}
              disabled={currentQuestion === 0}
            >
              <Ionicons name="chevron-back" size={20} color={currentQuestion === 0 ? Colors.text.tertiary : Colors.text.primary} />
              <Text style={[styles.navButtonText, currentQuestion === 0 && styles.navButtonTextDisabled]}>
                Previous
              </Text>
            </Pressable>

            <Pressable
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={handleNext}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.text.inverse} />
              ) : (
                <>
                  <Text style={styles.navButtonTextPrimary}>
                    {currentQuestion === survey.questions.length - 1 ? 'Submit' : 'Next'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={Colors.text.inverse} />
                </>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // Survey Detail View (before starting)
  const emoji = categoryEmojis[survey.subcategory || 'General'] || '📋';
  const completionPercent = survey.targetResponses > 0
    ? Math.round((survey.completedCount / survey.targetResponses) * 100)
    : 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.secondary} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Survey Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.08)', 'rgba(139, 92, 246, 0.08)']}
              style={styles.heroGradient}
            >
              <View style={styles.heroEmoji}>
                <Text style={styles.emojiText}>{emoji}</Text>
              </View>
              <Text style={styles.heroTitle}>{survey.title}</Text>
              <Text style={styles.heroCategory}>{survey.subcategory || 'General'}</Text>

              <View style={styles.heroBadges}>
                <View style={styles.heroBadge}>
                  <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
                  <Text style={styles.heroBadgeText}>{survey.estimatedTime} mins</Text>
                </View>
                <View style={styles.heroBadge}>
                  <Ionicons name="document-text-outline" size={14} color={Colors.text.tertiary} />
                  <Text style={styles.heroBadgeText}>{survey.questionsCount} questions</Text>
                </View>
                <View style={styles.heroBadge}>
                  <Ionicons name="people-outline" size={14} color={Colors.text.tertiary} />
                  <Text style={styles.heroBadgeText}>{survey.completedCount} completed</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Reward Card */}
          <View style={styles.rewardCard}>
            <LinearGradient
              colors={['rgba(255, 205, 87, 0.1)', 'rgba(255, 205, 87, 0.1)']}
              style={styles.rewardCardGradient}
            >
              <View style={styles.rewardIconContainer}>
                <Ionicons name="wallet" size={28} color={Colors.gold} />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardLabel}>Complete to earn</Text>
                <Text style={styles.rewardAmount}>+{survey.reward} {BRAND.COIN_NAME}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this survey</Text>
            <Text style={styles.description}>{survey.description}</Text>
          </View>

          {/* Instructions */}
          {survey.instructions && survey.instructions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              {survey.instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Progress */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Responses</Text>
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  {survey.completedCount} of {survey.targetResponses} responses
                </Text>
                <Text style={styles.progressPercent}>{completionPercent}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${Math.min(completionPercent, 100)}%` }]} />
              </View>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Start Button */}
        <View style={styles.startButtonContainer}>
          <Pressable
            style={styles.startButtonWrapper}
            onPress={handleStartSurvey}
            disabled={starting || survey.userStatus === 'completed'}
          >
            <LinearGradient
              colors={survey.userStatus === 'completed' ? [colors.neutral[400], colors.neutral[400]] : [colors.infoScale[400], colors.brand.purpleLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startButtonGradient}
            >
              {starting ? (
                <ActivityIndicator size="small" color={Colors.text.inverse} />
              ) : (
                <>
                  <Text style={styles.startButtonText}>
                    {survey.userStatus === 'completed'
                      ? 'Already Completed'
                      : survey.userStatus === 'in_progress'
                      ? 'Continue Survey'
                      : 'Start Survey'}
                  </Text>
                  {survey.userStatus !== 'completed' && (
                    <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
                  )}
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorText: {
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.sm,
  },
  backBtnText: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    padding: Spacing.sm,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  progressInfo: {
    flex: 1,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    borderRadius: BorderRadius.xl,
  },
  rewardBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gold,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.gold,
  },
  heroSection: {
    padding: Spacing.base,
  },
  heroGradient: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  heroEmoji: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadows.medium,
  },
  emojiText: {
    fontSize: 36,
  },
  heroTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  heroCategory: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.base,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heroBadgeText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  rewardCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  rewardCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
    gap: Spacing.base,
  },
  rewardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardContent: {
    flex: 1,
  },
  rewardLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  rewardAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.gold,
  },
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 22,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: Spacing.sm,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  progressSection: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gold,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 4,
  },
  startButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  startButtonWrapper: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  startButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  questionContainer: {
    flex: 1,
    padding: Spacing.base,
  },
  questionCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  questionText: {
    ...Typography.h4,
    color: Colors.text.primary,
    lineHeight: 26,
  },
  requiredText: {
    ...Typography.bodySmall,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: Spacing.md,
  },
  optionButtonSelected: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(255, 205, 87, 0.05)',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: Colors.gold,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.gold,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  ratingContainer: {
    gap: 12,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  ratingLabelText: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  ratingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: Colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  ratingButtonSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  scaleText: {
    fontSize: 13,
  },
  ratingTextSelected: {
    color: Colors.text.inverse,
  },
  textInputContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  textInput: {
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 120,
    paddingTop: 0,
    paddingBottom: 12,
  },
  textInputHint: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    textAlign: 'right',
  },
  navButtons: {
    flexDirection: 'row',
    padding: Spacing.base,
    gap: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  navButtonSecondary: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  navButtonPrimary: {
    backgroundColor: Colors.gold,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  navButtonTextDisabled: {
    color: Colors.text.tertiary,
  },
  navButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(SurveyDetailPage, 'SurveyId');
