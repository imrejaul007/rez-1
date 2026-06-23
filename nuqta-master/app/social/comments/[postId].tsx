// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Comments Page
// Full comments view for a post

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import reelApi from '@/services/reelApi';
import { useAuthUser, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { formatTimeAgo } from '@/utils/timeAgoFormatter';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface Comment {
  id: string;
  user: {
    name: string;
    avatar: string;
    verified: boolean;
  };
  text: string;
  likes: number;
  time: string;
  replies?: Comment[];
  isLiked: boolean;
}

const COMMENTS_PER_PAGE = 20;

/**
 * Transform a raw backend comment (from getVideoComments response) into our UI Comment shape.
 */
function transformComment(raw: any): Comment {
  const firstName = raw.user?.profile?.firstName || raw.user?.name || raw.userName || 'Anonymous';
  const lastName = raw.user?.profile?.lastName || '';
  const name = lastName ? `${firstName} ${lastName}`.trim() : firstName;
  const avatar = raw.user?.profile?.avatar || raw.userAvatar || '';

  const repliesRaw = raw.replies || [];
  const replies: Comment[] = repliesRaw.map((r: any) => transformComment(r));

  return {
    id: raw._id || raw.id,
    user: {
      name,
      avatar: avatar || name.charAt(0).toUpperCase(),
      verified: raw.user?.isVerified || false,
    },
    text: raw.content || raw.comment || raw.text || '',
    likes: typeof raw.likes === 'number' ? raw.likes : (Array.isArray(raw.likes) ? raw.likes.length : 0),
    time: raw.timestamp || raw.createdAt ? formatTimeAgo(raw.timestamp || raw.createdAt) : '',
    isLiked: raw.isLiked || false,
    replies: replies.length > 0 ? replies : undefined,
  };
}

function CommentsPage() {
  const router = useRouter();
  const { postId } = useLocalSearchParams();
  const videoId = Array.isArray(postId) ? postId[0] : postId;
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const user = useAuthUser();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const fetchComments = useCallback(async (pageNum: number, append = false) => {
    if (!videoId || authLoading || !isAuthenticated) return;

    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await reelApi.getComments(videoId, { page: pageNum, limit: COMMENTS_PER_PAGE });

      if (response.success && response.data) {
        const rawComments = response.data.comments || [];
        const transformed = rawComments.map(transformComment);
        if (!isMounted()) return;
        setComments(prev => append ? [...prev, ...transformed] : transformed);

        const pagination = response.data.pagination;
        if (!isMounted()) return;
        setHasMore(pagination?.hasNext ?? transformed.length >= COMMENTS_PER_PAGE);
        if (!isMounted()) return;
        setPage(pageNum);
        if (!isMounted()) return;
        setError(null);
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to load comments');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load comments');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [videoId, authLoading, isAuthenticated]);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchComments(1);
  }, [fetchComments]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchComments(page + 1, true);
    }
  }, [loadingMore, hasMore, page, fetchComments]);

  const handleLike = useCallback(async (commentId: string) => {
    if (!videoId) return;

    // Optimistic update
    setComments(prev =>
      prev.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isLiked: !comment.isLiked,
            likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
          };
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply => {
              if (reply.id === commentId) {
                return {
                  ...reply,
                  isLiked: !reply.isLiked,
                  likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1,
                };
              }
              return reply;
            }),
          };
        }
        return comment;
      })
    );

    const response = await reelApi.toggleCommentLike(videoId, commentId);

    if (!response.success) {
      // Revert on error
      if (!isMounted()) return;
      setComments(prev =>
        prev.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply => {
                if (reply.id === commentId) {
                  return {
                    ...reply,
                    isLiked: !reply.isLiked,
                    likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1,
                  };
                }
                return reply;
              }),
            };
          }
          return comment;
        })
      );
    }
  }, [videoId]);

  const handleReply = useCallback((commentId: string, userName: string) => {
    setReplyingTo(commentId);
    setNewComment(`@${userName} `);
    inputRef.current?.focus();
  }, []);

  const handleSendComment = useCallback(async () => {
    if (!newComment.trim() || !videoId || sending) return;

    setSending(true);
    try {
      const response = await reelApi.addComment(videoId, newComment.trim());

      if (response.success && response.data) {
        const addedComment: Comment = {
          id: response.data.id,
          user: {
            name: response.data.userName || user?.fullName || 'You',
            avatar: response.data.userAvatar || (user?.fullName || 'Y').charAt(0).toUpperCase(),
            verified: false,
          },
          text: response.data.comment,
          likes: 0,
          time: 'Just now',
          isLiked: false,
        };

        if (replyingTo) {
          if (!isMounted()) return;
          setComments(prev =>
            prev.map(comment => {
              if (comment.id === replyingTo) {
                return {
                  ...comment,
                  replies: [...(comment.replies || []), addedComment],
                };
              }
              return comment;
            })
          );
        } else {
          if (!isMounted()) return;
          setComments(prev => [addedComment, ...prev]);
        }
      }
    } catch {
      // Silently fail — the comment was not added
    } finally {
      if (!isMounted()) return;
      setNewComment('');
      if (!isMounted()) return;
      setReplyingTo(null);
      if (!isMounted()) return;
      setSending(false);
    }
  }, [newComment, videoId, sending, replyingTo, user]);

  const renderComment = useCallback((comment: Comment, isReply = false) => (
    <View key={comment.id} style={[styles.commentItem, isReply && styles.replyItem]}>
      <View style={styles.avatar}>
        <ThemedText style={styles.avatarText}>{comment.user.avatar}</ThemedText>
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <ThemedText style={styles.userName}>
            {comment.user.name}
            {comment.user.verified && (
              <Ionicons name="checkmark-circle" size={12} color={Colors.info} />
            )}
          </ThemedText>
          <ThemedText style={styles.commentTime}>{comment.time}</ThemedText>
        </View>
        <ThemedText style={styles.commentText}>{comment.text}</ThemedText>
        <View style={styles.commentActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleLike(comment.id)}
          >
            <Ionicons
              name={comment.isLiked ? 'heart' : 'heart-outline'}
              size={16}
              color={comment.isLiked ? Colors.error : Colors.text.tertiary}
            />
            <ThemedText style={[
              styles.actionText,
              comment.isLiked && { color: Colors.error },
            ]}>
              {comment.likes}
            </ThemedText>
          </Pressable>
          {!isReply && (
            <Pressable
              style={styles.actionButton}
              onPress={() => handleReply(comment.id, comment.user.name)}
            >
              <ThemedText style={styles.replyText}>Reply</ThemedText>
            </Pressable>
          )}
          <Pressable style={styles.actionButton}>
            <Ionicons name="ellipsis-horizontal" size={16} color={Colors.text.tertiary} />
          </Pressable>
        </View>
      </View>
    </View>
  ), [handleLike, handleReply]);

  const renderCommentWithReplies = useCallback(({ item }: { item: Comment }) => (
    <View>
      {renderComment(item)}
      {item.replies && item.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {item.replies.map(reply => renderComment(reply, true))}
        </View>
      )}
    </View>
  ), [renderComment]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name="close" size={24} color={Colors.text.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Comments</ThemedText>
        <Pressable style={styles.sortButton}>
          <Ionicons name="swap-vertical" size={20} color={Colors.text.secondary} />
        </Pressable>
      </View>

      {/* Comments List */}
      <FlashList
        data={comments}
        renderItem={renderCommentWithReplies}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        estimatedItemSize={80}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={Colors.primary[600]} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary[600]} />
              <ThemedText style={styles.loadingText}>Loading comments...</ThemedText>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Ionicons name="alert-circle-outline" size={48} color={Colors.text.tertiary} />
              <ThemedText style={styles.emptyTitle}>{error}</ThemedText>
              <Pressable style={styles.retryButton} onPress={() => fetchComments(1)}>
                <ThemedText style={styles.retryText}>Retry</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.centered}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubble-outline" size={36} color={Colors.text.tertiary} />
              </View>
              <ThemedText style={styles.emptyTitle}>No comments yet</ThemedText>
              <ThemedText style={styles.emptySubtitle}>Be the first to comment!</ThemedText>
            </View>
          )
        }
      />

      {/* Reply Indicator */}
      {replyingTo && (
        <View style={styles.replyIndicator}>
          <ThemedText style={styles.replyIndicatorText}>
            Replying to {comments.find(c => c.id === replyingTo)?.user.name}
          </ThemedText>
          <Pressable onPress={() => {
            setReplyingTo(null);
            setNewComment('');
          }}>
            <Ionicons name="close" size={18} color={Colors.text.tertiary} />
          </Pressable>
        </View>
      )}

      {/* Comment Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputAvatar}>
          <ThemedText style={styles.inputAvatarText}>😊</ThemedText>
        </View>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={newComment}
          onChangeText={setNewComment}
          placeholder="Add a comment..."
          placeholderTextColor={Colors.text.tertiary}
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!newComment.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendComment}
          disabled={!newComment.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.primary[600]} />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={newComment.trim() ? Colors.primary[600] : Colors.text.tertiary}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  sortButton: {
    padding: Spacing.sm,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 100,
  },
  separator: {
    height: Spacing.md,
  },
  commentItem: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  replyItem: {
    marginLeft: Spacing.xl,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  userName: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  commentTime: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  commentText: {
    ...Typography.body,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  replyText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  repliesContainer: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray[50],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  replyIndicatorText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  inputAvatarText: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    color: Colors.text.primary,
    maxHeight: 100,
  },
  sendButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
  },
  retryText: {
    ...Typography.label,
    color: colors.background.primary,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});

export default withErrorBoundary(CommentsPage, 'SocialCommentsPostId');
