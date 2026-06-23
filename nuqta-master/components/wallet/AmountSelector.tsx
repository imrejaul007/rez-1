/**
 * AmountSelector - Horizontal pill carousel for recharge amounts
 * Shows amount options as tappable pills with selected state
 */
import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface AmountSelectorProps {
  amounts: number[];
  selectedAmount: number | null;
  onSelect: (amount: number) => void;
  currency?: string;
}

export const AmountSelector: React.FC<AmountSelectorProps> = ({
  amounts,
  selectedAmount,
  onSelect,
  currency = BRAND.CURRENCY_CODE,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {amounts.map((amount) => {
        const isSelected = selectedAmount === amount;
        return (
          <Pressable
            key={amount}
            style={[styles.pill, isSelected && styles.pillSelected]}
            onPress={() => onSelect(amount)}
           
            accessibilityLabel={`${currency} ${amount}`}
            accessibilityState={{ selected: isSelected }}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.pillText, isSelected && styles.pillTextSelected]}>
              {amount.toLocaleString()}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background.accent,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  pillSelected: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  pillTextSelected: {
    color: colors.text.white,
  },
});

export default React.memo(AmountSelector);
