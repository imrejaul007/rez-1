// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Badges/Achievements Screen - Converted from V2 Web
 * Exact match to Rez_v-2-main/src/pages/earn/Achievements.jsx
 * Now integrated with achievementApi for real data
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenSkeleton from '@/components/common/ScreenSkeleton';
import ScreenError from '@/components/common/ScreenError';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { achievementApi, Achievement as ApiAchievement } from '@/services/achievementApi';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;

const COLORS = {
  white: Colors.background.primary,
  navy: Colors.nileBlue,
  gray100: Colors.gray[100],
  gray200: Colors.border.medium,
  gray400: Colors.text.tertiary,
  gray500: Colors.text.secondary,
  gray600: Colors.gray[600],
  green500: Colors.success,
  amber400: colors.warningScale[400],
  amber500: colors.warningScale[400],
  purple500: colors.brand.purpleLight,
  purple600: colors.brand.purple,
  pink500: colors.brand.pink,
  blue500: colors.infoScale[400],
  cyan500: colors.brand.cyan,
  teal500: colors.tealGreen,
  emerald500: colors.successScale[400],
};

interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  coins: number;
  category: string;
  tier: string;
  progress?: number;
}

// Tier color mapping
const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: colors.brand.goldBright,
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

const BadgesScreen: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [activeCategory, setActiveCategory] = useState('All');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState({
    unlocked: 0,
    total: 0,
    totalCoins: 0,
    completionPercent: 0,
  });
  const fetchingRef = React.useRef(false); // Prevent duplicate API calls
  const PAGE_LIMIT = 20;

  // Fetch achievements from API
  const fetchAchievements = useCallback(async (isRefresh = false) => {
    // Prevent duplicate concurrent API calls
    if (fetchingRef.current && !isRefresh) return;
    fetchingRef.current = true;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // First recalculate achievements to get latest progress
      try {
        await achievementApi.recalculateAchievements();
      } catch (recalcError) {
        // Continue anyway - will just show potentially stale progress
      }

      const response = await achievementApi.getAchievementProgress();

      if (response.success && response.data) {
        // All display data (icon, category, reward, tier) now comes from the API
        const mapped: Achievement[] = response.data.achievements
          .filter((a: ApiAchievement) => {
            // Filter out secret achievements; show hidden_until_progress only if there's progress
            if (a.visibility === 'secret') return false;
            if (a.visibility === 'hidden_until_progress' && a.progress === 0) return false;
            return true;
          })
          .map((a: ApiAchievement) => ({
            id: a.id,
            title: a.title,
            desc: a.description,
            icon: a.icon || '🏆',
            unlocked: a.unlocked,
            coins: a.reward?.coins || 0,
            category: a.category || 'General',
            tier: a.tier || 'bronze',
            progress: a.unlocked ? 100 : a.progress,
          }));

        if (!isMounted()) return;
        setAllAchievements(mapped);
        // Show first page
        setAchievements(mapped.slice(0, PAGE_LIMIT));
        setPage(1);
        setHasMore(mapped.length > PAGE_LIMIT);
        if (!isMounted()) return;
        setStats({
          unlocked: response.data.summary.unlocked,
          total: response.data.summary.total,
          totalCoins: response.data.summary.totalCoinsEarned ?? mapped.filter(a => a.unlocked).reduce((sum, a) => sum + a.coins, 0),
          completionPercent: Math.round(response.data.summary.completionPercentage),
        });
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to load achievements');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchAchievements();
  }, [fetchAchievements, authLoading, isAuthenticated]);

  const onRefresh = useCallback(() => {
    fetchAchievements(true);
  }, [fetchAchievements]);

  // Derive categories dynamically from API data
  const categories = useMemo(() => ['All', ...Array.from(new Set(achievements.map(a => a.category))).sort()], [achievements]);

  const loadMoreAchievements = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const startIdx = (nextPage - 1) * PAGE_LIMIT;
    const nextSlice = allAchievements.slice(startIdx, startIdx + PAGE_LIMIT);
    setAchievements(prev => [...prev, ...nextSlice]);
    setPage(nextPage);
    setHasMore(startIdx + PAGE_LIMIT < allAchievements.length);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, allAchievements]);

  const filteredAchievements = useMemo(() => activeCategory === 'All'
    ? achievements
    : achievements.filter(a => a.category === activeCategory), [achievements, activeCategory]);

  const keyExtractor = useCallback((item: Achievement) => item.id, []);

  const renderAchievementItem = useCallback(({ item: achievement }: { item: Achievement }) => (
    <View
      style={[
        styles.achievementCard,
        achievement.unlocked && styles.achievementCardUnlocked
      ]}
    >
      {!achievement.unlocked && (
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={14} color={COLORS.gray400} />
        </View>
      )}

      <View style={styles.achievementHeader}>
        <Text style={styles.achievementIcon}>{achievement.icon}</Text>
        <View style={styles.badgeRow}>
          {achievement.tier && achievement.tier !== 'bronze' && (
            <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[achievement.tier] || TIER_COLORS.bronze }]}>
              <Text style={styles.tierBadgeText}>{achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1)}</Text>
            </View>
          )}
          {achievement.unlocked && <Text style={styles.checkIcon}>&#x2705;</Text>}
        </View>
      </View>

      <Text style={styles.achievementTitle}>{achievement.title}</Text>
      <Text style={styles.achievementDesc}>{achievement.desc}</Text>
      <Text style={styles.achievementCoins}>+{achievement.coins} coins</Text>

      {!achievement.unlocked && achievement.progress !== undefined && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[COLORS.emerald500, COLORS.teal500]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${achievement.progress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{achievement.progress}% complete</Text>
        </View>
      )}
    </View>
  ), []);

  const listHeader = useCallback(() => (
    <>
      {/* Stats */}
      <View style={styles.statsRow}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.2)']}
          style={styles.statCard}
        >
          <Text style={styles.statValue}>{stats.unlocked}/{stats.total}</Text>
          <Text style={styles.statLabel}>Unlocked</Text>
        </LinearGradient>
        <LinearGradient
          colors={['rgba(245, 158, 11, 0.2)', 'rgba(234, 179, 8, 0.2)']}
          style={styles.statCard}
        >
          <Text style={[styles.statValue, { color: COLORS.amber400 }]}>{stats.totalCoins}</Text>
          <Text style={styles.statLabel}>Coins Earned</Text>
        </LinearGradient>
        <LinearGradient
          colors={['rgba(34, 197, 94, 0.2)', 'rgba(16, 185, 129, 0.2)']}
          style={styles.statCard}
        >
          <Text style={[styles.statValue, { color: COLORS.green500 }]}>{stats.completionPercent}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </LinearGradient>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map(cat => (
          <Pressable
            key={cat}
            style={[
              styles.categoryButton,
              activeCategory === cat && styles.categoryButtonActive
            ]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[
              styles.categoryText,
              activeCategory === cat && styles.categoryTextActive
            ]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  ), [stats, categories, activeCategory]);

  const listEmpty = useCallback(() => (
    achievements.length === 0 && !loading ? (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>&#x1F3C5;</Text>
        <Text style={styles.emptyTitle}>No Achievements Yet</Text>
        <Text style={styles.emptyText}>Start shopping and engaging to unlock your first badge!</Text>
      </View>
    ) : null
  ), [achievements.length, loading]);

  const listFooter = useCallback(() => (
    <>
    {loadingMore && (
      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={COLORS.purple500} />
      </View>
    )}
    <View style={styles.ctasSection}>
      <Text style={styles.ctasTitle}>Quick Actions to Unlock More</Text>

      {/* Shopping CTA */}
      <Pressable
        style={styles.ctaCard}
        onPress={() => router.push('/mall')}
      >
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.2)']}
          style={styles.ctaGradient}
        >
          <View style={[styles.ctaIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
            <Ionicons name="bag-handle" size={20} color={COLORS.purple600} />
          </View>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Shop & Unlock Deals</Text>
            <Text style={styles.ctaSubtitle}>Complete shopping achievements</Text>
          </View>
          <Ionicons name="trending-up" size={20} color={COLORS.purple600} />
        </LinearGradient>
      </Pressable>

      {/* Referral CTA */}
      <Pressable
        style={styles.ctaCard}
        onPress={() => router.push('/referral')}
      >
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.2)', 'rgba(6, 182, 212, 0.2)']}
          style={styles.ctaGradient}
        >
          <View style={[styles.ctaIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
            <Ionicons name="people" size={20} color={COLORS.blue500} />
          </View>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Refer Friends</Text>
            <Text style={styles.ctaSubtitle}>Unlock social achievements & earn</Text>
          </View>
          <Ionicons name="trending-up" size={20} color={COLORS.blue500} />
        </LinearGradient>
      </Pressable>

      {/* Games CTA */}
      <Pressable
        style={styles.ctaCard}
        onPress={() => router.push('/games')}
      >
        <LinearGradient
          colors={['rgba(34, 197, 94, 0.2)', 'rgba(16, 185, 129, 0.2)']}
          style={styles.ctaGradient}
        >
          <View style={[styles.ctaIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
            <Ionicons name="game-controller" size={20} color={COLORS.green500} />
          </View>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Play Games</Text>
            <Text style={styles.ctaSubtitle}>Complete gaming challenges</Text>
          </View>
          <Ionicons name="trending-up" size={20} color={COLORS.green500} />
        </LinearGradient>
      </Pressable>

      {/* Daily Check-in CTA */}
      <Pressable
        style={styles.ctaCard}
        onPress={() => router.push('/explore/daily-checkin')}
      >
        <LinearGradient
          colors={['rgba(245, 158, 11, 0.2)', 'rgba(234, 179, 8, 0.2)']}
          style={styles.ctaGradient}
        >
          <View style={[styles.ctaIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
            <Ionicons name="ribbon" size={20} color={COLORS.amber500} />
          </View>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Daily Check-in</Text>
            <Text style={styles.ctaSubtitle}>Build streaks & unlock rewards</Text>
          </View>
          <LinearGradient
            colors={[COLORS.amber500, colors.brand.amber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.checkInButton}
          >
            <Text style={styles.checkInText}>Check In</Text>
          </LinearGradient>
        </LinearGradient>
      </Pressable>
    </View>
    </>
  ), [router, loadingMore]);

  // Loading state
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenSkeleton variant="grid" />
      </>
    );
  }

  // Error state
  if (error && achievements.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenError
          error={error}
          onRetry={() => fetchAchievements()}
          title="Unable to load achievements"
          onSecondaryAction={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Achievements</Text>
          <Text style={styles.headerSubtitle}>Unlock badges & earn coins</Text>
        </View>
      </View>

      <FlashList
        data={filteredAchievements}
        keyExtractor={keyExtractor}
        renderItem={renderAchievementItem}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={150}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{ paddingBottom: 120 }}
        onEndReached={loadMoreAchievements}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.purple500]}
            tintColor={COLORS.purple500}
          />
        }
      />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: 100,
  },
  errorTitle: {
    ...Typography.h4,
    color: COLORS.navy,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: COLORS.gray500,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  retryButtonText: {
    ...Typography.label,
    color: COLORS.white,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.h4,
    color: COLORS.navy,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: COLORS.gray500,
    textAlign: 'center',
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
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: COLORS.gray500,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  statCard: {
    flex: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h3,
    color: COLORS.navy,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    color: COLORS.gray500,
  },
  categoriesContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  categoryButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: COLORS.gray100,
    marginRight: Spacing.sm,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.green500,
  },
  categoryText: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray600,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  achievementsRow: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  achievementCard: {
    width: CARD_WIDTH,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    position: 'relative',
  },
  achievementCardUnlocked: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  lockIcon: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  achievementIcon: {
    fontSize: 36,
  },
  checkIcon: {
    ...Typography.h4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  tierBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  achievementTitle: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.xs,
  },
  achievementDesc: {
    ...Typography.caption,
    color: COLORS.gray500,
    marginBottom: Spacing.sm,
  },
  achievementCoins: {
    ...Typography.labelSmall,
    color: COLORS.amber400,
  },
  progressContainer: {
    marginTop: Spacing.md,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    ...Typography.overline,
    fontWeight: '400',
    letterSpacing: 0,
    textTransform: 'none',
    color: COLORS.gray500,
    marginTop: Spacing.xs,
  },
  ctasSection: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
  },
  ctasTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.base,
  },
  ctaCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  ctaIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    ...Typography.label,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 2,
  },
  ctaSubtitle: {
    ...Typography.bodySmall,
    color: COLORS.gray500,
  },
  checkInButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  checkInText: {
    ...Typography.labelSmall,
    color: COLORS.white,
  },
});

export default withErrorBoundary(BadgesScreen, 'Badges');
