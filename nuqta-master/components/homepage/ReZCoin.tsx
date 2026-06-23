/**
 * ReZCoin Component
 *
 * Displays the branded Rez coin with:
 * - Mustard gradient ring (#ffcd57 -> #e5b64d)
 * - Inner gold circle (#ffcd57)
 * - Rez mark in center (#1a3a52)
 * - Balance display in pill format
 * - Tappable with navigation support
 *
 * Based on brand guidelines - Coin Visual Language
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

// Brand colors from TASK.md
const BRAND_COLORS = {
  primaryGreen: colors.lightMustard,
  deepGreen: colors.brand.goldRich,
  sunGold: colors.lightMustard,
  goldDark: '#FFB830',
  midnightNavy: colors.nileBlue,
};

interface ReZCoinProps {
  /** User's coin balance */
  balance: number;
  /** Size variant: small (header), medium (card), large (wallet) */
  size?: 'small' | 'medium' | 'large';
  /** Callback when coin is pressed */
  onPress?: () => void;
  /** Whether to show the balance number */
  showBalance?: boolean;
  /** Custom style for the container */
  style?: any;
}

// Size configurations
const SIZES = {
  small: { coin: 22, fontSize: 14, pillPadding: 8, pillHeight: 28 },
  medium: { coin: 32, fontSize: 16, pillPadding: 10, pillHeight: 36 },
  large: { coin: 44, fontSize: 20, pillPadding: 14, pillHeight: 48 },
};

/**
 * NuqtaCoin Component
 *
 * Renders the branded Rez coin with gradient ring and Rez mark
 */
export const NuqtaCoin: React.FC<ReZCoinProps> = ({
  balance,
  size = 'small',
  onPress,
  showBalance = true,
  style,
}) => {
  const config = SIZES[size];

  /**
   * CoinIcon - Renders the coin image
   */
  const CoinIcon = () => (
    <CachedImage
      source={BRAND.COIN_IMAGE}
      style={{ width: config.coin, height: config.coin }}
      contentFit="contain"
      transition={200}
    />
  );

  /**
   * Format balance with thousands separator
   */
  const formatBalance = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString();
  };

  const content = (
    <View
      style={[
        styles.pill,
        {
          paddingHorizontal: config.pillPadding,
          height: config.pillHeight,
        },
        style,
      ]}
    >
      <CoinIcon />
      {showBalance && (
        <Text
          style={[
            styles.balance,
            {
              fontSize: config.fontSize,
              fontFamily: Platform.select({
                ios: 'Inter-SemiBold',
                android: 'Inter-SemiBold',
                default: undefined,
              }),
            },
          ]}
        >
          {formatBalance(balance)}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
       
        accessibilityLabel={`${BRAND.COIN_NAME}: ${balance}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view your coin details and rewards"
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 4,
    gap: 6,
  },
  balance: {
    color: colors.background.primary,
    fontWeight: '600',
  },
});

export default React.memo(NuqtaCoin);
