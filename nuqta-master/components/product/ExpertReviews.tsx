import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import Card from '@/components/ui/Card';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';

interface ExpertReview {
  id: string;
  author: {
    name: string;
    title: string;
    company: string;
    avatar: string;
    verified: boolean;
  };
  rating: number;
  headline: string;
  content: string;
  pros: string[];
  cons: string[];
  verdict: string;
  publishedAt: Date;
  helpful: number;
  images?: string[];
}

interface ExpertReviewsProps {
  productId: string;
  reviews?: ExpertReview[];
  onMarkHelpful?: (reviewId: string) => void;
}

function ExpertReviews({
  productId,
  reviews = [],
  onMarkHelpful,
}: ExpertReviewsProps) {
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Text key={index} style={styles.star}>
        {index < rating ? '⭐' : '☆'}
      </Text>
    ));
  };

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>No Expert Reviews Yet</Text>
        <Text style={styles.emptyMessage}>
          Expert reviews from industry professionals coming soon
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Expert Reviews</Text>
        <View style={styles.expertBadge}>
          <Text style={styles.expertBadgeText}>✓ Verified Experts</Text>
        </View>
      </View>

      <ScrollView nestedScrollEnabled>
        {reviews.map((review) => {
          const isExpanded = expandedReview === review.id;
          const contentPreview = review.content.substring(0, 200);
          const showReadMore = review.content.length > 200;

          return (
            <Card
              key={review.id}
              variant="outlined"
              padding="md"
              style={styles.reviewCard}
            >
              {/* Author Info */}
              <View style={styles.authorSection}>
                <CachedImage
                  source={{ uri: review.author.avatar }}
                  style={styles.authorAvatar}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <View style={styles.authorInfo}>
                  <View style={styles.authorNameRow}>
                    <Text style={styles.authorName}>{review.author.name}</Text>
                    {review.author.verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.authorTitle}>{review.author.title}</Text>
                  <Text style={styles.authorCompany}>{review.author.company}</Text>
                  <Text style={styles.publishDate}>{formatDate(review.publishedAt)}</Text>
                </View>
              </View>

              {/* Rating */}
              <View style={styles.ratingSection}>
                <View style={styles.starsRow}>{renderStars(review.rating)}</View>
                <Text style={styles.ratingText}>{review.rating}/5</Text>
              </View>

              {/* Headline */}
              <Text style={styles.headline}>{review.headline}</Text>

              {/* Content */}
              <Text style={styles.content}>
                {isExpanded ? review.content : contentPreview}
                {!isExpanded && showReadMore && '...'}
              </Text>

              {showReadMore && (
                <Pressable
                  onPress={() =>
                    setExpandedReview(isExpanded ? null : review.id)
                  }
                >
                  <Text style={styles.readMore}>
                    {isExpanded ? 'Show Less' : 'Read More'}
                  </Text>
                </Pressable>
              )}

              {/* Pros & Cons */}
              <View style={styles.prosConsSection}>
                <View style={styles.prosColumn}>
                  <Text style={styles.prosConsTitle}>✓ Pros</Text>
                  {review.pros.map((pro, index) => (
                    <View key={index} style={styles.prosConsItem}>
                      <Text style={styles.prosBullet}>•</Text>
                      <Text style={styles.prosConsText}>{pro}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.consColumn}>
                  <Text style={styles.prosConsTitle}>✗ Cons</Text>
                  {review.cons.map((con, index) => (
                    <View key={index} style={styles.prosConsItem}>
                      <Text style={styles.consBullet}>•</Text>
                      <Text style={styles.prosConsText}>{con}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Verdict */}
              <View style={styles.verdictSection}>
                <Text style={styles.verdictLabel}>Expert Verdict</Text>
                <Text style={styles.verdictText}>{review.verdict}</Text>
              </View>

              {/* Images */}
              {review.images && review.images.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagesScroll}
                >
                  {review.images.map((image, index) => (
                    <CachedImage
                      key={index}
                      source={{ uri: image }}
                      style={styles.reviewImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ))}
                </ScrollView>
              )}

              {/* Helpful Button */}
              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.helpfulButton}
                  onPress={() => onMarkHelpful?.(review.id)}
                >
                  <Text style={styles.helpfulIcon}>👍</Text>
                  <Text style={styles.helpfulText}>
                    Helpful ({review.helpful})
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
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
  reviewCard: {
    marginBottom: spacing.md,
  },
  authorSection: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  authorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background.secondary,
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  authorName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: '700',
  },
  authorTitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  authorCompany: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  publishDate: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  starsRow: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 20,
  },
  ratingText: {
    ...typography.button,
    color: colors.warningScale[700],
  },
  headline: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  content: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  readMore: {
    ...typography.button,
    color: colors.primary[500],
    marginBottom: spacing.md,
  },
  prosConsSection: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  prosColumn: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.successScale[50],
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.successScale[500],
  },
  consColumn: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.errorScale[50],
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.errorScale[500],
  },
  prosConsTitle: {
    ...typography.button,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  prosConsItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  prosBullet: {
    ...typography.bodySmall,
    color: colors.successScale[700],
    fontWeight: '700',
  },
  consBullet: {
    ...typography.bodySmall,
    color: colors.errorScale[700],
    fontWeight: '700',
  },
  prosConsText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    flex: 1,
  },
  verdictSection: {
    padding: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
    marginBottom: spacing.md,
  },
  verdictLabel: {
    ...typography.button,
    color: colors.primary[700],
    marginBottom: spacing.xs,
  },
  verdictText: {
    ...typography.body,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  imagesScroll: {
    marginBottom: spacing.md,
  },
  reviewImage: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
  },
  helpfulIcon: {
    fontSize: 16,
  },
  helpfulText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default React.memo(ExpertReviews);
