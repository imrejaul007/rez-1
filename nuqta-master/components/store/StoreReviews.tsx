import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { storeSearchService, Review, ReviewStats } from '@/services/storeSearchService';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// Review interface is now imported from storeSearchService

interface StoreReviewsProps {
  visible: boolean;
  onClose: () => void;
  storeName: string;
  storeId: string;
  averageRating: number;
  totalReviews: number;
  onAddReview?: () => void;
}

const StoreReviews: React.FC<StoreReviewsProps> = ({
  visible,
  onClose,
  storeName,
  storeId,
  averageRating,
  totalReviews,
  onAddReview,
}) => {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingStats, setRatingStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isMounted = useIsMounted();

  // Load reviews when component mounts or filters change
  useEffect(() => {
    if (visible && storeId) {
      loadReviews();
    }
  }, [visible, storeId, selectedRating, sortBy]);

  const loadReviews = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      const response = await storeSearchService.getStoreReviews({
        storeId,
        page: pageNum,
        limit: 20,
        rating: selectedRating || undefined,
        sortBy: sortBy as any,
      });

      if (response.success) {
        if (append) {
          if (!isMounted()) return;
          setReviews(prev => [...prev, ...response.data.reviews]);
        } else {
          setReviews(response.data.reviews);
        }
        if (!isMounted()) return;
        setRatingStats(response.data.ratingStats);
        setHasMore(response.data.pagination.hasNextPage);
        setPage(pageNum);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to load reviews. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadReviews(page + 1, true);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      const response = await storeSearchService.markReviewHelpful(reviewId);
      if (response.success) {
        // Update the review in the list
        if (!isMounted()) return;
        setReviews(prev => prev.map(review => 
          review._id === reviewId 
            ? { ...review, helpful: response.data.helpful }
            : review
        ));
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to mark review as helpful.');
    }
  };

  const ratingDistribution = ratingStats?.distribution || {
    5: Math.floor(totalReviews * 0.6),
    4: Math.floor(totalReviews * 0.2),
    3: Math.floor(totalReviews * 0.1),
    2: Math.floor(totalReviews * 0.05),
    1: Math.floor(totalReviews * 0.05),
  };

  const getSortedReviews = () => {
    const sorted = [...reviews];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'highest':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return sorted.sort((a, b) => a.rating - b.rating);
      default:
        return sorted;
    }
  };

  const getFilteredReviews = () => {
    const sorted = getSortedReviews();
    if (selectedRating === null) {
      return sorted;
    }
    return sorted.filter(review => review.rating === selectedRating);
  };

  const renderStars = (rating: number, size: number = 16) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? "star" : "star-outline"}
        size={size}
        color={colors.brand.goldBright}
        style={styles.star}
      />
    ));
  };

  const renderRatingBar = (rating: number, count: number) => {
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    
    return (
      <Pressable
        style={styles.ratingBar}
        onPress={() => setSelectedRating(selectedRating === rating ? null : rating)}
       
      >
        <Text style={styles.ratingNumber}>{rating}</Text>
        <Ionicons name="star" size={12} color={colors.brand.goldBright} />
        <View style={styles.ratingBarContainer}>
          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.ratingCount}>{count}</Text>
      </Pressable>
    );
  };

  const renderReview = (review: Review) => (
    <View key={review._id} style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewUser}>
          {review.user.profile.avatar ? (
            <CachedImage source={review.user.profile.avatar} style={styles.userAvatar} />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.userAvatarText}>{review.user.profile.name.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.reviewUserInfo}>
            <View style={styles.reviewUserHeader}>
              <Text style={styles.userName}>{review.user.profile.name}</Text>
              {review.verified && (
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              )}
            </View>
            <View style={styles.reviewRating}>
              {renderStars(review.rating, 14)}
              <Text style={styles.reviewDate}>
                {new Date(review.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      {review.title && (
        <Text style={styles.reviewTitle}>{review.title}</Text>
      )}
      
      <Text style={styles.reviewComment}>{review.comment}</Text>
      
      {review.images && review.images.length > 0 && (
        <View style={styles.reviewImages}>
          {review.images.map((image, index) => (
            <CachedImage key={index} source={image} style={styles.reviewImage} />
          ))}
        </View>
      )}
      
      <View style={styles.reviewActions}>
        <Pressable 
          style={styles.helpfulButton}
          onPress={() => handleMarkHelpful(review._id)}
        >
          <Ionicons name="thumbs-up-outline" size={16} color={colors.midGray} />
          <Text style={styles.helpfulText}>Helpful ({review.helpful})</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderSortOptions = () => (
    <View style={styles.sortOptions}>
      {[
        { id: 'newest', label: 'Newest' },
        { id: 'oldest', label: 'Oldest' },
        { id: 'highest', label: 'Highest Rating' },
        { id: 'lowest', label: 'Lowest Rating' },
      ].map(option => (
        <Pressable
          key={option.id}
          style={[
            styles.sortOption,
            sortBy === option.id && styles.sortOptionActive,
          ]}
          onPress={() => setSortBy(option.id as any)}
        >
          <Text
            style={[
              styles.sortOptionText,
              sortBy === option.id && styles.sortOptionTextActive,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reviews & Ratings</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.darkGray} />
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Store Rating Summary */}
          <View style={styles.ratingSummary}>
            <View style={styles.ratingOverview}>
              <Text style={styles.ratingNumber}>{averageRating.toFixed(1)}</Text>
              <View style={styles.ratingStars}>
                {renderStars(Math.round(averageRating), 20)}
              </View>
              <Text style={styles.totalReviews}>{totalReviews} reviews</Text>
            </View>
            
            <View style={styles.ratingBreakdown}>
              {[5, 4, 3, 2, 1].map(rating => 
                renderRatingBar(rating, ratingDistribution[rating as keyof typeof ratingDistribution])
              )}
            </View>
          </View>

          {/* Sort Options */}
          {renderSortOptions()}

          {/* Reviews List */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.reviewsTitle}>
                Reviews {selectedRating && `(${selectedRating} stars)`}
              </Text>
              {onAddReview && (
                <Pressable style={styles.addReviewButton} onPress={onAddReview}>
                  <Ionicons name="add" size={16} color="#7B61FF" />
                  <Text style={styles.addReviewText}>Add Review</Text>
                </Pressable>
              )}
            </View>

            {loading && reviews.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7B61FF" />
                <Text style={styles.loadingText}>Loading reviews...</Text>
              </View>
            ) : reviews.length > 0 ? (
              <>
                {reviews.map(renderReview)}
                {hasMore && (
                  <Pressable 
                    style={styles.loadMoreButton}
                    onPress={handleLoadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#7B61FF" />
                    ) : (
                      <Text style={styles.loadMoreText}>Load More Reviews</Text>
                    )}
                  </Pressable>
                )}
              </>
            ) : (
              <View style={styles.noReviews}>
                <Text style={styles.noReviewsIcon}>📝</Text>
                <Text style={styles.noReviewsTitle}>No reviews found</Text>
                <Text style={styles.noReviewsSubtitle}>
                  {selectedRating 
                    ? `No ${selectedRating}-star reviews found`
                    : 'Be the first to review this store'
                  }
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
  },
  content: {
    flex: 1,
  },
  ratingSummary: {
    backgroundColor: colors.background.primary,
    padding: 16,
    marginBottom: 16,
  },
  ratingOverview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  star: {
    marginHorizontal: 2,
  },
  totalReviews: {
    fontSize: 16,
    color: colors.midGray,
  },
  ratingBreakdown: {
    gap: 8,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: colors.brand.goldBright,
    borderRadius: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: colors.midGray,
    minWidth: 30,
    textAlign: 'right',
  },
  sortOptions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: colors.background.primary,
  },
  sortOptionActive: {
    backgroundColor: '#7B61FF',
    borderColor: '#7B61FF',
  },
  sortOptionText: {
    fontSize: 14,
    color: colors.midGray,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: colors.background.primary,
  },
  reviewsSection: {
    backgroundColor: colors.background.primary,
    padding: 16,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#7B61FF',
    backgroundColor: colors.background.primary,
  },
  addReviewText: {
    fontSize: 14,
    color: '#7B61FF',
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewHeader: {
    marginBottom: 12,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7B61FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginRight: 8,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: colors.midGray,
    marginLeft: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.darkGray,
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  helpfulText: {
    fontSize: 12,
    color: colors.midGray,
    marginLeft: 4,
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noReviewsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noReviewsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 8,
  },
  noReviewsSubtitle: {
    fontSize: 14,
    color: colors.midGray,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.midGray,
    marginTop: 12,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  loadMoreText: {
    fontSize: 16,
    color: '#7B61FF',
    fontWeight: '600',
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 8,
  },
  reviewImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
});

export default React.memo(StoreReviews);
