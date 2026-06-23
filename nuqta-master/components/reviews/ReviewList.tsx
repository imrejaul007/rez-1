// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ReviewItem from './ReviewItem';
import RatingStars from './RatingStars';
import { Review, ReviewFilters, ReviewStats } from '@/types/review.types';
import reviewService from '@/services/reviewsApi';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ReviewListProps {
  storeId: string;
  onWriteReviewPress?: () => void;
  showWriteButton?: boolean;
  currentUserId?: string;
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
type FilterRating = 'all' | 1 | 2 | 3 | 4 | 5;

function ReviewList({
  storeId,
  onWriteReviewPress,
  showWriteButton = true,
  currentUserId
}: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingStats, setRatingStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterRating, setFilterRating] = useState<FilterRating>('all');
  const isMounted = useIsMounted();

  const loadReviews = useCallback(async (
    page: number = 1,
    isRefresh: boolean = false
  ) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const filters: ReviewFilters = {
        page,
        limit: 10,
        sortBy,
      };

      if (filterRating !== 'all') {
        filters.rating = filterRating;
      }

      const response = await reviewService.getStoreReviews(storeId, filters);

      if (response.success && response.data) {
        const newReviews = response.data.reviews;

        if (page === 1) {
          if (!isMounted()) return;
          setReviews(newReviews);
        } else {
          setReviews(prev => [...prev, ...newReviews]);
        }

        if (!isMounted()) return;
        setRatingStats(response.data.ratingStats);
        setCurrentPage(page);
        setHasNextPage(response.data.pagination.hasNextPage);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [storeId, sortBy, filterRating]);

  useEffect(() => {
    loadReviews(1);
  }, [loadReviews]);

  const handleRefresh = () => {
    loadReviews(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasNextPage) {
      loadReviews(currentPage + 1);
    }
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  const handleFilterChange = (rating: FilterRating) => {
    setFilterRating(rating);
    setCurrentPage(1);
  };

  const renderHeader = () => (
    <View>
      {/* Rating Summary */}
      {ratingStats && (
        <ThemedView style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <View style={styles.averageRating}>
              <ThemedText style={styles.ratingNumber}>
                {ratingStats.average.toFixed(1)}
              </ThemedText>
              <View style={styles.starsContainer}>
                <RatingStars rating={ratingStats.average} size={20} />
              </View>
              <ThemedText style={styles.totalReviews}>
                {ratingStats.count} verified reviews
              </ThemedText>
            </View>

            {showWriteButton && onWriteReviewPress && (
              <Pressable
                style={styles.writeButton}
                onPress={onWriteReviewPress}
               
              >
                <Ionicons name="create-outline" size={18} color={colors.background.primary} />
                <ThemedText style={styles.writeButtonText}>Write Review</ThemedText>
              </Pressable>
            )}
          </View>

          {/* Rating Distribution */}
          <View style={styles.distributionContainer}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingStats.distribution[star as keyof typeof ratingStats.distribution] || 0;
              const percentage = ratingStats.count > 0 ? (count / ratingStats.count) * 100 : 0;

              return (
                <Pressable
                  key={star}
                  style={styles.distributionRow}
                  onPress={() => handleFilterChange(star as FilterRating)}
                 
                >
                  <ThemedText style={styles.starLabel}>{star} ★</ThemedText>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${percentage}%` }]} />
                  </View>
                  <ThemedText style={styles.countLabel}>{count}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>
      )}

      {/* Unified Filters (Horizontal Scroll) */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {/* Sort Dropdown Chip */}
          <Pressable
            style={[styles.filterChip, styles.sortChip]}
            onPress={() => {
              // Cycle through sort options or show modal (simplified cycling for now)
              const options: SortOption[] = ['newest', 'helpful', 'highest', 'lowest'];
              const currentIndex = options.indexOf(sortBy);
              const nextIndex = (currentIndex + 1) % options.length;
              handleSortChange(options[nextIndex]);
            }}
           
          >
            <Ionicons name="swap-vertical" size={16} color={colors.neutral[600]} />
            <ThemedText style={styles.filterChipText}>
              Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
            </ThemedText>
            <Ionicons name="chevron-down" size={12} color={colors.neutral[400]} />
          </Pressable>

          {/* Divider */}
          <View style={styles.filterDivider} />

          {/* Rating Filter Chips */}
          {(['all', 5, 4, 3, 2, 1] as FilterRating[]).map((rating) => (
            <Pressable
              key={rating}
              style={[
                styles.filterChip,
                filterRating === rating && styles.filterChipActive
              ]}
              onPress={() => handleFilterChange(rating)}
             
            >
              <ThemedText
                style={[
                  styles.filterChipText,
                  filterRating === rating && styles.filterChipTextActive
                ]}
              >
                {rating === 'all' ? 'All Reviews' : `${rating} ★`}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.brand.green} />
      </View>
      <ThemedText style={styles.emptyTitle}>No Reviews Yet</ThemedText>
      <ThemedText style={styles.emptyText}>
        Share your experience with this product
      </ThemedText>
      {showWriteButton && onWriteReviewPress && (
        <Pressable
          style={styles.emptyButton}
          onPress={onWriteReviewPress}
         
        >
          <Ionicons name="pencil" size={18} color={colors.background.primary} style={{ marginRight: 8 }} />
          <ThemedText style={styles.emptyButtonText}>Write First Review</ThemedText>
        </Pressable>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.brand.green} />
      </View>
    );
  };

  const renderReviewItem = useCallback(({ item }: { item: Review }) => (
    <ReviewItem
      review={item}
      isOwnReview={currentUserId ? item.user._id === currentUserId || item.user.id === currentUserId : false}
    />
  ), [currentUserId]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.green} />
        <ThemedText style={styles.loadingText}>Loading reviews...</ThemedText>
      </View>
    );
  }

  return (
    <FlashList
      data={reviews}
      keyExtractor={(item) => item._id || item.id || Math.random().toString()}
      renderItem={renderReviewItem}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyState}
      ListFooterComponent={renderFooter}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      removeClippedSubviews={Platform.OS !== 'web'}
      maxToRenderPerBatch={10}
      windowSize={5}
      initialNumToRender={8}
      estimatedItemSize={150}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.brand.green]}
          tintColor={colors.brand.green}
        />
      }
      contentContainerStyle={[
        styles.listContent,
        reviews.length === 0 && styles.listContentEmpty
      ]}
      showsVerticalScrollIndicator={false}
    />
  );
}



const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[500],
  },
  summaryContainer: {
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.neutral[100],
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  averageRating: {
    flex: 1,
  },
  ratingNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.neutral[900],
    marginBottom: 4,
    lineHeight: 48,
  },
  starsContainer: {
    marginBottom: 6,
  },
  totalReviews: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  writeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brand.green,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    shadowColor: colors.brand.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  writeButtonText: {
    fontSize: 14,
    color: colors.background.primary,
    fontWeight: '600',
  },
  distributionContainer: {
    gap: 10,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  starLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[600],
    width: 36,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: 100,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.warningScale[400],
    borderRadius: 100,
  },
  countLabel: {
    fontSize: 12,
    color: colors.neutral[400],
    width: 32,
    textAlign: 'right',
    fontWeight: '500',
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filtersScrollContent: {
    paddingRight: 16,
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortChip: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    paddingRight: 12,
  },
  filterChipActive: {
    backgroundColor: colors.brand.green,
    borderColor: colors.brand.green,
  },
  filterChipText: {
    fontSize: 13,
    color: colors.neutral[600],
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.background.primary,
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.neutral[200],
    marginHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.neutral[500],
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.green,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
    shadowColor: colors.brand.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    fontSize: 15,
    color: colors.background.primary,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default React.memo(ReviewList);
