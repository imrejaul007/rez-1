// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import surveysApiService, { SurveyDetail } from '@/services/surveysApi';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
const categoryEmojis: Record<string, string> = {
  'Shopping': '📦', 'Food': '🍔', 'Fashion': '👗', 'Finance': '🏦',
  'Health': '💊', 'Technology': '📱', 'Travel': '✈️', 'Entertainment': '🎬',
  'General': '📋',
};

const difficultyColors = {
  easy: { bg: 'rgba(255, 205, 87, 0.1)', text: Colors.nileBlue, border: 'rgba(255, 205, 87, 0.3)' },
  medium: { bg: 'rgba(249, 115, 22, 0.1)', text: colors.brand.orangeDark, border: 'rgba(249, 115, 22, 0.3)' },
  hard: { bg: 'rgba(239, 68, 68, 0.1)', text: Colors.error, border: 'rgba(239, 68, 68, 0.3)' },
};

function SurveyDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load survey');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleStartSurvey = async () => {
    if (!id || !survey) return;

    if (survey.userStatus === 'completed') {
      setError('You have already completed this survey');
      return;
    }

    setStarting(true);
    try {
      await surveysApiService.startSurvey(id);
      router.push(`/survey/${id}/take`);
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to start survey');
    } finally {
      if (!isMounted()) return;
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.gold} />
            <Text style={styles.loadingText}>Loading survey...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (error || !survey) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.deepNavy} />
            </Pressable>
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={Colors.text.tertiary} />
            <Text style={styles.errorText}>{error || 'Survey not found'}</Text>
            <Pressable style={styles.retryButton} onPress={loadSurvey}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const emoji = categoryEmojis[survey.subcategory || 'General'] || '📋';
  const difficulty = survey.difficulty || 'easy';
  const diffColors = difficultyColors[difficulty] || difficultyColors.easy;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.deepNavy} />
          </Pressable>
          <Text style={styles.headerTitle}>Survey Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.1)', 'rgba(139, 92, 246, 0.1)']}
              style={styles.heroGradient}
            >
              <View style={styles.emojiContainer}>
                <Text style={styles.emoji}>{emoji}</Text>
              </View>
              <Text style={styles.title}>{survey.title}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: diffColors.bg, borderColor: diffColors.border }]}>
                  <Text style={[styles.badgeText, { color: diffColors.text }]}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Ionicons name="pricetag" size={12} color={Colors.text.tertiary} />
                  <Text style={styles.categoryText}>{survey.subcategory || 'General'}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="wallet" size={24} color={Colors.gold} />
              <Text style={styles.statValue}>+{survey.reward}</Text>
              <Text style={styles.statLabel}>{BRAND.COIN_NAME}</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={24} color={Colors.info} />
              <Text style={styles.statValue}>{survey.estimatedTime} min</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="document-text-outline" size={24} color={Colors.brand.purple} />
              <Text style={styles.statValue}>{survey.questionsCount}</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Survey</Text>
            <Text style={styles.description}>{survey.description}</Text>
          </View>

          {/* Instructions */}
          {survey.instructions && survey.instructions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              {survey.instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={styles.instructionBullet}>
                    <Text style={styles.instructionNumber}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Progress Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Survey Progress</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Responses</Text>
                <Text style={styles.progressValue}>{survey.completedCount} / {survey.targetResponses}</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min((survey.completedCount / survey.targetResponses) * 100, 100)}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* User Status */}
          {survey.userStatus === 'completed' && (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.nileBlue} />
              <Text style={styles.completedText}>You have completed this survey</Text>
            </View>
          )}

          {survey.userStatus === 'in_progress' && survey.existingSession && (
            <View style={styles.resumeBanner}>
              <Ionicons name="play-circle" size={24} color={Colors.info} />
              <View>
                <Text style={styles.resumeText}>Resume your survey</Text>
                <Text style={styles.resumeSubtext}>
                  {survey.existingSession.answeredCount} of {survey.questionsCount} questions answered
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom CTA */}
        {survey.userStatus !== 'completed' && (
          <View style={styles.bottomCTA}>
            <Pressable
              style={styles.startButton}
              onPress={handleStartSurvey}
              disabled={starting}
            >
              <LinearGradient
                colors={[Colors.info, Colors.brand.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButtonGradient}
              >
                {starting ? (
                  <ActivityIndicator color={Colors.background.primary} />
                ) : (
                  <>
                    <Text style={styles.startButtonText}>
                      {survey.userStatus === 'in_progress' ? 'Continue Survey' : 'Start Survey'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color={Colors.background.primary} />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, fontSize: Typography.body.fontSize, color: Colors.text.tertiary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  errorText: { fontSize: Typography.bodyLarge.fontSize, color: Colors.text.tertiary, marginTop: Spacing.base, textAlign: 'center' },
  retryButton: { marginTop: Spacing.base, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.gold, borderRadius: BorderRadius.md },
  retryText: { color: Colors.text.inverse, fontSize: Typography.body.fontSize, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.08)' },
  backButton: { padding: Spacing.sm },
  headerTitle: { fontSize: Typography.h4.fontSize, fontWeight: '700', color: colors.deepNavy },
  content: { flex: 1 },
  heroSection: { padding: Spacing.base },
  heroGradient: { borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  emojiContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.base },
  emoji: { fontSize: 40 },
  title: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: colors.deepNavy, textAlign: 'center', marginBottom: Spacing.md },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm },
  badge: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.md, borderWidth: 1 },
  badgeText: { fontSize: Typography.bodySmall.fontSize, fontWeight: '600' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: BorderRadius.md },
  categoryText: { fontSize: Typography.bodySmall.fontSize, color: Colors.text.tertiary },
  statsGrid: { flexDirection: 'row', paddingHorizontal: Spacing.base, gap: Spacing.md, marginBottom: Spacing.base },
  statCard: { flex: 1, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.base, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.08)', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 }, android: { elevation: 2 } }) },
  statValue: { fontSize: Typography.h4.fontSize, fontWeight: '700', color: colors.deepNavy, marginTop: Spacing.sm },
  statLabel: { fontSize: Typography.caption.fontSize, color: Colors.text.tertiary, marginTop: Spacing.xs },
  section: { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: Typography.bodyLarge.fontSize, fontWeight: '700', color: colors.deepNavy, marginBottom: Spacing.md },
  description: { fontSize: Typography.body.fontSize, color: Colors.text.tertiary, lineHeight: 22 },
  instructionItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  instructionBullet: { width: 24, height: 24, borderRadius: BorderRadius.md, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  instructionNumber: { fontSize: Typography.bodySmall.fontSize, fontWeight: '600', color: Colors.info },
  instructionText: { flex: 1, fontSize: Typography.body.fontSize, color: Colors.text.tertiary, lineHeight: 20 },
  progressCard: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.base, borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.08)' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  progressLabel: { fontSize: Typography.body.fontSize, color: Colors.text.tertiary },
  progressValue: { fontSize: Typography.body.fontSize, fontWeight: '600', color: colors.deepNavy },
  progressBar: { height: 8, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 4 },
  completedBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.base, padding: Spacing.base, backgroundColor: 'rgba(255, 205, 87, 0.1)', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(255, 205, 87, 0.3)' },
  completedText: { fontSize: Typography.body.fontSize, fontWeight: '600', color: Colors.nileBlue },
  resumeBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.base, padding: Spacing.base, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  resumeText: { fontSize: Typography.body.fontSize, fontWeight: '600', color: Colors.info },
  resumeSubtext: { fontSize: Typography.bodySmall.fontSize, color: Colors.text.tertiary, marginTop: 2 },
  bottomCTA: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.background.primary, padding: Spacing.base, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: 'rgba(0, 0, 0, 0.08)' },
  startButton: { borderRadius: 14, overflow: 'hidden' },
  startButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.base, gap: Spacing.sm },
  startButtonText: { fontSize: Typography.bodyLarge.fontSize, fontWeight: '700', color: Colors.text.inverse },
});

export default withErrorBoundary(SurveyDetailPage, 'SurveyIdIndex');
