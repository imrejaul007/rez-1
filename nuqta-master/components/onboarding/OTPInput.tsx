// @ts-nocheck
/**
 * OTPInput - Shared 6-digit OTP input component
 * Features:
 * - Individual digit boxes with focus animation
 * - Auto-focus next box on input
 * - Auto-submit when 6 digits entered
 * - Paste support for full code
 * - Haptic feedback on input
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Text,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { BorderRadius } from '@/constants/DesignSystem';
import { triggerImpact } from '@/utils/haptics';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (otp: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  length?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function OTPInput({
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
  length = 6,
}: OTPInputProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (!autoFocus || !inputRefs.current[0]) return;
    const timeout = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  const handleChange = (text: string, index: number) => {
    // Haptic feedback (native only — no-op on web)
    void triggerImpact('Light');

    // Handle paste - if text is 6 digits, fill all boxes
    if (text.length >= length) {
      const cleaned = text.replace(/\D/g, '').slice(0, length);
      onChange(cleaned);
      inputRefs.current[length - 1]?.focus();
      if (onComplete) onComplete(cleaned);
      return;
    }

    // Handle single digit
    const newValue = value.split('');
    newValue[index] = text.slice(-1);
    onChange(newValue.join(''));

    // Auto-focus next box
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newValue.join('').length === length && onComplete) {
      onComplete(newValue.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    // Don't clear value on focus - let user edit the existing digit
  };

  const handleBlur = () => {
    setFocusedIndex(null);
  };

  const digits = value.split('').concat(Array(length - value.length).fill(''));

  return (
    <View style={styles.container}>
      <View style={styles.otpContainer}>
        {digits.map((digit, index) => {
          const isFocused = focusedIndex === index;
          const isFilled = !!digit;
          const hasError = !!error;

          return (
            <AnimatedPressable
              key={index}
              style={[
                styles.otpBox,
                isFocused && styles.otpBoxFocused,
                isFilled && styles.otpBoxFilled,
                hasError && styles.otpBoxError,
              ]}
              onPress={() => inputRefs.current[index]?.focus()}
            >
              <TextInput
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.otpInput}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => handleFocus(index)}
                onBlur={handleBlur}
                keyboardType="number-pad"
                maxLength={index === 0 ? length : 1}
                textAlign="center"
                selectTextOnFocus
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                editable={!disabled}
                accessibilityLabel={`OTP digit ${index + 1} of ${length}`}
              />
              {isFilled && (
                <View style={styles.dotContainer}>
                  <Animated.View style={styles.dot} />
                </View>
              )}
            </AnimatedPressable>
          );
        })}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  otpBoxFocused: {
    borderColor: colors.gold,
    borderWidth: 2.5,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  otpBoxFilled: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
  },
  otpBoxError: {
    borderColor: colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  otpInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    fontSize: 22,
    fontWeight: '700',
    color: colors.nileBlue,
    textAlign: 'center',
    padding: 0,
    margin: 0,
    opacity: 0,
  },
  dotContainer: {
    position: 'absolute',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gold,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
  },
});

export default React.memo(OTPInput);
