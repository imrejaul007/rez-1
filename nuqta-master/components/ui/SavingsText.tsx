import React from 'react';
import { Text, TextStyle } from 'react-native';
import { colors } from '@/constants/theme';

type SavingsSize = 'hero' | 'card' | 'inline' | 'small';

interface SavingsTextProps {
  amount: number;
  isRupees?: boolean;
  size?: SavingsSize;
  style?: TextStyle;
}

const SIZE_STYLES: Record<SavingsSize, TextStyle> = {
  hero: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary[500],
    letterSpacing: -0.5,
  },
  card: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary[500],
  },
  inline: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[500],
  },
  small: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[500],
  },
};

function SavingsText({
  amount,
  isRupees = false,
  size = 'card',
  style,
}: SavingsTextProps) {
  const rupees = isRupees ? amount : Math.floor(amount / 100);
  const formatted = `\u20B9${rupees.toLocaleString('en-IN')}`;
  return (
    <Text style={[SIZE_STYLES[size], style]}>
      {formatted}
    </Text>
  );
}

export default React.memo(SavingsText);
