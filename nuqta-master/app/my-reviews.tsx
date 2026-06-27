// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// My Reviews Page
// Shows all reviews written by the user

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ReviewsListSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import reviewService from '@/services/reviewsApi';
import { UserReview } from '@/types/review.types';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function MyReviewsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const filteredReviews = useMemo(() => activeFilter === 'all'
    ? reviews
    : reviews.filter(r => r.moderationStatus === activeFilter), [reviews, activeFilter]);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setPage(1);
      } else {
        setLoading(true);
      }

      const response = await reviewService.getUserOwnReviews(isRefresh ? 1 : page, 20);

      if (response.success && response.data) {
        if (isRefresh) {
          if (!isMounted()) return;
          setReviews(response.data.reviews || []);
        } else {
          if (!isMounted()) return;
          setReviews(prev => [...prev, ...(response.data?.reviews || [])]);
        }

        if (!isMounted()) return;
        setHasMore(response.data.pagination?.hasNextPage || false);
        setError(null);
      } else {
        throw new Error(response.message || 'Failed to load reviews');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load reviews');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadReviews(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadReviews();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={Colors.warning}
          />
        ))}
      </View>
    );
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return (
          <View style={[styles.statusBadge, styles.statusPending]}>
            <Ionicons name="time-outline" size={12} color={colors.brand.amberDark} />
            <Text style={styles.statusPendingText}>Awaiting approval</Text>
          </View>
        );
      case 'rejected':
        return (
          <View style={[styles.statusBadge, styles.statusRejected]}>
            <Ionicons name="close-circle-outline" size={12} color="#991B1B" />
            <Text style={styles.statusRejectedText}>Rejected</Text>
          </View>
        );
      case 'approved':
        return (
          <View style={[styles.statusBadge, styles.statusApproved]}>
            <Ionicons name="checkmark-circle-outline" size={12} color="#166534" />
            <Text style={styles.statusApprovedText}>Approved</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderReviewItem = useCallback(({ item }: { item: UserReview }) => renderReviewCard(item), []);

  const renderReviewCard = (review: UserReview) => {
    // Handle store data - might be populated object or just ID
    const storeName = typeof review.store === 'object' && review.store?.name
      ? review.store.name
      : 'Store';
    const storeLogo = typeof review.store === 'object' && review.store?.logo
      ? review.store.logo
      : null;
    const isPending = review.moderationStatus === 'pending';
    const isRejected = review.moderationStatus === 'rejected';

    return (
      <View key={review._id} style={styles.reviewCard}>
        {/* Status Badge */}
        {renderStatusBadge(review.moderationStatus)}

        {/* Store Info Header */}
        <View style={styles.reviewHeader}>
          <View style={styles.storeInfo}>
            {storeLogo ? (
              <CachedImage source={storeLogo} style={styles.storeLogo} />
            ) : (
              <View style={[styles.storeLogo, styles.storeLogoPlaceholder]}>
                <Ionicons name="storefront" size={20} color={colors.brand.green} />
              </View>
            )}
            <View style={styles.storeDetails}>
              <Text style={styles.storeName}>{storeName}</Text>
              <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
            </View>
          </View>
          {renderStars(review.rating)}
        </View>

        {/* Review Content */}
        {review.comment && (
          <Text style={styles.reviewComment}>{review.comment}</Text>
        )}

        {/* Rejection Reason */}
        {isRejected && review.moderationReason && (
          <View style={styles.rejectionReason}>
            <Ionicons name="information-circle-outline" size={14} color="#991B1B" />
            <Text style={styles.rejectionReasonText}>{review.moderationReason}</Text>
          </View>
        )}

        {/* Review Photos (if any) */}
        {review.images && review.images.length > 0 && (
          <ScrollView horizontal style={styles.imagesContainer} showsHorizontalScrollIndicator={false}>
            {review.images.map((image, index) => (
              <CachedImage
                key={index}
                source={image}
                style={styles.reviewImage}
              />
            ))}
          </ScrollView>
        )}

        {/* Review Stats */}
        <View style={styles.reviewStats}>
          <View style={styles.stat}>
            <Ionicons name="thumbs-up-outline" size={16} color={Colors.text.tertiary} />
            <Text style={styles.statText}>{review.helpful || 0} helpful</Text>
          </View>
          {review.merchantReply && (
            <View style={styles.stat}>
              <Ionicons name="chatbox-outline" size={16} color={colors.brand.green} />
              <Text style={styles.statText}>Store replied</Text>
            </View>
          )}
        </View>

        {/* Merchant Reply */}
        {review.merchantReply && (
          <View style={styles.merchantReply}>
            <View style={styles.replyHeader}>
              <Ionicons name="business" size={16} color={colors.brand.green} />
              <Text style={styles.replyLabel}>Store Response</Text>
            </View>
            <Text style={styles.replyText}>{review.merchantReply}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => {
              const storeId = typeof review.store === 'object' ? review.store._id : review.store;
              router.push(`/MainStorePage?storeId=${storeId}` as any);
            }}
            accessibilityLabel="View store"
            accessibilityRole="button"
            accessibilityHint={`Opens ${storeName} store page`}
          >
            <Ionicons name="storefront-outline" size={16} color={colors.brand.green} />
            <Text style={styles.actionButtonText}>View Store</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, !isPending && styles.actionButtonDisabled]}
            disabled={!isPending}
            onPress={() => {
              if (!isPending) return;
              const storeId = typeof review.store === 'object' ? review.store._id : review.store;
              router.push(`/ReviewPage?storeId=${storeId}&storeName=${encodeURIComponent(storeName)}&fromStore=true` as any);
            }}
            accessibilityLabel="Edit review"
            accessibilityRole="button"
            accessibilityHint={isPending ? 'Opens editor to modify your review' : 'Only pending reviews can be edited'}
          >
            <Ionicons name="create-outline" size={16} color={isPending ? Colors.text.tertiary : Colors.border.default} />
            <Text style={[styles.actionButtonText, !isPending && { color: Colors.border.default }]}>Edit</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.brand.green} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Returns to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>My Reviews</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          {FILTER_TABS.map((tab) => {
            const count = tab.key === 'all'
              ? reviews.length
              : reviews.filter(r => r.moderationStatus === tab.key).length;
            const isActive = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveFilter(tab.key)}
                accessibilityRole="button"
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {tab.label} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Content */}
        {loading && reviews.length === 0 ? (
          <ReviewsListSkeleton />
        ) : error ? (
          <View style={[styles.content, styles.centerContainer]}>
            <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
            <Text style={styles.errorTitle}>Failed to Load Reviews</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => loadReviews(true)}
              accessibilityLabel="Try again"
              accessibilityRole="button"
              accessibilityHint="Retries loading your reviews"
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <FlashList
            data={filteredReviews}
            keyExtractor={(item) => item._id || item.id || String(Math.random())}
            renderItem={renderReviewItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.brand.green}
                colors={[colors.brand.green]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            estimatedItemSize={120}
            ListHeaderComponent={
              filteredReviews.length > 0 ? (
                <Text style={styles.reviewsCount}>
                  {filteredReviews.length} {filteredReviews.length === 1 ? 'Review' : 'Reviews'}
                </Text>
              ) : null
            }
            ListFooterComponent={
              hasMore ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color={colors.brand.green} />
                  <Text style={styles.loadMoreText}>Loading more...</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              reviews.length === 0 ? (
                <View style={styles.centerContainer}>
                  <Ionicons name="chatbox-outline" size={64} color={Colors.border.default} />
                  <Text style={styles.emptyTitle}>No Reviews Yet</Text>
                  <Text style={styles.emptyText}>
                    You haven't written any reviews yet.{'\n'}
                    Order from a store and share your experience!
                  </Text>
                  <Pressable
                    style={styles.shopButton}
                    onPress={() => router.push('/(tabs)/' as any)}
                    accessibilityLabel="Browse stores"
                    accessibilityRole="button"
                    accessibilityHint="Opens store browsing page"
                  >
                    <Text style={styles.shopButtonText}>Browse Stores</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.centerContainer}>
                  <Ionicons name="filter-outline" size={48} color={Colors.border.default} />
                  <Text style={styles.emptyTitle}>No {activeFilter} reviews</Text>
                  <Text style={styles.emptyText}>
                    You don't have any {activeFilter} reviews yet.
                  </Text>
                </View>
              )
            }
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: colors.brand.green,
    paddingTop: Platform.select({
      ios: 50,
      android: StatusBar.currentHeight || 16,
      web: 16,
      default: 16,
    }),
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSpacer: {
    width: 40,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
  },
  filterTabActive: {
    backgroundColor: colors.brand.green,
  },
  filterTabText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  filterTabTextActive: {
    color: Colors.text.inverse,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  errorTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.brand.green,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  shopButton: {
    backgroundColor: colors.brand.green,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  shopButtonText: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  reviewsList: {
    padding: 16,
  },
  reviewsCount: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  reviewCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.subtle,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeLogo: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    marginRight: Spacing.md,
  },
  storeLogoPlaceholder: {
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  reviewDate: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  imagesContainer: {
    marginBottom: Spacing.md,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
  },
  reviewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
    marginBottom: Spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  merchantReply: {
    backgroundColor: Colors.background.secondary,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand.green,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  replyLabel: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.green,
  },
  replyText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginBottom: 10,
  },
  statusPending: {
    backgroundColor: colors.tint.amberLight,
  },
  statusPendingText: {
    ...Typography.caption,
    fontWeight: '600',
    color: colors.brand.amberDark,
  },
  statusApproved: {
    backgroundColor: colors.successScale[100],
  },
  statusApprovedText: {
    ...Typography.caption,
    fontWeight: '600',
    color: '#166534',
  },
  statusRejected: {
    backgroundColor: colors.errorScale[100],
  },
  statusRejectedText: {
    ...Typography.caption,
    fontWeight: '600',
    color: '#991B1B',
  },
  rejectionReason: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.errorScale[50],
    padding: 10,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  rejectionReasonText: {
    flex: 1,
    ...Typography.bodySmall,
    color: '#991B1B',
    lineHeight: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  loadMoreText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(MyReviewsPage, 'MyReviews');
