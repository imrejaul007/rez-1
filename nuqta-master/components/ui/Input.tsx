import React, { useState } from 'react';
import { View, TextInput, StyleSheet, ViewStyle, TextInputProps, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, borderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import Text from './Text';

type InputSize = 'small' | 'medium' | 'large';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  size?: InputSize;
  showCharCount?: boolean;
}

const SIZE_HEIGHT: Record<InputSize, number> = {
  small: 40,
  medium: 48,
  large: 56,
};

function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  size = 'medium',
  showCharCount = false,
  style,
  secureTextEntry,
  maxLength,
  value,
  ...textInputProps
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isSecure = secureTextEntry && !isPasswordVisible;
  const showPasswordToggle = secureTextEntry && !rightIcon;
  const charCount = value?.length ?? 0;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="bodySmall" color="secondary" style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            minHeight: SIZE_HEIGHT[size],
            borderColor: colors.border.default,
            backgroundColor: colors.background.primary,
          },
          isFocused && { borderColor: colors.brand.purple, borderWidth: 2 },
          error ? { borderColor: colors.error } : undefined,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, { color: colors.text.primary }, style]}
          placeholderTextColor={colors.text.tertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isSecure}
          maxLength={maxLength}
          value={value}
          {...textInputProps}
        />
        {showPasswordToggle && (
          <Pressable
            onPress={() => setIsPasswordVisible((v) => !v)}
            style={styles.rightIcon}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.text.tertiary}
            />
          </Pressable>
        )}
        {rightIcon && !showPasswordToggle && (
          <View style={styles.rightIcon}>{rightIcon}</View>
        )}
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.bottomTextContainer}>
          {error && (
            <Text variant="caption" color="error" style={styles.helperText}>
              {error}
            </Text>
          )}
          {helperText && !error && (
            <Text variant="caption" color="tertiary" style={styles.helperText}>
              {helperText}
            </Text>
          )}
        </View>
        {showCharCount && maxLength && (
          <Text variant="caption" color="tertiary">
            {charCount}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  leftIcon: {
    marginLeft: spacing.base,
  },
  rightIcon: {
    marginRight: spacing.base,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomTextContainer: {
    flex: 1,
  },
  helperText: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});

export default React.memo(Input);
