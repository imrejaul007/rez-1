/**
 * ReviewCardSkeleton - Matches review card layout
 *
 * Shows skeleton for:
 * - User avatar
 * - User name
 * - Rating stars
 * - Review date
 * - Review text (3 lines)
 * - Like/helpful button
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

function ReviewCardSkeleton() {
  return (
    <View
      style={styles.card}
      accessibilityLabel="Loading review"
      accessibilityRole="none"
    >
      {/* Header Row */}
      <View style={styles.header}>
        {/* Avatar */}
        <SkeletonLoader
          width={48}
          height={48}
          variant="circle"
          style={styles.avatar}
        />

        {/* User Info */}
        <View style={styles.userInfo}>
          <SkeletonLoader
            width={120}
            height={16}
            borderRadius={4}
            style={styles.userName}
          />
          <SkeletonLoader
            width={80}
            height={14}
            borderRadius={4}
            style={styles.date}
          />
        </View>

        {/* Rating Stars */}
        <SkeletonLoader
          width={80}
          height={16}
          borderRadius={8}
        />
      </View>

      {/* Review Text (3 lines) */}
      <View style={styles.reviewText}>
        <SkeletonLoader
          width="100%"
          height={14}
          borderRadius={4}
          style={styles.textLine}
        />
        <SkeletonLoader
          width="95%"
          height={14}
          borderRadius={4}
          style={styles.textLine}
        />
        <SkeletonLoader
          width="70%"
          height={14}
          borderRadius={4}
        />
      </View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <SkeletonLoader
          width={90}
          height={32}
          borderRadius={16}
        />
        <SkeletonLoader
          width={70}
          height={32}
          borderRadius={16}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.tint.slate,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    marginBottom: 4,
  },
  date: {},
  reviewText: {
    marginBottom: 12,
  },
  textLine: {
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default React.memo(ReviewCardSkeleton);
