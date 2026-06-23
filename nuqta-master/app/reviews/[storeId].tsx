// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Reviews Page - Standalone store reviews page
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ReviewsListSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import reviewsApi from '@/services/reviewsApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface Review {
  _id: string;
  userId: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
  rating: number;
  comment: string;
  images?: string[];
  createdAt: string;
  helpful: number;
  verified: boolean;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

function ReviewsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const storeId = params.storeId as string;

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [storeName, setStoreName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch reviews
  const fetchReviews = useCallback(async (isRefresh = false, pageNum = 1) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      if (pageNum === 1) setError(null);

      const response = await reviewsApi.getTargetReviews('store', storeId, {
        limit: 20,
        page: pageNum,
      });

      if (response.success && response.data) {
        const newReviews = response.data.reviews || [];
        if (pageNum === 1) {
          setReviews(newReviews);
        } else {
          if (!isMounted()) return;
          setReviews(prev => [...prev, ...newReviews]);
        }
        if (!isMounted()) return;
        setStats(response.data.stats || null);
        if (!isMounted()) return;
        setPage(pageNum);
        if (!isMounted()) return;
        setHasMore(newReviews.length >= 20);

        if (newReviews.length > 0 && !storeName) {
          if (!isMounted()) return;
          setStoreName('Store Reviews');
        }
      } else {
        if (pageNum === 1) setError(response.error || 'Failed to load reviews');
        if (!isMounted()) return;
        setHasMore(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load reviews';
      if (pageNum === 1) setError(errorMessage);
      if (!isMounted()) return;
      setHasMore(false);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [storeId, storeName]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchReviews(false, page + 1);
    }
  }, [loadingMore, hasMore, loading, page, fetchReviews]);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (storeId) {
      fetchReviews();
    }
  }, [storeId, fetchReviews]);

  // Filter and sort reviews
  const filteredAndSortedReviews = reviews
    .filter(review => filterRating === null || review.rating === filterRating)
    .sort((a, b) => {
      switch (sortBy) {
        case 'helpful':
          return b.helpful - a.helpful;
        case 'rating':
          return b.rating - a.rating;
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Render rating stars
  const renderStars = (rating: number, size: number = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? Colors.warning : Colors.border.default}
          />
        ))}
      </View>
    );
  };

  const renderReviewItem = useCallback(({ item }: { item: Review }) => renderReview(item), []);

  // Render review card
  const renderReview = (review: Review) => {
    const userName = `${review.userId.profile.firstName} ${review.userId.profile.lastName}`;
    const reviewDate = new Date(review.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return (
      <View key={review._id} style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.userInfo}>
            {review.userId.profile.avatar ? (
              <CachedImage source={review.userId.profile.avatar} style={styles.userAvatar} />
            ) : (
              <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                <ThemedText style={styles.userAvatarText}>
                  {review.userId.profile.firstName[0]}{review.userId.profile.lastName[0]}
                </ThemedText>
              </View>
            )}
            <View style={styles.userDetails}>
              <View style={styles.userNameRow}>
                <ThemedText style={styles.userName}>{userName}</ThemedText>
                {review.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <ThemedText style={styles.verifiedText}>Verified</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText style={styles.reviewDate}>{reviewDate}</ThemedText>
            </View>
          </View>
          {renderStars(review.rating, 18)}
        </View>

        <ThemedText style={styles.reviewComment}>{review.comment}</ThemedText>

        {review.images && review.images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.reviewImages}
          >
            {review.images.map((image, index) => (
              <CachedImage key={index} source={image} style={styles.reviewImage} />
            ))}
          </ScrollView>
        )}

        <View style={styles.reviewFooter}>
          <Pressable style={styles.helpfulButton}>
            <Ionicons name="thumbs-up-outline" size={16} color={Colors.text.tertiary} />
            <ThemedText style={styles.helpfulText}>Helpful ({review.helpful})</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ReviewsListSkeleton />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.gradientHeader}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.headerBackButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <ThemedText style={styles.gradientHeaderTitle}>Reviews</ThemedText>
            <View style={{ width: 40 }} />
          </LinearGradient>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={80} color={Colors.error} />
            <ThemedText style={styles.errorTitle}>Oops!</ThemedText>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={styles.retryButton} onPress={() => fetchReviews()}>
              <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Gradient Header */}
        <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.gradientHeader}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.headerBackButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.gradientHeaderTitle}>Reviews</ThemedText>
          <Pressable style={styles.headerRefresh} onPress={() => fetchReviews(true)}>
            <Ionicons name="refresh" size={22} color={Colors.text.inverse} />
          </Pressable>
        </LinearGradient>

      <FlashList
        data={filteredAndSortedReviews}
        keyExtractor={(item) => item._id}
        renderItem={renderReviewItem}
        contentContainerStyle={{ paddingBottom: 120 }}
        estimatedItemSize={120}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchReviews(true, 1)} tintColor={Colors.brand.purple} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <>
            {/* Rating Summary */}
            {stats && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryLeft}>
                  <ThemedText style={styles.averageRating}>{stats.averageRating.toFixed(1)}</ThemedText>
                  {renderStars(Math.round(stats.averageRating), 20)}
                  <ThemedText style={styles.totalReviews}>
                    {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
                  </ThemedText>
                </View>
                <View style={styles.summaryRight}>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] || 0;
                    const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                    return (
                      <View key={rating} style={styles.ratingRow}>
                        <ThemedText style={styles.ratingLabel}>{rating}</ThemedText>
                        <Ionicons name="star" size={14} color={colors.warningScale[400]} />
                        <View style={styles.ratingBar}>
                          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
                        </View>
                        <ThemedText style={styles.ratingCount}>{count}</ThemedText>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Filter and Sort */}
            <View style={styles.filtersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable
                  style={[styles.filterChip, filterRating === null && styles.filterChipActive]}
                  onPress={() => setFilterRating(null)}
                >
                  <ThemedText style={[styles.filterText, filterRating === null && styles.filterTextActive]}>
                    All
                  </ThemedText>
                </Pressable>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <Pressable
                    key={rating}
                    style={[styles.filterChip, filterRating === rating && styles.filterChipActive]}
                    onPress={() => setFilterRating(rating)}
                  >
                    <Ionicons name="star" size={14} color={filterRating === rating ? Colors.text.inverse : Colors.warning} />
                    <ThemedText style={[styles.filterText, filterRating === rating && styles.filterTextActive]}>
                      {rating}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="star-outline" size={64} color={Colors.brand.purpleLight} />
            </View>
            <ThemedText style={styles.emptyTitle}>No reviews yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Be the first to share your experience!
            </ThemedText>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.brand.purpleLight} />
            </View>
          ) : null
        }
      />
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  gradientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
    ...Shadows.medium,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientHeaderTitle: {
    flex: 1,
    ...Typography.h2,
    color: Colors.text.inverse,
    marginLeft: Spacing.base,
  },
  headerRefresh: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.base,
  },
  loadingText: {
    ...Typography.h4,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
  },
  errorTitle: {
    ...Typography.h1,
    color: Colors.text.primary,
    marginTop: Spacing.base,
  },
  errorText: {
    ...Typography.h4,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    backgroundColor: Colors.brand.purpleLight,
    borderRadius: BorderRadius.md,
    ...Shadows.medium,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.h4,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    padding: Spacing.xl,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: BorderRadius.xl,
    ...Shadows.medium,
    borderWidth: 1,
    borderColor: Colors.background.secondary,
  },
  summaryLeft: {
    alignItems: 'center',
    paddingRight: Spacing.lg,
    borderRightWidth: 1,
    borderRightColor: Colors.border.default,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: Spacing.sm,
  },
  totalReviews: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  summaryRight: {
    flex: 1,
    paddingLeft: Spacing.lg,
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
    width: 12,
  },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border.default,
    borderRadius: 4,
    marginLeft: Spacing.sm,
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: Colors.warning,
    borderRadius: 4,
  },
  ratingCount: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    width: 24,
    textAlign: 'right',
  },
  filtersContainer: {
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
    ...Shadows.subtle,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius['2xl'],
    marginRight: 10,
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: Colors.brand.purpleLight,
    borderColor: Colors.brand.purple,
    ...Shadows.subtle,
  },
  filterText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  filterTextActive: {
    color: Colors.text.inverse,
  },
  reviewsList: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
  },
  reviewCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    ...Shadows.subtle,
    borderWidth: 1,
    borderColor: Colors.background.secondary,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    marginRight: Spacing.md,
  },
  userAvatarPlaceholder: {
    backgroundColor: Colors.brand.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  userName: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  verifiedText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  reviewDate: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  reviewComment: {
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  reviewImages: {
    marginTop: Spacing.md,
  },
  reviewImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
  },
  reviewFooter: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpfulText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.tint.pink,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.medium,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.h4,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default withErrorBoundary(ReviewsPage, 'ReviewsStoreId');
