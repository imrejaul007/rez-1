// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps
} from 'react-native';
import { colors } from '@/constants/theme';

// Import CSS for web-specific styling
if (typeof window !== 'undefined') {
  require('./FormInput.css');
}

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: any;
  leftIcon?: React.ReactNode;
  prefix?: string;
}

function FormInput({
  label,
  error,
  containerStyle,
  style,
  leftIcon,
  prefix,
  ...props
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Build accessibility label
  const buildAccessibilityLabel = () => {
    let baseLabel = label || props.placeholder || 'Input field';
    if (props.secureTextEntry) {
      baseLabel += ', secure text entry';
    }
    if (props.editable === false) {
      baseLabel += ', disabled';
    }
    return baseLabel;
  };

  // Build accessibility hint
  const buildAccessibilityHint = () => {
    if (error) {
      return `Error: ${error}. Please correct this field.`;
    }
    if (props.placeholder && label) {
      return `Enter ${label.toLowerCase()}`;
    }
    return props.accessibilityHint;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={styles.label}
          accessible={true}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          !!error && styles.inputError
        ]}
        accessible={false}
      >
        {leftIcon && (
          <View
            style={styles.leftIconContainer}
            accessible={false}
            importantForAccessibility="no"
          >
            {leftIcon}
          </View>
        )}
        {prefix && (
          <Text
            style={[
              styles.prefixText,
              leftIcon && styles.prefixWithIcon
            ]}
            accessible={false}
            importantForAccessibility="no"
          >
            {prefix}
          </Text>
        )}
        <TextInput
          style={[
            styles.input,
            (leftIcon || prefix) ? styles.inputWithIcon : null,
            style
          ]}
          placeholderTextColor={colors.neutral[400]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoComplete="off"
          autoCorrect={false}
          spellCheck={false}
          accessible={true}
          accessibilityLabel={buildAccessibilityLabel()}
          accessibilityHint={buildAccessibilityHint()}
          accessibilityValue={{ text: String(props.value || '') }}
          accessibilityState={{
            disabled: props.editable === false,
            busy: false,
          }}
          accessibilityRole="none"
          {...props}
        />
      </View>
      {!!error && (
        <View
          accessible={true}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Error: ${error}`}
        >
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    minHeight: 48,
  },
  leftIconContainer: {
    paddingLeft: 16,
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefixText: {
    paddingLeft: 16,
    paddingRight: 8,
    fontSize: 16,
    color: colors.neutral[700],
    fontWeight: '500',
    alignSelf: 'center',
  },
  prefixWithIcon: {
    paddingLeft: 0,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.neutral[700],
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineWidth: 0, // Remove browser focus outline
    outlineStyle: 'none',
    // Web-specific styles to override browser defaults (autofill handled by FormInput.css)
    ...(typeof window !== 'undefined' ? {
      boxShadow: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
    } : {}),
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  inputFocused: {
    borderColor: colors.brand.goldWarm,
    borderWidth: 2,
    shadowColor: colors.brand.goldWarm,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
    backgroundColor: colors.errorScale[50],
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default React.memo(FormInput);
