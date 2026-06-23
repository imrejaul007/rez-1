/**
 * DiscountBadge Component
 *
 * Badge to display discount percentage or special tags
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffersTheme } from '@/contexts/OffersThemeContext';
import { Typography, Spacing, BorderRadius } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

type BadgeType =
  | 'discount'
  | 'cashback'
  | 'new'
  | 'trending'
  | 'lightning'
  | 'freeDelivery'
  | 'exclusive';

interface DiscountBadgeProps {
  type: BadgeType;
  value?: number | string;
  size?: 'small' | 'medium' | 'large';
  position?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'inline';
}

export const DiscountBadge: React.FC<DiscountBadgeProps> = ({
  type,
  value,
  size = 'medium',
  position = 'inline',
}) => {
  const { theme, isDark } = useOffersTheme();

  const getBadgeConfig = () => {
    switch (type) {
      case 'discount':
        return {
          backgroundColor: colors.errorScale[100],
          textColor: colors.error,
          icon: 'pricetag' as const,
          text: value ? `${value}% OFF` : 'SALE',
        };
      case 'cashback':
        return {
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : colors.tint.green,
          textColor: isDark ? colors.successScale[400] : colors.successScale[700],
          icon: 'cash' as const,
          text: value ? `${value}% Cashback` : 'Cashback',
        };
      case 'new':
        return {
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : colors.tint.green,
          textColor: isDark ? colors.successScale[400] : colors.successScale[700],
          icon: 'sparkles' as const,
          text: 'NEW',
        };
      case 'trending':
        return {
          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : colors.errorScale[100],
          textColor: isDark ? colors.errorScale[400] : colors.error,
          icon: 'trending-up' as const,
          text: 'TRENDING',
        };
      case 'lightning':
        return {
          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : colors.tint.amberLight,
          textColor: isDark ? colors.warningScale[400] : colors.warningScale[700],
          icon: 'flash' as const,
          text: 'FLASH',
        };
      case 'freeDelivery':
        return {
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : colors.tint.blueLight,
          textColor: isDark ? colors.infoScale[400] : colors.brand.blue,
          icon: 'car' as const,
          text: 'FREE DELIVERY',
        };
      case 'exclusive':
        return {
          backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : colors.tint.purple,
          textColor: isDark ? colors.brand.purpleSoft : colors.brand.purple,
          icon: 'star' as const,
          text: 'EXCLUSIVE',
        };
      default:
        return {
          backgroundColor: theme.colors.border.light,
          textColor: theme.colors.text.secondary,
          icon: 'pricetag' as const,
          text: '',
        };
    }
  };

  const config = getBadgeConfig();

  const getPadding = () => {
    switch (size) {
      case 'small':
        return { horizontal: 6, vertical: 2 };
      case 'large':
        return { horizontal: 12, vertical: 6 };
      default:
        return { horizontal: 8, vertical: 4 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 9;
      case 'large':
        return 12;
      default:
        return 10;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 8;
      case 'large':
        return 14;
      default:
        return 10;
    }
  };

  const padding = getPadding();

  const getPositionStyle = () => {
    const base = { position: 'absolute' as const, zIndex: 10 };
    switch (position) {
      case 'topLeft':
        return { ...base, top: 8, left: 8 };
      case 'topRight':
        return { ...base, top: 8, right: 8 };
      case 'bottomLeft':
        return { ...base, bottom: 8, left: 8 };
      case 'bottomRight':
        return { ...base, bottom: 8, right: 8 };
      default:
        return {};
    }
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: config.backgroundColor,
      paddingHorizontal: padding.horizontal,
      paddingVertical: padding.vertical,
      borderRadius: BorderRadius.sm,
      ...getPositionStyle(),
    },
    icon: {
      marginRight: 3,
    },
    text: {
      fontSize: getFontSize(),
      fontWeight: '700',
      color: config.textColor,
      letterSpacing: 0.3,
    },
  });

  return (
    <View style={styles.container}>
      {size !== 'small' && (
        <Ionicons
          name={config.icon}
          size={getIconSize()}
          color={config.textColor}
          style={styles.icon}
        />
      )}
      <Text style={styles.text}>{config.text}</Text>
    </View>
  );
};

export default React.memo(DiscountBadge);
