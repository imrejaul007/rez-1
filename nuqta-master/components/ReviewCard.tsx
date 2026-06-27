// @ts-nocheck
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { ThemedText } from '@/components/ThemedText';
import StarRating from '@/components/StarRating';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ReviewCardProps } from '@/types/reviews';
import { useAuthUser } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useToastStore } from '@/stores/toastStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onLike,
  onReport,
  onHelpful,
  showStoreResponse = true,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(review.isLiked || false);
  const [isHelpful, setIsHelpful] = useState(review.isHelpful || false);
  const [likeCount, setLikeCount] = useState(review.likes || 0);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isHelpfulLoading, setIsHelpfulLoading] = useState(false);

  const user = useAuthUser();
  const showError = useToastStore((state) => state.showError);
  const showSuccess = useToastStore((state) => state.showSuccess);

  // Refs for request race condition prevention
  const likeRequestIdRef = useRef(0);
  const helpfulRequestIdRef = useRef(0);

  // Animation values
  const likeScale = useSharedValue(1);
  const helpfulScale = useSharedValue(1);

  // Animated styles
  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const helpfulAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: helpfulScale.value }],
  }));

  // Get current user ID (handle both id and _id formats)
  const currentUserId = user?.id || user?._id || '';

  // Check if this review belongs to the current user
  const reviewUserId = review.userId?.toString() || '';
  const normalizedCurrentUserId = currentUserId.toString();
  const isMyReview = normalizedCurrentUserId && reviewUserId && normalizedCurrentUserId === reviewUserId;

  // Pending badge only shows for user's own pending reviews
  const isPending = review.moderationStatus === 'pending' && isMyReview;

  const formatDate = (date: Date) => {
    const now = new Date();
    const reviewDate = new Date(date);
    const diffTime = now.getTime() - reviewDate.getTime();
    const diffMs = Math.abs(diffTime);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Same day - show time
    if (diffDays === 0) {
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
      if (diffHours < 24) {
        const timeStr = reviewDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        return `Today at ${timeStr}`;
      }
    }

    // Yesterday - show time
    if (diffDays === 1) {
      const timeStr = reviewDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `Yesterday at ${timeStr}`;
    }

    // Within a week - show day and time
    if (diffDays < 7) {
      const timeStr = reviewDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const dayName = reviewDate.toLocaleDateString('en-US', { weekday: 'short' });
      return `${dayName} at ${timeStr}`;
    }

    // Older - show date and time
    if (diffDays < 365) {
      const dateStr = reviewDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      const timeStr = reviewDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `${dateStr} at ${timeStr}`;
    }

    // Very old - show full date
    return reviewDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleLike = useCallback(async () => {
    if (isLikeLoading) return;

    const currentRequestId = ++likeRequestIdRef.current;
    const previousLiked = isLiked;
    const previousCount = likeCount;

    try {
      setIsLikeLoading(true);

      // Optimistic update - immediate UI feedback
      const newLiked = !previousLiked;
      const newCount = newLiked ? previousCount + 1 : Math.max(0, previousCount - 1);

      setIsLiked(newLiked);
      setLikeCount(newCount);

      // Animate the button
      likeScale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withSpring(1, { friction: 3, tension: 100 })
      );

      // Call parent's onLike handler
      if (onLike) {
        await onLike(review.id);
      }

      // Check if this request is still valid
      if (currentRequestId !== likeRequestIdRef.current) {
        return;
      }

      showSuccess(newLiked ? 'Liked!' : 'Like removed', 1500);
    } catch (error) {
      // Check if this request is still valid
      if (currentRequestId !== likeRequestIdRef.current) {
        return;
      }

      // Rollback optimistic update
      setIsLiked(previousLiked);
      setLikeCount(previousCount);

      showError('Failed to update like', 3000);
    } finally {
      if (currentRequestId === likeRequestIdRef.current) {
        setIsLikeLoading(false);
      }
    }
  }, [isLiked, likeCount, isLikeLoading, onLike, review.id, showSuccess, showError, likeScale]);

  const handleHelpful = useCallback(async () => {
    if (isHelpfulLoading) return;

    const currentRequestId = ++helpfulRequestIdRef.current;
    const previousHelpful = isHelpful;
    const previousCount = helpfulCount;

    try {
      setIsHelpfulLoading(true);

      // Optimistic update - immediate UI feedback
      const newHelpful = !previousHelpful;
      const newCount = newHelpful ? previousCount + 1 : Math.max(0, previousCount - 1);

      setIsHelpful(newHelpful);
      setHelpfulCount(newCount);

      // Animate the button
      helpfulScale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withSpring(1, { friction: 3, tension: 100 })
      );

      // Call parent's onHelpful handler
      if (onHelpful) {
        await onHelpful(review.id);
      }

      // Check if this request is still valid
      if (currentRequestId !== helpfulRequestIdRef.current) {
        return;
      }

      showSuccess(newHelpful ? 'Marked as helpful!' : 'Removed helpful mark', 1500);
    } catch (error) {
      // Check if this request is still valid
      if (currentRequestId !== helpfulRequestIdRef.current) {
        return;
      }

      // Rollback optimistic update
      setIsHelpful(previousHelpful);
      setHelpfulCount(previousCount);

      showError('Failed to update helpful status', 3000);
    } finally {
      if (currentRequestId === helpfulRequestIdRef.current) {
        setIsHelpfulLoading(false);
      }
    }
  }, [isHelpful, helpfulCount, isHelpfulLoading, onHelpful, review.id, showSuccess, showError, helpfulScale]);

  const handleReport = useCallback(() => {
    if (onReport) {
      onReport(review.id);
    }
  }, [onReport, review.id]);

  return (
    <View style={styles.container}>
      {/* Pending Badge - Only show for user's own pending reviews */}
      {isPending && (
        <View style={styles.pendingBadge}>
          <Ionicons name="time-outline" size={14} color={colors.warningScale[400]} />
          <ThemedText style={styles.pendingBadgeText}>
            Pending Approval
          </ThemedText>
        </View>
      )}

      {/* User Info Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <CachedImage
            source={review.userAvatar}
            style={styles.avatar}
            onError={() => setImageError(true)}
          />
          {imageError && (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={20} color={colors.neutral[400]} />
            </View>
          )}

          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <ThemedText style={styles.userName}>{review.userName}</ThemedText>
              {review.isVerified && (
                <Ionicons name="checkmark-circle" size={14} color={colors.successScale[400]} />
              )}
            </View>
            <ThemedText style={styles.reviewDate}>{formatDate(review.date)}</ThemedText>
          </View>
        </View>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <StarRating rating={review.rating} size="small" />
        </View>
      </View>

      {/* Review Text */}
      <View style={styles.reviewContent}>
        <ThemedText style={styles.reviewText}>{review.reviewText}</ThemedText>
      </View>

      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagesContainer}
          contentContainerStyle={styles.imagesContent}
        >
          {review.images.map((img) => (
            <CachedImage
              key={img.id}
              source={img.uri}
              style={styles.reviewImage}
            />
          ))}
        </ScrollView>
      )}

      {/* Store Response */}
      {showStoreResponse && review.storeResponse && (
        <View style={styles.storeResponse}>
          <View style={styles.storeResponseHeader}>
            <Ionicons name="storefront" size={16} color={colors.lightMustard} />
            <ThemedText style={styles.storeResponseTitle}>
              Response from {review.storeResponse.responderName}
            </ThemedText>
            <ThemedText style={styles.storeResponseDate}>
              {formatDate(review.storeResponse.date)}
            </ThemedText>
          </View>
          <ThemedText style={styles.storeResponseText}>
            {review.storeResponse.responseText}
          </ThemedText>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <AnimatedPressable
          style={styles.actionButton}
          onPress={handleLike}
          disabled={isLikeLoading}
        >
          <Animated.View style={likeAnimatedStyle}>
            <Ionicons
              name={isLiked ? "thumbs-up" : "thumbs-up-outline"}
              size={16}
              color={isLiked ? colors.lightMustard : colors.neutral[500]}
            />
          </Animated.View>
          <ThemedText style={[
            styles.actionText,
            isLiked && styles.actionTextActive
          ]}>
            {likeCount}
          </ThemedText>
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.actionButton}
          onPress={handleHelpful}
          disabled={isHelpfulLoading}
        >
          <Animated.View style={helpfulAnimatedStyle}>
            <Ionicons
              name={isHelpful ? "heart" : "heart-outline"}
              size={16}
              color={isHelpful ? colors.error : colors.neutral[500]}
            />
          </Animated.View>
          <ThemedText style={[
            styles.actionText,
            isHelpful && { color: colors.error }
          ]}>
            Helpful ({helpfulCount})
          </ThemedText>
        </AnimatedPressable>

        <Pressable style={styles.actionButton} onPress={handleReport}>
          <Ionicons name="flag-outline" size={16} color={colors.neutral[500]} />
          <ThemedText style={styles.actionText}>Report</ThemedText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.tint.coolGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarFallback: {
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  reviewDate: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  reviewContent: {
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.neutral[700],
  },
  imagesContainer: {
    marginBottom: 12,
  },
  imagesContent: {
    gap: 8,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  storeResponse: {
    backgroundColor: colors.tint.coolGray,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.lightMustard,
  },
  storeResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  storeResponseTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.lightMustard,
    flex: 1,
  },
  storeResponseDate: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  storeResponseText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.neutral[700],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  actionTextActive: {
    color: colors.lightMustard,
    fontWeight: '600',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amberLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warningScale[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default React.memo(ReviewCard);
