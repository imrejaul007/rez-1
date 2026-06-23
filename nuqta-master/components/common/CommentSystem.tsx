// @ts-nocheck
// Comment System Component
// Reusable comment system for products, posts, and content

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  likesCount: number;
  isLiked: boolean;
  parentId?: string; // For replies
  replies?: Comment[];
  canEdit: boolean;
  canDelete: boolean;
}

interface CommentSystemProps {
  entityId: string; // Product ID, Post ID, etc.
  entityType: 'product' | 'post' | 'ugc' | 'store';
  comments: Comment[];
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onEditComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onLikeComment: (commentId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  placeholder?: string;
  maxLength?: number;
  allowReplies?: boolean;
  currentUserId?: string;
  isLoading?: boolean;
  style?: any;
}

function CommentSystem({
  entityId,
  entityType,
  comments,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onLikeComment,
  onRefresh,
  placeholder = "Add a comment...",
  maxLength = 500,
  allowReplies = true,
  currentUserId,
  isLoading = false,
  style,
}: CommentSystemProps) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ commentId: string; userName: string } | null>(null);
  const [editingComment, setEditingComment] = useState<{ commentId: string; content: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const isMounted = useIsMounted();
  
  const inputRef = useRef<TextInput>(null);

  const handleSubmitComment = async () => {
    const content = newComment.trim();
    if (!content) return;

    if (content.length > maxLength) {
      platformAlertSimple('Comment Too Long', `Comments cannot exceed ${maxLength} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingComment) {
        await onEditComment(editingComment.commentId, content);
        if (!isMounted()) return;
        setEditingComment(null);
      } else {
        await onAddComment(content, replyTo?.commentId);
        if (!isMounted()) return;
        setReplyTo(null);
      }
      if (!isMounted()) return;
      setNewComment('');
      inputRef.current?.blur();
    } catch (error) {
      platformAlertSimple('Error', 'Failed to post comment. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsSubmitting(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment({ commentId: comment.id, content: comment.content });
    setNewComment(comment.content);
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const handleReplyToComment = (comment: Comment) => {
    if (!allowReplies) return;
    
    setReplyTo({ commentId: comment.id, userName: comment.userName });
    setEditingComment(null);
    setNewComment('');
    inputRef.current?.focus();
  };

  const handleDeleteComment = (commentId: string) => {
    platformAlertDestructive('Delete Comment', 'Are you sure you want to delete this comment?', () => onDeleteComment(commentId), 'Delete');
  };

  const handleLikeComment = (commentId: string) => {
    onLikeComment(commentId);
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setReplyTo(null);
    setNewComment('');
    inputRef.current?.blur();
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderComment = ({ item: comment, index }: { item: Comment; index: number }) => (
    <View style={[styles.commentContainer, comment.parentId && styles.replyContainer]}>
      {/* User Avatar */}
      <View style={styles.avatarContainer}>
        {comment.userAvatar ? (
          <CachedImage source={comment.userAvatar} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <ThemedText style={styles.avatarText}>
              {comment.userName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Comment Content */}
      <View style={styles.commentContent}>
        {/* Header */}
        <View style={styles.commentHeader}>
          <ThemedText style={styles.userName}>{comment.userName}</ThemedText>
          <ThemedText style={styles.timestamp}>{formatTimeAgo(comment.createdAt)}</ThemedText>
          {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
            <ThemedText style={styles.editedLabel}>• edited</ThemedText>
          )}
        </View>

        {/* Comment Text */}
        <ThemedText style={styles.commentText}>{comment.content}</ThemedText>

        {/* Actions */}
        <View style={styles.commentActions}>
          <Pressable
            style={[styles.actionButton, comment.isLiked && styles.likedButton]}
            onPress={() => handleLikeComment(comment.id)}
          >
            <Ionicons 
              name={comment.isLiked ? 'heart' : 'heart-outline'} 
              size={14} 
              color={comment.isLiked ? colors.error : colors.midGray} 
            />
            {comment.likesCount > 0 && (
              <ThemedText style={[styles.actionText, comment.isLiked && styles.likedText]}>
                {comment.likesCount}
              </ThemedText>
            )}
          </Pressable>

          {allowReplies && !comment.parentId && (
            <Pressable
              style={styles.actionButton}
              onPress={() => handleReplyToComment(comment)}
            >
              <Ionicons name="chatbubble-outline" size={14} color={colors.midGray} />
              <ThemedText style={styles.actionText}>Reply</ThemedText>
            </Pressable>
          )}

          {comment.canEdit && (
            <Pressable
              style={styles.actionButton}
              onPress={() => handleEditComment(comment)}
            >
              <Ionicons name="create-outline" size={14} color={colors.midGray} />
              <ThemedText style={styles.actionText}>Edit</ThemedText>
            </Pressable>
          )}

          {comment.canDelete && (
            <Pressable
              style={styles.actionButton}
              onPress={() => handleDeleteComment(comment.id)}
            >
              <Ionicons name="trash-outline" size={14} color={colors.error} />
              <ThemedText style={[styles.actionText, styles.deleteText]}>Delete</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            <Pressable
              style={styles.showRepliesButton}
              onPress={() => toggleReplies(comment.id)}
            >
              <Ionicons
                name={expandedReplies.has(comment.id) ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.brand.purpleLight}
              />
              <ThemedText style={styles.showRepliesText}>
                {expandedReplies.has(comment.id) ? 'Hide' : 'Show'} {comment.replies.length} reply{comment.replies.length !== 1 ? 'ies' : ''}
              </ThemedText>
            </Pressable>

            {expandedReplies.has(comment.id) && (
              <View style={styles.repliesList}>
                {comment.replies.map((reply, replyIndex) => (
                  <View key={reply.id} style={styles.replyItem}>
                    {renderComment({ item: reply, index: replyIndex })}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText style={styles.headerTitle}>
        Comments ({comments.length})
      </ThemedText>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-outline" size={48} color={colors.neutral[300]} />
      <ThemedText style={styles.emptyTitle}>No comments yet</ThemedText>
      <ThemedText style={styles.emptyText}>
        Be the first to share your thoughts!
      </ThemedText>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Comments List */}
      <FlashList
        data={comments.filter(c => !c.parentId)} // Only show top-level comments
        renderItem={renderComment}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.brand.purpleLight}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        estimatedItemSize={100}
      />

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purpleLight} />
        </View>
      )}

      {/* Input Section */}
      <View style={styles.inputContainer}>
        {(replyTo || editingComment) && (
          <View style={styles.inputContext}>
            <ThemedText style={styles.inputContextText}>
              {replyTo ? `Replying to ${replyTo.userName}` : 'Editing comment'}
            </ThemedText>
            <Pressable onPress={cancelEdit}>
              <Ionicons name="close" size={16} color={colors.midGray} />
            </Pressable>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder={placeholder}
            placeholderTextColor={colors.neutral[400]}
            multiline
            maxLength={maxLength}
            editable={!isSubmitting}
          />
          
          <Pressable
            style={[
              styles.sendButton,
              (!newComment.trim() || isSubmitting) && styles.sendButtonDisabled
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.brand.purpleLight} />
            ) : (
              <Ionicons name="send" size={20} color={colors.brand.purpleLight} />
            )}
          </Pressable>
        </View>

        {newComment.length > 0 && (
          <ThemedText style={styles.characterCount}>
            {newComment.length}/{maxLength}
          </ThemedText>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkGray,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.midGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  replyContainer: {
    marginLeft: 32,
    backgroundColor: colors.neutral[50],
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkGray,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: colors.midGray,
  },
  editedLabel: {
    fontSize: 12,
    color: colors.midGray,
    fontStyle: 'italic',
  },
  commentText: {
    fontSize: 14,
    color: colors.darkGray,
    lineHeight: 20,
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  likedButton: {
    backgroundColor: colors.errorScale[50],
  },
  actionText: {
    fontSize: 12,
    color: colors.midGray,
    marginLeft: 4,
    fontWeight: '500',
  },
  likedText: {
    color: colors.error,
  },
  deleteText: {
    color: colors.error,
  },
  repliesContainer: {
    marginTop: 12,
  },
  showRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  showRepliesText: {
    fontSize: 13,
    color: colors.brand.purpleLight,
    fontWeight: '600',
    marginLeft: 4,
  },
  repliesList: {
    marginTop: 8,
  },
  replyItem: {
    borderLeftWidth: 2,
    borderLeftColor: colors.gray[200],
    marginLeft: 8,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContext: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
  },
  inputContextText: {
    fontSize: 13,
    color: colors.midGray,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.darkGray,
    backgroundColor: colors.neutral[50],
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.neutral[50],
  },
  characterCount: {
    fontSize: 11,
    color: colors.midGray,
    textAlign: 'right',
    marginTop: 4,
  },
});

export default React.memo(CommentSystem);
