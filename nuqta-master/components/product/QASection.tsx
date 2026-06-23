import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Button } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

/**
 * Question Interface
 */
interface Question {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: Date;
  answers: Answer[];
  helpful: number;
}

/**
 * Answer Interface
 */
interface Answer {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: Date;
  helpful: number;
  isSeller?: boolean;
  isVerifiedPurchase?: boolean;
}

/**
 * QASection Component Props
 */
interface QASectionProps {
  productId: string;
  questions?: Question[];
  onAskQuestion?: (question: string) => Promise<void>;
  onAnswerQuestion?: (questionId: string, answer: string) => Promise<void>;
  onMarkHelpful?: (questionId: string, answerId?: string) => void;
  maxQuestions?: number;
}

/**
 * QASection Component
 *
 * A comprehensive Q&A section for product pages that allows users to:
 * - Ask questions about the product
 * - Answer existing questions
 * - Mark questions/answers as helpful
 * - View seller and verified purchase badges
 *
 * Features:
 * - Collapsible questions to save space
 * - Inline answer submission
 * - Real-time helpful counts
 * - User avatars and badges
 * - Empty state messaging
 *
 * @example
 * ```tsx
 * <QASection
 *   productId="123"
 *   questions={productQuestions}
 *   onAskQuestion={handleAskQuestion}
 *   onAnswerQuestion={handleAnswerQuestion}
 *   onMarkHelpful={handleMarkHelpful}
 * />
 * ```
 */
function QASection({
  productId,
  questions = [],
  onAskQuestion,
  onAnswerQuestion,
  onMarkHelpful,
  maxQuestions = 10,
}: QASectionProps) {
  const [showAskModal, setShowAskModal] = useState(false);
  const [activeAnswer, setActiveAnswer] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isMounted = useIsMounted();

  /**
   * Handle ask question submission
   */
  const handleAskQuestion = async () => {
    if (!questionText.trim() || !onAskQuestion) return;

    setSubmitting(true);
    try {
      await onAskQuestion(questionText);
      if (!isMounted()) return;
      setQuestionText('');
      setShowAskModal(false);
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  /**
   * Handle answer submission
   */
  const handleAnswerQuestion = async (questionId: string) => {
    if (!answerText.trim() || !onAnswerQuestion) return;

    setSubmitting(true);
    try {
      await onAnswerQuestion(questionId, answerText);
      if (!isMounted()) return;
      setAnswerText('');
      setActiveAnswer(null);
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  /**
   * Format relative date
   */
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const displayQuestions = questions.slice(0, maxQuestions);
  const hasMore = questions.length > maxQuestions;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Questions & Answers</Text>
          <Text style={styles.count}>
            {questions.length} {questions.length === 1 ? 'question' : 'questions'}
          </Text>
        </View>
      </View>

      {/* Ask Question Button */}
      <Pressable
        style={styles.askButton}
        onPress={() => setShowAskModal(!showAskModal)}
        accessibilityRole="button"
        accessibilityLabel="Ask a question"
      >
        <Ionicons name="help-circle-outline" size={20} color={colors.primary[500]} />
        <Text style={styles.askButtonText}>Ask a Question</Text>
      </Pressable>

      {/* Ask Question Modal */}
      {showAskModal && (
        <View style={styles.askModal}>
          <TextInput
            style={styles.askInput}
            placeholder="What would you like to know about this product?"
            placeholderTextColor={colors.text.tertiary}
            value={questionText}
            onChangeText={setQuestionText}
            multiline
            numberOfLines={3}
            maxLength={500}
            accessibilityLabel="Question text input"
          />
          <View style={styles.modalActions}>
            <Text style={styles.charCount}>{questionText.length}/500</Text>
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowAskModal(false);
                  setQuestionText('');
                }}
                variant="ghost"
                size="small"
              />
              <Button
                title="Submit"
                onPress={handleAskQuestion}
                variant="primary"
                size="small"
                disabled={!questionText.trim()}
                loading={submitting}
              />
            </View>
          </View>
        </View>
      )}

      {/* Questions List */}
      <ScrollView style={styles.questionsList} nestedScrollEnabled>
        {displayQuestions.map((question) => (
          <View key={question.id} style={styles.questionCard}>
            {/* Question Header */}
            <View style={styles.questionHeader}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {question.userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.userName}>{question.userName}</Text>
                  <Text style={styles.date}>{formatDate(question.createdAt)}</Text>
                </View>
              </View>
            </View>

            {/* Question Text */}
            <Text style={styles.questionText}>Q: {question.text}</Text>

            {/* Answers */}
            {question.answers.length > 0 && (
              <View style={styles.answersContainer}>
                {question.answers.map((answer) => (
                  <View key={answer.id} style={styles.answerCard}>
                    <View style={styles.answerHeader}>
                      <View style={styles.userInfo}>
                        <View style={[styles.avatar, styles.avatarSmall]}>
                          <Text style={styles.avatarTextSmall}>
                            {answer.userName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <View style={styles.answerUserRow}>
                            <Text style={styles.answerUserName}>{answer.userName}</Text>
                            {answer.isSeller && (
                              <View style={styles.sellerBadge}>
                                <Ionicons name="storefront" size={10} color={colors.text.inverse} />
                                <Text style={styles.sellerBadgeText}>Seller</Text>
                              </View>
                            )}
                            {answer.isVerifiedPurchase && (
                              <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={10} color={colors.text.inverse} />
                                <Text style={styles.verifiedBadgeText}>Verified</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.dateSmall}>{formatDate(answer.createdAt)}</Text>
                        </View>
                      </View>
                      <Pressable
                        style={styles.helpfulButton}
                        onPress={() => onMarkHelpful?.(question.id, answer.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Mark answer as helpful. ${answer.helpful} people found this helpful`}
                      >
                        <Ionicons name="thumbs-up-outline" size={16} color={colors.text.secondary} />
                        <Text style={styles.helpfulText}>{answer.helpful}</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.answerText}>A: {answer.text}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Question Actions */}
            <View style={styles.questionActions}>
              <Pressable
                style={styles.answerButton}
                onPress={() => setActiveAnswer(activeAnswer === question.id ? null : question.id)}
                accessibilityRole="button"
                accessibilityLabel="Answer this question"
              >
                <Ionicons name="chatbubble-outline" size={16} color={colors.primary[500]} />
                <Text style={styles.answerButtonText}>Answer this question</Text>
              </Pressable>
              <Pressable
                style={styles.helpfulButton}
                onPress={() => onMarkHelpful?.(question.id)}
                accessibilityRole="button"
                accessibilityLabel={`Mark question as helpful. ${question.helpful} people found this helpful`}
              >
                <Ionicons name="thumbs-up-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.helpfulText}>Helpful ({question.helpful})</Text>
              </Pressable>
            </View>

            {/* Answer Input */}
            {activeAnswer === question.id && (
              <View style={styles.answerInputContainer}>
                <TextInput
                  style={styles.answerInput}
                  placeholder="Share your answer..."
                  placeholderTextColor={colors.text.tertiary}
                  value={answerText}
                  onChangeText={setAnswerText}
                  multiline
                  numberOfLines={2}
                  maxLength={500}
                  accessibilityLabel="Answer text input"
                />
                <View style={styles.answerActions}>
                  <Text style={styles.charCount}>{answerText.length}/500</Text>
                  <View style={styles.answerButtons}>
                    <Button
                      title="Cancel"
                      onPress={() => {
                        setActiveAnswer(null);
                        setAnswerText('');
                      }}
                      variant="ghost"
                      size="small"
                    />
                    <Button
                      title="Submit"
                      onPress={() => handleAnswerQuestion(question.id)}
                      variant="primary"
                      size="small"
                      disabled={!answerText.trim()}
                      loading={submitting}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Empty State */}
        {questions.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No questions yet</Text>
            <Text style={styles.emptyMessage}>
              Be the first to ask a question about this product
            </Text>
          </View>
        )}

        {/* Has More Indicator */}
        {hasMore && (
          <View style={styles.moreContainer}>
            <Text style={styles.moreText}>
              +{questions.length - maxQuestions} more {questions.length - maxQuestions === 1 ? 'question' : 'questions'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  count: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Ask Button
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    marginBottom: spacing.md,
  },
  askButtonText: {
    ...typography.button,
    color: colors.primary[500],
  },

  // Ask Modal
  askModal: {
    padding: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  askInput: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.background.primary,
    minHeight: 80,
    textAlignVertical: 'top',
    color: colors.text.primary,
  },
  modalActions: {
    marginTop: spacing.sm,
  },
  charCount: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },

  // Questions List
  questionsList: {
    maxHeight: 600,
    paddingHorizontal: spacing.md,
  },
  questionCard: {
    padding: spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  // Question
  questionHeader: {
    marginBottom: spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.button,
    color: colors.primary[700],
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarTextSmall: {
    ...typography.bodySmall,
    color: colors.primary[700],
  },
  userName: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '600',
  },
  date: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  dateSmall: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 11,
  },
  questionText: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontWeight: '500',
  },

  // Answers
  answersContainer: {
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  answerCard: {
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary[500],
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  answerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  answerUserName: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '600',
  },
  sellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.warningScale[500],
    borderRadius: borderRadius.xs,
  },
  sellerBadgeText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.successScale[500],
    borderRadius: borderRadius.xs,
  },
  verifiedBadgeText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '600',
  },
  answerText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Actions
  questionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  answerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  answerButtonText: {
    ...typography.bodySmall,
    color: colors.primary[500],
    fontWeight: '600',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: spacing.sm,
  },
  helpfulText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },

  // Answer Input
  answerInputContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
  },
  answerInput: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    backgroundColor: colors.background.primary,
    minHeight: 60,
    textAlignVertical: 'top',
    color: colors.text.primary,
  },
  answerActions: {
    marginTop: spacing.sm,
  },
  answerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },

  // Empty State
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  // More Container
  moreContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  moreText: {
    ...typography.bodySmall,
    color: colors.primary[500],
    fontWeight: '600',
  },
});

export default React.memo(QASection);
