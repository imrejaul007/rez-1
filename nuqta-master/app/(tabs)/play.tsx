// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { Suspense } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring } from 'react-native-reanimated';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { usePlayPageData } from '@/hooks/usePlayPageData';
import { UGCVideoItem, CategoryTab, PLAY_PAGE_COLORS } from '@/types/playPage.types';
import { Article } from '@/types/article.types';
import { useVideoPreload } from '@/services/videoPreloadService';
import { useIsAuthenticated } from '@/stores';
import LoadingState from '@/components/common/LoadingState';
import ErrorState from '@/components/common/ErrorState';
import articlesService from '@/services/articlesApi';

// CategoryHeader stays eager — used in error/loading states before content renders
import CategoryHeader from '@/components/playPage/CategoryHeader';

// Lazy-loaded content sections (play tab is never the initial screen)
// Note: Using direct imports in test environments where React.lazy dynamic
// import() requires --experimental-vm-modules
const _useLazySections = typeof jest === 'undefined';
const MerchantVideoSection = _useLazySections
  ? React.lazy(() => import('@/components/playPage/MerchantVideoSection'))
  : require('@/components/playPage/MerchantVideoSection').default;
const ArticleSection = _useLazySections
  ? React.lazy(() => import('@/components/playPage/ArticleSection'))
  : require('@/components/playPage/ArticleSection').default;
const UGCVideoSection = _useLazySections
  ? React.lazy(() => import('@/components/playPage/UGCVideoSection'))
  : require('@/components/playPage/UGCVideoSection').default;
import logger from '@/utils/logger';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function PlayScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { state, actions } = usePlayPageData();
  const { preloadVideos, isPreloaded } = useVideoPreload();
  const isAuthenticated = useIsAuthenticated();

  // Defensive defaults — real hook always populates these, but tests
  // (and any future mocked data sources) may omit them.
  const merchantVideos = state.merchantVideos ?? [];
  const ugcVideos =
    (state.ugcVideos && state.ugcVideos.length > 0)
      ? state.ugcVideos
      : (state.allVideos ?? []).filter(v => v.contentType === 'ugc');
  const effectiveAllVideos = state.allVideos ?? [];

  // Separate state for articles
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = React.useState(false);
  const [articlesError, setArticlesError] = React.useState<string>();

  // FAB animation
  const fabScale = useSharedValue(0);
  const [showFAB, setShowFAB] = React.useState(true);
  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  // Fetch articles
  const fetchArticles = React.useCallback(async () => {
    try {
      setArticlesLoading(true);
      setArticlesError(undefined);

      logger.debug('📰 [PlayPage] Fetching articles...');

      const response = await articlesService.getArticles({
        page: 1,
        limit: 6,
        sortBy: 'newest',
        isPublished: true
      });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setArticles(response.data.articles);
        logger.debug(`✅ [PlayPage] Loaded ${response.data.articles.length} articles`);
      } else {
        throw new Error(response.message || 'Failed to fetch articles');
      }
    } catch (error) {
      logger.error('❌ [PlayPage] Failed to fetch articles:', error instanceof Error ? error : undefined);
      if (!isMounted()) return;
      setArticlesError('Failed to load articles');
    } finally {
      if (!isMounted()) return;
      setArticlesLoading(false);
    }
  }, []);

  // Animate FAB entrance on mount & fetch articles
  React.useEffect(() => {
    fabScale.value = withSpring(1, { damping: 12, stiffness: 40 });

    // Fetch articles on mount
    fetchArticles();
  }, [fetchArticles]);

  const handleRefresh = React.useCallback(async () => {
    try {
      // Refresh both videos and articles — use allSettled so one failure doesn't block the other
      await Promise.allSettled([
        actions.refreshVideos(),
        fetchArticles()
      ]);

      if (state.allVideos.length > 0) {
        await preloadVideos(state.allVideos.slice(0, 5), 0);
      }
    } catch (error) {
      logger.error('Failed to refresh play data:', error instanceof Error ? error : undefined);
    }
  }, [actions, fetchArticles, preloadVideos, state.allVideos]);

  const handleVideoPress = React.useCallback((video: UGCVideoItem) => {
    actions.navigateToDetail(video);
  }, [actions]);

  const handleCategoryPress = React.useCallback((category: CategoryTab) => {
    actions.setActiveCategory(category.type);
  }, [actions]);

  const handleLikeVideo = React.useCallback(async (videoId: string) => {
    const success = await actions.likeVideo(videoId);
    if (!success) {
      platformAlertSimple('Error', 'Failed to like video. Please try again.');
    }
  }, [actions]);

  const handleShareVideo = React.useCallback(async (video: UGCVideoItem) => {
    await actions.shareVideo(video);
  }, [actions]);

  const handleLoadMore = React.useCallback(() => {
    actions.loadMoreVideos();
  }, [actions]);

  const handleViewAllPress = React.useCallback(() => {
    router.push('/products-videos');
  }, [router]);

  const handleArticlePress = React.useCallback((article: Article) => {
    router.push(`/article/${article.id}`);
  }, [router]);

  const handleArticlesViewAllPress = React.useCallback(() => {
    router.push('/articles');
  }, [router]);

  const handleRetry = React.useCallback(async () => {
    await Promise.allSettled([
      actions.refreshVideos(),
      fetchArticles()
    ]);
  }, [actions, fetchArticles]);

  const handleRetryArticles = React.useCallback(async () => {
    await fetchArticles();
  }, [fetchArticles]);

  const handleUploadPress = React.useCallback(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      platformAlertConfirm(
        'Sign In Required',
        'Please sign in to upload videos and share your content.',
        () => router.push('/sign-in'),
        'Sign In'
      );
      return;
    }

    // Navigate to upload screen
    router.push('/ugc/upload');
  }, [isAuthenticated, router]);

  React.useEffect(() => {
    const preloadCurrentVideos = async () => {
      const currentVideos = getCurrentVideos();
      if (currentVideos.length > 0) {
        await preloadVideos(currentVideos.slice(0, 5), 0);
      }
    };

    if (!state.loading && state.allVideos.length > 0) {
      preloadCurrentVideos();
    }
  }, [state.loading, state.allVideos, state.activeCategory, preloadVideos]);

  const getCurrentVideos = () => {
    switch (state.activeCategory) {
      case 'trending_me':
        return state.trendingVideos;
      case 'trending_her':
        return state.trendingVideos;
      case 'article':
        return state.articleVideos;
      default:
        return state.allVideos;
    }
  };

  // Show full-screen error on initial load failure
  if (state.error && !state.refreshing && state.allVideos.length === 0) {
    return (
      <View style={styles.container}>
        <CategoryHeader
          categories={state.categories}
          onCategoryPress={handleCategoryPress}
          activeCategory={state.activeCategory}
        />
        <ErrorState
          error={state.error}
          onRetry={handleRetry}
        />
      </View>
    );
  }

  // Show full-screen loading on initial load
  if (state.loading && state.allVideos.length === 0 && !state.refreshing) {
    return (
      <View style={styles.container}>
        <CategoryHeader
          categories={state.categories}
          onCategoryPress={handleCategoryPress}
          activeCategory={state.activeCategory}
        />
        <LoadingState message="Loading amazing videos for you..." />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={state.refreshing}
          onRefresh={handleRefresh}
          tintColor={PLAY_PAGE_COLORS.primary}
          colors={[PLAY_PAGE_COLORS.primary]}
        />
      }
    >
      {/* Category Header */}
      <CategoryHeader
        categories={state.categories}
        onCategoryPress={handleCategoryPress}
        activeCategory={state.activeCategory}
      />

      <View style={styles.content}>
        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <Pressable style={styles.quickActionButton} onPress={() => router.push('/social/reels')}>
            <LinearGradient colors={[colors.brand.pink, colors.deepPink]} style={styles.quickActionGradient}>
              <Ionicons name="videocam" size={20} color={Colors.text.inverse} />
              <ThemedText style={styles.quickActionText}>Reels</ThemedText>
            </LinearGradient>
          </Pressable>
          <Pressable style={styles.quickActionButton} onPress={() => router.push('/social/upload')}>
            <LinearGradient colors={[colors.brand.purpleLight, colors.brand.purple]} style={styles.quickActionGradient}>
              <Ionicons name="add-circle" size={20} color={Colors.text.inverse} />
              <ThemedText style={styles.quickActionText}>Create</ThemedText>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Create Reel Banner */}
        <Pressable
          style={styles.createReelBanner}
          onPress={() => isAuthenticated ? router.push('/social/upload') : platformAlertConfirm(
            'Sign In Required',
            'Please sign in to create reels and earn coins.',
            () => router.push('/sign-in'),
            'Sign In'
          )}
          accessibilityLabel="Create a reel and earn coins"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#7C3AED', '#EC4899', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createReelGradient}
          >
            <View style={styles.createReelLeft}>
              <View style={styles.createReelIconCircle}>
                <Ionicons name="videocam" size={22} color="#fff" />
              </View>
              <View>
                <ThemedText style={styles.createReelTitle}>Create a Reel</ThemedText>
                <ThemedText style={styles.createReelSubtitle}>Share content & earn 50-200 coins</ThemedText>
              </View>
            </View>
            <View style={styles.createReelArrow}>
              <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.9)" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Inline error banner for refresh failures */}
        {state.error && state.allVideos.length > 0 && (
          <Pressable
            style={styles.errorBanner}
            onPress={handleRetry}
           
            accessibilityLabel={`Error loading content: ${state.error}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to retry loading content"
          >
            <Ionicons name="alert-circle" size={20} color={Colors.errorScale[700]} />
            <ThemedText style={styles.errorBannerText}>
              {state.error}
            </ThemedText>
            <Ionicons name="refresh" size={18} color={Colors.errorScale[700]} />
          </Pressable>
        )}

        {/* Merchant Videos Section — lazy-loaded */}
        {state.loading && merchantVideos.length === 0 ? (
          <View style={styles.sectionLoading}>
            <LoadingState message="Loading product videos..." size="small" />
          </View>
        ) : merchantVideos.length > 0 ? (
          <Suspense fallback={null}>
            <MerchantVideoSection
              videos={merchantVideos}
              onVideoPress={handleVideoPress}
              onViewAllPress={handleViewAllPress}
              loading={state.loading}
            />
          </Suspense>
        ) : null}

        {/* Article Section — lazy-loaded */}
        {articlesLoading && articles.length === 0 ? (
          <View style={styles.sectionLoading}>
            <LoadingState message="Loading articles..." size="small" />
          </View>
        ) : articlesError && articles.length === 0 ? (
          <View style={styles.sectionError}>
            <Pressable
              style={styles.sectionErrorButton}
              onPress={handleRetryArticles}

            >
              <Ionicons name="refresh-circle" size={24} color={Colors.error} />
              <ThemedText style={styles.sectionErrorText}>
                Failed to load articles. Tap to retry.
              </ThemedText>
            </Pressable>
          </View>
        ) : articles.length > 0 ? (
          <Suspense fallback={null}>
            <ArticleSection
              articles={articles}
              onArticlePress={handleArticlePress}
              onViewAllPress={handleArticlesViewAllPress}
              loading={articlesLoading}
            />
          </Suspense>
        ) : null}

        {/* UGC Videos Section — lazy-loaded */}
        {state.loading && ugcVideos.length === 0 ? (
          <View style={styles.sectionLoading}>
            <LoadingState message="Loading UGC videos..." size="small" />
          </View>
        ) : ugcVideos.length > 0 ? (
          <Suspense fallback={null}>
            <UGCVideoSection
              videos={ugcVideos}
              onVideoPress={handleVideoPress}
              onViewAllPress={handleViewAllPress}
              onLoadMore={handleLoadMore}
              loading={state.loading}
              hasMore={state.hasMoreVideos}
            />
          </Suspense>
        ) : null}

        {/* Empty state when no content */}
        {!state.loading &&
         !articlesLoading &&
         merchantVideos.length === 0 &&
         articles.length === 0 &&
         ugcVideos.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="play-circle-outline" size={80} color={PLAY_PAGE_COLORS.textSecondary} />
            <ThemedText style={styles.emptyText}>No Videos Yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Check back soon for fresh content!
            </ThemedText>
            <Pressable
              style={styles.emptyButton}
              onPress={handleUploadPress}
             
              accessibilityLabel="Be the first to upload"
              accessibilityRole="button"
              accessibilityHint="Double tap to upload the first video to this section"
            >
              <LinearGradient
                colors={[Colors.primary[500], '#00A85C', Colors.nileBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyButtonGradient}
              >
                <Ionicons name="add-circle-outline" size={20} color={Colors.text.inverse} />
                <ThemedText style={styles.emptyButtonText}>
                  Be the First to Upload
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        )}

      </View>

      {/* Upload FAB Button */}
      {showFAB && (
        <Animated.View
          style={[
            styles.fabContainer,
            fabAnimStyle,
          ]}
        >
          <Pressable
           
            onPress={handleUploadPress}
            style={styles.fab}
            accessibilityLabel="Upload video"
            accessibilityRole="button"
            accessibilityHint="Double tap to upload a video and share your content"
          >
            <LinearGradient
              colors={[Colors.primary[500], '#00A85C', Colors.nileBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Ionicons name="add" size={32} color={Colors.text.inverse} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PLAY_PAGE_COLORS.background },
  content: {
    flex: 1,
    paddingBottom: Spacing['5xl'] + Spacing['4xl'] + Spacing.sm, // ~120
  },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md },
  quickActionButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.md },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm },
  quickActionText: {
    color: Colors.text.inverse,
    fontSize: Typography.body.fontSize + 1,
    fontWeight: '700' },
  createReelBanner: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  createReelGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
  },
  createReelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  createReelIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createReelTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  createReelSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 1,
  },
  createReelArrow: {
    marginLeft: Spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorScale[50],
    borderLeftWidth: Spacing.xs,
    borderLeftColor: Colors.error,
    padding: Spacing.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm },
  errorBannerText: {
    flex: 1,
    color: Colors.errorScale[700],
    fontSize: Typography.body.fontSize,
    fontWeight: '600' },
  sectionLoading: {
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.base },
  sectionError: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.base },
  sectionErrorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorScale[50],
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.errorScale[100] },
  sectionErrorText: {
    color: Colors.error,
    fontSize: Typography.body.fontSize,
    fontWeight: '600' },
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.lg,
    zIndex: 999 },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary[500],
        shadowOffset: {
          width: 0,
          height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8 },
      android: {
        elevation: 8 } }) },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center' },
  emptyContainer: {
    paddingVertical: Spacing['5xl'] + Spacing.base,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center' },
  emptyText: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: PLAY_PAGE_COLORS.text,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm },
  emptySubtext: {
    fontSize: Typography.body.fontSize,
    color: PLAY_PAGE_COLORS.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: Spacing.xl },
  emptyButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5 },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm },
  emptyButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600' } });

export default withErrorBoundary(PlayScreen, '(tabs)Play');
