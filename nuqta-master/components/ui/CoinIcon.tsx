/**
 * CoinIcon Component
 * Reusable component for displaying the ReZ coin image
 * Use this instead of emoji 🪙 for consistent coin display across the app
 */

import React from 'react';
import { ImageStyle, StyleProp, View, Text, StyleSheet } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface CoinIconProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
  withAmount?: number;
  amountColor?: string;
  amountSize?: number;
}

const CoinIcon: React.FC<CoinIconProps> = ({
  size = 20,
  style,
  withAmount,
  amountColor = colors.warningScale[400],
  amountSize,
}) => {
  const coinImage = (
    <CachedImage
      source={BRAND.COIN_IMAGE}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      transition={200}
    />
  );

  if (withAmount !== undefined) {
    return (
      <View style={styles.container}>
        {coinImage}
        <Text style={[
          styles.amount,
          {
            color: amountColor,
            fontSize: amountSize || size * 0.7,
          }
        ]}>
          {formatCoinAmount(withAmount)}
        </Text>
      </View>
    );
  }

  return coinImage;
};

// Helper to format coin amounts
const formatCoinAmount = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toLocaleString();
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amount: {
    fontWeight: '700',
  },
});

export default React.memo(CoinIcon);
