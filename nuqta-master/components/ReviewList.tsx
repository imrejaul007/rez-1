// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  ListRenderItem,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ThemedText } from '@/components/ThemedText';
import ReviewCard from '@/components/ReviewCard';
import { Review } from '@/types/reviews';
import { colors } from '@/constants/theme';

interface ReviewListProps {
  reviews: Review[];
  onLikeReview?: (reviewId: string) => void;
  onReportReview?: (reviewId: string) => void;
  onHelpfulReview?: (reviewId: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  showStoreResponse?: boolean;
  emptyMessage?: string;
}

const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  onLikeReview,
  onReportReview,
  onHelpfulReview,
  refreshing = false,
  onRefresh,
  showStoreResponse = true,
  emptyMessage = "No reviews yet. Be the first to share your experience!",
}) => {
  const [refreshingState, setRefreshingState] = useState(refreshing);

  const handleRefresh = () => {
    if (onRefresh) {
      setRefreshingState(true);
      onRefresh();
      // Reset refreshing state after a delay
      setTimeout(() => setRefreshingState(false), 1000);
    }
  };

  const renderReviewItem: ListRenderItem<Review> = ({ item }) => (
    <ReviewCard
      review={item}
      onLike={onLikeReview}
      onReport={onReportReview}
      onHelpful={onHelpfulReview}
      showStoreResponse={showStoreResponse}
    />
  );

  const keyExtractor = (item: Review) => item.id;

  const EmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyText}>{emptyMessage}</ThemedText>
    </View>
  ), [emptyMessage]);

  const FooterComponent = useMemo(() => (
    <View style={styles.footer}>
      <ThemedText style={styles.footerText}>
        {reviews.length > 0 ? `${reviews.length} review${reviews.length !== 1 ? 's' : ''}` : ''}
      </ThemedText>
    </View>
  ), [reviews.length]);

  return (
    <FlashList
      data={reviews}
      renderItem={renderReviewItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={[
        styles.contentContainer,
        reviews.length === 0 && styles.emptyContentContainer
      ]}
      showsVerticalScrollIndicator={false}
      estimatedItemSize={200}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshingState}
            onRefresh={handleRefresh}
            tintColor={colors.brand.purple}
            colors={[colors.brand.purple]}
          />
        ) : undefined
      }
      ListEmptyComponent={EmptyComponent}
      ListFooterComponent={reviews.length > 0 ? FooterComponent : null}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.neutral[400],
    fontWeight: '500',
  },
});

export default React.memo(ReviewList);