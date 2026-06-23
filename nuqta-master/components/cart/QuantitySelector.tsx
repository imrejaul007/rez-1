import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

/**
 * QuantitySelector Component
 * A reusable component for adjusting product quantities
 * Features:
 * - Increment/Decrement buttons with ReZ green theme
 * - Min/Max bounds validation
 * - Disabled state styling
 * - Full TypeScript support
 * - Touch feedback with Pressable
 * - Responsive sizing for mobile
 * - Accessibility support
 */

interface QuantitySelectorProps {
  /** Current quantity value */
  quantity: number;
  /** Minimum quantity allowed (default: 1) */
  min?: number;
  /** Maximum quantity allowed */
  max?: number;
  /** Callback fired when quantity changes */
  onQuantityChange: (quantity: number) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Optional style overrides */
  style?: any;
  /** Optional size variant: 'small' | 'normal' (default: 'normal') */
  size?: 'small' | 'normal';
}

function QuantitySelector({
  quantity,
  min = 1,
  max,
  onQuantityChange,
  disabled = false,
  style,
  size = 'normal',
}: QuantitySelectorProps) {
  const { width } = Dimensions.get('window');
  const isSmallScreen = width < 360;

  // Check bounds
  const canDecrease = quantity > min;
  const canIncrease = max ? quantity < max : true;
  const isDecreaseDisabled = !canDecrease || disabled;
  const isIncreaseDisabled = !canIncrease || disabled;

  const handleDecrease = () => {
    if (canDecrease && !disabled) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (canIncrease && !disabled) {
      onQuantityChange(quantity + 1);
    }
  };

  const styles_config = size === 'small' ? stylesSmall : stylesNormal;

  return (
    <View
      style={[styles_config.container, style]}
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={`Quantity selector, current quantity ${quantity}`}
      accessibilityHint={`Use minus and plus buttons to adjust quantity between ${min} and ${max || 'unlimited'}`}
      accessibilityState={{
        disabled,
        selected: true,
      }}
    >
      {/* Decrease Button */}
      <Pressable
        style={[
          styles_config.button,
          styles_config.decreaseButton,
          (isDecreaseDisabled) && styles_config.buttonDisabled,
        ]}
        onPress={handleDecrease}
        disabled={isDecreaseDisabled}
       
        accessibilityLabel="Decrease quantity"
        accessibilityRole="button"
        accessibilityState={{ disabled: isDecreaseDisabled }}
        accessibilityHint={
          isDecreaseDisabled
            ? `Minimum quantity of ${min} reached`
            : `Decrease quantity from ${quantity}`
        }
      >
        <Ionicons
          name="remove"
          size={size === 'small' ? 14 : 18}
          color={isDecreaseDisabled ? 'rgba(0, 192, 106, 0.4)' : colors.lightMustard}
        />
      </Pressable>

      {/* Quantity Display */}
      <View
        style={[
          styles_config.display,
          disabled && styles_config.displayDisabled,
        ]}
        accessible={true}
        accessibilityLabel={`Current quantity: ${quantity}`}
        accessibilityRole="text"
      >
        <ThemedText
          style={[
            styles_config.quantityText,
            disabled && styles_config.quantityTextDisabled,
          ]}
        >
          {quantity}
        </ThemedText>
      </View>

      {/* Increase Button */}
      <Pressable
        style={[
          styles_config.button,
          styles_config.increaseButton,
          (isIncreaseDisabled) && styles_config.buttonDisabled,
        ]}
        onPress={handleIncrease}
        disabled={isIncreaseDisabled}
       
        accessibilityLabel="Increase quantity"
        accessibilityRole="button"
        accessibilityState={{ disabled: isIncreaseDisabled }}
        accessibilityHint={
          isIncreaseDisabled && max
            ? `Maximum quantity of ${max} reached`
            : `Increase quantity from ${quantity}`
        }
      >
        <Ionicons
          name="add"
          size={size === 'small' ? 14 : 18}
          color={isIncreaseDisabled ? 'rgba(0, 192, 106, 0.4)' : colors.lightMustard}
        />
      </Pressable>
    </View>
  );
}

/**
 * Normal Size Styles (default)
 */
const stylesNormal = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 192, 106, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 192, 106, 0.2)',
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.lightMustard,
    backgroundColor: colors.background.primary,
  },
  decreaseButton: {
    // Base style, specific styles applied via array
  },
  increaseButton: {
    // Base style, specific styles applied via array
  },
  buttonDisabled: {
    opacity: 0.5,
    borderColor: 'rgba(0, 192, 106, 0.4)',
  },
  display: {
    minWidth: 50,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 192, 106, 0.2)',
  },
  displayDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.nileBlue,
    textAlign: 'center',
  },
  quantityTextDisabled: {
    color: 'rgba(0, 192, 106, 0.5)',
  },
});

/**
 * Small Size Styles (compact variant)
 */
const stylesSmall = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 192, 106, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 192, 106, 0.2)',
  },
  button: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.lightMustard,
    backgroundColor: colors.background.primary,
  },
  decreaseButton: {
    // Base style, specific styles applied via array
  },
  increaseButton: {
    // Base style, specific styles applied via array
  },
  buttonDisabled: {
    opacity: 0.5,
    borderColor: 'rgba(0, 192, 106, 0.4)',
  },
  display: {
    minWidth: 32,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: 'rgba(0, 192, 106, 0.2)',
    paddingHorizontal: 8,
  },
  displayDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.nileBlue,
    textAlign: 'center',
  },
  quantityTextDisabled: {
    color: 'rgba(0, 192, 106, 0.5)',
  },
});

export default React.memo(QuantitySelector);
