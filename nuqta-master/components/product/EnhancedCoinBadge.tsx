/**
 * EnhancedCoinBadge Component
 *
 * Displays coin balance in a pill format
 * Format: "🪙 1,240"
 *
 * Used in ProductPage header to show user's coin balance
 */

import React from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetLocale } from '@/stores/selectors';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface EnhancedCoinBadgeProps {
  /** User's coin balance */
  coinCount: number;
  /** Callback when badge is pressed */
  onPress?: () => void;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Custom style */
  style?: any;
}

// Size configurations
const SIZES = {
  small: { coin: 18, fontSize: 12, height: 32, padding: 10 },
  medium: { coin: 20, fontSize: 14, height: 36, padding: 12 },
  large: { coin: 24, fontSize: 16, height: 42, padding: 14 },
};

/**
 * Format number with thousands separator
 */
const formatNumber = (num: number, locale: string): string => {
  if (num >= 10000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toLocaleString(locale);
};

export const EnhancedCoinBadge: React.FC<EnhancedCoinBadgeProps> = ({
  coinCount,
  onPress,
  size = 'medium',
  style,
}) => {
  const getLocale = useGetLocale();
  const locale = getLocale();
  const config = SIZES[size];

  const content = (
    <LinearGradient
      colors={[colors.warningScale[400], colors.warningScale[700]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.container,
        {
          height: config.height,
          paddingHorizontal: config.padding,
          borderRadius: config.height / 2,
        },
        style,
      ]}
    >
      {/* Coin Icon */}
      <CachedImage
        source={BRAND.COIN_IMAGE}
        style={{ width: config.coin, height: config.coin }}
        contentFit="contain"
      />

      {/* Coin Count */}
      <Text
        style={[
          styles.coinText,
          {
            fontSize: config.fontSize,
            fontFamily: Platform.select({
              ios: 'Inter-Bold',
              android: 'Inter-Bold',
              default: undefined,
            }),
          },
        ]}
      >
        {formatNumber(coinCount, locale)}
      </Text>
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
       
        accessibilityLabel={`${coinCount} ReZ coins`}
        accessibilityRole="button"
        accessibilityHint="Tap to view your coin wallet"
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: colors.warningScale[400],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  coinText: {
    color: colors.background.primary,
    fontWeight: '700',
  },
});

export default React.memo(EnhancedCoinBadge);
