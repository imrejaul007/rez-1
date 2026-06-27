// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Reels Page
// Full-screen immersive video reels (TikTok-style)

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Dimensions,
  ActivityIndicator,
  Share
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  makeMutable,
  type SharedValue,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import ugcApi, { UgcReel } from '@/services/ugcApi';
import reelApi from '@/services/reelApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Tab types
type FeedTab = 'forYou' | 'following';

// Individual video player component that cleans up native video resources on unmount
const ReelVideoPlayer = React.memo(({ videoUrl, thumbnailUrl, isActive, title }: { videoUrl?: string; thumbnailUrl?: string; isActive: boolean; title?: string }) => {
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    return () => {
      // Unload the video when this item unmounts to free native resources
      videoRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  if (!videoUrl) {
    return (
      <View style={reelVideoStyles.videoPlaceholder}>
        <View style={reelVideoStyles.placeholderIconCircle}>
          <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.5)" />
        </View>
        {title ? <Text style={reelVideoStyles.placeholderTitle}>{title}</Text> : null}
        <Text style={reelVideoStyles.placeholderSubtext}>Video unavailable</Text>
      </View>
    );
  }

  return (
    <Video
      ref={videoRef}
      source={videoUrl}
      style={reelVideoStyles.video}
      resizeMode={ResizeMode.COVER}
      shouldPlay={isActive}
      isLooping
      isMuted={false}
      posterSource={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
      usePoster={!!thumbnailUrl}
    />
  );
});

const reelVideoStyles = StyleSheet.create({
  video: { flex: 1, width: '100%', height: '100%' },
  videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing['2xl'] },
  placeholderIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.base },
  placeholderTitle: { ...Typography.h4, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  placeholderSubtext: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.3)', marginTop: 6 }});

function ReelsPage() {
  const router = useRouter();
  const [reels, setReels] = useState<UgcReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<FeedTab>('forYou');
  const [bookmarkedReels, setBookmarkedReels] = useState<Set<string>>(new Set());
  const [screenFocused, setScreenFocused] = useState(true);
  const flatListRef = useRef<FlashList>(null);
  const likeAnimations = useRef<Map<string, SharedValue<number>>>(new Map());
  const isMounted = useIsMounted();

  const MAX_LIKE_ANIMATIONS = 50;
  const getLikeAnimation = (reelId: string) => {
    if (!likeAnimations.current.has(reelId)) {
      if (likeAnimations.current.size >= MAX_LIKE_ANIMATIONS) {
        const oldest = likeAnimations.current.keys().next();
        if (!oldest.done) likeAnimations.current.delete(oldest.value);
      }
      likeAnimations.current.set(reelId, makeMutable(1));
    }
    return likeAnimations.current.get(reelId)!;
  };

  const fetchReels = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const result = await ugcApi.getReelFeed(pageNum, 10);
      if (result.success && result.data) {
        const newReels = result.data.reels;
        setReels(prev => append ? [...prev, ...newReels] : newReels);
        setHasMore(result.data.pagination.hasMore);
        setPage(pageNum);
      } else {
        if (!isMounted()) return;
        setHasMore(false);
      }
    } catch (error) {
      if (!isMounted()) return;
      setHasMore(false);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReels(1, false);
    }, [fetchReels])
  );

  // Pause video playback when the screen loses focus (tab switch, navigation away)
  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, [])
  );

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchReels(page + 1, true);
    }
  };

  const handleLike = useCallback(async (reelId: string) => {
    const wasLiked = likedReels.has(reelId);

    // Animate heart
    const anim = getLikeAnimation(reelId);
    anim.value = withSequence(
      withTiming(1.4, { duration: 120 }),
      withTiming(1, { duration: 120 })
    );

    // Optimistic update
    setLikedReels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reelId)) newSet.delete(reelId);
      else newSet.add(reelId);
      return newSet;
    });
    setReels(prev => prev.map(r =>
      r.id === reelId ? { ...r, likes: r.likes + (wasLiked ? -1 : 1) } : r
    ));

    try {
      const result = await reelApi.toggleLike(reelId);
      if (!result.success) {
        setLikedReels(prev => {
          const newSet = new Set(prev);
          if (wasLiked) newSet.add(reelId);
          else newSet.delete(reelId);
          return newSet;
        });
        setReels(prev => prev.map(r =>
          r.id === reelId ? { ...r, likes: r.likes + (wasLiked ? 1 : -1) } : r
        ));
      }
    } catch (error) {
      // silently handle
    }
  }, [getLikeAnimation]);

  const handleBookmark = useCallback(async (reelId: string) => {
    const wasBookmarked = bookmarkedReels.has(reelId);
    setBookmarkedReels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reelId)) newSet.delete(reelId);
      else newSet.add(reelId);
      return newSet;
    });

    try {
      await reelApi.toggleBookmark(reelId);
    } catch (error) {
      // Revert
      if (!isMounted()) return;
      setBookmarkedReels(prev => {
        const newSet = new Set(prev);
        if (wasBookmarked) newSet.add(reelId);
        else newSet.delete(reelId);
        return newSet;
      });
    }
  }, []);

  const handleShare = useCallback(async (reel: UgcReel) => {
    try {
      await reelApi.shareReel(reel.id);
      if (!isMounted()) return;
      setReels(prev => prev.map(r =>
        r.id === reel.id ? { ...r, shares: r.shares + 1 } : r
      ));
      await Share.share({
        message: `Check out "${reel.title}" on ${BRAND.APP_NAME}!`,
        title: reel.title});
    } catch (error) {
      // silently handle
    }
  }, []);

  const handleShop = useCallback((reel: UgcReel) => {
    if (reel.store) {
      router.push(`/store/${reel.store.id}` as any);
    }
  }, [router]);

  // Track view when reel becomes visible
  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    viewableItems.forEach((item: any) => {
      if (item.isViewable && item.item?.id) {
        reelApi.trackView(item.item.id).catch(() => {});
      }
    });
  }).current;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const renderReel = useCallback(({ item, index }: { item: UgcReel; index: number }) => {
    const isLiked = likedReels.has(item.id);
    const isBookmarked = bookmarkedReels.has(item.id);
    const isActive = index === currentIndex && screenFocused;
    const likeScale = getLikeAnimation(item.id);

    return (
      <View style={styles.reelContainer}>
        {/* Video Player - uses ReelVideoPlayer for proper unloadAsync cleanup */}
        <View style={styles.videoContainer}>
          <ReelVideoPlayer
            videoUrl={item.videoUrl}
            thumbnailUrl={item.thumbnailUrl}
            isActive={isActive}
            title={item.title}
          />
        </View>

        {/* Gradient overlays for readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={styles.topGradient}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.bottomGradient}
        />

        {/* Right Side Actions */}
        <View style={styles.actionsContainer}>
          {/* Creator Avatar */}
          {item.creator && (
            <Pressable
              style={styles.avatarButton}
              onPress={() => router.push(`/creator/${item.creator!.id}` as any)}
            >
              <LinearGradient
                colors={['#FF6B6B', '#FFD93D', '#6BCB77']}
                style={styles.avatarRing}
              >
                {item.creator.avatar ? (
                  <CachedImage source={item.creator.avatar} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>
                      {item.creator.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
              </LinearGradient>
              <View style={styles.followBadge}>
                <Ionicons name="add" size={10} color={Colors.text.inverse} />
              </View>
            </Pressable>
          )}

          {/* Like */}
          <Pressable style={styles.actionButton} onPress={() => handleLike(item.id)}>
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={30}
                color={isLiked ? '#FF2D55' : colors.background.primary}
              />
            </Animated.View>
            <Text style={styles.actionCount}>{formatNumber(item.likes)}</Text>
          </Pressable>

          {/* Comments */}
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push(`/social/comments/${item.id}` as any)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={Colors.text.inverse} />
            <Text style={styles.actionCount}>{formatNumber(item.comments)}</Text>
          </Pressable>

          {/* Bookmark */}
          <Pressable style={styles.actionButton} onPress={() => handleBookmark(item.id)}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={28}
              color={isBookmarked ? '#FFD93D' : colors.background.primary}
            />
          </Pressable>

          {/* Share */}
          <Pressable style={styles.actionButton} onPress={() => handleShare(item)}>
            <Ionicons name="paper-plane-outline" size={26} color={Colors.text.inverse} />
            <Text style={styles.actionCount}>{formatNumber(item.shares)}</Text>
          </Pressable>

          {/* Shop */}
          {item.store && (
            <Pressable style={styles.shopButton} onPress={() => handleShop(item)}>
              <Ionicons name="bag-handle" size={22} color={Colors.text.inverse} />
            </Pressable>
          )}
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomContainer}>
          {/* Creator Name */}
          {item.creator && (
            <Pressable
              style={styles.creatorRow}
              onPress={() => router.push(`/creator/${item.creator!.id}` as any)}
            >
              <Text style={styles.creatorName}>@{item.creator.name}</Text>
              {item.views > 100 && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.info} />
                </View>
              )}
            </Pressable>
          )}

          {/* Description */}
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 3).map((tag, i) => (
                <Text key={i} style={styles.tagText}>#{tag}</Text>
              ))}
            </View>
          )}

          {/* Store pill */}
          {item.store && (
            <Pressable style={styles.storePill} onPress={() => handleShop(item)}>
              {item.store.logo ? (
                <CachedImage source={item.store.logo} style={styles.storeLogo} />
              ) : (
                <Ionicons name="storefront" size={13} color={Colors.text.inverse} />
              )}
              <Text style={styles.storeText}>{item.store.name}</Text>
              <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}

          {/* Music / Audio indicator */}
          <View style={styles.musicRow}>
            <Ionicons name="musical-notes" size={13} color={Colors.text.inverse} />
            <Text style={styles.musicText} numberOfLines={1}>
              Original audio - {item.creator?.name || 'Unknown'}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [currentIndex, likedReels, bookmarkedReels, screenFocused, router, handleLike, handleBookmark, handleShare]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          style={styles.emptyIconCircle}
        >
          <Ionicons name="videocam-off-outline" size={48} color="rgba(255,255,255,0.4)" />
        </LinearGradient>
        <Text style={styles.emptyTitle}>No Reels Yet</Text>
        <Text style={styles.emptySubtext}>
          Be the first to create a reel and earn coins!
        </Text>
        <Pressable
          style={styles.createReelButton}
          onPress={() => router.push('/social/upload' as any)}
        >
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createReelGradient}
          >
            <Ionicons name="add-circle" size={18} color={Colors.text.inverse} />
            <Text style={styles.createReelText}>Create Reel</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
        </Pressable>

        {/* Feed Tabs */}
        <View style={styles.feedTabs}>
          <Pressable
            style={styles.feedTab}
            onPress={() => setActiveTab('following')}
          >
            <Text style={[
              styles.feedTabText,
              activeTab === 'following' && styles.feedTabActive,
            ]}>Following</Text>
            {activeTab === 'following' && <View style={styles.tabIndicator} />}
          </Pressable>
          <View style={styles.tabDivider} />
          <Pressable
            style={styles.feedTab}
            onPress={() => setActiveTab('forYou')}
          >
            <Text style={[
              styles.feedTabText,
              activeTab === 'forYou' && styles.feedTabActive,
            ]}>For You</Text>
            {activeTab === 'forYou' && <View style={styles.tabIndicator} />}
          </Pressable>
        </View>

        <Pressable
          style={styles.headerButton}
          onPress={() => router.push('/social/upload' as any)}
        >
          <Ionicons name="camera-outline" size={22} color={Colors.text.inverse} />
        </Pressable>
      </View>

      {/* Loading State */}
      {loading ? (
        <CardGridSkeleton />
      ) : (
        <FlashList
          ref={flatListRef}
          data={reels}
          renderItem={renderReel}
          keyExtractor={item => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
            setCurrentIndex(index);
          }}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          estimatedItemSize={250}
          ListFooterComponent={loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={Colors.text.inverse} />
            </View>
          ) : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.text.primary},

  // ===== Header =====
  headerOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    zIndex: 10},
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center'},
  feedTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs},
  feedTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    alignItems: 'center'},
  feedTabText: {
    ...Typography.body,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)'},
  feedTabActive: {
    color: Colors.text.inverse,
    fontWeight: '700'},
  tabIndicator: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.background.primary,
    marginTop: Spacing.xs},
  tabDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.3)'},

  // ===== Loading =====
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md},
  loadingText: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.5)'},

  // ===== Reel Container =====
  reelContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative'},
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111'},
  video: {
    flex: 1,
    width: '100%',
    height: '100%'},

  // ===== Gradient Overlays =====
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 1},
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
    zIndex: 1},

  // ===== Video Placeholder =====
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl']},
  placeholderIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base},
  placeholderTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center'},
  placeholderSubtext: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 6},

  // ===== Right Side Actions =====
  actionsContainer: {
    position: 'absolute',
    right: 12,
    bottom: Platform.OS === 'ios' ? 100 : 80,
    alignItems: 'center',
    gap: 18,
    zIndex: 5},

  // Avatar
  avatarButton: {
    position: 'relative',
    marginBottom: 6},
  avatarRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 2.5,
    justifyContent: 'center',
    alignItems: 'center'},
  avatarImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: colors.text.primary},
  avatarFallback: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: Colors.text.primary,
    borderWidth: 2,
    borderColor: colors.text.primary,
    justifyContent: 'center',
    alignItems: 'center'},
  avatarText: {
    ...Typography.h4,
    color: Colors.text.inverse,
    fontWeight: '700'},
  followBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF2D55',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.text.primary},

  // Action buttons
  actionButton: {
    alignItems: 'center',
    gap: 3},
  actionCount: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3},
  shopButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'},

  // ===== Bottom Info =====
  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 70,
    bottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: Spacing.base,
    zIndex: 5},
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm},
  creatorName: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3},
  verifiedBadge: {
    marginLeft: 2},
  description: {
    ...Typography.bodySmall,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2},
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: 10},
  tagText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3},
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.xl,
    alignSelf: 'flex-start',
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)'},
  storeLogo: {
    width: 18,
    height: 18,
    borderRadius: 9},
  storeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse},
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6},
  musicText: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    flex: 1},

  // ===== Empty State =====
  emptyContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40},
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg},
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.sm},
  emptySubtext: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20},
  createReelButton: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden'},
  createReelGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md},
  createReelText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse},

  // ===== Footer =====
  footerLoader: {
    padding: Spacing.lg,
    alignItems: 'center'}});

export default withErrorBoundary(ReelsPage, 'SocialReels');
