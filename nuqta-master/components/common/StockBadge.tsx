import React, { useEffect} from 'react';
import { View, StyleSheet} from 'react-native';
import Animated, { useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useStockStatus } from '@/hooks/useStockStatus';
import { colors } from '@/constants/theme';

interface StockBadgeProps {
  stock: number;
  lowStockThreshold?: number;
  variant?: 'default' | 'compact';
  showIcon?: boolean;
}

function StockBadge({
  stock,
  lowStockThreshold = 5,
  variant = 'default',
  showIcon = true,
}: StockBadgeProps) {
  const { isOutOfStock, isLowStock, stockMessage } = useStockStatus({
    stock,
    lowStockThreshold,
  });

  const scaleAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  // Entrance animation
  useEffect(() => {
    scaleAnim.value = withSpring(1);
  }, []);

  // Pulse animation for low stock
  useEffect(() => {
    if (isLowStock) {
      pulseAnim.value = withRepeat(withSequence(withTiming(1.05, { duration: 800 })), -1);
      
      }
  }, [isLowStock]);

  // Determine badge styling based on stock status
  const getBadgeStyle = () => {
    if (isOutOfStock) {
      return styles.outOfStockBadge;
    } else if (isLowStock) {
      return styles.lowStockBadge;
    } else {
      return styles.inStockBadge;
    }
  };

  const getTextStyle = () => {
    if (isOutOfStock) {
      return styles.outOfStockText;
    } else if (isLowStock) {
      return styles.lowStockText;
    } else {
      return styles.inStockText;
    }
  };

  const getIconName = () => {
    if (isOutOfStock) {
      return 'close-circle';
    } else if (isLowStock) {
      return 'alert-circle';
    } else {
      return 'checkmark-circle';
    }
  };

  const getIconColor = () => {
    if (isOutOfStock) {
      return colors.error;
    } else if (isLowStock) {
      return colors.warningScale[700];
    } else {
      return colors.successScale[700];
    }
  };

  const isCompact = variant === 'compact';

  const accessibilityLabel = `Stock status: ${stockMessage}${isLowStock ? '. Limited availability' : ''}${isOutOfStock ? '. Product currently unavailable' : ''}`;

  return (
    <Animated.View
      style={[
        styles.container,
        getBadgeStyle(),
        isCompact && styles.compactContainer,
        {
          transform: [
            { scale: scaleAnim },
            ...(isLowStock ? [{ scale: pulseAnim }] : []),
          ],
        },
      ]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      {showIcon && (
        <Ionicons
          name={getIconName()}
          size={isCompact ? 10 : 12}
          color={getIconColor()}
        />
      )}
      <ThemedText
        style={[
          getTextStyle(),
          isCompact && styles.compactText,
        ]}
      >
        {stockMessage}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  compactContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outOfStockBadge: {
    backgroundColor: colors.errorScale[100],
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  lowStockBadge: {
    backgroundColor: colors.tint.amberLight,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  inStockBadge: {
    backgroundColor: colors.tint.green,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },
  lowStockText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warningScale[700],
  },
  inStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.successScale[700],
  },
  compactText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default React.memo(StockBadge);
