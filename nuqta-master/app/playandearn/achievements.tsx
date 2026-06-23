import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import streakApi from '../../services/streakApi';
import achievementApi from '../../services/achievementApi';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

const { width } = Dimensions.get('window');

interface Achievement {
  id: number;
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  coins: number;
  category: string;
  progress?: number;
}

const PAGE_LIMIT = 20;

const Achievements = () => {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState('All');
  const isMounted = useIsMounted();

  const getCategoryFromType = (type: string): string => {
    const upper = type.toUpperCase();
    if (/ORDER|SPENT|FREQUENT|BIG|VOUCHER|OFFER|CASHBACK|EXPLORER/.test(upper)) return 'Shopping';
    if (/REVIEW|VIDEO|REFERRAL|SOCIAL/.test(upper)) return 'Social';
    if (/STREAK|EARLY|ONE_YEAR|ACTIVITY/.test(upper)) return 'Engagement';
    if (/GAME|SUPER/.test(upper)) return 'Gaming';
    return 'General';
  };

  const fetchAchievements = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      // Fetch achievements from API
      const response = await achievementApi.getAchievementProgress();
      const apiAchievements = response.data?.achievements || [];

      // Map API achievements to local interface
      const mapped: Achievement[] = apiAchievements.map((a: any, index: number) => {
        const category = getCategoryFromType(a.type);
        const coins = a.targetValue ? a.targetValue * 10 : 100;
        return {
          id: index + 1,
          title: a.title,
          desc: a.description,
          icon: a.icon || '🏆',
          unlocked: a.unlocked,
          coins,
          category,
          progress: a.unlocked ? undefined : a.progress,
        };
      });

      // Fetch streak data to enhance streak-related achievements
      try {
        const streakResponse = await streakApi.getStreakStatus('login');
        if (streakResponse.data) {
          const currentStreak = streakResponse.data.current;
          mapped.forEach((a, i) => {
            const apiType = apiAchievements[i]?.type?.toUpperCase() || '';
            if (/STREAK/.test(apiType)) {
              const target = apiAchievements[i]?.targetValue || 7;
              a.unlocked = currentStreak >= target;
              a.progress = a.unlocked ? undefined : Math.round((currentStreak / target) * 100);
            }
          });
        }
      } catch (streakErr) {
        // Non-critical: achievements still display without streak enhancement
      }

      if (!isMounted()) return;

      // Apply client-side pagination
      const startIdx = (pageNum - 1) * PAGE_LIMIT;
      const paginated = mapped.slice(startIdx, startIdx + PAGE_LIMIT);
      const moreAvailable = startIdx + PAGE_LIMIT < mapped.length;

      if (append) {
        setAchievements(prev => [...prev, ...paginated]);
      } else {
        setAchievements(paginated);
      }
      setHasMore(moreAvailable);
      setPage(pageNum);

      // Extract unique categories from full set and prepend 'All'
      const uniqueCategories = [...new Set(mapped.map(a => a.category))];
      if (!isMounted()) return;
      setCategories(['All', ...uniqueCategories]);
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load achievements. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchAchievements(1);
  }, [authLoading, isAuthenticated]);

  const filteredAchievements = activeCategory === 'All'
    ? achievements
    : achievements.filter(a => a.category === activeCategory);

  const totalUnlocked = achievements.filter(a => a.unlocked).length;
  const totalCoins = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.coins, 0);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchAchievements(page + 1, true);
  }, [loadingMore, hasMore, page, fetchAchievements]);

  const renderAchievement = useCallback(({ item: achievement }: { item: Achievement }) => (
    <View
      style={[
        styles.achievementCard,
        achievement.unlocked && styles.achievementUnlocked
      ]}
    >
      {!achievement.unlocked && (
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={16} color={Colors.text.tertiary} />
        </View>
      )}

      <View style={styles.achievementHeader}>
        <Text style={styles.achievementIcon}>{achievement.icon}</Text>
        {achievement.unlocked && <Text style={styles.checkmark}>✅</Text>}
      </View>

      <Text style={styles.achievementTitle}>{achievement.title}</Text>
      <Text style={styles.achievementDesc}>{achievement.desc}</Text>
      <Text style={styles.achievementCoins}>+{achievement.coins} coins</Text>

      {!achievement.unlocked && achievement.progress !== undefined && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${achievement.progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{achievement.progress}% complete</Text>
        </View>
      )}
    </View>
  ), []);

  const listHeader = useCallback(() => (
    <>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={['#A855F720', '#EC489920']}
          style={styles.statCard}
        >
          <Text style={styles.statValue}>{totalUnlocked}/{achievements.length}</Text>
          <Text style={styles.statLabel}>Unlocked</Text>
        </LinearGradient>
        <LinearGradient
          colors={['#F59E0B20', '#EAB30820']}
          style={styles.statCard}
        >
          <Text style={[styles.statValue, { color: Colors.warning }]}>{totalCoins}</Text>
          <Text style={styles.statLabel}>Coins Earned</Text>
        </LinearGradient>
        <LinearGradient
          colors={['#ffcd5720', '#ffcd5720']}
          style={styles.statCard}
        >
          <Text style={[styles.statValue, { color: Colors.gold }]}>{achievements.length > 0 ? Math.round((totalUnlocked/achievements.length)*100) : 0}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </LinearGradient>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map(cat => (
          <Pressable
            key={cat}
            onPress={() => setActiveCategory(cat)}
            style={[
              styles.categoryButton,
              activeCategory === cat && styles.categoryButtonActive
            ]}
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

      {/* Error State */}
      {error && achievements.length === 0 && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.text.tertiary} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchAchievements(1)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}
    </>
  ), [totalUnlocked, totalCoins, achievements.length, categories, activeCategory, error]);

  const listFooter = useCallback(() => (
    <>
      {loadingMore && (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={Colors.gold} />
        </View>
      )}

      {/* CTAs Section */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Quick Actions to Unlock More</Text>

        <Pressable
          style={styles.ctaCard}
          onPress={() => router.push('/mall' as any)}
        >
          <LinearGradient
            colors={['#A855F720', '#EC489920']}
            style={styles.ctaGradient}
          >
            <View style={[styles.ctaIconContainer, { backgroundColor: '#A855F730' }]}>
              <Ionicons name="bag" size={20} color={colors.brand.purpleMedium} />
            </View>
            <View style={styles.ctaContent}>
              <Text style={styles.ctaCardTitle}>Shop & Unlock Deals</Text>
              <Text style={styles.ctaCardDesc}>Complete shopping achievements</Text>
            </View>
            <Ionicons name="trending-up" size={20} color={colors.brand.purpleMedium} />
          </LinearGradient>
        </Pressable>

        <Pressable
          style={styles.ctaCard}
          onPress={() => router.push('/refer' as any)}
        >
          <LinearGradient
            colors={['#3B82F620', '#06B6D420']}
            style={styles.ctaGradient}
          >
            <View style={[styles.ctaIconContainer, { backgroundColor: '#3B82F630' }]}>
              <Ionicons name="people" size={20} color={colors.infoScale[400]} />
            </View>
            <View style={styles.ctaContent}>
              <Text style={styles.ctaCardTitle}>Refer Friends</Text>
              <Text style={styles.ctaCardDesc}>Unlock social achievements & earn</Text>
            </View>
            <Ionicons name="trending-up" size={20} color={colors.infoScale[400]} />
          </LinearGradient>
        </Pressable>

        <Pressable
          style={styles.ctaCard}
          onPress={() => router.push('/games' as any)}
        >
          <LinearGradient
            colors={['#ffcd5720', '#ffcd5720']}
            style={styles.ctaGradient}
          >
            <View style={[styles.ctaIconContainer, { backgroundColor: Colors.gold + '30' }]}>
              <Ionicons name="game-controller" size={20} color={Colors.gold} />
            </View>
            <View style={styles.ctaContent}>
              <Text style={styles.ctaCardTitle}>Play Games</Text>
              <Text style={styles.ctaCardDesc}>Complete gaming challenges</Text>
            </View>
            <Ionicons name="trending-up" size={20} color={Colors.gold} />
          </LinearGradient>
        </Pressable>

        <View style={styles.checkinCard}>
          <LinearGradient
            colors={['#F59E0B20', '#EAB30820']}
            style={styles.ctaGradient}
          >
            <View style={[styles.ctaIconContainer, { backgroundColor: Colors.warning + '30' }]}>
              <Ionicons name="ribbon" size={20} color={Colors.warning} />
            </View>
            <View style={styles.ctaContent}>
              <Text style={styles.ctaCardTitle}>Daily Check-in</Text>
              <Text style={styles.ctaCardDesc}>Build streaks & unlock rewards</Text>
            </View>
            <Pressable style={styles.checkinButton}>
              <LinearGradient
                colors={[colors.warningScale[400], colors.brand.amber]}
                style={styles.checkinButtonGradient}
              >
                <Text style={styles.checkinButtonText}>Check In</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </>
  ), [loadingMore, router]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>🏅 Achievements</Text>
          <Text style={styles.headerSubtitle}>Unlock badges & earn coins</Text>
        </View>
      </View>

      <FlatList
        data={filteredAchievements}
        renderItem={renderAchievement}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.achievementsGrid}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.text.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: 48,
    paddingBottom: Spacing.base,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  statCard: {
    flex: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
  statLabel: {
    ...Typography.overline,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.base,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  categoryButtonActive: {
    backgroundColor: Colors.gold,
  },
  categoryText: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  categoryTextActive: {
    color: Colors.text.inverse,
  },
  achievementsGrid: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
  },
  achievementCard: {
    width: (width - 44) / 2,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  achievementUnlocked: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.3)',
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
  checkmark: {
    fontSize: 18,
  },
  achievementTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  achievementDesc: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  achievementCoins: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.warning,
  },
  progressContainer: {
    marginTop: Spacing.md,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  progressText: {
    ...Typography.overline,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  ctaSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xl,
  },
  ctaTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.inverse,
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
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ctaIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaContent: {
    flex: 1,
  },
  ctaCardTitle: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    marginBottom: 2,
  },
  ctaCardDesc: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  checkinCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  checkinButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  checkinButtonGradient: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  checkinButtonText: {
    ...Typography.bodySmall,
    fontWeight: 'bold',
    color: Colors.text.inverse,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.gold,
  },
  retryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default withErrorBoundary(Achievements, 'PlayandearnAchievements');
