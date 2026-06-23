// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import analyticsService from '@/services/analyticsService';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthUser, useAuthLoading, useAuthError, useAuthActions } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
function OTPVerificationScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const user = useAuthUser();
  const authLoading = useAuthLoading();
  const authError = useAuthError();
  const actions = useAuthActions();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    analyticsService.track('otp_verification_started');
  }, []);

  // Timer interval — restarts cleanly when timer is reset (e.g., on resend OTP)
  const timerKeyRef = React.useRef(0);
  const [timerKey, setTimerKey] = React.useState(0);
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerKey]);

  const handleOTPChange = (value: string, index: number) => {
    // Handle paste: if a 6-digit code is pasted, auto-fill all boxes
    if (value.length >= 6) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      if (digits.length === 6) {
        const newOtp = digits.split('');
        setOtp(newOtp);
        inputRefs.current[5]?.focus();
        handleSubmit(digits);
        return;
      }
    }

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take only the last character
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit.length === 1)) {
      handleSubmit(newOtp.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (otpValue?: string) => {
    const otpString = otpValue || otp.join('');

    if (otpString.length !== 6 || !/^\d{6}$/.test(otpString)) {
      platformAlertSimple('Invalid OTP', 'Please enter a valid 6-digit OTP');
      return;
    }

    if (!phoneNumber) {
      platformAlertSimple('Error', 'Phone number not found. Please go back and try again.');
      return;
    }

    try {
      await actions.verifyOTP(phoneNumber, otpString);

      analyticsService.track('otp_verified');

      if (!isMounted()) return;
      await new Promise(resolve => setTimeout(resolve, 100));

      if (user?.isOnboarded) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding/notification-permission');
      }
    } catch (error: any) {
      const errorMessage = error?.message || authError || 'Invalid OTP. Please check and try again.';
      platformAlertSimple('Invalid OTP', errorMessage);
      if (!isMounted()) return;
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      actions.clearError();
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || !phoneNumber) return;

    try {
      await actions.sendOTP(phoneNumber);
      if (!isMounted()) return;
      setTimer(30);
      if (!isMounted()) return;
      setCanResend(false);
      if (!isMounted()) return;
      setTimerKey(k => k + 1); // Restart interval cleanly
      platformAlertSimple('Success', 'OTP has been resent to your phone number');
    } catch (error: any) {
      const errorMessage = error?.message || authError || 'Failed to resend OTP. Please try again.';
      platformAlertSimple('Error', errorMessage);
      actions.clearError();
    }
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={[Colors.background.secondary, '#EDF2F7', Colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Elements */}
      <View style={styles.decorativeCircles}>
        <View style={[styles.circle, styles.circleGreen]} />
        <View style={[styles.circle, styles.circleGold]} />
      </View>

      <View style={styles.content}>
        <View style={styles.glassCard}>
          <LinearGradient
            colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
            style={styles.glassShine}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>Step 2 of 3</Text>
            </View>

            {/* Shield Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[Colors.gold, Colors.nileBlue]}
                style={styles.iconGradient}
              >
                <Ionicons name="shield-checkmark" size={32} color={colors.background.primary} />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Verify your number</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.phoneText}>{phoneNumber}</Text>
            </Text>

            <View style={styles.underlineContainer}>
              <LinearGradient
                colors={[Colors.gold, Colors.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.underline}
              />
            </View>
          </View>

          {/* OTP Inputs */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.otpInputWrapper,
                  focusedIndex === index && styles.otpInputWrapperFocused,
                  digit && styles.otpInputWrapperFilled,
                ]}
              >
                <TextInput
                  ref={ref => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOTPChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  keyboardType="number-pad"
                  maxLength={index === 0 ? 6 : 1}
                  textAlign="center"
                  selectTextOnFocus
                  textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                  autoComplete={index === 0 ? 'sms-otp' : 'off'}
                  accessibilityLabel={`OTP digit ${index + 1} of 6`}
                />
              </View>
            ))}
          </View>

          {/* Resend Section */}
          <View style={styles.resendContainer}>
            {timer > 0 ? (
              <View style={styles.timerPill}>
                <Ionicons name="time-outline" size={16} color={Colors.text.tertiary} />
                <Text style={styles.timerText}>Resend in {timer}s</Text>
              </View>
            ) : (
              <Pressable
                onPress={handleResendOTP}
                disabled={!canResend || authLoading}
                style={styles.resendButton}
              >
                <Ionicons name="refresh-outline" size={18} color={Colors.gold} />
                <Text style={styles.resendText}>Resend OTP</Text>
              </Pressable>
            )}
          </View>

          {/* Submit Button */}
          <Pressable
            style={styles.primaryButtonWrapper}
            onPress={() => handleSubmit()}
            disabled={authLoading || !otp.every(digit => digit.length === 1)}
           
          >
            <LinearGradient
              colors={
                authLoading || !otp.every(digit => digit.length === 1)
                  ? [colors.neutral[300], colors.neutral[300]]
                  : [Colors.gold, Colors.nileBlue]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {authLoading ? 'Verifying...' : 'Verify & Continue'}
              </Text>
              {!authLoading && <Ionicons name="checkmark-circle" size={20} color={colors.background.primary} />}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 40,
  },

  // Decorative
  decorativeCircles: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: BorderRadius.full,
  },
  circleGreen: {
    width: 200,
    height: 200,
    top: -60,
    right: -60,
    backgroundColor: 'rgba(26, 58, 82, 0.08)',  // Nile Blue
  },
  circleGold: {
    width: 150,
    height: 150,
    bottom: 100,
    left: -50,
    backgroundColor: 'rgba(255, 200, 87, 0.1)',
  },

  // Glass Card
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 28,
    padding: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 15,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(30px)',
    }),
  },
  glassShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  stepBadge: {
    backgroundColor: 'rgba(255, 205, 87, 0.15)',  // Light Mustard
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.3)',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gold,
  },
  iconContainer: {
    marginBottom: Spacing.base,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.base,
  },
  phoneText: {
    color: Colors.gold,
    fontWeight: '700',
    fontSize: 15,
  },
  underlineContainer: {
    alignItems: 'center',
  },
  underline: {
    width: 50,
    height: 4,
    borderRadius: 2,
  },

  // OTP Inputs
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  otpInputWrapper: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border.default,
    backgroundColor: Colors.background.primary,
    overflow: 'hidden',
  },
  otpInputWrapperFocused: {
    borderColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  otpInputWrapperFilled: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',  // Light Mustard
  },
  otpInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  otpInputFilled: {
    color: Colors.gold,
  },

  // Resend
  resendContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(154, 167, 178, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  timerText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
  },
  resendText: {
    fontSize: 14,
    color: Colors.gold,
    fontWeight: '700',
  },

  // Primary Button
  primaryButtonWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButton: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default withErrorBoundary(OTPVerificationScreen, 'OnboardingOtpVerification');
