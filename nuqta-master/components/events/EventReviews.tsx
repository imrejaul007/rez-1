/**
 * EventReviews Component - Reviews section for event detail page
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView} from 'react-native';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { EVENT_COLORS } from '@/constants/EventColors';
import { useIsAuthenticated } from '@/stores/selectors';
import eventReviewApi, { EventReviewData } from '@/services/eventReviewApi';
import StarRating from './StarRating';
import EventReviewCard from './EventReviewCard';
import EventReviewForm from './EventReviewForm';
import { useIsMounted } from '@/hooks/useIsMounted';

interface EventReviewsProps {
  eventId: string;
  eventTitle: string;
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';

const EventReviews: React.FC<EventReviewsProps> = ({ eventId, eventTitle }) => {
  const isAuthenticated = useIsAuthenticated();
  const [reviews, setReviews] = useState<EventReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<EventReviewData | null>(null);
  const [userReview, setUserReview] = useState<EventReviewData | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [hasBooking, setHasBooking] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const isMounted = useIsMounted();
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    hasMore: false,
  });
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
  });

  const loadReviews = useCallback(async (page: number = 1, sort: SortOption = sortBy) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const data = await eventReviewApi.getEventReviews(eventId, page, 10, sort);

      if (page === 1) {
        if (!isMounted()) return;
        setReviews(data.reviews);
      } else {
        setReviews(prev => [...prev, ...data.reviews]);
      }
      if (!isMounted()) return;
      setPagination(data.pagination);
      setSummary(data.summary);
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load reviews');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [eventId, sortBy]);

  const loadUserReview = useCallback(async () => {
    if (!isAuthenticated) {
      setCanReview(false);
      setHasBooking(false);
      return;
    }

    try {
      const data = await eventReviewApi.getUserReview(eventId);
      if (!isMounted()) return;
      setUserReview(data.review);
      setCanReview(data.canReview);
      setHasBooking(data.hasBooking);
    } catch (err) {
      // silently handle
    }
  }, [eventId, isAuthenticated]);

  useEffect(() => {
    loadReviews();
    loadUserReview();
  }, [loadReviews, loadUserReview]);

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    loadReviews(1, newSort);
  };

  const handleLoadMore = () => {
    if (pagination.hasMore && !loadingMore) {
      loadReviews(pagination.current + 1);
    }
  };

  const handleSubmitReview = async (data: { rating: number; title: string; review: string }) => {
    try {
      if (editingReview) {
        await eventReviewApi.updateReview(editingReview.id, data);
        platformAlertSimple('Success', 'Your review has been updated');
      } else {
        await eventReviewApi.submitReview(eventId, data);
        platformAlertSimple('Success', 'Thank you for your review!');
      }
      if (!isMounted()) return;
      setShowReviewForm(false);
      setEditingReview(null);
      loadReviews(1);
      loadUserReview();
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to submit review');
    }
  };

  const handleEditReview = (review: EventReviewData) => {
    setEditingReview(review);
    setShowReviewForm(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    platformAlertDestructive(
      'Delete Review',
      'Are you sure you want to delete your review? This cannot be undone.',
      async () => {
        try {
          await eventReviewApi.deleteReview(reviewId);
          platformAlertSimple('Success', 'Your review has been deleted');
          loadReviews(1);
          loadUserReview();
        } catch (err: any) {
          platformAlertSimple('Error', err.message || 'Failed to delete review');
        }
      },
      'Delete'
    );
  };

  const handleHelpfulPress = async (reviewId: string) => {
    try {
      await eventReviewApi.markReviewHelpful(reviewId);
    } catch (err) {
      // silently handle
    }
  };

  const renderRatingBar = (stars: number, count: number) => {
    const percentage = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;

    return (
      <View key={stars} style={styles.ratingBarRow}>
        <Text style={styles.ratingBarLabel}>{stars}</Text>
        <Ionicons name="star" size={12} color={EVENT_COLORS.star} />
        <View style={styles.ratingBarContainer}>
          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    );
  };

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: 'newest', label: 'Newest' },
    { id: 'highest', label: 'Highest Rated' },
    { id: 'lowest', label: 'Lowest Rated' },
    { id: 'helpful', label: 'Most Helpful' },
  ];

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Reviews</Text>
        {isAuthenticated && canReview && !userReview && (
          <Pressable
            style={styles.writeReviewButton}
            onPress={() => setShowReviewForm(true)}
           
          >
            <Ionicons name="create-outline" size={18} color={EVENT_COLORS.background} />
            <Text style={styles.writeReviewText}>Write Review</Text>
          </Pressable>
        )}
      </View>

      {/* Rating Summary */}
      {summary.totalReviews > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryLeft}>
            <Text style={styles.averageRating}>{summary.averageRating.toFixed(1)}</Text>
            <StarRating rating={summary.averageRating} size={20} />
            <Text style={styles.totalReviews}>{summary.totalReviews} reviews</Text>
          </View>
          <View style={styles.summaryRight}>
            {[5, 4, 3, 2, 1].map(stars => renderRatingBar(stars, summary.distribution[stars]))}
          </View>
        </View>
      )}

      {/* User's Review */}
      {userReview && (
        <View style={styles.userReviewSection}>
          <Text style={styles.userReviewLabel}>Your Review</Text>
          <EventReviewCard
            review={userReview}
            isOwnReview
            onEditPress={handleEditReview}
            onDeletePress={handleDeleteReview}
          />
        </View>
      )}

      {/* Sort Options */}
      {reviews.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortContainer}>
          {sortOptions.map(option => (
            <Pressable
              key={option.id}
              style={[styles.sortChip, sortBy === option.id && styles.sortChipActive]}
              onPress={() => handleSortChange(option.id)}
            >
              <Text style={[styles.sortChipText, sortBy === option.id && styles.sortChipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={EVENT_COLORS.primary} />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={EVENT_COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => loadReviews()}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {/* Reviews List */}
      {!loading && !error && (
        <>
          {reviews.length > 0 ? (
            <View style={styles.reviewsList}>
              {reviews
                .filter(r => r.id !== userReview?.id)
                .map(review => (
                  <EventReviewCard
                    key={review.id}
                    review={review}
                    onHelpfulPress={handleHelpfulPress}
                  />
                ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={EVENT_COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No reviews yet</Text>
              <Text style={styles.emptySubtitle}>
                {hasBooking
                  ? 'Be the first to review this event!'
                  : 'Book this event to leave a review'}
              </Text>
            </View>
          )}

          {/* Load More */}
          {pagination.hasMore && (
            <Pressable
              style={styles.loadMoreButton}
              onPress={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={EVENT_COLORS.primary} />
              ) : (
                <Text style={styles.loadMoreText}>Load More Reviews</Text>
              )}
            </Pressable>
          )}
        </>
      )}

      {/* Review Form Modal */}
      <Modal
        visible={showReviewForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowReviewForm(false);
          setEditingReview(null);
        }}
      >
        <EventReviewForm
          onSubmit={handleSubmitReview}
          onCancel={() => {
            setShowReviewForm(false);
            setEditingReview(null);
          }}
          initialData={editingReview ? {
            rating: editingReview.rating,
            title: editingReview.title,
            review: editingReview.review,
          } : undefined}
          isEditing={!!editingReview}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: EVENT_COLORS.text,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EVENT_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  writeReviewText: {
    fontSize: 13,
    fontWeight: '600',
    color: EVENT_COLORS.background,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: EVENT_COLORS.surface,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryLeft: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: EVENT_COLORS.border,
  },
  averageRating: {
    fontSize: 36,
    fontWeight: '700',
    color: EVENT_COLORS.text,
  },
  totalReviews: {
    fontSize: 12,
    color: EVENT_COLORS.textMuted,
    marginTop: 4,
  },
  summaryRight: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: 'center',
    gap: 4,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingBarLabel: {
    fontSize: 12,
    color: EVENT_COLORS.textMuted,
    width: 12,
  },
  ratingBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: EVENT_COLORS.border,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: EVENT_COLORS.star,
    borderRadius: 3,
  },
  ratingBarCount: {
    fontSize: 11,
    color: EVENT_COLORS.textMuted,
    width: 24,
    textAlign: 'right',
  },
  userReviewSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  userReviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: EVENT_COLORS.primary,
    marginBottom: 8,
  },
  sortContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: EVENT_COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: EVENT_COLORS.border,
  },
  sortChipActive: {
    backgroundColor: EVENT_COLORS.text,
    borderColor: EVENT_COLORS.text,
  },
  sortChipText: {
    fontSize: 13,
    color: EVENT_COLORS.textMuted,
  },
  sortChipTextActive: {
    color: EVENT_COLORS.background,
    fontWeight: '500',
  },
  reviewsList: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: EVENT_COLORS.textMuted,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 14,
    color: EVENT_COLORS.error,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: EVENT_COLORS.primary,
    borderRadius: 20,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: EVENT_COLORS.background,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: EVENT_COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: EVENT_COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: EVENT_COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: EVENT_COLORS.border,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: EVENT_COLORS.primary,
  },
});

export default React.memo(EventReviews);
