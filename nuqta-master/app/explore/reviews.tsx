import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import exploreApi, { VerifiedReview } from '@/services/exploreApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

type SortType = 'recent' | 'highest' | 'lowest';

const AllReviewsPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [reviews, setReviews] = useState<VerifiedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [total, setTotal] = useState(0);

  const LIMIT = 10;

  const fetchReviews = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await exploreApi.getVerifiedReviews({
        limit: LIMIT,
        page: pageNum
      });

      if (response.success && response.data) {
        let newReviews = response.data.reviews || [];

        // Client-side sorting
        if (sortBy === 'highest') {
          newReviews = [...newReviews].sort((a, b) => b.rating - a.rating);
        } else if (sortBy === 'lowest') {
          newReviews = [...newReviews].sort((a, b) => a.rating - b.rating);
        }

        if (pageNum === 1) {
          if (!isMounted()) return;
          setReviews(newReviews);
        } else {
          if (!isMounted()) return;
          setReviews(prev => [...prev, ...newReviews]);
        }
        if (!isMounted()) return;
        setTotal(response.data.total || newReviews.length);
        if (!isMounted()) return;
        setHasMore(response.data.hasMore || false);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [sortBy]);

  useEffect(() => {
    setPage(1);
    fetchReviews(1);
  }, [sortBy, fetchReviews]);

  const onRefresh = useCallback(() => {
    setPage(1);
    fetchReviews(1, true);
  }, [fetchReviews]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReviews(nextPage);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={16} color={Colors.warning} />
        );
      } else if (i === fullStars && hasHalf) {
        stars.push(
          <Ionicons key={i} name="star-half" size={16} color={Colors.warning} />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={16} color={Colors.border.default} />
        );
      }
    }
    return stars;
  };

  const navigateToStore = (storeId?: string) => {
    if (storeId) {
      router.push(`/MainStorePage?storeId=${storeId}` as any);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>All Reviews</Text>
            <Text style={styles.headerSubtitle}>
              {total > 0 ? `${total} verified reviews` : 'Verified reviews'}
            </Text>
          </View>
        </View>

        {/* Sort Tabs */}
        <View style={styles.sortContainer}>
          <Pressable
            style={[styles.sortTab, sortBy === 'recent' && styles.sortTabActive]}
            onPress={() => setSortBy('recent')}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={sortBy === 'recent' ? Colors.gold : Colors.text.tertiary}
            />
            <Text style={[styles.sortText, sortBy === 'recent' && styles.sortTextActive]}>
              Recent
            </Text>
          </Pressable>

          <Pressable
            style={[styles.sortTab, sortBy === 'highest' && styles.sortTabActive]}
            onPress={() => setSortBy('highest')}
          >
            <Ionicons
              name="arrow-up"
              size={16}
              color={sortBy === 'highest' ? Colors.gold : Colors.text.tertiary}
            />
            <Text style={[styles.sortText, sortBy === 'highest' && styles.sortTextActive]}>
              Highest
            </Text>
          </Pressable>

          <Pressable
            style={[styles.sortTab, sortBy === 'lowest' && styles.sortTabActive]}
            onPress={() => setSortBy('lowest')}
          >
            <Ionicons
              name="arrow-down"
              size={16}
              color={sortBy === 'lowest' ? Colors.gold : Colors.text.tertiary}
            />
            <Text style={[styles.sortText, sortBy === 'lowest' && styles.sortTextActive]}>
              Lowest
            </Text>
          </Pressable>
        </View>

        {/* Reviews List */}
        <ScrollView
          style={styles.reviewsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.reviewsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.gold]} />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const paddingToBottom = 50;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {/* Loading State */}
          {loading && !refreshing && (
            <CardGridSkeleton />
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle" size={48} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={onRefresh}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Empty State */}
          {!loading && !error && reviews.length === 0 && (
            <View style={styles.centerContainer}>
              <Ionicons name="chatbubble-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No Reviews Yet</Text>
              <Text style={styles.emptySubtext}>Be the first to leave a review!</Text>
            </View>
          )}

          {/* Reviews */}
          {!loading && !error && reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              {/* Rating Row */}
              <View style={styles.ratingRow}>
                <View style={styles.starsContainer}>
                  {renderStars(review.rating)}
                  <Text style={styles.ratingNumber}>{review.rating}</Text>
                </View>
                {review.cashback > 0 && (
                  <View style={styles.cashbackBadge}>
                    <View style={styles.cashbackIcon}>
                      <Ionicons name="wallet-outline" size={12} color={Colors.text.inverse} />
                    </View>
                    <Text style={styles.cashbackText}>{currencySymbol}{review.cashback}</Text>
                  </View>
                )}
              </View>

              {/* Review Text */}
              <Text style={styles.reviewText}>"{review.review}"</Text>

              {/* Store & Verified Row */}
              <Pressable
                style={styles.storeRow}
                onPress={() => navigateToStore(review.storeId)}
                disabled={!review.storeId}
              >
                {review.storeLogo && (
                  <CachedImage source={review.storeLogo} style={styles.storeLogo} />
                )}
                <Text style={styles.storeName}>{review.store}</Text>
                {review.verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.gold} />
                    <Text style={styles.verifiedText}>Verified Purchase</Text>
                  </View>
                )}
                {review.storeId && (
                  <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} style={{ marginLeft: 'auto' }} />
                )}
              </Pressable>

              {/* User & Time */}
              <View style={styles.userRow}>
                {review.avatar && (
                  <CachedImage source={review.avatar} style={styles.userAvatar} />
                )}
                <Text style={styles.userName}>{review.user}</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.timeText}>{review.time}</Text>
              </View>
            </View>
          ))}

          {/* Load More Indicator */}
          {loadingMore && (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={colors.lightMustard} />
            </View>
          )}

          {/* End of List */}
          {!loading && !hasMore && reviews.length > 0 && (
            <View style={styles.endOfListContainer}>
              <Text style={styles.endOfListText}>You've seen all reviews</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    gap: 10,
  },
  sortTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    gap: 6,
  },
  sortTabActive: {
    backgroundColor: Colors.successScale[50],
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  sortText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  sortTextActive: {
    color: Colors.gold,
    fontWeight: '600',
  },
  reviewsList: {
    flex: 1,
  },
  reviewsContainer: {
    padding: Spacing.base,
    minHeight: 300,
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.xl,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: Spacing.base,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
  },
  reviewCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingNumber: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginLeft: Spacing.sm,
  },
  cashbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  cashbackIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cashbackText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  reviewText: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: Spacing.sm,
  },
  storeLogo: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.background.secondary,
  },
  storeName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.gold,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  verifiedText: {
    ...Typography.bodySmall,
    color: Colors.gold,
    fontWeight: '500',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
  },
  userName: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  dotSeparator: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  timeText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  loadMoreContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  endOfListContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  endOfListText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(AllReviewsPage, 'ExploreReviews');
