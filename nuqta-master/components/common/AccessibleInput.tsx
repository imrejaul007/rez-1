/**
 * AccessibleInput Component
 *
 * Fully accessible input component with:
 * - Screen reader support
 * - Error state announcements
 * - Label and hint text
 * - Required field indicators
 * - Character count
 * - Clear button
 *
 * Follows WCAG 2.1 AA guidelines
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';
import {
  getAccessibleInputProps,
  announceValidationError,
  MIN_TOUCH_TARGET_SIZE,
} from '@/utils/accessibilityUtils';

interface AccessibleInputProps extends Omit<TextInputProps, 'style'> {
  /**
   * Input label
   */
  label: string;

  /**
   * Current input value
   */
  value: string;

  /**
   * Value change handler
   */
  onChangeText: (text: string) => void;

  /**
   * Input type/variant
   */
  type?: 'text' | 'email' | 'phone' | 'password' | 'number';

  /**
   * Whether field is required
   */
  required?: boolean;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Helper text below input
   */
  helperText?: string;

  /**
   * Maximum character count
   */
  maxLength?: number;

  /**
   * Show character counter
   */
  showCharCount?: boolean;

  /**
   * Show clear button
   */
  showClearButton?: boolean;

  /**
   * Whether input is disabled
   */
  disabled?: boolean;

  /**
   * Icon to show on left side
   */
  leftIcon?: keyof typeof Ionicons.glyphMap;

  /**
   * Icon to show on right side (besides clear button)
   */
  rightIcon?: keyof typeof Ionicons.glyphMap;

  /**
   * Custom container style
   */
  containerStyle?: ViewStyle;

  /**
   * Custom input style
   */
  inputStyle?: TextStyle;

  /**
   * Test ID for testing
   */
  testID?: string;
}

const AccessibleInput: React.FC<AccessibleInputProps> = ({
  label,
  value,
  onChangeText,
  type = 'text',
  required = false,
  error,
  helperText,
  maxLength,
  showCharCount = false,
  showClearButton = true,
  disabled = false,
  leftIcon,
  rightIcon,
  containerStyle,
  inputStyle,
  testID,
  onFocus,
  onBlur,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);

  /**
   * Get keyboard type based on input type
   */
  const getKeyboardType = (): TextInputProps['keyboardType'] => {
    switch (type) {
      case 'email':
        return 'email-address';
      case 'phone':
        return 'phone-pad';
      case 'number':
        return 'numeric';
      default:
        return 'default';
    }
  };

  /**
   * Get autocomplete type
   */
  const getAutoCompleteType = (): TextInputProps['autoComplete'] => {
    switch (type) {
      case 'email':
        return 'email';
      case 'phone':
        return 'tel';
      case 'password':
        return 'password';
      default:
        return 'off';
    }
  };

  /**
   * Handle focus
   */
  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  /**
   * Handle blur
   */
  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    onBlur?.(e);

    // Announce error if present
    if (error) {
      announceValidationError(label, error);
    }
  };

  /**
   * Handle clear button
   */
  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  /**
   * Get container border color
   */
  const getBorderColor = (): string => {
    if (error) return colors.error;
    if (isFocused) return '#9333EA';
    return colors.neutral[300];
  };

  /**
   * Get accessibility props
   */
  const a11yProps = getAccessibleInputProps({
    label,
    value,
    placeholder: textInputProps.placeholder,
    required,
    error,
  });

  // Ensure accessibilityHint is always a string so screen readers and
  // accessibility tests can rely on a defined value (never undefined).
  if (a11yProps.accessibilityHint === undefined) {
    a11yProps.accessibilityHint = '';
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      <View style={styles.labelContainer}>
        <ThemedText style={styles.label}>
          {label}
          {required && <ThemedText style={styles.required}> *</ThemedText>}
        </ThemedText>

        {/* Character count */}
        {showCharCount && maxLength && (
          <ThemedText style={styles.charCount}>
            {value.length}/{maxLength}
          </ThemedText>
        )}
      </View>

      {/* Input container */}
      <View
        style={[
          styles.inputContainer,
          { borderColor: getBorderColor() },
          disabled && styles.disabled,
        ]}
      >
        {/* Left icon */}
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={colors.neutral[500]}
            style={styles.leftIcon}
          />
        )}

        {/* Text input */}
        <TextInput
          ref={inputRef}
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          maxLength={maxLength}
          keyboardType={getKeyboardType()}
          autoComplete={getAutoCompleteType()}
          secureTextEntry={type === 'password' && !showPassword}
          // Accessibility props
          {...a11yProps}
          // Additional props
          {...textInputProps}
          // Test ID
          testID={testID}
        />

        {/* Right icons */}
        <View style={styles.rightIcons}>
          {/* Password visibility toggle */}
          {type === 'password' && value.length > 0 && (
            <Pressable
              onPress={togglePasswordVisibility}
              style={styles.iconButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? 'Hide password' : 'Show password'
              }
              accessibilityHint="Toggles password visibility"
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={colors.neutral[500]}
              />
            </Pressable>
          )}

          {/* Custom right icon */}
          {rightIcon && (
            <Ionicons
              name={rightIcon}
              size={20}
              color={colors.neutral[500]}
              style={styles.rightIcon}
            />
          )}

          {/* Clear button */}
          {showClearButton && value.length > 0 && !disabled && (
            <Pressable
              onPress={handleClear}
              style={styles.iconButton}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Clear input"
              accessibilityHint="Clears the input field"
            >
              <Ionicons name="close-circle" size={20} color={colors.neutral[500]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Error message */}
      {error && (
        <View
          style={styles.errorContainer}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Helper text */}
      {!error && helperText && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  required: {
    color: colors.error,
  },
  charCount: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: MIN_TOUCH_TARGET_SIZE,
  },
  disabled: {
    backgroundColor: colors.gray[100],
    opacity: 0.6,
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.gray[900],
    paddingVertical: 12,
    minHeight: MIN_TOUCH_TARGET_SIZE,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rightIcon: {
    marginLeft: 4,
  },
  iconButton: {
    padding: 4,
    minWidth: MIN_TOUCH_TARGET_SIZE / 2,
    minHeight: MIN_TOUCH_TARGET_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 6,
  },
});

export default React.memo(AccessibleInput);
