// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import RatingStars from './RatingStars';
import { Review } from '@/types/review.types';
import reviewService from '@/services/reviewsApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ReviewItemProps {
  review: Review;
  onHelpfulPress?: (reviewId: string, newHelpfulCount: number) => void;
  onReportPress?: (reviewId: string) => void;
  onEditPress?: (review: Review) => void;
  onDeletePress?: (reviewId: string) => void;
  showActions?: boolean;
  isOwnReview?: boolean;
  /** Cashback earned for this review (optional) */
  cashbackEarned?: number;
  /** Currency symbol - deprecated, use useRegion hook instead */
  currency?: string;
}

function ReviewItem({
  review,
  onHelpfulPress,
  onReportPress,
  onEditPress,
  onDeletePress,
  showActions = true,
  isOwnReview = false,
  cashbackEarned,
  currency: currencyProp,
}: ReviewItemProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currency = currencyProp || getCurrencySymbol();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHelpful, setIsHelpful] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpful || 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const isMounted = useIsMounted();

  // Get user info - handle different backend response formats
  const userName = review.user?.profile?.name || review.user?.name || 'Anonymous';
  const userAvatar = review.user?.profile?.avatar || review.user?.avatar;

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  // Check if text should be truncated
  const shouldTruncate = review.comment.length > 200;
  const displayText = isExpanded || !shouldTruncate
    ? review.comment
    : `${review.comment.substring(0, 200)}...`;

  const handleHelpfulPress = async () => {
    if (isProcessing || isHelpful) return;

    setIsProcessing(true);
    try {
      const reviewId = review._id || review.id;
      if (!reviewId) {
        throw new Error('Review ID not found');
      }

      const response = await reviewService.markReviewHelpful(reviewId);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setIsHelpful(true);
        const newCount = response.data.helpful;
        setHelpfulCount(newCount);
        onHelpfulPress?.(reviewId, newCount);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to mark review as helpful');
    } finally {
      if (!isMounted()) return;
      setIsProcessing(false);
    }
  };

  const handleReportPress = () => {
    platformAlertConfirm(
      'Report Review',
      'Why are you reporting this review?\n\nThis will report the review as spam.',
      () => reportReview('spam'),
      'Report'
    );
  };

  const reportReview = async (reason: string) => {
    try {
      const reviewId = review._id || review.id;
      if (!reviewId) return;

      await reviewService.reportReview(reviewId, reason);
      platformAlertSimple('Success', 'Review reported successfully');
      onReportPress?.(reviewId);
    } catch (error) {
      platformAlertSimple('Error', 'Failed to report review');
    }
  };

  const handleDeletePress = () => {
    platformAlertDestructive('Delete Review', 'Are you sure you want to delete this review?', () => {
            const reviewId = review._id || review.id;
            if (reviewId) {
              onDeletePress?.(reviewId);
            }
          }, 'Delete');
  };

  return (
    <ThemedView style={styles.container}>
      {/* User Info */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {userAvatar ? (
              <CachedImage source={userAvatar} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <ThemedText style={styles.avatarText}>
                  {(userName || '?').charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <ThemedText style={styles.userName}>{userName}</ThemedText>
              {review.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.lightMustard} />
                  <ThemedText style={styles.verifiedText}>Verified</ThemedText>
                </View>
              )}
            </View>

            <View style={styles.ratingRow}>
              <RatingStars rating={review.rating} size={14} />
              <ThemedText style={styles.date}>{formatDate(review.createdAt)}</ThemedText>
            </View>
          </View>
        </View>

        {/* Action Menu for own reviews */}
        {isOwnReview && (
          <View style={styles.actionButtons}>
            <Pressable
              style={styles.iconButton}
              onPress={() => onEditPress?.(review)}
             
            >
              <Ionicons name="create-outline" size={20} color={colors.brand.purpleLight} />
            </Pressable>
            <Pressable
              style={styles.iconButton}
              onPress={handleDeletePress}
             
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Review Title */}
      {review.title && (
        <ThemedText style={styles.title}>{review.title}</ThemedText>
      )}

      {/* Review Comment */}
      <ThemedText style={styles.comment}>{displayText}</ThemedText>

      {/* Read More/Less Button */}
      {shouldTruncate && (
        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
         
        >
          <ThemedText style={styles.readMore}>
            {isExpanded ? 'Read Less' : 'Read More'}
          </ThemedText>
        </Pressable>
      )}

      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagesContainer}
          contentContainerStyle={styles.imagesContent}
        >
          {review.images.map((imageUrl, index) => (
            <Pressable key={index}>
              <CachedImage source={imageUrl} style={styles.reviewImage} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Actions */}
      {showActions && (
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionButton, isHelpful && styles.actionButtonActive]}
            onPress={handleHelpfulPress}
            disabled={isProcessing || isHelpful}
           
          >
            <Ionicons
              name={isHelpful ? 'thumbs-up' : 'thumbs-up-outline'}
              size={16}
              color={isHelpful ? colors.brand.purpleLight : colors.neutral[500]}
            />
            <ThemedText style={[styles.actionText, isHelpful && styles.actionTextActive]}>
              Helpful ({helpfulCount})
            </ThemedText>
          </Pressable>

          {!isOwnReview && (
            <Pressable
              style={styles.actionButton}
              onPress={handleReportPress}
             
            >
              <Ionicons name="flag-outline" size={16} color={colors.neutral[500]} />
              <ThemedText style={styles.actionText}>Report</ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {/* Cashback Earned Badge */}
      {cashbackEarned && cashbackEarned > 0 && (
        <View style={styles.cashbackBadge}>
          <Ionicons name="wallet" size={14} color={colors.lightMustard} />
          <ThemedText style={styles.cashbackText}>
            Earned {currency}{cashbackEarned} cashback
          </ThemedText>
        </View>
      )}
    </ThemedView>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightMustard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
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
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.linen,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: colors.lightMustard,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.neutral[700],
    marginBottom: 8,
  },
  readMore: {
    fontSize: 13,
    color: colors.brand.purpleLight,
    fontWeight: '600',
    marginBottom: 12,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  imagesContent: {
    gap: 8,
  },
  reviewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  actionButtonActive: {
    backgroundColor: colors.indigoMist,
  },
  actionText: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  actionTextActive: {
    color: colors.brand.purpleLight,
  },
  // Cashback earned badge
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.linen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  cashbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.lightMustard,
  },
});

export default React.memo(ReviewItem);
