// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, withRepeat, interpolate } from 'react-native-reanimated';

import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ugcApi, { UGCComment } from '@/services/ugcApi';
import { useToast } from '@/hooks/useToast';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MAX_COMMENT_LENGTH = 500;
const COMMENTS_PER_PAGE = 20;

interface UGCCommentsModalProps {
  visible: boolean;
  contentId: string;
  contentType: 'image' | 'video';
  contentThumbnail?: string;
  contentCaption?: string;
  initialCommentCount?: number;
  onClose: () => void;
  onCommentCountChange?: (count: number) => void;
}

interface CommentItemProps {
  comment: UGCComment;
  onLike: (commentId: string) => void;
  onReply: (comment: UGCComment) => void;
  onDelete: (commentId: string) => void;
  onReport: (commentId: string) => void;
  isReply?: boolean;
  currentUserId?: string;
}

// Format timestamp (e.g., "2m ago", "1h ago", "3d ago")
const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

// Format like count
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
};

// Comment Item Component
function CommentItem({
  comment,
  onLike,
  onReply,
  onDelete,
  onReport,
  isReply = false,
  currentUserId = 'current-user-id', // TODO: Get from auth context
}: CommentItemProps) {
  const [showActions, setShowActions] = useState(false);
  const isMounted = useIsMounted();
  const isOwnComment = comment.userId === currentUserId;

  const fullName = `${comment.user.profile.firstName} ${comment.user.profile.lastName}`;

  return (
    <View style={[styles.commentItem, isReply && styles.replyItem]}>
      {/* Avatar */}
      <CachedImage
        source={
          comment.user.profile.avatar
            ? { uri: comment.user.profile.avatar }
            : require('@/assets/images/default-avatar.png')
        }
        style={styles.avatar}
      />

      {/* Comment Content */}
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.timestamp}>{formatTimeAgo(comment.createdAt)}</Text>
        </View>

        <Text style={styles.commentText}>{comment.comment}</Text>

        {/* Action Buttons */}
        <View style={styles.commentActions}>
          <Pressable onPress={() => onLike(comment._id)} style={styles.actionBtn}>
            <Ionicons
              name={comment.isLiked ? 'heart' : 'heart-outline'}
              size={16}
              color={comment.isLiked ? colors.error : colors.neutral[500]}
            />
            {comment.likes > 0 && (
              <Text style={[styles.actionText, comment.isLiked && styles.likedText]}>
                {formatCount(comment.likes)}
              </Text>
            )}
          </Pressable>

          {!isReply && (
            <Pressable onPress={() => onReply(comment)} style={styles.actionBtn}>
              <Text style={styles.actionText}>Reply</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => setShowActions(!showActions)}
            style={styles.actionBtn}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.neutral[500]} />
          </Pressable>
        </View>

        {/* More Actions Menu */}
        {showActions && (
          <View style={styles.actionsMenu}>
            {isOwnComment ? (
              <Pressable
                onPress={() => {
                  setShowActions(false);
                  onDelete(comment._id);
                }}
                style={styles.actionMenuItem}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={[styles.actionMenuText, { color: colors.error }]}>Delete</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setShowActions(false);
                  onReport(comment._id);
                }}
                style={styles.actionMenuItem}
              >
                <Ionicons name="flag-outline" size={18} color={colors.neutral[500]} />
                <Text style={styles.actionMenuText}>Report</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply._id}
                comment={reply}
                onLike={onLike}
                onReply={onReply}
                onDelete={onDelete}
                onReport={onReport}
                isReply={true}
                currentUserId={currentUserId}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// Skeleton Loader
function CommentSkeleton() {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <View style={styles.commentItem}>
      <Animated.View style={[styles.avatar, styles.skeleton, shimmerStyle]} />
      <View style={styles.commentContent}>
        <Animated.View style={[styles.skeletonLine, { width: 120 }, shimmerStyle]} />
        <Animated.View style={[styles.skeletonLine, { width: '90%', marginTop: 8 }, shimmerStyle]} />
        <Animated.View style={[styles.skeletonLine, { width: '70%', marginTop: 4 }, shimmerStyle]} />
      </View>
    </View>
  );
}

function UGCCommentsModal({
  visible,
  contentId,
  contentType,
  contentThumbnail,
  contentCaption,
  initialCommentCount = 0,
  onClose,
  onCommentCountChange,
}: UGCCommentsModalProps) {
  const [comments, setComments] = useState<UGCComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [totalComments, setTotalComments] = useState(initialCommentCount);

  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<UGCComment | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showSuccess, showError } = useToast();
  const flatListRef = useRef<FlashList<UGCComment>>(null);
  const inputRef = useRef<TextInput>(null);

  const slideAnim = useSharedValue(screenHeight);
  const fadeAnim = useSharedValue(0);
  const isMounted = useIsMounted();

  // Animations
  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 300 });
      slideAnim.value = withSpring(0);
    } else {
      fadeAnim.value = withTiming(0, { duration: 200 });
      slideAnim.value = withTiming(screenHeight, { duration: 250 });
    }
  }, [visible]);

  // Load comments
  const loadComments = useCallback(async (pageNum: number = 0, isRefreshing: boolean = false) => {
    if (pageNum === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setError(null);

    try {
      const response = await ugcApi.getComments(
        contentId,
        COMMENTS_PER_PAGE,
        pageNum * COMMENTS_PER_PAGE
      );

      if (response.success && response.data) {
        const newComments = response.data.comments;

        if (isRefreshing || pageNum === 0) {
          if (!isMounted()) return;
          setComments(newComments);
        } else {
          setComments((prev) => [...prev, ...newComments]);
        }

        if (!isMounted()) return;
        setHasMore(response.data.hasMore);
        setTotalComments(response.data.total);
        setPage(pageNum);

        if (onCommentCountChange) {
          onCommentCountChange(response.data.total);
        }
      } else {
        setError('Failed to load comments');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load comments');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [contentId, onCommentCountChange]);

  // Initial load
  useEffect(() => {
    if (visible) {
      loadComments(0);
    }
  }, [visible]);

  // Refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadComments(0, true);
  }, [loadComments]);

  // Load more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadComments(page + 1);
    }
  }, [loadingMore, hasMore, page, loadComments]);

  // Post comment
  const handlePostComment = async () => {
    const text = commentText.trim();
    if (!text || posting) return;

    if (text.length > MAX_COMMENT_LENGTH) {
      showError('Comment is too long');
      return;
    }

    setPosting(true);
    Keyboard.dismiss();

    try {
      const response = await ugcApi.addComment(
        contentId,
        text,
        replyingTo?._id
      );

      if (response.success && response.data) {
        // Optimistically add comment
        const newComment = response.data.comment;

        if (replyingTo) {
          // Add as reply
          if (!isMounted()) return;
          setComments((prev) =>
            prev.map((c) =>
              c._id === replyingTo._id
                ? { ...c, replies: [...(c.replies || []), newComment] }
                : c
            )
          );
        } else {
          // Add as new comment
          setComments((prev) => [newComment, ...prev]);
          // Scroll to top
          if (!isMounted()) return;
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 100);
        }

        if (!isMounted()) return;
        setCommentText('');
        setReplyingTo(null);
        setTotalComments((prev) => prev + 1);

        if (onCommentCountChange) {
          onCommentCountChange(totalComments + 1);
        }

        showSuccess('Comment posted!');
      } else {
        showError('Failed to post comment');
      }
    } catch (err) {
      showError('Failed to post comment');
    } finally {
      if (!isMounted()) return;
      setPosting(false);
    }
  };

  // Like comment
  const handleLikeComment = async (commentId: string) => {
    try {
      // Optimistic update
      setComments((prev) => {
        const updateComment = (c: UGCComment): UGCComment => {
          if (c._id === commentId) {
            return {
              ...c,
              isLiked: !c.isLiked,
              likes: c.isLiked ? c.likes - 1 : c.likes + 1,
            };
          }
          if (c.replies) {
            return { ...c, replies: c.replies.map(updateComment) };
          }
          return c;
        };
        return prev.map(updateComment);
      });

      const response = await ugcApi.toggleCommentLike(contentId, commentId);

      if (!response.success) {
        // Revert on error
        if (!isMounted()) return;
        setComments((prev) => {
          const revertComment = (c: UGCComment): UGCComment => {
            if (c._id === commentId) {
              return {
                ...c,
                isLiked: !c.isLiked,
                likes: c.isLiked ? c.likes - 1 : c.likes + 1,
              };
            }
            if (c.replies) {
              return { ...c, replies: c.replies.map(revertComment) };
            }
            return c;
          };
          return prev.map(revertComment);
        });
      }
    } catch (err) {
      // silently handle
    }
  };

  // Reply to comment
  const handleReplyToComment = (comment: UGCComment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await ugcApi.deleteComment(contentId, commentId);

      if (response.success) {
        // Remove from list
        if (!isMounted()) return;
        setComments((prev) => {
          const removeComment = (list: UGCComment[]): UGCComment[] => {
            return list
              .filter((c) => c._id !== commentId)
              .map((c) => ({
                ...c,
                replies: c.replies ? removeComment(c.replies) : [],
              }));
          };
          return removeComment(prev);
        });

        if (!isMounted()) return;
        setTotalComments((prev) => prev - 1);
        if (onCommentCountChange) {
          onCommentCountChange(totalComments - 1);
        }

        showSuccess('Comment deleted');
      } else {
        showError('Failed to delete comment');
      }
    } catch (err) {
      showError('Failed to delete comment');
    }
  };

  // Report comment
  const handleReportComment = async (commentId: string) => {
    try {
      const response = await ugcApi.reportComment(contentId, commentId, 'inappropriate');

      if (response.success) {
        showSuccess('Comment reported. Thank you for your feedback.');
      } else {
        showError('Failed to report comment');
      }
    } catch (err) {
      showError('Failed to report comment');
    }
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const renderCommentItem = useCallback(({ item }: { item: UGCComment }) => (
    <CommentItem
      comment={item}
      onLike={handleLikeComment}
      onReply={handleReplyToComment}
      onDelete={handleDeleteComment}
      onReport={handleReportComment}
    />
  ), [handleLikeComment, handleReplyToComment, handleDeleteComment, handleReportComment]);

  const remainingChars = MAX_COMMENT_LENGTH - commentText.length;
  const isOverLimit = remainingChars < 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Pressable
          style={styles.overlayTouchable}
         
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.dragIndicator} />
              <View style={styles.headerContent}>
                <Text style={styles.title}>
                  {totalComments} {totalComments === 1 ? 'Comment' : 'Comments'}
                </Text>
                <Pressable
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={colors.midGray} />
                </Pressable>
              </View>

              {/* Content Preview */}
              {(contentThumbnail || contentCaption) && (
                <View style={styles.contentPreview}>
                  {contentThumbnail && (
                    <CachedImage source={contentThumbnail} style={styles.thumbnail} />
                  )}
                  {contentCaption && (
                    <Text style={styles.caption} numberOfLines={2}>
                      {contentCaption}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Comments List */}
            <FlashList
              ref={flatListRef}
              data={comments}
              keyExtractor={(item) => item._id}
              renderItem={renderCommentItem}
              contentContainerStyle={[
                styles.commentsList,
                comments.length === 0 && styles.emptyList,
              ]}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              removeClippedSubviews={Platform.OS !== 'web'}
              maxToRenderPerBatch={10}
              windowSize={5}
              initialNumToRender={8}
              estimatedItemSize={150}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.brand.purple}
                />
              }
              ListEmptyComponent={
                loading ? (
                  <View>
                    <CommentSkeleton />
                    <CommentSkeleton />
                    <CommentSkeleton />
                  </View>
                ) : error ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.neutral[400]} />
                    <Text style={styles.emptyText}>{error}</Text>
                    <Pressable
                      onPress={() => loadComments(0)}
                      style={styles.retryButton}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="chatbubble-outline" size={48} color={colors.neutral[400]} />
                    <Text style={styles.emptyText}>Be the first to comment!</Text>
                  </View>
                )
              }
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.loadingMore}>
                    <ActivityIndicator color={colors.brand.purple} />
                  </View>
                ) : null
              }
            />

            {/* Comment Input */}
            <View style={styles.inputContainer}>
              {replyingTo && (
                <View style={styles.replyingToBar}>
                  <Text style={styles.replyingToText}>
                    Replying to {replyingTo.user.profile.firstName}
                  </Text>
                  <Pressable onPress={handleCancelReply}>
                    <Ionicons name="close-circle" size={20} color={colors.neutral[500]} />
                  </Pressable>
                </View>
              )}

              <View style={styles.inputRow}>
                <CachedImage
                  source={require('@/assets/images/default-avatar.png')}
                  style={styles.inputAvatar}
                />

                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Add a comment..."
                  placeholderTextColor={colors.neutral[400]}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={MAX_COMMENT_LENGTH + 10} // Allow typing a bit over to show error
                  editable={!posting}
                />

                <Pressable
                  onPress={handlePostComment}
                  disabled={!commentText.trim() || posting || isOverLimit}
                  style={styles.sendButtonWrapper}
                >
                  <LinearGradient
                    colors={
                      !commentText.trim() || posting || isOverLimit
                        ? [colors.neutral[300], colors.neutral[400]]
                        : [colors.brand.purple, colors.brand.indigo]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sendButton}
                  >
                    {posting ? (
                      <ActivityIndicator color={colors.background.primary} size="small" />
                    ) : (
                      <Ionicons name="send" size={20} color={colors.background.primary} />
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              {commentText.length > 0 && (
                <Text style={[styles.charCount, isOverLimit && styles.charCountError]}>
                  {remainingChars} characters remaining
                </Text>
              )}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: screenHeight * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  closeButton: {
    padding: 4,
  },
  contentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
  },
  caption: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[500],
    lineHeight: 18,
  },
  commentsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  replyItem: {
    marginLeft: 48,
    marginTop: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  timestamp: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  commentText: {
    fontSize: 15,
    color: colors.neutral[700],
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  likedText: {
    color: colors.error,
  },
  actionsMenu: {
    marginTop: 8,
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionMenuText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  repliesContainer: {
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.neutral[500],
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: colors.brand.purple,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    backgroundColor: colors.background.primary,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  },
  replyingToBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.indigoMist,
  },
  replyingToText: {
    fontSize: 13,
    color: colors.brand.indigo,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
  },
  input: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.neutral[900],
    maxHeight: 100,
  },
  sendButtonWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    color: colors.neutral[400],
    textAlign: 'right',
    paddingHorizontal: 20,
    marginTop: 4,
  },
  charCountError: {
    color: colors.error,
  },
  skeleton: {
    backgroundColor: colors.neutral[200],
  },
  skeletonLine: {
    height: 12,
    backgroundColor: colors.neutral[200],
    borderRadius: 6,
    marginBottom: 4,
  },
});

export default React.memo(UGCCommentsModal);
