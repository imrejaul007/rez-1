/**
 * DurationChips Component
 *
 * Selectable duration chips for lock feature
 * Options: 2 Hours | 4 Hours | 8 Hours
 * Shows fee percentage for each duration
 *
 * Based on reference design from ProductPage redesign
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerImpact } from '@/utils/haptics';
import { useGetCurrencySymbol, useGetLocale } from '@/stores/selectors';
import { colors } from '@/constants/theme';

// Lock duration options
export type LockDuration = 2 | 4 | 8;

// Lock fee percentages by duration
export const LOCK_FEE_PERCENTAGES: Record<LockDuration, number> = {
  2: 5,   // 2 hours = 5%
  4: 10,  // 4 hours = 10%
  8: 15,  // 8 hours = 15%
};

interface DurationChipsProps {
  /** Currently selected duration */
  selectedDuration: LockDuration;
  /** Callback when duration is selected */
  onSelectDuration: (duration: LockDuration) => void;
  /** Product price to calculate lock fee */
  productPrice: number;
  /** Currency symbol */
  currency?: string;
  /** Custom style */
  style?: any;
}

// Duration options configuration
const DURATION_OPTIONS: Array<{ duration: LockDuration; label: string }> = [
  { duration: 2, label: '2 Hours' },
  { duration: 4, label: '4 Hours' },
  { duration: 8, label: '8 Hours' },
];

/**
 * Calculate lock fee for a given duration
 */
export const calculateLockFee = (price: number, duration: LockDuration): number => {
  const percentage = LOCK_FEE_PERCENTAGES[duration];
  return Math.ceil((price * percentage) / 100);
};

export const DurationChips: React.FC<DurationChipsProps> = ({
  selectedDuration,
  onSelectDuration,
  productPrice,
  currency,
  style,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const getLocale = useGetLocale();
  const locale = getLocale();
  const currencySymbol = currency || getCurrencySymbol();
  const handleSelect = (duration: LockDuration) => {
    triggerImpact('Light');
    onSelectDuration(duration);
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Choose Lock Duration</Text>

      <View style={styles.chipsContainer}>
        {DURATION_OPTIONS.map(({ duration, label }) => {
          const isSelected = selectedDuration === duration;
          const feePercentage = LOCK_FEE_PERCENTAGES[duration];
          const lockFee = calculateLockFee(productPrice, duration);

          return (
            <Pressable
              key={duration}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
              onPress={() => handleSelect(duration)}
             
            >
              {/* Clock Icon */}
              <Ionicons
                name="time-outline"
                size={20}
                color={isSelected ? colors.background.primary : colors.neutral[500]}
              />

              {/* Duration Label */}
              <Text
                style={[
                  styles.chipLabel,
                  isSelected && styles.chipLabelSelected,
                ]}
              >
                {label}
              </Text>

              {/* Fee Badge (shown for all, highlighted when selected) */}
              <View style={[
                styles.feeBadge,
                !isSelected && styles.feeBadgeUnselected,
              ]}>
                <Text style={[
                  styles.feeText,
                  !isSelected && styles.feeTextUnselected,
                ]}>
                  {feePercentage}%
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Selected Duration Fee Info */}
      <View style={styles.feeInfo}>
        <Text style={styles.feeInfoText}>
          Lock Price ({LOCK_FEE_PERCENTAGES[selectedDuration]}%)
        </Text>
        <Text style={styles.feeAmount}>
          {currencySymbol}{calculateLockFee(productPrice, selectedDuration).toLocaleString(locale)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 14,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 12,
  },

  chipsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },

  chip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 80,
  },

  chipSelected: {
    backgroundColor: colors.lightMustard,
    borderColor: colors.lightMustard,
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  chipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[700],
    textAlign: 'center',
  },

  chipLabelSelected: {
    color: colors.background.primary,
  },

  feeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },

  feeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background.primary,
  },

  feeBadgeUnselected: {
    backgroundColor: colors.neutral[100],
  },

  feeTextUnselected: {
    color: colors.neutral[500],
  },

  feeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },

  feeInfoText: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
  },

  feeAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.lightMustard,
    letterSpacing: -0.3,
  },
});

export default React.memo(DurationChips);
