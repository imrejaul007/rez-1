import React from 'react';
import { Pressable, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

/**
 * VariantOptionButton Component
 *
 * Displays a single selectable variant option value (e.g., "Red", "Large", "Cotton")
 * Supports multiple display modes: text, color swatch, image
 */
interface VariantOptionButtonProps {
  value: string;
  displayName?: string;
  isSelected: boolean;
  isAvailable: boolean;
  onPress: () => void;
  hexColor?: string; // For color swatches
  imageUrl?: string; // For image-based options
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'color' | 'image';
}

export const VariantOptionButton: React.FC<VariantOptionButtonProps> = ({
  value,
  displayName,
  isSelected,
  isAvailable,
  onPress,
  hexColor,
  imageUrl,
  size = 'medium',
  variant = 'text',
}) => {
  const label = displayName || value;

  // Determine variant type if not explicitly provided
  const buttonVariant = variant === 'color' || hexColor ? 'color' : variant;

  const containerStyle = [
    styles.container,
    styles[`${size}Container`],
    isSelected && styles.selected,
    !isAvailable && styles.unavailable,
  ];

  const textStyle = [
    styles.text,
    styles[`${size}Text`],
    isSelected && styles.selectedText,
    !isAvailable && styles.unavailableText,
  ];

  // Color swatch variant
  if (buttonVariant === 'color' && hexColor) {
    return (
      <Pressable
        style={[
          styles.colorSwatchContainer,
          styles[`${size}ColorSwatch`],
          isSelected && styles.colorSwatchSelected,
          !isAvailable && styles.unavailable,
        ]}
        onPress={onPress}
        disabled={!isAvailable}
       
        accessibilityRole="button"
        accessibilityLabel={`${label} color option`}
        accessibilityHint={isAvailable ? (isSelected ? "Selected, tap to deselect" : "Tap to select this color") : "This color is not available"}
        accessibilityState={{
          selected: isSelected,
          disabled: !isAvailable
        }}
      >
        <View
          style={[
            styles.colorSwatch,
            { backgroundColor: hexColor },
            !isAvailable && styles.colorSwatchUnavailable,
          ]}
        >
          {isSelected && (
            <View style={styles.checkIconContainer}>
              <Ionicons
                name="checkmark"
                size={size === 'small' ? 12 : size === 'medium' ? 16 : 20}
                color={colors.background.primary}
              />
            </View>
          )}
          {!isAvailable && (
            <View style={styles.diagonalLine} />
          )}
        </View>
        <ThemedText style={[styles.colorLabel, styles[`${size}ColorLabel`]]}>
          {label}
        </ThemedText>
      </Pressable>
    );
  }

  // Text variant (default)
  return (
    <Pressable
      style={containerStyle}
      onPress={onPress}
      disabled={!isAvailable}
     
      accessibilityRole="button"
      accessibilityLabel={`${label} option`}
      accessibilityHint={isAvailable ? (isSelected ? "Selected, tap to deselect" : "Tap to select this option") : "This option is not available"}
      accessibilityState={{
        selected: isSelected,
        disabled: !isAvailable
      }}
    >
      <ThemedText style={textStyle}>{label}</ThemedText>
      {!isAvailable && (
        <View style={styles.strikethrough} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Text variant
  container: {
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.background.primary,
    position: 'relative',
  },
  smallContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mediumContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  largeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  selected: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.pink,
  },
  unavailable: {
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[50],
    opacity: 0.6,
  },

  // Text styles
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  selectedText: {
    color: colors.brand.purpleLight,
    fontWeight: '600',
  },
  unavailableText: {
    color: colors.neutral[400],
  },

  // Strikethrough for unavailable options
  strikethrough: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: colors.neutral[400],
  },

  // Color swatch variant
  colorSwatchContainer: {
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 12,
  },
  smallColorSwatch: {
    marginRight: 12,
  },
  mediumColorSwatch: {
    marginRight: 16,
  },
  largeColorSwatch: {
    marginRight: 20,
  },
  colorSwatchSelected: {
    opacity: 1,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  colorSwatchUnavailable: {
    opacity: 0.4,
  },
  checkIconContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  diagonalLine: {
    position: 'absolute',
    width: '140%',
    height: 2,
    backgroundColor: colors.neutral[400],
    transform: [{ rotate: '45deg' }],
  },
  colorLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral[700],
    textAlign: 'center',
  },
  smallColorLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  mediumColorLabel: {
    fontSize: 12,
    marginTop: 6,
  },
  largeColorLabel: {
    fontSize: 14,
    marginTop: 8,
  },
});

export default React.memo(VariantOptionButton);
