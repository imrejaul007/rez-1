import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { StockStatus } from '@/types/product-variants.types';
import { colors } from '@/constants/theme';

/**
 * StockBadge Component
 *
 * Visual indicator for product stock status
 * Shows different colors and icons based on availability
 */
interface StockBadgeProps {
  status: StockStatus;
  quantity?: number;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export const StockBadge: React.FC<StockBadgeProps> = ({
  status,
  quantity,
  showIcon = true,
  size = 'medium',
  style,
}) => {
  /**
   * Get badge configuration based on stock status
   */
  const getBadgeConfig = () => {
    switch (status) {
      case 'in_stock':
        return {
          icon: 'checkmark-circle',
          iconColor: colors.successScale[400],
          backgroundColor: colors.tint.green,
          textColor: '#065F46',
          label: 'In Stock',
        };
      case 'low_stock':
        return {
          icon: 'warning',
          iconColor: colors.warningScale[400],
          backgroundColor: colors.tint.amberLight,
          textColor: colors.brand.amberDark,
          label: quantity ? `Only ${quantity} left` : 'Low Stock',
        };
      case 'out_of_stock':
        return {
          icon: 'close-circle',
          iconColor: colors.error,
          backgroundColor: colors.errorScale[100],
          textColor: '#991B1B',
          label: 'Out of Stock',
        };
      case 'preorder':
        return {
          icon: 'time',
          iconColor: colors.brand.purpleLight,
          backgroundColor: colors.tint.purple,
          textColor: '#5B21B6',
          label: 'Pre-order',
        };
      default:
        return {
          icon: 'help-circle',
          iconColor: colors.neutral[500],
          backgroundColor: colors.neutral[100],
          textColor: colors.neutral[700],
          label: 'Unknown',
        };
    }
  };

  const config = getBadgeConfig();

  // Size configurations
  const sizeConfig = {
    small: {
      containerPadding: { paddingHorizontal: 8, paddingVertical: 4 },
      iconSize: 12,
      fontSize: 11,
      borderRadius: 6,
      gap: 4,
    },
    medium: {
      containerPadding: { paddingHorizontal: 10, paddingVertical: 6 },
      iconSize: 14,
      fontSize: 13,
      borderRadius: 8,
      gap: 6,
    },
    large: {
      containerPadding: { paddingHorizontal: 12, paddingVertical: 8 },
      iconSize: 16,
      fontSize: 14,
      borderRadius: 10,
      gap: 8,
    },
  };

  const currentSize = sizeConfig[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          ...currentSize.containerPadding,
          borderRadius: currentSize.borderRadius,
          gap: currentSize.gap,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Stock status: ${config.label}`}
    >
      {showIcon && (
        <Ionicons
          name={config.icon as any}
          size={currentSize.iconSize}
          color={config.iconColor}
        />
      )}
      <ThemedText
        style={[
          styles.text,
          {
            color: config.textColor,
            fontSize: currentSize.fontSize,
          },
        ]}
      >
        {config.label}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default React.memo(StockBadge);
