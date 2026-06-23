// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  ScrollView
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming } from 'react-native-reanimated';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSocial } from '../../contexts/SocialContext';
import { useAuthUser } from '@/stores/selectors';
import { useFollowSystem } from '../../hooks/useFollowSystem';
import { useFeedRealtime } from '../../hooks/useFeedRealtime';
import ActivityCard from '../../components/feed/ActivityCard';
import FollowButton from '../../components/social/FollowButton';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const ActivityFeedPage = () => {
  const {
    activities,
    isLoadingFeed,
    hasMoreActivities,
    loadFeed,
    loadMoreActivities,
    refreshFeed,
    likeActivity,
    commentOnActivity,
    suggestedUsers,
    loadSuggestedUsers
  } = useSocial();

  const user = useAuthUser();
  const isMounted = useIsMounted();
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');
  const newPostsBannerAnim = useSharedValue(0);
  const newPostsBannerStyle = useAnimatedStyle(() => ({
    opacity: newPostsBannerAnim.value,
    transform: [{ translateY: interpolate(newPostsBannerAnim.value, [0, 1], [-50, 0]) }],
  }));

  // Follow system
  const {
    suggestions: followSuggestions,
    loadSuggestions,
    followersCount,
    followingCount } = useFollowSystem(user?.id);

  // Real-time feed updates
  const {
    activities: realtimeActivities,
    newPostsCount,
    isConnected,
    loadPendingPosts,
    clearNewPostsCount } = useFeedRealtime(activities, user?.id, {
    onNewPost: (activity) => {

      // Animate new posts banner
      newPostsBannerAnim.value = withSpring(1);
    },
    onFollowUpdate: (userId, isFollowing) => {

      // Refresh suggestions if needed
      loadSuggestions(10);
    },
    autoLoadNewPosts: false, // Manual loading with banner
  });

  useEffect(() => {
    // Initial load
    loadFeed(true);
    loadSuggestions(10);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshFeed();
    await loadSuggestions(10);
    clearNewPostsCount();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleLoadNewPosts = () => {
    loadPendingPosts();
    newPostsBannerAnim.value = withTiming(0, { duration: 200 });
  };

  const handleLoadMore = () => {
    if (!isLoadingFeed && hasMoreActivities) {
      loadMoreActivities();
    }
  };

  const handleLike = useCallback(async (activityId: string) => {
    try {
      await likeActivity(activityId);
    } catch (error) {
      // silently handle
    }
  }, [likeActivity]);

  const handleComment = useCallback(async (activityId: string, comment: string) => {
    try {
      await commentOnActivity(activityId, comment);
    } catch (error) {
      // silently handle
    }
  }, [commentOnActivity]);

  const renderSuggestedUsers = () => {
    const displaySuggestions = followSuggestions.length > 0 ? followSuggestions : suggestedUsers;
    if (displaySuggestions.length === 0) return null;

    return (
      <View style={styles.suggestedSection}>
        <View style={styles.suggestedHeader}>
          <Text style={styles.suggestedTitle}>Suggested for you</Text>
          {followingCount > 0 && (
            <Pressable
              onPress={() => loadSuggestions(10)}
              accessibilityLabel="Refresh suggestions"
              accessibilityRole="button"
              accessibilityHint="Loads new user suggestions"
            >
              <Ionicons name="refresh" size={20} color={colors.brand.ios} />
            </Pressable>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestedScroll}>
          {displaySuggestions.map((suggestedUser) => (
            <View key={suggestedUser._id} style={styles.suggestedCard}>
              <View style={styles.suggestedAvatar}>
                {suggestedUser.profilePicture ? (
                  <CachedImage source={suggestedUser.profilePicture} style={styles.suggestedAvatarImage} />
                ) : (
                  <View style={styles.suggestedAvatarPlaceholder}>
                    <Text style={styles.suggestedAvatarText}>
                      {suggestedUser.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.suggestedName} numberOfLines={1}>
                {suggestedUser.name}
              </Text>
              {(suggestedUser as any).isMutual === true && (
                <View style={styles.mutualBadge}>
                  <Ionicons name="people" size={10} color={colors.brand.ios} />
                  <Text style={styles.mutualText}>Mutual</Text>
                </View>
              )}
              <FollowButton
                userId={suggestedUser._id}
                style={styles.suggestedFollowButton}
                onFollowChange={(isFollowing) => {
                  if (isFollowing) {
                    // Reload suggestions after following
                    setTimeout(() => loadSuggestions(10), 500);
                  }
                }}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {renderSuggestedUsers()}
      <View style={styles.feedHeader}>
        <Text style={styles.feedTitle}>Activity Feed</Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingFeed) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color={colors.brand.ios} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoadingFeed) {
      return (
        <CardGridSkeleton />
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No activities yet</Text>
        <Text style={styles.emptyText}>
          Follow people to see their activities in your feed
        </Text>
        <Pressable
          style={styles.discoverButton}
          onPress={loadSuggestedUsers}
          accessibilityLabel="Discover people"
          accessibilityRole="button"
          accessibilityHint="Find new people to follow"
        >
          <Text style={styles.discoverButtonText}>Discover People</Text>
        </Pressable>
      </View>
    );
  };

  const renderActivityItem = useCallback(({ item }: { item: any }) => (
    <ActivityCard
      activity={item}
      onLike={handleLike}
      onComment={handleComment}
      currentUserId={user?.id}
    />
  ), [handleLike, handleComment, user?.id]);

  // Use real-time activities
  const displayActivities = realtimeActivities.length > 0 ? realtimeActivities : activities;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Social Feed</Text>
          {isConnected && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.headerButton}
            onPress={() => setShowFilterMenu(!showFilterMenu)}
            accessibilityLabel="Filter options"
            accessibilityRole="button"
            accessibilityState={{ expanded: showFilterMenu }}
            accessibilityHint="Opens filter menu to sort feed posts"
          >
            <Ionicons name="options-outline" size={24} color={colors.text.primary} />
          </Pressable>
          <Pressable
            style={styles.headerButton}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            accessibilityHint="View your notifications"
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text.primary} />
          </Pressable>
        </View>
      </View>

      {/* Filter Menu */}
      {showFilterMenu && (
        <View style={styles.filterMenu}>
          <Pressable
            style={[styles.filterOption, feedFilter === 'all' && styles.filterOptionActive]}
            onPress={() => {
              setFeedFilter('all');
              setShowFilterMenu(false);
            }}
          >
            <Text style={[styles.filterText, feedFilter === 'all' && styles.filterTextActive]}>
              All Posts
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterOption, feedFilter === 'following' && styles.filterOptionActive]}
            onPress={() => {
              setFeedFilter('following');
              setShowFilterMenu(false);
            }}
          >
            <Text style={[styles.filterText, feedFilter === 'following' && styles.filterTextActive]}>
              Following
            </Text>
          </Pressable>
        </View>
      )}

      {/* New Posts Banner */}
      {newPostsCount > 0 && (
        <Animated.View
          style={[
            styles.newPostsBanner,
            newPostsBannerStyle,
          ]}
        >
          <Pressable
            style={styles.newPostsButton}
            onPress={handleLoadNewPosts}
            accessibilityLabel={`Load ${newPostsCount} new ${newPostsCount === 1 ? 'post' : 'posts'}`}
            accessibilityRole="button"
            accessibilityHint="Loads new posts to the feed"
          >
            <Ionicons name="arrow-up" size={16} color={Colors.text.inverse} />
            <Text style={styles.newPostsText}>
              {newPostsCount} new {newPostsCount === 1 ? 'post' : 'posts'}
            </Text>
          </Pressable>
        </Animated.View>
      )}

      <FlashList
        data={displayActivities}
        keyExtractor={(item) => item._id}
        renderItem={renderActivityItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand.ios}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={350}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  headerTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: colors.text.primary
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CD964' },
  liveDot: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#4CD964' },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.sm },
  headerButton: {
    padding: Spacing.sm
  },
  filterMenu: {
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.md },
  filterOption: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary },
  filterOptionActive: {
    backgroundColor: colors.brand.ios },
  filterText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary },
  filterTextActive: {
    color: Colors.text.inverse },
  newPostsBanner: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingHorizontal: Spacing.base },
  newPostsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.brand.ios,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius['2xl'],
    ...Shadows.medium },
  newPostsText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600' },
  listContent: {
    padding: Spacing.base,
    flexGrow: 1,
    paddingBottom: 120 },
  suggestedSection: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.medium
  },
  suggestedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md },
  suggestedTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: colors.text.primary },
  suggestedScroll: {
    marginHorizontal: -4
  },
  suggestedCard: {
    width: 120,
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: '#f9f9f9',
    borderRadius: BorderRadius.md
  },
  suggestedAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: Spacing.sm
  },
  suggestedAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30
  },
  suggestedAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: colors.brand.ios,
    alignItems: 'center',
    justifyContent: 'center'
  },
  suggestedAvatarText: {
    color: Colors.text.inverse,
    ...Typography.h2,
    fontWeight: '600'
  },
  suggestedName: {
    ...Typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    width: '100%'
  },
  mutualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F3FF',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.sm },
  mutualText: {
    ...Typography.overline,
    fontWeight: '600',
    color: colors.brand.ios },
  suggestedFollowButton: {
    minWidth: 80,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6
  },
  feedHeader: {
    marginBottom: Spacing.md
  },
  feedTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: colors.text.primary
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['2xl']
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20
  },
  discoverButton: {
    backgroundColor: colors.brand.ios,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl']
  },
  discoverButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600'
  }
});

export default withErrorBoundary(ActivityFeedPage, 'FeedIndex');
