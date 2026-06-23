// ReviewsTabContent.tsx - Full reviews tab with rating summary, breakdown, write review, inner tabs (reviews/UGC)
import { colors } from '@/constants/theme';
import React, { useState, useCallback } from 'react';
import { View, Pressable, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import StarRating from '@/components/StarRating';
import RatingBreakdown from '@/components/RatingBreakdown';
import ReviewCard from '@/components/ReviewCard';
import UGCGrid from '@/components/UGCGrid';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';

interface ReviewsTabContentProps {
  storeName: string;
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>;
  reviews: any[];
  reviewsLoading: boolean;
  canReview: boolean | null;
  ugcContent: any[];
  ugcLoading: boolean;
  onWriteReview: () => void;
  onReviewLike: (reviewId: string) => void;
  onReviewReport: (reviewId: string) => void;
  onReviewHelpful: (reviewId: string) => void;
  /** Style to apply to each section card wrapper */
  sectionCardStyle: any;
}

function ReviewsTabContent({
  storeName,
  averageRating,
  totalReviews,
  ratingBreakdown,
  reviews,
  reviewsLoading,
  canReview,
  ugcContent,
  ugcLoading,
  onWriteReview,
  onReviewLike,
  onReviewReport,
  onReviewHelpful,
  sectionCardStyle,
}: ReviewsTabContentProps) {
  const [reviewInnerTab, setReviewInnerTab] = useState<'reviews' | 'ugc'>('reviews');

  const handleReviewLike = useCallback((reviewId: string) => {
    onReviewLike(reviewId);
  }, [onReviewLike]);

  const handleReviewReport = useCallback((reviewId: string) => {
    onReviewReport(reviewId);
  }, [onReviewReport]);

  const handleReviewHelpful = useCallback((reviewId: string) => {
    onReviewHelpful(reviewId);
  }, [onReviewHelpful]);

  return (
    <>
      {/* Reviews Header */}
      <View style={sectionCardStyle}>
        <View style={styles.reviewsHeader}>
          <ThemedText style={styles.reviewsHeaderTitle}>Reviews & Ratings</ThemedText>
          <ThemedText style={styles.reviewsStoreName}>{storeName}</ThemedText>
        </View>
      </View>

      {/* Rating Summary Card */}
      <View style={sectionCardStyle}>
        <View style={styles.ratingSummaryCard}>
          <View style={styles.averageRatingContainer}>
            <ThemedText style={styles.averageRatingNumber}>
              {averageRating.toFixed(1)}
            </ThemedText>
            <ThemedText style={styles.outOfFive}> / 5</ThemedText>
          </View>
          <View style={styles.starsContainer}>
            <StarRating
              rating={averageRating}
              size="large"
              showHalf={true}
            />
          </View>
          <ThemedText style={styles.totalReviewsText}>
            Based on {totalReviews.toLocaleString()} reviews
          </ThemedText>
        </View>
      </View>

      {/* Rating Breakdown */}
      <View style={sectionCardStyle}>
        <RatingBreakdown
          ratingBreakdown={{
            fiveStars: ratingBreakdown[5] || 0,
            fourStars: ratingBreakdown[4] || 0,
            threeStars: ratingBreakdown[3] || 0,
            twoStars: ratingBreakdown[2] || 0,
            oneStar: ratingBreakdown[1] || 0,
          }}
          totalReviews={totalReviews}
        />
      </View>

      {/* Write Review Button */}
      <View style={sectionCardStyle}>
        {canReview === false ? (
          <View style={styles.alreadyReviewedBanner}>
            <View style={styles.alreadyReviewedContent}>
              <View style={styles.alreadyReviewedIconContainer}>
                <Ionicons name="star" size={20} color={colors.brand.goldWarm} />
              </View>
              <ThemedText style={styles.alreadyReviewedText}>
                You have already reviewed this store
              </ThemedText>
              <Pressable style={styles.editReviewButton}>
                <Ionicons name="create-outline" size={18} color={Colors.gold} />
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.writeReviewButton}
            onPress={onWriteReview}
          >
            <LinearGradient
              colors={[Colors.gold, Colors.nileBlue]}
              style={styles.writeReviewGradient}
            >
              <Ionicons name="create-outline" size={20} color={Colors.text.inverse} />
              <ThemedText style={styles.writeReviewText}>Write a Review</ThemedText>
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* Inner Tabs - Reviews / UGC Content */}
      <View style={sectionCardStyle}>
        <View style={styles.reviewInnerTabsContainer}>
          <Pressable
            style={[styles.reviewInnerTab, reviewInnerTab === 'reviews' && styles.reviewInnerTabActive]}
            onPress={() => setReviewInnerTab('reviews')}
          >
            {reviewInnerTab === 'reviews' ? (
              <LinearGradient
                colors={[Colors.gold, Colors.nileBlue]}
                style={styles.reviewInnerTabGradient}
              >
                <ThemedText style={styles.reviewInnerTabTextActive}>
                  Reviews ({totalReviews})
                </ThemedText>
              </LinearGradient>
            ) : (
              <ThemedText style={styles.reviewInnerTabText}>
                Reviews ({totalReviews})
              </ThemedText>
            )}
          </Pressable>
          <Pressable
            style={[styles.reviewInnerTab, reviewInnerTab === 'ugc' && styles.reviewInnerTabActive]}
            onPress={() => setReviewInnerTab('ugc')}
          >
            {reviewInnerTab === 'ugc' ? (
              <LinearGradient
                colors={[Colors.gold, Colors.nileBlue]}
                style={styles.reviewInnerTabGradient}
              >
                <ThemedText style={styles.reviewInnerTabTextActive}>UGC Content</ThemedText>
              </LinearGradient>
            ) : (
              <ThemedText style={styles.reviewInnerTabText}>UGC Content</ThemedText>
            )}
          </Pressable>
        </View>
      </View>

      {/* Reviews List or UGC Content */}
      {reviewInnerTab === 'reviews' ? (
        <View style={sectionCardStyle}>
          {reviewsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.gold} />
              <ThemedText style={styles.loadingText}>Loading reviews...</ThemedText>
            </View>
          ) : reviews.length === 0 ? (
            <View style={styles.emptyReviewState}>
              <LinearGradient
                colors={[Colors.gold, Colors.nileBlue]}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="chatbubble-outline" size={32} color={Colors.text.inverse} />
              </LinearGradient>
              <ThemedText style={styles.emptyStateTitle}>No reviews yet</ThemedText>
              <ThemedText style={styles.emptyStateText}>
                Be the first to review this store!
              </ThemedText>
            </View>
          ) : (
            <View style={styles.reviewListContainer}>
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewCardWrapper}>
                  <ReviewCard
                    review={review}
                    onLike={() => handleReviewLike(review.id)}
                    onReport={() => handleReviewReport(review.id)}
                    onHelpful={() => handleReviewHelpful(review.id)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={sectionCardStyle}>
          {ugcLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.gold} />
              <ThemedText style={styles.loadingText}>Loading UGC content...</ThemedText>
            </View>
          ) : ugcContent.length === 0 ? (
            <View style={styles.emptyReviewState}>
              <LinearGradient
                colors={[colors.brand.goldWarm, '#E5A500']}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="images-outline" size={32} color={colors.brand.navyDark} />
              </LinearGradient>
              <ThemedText style={styles.emptyStateTitle}>No content yet</ThemedText>
              <ThemedText style={styles.emptyStateText}>
                User-generated content will appear here.
              </ThemedText>
            </View>
          ) : (
            <UGCGrid
              ugcContent={ugcContent}
              onContentPress={() => {}}
              onLikeContent={() => {}}
            />
          )}
        </View>
      )}
    </>
  );
}

export default React.memo(ReviewsTabContent);

const styles = StyleSheet.create({
  reviewsHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  reviewsHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  reviewsStoreName: {
    ...Typography.body,
    color: Colors.gold,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  ratingSummaryCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: 'rgba(0, 192, 106, 0.08)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 192, 106, 0.2)',
  },
  averageRatingContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  averageRatingNumber: {
    fontSize: 44,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -1,
  },
  outOfFive: {
    ...Typography.h4,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  starsContainer: {
    marginVertical: 10,
  },
  totalReviewsText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  alreadyReviewedBanner: {
    backgroundColor: 'rgba(255, 200, 87, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 87, 0.35)',
    overflow: 'hidden',
  },
  alreadyReviewedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: Spacing.md,
  },
  alreadyReviewedIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alreadyReviewedText: {
    flex: 1,
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  editReviewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 192, 106, 0.2)',
  },
  writeReviewButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  writeReviewGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  writeReviewText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  reviewInnerTabsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  reviewInnerTab: {
    flex: 1,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  reviewInnerTabActive: {
    borderColor: Colors.gold,
  },
  reviewInnerTabGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  reviewInnerTabText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  reviewInnerTabTextActive: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  reviewListContainer: {
    gap: Spacing.md,
  },
  reviewCardWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.navyDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  emptyReviewState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyStateTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
