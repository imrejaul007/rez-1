import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
interface ExpertReviewsSummaryProps {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: number[];
  onViewAll?: () => void;
}

function ExpertReviewsSummary({
  averageRating,
  totalReviews,
  ratingDistribution,
  onViewAll,
}: ExpertReviewsSummaryProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Text key={index} style={styles.star}>
        {index < rating ? '⭐' : '☆'}
      </Text>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Expert Rating</Text>
        <View style={styles.expertBadge}>
          <Text style={styles.expertBadgeText}>✓ {totalReviews} Experts</Text>
        </View>
      </View>

      <View style={styles.ratingSection}>
        <View style={styles.averageRatingBox}>
          <Text style={styles.averageRating}>{averageRating.toFixed(1)}</Text>
          <View style={styles.starsRow}>{renderStars(Math.round(averageRating))}</View>
          <Text style={styles.totalReviews}>Based on {totalReviews} reviews</Text>
        </View>

        <View style={styles.distributionBox}>
          {ratingDistribution.map((count, index) => {
            const stars = 5 - index;
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

            return (
              <View key={stars} style={styles.distributionRow}>
                <Text style={styles.starsLabel}>{stars}★</Text>
                <View style={styles.barContainer}>
                  <View
                    style={[styles.barFill, { width: `${percentage}%` }]}
                  />
                </View>
                <Text style={styles.countLabel}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {onViewAll && (
        <Pressable style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>View All Expert Reviews</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h4,
    color: colors.text.primary,
  },
  expertBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
  },
  expertBadgeText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  ratingSection: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  averageRatingBox: {
    alignItems: 'center',
    flex: 1,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary[500],
    marginBottom: spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  star: {
    fontSize: 20,
  },
  totalReviews: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  distributionBox: {
    flex: 1,
    gap: spacing.xs,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  starsLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    width: 30,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.warningScale[500],
    borderRadius: borderRadius.sm,
  },
  countLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    width: 25,
    textAlign: 'right',
  },
  viewAllButton: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  viewAllText: {
    ...typography.button,
    color: colors.primary[500],
  },
});

export default React.memo(ExpertReviewsSummary);
