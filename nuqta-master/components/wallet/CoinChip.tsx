/**
 * CoinChip - Small pill showing coin type + amount
 * Used in BalanceDisplay row under total balance
 */
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { BRAND } from '@/constants/brand';
import { CoinType, COIN_TYPES } from '@/types/wallet';
import { Spacing, BorderRadius } from '@/constants/DesignSystem';

interface CoinChipProps {
  type: CoinType;
  amount: number;
  onPress?: () => void;
  compact?: boolean;
}

export const CoinChip: React.FC<CoinChipProps> = React.memo(({ type, amount, onPress, compact }) => {
  const coinInfo = COIN_TYPES[type] || COIN_TYPES.rez;
  const chipBg = coinInfo.backgroundColor;
  const textColor = coinInfo.amountColor;
  const label = type === 'rez' || type === 'nuqta' ? BRAND.APP_NAME : type === 'promo' ? 'Promo' : 'Branded';

  const content = (
    <View style={[styles.chip, { backgroundColor: chipBg }, compact && styles.chipCompact]}>
      <View style={[styles.dot, { backgroundColor: coinInfo.color }]} />
      <ThemedText style={[styles.label, { color: textColor }]}>
        {label}: {Number.isFinite(amount) ? amount.toLocaleString() : '0'}
      </ThemedText>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label} coins: ${amount}`}>
        {content}
      </Pressable>
    );
  }

  return content;
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    gap: 5,
  },
  chipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});

export default CoinChip;
