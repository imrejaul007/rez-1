// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import reelApi from '../../../services/reelApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';
import { colors } from '@/constants/theme';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';

const { width } = Dimensions.get('window');

const storeEmojis: Record<string, string> = {
  'food': '🍛',
  'restaurant': '🍽️',
  'cafe': '☕',
  'coffee': '☕',
  'fashion': '👗',
  'clothing': '👕',
  'shoes': '👟',
  'electronics': '📱',
  'grocery': '🛒',
  'beauty': '💄',
  'spa': '💆',
  'fitness': '💪',
  'gym': '🏋️',
  'default': '🏪',
};

const getStoreEmoji = (category?: string, storeName?: string): string => {
  if (category) {
    const lowerCat = category.toLowerCase();
    for (const [key, emoji] of Object.entries(storeEmojis)) {
      if (lowerCat.includes(key)) return emoji;
    }
  }
  if (storeName) {
    const lowerName = storeName.toLowerCase();
    for (const [key, emoji] of Object.entries(storeEmojis)) {
      if (lowerName.includes(key)) return emoji;
    }
  }
  return storeEmojis.default;
};

const formatTimeAgo = (dateString?: string): string => {
  if (!dateString) return '1 hour ago';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return 'Just now';
};

const UGCPostsFeed = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [ugcPosts, setUgcPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUgcPosts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await reelApi.getTrendingReels({ limit: 5 });
      if (response.success && response.data && response.data.length > 0) {
        const transformed = response.data.map((video: any, index: number) => ({
          id: video.id || video._id,
          // Use real storeId from backend
          storeId: video.storeId || video.store?.id || video.store?._id || null,
          user: {
            name: video.creator?.name || video.creator?.username ||
                  (video.creator?.profile ? `${video.creator.profile.firstName || ''} ${video.creator.profile.lastName || ''}`.trim() : null) ||
                  `User ${index + 1}`,
            avatar: video.creator?.avatar || video.creator?.profile?.avatar || `https://i.pravatar.cc/100?img=${10 + index}`,
            // Use real distance from store/location data, or show area name
            distance: video.store?.distance
              ? `${video.store.distance.toFixed(1)} km away`
              : video.store?.location?.city || 'Nearby',
          },
          // Use real store name from backend
          store: video.storeName || video.store?.name || 'Local Store',
          storeEmoji: getStoreEmoji(video.category, video.storeName || video.store?.name),
          image: video.thumbnail || video.thumbnailUrl,
          caption: video.description || video.caption || `Great experience with ${BRAND.APP_NAME} cashback!`,
          // Use real saved amount from backend, default to 0 if not available
          saved: video.amountSaved || video.cashbackEarned || 0,
          // Use real likes count from backend
          helpful: video.likesCount || video.likes || 0,
          // Use real comments count from backend
          comments: video.commentsCount || video.comments?.length || 0,
          time: formatTimeAgo(video.createdAt),
          // Use real isLiked status from backend
          isLiked: video.isLiked || false,
        }));
        if (!isMounted()) return;
        setUgcPosts(transformed);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load posts');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUgcPosts();
  }, []);

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  // Handle like/helpful button
  const handleLike = async (postId: string) => {
    // Find the current post
    const currentPost = ugcPosts.find(p => p.id === postId);
    if (!currentPost) return;

    const wasLiked = currentPost.isLiked;

    // Optimistic update - immediately update UI
    setUgcPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !wasLiked,
          helpful: wasLiked ? Math.max(0, post.helpful - 1) : post.helpful + 1,
        };
      }
      return post;
    }));

    // Call API to persist like
    try {
      const response = await reelApi.toggleLike(postId);

      // Update with actual server response if available
      if (response.success && response.data) {
        if (!isMounted()) return;
        setUgcPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: response.data.liked ?? response.data.isLiked ?? !wasLiked,
              helpful: response.data.likesCount ?? response.data.totalLikes ?? post.helpful,
            };
          }
          return post;
        }));
      }
    } catch (error) {
      // Revert on error
      if (!isMounted()) return;
      setUgcPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isLiked: wasLiked,
            helpful: wasLiked ? post.helpful + 1 : Math.max(0, post.helpful - 1),
          };
        }
        return post;
      }));
    }
  };

  // Handle share button
  const handleShare = async (post: any) => {
    try {
      const result = await Share.share({
        message: `Check out this amazing experience at ${post.store}! They saved ${currencySymbol}${post.saved} with ${BRAND.APP_NAME} cashback. "${post.caption}" \n\nDownload ${BRAND.APP_NAME} to start saving too!`,
        title: `${post.user.name} saved ${currencySymbol}${post.saved} at ${post.store}`,
      });

      if (result.action === Share.sharedAction) {
      }
    } catch (error: any) {
      platformAlertSimple('Error', 'Unable to share at this moment');
    }
  };

  // Handle comment button - navigate to reel detail with comments
  const handleComment = (postId: string) => {
    navigateTo(`/explore/reel/${postId}?showComments=true`);
  };

  // Handle view store
  const handleViewStore = (storeId: string | null, storeName: string) => {
    if (storeId) {
      navigateTo(`/MainStorePage?storeId=${storeId}`);
    } else {
      // Search for the store by name if no ID
      navigateTo(`/explore/search?q=${encodeURIComponent(storeName)}`);
    }
  };

  // Retry handler
  const handleRetry = () => {
    fetchUgcPosts();
  };

  // Loading state
  if (isLoading) {
    return <CardGridSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>People Are Saving Here</Text>
            <Text style={styles.sectionSubtitle}>Real experiences from your neighborhood</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={16} color={Colors.text.inverse} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty state - don't render section if no data
  if (ugcPosts.length === 0) {
    return null;
  }

  return (
    <FeatureErrorBoundary featureName="UGC Posts" compact={true}>
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>People Are Saving Here</Text>
          <Text style={styles.sectionSubtitle}>Real experiences from your neighborhood</Text>
        </View>
        <Pressable onPress={() => navigateTo('/explore/reels')}>
          <Text style={styles.seeAllText}>See All</Text>
        </Pressable>
      </View>

      {/* Posts List */}
      <View style={styles.postsList}>
        {ugcPosts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* User Header */}
            <View style={styles.postHeader}>
              <CachedImage source={post.user.avatar} style={styles.userAvatar} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{post.user.name}</Text>
                <View style={styles.userMeta}>
                  <Ionicons name="location-outline" size={12} color={Colors.text.tertiary} />
                  <Text style={styles.userMetaText}>{post.user.distance}</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.userMetaText}>{post.time}</Text>
                </View>
              </View>
              <Pressable
                style={styles.viewStoreButton}
                onPress={() => handleViewStore(post.storeId, post.store)}
              >
                <Text style={styles.viewStoreText}>View Store</Text>
              </Pressable>
            </View>

            {/* Post Image */}
            <Pressable
              style={styles.imageContainer}
              onPress={() => navigateTo(`/explore/reel/${post.id}`)}
            >
              <CachedImage source={post.image} style={styles.postImage} />

              {/* Savings Badge */}
              <View style={styles.savingsBadge}>
                <View style={styles.savingsIcon}>
                  <Ionicons name="wallet-outline" size={14} color={Colors.text.inverse} />
                </View>
                <Text style={styles.savingsText}>{currencySymbol}{post.saved}</Text>
              </View>
            </Pressable>

            {/* Store Name - Tappable */}
            <Pressable
              style={styles.storeRow}
              onPress={() => handleViewStore(post.storeId, post.store)}
            >
              <Text style={styles.storeEmoji}>{post.storeEmoji}</Text>
              <Text style={styles.storeName}>{post.store}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.gold} />
            </Pressable>

            {/* Caption */}
            <Text style={styles.caption}>{post.caption}</Text>

            {/* Actions Row */}
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.actionButton}
                onPress={() => handleLike(post.id)}
              >
                <Ionicons
                  name={post.isLiked ? "thumbs-up" : "thumbs-up-outline"}
                  size={18}
                  color={post.isLiked ? colors.lightMustard : colors.neutral[500]}
                />
                <Text style={[
                  styles.actionText,
                  post.isLiked && styles.actionTextActive
                ]}>
                  {post.helpful}
                </Text>
                <Text style={[
                  styles.actionLabel,
                  post.isLiked && styles.actionLabelActive
                ]}>
                  Helpful
                </Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() => handleComment(post.id)}
              >
                <Ionicons name="chatbubble-outline" size={18} color={Colors.text.tertiary} />
                <Text style={styles.actionText}>{post.comments}</Text>
                <Text style={styles.actionLabel}>Comment</Text>
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() => handleShare(post)}
              >
                <Ionicons name="share-outline" size={18} color={Colors.text.tertiary} />
                <Text style={styles.actionLabel}>Share</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
    </FeatureErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.xl,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.base,
    backgroundColor: colors.errorScale[50],
    borderRadius: BorderRadius.lg,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  retryText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  seeAllText: {
    ...Typography.body,
    color: Colors.gold,
    fontWeight: '600',
  },
  postsList: {
    paddingHorizontal: Spacing.base,
  },
  postCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background.secondary,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: Spacing.xs,
  },
  userMetaText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  metaDot: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  viewStoreButton: {
    borderWidth: 1.5,
    borderColor: colors.lightMustard,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
  },
  viewStoreText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.gold,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.background.secondary,
  },
  savingsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingLeft: 6,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: 6,
  },
  savingsIcon: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 6,
  },
  storeEmoji: {
    ...Typography.bodyLarge,
  },
  storeName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.gold,
  },
  caption: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 21,
    paddingHorizontal: 14,
    paddingTop: Spacing.sm,
    paddingBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: Spacing.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  actionLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  actionTextActive: {
    color: Colors.gold,
  },
  actionLabelActive: {
    color: Colors.gold,
  },
});

export default React.memo(UGCPostsFeed);
