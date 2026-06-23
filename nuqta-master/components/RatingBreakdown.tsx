import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { RatingBreakdownProps } from '@/types/reviews';
import { colors } from '@/constants/theme';

const RatingBreakdown: React.FC<RatingBreakdownProps> = ({
  ratingBreakdown,
  totalReviews,
}) => {
  const ratings = [
    { stars: 5, count: Math.round((ratingBreakdown.fiveStars / 100) * totalReviews), percentage: ratingBreakdown.fiveStars },
    { stars: 4, count: Math.round((ratingBreakdown.fourStars / 100) * totalReviews), percentage: ratingBreakdown.fourStars },
    { stars: 3, count: Math.round((ratingBreakdown.threeStars / 100) * totalReviews), percentage: ratingBreakdown.threeStars },
    { stars: 2, count: Math.round((ratingBreakdown.twoStars / 100) * totalReviews), percentage: ratingBreakdown.twoStars },
    { stars: 1, count: Math.round((ratingBreakdown.oneStar / 100) * totalReviews), percentage: ratingBreakdown.oneStar },
  ];

  return (
    <View style={styles.container}>
      {ratings.map((rating) => (
        <View key={rating.stars} style={styles.ratingRow}>
          {/* Star number and icon */}
          <View style={styles.starSection}>
            <ThemedText style={styles.starNumber}>{rating.stars}</ThemedText>
            <Ionicons name="star" size={14} color="#FFB800" />
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <LinearGradient
                colors={[colors.brand.purple, colors.brand.purpleLight]}
                style={[styles.progressBar, { width: `${rating.percentage}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>

          {/* Percentage text */}
          <View style={styles.percentageSection}>
            <ThemedText style={styles.percentageText}>{rating.percentage}%</ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  starSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
    gap: 4,
  },
  starNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    width: 12,
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 8,
  },
  percentageSection: {
    width: 40,
    alignItems: 'flex-end',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[500],
  },
});

export default React.memo(RatingBreakdown);