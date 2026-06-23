/**
 * EventReviewCard Component - Displays a single event review
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { EVENT_COLORS } from '@/constants/EventColors';
import StarRating from './StarRating';

export interface EventReview {
  id: string;
  rating: number;
  title: string;
  review: string;
  helpfulCount: number;
  isVerifiedBooking: boolean;
  createdAt: string;
  user: {
    id?: string;
    name: string;
    profilePicture?: string;
  };
  response?: {
    text: string;
    respondedAt: string;
  };
}

interface EventReviewCardProps {
  review: EventReview;
  onHelpfulPress?: (reviewId: string) => void;
  isOwnReview?: boolean;
  onEditPress?: (review: EventReview) => void;
  onDeletePress?: (reviewId: string) => void;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
};

const EventReviewCard: React.FC<EventReviewCardProps> = ({
  review,
  onHelpfulPress,
  isOwnReview = false,
  onEditPress,
  onDeletePress,
}) => {
  const [isHelpfulPressed, setIsHelpfulPressed] = useState(false);

  const handleHelpfulPress = () => {
    if (!isHelpfulPressed && onHelpfulPress) {
      setIsHelpfulPressed(true);
      onHelpfulPress(review.id);
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {review.user.profilePicture ? (
            <CachedImage
              source={review.user.profilePicture}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{getInitials(review.user.name)}</Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{review.user.name}</Text>
              {review.isVerifiedBooking && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={EVENT_COLORS.verified} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
          </View>
        </View>
        {isOwnReview && (
          <View style={styles.actionButtons}>
            {onEditPress && (
              <Pressable
                onPress={() => onEditPress(review)}
                style={styles.actionButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil-outline" size={18} color={EVENT_COLORS.textMuted} />
              </Pressable>
            )}
            {onDeletePress && (
              <Pressable
                onPress={() => onDeletePress(review.id)}
                style={styles.actionButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color={EVENT_COLORS.error} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Rating */}
      <View style={styles.ratingRow}>
        <StarRating rating={review.rating} size={16} />
      </View>

      {/* Review Content */}
      <Text style={styles.reviewTitle}>{review.title}</Text>
      <Text style={styles.reviewText}>{review.review}</Text>

      {/* Organizer Response */}
      {review.response && (
        <View style={styles.responseContainer}>
          <View style={styles.responseHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={EVENT_COLORS.primary} />
            <Text style={styles.responseLabel}>Response from organizer</Text>
          </View>
          <Text style={styles.responseText}>{review.response.text}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.helpfulButton,
            isHelpfulPressed && styles.helpfulButtonPressed
          ]}
          onPress={handleHelpfulPress}
          disabled={isHelpfulPressed}
         
        >
          <Ionicons
            name={isHelpfulPressed ? 'thumbs-up' : 'thumbs-up-outline'}
            size={16}
            color={isHelpfulPressed ? EVENT_COLORS.primary : EVENT_COLORS.textMuted}
          />
          <Text style={[
            styles.helpfulText,
            isHelpfulPressed && styles.helpfulTextPressed
          ]}>
            Helpful ({review.helpfulCount + (isHelpfulPressed ? 1 : 0)})
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: EVENT_COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: EVENT_COLORS.border,
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: EVENT_COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: EVENT_COLORS.primary,
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: EVENT_COLORS.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: EVENT_COLORS.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '500',
    color: EVENT_COLORS.verified,
  },
  reviewDate: {
    fontSize: 12,
    color: EVENT_COLORS.textMuted,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  ratingRow: {
    marginBottom: 8,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: EVENT_COLORS.text,
    marginBottom: 6,
  },
  reviewText: {
    fontSize: 14,
    color: EVENT_COLORS.textSecondary,
    lineHeight: 20,
  },
  responseContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: EVENT_COLORS.surface,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: EVENT_COLORS.primary,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: EVENT_COLORS.primary,
  },
  responseText: {
    fontSize: 13,
    color: EVENT_COLORS.textSecondary,
    lineHeight: 18,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: EVENT_COLORS.border,
    flexDirection: 'row',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: EVENT_COLORS.surface,
  },
  helpfulButtonPressed: {
    backgroundColor: EVENT_COLORS.primaryLight,
  },
  helpfulText: {
    fontSize: 13,
    color: EVENT_COLORS.textMuted,
  },
  helpfulTextPressed: {
    color: EVENT_COLORS.primary,
    fontWeight: '500',
  },
});

export default React.memo(EventReviewCard);
