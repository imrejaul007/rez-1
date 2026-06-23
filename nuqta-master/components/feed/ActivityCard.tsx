// @ts-nocheck
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { Activity, Comment } from '../../services/activityFeedApi';
import * as activityFeedApi from '../../services/activityFeedApi';
import FollowButton from '../social/FollowButton';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ActivityCardProps {
  activity: Activity;
  onLike: (activityId: string) => void;
  onComment: (activityId: string, comment: string) => void;
  currentUserId?: string;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onLike, onComment, currentUserId }) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [stats, setStats] = useState({ likes: 0, comments: 0, shares: 0 });
  const isMounted = useIsMounted();

  // Load activity stats
  React.useEffect(() => {
    loadStats();
  }, [activity._id]);

  const loadStats = async () => {
    try {
      const activityStats = await activityFeedApi.getActivityStats(activity._id);
      if (!isMounted()) return;
      setStats(activityStats);
    } catch (error) {
      // silently handle
    }
  };

  const loadComments = async () => {
    if (isLoadingComments) return;

    try {
      setIsLoadingComments(true);
      const { comments: fetchedComments } = await activityFeedApi.getActivityComments(activity._id, 1, 20);
      if (!isMounted()) return;
      setComments(fetchedComments);
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoadingComments(false);
    }
  };

  const handleShowComments = () => {
    setShowComments(true);
    if (comments.length === 0) {
      loadComments();
    }
  };

  const handleLike = () => {
    onLike(activity._id);
    setStats(prev => ({
      ...prev,
      likes: activity.hasLiked ? prev.likes - 1 : prev.likes + 1
    }));
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      await onComment(activity._id, commentText);
      if (!isMounted()) return;
      setCommentText('');

      // Reload comments
      await loadComments();
      if (!isMounted()) return;
      setStats(prev => ({ ...prev, comments: prev.comments + 1 }));
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsSubmittingComment(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderCommentItem = useCallback(({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        {item.user.profilePicture ? (
          <CachedImage source={item.user.profilePicture} style={styles.commentAvatarImage} />
        ) : (
          <View style={styles.commentAvatarPlaceholder}>
            <Text style={styles.commentAvatarText}>{item.user.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.commentContent}>
        <Text style={styles.commentUserName}>{item.user.name}</Text>
        <Text style={styles.commentText}>{item.comment}</Text>
        <Text style={styles.commentTime}>{formatTimeAgo(item.createdAt)}</Text>
      </View>
    </View>
  ), []);

  const getActivityIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      ORDER: 'checkmark-circle',
      CASHBACK: 'cash',
      REVIEW: 'star',
      VIDEO: 'videocam',
      PROJECT: 'briefcase',
      VOUCHER: 'ticket',
      OFFER: 'pricetag',
      REFERRAL: 'people',
      WALLET: 'wallet',
      ACHIEVEMENT: 'trophy'
    };
    return iconMap[type] || 'information-circle';
  };

  const isOwnActivity = currentUserId && activity.user._id === currentUserId;

  return (
    <View style={styles.card}>
      {/* User Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {activity.user.profilePicture ? (
              <CachedImage source={activity.user.profilePicture} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: activity.feedContent.color }]}>
                <Text style={styles.avatarText}>{activity.user.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{activity.user.name}</Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(activity.createdAt)}</Text>
          </View>
        </View>
        {!isOwnActivity && <FollowButton userId={activity.user._id} style={styles.followButton} />}
      </View>

      {/* Activity Content */}
      <View style={styles.content}>
        <View style={styles.activityHeader}>
          <View style={[styles.activityIcon, { backgroundColor: activity.feedContent.color + '20' }]}>
            <Ionicons name={getActivityIcon(activity.feedContent.type) as any} size={20} color={activity.feedContent.color} />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>{activity.feedContent.title}</Text>
            {activity.feedContent.description && (
              <Text style={styles.activityDescription}>{activity.feedContent.description}</Text>
            )}
          </View>
        </View>

        {activity.feedContent.amount && (
          <View style={styles.amountBadge}>
            <Text style={styles.amountText}>+{currencySymbol}{activity.feedContent.amount}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={handleLike}>
          <Ionicons
            name={activity.hasLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={activity.hasLiked ? '#FF3B30' : colors.midGray}
          />
          <Text style={[styles.actionText, activity.hasLiked && styles.actionTextActive]}>
            {stats.likes || 0}
          </Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={handleShowComments}>
          <Ionicons name="chatbubble-outline" size={22} color={colors.midGray} />
          <Text style={styles.actionText}>{stats.comments || 0}</Text>
        </Pressable>

        <Pressable style={styles.actionButton}>
          <Ionicons name="share-outline" size={22} color={colors.midGray} />
          <Text style={styles.actionText}>{stats.shares || 0}</Text>
        </Pressable>
      </View>

      {/* Comments Modal */}
      <Modal visible={showComments} animationType="slide" onRequestClose={() => setShowComments(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comments</Text>
            <Pressable onPress={() => setShowComments(false)}>
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </Pressable>
          </View>

          {isLoadingComments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.brand.ios} />
            </View>
          ) : (
            <FlashList
              data={comments}
              keyExtractor={(item) => item._id}
              renderItem={renderCommentItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No comments yet. Be the first to comment!</Text>
                </View>
              }
              estimatedItemSize={70}
            />
          )}

          {/* Comment Input */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || isSubmittingComment}
            >
              {isSubmittingComment ? (
                <ActivityIndicator size="small" color={colors.brand.ios} />
              ) : (
                <Ionicons name="send" size={24} color={commentText.trim() ? colors.brand.ios : '#ccc'} />
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.background.primary,
    fontSize: 18,
    fontWeight: '600'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2
  },
  timeAgo: {
    fontSize: 12,
    color: '#999'
  },
  followButton: {
    minWidth: 90
  },
  content: {
    marginBottom: 12
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  activityInfo: {
    flex: 1
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4
  },
  activityDescription: {
    fontSize: 14,
    color: colors.midGray,
    lineHeight: 20
  },
  amountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CD964',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8
  },
  amountText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '600'
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24
  },
  actionText: {
    fontSize: 14,
    color: colors.midGray,
    marginLeft: 6,
    fontWeight: '500'
  },
  actionTextActive: {
    color: '#FF3B30'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  commentItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12
  },
  commentAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18
  },
  commentAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: colors.brand.ios,
    alignItems: 'center',
    justifyContent: 'center'
  },
  commentAvatarText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '600'
  },
  commentContent: {
    flex: 1
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4
  },
  commentText: {
    fontSize: 14,
    color: colors.darkGray,
    lineHeight: 20,
    marginBottom: 4
  },
  commentTime: {
    fontSize: 12,
    color: '#999'
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center'
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: colors.background.primary
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonDisabled: {
    opacity: 0.5
  }
});

export default React.memo(ActivityCard);
