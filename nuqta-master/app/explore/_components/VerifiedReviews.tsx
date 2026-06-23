import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import exploreApi, { VerifiedReview } from '@/services/exploreApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { useGetCurrencySymbol } from '@/stores/selectors';

import { useIsMounted } from '@/hooks/useIsMounted';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
const { width } = Dimensions.get('window');

const VerifiedReviews = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [reviews, setReviews] = useState<VerifiedReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVerifiedReviews();
  }, []);

  const fetchVerifiedReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await exploreApi.getVerifiedReviews({ limit: 3 });
      if (response.success && response.data) {
        if (!isMounted()) return;
        setReviews(response.data?.reviews || []);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load reviews');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
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

  // Loading state
  if (isLoading) {
    return <CardGridSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Top Reviews Near You</Text>
            <Text style={styles.sectionSubtitle}>Trusted feedback from verified purchases</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchVerifiedReviews}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Empty state
  if (reviews.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Top Reviews Near You</Text>
            <Text style={styles.sectionSubtitle}>Trusted feedback from verified purchases</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={32} color={Colors.text.tertiary} />
          <Text style={styles.emptyText}>No reviews available yet</Text>
        </View>
      </View>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Verified Reviews" compact={true}>
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Top Reviews Near You</Text>
          <Text style={styles.sectionSubtitle}>Trusted feedback from verified purchases</Text>
        </View>
        <Pressable onPress={() => navigateTo('/explore/reviews')}>
          <Text style={styles.allReviewsText}>All Reviews</Text>
        </Pressable>
      </View>

      {/* Reviews List */}
      <View style={styles.reviewsList}>
        {reviews.map((review) => (
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
                    <Ionicons name="wallet-outline" size={12} color={Colors.background.primary} />
                  </View>
                  <Text style={styles.cashbackText}>{currencySymbol}{review.cashback}</Text>
                </View>
              )}
            </View>

            {/* Review Text */}
            <Text style={styles.reviewText}>"{review.review}"</Text>

            {/* Store & Verified Row */}
            <View style={styles.storeRow}>
              <Text style={styles.storeName}>{review.store}</Text>
              {review.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.gold} />
                  <Text style={styles.verifiedText}>Verified Purchase</Text>
                </View>
              )}
            </View>

            {/* User & Time */}
            <View style={styles.userRow}>
              <Text style={styles.userName}>{review.user}</Text>
              <Text style={styles.dotSeparator}>•</Text>
              <Text style={styles.timeText}>{review.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
    </FeatureErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.xl,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  retryButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.successScale[50],
    borderRadius: BorderRadius.lg,
  },
  retryText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.gold,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  sectionSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  allReviewsText: {
    fontSize: Typography.body.fontSize,
    color: Colors.info,
    fontWeight: '600',
  },
  reviewsList: {
    paddingHorizontal: Spacing.base,
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
    fontSize: Typography.body.fontSize,
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
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  reviewText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  storeName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.gold,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  verifiedText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.gold,
    fontWeight: '500',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  dotSeparator: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  timeText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
});

export default React.memo(VerifiedReviews);
