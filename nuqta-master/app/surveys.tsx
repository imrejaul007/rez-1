import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, Stack } from 'expo-router';
import surveyApiService, { Survey, SurveyCategory, UserSurveyStats } from '@/services/surveysApi';

import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
// Category emoji mapping
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
  'Education': '📚',
  'Sports': '⚽',
  'General': '📋',
};

// Category colors
const categoryColors: Record<string, { bg: string; border: string }> = {
  'Shopping': { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)' },
  'Food': { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' },
  'Fashion': { bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.3)' },
  'Finance': { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
  'Health': { bg: 'rgba(255, 205, 87, 0.1)', border: 'rgba(255, 205, 87, 0.3)' },
  'Technology': { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)' },
  'Travel': { bg: 'rgba(14, 165, 233, 0.1)', border: 'rgba(14, 165, 233, 0.3)' },
  'Entertainment': { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)' },
  'Lifestyle': { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)' },
  'General': { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)' },
};

const difficultyColors = {
  easy: { bg: 'rgba(255, 205, 87, 0.1)', text: colors.nileBlue, border: 'rgba(255, 205, 87, 0.3)' },
  medium: { bg: 'rgba(249, 115, 22, 0.1)', text: colors.brand.orangeDark, border: 'rgba(249, 115, 22, 0.3)' },
  hard: { bg: 'rgba(239, 68, 68, 0.1)', text: colors.error, border: 'rgba(239, 68, 68, 0.3)' },
};

function SurveysPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [activeCategory, setActiveCategory] = useState('All');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [categories, setCategories] = useState<SurveyCategory[]>([]);
  const [userStats, setUserStats] = useState<UserSurveyStats>({
    totalEarned: 0,
    surveysCompleted: 0,
    averageTime: 0,
    completionRate: 100,
    streak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_LIMIT = 20;

  // Load all data
  const loadData = useCallback(async (showLoading = true, pageNum = 1) => {
    if (showLoading && pageNum === 1) setLoading(true);
    if (pageNum > 1) setLoadingMore(true);
    try {
      const offset = (pageNum - 1) * PAGE_LIMIT;
      const surveysData = await surveyApiService.getSurveys(
        activeCategory !== 'All' ? activeCategory : undefined,
        PAGE_LIMIT,
        offset
      );
      if (!isMounted()) return;
      if (pageNum === 1) {
        setSurveys(surveysData);
        // Only fetch categories and stats on first page
        const [categoriesData, statsData] = await Promise.all([
          surveyApiService.getCategories(),
          surveyApiService.getUserStats(),
        ]);
        if (!isMounted()) return;
        setCategories(categoriesData);
        if (!isMounted()) return;
        setUserStats(statsData);
      } else {
        setSurveys(prev => [...prev, ...surveysData]);
      }
      setPage(pageNum);
      setHasMore(surveysData.length >= PAGE_LIMIT);
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeCategory]);
  const isMounted = useIsMounted();

  // Initial load + reload when category changes
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadData(true, 1);
  }, [authLoading, isAuthenticated, activeCategory]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setPage(1);
    setHasMore(true);
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    loadData(false, page + 1);
  }, [loadingMore, hasMore, page, loadData]);

  // Navigate to survey detail
  const handleStartSurvey = (surveyId: string) => {
    router.push(`/survey/${surveyId}`);
  };

  // Get category display info
  const getCategoryInfo = (subcategory?: string) => {
    const cat = subcategory || 'General';
    return {
      emoji: categoryEmojis[cat] || '📋',
      colors: categoryColors[cat] || categoryColors['General'],
    };
  };

  // Format time display
  const formatTime = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    return `${minutes} mins`;
  };

  // Format average time for stats
  const formatAvgTime = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 1) return '< 1 min';
    return `${minutes} min`;
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <CardGridSkeleton />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.secondary} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Surveys</Text>
            <Text style={styles.headerSubtitle}>Share opinions, earn rewards</Text>
          </View>
          <View style={styles.coinBadge}>
            <Ionicons name="wallet" size={14} color={Colors.gold} />
            <Text style={styles.coinBadgeText}>{userStats.totalEarned}</Text>
          </View>
        </View>

        <FlatList
          data={surveys}
          keyExtractor={(item) => item._id}
          renderItem={({ item: survey }) => {
            const catInfo = getCategoryInfo(survey.subcategory);
            const difficulty = survey.difficulty || 'easy';
            const diffColors = difficultyColors[difficulty] || difficultyColors.easy;
            const completionPercent = survey.targetResponses > 0
              ? Math.round((survey.completedCount / survey.targetResponses) * 100)
              : 0;

            return (
              <Pressable
                style={styles.surveyCard}
                onPress={() => handleStartSurvey(survey._id)}
              >
                {/* Header */}
                <View style={styles.surveyHeader}>
                  <View
                    style={[
                      styles.surveyIcon,
                      { backgroundColor: catInfo.colors.bg, borderColor: catInfo.colors.border },
                    ]}
                  >
                    <Text style={styles.surveyEmoji}>{catInfo.emoji}</Text>
                  </View>
                  <View style={styles.surveyHeaderContent}>
                    <View style={styles.surveyBadges}>
                      <View
                        style={[
                          styles.difficultyBadge,
                          {
                            backgroundColor: diffColors.bg,
                            borderColor: diffColors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.difficultyText,
                            { color: diffColors.text },
                          ]}
                        >
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </Text>
                      </View>
                      {survey.isFeatured && (
                        <View style={styles.trendingBadge}>
                          <Ionicons name="sparkles" size={10} color={colors.brand.orange} />
                          <Text style={styles.trendingText}>Featured</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.surveyTitle}>{survey.title}</Text>
                    <View style={styles.sponsorRow}>
                      <Ionicons name="pricetag" size={12} color={Colors.text.tertiary} />
                      <Text style={styles.sponsorText}>{survey.subcategory || 'General'}</Text>
                    </View>
                  </View>
                </View>

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
                    <Text style={styles.detailText}>{formatTime(survey.estimatedTime)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="document-text-outline" size={14} color={Colors.text.tertiary} />
                    <Text style={styles.detailText}>{survey.questionsCount} questions</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="people-outline" size={14} color={Colors.text.tertiary} />
                    <Text style={styles.detailText}>{survey.completedCount.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Completion Rate */}
                <View style={styles.completionSection}>
                  <View style={styles.completionHeader}>
                    <Text style={styles.completionLabel}>Responses</Text>
                    <Text style={styles.completionValue}>
                      {survey.completedCount}/{survey.targetResponses}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(completionPercent, 100)}%` },
                      ]}
                    />
                  </View>
                </View>

                {/* Reward & CTA */}
                <View style={styles.surveyFooter}>
                  <View style={styles.rewardSection}>
                    <Ionicons name="wallet" size={20} color={Colors.gold} />
                    <View>
                      <Text style={styles.rewardValue}>+{survey.reward}</Text>
                      <Text style={styles.rewardLabel}>{BRAND.COIN_NAME}</Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.startButton}
                    onPress={() => handleStartSurvey(survey._id)}
                  >
                    <LinearGradient
                      colors={[colors.infoScale[400], colors.brand.purpleLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.startButtonGradient}
                    >
                      <Text style={styles.startButtonText}>Start Now</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.background.primary} />
                    </LinearGradient>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: Spacing.base }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <>
              {/* Hero Stats */}
              <View style={styles.heroSection}>
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.08)', 'rgba(139, 92, 246, 0.08)', 'rgba(236, 72, 153, 0.08)']}
                  style={styles.heroGradient}
                >
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 205, 87, 0.15)' }]}>
                        <Ionicons name="wallet" size={18} color={Colors.gold} />
                      </View>
                      <Text style={styles.statValue}>{userStats.totalEarned}</Text>
                      <Text style={styles.statLabel}>Earned</Text>
                    </View>
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.infoScale[400]} />
                      </View>
                      <Text style={styles.statValue}>{userStats.surveysCompleted}</Text>
                      <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
                        <Ionicons name="time" size={18} color={colors.brand.orange} />
                      </View>
                      <Text style={styles.statValue}>{formatAvgTime(userStats.averageTime)}</Text>
                      <Text style={styles.statLabel}>Avg Time</Text>
                    </View>
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                        <Ionicons name="trending-up" size={18} color={colors.brand.pink} />
                      </View>
                      <Text style={styles.statValue}>{userStats.completionRate}%</Text>
                      <Text style={styles.statLabel}>Success</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Category Filters */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryContainer}
              >
                {categories.map((cat) => (
                  <Pressable
                    key={cat.name}
                    style={[
                      styles.categoryButton,
                      activeCategory === cat.name && styles.categoryButtonActive,
                    ]}
                    onPress={() => handleCategoryChange(cat.name)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        activeCategory === cat.name && styles.categoryTextActive,
                      ]}
                    >
                      {cat.name} ({cat.count})
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Info Banner */}
              <View style={styles.infoBanner}>
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
                  style={styles.infoBannerGradient}
                >
                  <Ionicons name="document-text" size={32} color={colors.brand.purpleLight} />
                  <View style={styles.infoBannerText}>
                    <Text style={styles.infoBannerTitle}>Earn While You Share</Text>
                    <Text style={styles.infoBannerDesc}>
                      Your opinions help brands improve. Get rewarded for every completed survey!
                    </Text>
                  </View>
                </LinearGradient>
              </View>

            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyStateText}>No surveys available</Text>
              <Text style={styles.emptyStateSubtext}>Check back later for new surveys</Text>
            </View>
          }
          ListFooterComponent={
            <>
              {loadingMore && (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={Colors.gold} />
                </View>
              )}

              {/* Bottom CTA */}
              <View style={styles.bottomCTA}>
                <LinearGradient
                  colors={['rgba(255, 205, 87, 0.08)', 'rgba(59, 130, 246, 0.08)']}
                  style={styles.bottomCTAGradient}
                >
                  <View style={styles.bottomCTAIcon}>
                    <Ionicons name="bar-chart" size={28} color={colors.background.primary} />
                  </View>
                  <Text style={styles.bottomCTATitle}>New Surveys Daily</Text>
                  <Text style={styles.bottomCTADesc}>
                    Check back often for fresh surveys from top brands
                  </Text>
                  <View style={styles.bottomCTAFeatures}>
                    <View style={styles.featureItem}>
                      <Ionicons name="trophy" size={14} color={Colors.text.tertiary} />
                      <Text style={styles.featureText}>High Rewards</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="time" size={14} color={Colors.text.tertiary} />
                      <Text style={styles.featureText}>Quick Surveys</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.text.tertiary} />
                      <Text style={styles.featureText}>Easy Tasks</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <View style={{ height: 40 }} />
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.gold]}
              tintColor={Colors.gold}
            />
          }
        />
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
    fontSize: 14,
    color: Colors.text.tertiary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  coinBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gold,
  },
  heroSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  heroGradient: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 16,
    gap: Spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: colors.infoScale[400],
    borderColor: colors.infoScale[400],
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  categoryTextActive: {
    color: Colors.text.inverse,
  },
  infoBanner: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  infoBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    gap: Spacing.md,
  },
  infoBannerText: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  infoBannerDesc: {
    fontSize: 12,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  surveysContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  surveyCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  surveyHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  surveyIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  surveyEmoji: {
    fontSize: 26,
  },
  surveyHeaderContent: {
    flex: 1,
  },
  surveyBadges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  difficultyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  trendingText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.brand.orange,
  },
  surveyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sponsorText: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  completionSection: {
    marginBottom: Spacing.md,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  completionLabel: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  completionValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gold,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  surveyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rewardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gold,
  },
  rewardLabel: {
    fontSize: 10,
    color: Colors.text.tertiary,
  },
  startButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: Spacing.xs,
  },
  startButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  bottomCTA: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
  },
  bottomCTAGradient: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  bottomCTAIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  bottomCTATitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  bottomCTADesc: {
    fontSize: 13,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  bottomCTAFeatures: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  featureText: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(SurveysPage, 'Surveys');
