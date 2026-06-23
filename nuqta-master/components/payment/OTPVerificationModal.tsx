// @ts-nocheck
// OTP Verification Modal
// Handles OTP-based verification for payment methods

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import paymentVerificationService from '@/services/paymentVerificationService';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface OTPVerificationModalProps {
  visible: boolean;
  phoneNumber?: string;
  email?: string;
  purpose: 'PAYMENT_METHOD' | 'TRANSACTION' | 'IDENTITY';
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function OTPVerificationModal({
  visible,
  phoneNumber,
  email,
  purpose,
  onClose,
  onSuccess,
  onError,
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [maskedContact, setMaskedContact] = useState('');
  const isMounted = useIsMounted();

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (visible) {
      sendOTP();
    }

    return () => {
      setOtp(['', '', '', '', '', '']);
      setVerificationId(null);
      setResendTimer(60);
      setAttemptsRemaining(3);
    };
  }, [visible]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const sendOTP = async () => {
    try {
      setIsSendingOTP(true);

      const response = await paymentVerificationService.sendOTP({
        phoneNumber,
        email,
        purpose,
      });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setVerificationId(response.data.verificationId);
        setMaskedContact(response.data.maskedContact);
        setResendTimer(response.data.resendAvailableIn);
      } else {
        throw new Error(response.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      onError(error.message || 'Failed to send OTP');
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Failed to send OTP');
      } else {
        platformAlertSimple('Error', error.message || 'Failed to send OTP');
      }
    } finally {
      if (!isMounted()) return;
      setIsSendingOTP(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === 5 && newOtp.every(digit => digit !== '')) {
      verifyOTP(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOTP = async (otpValue?: string) => {
    const otpString = otpValue || otp.join('');

    if (otpString.length !== 6) {
      platformAlertSimple('Incomplete OTP', 'Please enter all 6 digits');
      return;
    }

    if (!verificationId) {
      platformAlertSimple('Error', 'Verification session not found. Please try again.');
      return;
    }

    try {
      setIsLoading(true);

      const response = await paymentVerificationService.validateOTP({
        verificationId,
        otp: otpString,
      });

      if (response.success && response.data?.verified) {
        onSuccess();
        if (!isMounted()) return;
        setTimeout(onClose, 1000);
      } else {
        const remaining = response.data?.attemptsRemaining || attemptsRemaining - 1;
        setAttemptsRemaining(remaining);

        if (remaining === 0) {
          platformAlertSimple('Too Many Attempts', 'You\'ve exceeded the maximum number of attempts. Please try again later.');
        } else {
          platformAlertSimple('Invalid OTP', `${response.data?.error || 'The OTP you entered is incorrect'}. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`);
          if (!isMounted()) return;
          setOtp(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      }
    } catch (error: any) {
      platformAlertSimple('Verification Failed', error.message || 'Failed to verify OTP');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    sendOTP();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.neutral[800]} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Enter OTP</ThemedText>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.content}>
          {isSendingOTP ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.brand.purpleLight} />
              <ThemedText style={styles.loadingText}>Sending OTP...</ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="mail" size={64} color={colors.brand.purpleLight} />
              </View>

              <ThemedText style={styles.title}>Verify your {phoneNumber ? 'phone' : 'email'}</ThemedText>
              <ThemedText style={styles.subtitle}>
                We've sent a 6-digit code to{'\n'}
                <ThemedText style={styles.contact}>{maskedContact}</ThemedText>
              </ThemedText>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    style={[styles.otpInput, digit && styles.otpInputFilled]}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!isLoading}
                  />
                ))}
              </View>

              <View style={styles.attemptsContainer}>
                <ThemedText style={styles.attemptsText}>
                  {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
                </ThemedText>
              </View>

              <Pressable
                style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
                onPress={() => verifyOTP()}
                disabled={isLoading || otp.some(d => !d)}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.verifyButtonText}>Verify OTP</ThemedText>
                )}
              </Pressable>

              <Pressable
                style={styles.resendButton}
                onPress={handleResend}
                disabled={resendTimer > 0}
              >
                <ThemedText style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  content: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginTop: 16,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 32,
  },
  contact: {
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    backgroundColor: 'white',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.neutral[800],
  },
  otpInputFilled: {
    borderColor: colors.brand.purpleLight,
    backgroundColor: colors.tint.purpleLight,
  },
  attemptsContainer: {
    marginBottom: 24,
  },
  attemptsText: {
    fontSize: 13,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  verifyButton: {
    width: '100%',
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  resendButton: {
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
  resendTextDisabled: {
    color: colors.neutral[400],
  },
});

export default React.memo(OTPVerificationModal);
