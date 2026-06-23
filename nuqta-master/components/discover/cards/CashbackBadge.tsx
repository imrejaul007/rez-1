// CashbackBadge.tsx - Cashback percentage badge component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface CashbackBadgeProps {
  percent: number | string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'light' | 'dark';
}

function CashbackBadge({
  percent,
  size = 'medium',
  variant = 'default',
}: CashbackBadgeProps) {
  const percentValue = typeof percent === 'string' ? percent : `${percent}%`;

  const containerStyle = [
    styles.container,
    styles[`container_${size}`],
    styles[`container_${variant}`],
  ];

  const textStyle = [
    styles.text,
    styles[`text_${size}`],
    styles[`text_${variant}`],
  ];

  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{percentValue} Cashback</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  container_small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  container_medium: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  container_large: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  container_default: {
    backgroundColor: 'transparent',
  },
  container_light: {
    backgroundColor: 'rgba(255, 205, 87, 0.15)',
  },
  container_dark: {
    backgroundColor: 'rgba(255, 205, 87, 0.25)',
  },
  text: {
    fontWeight: '600',
  },
  text_small: {
    fontSize: 10,
  },
  text_medium: {
    fontSize: 12,
  },
  text_large: {
    fontSize: 14,
  },
  text_default: {
    color: colors.nileBlue,
  },
  text_light: {
    color: colors.lightMustard,
  },
  text_dark: {
    color: colors.nileBlue,
  },
});

export default React.memo(CashbackBadge);
