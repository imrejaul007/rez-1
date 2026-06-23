// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Share,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { DetailPageSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import reelApi, { Reel, ReelComment } from '@/services/reelApi';
import { toggleFollow, checkFollowStatus } from '@/services/followApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const ReelDetailPage = () => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const { id } = useLocalSearchParams();
  const reelId = Array.isArray(id) ? id[0] : id;

  // UI state
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const commentInputRef = useRef<TextInput>(null);
  const videoRef = useRef<Video>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      videoRef.current?.unloadAsync();
    };
  }, []);

  // API state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reel, setReel] = useState<Reel | null>(null);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [likesCount, setLikesCount] = useState(0);

  // Fetch reel data
  const fetchReelData = useCallback(async (isRefresh = false) => {
    if (!reelId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [reelResponse, commentsResponse] = await Promise.all([
        reelApi.getReelById(reelId),
        reelApi.getComments(reelId, { limit: 20 }),
      ]);

      if (!isMountedRef.current) return;

      if (reelResponse.success && reelResponse.data) {
        setReel(reelResponse.data);
        setIsLiked(reelResponse.data.isLiked || false);
        setIsSaved(reelResponse.data.isBookmarked || false);
        setLikesCount(reelResponse.data.stats.likes);
      } else {
        setError(reelResponse.error || 'Failed to load reel');
      }

      if (commentsResponse.success && commentsResponse.data) {
        setComments(commentsResponse.data.comments || []);
      }

      // Track view
      reelApi.trackView(reelId).catch(() => {});
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setError(err.message || 'Something went wrong');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [reelId]);

  // Initial fetch
  useEffect(() => {
    fetchReelData();
  }, [fetchReelData]);

  const onRefresh = useCallback(() => {
    fetchReelData(true);
  }, [fetchReelData]);

  // Handle like toggle
  const handleLike = async () => {
    if (!reelId) return;

    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount(prev => Math.max(0, newLiked ? prev + 1 : prev - 1));

    try {
      const response = await reelApi.toggleLike(reelId);
      if (response.success && response.data) {
        setLikesCount(Math.max(0, response.data.likesCount));
      }
    } catch (err) {
      // Revert on error
      setIsLiked(!newLiked);
      setLikesCount(prev => Math.max(0, newLiked ? prev - 1 : prev + 1));
    }
  };

  // Handle bookmark toggle
  const handleBookmark = async () => {
    if (!reelId) return;

    const newSaved = !isSaved;
    setIsSaved(newSaved);

    try {
      await reelApi.toggleBookmark(reelId);
    } catch (err) {
      setIsSaved(!newSaved);
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!reelId || !comment.trim()) return;

    try {
      setSubmittingComment(true);
      const response = await reelApi.addComment(reelId, comment.trim());

      if (response.success && response.data) {
        setComments(prev => [response.data!, ...prev]);
        setComment('');
      } else {
        platformAlertSimple('Error', response.error || 'Failed to add comment');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle share
  const handleShare = async () => {
    if (!reel) return;

    try {
      const shareMessage = `Check out "${reel.title}" on ${BRAND.APP_NAME}!`;
      await Share.share({
        message: shareMessage,
        title: reel.title,
      });

      // Track the share event on backend
      const response = await reelApi.shareReel(reelId!);
      if (response.success && response.data) {
        setReel(prev => prev ? {
          ...prev,
          stats: { ...prev.stats, shares: response.data!.shares }
        } : prev);
      }
    } catch (err: any) {
      // User cancelled share - not an error
      if (err.message !== 'User did not share') {
      }
    }
  };

  // Handle follow toggle
  const handleFollow = async () => {
    if (!reel?.creator?.id) return;

    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);

    try {
      await toggleFollow(reel.creator.id);
    } catch (err) {
      // Revert on error
      setIsFollowing(!newFollowing);
    }
  };

  // Check follow status on load
  useEffect(() => {
    if (reel?.creator?.id) {
      checkFollowStatus(reel.creator.id)
        .then(response => {
          if (response.success && response.data) {
            setIsFollowing(response.data.isFollowing);
          }
        })
        .catch(() => {}); // Silently fail - default to not following
    }
  }, [reel?.creator?.id]);

  // Handle comment like toggle
  const handleCommentLike = async (commentId: string, currentlyLiked: boolean) => {
    if (!reelId) return;

    // Optimistic update
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, isLiked: !currentlyLiked, likes: Math.max(0, currentlyLiked ? c.likes - 1 : c.likes + 1) }
        : c
    ));

    try {
      const response = await reelApi.toggleCommentLike(reelId, commentId);
      if (response.success && response.data) {
        setComments(prev => prev.map(c =>
          c.id === commentId
            ? { ...c, isLiked: response.data!.isLiked, likes: response.data!.likesCount }
            : c
        ));
      }
    } catch (err) {
      // Revert on error
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, isLiked: currentlyLiked, likes: currentlyLiked ? c.likes + 1 : c.likes - 1 }
          : c
      ));
    }
  };

  // Handle report video
  const handleReportVideo = () => {
    if (!reelId) return;
    platformAlertDestructive(
      'Report Video',
      'Report this video as inappropriate content?',
      'Report',
      () => {
        reelApi.reportReel(reelId!, 'inappropriate').then(() => platformAlertSimple('Reported', 'Thank you for your feedback.')).catch(() => platformAlertSimple('Error', 'Failed to report. Try again.'));
      }
    );
  };

  // Handle options/more menu
  const handleOptionsMenu = () => {
    if (!reelId) return;

    platformAlertConfirm(
      'Options',
      'What would you like to do with this video?',
      handleReportVideo,
      'Report'
    );
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  const renderCommentItem = useCallback(({ item }: { item: ReelComment }) => (
    <View style={styles.commentItem}>
      {item.userAvatar ? (
        <CachedImage source={item.userAvatar} style={styles.commentAvatar} />
      ) : (
        <View style={[styles.commentAvatar, { backgroundColor: Colors.border.default, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="person" size={14} color={Colors.text.tertiary} />
        </View>
      )}
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUser}>{item.userName}</Text>
          <Text style={styles.commentTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.commentText}>{item.comment}</Text>
        <View style={styles.commentActions}>
          <Pressable
            style={styles.commentAction}
            onPress={() => handleCommentLike(item.id, item.isLiked || false)}
          >
            <Ionicons name={item.isLiked ? 'heart' : 'heart-outline'} size={14} color={item.isLiked ? Colors.error : Colors.text.tertiary} />
            <Text style={styles.commentActionText}>{item.likes}</Text>
          </Pressable>
          <Pressable
            style={styles.commentAction}
            onPress={() => {
              setComment(`@${item.userName} `);
            }}
          >
            <Text style={styles.commentActionText}>Reply</Text>
          </Pressable>
        </View>
      </View>
    </View>
  ), [handleCommentLike, setComment]);

  // Loading state
  if (loading && !reel) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailPageSkeleton />
      </>
    );
  }

  // Error state
  if (error && !reel) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchReelData()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
            <Pressable style={styles.backButtonAlt} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Text style={styles.backButtonAltText}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!reel) return null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Full Screen Video/Image */}
      <View style={styles.mediaContainer}>
        {reel.videoUrl ? (
          Platform.OS === 'web' ? (
            <video
              src={reel.videoUrl}
              poster={reel.thumbnailUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' } as any}
            />
          ) : (
            <Video
              ref={videoRef}
              source={reel.videoUrl}
              posterSource={reel.thumbnailUrl ? { uri: reel.thumbnailUrl } : undefined}
              style={styles.mediaVideo}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted={false}
              useNativeControls={false}
            />
          )
        ) : (
          <CachedImage source={reel.thumbnailUrl} style={styles.mediaImage} />
        )}

        {/* Top Header */}
        <View style={styles.topHeader}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <Pressable style={styles.moreButton} onPress={handleOptionsMenu}>
            <Ionicons name="ellipsis-horizontal" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>

        {/* Right Actions */}
        <View style={styles.rightActions}>
          <Pressable
            style={styles.actionButton}
            onPress={handleLike}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={isLiked ? Colors.error : Colors.text.inverse}
            />
            <Text style={styles.actionText}>{likesCount}</Text>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={() => commentInputRef.current?.focus()}>
            <Ionicons name="chatbubble-outline" size={26} color={Colors.text.inverse} />
            <Text style={styles.actionText}>{reel.stats?.comments || 0}</Text>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={26} color={Colors.text.inverse} />
            <Text style={styles.actionText}>{reel.stats.shares}</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={handleBookmark}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={26}
              color={isSaved ? Colors.warning : Colors.text.inverse}
            />
          </Pressable>
        </View>

        {/* Bottom Gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.bottomGradient}
        >
          {/* User Info */}
          <View style={styles.userInfo}>
            {reel.creator.avatar ? (
              <CachedImage source={reel.creator.avatar} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>
                  {reel.creator.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.userText}>
              <Text style={styles.userName}>{reel.creator.name}</Text>
              <Text style={styles.timestamp}>{new Date(reel.createdAt).toLocaleDateString()}</Text>
            </View>
            <Pressable
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
              ]}
              onPress={handleFollow}
            >
              <Text
                style={[
                  styles.followText,
                  isFollowing && styles.followingText,
                ]}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          </View>

          {/* Product & Store */}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{reel.title}</Text>
            {reel.store && (
              <Pressable
                style={styles.storeButton}
                onPress={() => navigateTo(`/MainStorePage?storeId=${reel.store?.id}`)}
              >
                <Ionicons name="storefront" size={14} color={Colors.text.inverse} />
                <Text style={styles.storeName}>{reel.store.name}</Text>
                {reel.products && reel.products.length > 0 && (
                  <View style={styles.cashbackBadge}>
                    <Text style={styles.cashbackText}>
                      {currencySymbol}{reel.products[0].price}
                    </Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>

          {/* Description */}
          {reel.description && (
            <Pressable
             
              onPress={() => setShowFullDescription(prev => !prev)}
            >
              <Text style={styles.description} numberOfLines={showFullDescription ? undefined : 2}>
                {reel.description}
              </Text>
              {reel.description.length > 100 && (
                <Text style={styles.readMoreText}>
                  {showFullDescription ? 'Show less' : 'Read more'}
                </Text>
              )}
            </Pressable>
          )}

          {/* Tags */}
          {reel.tags && reel.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {reel.tags.map((tag, index) => (
              <Text key={index} style={styles.tag}>
                {tag.startsWith('#') ? tag : `#${tag}`}
              </Text>
            ))}
          </View>
          )}

          {/* Savings Badge / Store Action */}
          {reel.store && (
          <View style={styles.savingsContainer}>
            <LinearGradient
              colors={[Colors.gold, Colors.nileBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.savingsBadge}
            >
              <Ionicons name="eye" size={16} color={Colors.text.inverse} />
              <Text style={styles.savingsText}>{reel.stats.views} Views</Text>
            </LinearGradient>
            <Pressable
              style={styles.visitStoreButton}
              onPress={() => navigateTo(`/MainStorePage?storeId=${reel.store?.id}`)}
            >
              <Text style={styles.visitStoreText}>Visit Store</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.gold} />
            </Pressable>
          </View>
          )}
        </LinearGradient>
      </View>

      {/* Comments Section */}
      <View style={styles.commentsSection}>
        <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>

        <FlashList
        contentContainerStyle={{ paddingBottom: 120 }}
          data={comments}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.gold]} />
          }
          estimatedItemSize={80}
          ListEmptyComponent={
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubble-outline" size={32} color={Colors.text.tertiary} />
              <Text style={styles.emptyCommentsText}>No comments yet</Text>
              <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
            </View>
          }
          renderItem={renderCommentItem}
        />

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <View style={[styles.myAvatar, { backgroundColor: Colors.border.default, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="person" size={14} color={Colors.text.tertiary} />
          </View>
          <TextInput
            ref={commentInputRef}
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.text.tertiary}
            value={comment}
            onChangeText={setComment}
            editable={!submittingComment}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[styles.sendButton, (!comment.trim() || submittingComment) && { opacity: 0.5 }]}
            onPress={handleAddComment}
            disabled={!comment.trim() || submittingComment}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color={Colors.gold} />
            ) : (
              <Ionicons name="send" size={20} color={Colors.gold} />
            )}
          </Pressable>
        </View>
      </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
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
    backgroundColor: '#000000',
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
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
  backButtonAlt: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
  },
  backButtonAltText: {
    color: Colors.text.tertiary,
    ...Typography.body,
  },
  emptyComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    marginTop: Spacing.md,
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  emptyCommentsSubtext: {
    marginTop: Spacing.xs,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  mediaContainer: {
    height: height * 0.6,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
  },
  topHeader: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActions: {
    position: 'absolute',
    right: Spacing.md,
    bottom: 180,
    alignItems: 'center',
    gap: Spacing.base,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    ...Typography.caption,
    color: Colors.text.inverse,
    marginTop: 2,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    paddingTop: 60,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.text.inverse,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  userText: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  followButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.text.inverse,
  },
  followText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  followingText: {
    color: Colors.text.inverse,
  },
  productInfo: {
    marginBottom: Spacing.sm,
  },
  productName: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: 6,
  },
  storeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeName: {
    ...Typography.caption,
    color: Colors.text.inverse,
  },
  cashbackBadge: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cashbackText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  description: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  readMoreText: {
    ...Typography.caption,
    color: colors.infoScale[400],
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tag: {
    ...Typography.caption,
    color: colors.infoScale[400],
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: 6,
  },
  savingsText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  visitStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: 6,
  },
  visitStoreText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.gold,
  },
  commentsSection: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    marginTop: -20,
    paddingTop: Spacing.base,
  },
  commentsTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  commentUser: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  commentTime: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  commentText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    marginTop: 6,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  commentActionText: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
    gap: 10,
  },
  myAvatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    ...Typography.caption,
    color: Colors.nileBlue,
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.successScale[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default withErrorBoundary(ReelDetailPage, 'ExploreReelId');
