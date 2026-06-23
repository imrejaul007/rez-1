import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Account Recovery Page
// Help users recover access to their account

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { platformAlertSimple } from '@/utils/platformAlert';
import authService from '@/services/authApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type RecoveryMethod = 'phone' | 'email';
type Step = 'method' | 'input' | 'otp' | 'success';

function AccountRecoveryPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<RecoveryMethod>('phone');
  const [input, setInput] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMethodSelect = (selectedMethod: RecoveryMethod) => {
    setMethod(selectedMethod);
    setStep('input');
    setError('');
  };

  const handleSendCode = async () => {
    if (!input) return;

    setLoading(true);
    setError('');
    try {
      const phoneNumber = method === 'phone' ? input : '';
      if (!phoneNumber) {
        // Email recovery not yet supported by backend — phone only
        platformAlertSimple('Not Available', 'Email recovery is not yet supported. Please use your phone number.');
        setLoading(false);
        return;
      }
      const response = await authService.sendOtp({ phoneNumber });
      if (response.success) {
        setStep('otp');
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Failed to send verification code. Please try again.');
        platformAlertSimple('Error', response.message || 'Failed to send code.');
      }
    } catch (e) {
      if (!isMounted()) return;
      setError('Something went wrong. Please try again.');
      platformAlertSimple('Error', 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) return;

    setLoading(true);
    setError('');
    try {
      const response = await authService.verifyOtp({ phoneNumber: input, otp });
      if (response.success) {
        setStep('success');
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Invalid verification code. Please try again.');
        platformAlertSimple('Verification Failed', response.message || 'Invalid code.');
      }
    } catch (e) {
      if (!isMounted()) return;
      setError('Something went wrong. Please try again.');
      platformAlertSimple('Error', 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const renderMethodSelection = () => (
    <View style={styles.methodContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="key-outline" size={60} color={Colors.primary[600]} />
      </View>
      <ThemedText style={styles.title}>Account Recovery</ThemedText>
      <ThemedText style={styles.subtitle}>
        Choose how you'd like to verify your identity
      </ThemedText>

      <Pressable
        style={styles.methodCard}
        onPress={() => handleMethodSelect('phone')}
      >
        <View style={styles.methodIcon}>
          <Ionicons name="call-outline" size={28} color={Colors.primary[600]} />
        </View>
        <View style={styles.methodInfo}>
          <ThemedText style={styles.methodTitle}>Phone Number</ThemedText>
          <ThemedText style={styles.methodDesc}>
            We'll send a verification code via SMS
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
      </Pressable>

      <Pressable
        style={styles.methodCard}
        onPress={() => handleMethodSelect('email')}
      >
        <View style={styles.methodIcon}>
          <Ionicons name="mail-outline" size={28} color={Colors.primary[600]} />
        </View>
        <View style={styles.methodInfo}>
          <ThemedText style={styles.methodTitle}>Email Address</ThemedText>
          <ThemedText style={styles.methodDesc}>
            We'll send a recovery link to your email
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
      </Pressable>

      <View style={styles.helpSection}>
        <ThemedText style={styles.helpText}>
          Can't access your phone or email?
        </ThemedText>
        <Pressable>
          <ThemedText style={styles.helpLink}>Contact Support</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderInputStep = () => (
    <View style={styles.inputContainer}>
      <Pressable style={styles.backLink} onPress={() => setStep('method')}>
        <Ionicons name="arrow-back" size={20} color={Colors.primary[600]} />
        <ThemedText style={styles.backLinkText}>Back</ThemedText>
      </Pressable>

      <View style={styles.iconContainer}>
        <Ionicons
          name={method === 'phone' ? 'call-outline' : 'mail-outline'}
          size={60}
          color={Colors.primary[600]}
        />
      </View>

      <ThemedText style={styles.title}>
        Enter your {method === 'phone' ? 'Phone Number' : 'Email'}
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        {method === 'phone'
          ? 'Enter the phone number linked to your account'
          : 'Enter the email address linked to your account'}
      </ThemedText>

      <View style={styles.inputWrapper}>
        {method === 'phone' && (
          <View style={styles.countryCode}>
            <ThemedText style={styles.countryCodeText}>+91</ThemedText>
          </View>
        )}
        <TextInput
          style={[styles.textInput, method === 'phone' && styles.phoneInput]}
          value={input}
          onChangeText={setInput}
          placeholder={method === 'phone' ? '10 digit number' : 'your@email.com'}
          placeholderTextColor={Colors.text.tertiary}
          keyboardType={method === 'phone' ? 'phone-pad' : 'email-address'}
          autoCapitalize="none"
          maxLength={method === 'phone' ? 10 : undefined}
        />
      </View>

      <Pressable
        style={[styles.button, !input && styles.buttonDisabled]}
        onPress={handleSendCode}
        disabled={!input || loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.background.primary} />
        ) : (
          <ThemedText style={styles.buttonText}>Send Verification Code</ThemedText>
        )}
      </Pressable>
    </View>
  );

  const renderOTPStep = () => (
    <View style={styles.inputContainer}>
      <Pressable style={styles.backLink} onPress={() => setStep('input')}>
        <Ionicons name="arrow-back" size={20} color={Colors.primary[600]} />
        <ThemedText style={styles.backLinkText}>Back</ThemedText>
      </Pressable>

      <View style={styles.iconContainer}>
        <Ionicons name="chatbox-outline" size={60} color={Colors.primary[600]} />
      </View>

      <ThemedText style={styles.title}>Enter Verification Code</ThemedText>
      <ThemedText style={styles.subtitle}>
        We've sent a 6-digit code to {method === 'phone' ? `+91 ${input}` : input}
      </ThemedText>

      <TextInput
        style={styles.otpInput}
        value={otp}
        onChangeText={setOtp}
        placeholder="000000"
        placeholderTextColor={Colors.text.tertiary}
        keyboardType="number-pad"
        maxLength={6}
        textAlign="center"
      />

      <Pressable
        style={[styles.button, otp.length < 6 && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={otp.length < 6 || loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.background.primary} />
        ) : (
          <ThemedText style={styles.buttonText}>Verify</ThemedText>
        )}
      </Pressable>

      <View style={styles.resendContainer}>
        <ThemedText style={styles.resendText}>Didn't receive the code?</ThemedText>
        <Pressable onPress={() => setStep('input')}>
          <ThemedText style={styles.resendLink}>Resend</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
      </View>
      <ThemedText style={styles.successTitle}>Account Recovered!</ThemedText>
      <ThemedText style={styles.successText}>
        Your identity has been verified. You can now access your account.
      </ThemedText>

      <Pressable
        style={styles.button}
        onPress={() => router.replace('/sign-in')}
      >
        <ThemedText style={styles.buttonText}>Continue to Sign In</ThemedText>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.closeButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="close" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Account Recovery</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'method' && renderMethodSelection()}
        {step === 'input' && renderInputStep()}
        {step === 'otp' && renderOTPStep()}
        {step === 'success' && renderSuccess()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  methodContainer: {
    alignItems: 'center',
  },
  inputContainer: {
    alignItems: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  backLinkText: {
    ...Typography.body,
    color: Colors.primary[600],
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  methodCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  methodDesc: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  helpSection: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  helpText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  helpLink: {
    ...Typography.label,
    color: Colors.primary[600],
    marginTop: Spacing.xs,
  },
  inputWrapper: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  countryCode: {
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  countryCodeText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    ...Shadows.subtle,
  },
  phoneInput: {
    flex: 1,
  },
  otpInput: {
    width: '100%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Typography.h1,
    color: Colors.text.primary,
    letterSpacing: 16,
    marginBottom: Spacing.lg,
    ...Shadows.subtle,
  },
  button: {
    width: '100%',
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  buttonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  resendText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  resendLink: {
    ...Typography.label,
    color: Colors.primary[600],
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    ...Typography.h1,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  successText: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});

export default withErrorBoundary(AccountRecoveryPage, 'AccountRecovery');
