// @ts-nocheck
/**
 * CoinProportionBar - Horizontal stacked bar showing the proportion of
 * Rez, Promo, and Branded coins with a legend below.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '@/constants/theme';

interface CoinProportionBarProps {
  rezBalance: number;
  promoBalance: number;
  brandedBalance: number;
  totalBalance: number;
  currencySymbol: string;
}

const COLORS = {
  rez: colors.primary[500],
  promo: colors.brand.purpleLight,
  branded: colors.brand.orange,
  empty: colors.neutral[200],
};

function CoinProportionBar({
  rezBalance,
  promoBalance,
  brandedBalance,
  totalBalance,
  currencySymbol,
}: CoinProportionBarProps) {
  const total = totalBalance > 0 ? totalBalance : 1;
  const rezFlex = totalBalance > 0 ? rezBalance / total : 1 / 3;
  const promoFlex = totalBalance > 0 ? promoBalance / total : 1 / 3;
  const brandedFlex = totalBalance > 0 ? brandedBalance / total : 1 / 3;

  const segments = [
    { flex: rezFlex, color: COLORS.rez, key: 'rez' },
    { flex: promoFlex, color: COLORS.promo, key: 'promo' },
    { flex: brandedFlex, color: COLORS.branded, key: 'branded' },
  ].filter(s => s.flex > 0);

  const legendItems = [
    { color: COLORS.rez, label: 'Rez', amount: rezBalance },
    { color: COLORS.promo, label: 'Promo', amount: promoBalance },
    { color: COLORS.branded, label: 'Branded', amount: brandedBalance },
  ];

  return (
    <View style={styles.card}>
      {/* Proportion Bar */}
      <View style={styles.bar}>
        {segments.length > 0 ? (
          segments.map((seg) => (
            <View
              key={seg.key}
              style={[styles.segment, { flex: seg.flex, backgroundColor: seg.color }]}
            />
          ))
        ) : (
          <View style={[styles.segment, { flex: 1, backgroundColor: COLORS.empty }]} />
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {legendItems.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>
              {item.label} {currencySymbol}{item.amount.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  bar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.border.primary,
  },
  segment: {
    height: 8,
  },
  legend: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.text.primary,
  },
});

export default React.memo(CoinProportionBar);
