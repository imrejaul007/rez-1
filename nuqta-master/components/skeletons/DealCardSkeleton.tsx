/**
 * DealCardSkeleton - Matches DealCard layout
 *
 * Shows skeleton for:
 * - Discount badge (top-right)
 * - Deal title (1-2 lines)
 * - Description (2 lines)
 * - Minimum bill amount
 * - Category badge
 * - Terms (2 lines)
 * - Action button
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

function DealCardSkeleton() {
  return (
    <View
      style={styles.card}
      accessibilityLabel="Loading deal"
      accessibilityRole="none"
    >
      {/* Discount Badge (top-right) */}
      <View style={styles.badgeContainer}>
        <SkeletonLoader
          width={80}
          height={24}
          borderRadius={8}
        />
      </View>

      {/* Deal Content */}
      <View style={styles.content}>
        {/* Title (2 lines) */}
        <SkeletonLoader
          width="90%"
          height={16}
          borderRadius={4}
          style={styles.titleLine1}
        />
        <SkeletonLoader
          width="75%"
          height={16}
          borderRadius={4}
          style={styles.titleLine2}
        />

        {/* Description (2 lines) */}
        <SkeletonLoader
          width="100%"
          height={13}
          borderRadius={4}
          style={styles.descLine1}
        />
        <SkeletonLoader
          width="85%"
          height={13}
          borderRadius={4}
          style={styles.descLine2}
        />

        {/* Minimum Bill */}
        <SkeletonLoader
          width={140}
          height={14}
          borderRadius={4}
          style={styles.minBill}
        />

        {/* Category Badge */}
        <SkeletonLoader
          width={70}
          height={22}
          borderRadius={10}
          style={styles.categoryBadge}
        />

        {/* Availability Info */}
        <View style={styles.availabilityRow}>
          <SkeletonLoader
            width={120}
            height={12}
            borderRadius={4}
          />
          <SkeletonLoader
            width={60}
            height={12}
            borderRadius={4}
          />
        </View>

        {/* Preview Toggle */}
        <SkeletonLoader
          width={100}
          height={12}
          borderRadius={4}
          style={styles.previewToggle}
        />
      </View>

      {/* Terms (2 bullet points) */}
      <View style={styles.termsContainer}>
        <View style={styles.termRow}>
          <SkeletonLoader
            width={4}
            height={4}
            variant="circle"
            style={styles.bullet}
          />
          <SkeletonLoader
            width="90%"
            height={11}
            borderRadius={3}
          />
        </View>
        <View style={styles.termRow}>
          <SkeletonLoader
            width={4}
            height={4}
            variant="circle"
            style={styles.bullet}
          />
          <SkeletonLoader
            width="80%"
            height={11}
            borderRadius={3}
          />
        </View>
      </View>

      {/* Action Button */}
      <SkeletonLoader
        width="100%"
        height={48}
        borderRadius={12}
        style={styles.actionButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    marginBottom: 18,
    marginHorizontal: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.tint.slate,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  content: {
    paddingTop: 40,
    paddingRight: 80,
    paddingBottom: 8,
  },
  titleLine1: {
    marginBottom: 6,
  },
  titleLine2: {
    marginBottom: 12,
  },
  descLine1: {
    marginBottom: 6,
  },
  descLine2: {
    marginBottom: 12,
  },
  minBill: {
    marginBottom: 16,
  },
  categoryBadge: {
    marginBottom: 14,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewToggle: {
    marginBottom: 8,
    alignSelf: 'center',
  },
  termsContainer: {
    marginBottom: 20,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bullet: {
    marginRight: 8,
    marginTop: 4,
  },
  actionButton: {
    marginTop: 16,
  },
});

export default React.memo(DealCardSkeleton);
