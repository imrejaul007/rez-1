/**
 * VoucherCardSkeleton - Matches voucher card layout
 *
 * Shows skeleton for:
 * - Discount badge (icon + text)
 * - Voucher code (dashed border)
 * - Description (2 lines)
 * - Validity info
 * - CTA button (Claim/Copy)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '@/constants/theme';

function VoucherCardSkeleton() {
  return (
    <View
      style={styles.card}
      accessibilityLabel="Loading voucher"
      accessibilityRole="none"
    >
      {/* Discount Badge */}
      <View style={styles.discountBadge}>
        <SkeletonLoader
          width={24}
          height={24}
          variant="circle"
          style={styles.icon}
        />
        <SkeletonLoader
          width={80}
          height={16}
          borderRadius={4}
        />
      </View>

      {/* Voucher Code */}
      <View style={styles.codeContainer}>
        <View style={styles.codeDashed}>
          <SkeletonLoader
            width={120}
            height={24}
            borderRadius={6}
          />
        </View>
      </View>

      {/* Description (2 lines) */}
      <View style={styles.descriptionContainer}>
        <SkeletonLoader
          width="100%"
          height={14}
          borderRadius={4}
          style={styles.descLine1}
        />
        <SkeletonLoader
          width="80%"
          height={14}
          borderRadius={4}
          style={styles.descLine2}
        />
      </View>

      {/* Minimum Purchase */}
      <SkeletonLoader
        width={140}
        height={13}
        borderRadius={4}
        style={styles.minPurchase}
      />

      {/* Validity */}
      <View style={styles.validityContainer}>
        <SkeletonLoader
          width={16}
          height={16}
          variant="circle"
          style={styles.clockIcon}
        />
        <SkeletonLoader
          width={100}
          height={12}
          borderRadius={4}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <SkeletonLoader
          width="48%"
          height={40}
          borderRadius={10}
        />
        <SkeletonLoader
          width="48%"
          height={40}
          borderRadius={10}
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
    marginRight: 16,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.tint.slate,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  icon: {
    marginRight: 0,
  },
  codeContainer: {
    marginBottom: 16,
  },
  codeDashed: {
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  descLine1: {
    marginBottom: 6,
  },
  descLine2: {
    marginBottom: 0,
  },
  minPurchase: {
    marginBottom: 12,
  },
  validityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  clockIcon: {},
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
});

export default React.memo(VoucherCardSkeleton);
