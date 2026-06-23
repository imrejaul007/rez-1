/**
 * AvailabilityBadge Component
 *
 * Displays product availability status as an overlay badge
 * Typically positioned at top-left of product image
 *
 * Variants:
 * - "In-Store Available" (green)
 * - "Online Only" (purple)
 * - "Out of Stock" (red)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

type AvailabilityStatus = 'in-store' | 'online-only' | 'out-of-stock' | 'limited';

interface AvailabilityBadgeProps {
  /** Availability status */
  status: AvailabilityStatus;
  /** Custom label (optional - uses default based on status) */
  label?: string;
  /** Custom style */
  style?: any;
}

// Configuration for each status
const STATUS_CONFIG: Record<
  AvailabilityStatus,
  { label: string; bgColor: string; textColor: string; icon: string }
> = {
  'in-store': {
    label: 'In-Store Available',
    bgColor: colors.successScale[400],
    textColor: colors.background.primary,
    icon: 'storefront-outline',
  },
  'online-only': {
    label: 'Online Only',
    bgColor: colors.brand.purpleLight,
    textColor: colors.background.primary,
    icon: 'globe-outline',
  },
  'out-of-stock': {
    label: 'Out of Stock',
    bgColor: colors.error,
    textColor: colors.background.primary,
    icon: 'close-circle-outline',
  },
  'limited': {
    label: 'Limited Stock',
    bgColor: colors.warningScale[400],
    textColor: colors.background.primary,
    icon: 'alert-circle-outline',
  },
};

export const AvailabilityBadge: React.FC<AvailabilityBadgeProps> = ({
  status,
  label,
  style,
}) => {
  const config = STATUS_CONFIG[status];
  const displayLabel = label || config.label;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bgColor },
        style,
      ]}
    >
      <Ionicons
        name={config.icon as any}
        size={14}
        color={config.textColor}
      />
      <Text style={[styles.label, { color: config.textColor }]}>
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default React.memo(AvailabilityBadge);
