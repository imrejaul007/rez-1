// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import reelApi, { Reel } from '@/services/reelApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');
const REEL_WIDTH = (width - 48) / 2;
const REEL_HEIGHT = REEL_WIDTH * 1.5;

const tabs = [
  { id: 'trending', label: 'Trending', icon: 'flame' },
  { id: 'following', label: 'Following', icon: 'people' },
  { id: 'nearby', label: 'Nearby', icon: 'location' },
];

const ExploreReelsPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [activeTab, setActiveTab] = useState('trending');
  const flatListRef = useRef<FlashList<Reel>>(null);

  // API state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_LIMIT = 20;

  // Fetch reels based on active tab
  const fetchReels = useCallback(async (isRefresh = false, pageNum = 1) => {
    try {
      if (isRefresh || pageNum === 1) {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }
      setError(null);

      let response;
      if (activeTab === 'trending') {
        response = await reelApi.getTrendingReels({ limit: PAGE_LIMIT });
      } else {
        response = await reelApi.getReels({
          sortBy: activeTab === 'following' ? 'newest' : 'popular',
          page: pageNum,
          limit: PAGE_LIMIT,
        });
      }

      if (response?.success) {
        let newReels: Reel[];
        if (activeTab === 'trending') {
          newReels = response.data || [];
        } else {
          newReels = response.data?.reels || [];
        }

        if (!isMounted()) return;
        if (pageNum === 1) {
          setReels(newReels);
        } else {
          setReels(prev => [...prev, ...newReels]);
        }
        setPage(pageNum);
        setHasMore(newReels.length >= PAGE_LIMIT);
      } else {
        if (!isMounted()) return;
        setError(response?.error || 'Failed to fetch reels');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeTab]);

  // Initial fetch and refetch on tab change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchReels(false, 1);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [fetchReels]);

  const onRefresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    fetchReels(true, 1);
  }, [fetchReels]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchReels(false, page + 1);
  }, [loadingMore, hasMore, page, fetchReels]);

  const navigateTo = useCallback((path: string) => {
    router.push(path as any);
  }, [router]);

  const formatCount = (count: number) => {
    if (!count || count < 0) return '0';
    return count >= 1000 ? `${(count / 1000).toFixed(1)}K` : String(count);
  };

  const renderReel = useCallback(({ item }: { item: Reel }) => (
    <Pressable
      style={styles.reelCard}
      onPress={() => navigateTo(`/explore/reel/${item.id}`)}
    >
      <CachedImage source={item.thumbnailUrl || item.videoUrl} style={styles.reelImage} />

      {/* User Badge */}
      <View style={styles.userBadge}>
        {item.creator?.avatar ? (
          <CachedImage source={item.creator.avatar} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: Colors.text.tertiary, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="person" size={10} color={Colors.text.inverse} />
          </View>
        )}
        <Text style={styles.userName}>{item.creator?.name || 'Creator'}</Text>
      </View>

      {/* Play Button */}
      <View style={styles.playOverlay}>
        <View style={styles.playButton}>
          <Ionicons name="play" size={20} color={Colors.text.inverse} />
        </View>
      </View>

      {/* Views Count */}
      <View style={styles.viewsContainer}>
        <Ionicons name="eye" size={12} color={Colors.text.inverse} />
        <Text style={styles.viewsText}>{formatCount(item.stats?.views || 0)}</Text>
      </View>

      {/* Bottom Gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
      >
        <Text style={styles.productName} numberOfLines={1}>
          {item.title || 'Untitled'}
        </Text>
        {item.store?.name && (
          <View style={styles.storeRow}>
            <Ionicons name="storefront" size={10} color={Colors.text.inverse} />
            <Text style={styles.storeName}>{item.store.name}</Text>
          </View>
        )}

        {item.products && item.products.length > 0 && item.products[0]?.price != null && (
          <View style={styles.savedBadge}>
            <Ionicons name="pricetag" size={10} color={Colors.text.inverse} />
            <Text style={styles.savedText}>{currencySymbol}{item.products[0].price}</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name={item.isLiked ? 'heart' : 'heart-outline'} size={14} color={item.isLiked ? Colors.error : Colors.background.primary} />
            <Text style={styles.statText}>{formatCount(item.stats?.likes || 0)}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble" size={14} color={Colors.text.inverse} />
            <Text style={styles.statText}>{formatCount(item.stats?.comments || 0)}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  ), [navigateTo, currencySymbol]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
        </Pressable>
        <Text style={styles.headerTitle}>Reels & Reviews</Text>
        <Pressable style={styles.createButton} onPress={() => navigateTo('/explore/search')}>
          <Ionicons name="search" size={22} color={Colors.nileBlue} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.id ? Colors.background.primary : Colors.text.tertiary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Create Reel CTA */}
      <Pressable style={styles.createCTA} onPress={() => navigateTo('/create-reel')}>
        <LinearGradient
          colors={['#FEF9C3', colors.tint.amberLight]}
          style={styles.createCTAGradient}
        >
          <View style={styles.createCTAIcon}>
            <Ionicons name="videocam" size={24} color={Colors.gold} />
          </View>
          <View style={styles.createCTAContent}>
            <Text style={styles.createCTATitle}>Share Your Experience</Text>
            <Text style={styles.createCTASubtitle}>
              Earn 50-200 coins per reel
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gold} />
        </LinearGradient>
      </Pressable>

      {/* Reels Grid */}
      <FlashList
        ref={flatListRef}
        data={reels}
        renderItem={renderReel}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={250}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.gold]} />
        }
        ListHeaderComponent={
          loading && !refreshing ? (
            <CardGridSkeleton />
          ) : error && reels.length === 0 ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={() => fetchReels()}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="videocam-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>No reels yet</Text>
              <Text style={styles.emptySubtext}>Be the first to share your experience!</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <>
            {loadingMore && (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.gold} />
              </View>
            )}
            <View style={{ height: 100 }} />
          </>
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.nileBlue,
  },
  tabText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  createCTA: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  createCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  createCTAIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createCTAContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  createCTATitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  createCTASubtitle: {
    ...Typography.bodySmall,
    color: colors.brand.amberDeep,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    minHeight: 200,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    width: '100%',
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
    paddingVertical: 60,
    width: '100%',
  },
  errorText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  retryButton: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.xl,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  emptySubtext: {
    marginTop: Spacing.xs,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  reelCard: {
    width: REEL_WIDTH,
    height: REEL_HEIGHT,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.background.secondary,
  },
  reelImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  userBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    gap: 6,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  userName: {
    ...Typography.overline,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: Spacing.xs,
  },
  viewsText: {
    ...Typography.overline,
    fontWeight: '500',
    color: Colors.text.inverse,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingTop: 30,
  },
  productName: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  storeName: {
    ...Typography.overline,
    color: Colors.text.inverse,
    opacity: 0.9,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: Spacing.xs,
  },
  savedText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    ...Typography.caption,
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(ExploreReelsPage, 'ExploreReels');
