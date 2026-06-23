/**
 * DiscountBucketsSection Component
 *
 * Quick filter buttons for discount percentages
 * ReZ brand styling
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { DiscountBucket } from '@/types/offers.types';
import { Spacing, BorderRadius, Typography, Colors, Shadows } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

// New Color Palette
const PALETTE = {
  nileBlue: colors.nileBlue,
  lightMustard: colors.lightMustard,
  linen: colors.linen,
  lightPeach: colors.lightPeach,
  lavenderMist: colors.lavenderMist,
};

interface DiscountBucketsSectionProps {
  buckets: DiscountBucket[];
  selectedBucket?: string;
  onBucketPress: (bucket: DiscountBucket) => void;
}

export const DiscountBucketsSection: React.FC<DiscountBucketsSectionProps> = ({
  buckets,
  selectedBucket,
  onBucketPress,
}) => {
  const { theme, isDark } = useOffersTheme();

  if (buckets.length === 0) return null;

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: Spacing.base,
      marginBottom: Spacing.lg,
    },
    grid: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    bucket: {
      flex: 1,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xs,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      backgroundColor: isDark ? theme.colors.background.card : colors.background.primary,
      ...(isDark ? {} : Shadows.subtle),
    },
    bucketSelected: {
      borderColor: PALETTE.lightMustard,
      backgroundColor: isDark ? 'rgba(255, 205, 87, 0.1)' : '#FFF9E6',
    },
    iconContainer: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.sm,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 2,
      textAlign: 'center',
    },
    count: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.text.tertiary,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {buckets.map((bucket) => {
          const isSelected = selectedBucket === bucket.filterValue;
          const iconBgColor = isDark
            ? `${bucket.iconColor}25`
            : bucket.backgroundColor;

          return (
            <Pressable
              key={bucket.id}
              style={[
                styles.bucket,
                isSelected && styles.bucketSelected,
              ]}
              onPress={() => onBucketPress(bucket)}
             
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: iconBgColor },
                ]}
              >
                <Ionicons
                  name={bucket.icon as any}
                  size={20}
                  color={bucket.iconColor}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: isSelected ? PALETTE.nileBlue : theme.colors.text.primary },
                ]}
                numberOfLines={1}
              >
                {bucket.label}
              </Text>
              <Text style={styles.count}>
                {bucket.count} deals
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default React.memo(DiscountBucketsSection);
