// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useRootNavigationState } from 'expo-router';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useAuthUser, useIsAuthenticated, useAuthLoading, useAuthError, useAuthActions } from '@/stores/selectors';
import FormInput from '@/components/onboarding/FormInput';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CountryCodePicker, { COUNTRY_CODES, CountryCode } from '@/components/common/CountryCodePicker';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useErrorToast } from '@/hooks/useErrorToast';

/**
 * Safe haptic wrapper — fails silently on devices without haptic support (e.g., web).
 */
const safeHaptic = (style: Haptics.NotificationFeedbackType | Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  try {
    if (style === Haptics.ImpactFeedbackStyle.Light ||
        style === Haptics.ImpactFeedbackStyle.Medium ||
        style === Haptics.ImpactFeedbackStyle.Heavy) {
      Haptics.impactAsync(style).catch(() => {});
    } else {
      Haptics.notificationAsync(style as Haptics.NotificationFeedbackType).catch(() => {});
    }
  } catch {
    // haptics not available — fail silently
  }
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Rez Design System Colors

function SignInScreen() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const authError = useAuthError();
  const actions = useAuthActions();
  const { showSuccess, showError, showInfo } = useErrorToast();

  const [formData, setFormData] = useState({
    phoneNumber: '',
    otp: '',
  });

  // Default to UAE (+971)
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [errors, setErrors] = useState({
    phoneNumber: '',
    otp: '',
  });

  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOTP, setCanResendOTP] = useState(false);
  const isMounted = useIsMounted();

  // OTP timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => {
          if (prev <= 1) {
            setCanResendOTP(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Auto-submit OTP when 6 digits entered (avoids extra tap, mirrors industry standard)
  useEffect(() => {
    if (step === 'otp' && formData.otp.length === 6 && !authLoading && !errors.otp) {
      handleVerifyOTP();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.otp, step, authLoading]);

  // Navigate to homepage on successful login (wait for router to be ready)
  useEffect(() => {
    if (!rootNavigationState?.key) return; // Router not mounted yet
    if (isAuthenticated && user) {
      // Small delay ensures Root Layout is fully mounted on web
      const timer = setTimeout(() => {
        try {
          if (user.isOnboarded) {
            router.replace('/(tabs)/' as any);
          } else {
            router.replace('/onboarding/notification-permission');
          }
        } catch {
          // Root layout not ready yet — will retry on next state change
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, rootNavigationState?.key]);

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateOTP = (otp: string): boolean => {
    return otp.length === 6 && /^\d+$/.test(otp);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRequestOTP = async () => {
    if (!formData.phoneNumber.trim()) {
      setErrors(prev => ({ ...prev, phoneNumber: 'Phone number is required' }));
      return;
    }

    if (!validatePhoneNumber(formData.phoneNumber)) {
      setErrors(prev => ({ ...prev, phoneNumber: 'Please enter a valid phone number' }));
      return;
    }

    try {
      const formattedPhone = `${selectedCountry.dialCode}${formData.phoneNumber}`;
      await actions.sendOTP(formattedPhone);
      if (!isMounted()) return;
      setStep('otp');
      if (!isMounted()) return;
      setOtpTimer(60);
      if (!isMounted()) return;
      setCanResendOTP(false);

      // Use a non-blocking success toast instead of a modal alert
      // (the user just navigated to the OTP step — a modal would be jarring)
      const otpMessage = __DEV__
        ? `OTP sent. (Demo code: 123456)`
        : `OTP sent to ${selectedCountry.dialCode} ${formData.phoneNumber}`;
      showSuccess(otpMessage);
    } catch (error: any) {
      const errorMessage = error?.message || authError || 'Failed to send OTP. Please try again.';
      const status = error?.status || error?.response?.status;
      const errorCode = (error?.code || error?.response?.data?.code || '').toString().toUpperCase();

      // SECURITY: surface a friendly message on rate limit (auth-service enforces
      // 3/min per phone, 5/15min per IP). Without this, users see a generic
      // "failed" error and tap the resend button rapidly — making things worse.
      if (status === 429 || errorCode.includes('RATE_LIMIT') || errorCode.includes('TOO_MANY')) {
        const retryAfter = Number(error?.response?.headers?.['retry-after'] || 60);
        if (!isMounted()) return;
        setErrors(prev => ({
          ...prev,
          phoneNumber: `Too many OTP requests. Please wait ${retryAfter} seconds before trying again.`,
        }));
        return;
      }

      if (errorMessage.toLowerCase().includes('user not found') ||
          errorMessage.toLowerCase().includes('user does not exist') ||
          errorMessage.toLowerCase().includes("user doesn't exist") ||
          errorMessage.toLowerCase().includes('please sign up')) {
        setErrors(prev => ({
          ...prev,
          phoneNumber: 'This phone number is not registered. Please sign up first.'
        }));

        // For "user not found" we still use a confirm dialog — it requires a CTA
        platformAlertConfirm(
          'User Not Found',
          'This phone number is not registered. Please sign up first.',
          () => router.push('/onboarding/splash'),
          'Sign Up'
        );
      } else {
        if (!isMounted()) return;
        setErrors(prev => ({
          ...prev,
          phoneNumber: errorMessage
        }));
        // Non-blocking error toast in addition to inline error (inline alone is easy to miss)
        showError(errorMessage);
      }
      actions.clearError();
    }
  };

  const handleVerifyOTP = async () => {
    if (!formData.otp.trim()) {
      setErrors(prev => ({ ...prev, otp: 'OTP is required' }));
      return;
    }

    if (!validateOTP(formData.otp)) {
      setErrors(prev => ({ ...prev, otp: 'Please enter a valid 6-digit OTP' }));
      return;
    }

    try {
      const formattedPhone = `${selectedCountry.dialCode}${formData.phoneNumber}`;
      await actions.login(formattedPhone, formData.otp);
      showInfo('Signing you in…');
    } catch (error: any) {
      const errorMessage = error?.message || authError || 'Invalid OTP. Please try again.';
      if (!isMounted()) return;
      setErrors(prev => ({
        ...prev,
        otp: errorMessage
      }));
      showError(errorMessage);
      actions.clearError();
    }
  };

  const handleResendOTP = async () => {
    if (!canResendOTP) return;

    try {
      const formattedPhone = `${selectedCountry.dialCode}${formData.phoneNumber}`;
      await actions.sendOTP(formattedPhone);
      if (!isMounted()) return;
      setOtpTimer(60);
      if (!isMounted()) return;
      setCanResendOTP(false);
      showSuccess('New OTP sent to your phone');
    } catch (error: any) {
      const errorMessage = error?.message || authError || 'Failed to resend OTP. Please try again.';
      showError(errorMessage);
      actions.clearError();
    }
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setFormData(prev => ({ ...prev, otp: '' }));
    setErrors(prev => ({ ...prev, otp: '' }));
    setOtpTimer(0);
    setCanResendOTP(false);
  };

  const handleGoToSignUp = () => {
    router.push('/onboarding/splash');
  };

  const renderPhoneStep = () => (
    <View style={styles.stepContainer}>
      {/* Glass Card */}
      <View style={styles.glassCard}>
        {/* Glass Shine Effect */}
        <LinearGradient
          colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassShine}
        />

        {/* Header */}
        <View style={styles.header}>
          {/* App Logo */}
          <View style={styles.logoContainer}>
            <CachedImage
              source={BRAND.LOGO_IMAGE}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>

          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {/* Brand Underline */}
          <View style={styles.underlineContainer}>
            <LinearGradient
              colors={[colors.brand.purple, colors.brand.purpleLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underline}
            />
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.phoneInputContainer}>
            <View style={styles.unifiedPhoneInput}>
              <CountryCodePicker
                selectedCountry={selectedCountry}
                onSelect={setSelectedCountry}
                style={styles.countryPickerInline}
              />
              <View style={styles.phoneDivider} />
              <View style={styles.phoneNumberInput}>
                <Ionicons name="call-outline" size={18} color={colors.brand.purple} style={styles.phoneIcon} />
                <TextInput
                  style={styles.phoneTextInput}
                  placeholder="Mobile number"
                  placeholderTextColor={Colors.text.tertiary}
                  value={formData.phoneNumber}
                  onChangeText={(value) => handleInputChange('phoneNumber', value)}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  returnKeyType="go"
                  onSubmitEditing={() => {
                    if (!authLoading) handleRequestOTP();
                  }}
                  accessibilityLabel="Mobile phone number"
                  accessibilityHint={`Country code ${selectedCountry.dialCode}. Enter your mobile number to receive a one-time password.`}
                  maxLength={15}
                />
              </View>
            </View>
            {errors.phoneNumber ? (
              <Text
                style={styles.errorText}
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
              >
                {errors.phoneNumber}
              </Text>
            ) : null}
          </View>

          {/* Primary Button with Gradient */}
          <Pressable
            style={styles.primaryButtonWrapper}
            onPress={() => {
              safeHaptic(Haptics.ImpactFeedbackStyle.Light);
              handleRequestOTP();
            }}
            disabled={authLoading}
            accessibilityLabel={authLoading ? 'Sending OTP, please wait' : 'Send one-time password to phone number'}
            accessibilityRole="button"
            accessibilityState={{ disabled: authLoading, busy: authLoading }}
          >
            <View style={[styles.primaryButton, { backgroundColor: authLoading ? colors.neutral[300] : colors.brand.purple }]}>
              {authLoading ? (
                <>
                  <LoadingSpinner size="small" color={Colors.text.inverse} />
                  <Text style={styles.primaryButtonText}>Sending…</Text>
                </>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                  <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
                </>
              )}
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderOTPStep = () => (
    <View style={styles.stepContainer}>
      {/* Glass Card */}
      <View style={styles.glassCard}>
        {/* Glass Shine Effect */}
        <LinearGradient
          colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassShine}
        />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              safeHaptic(Haptics.ImpactFeedbackStyle.Light);
              handleBackToPhone();
            }}
            accessibilityLabel="Go back to phone number entry"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to the phone number step"
            hitSlop={8}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={20} color={colors.brand.purple} />
            </View>
          </Pressable>

          {/* Shield Icon */}
          <View style={styles.shieldIconContainer}>
            <LinearGradient
              colors={[colors.brand.purple, colors.brand.purpleDeep]}
              style={styles.shieldIcon}
            >
              <Ionicons name="shield-checkmark" size={28} color={Colors.text.inverse} />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to{'\n'}
            <Text style={styles.phoneNumber}>{selectedCountry.dialCode} {formData.phoneNumber}</Text>
          </Text>

          {/* Brand Underline */}
          <View style={styles.underlineContainer}>
            <LinearGradient
              colors={[colors.brand.purple, colors.brand.purpleLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underline}
            />
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <FormInput
            placeholder="Enter 6-digit OTP"
            value={formData.otp}
            onChangeText={(value) => {
              // Strip non-digits in case the user pastes a code with extra characters
              const cleaned = value.replace(/\D/g, '').slice(0, 6);
              handleInputChange('otp', cleaned);
            }}
            keyboardType="number-pad"
            maxLength={6}
            error={errors.otp}
            containerStyle={styles.inputContainer}
            leftIcon={
              <Ionicons name="keypad-outline" size={20} color={colors.brand.purple} />
            }
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            accessibilityLabel="One-time password"
            accessibilityHint="Enter the 6-digit code sent to your phone. Code will auto-submit when complete."
          />

          <View style={styles.otpActions}>
            {otpTimer > 0 ? (
              <View
                style={styles.timerContainer}
                accessibilityLiveRegion="polite"
                accessibilityLabel={`Resend OTP available in ${otpTimer} seconds`}
              >
                <Ionicons name="time-outline" size={16} color={Colors.text.tertiary} />
                <Text style={styles.timerText}>Resend OTP in {otpTimer}s</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  safeHaptic(Haptics.ImpactFeedbackStyle.Light);
                  handleResendOTP();
                }}
                disabled={!canResendOTP}
                style={styles.resendButton}
                accessibilityLabel="Resend one-time password"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canResendOTP }}
                accessibilityHint="Double tap to receive a new one-time password"
              >
                <Text style={[
                  styles.resendText,
                  !canResendOTP && styles.resendTextDisabled
                ]}>
                  Resend OTP
                </Text>
              </Pressable>
            )}
          </View>

          {/* Primary Button with Gradient */}
          <Pressable
            style={styles.primaryButtonWrapper}
            onPress={() => {
              safeHaptic(Haptics.ImpactFeedbackStyle.Medium);
              handleVerifyOTP();
            }}
            disabled={authLoading}
            accessibilityLabel={authLoading ? 'Verifying OTP, please wait' : 'Verify one-time password and sign in'}
            accessibilityRole="button"
            accessibilityState={{ disabled: authLoading, busy: authLoading }}
          >
            <View style={[styles.primaryButton, { backgroundColor: authLoading ? colors.neutral[300] : colors.brand.purple }]}>
              {authLoading ? (
                <>
                  <LoadingSpinner size="small" color={Colors.text.inverse} />
                  <Text style={styles.primaryButtonText}>Verifying…</Text>
                </>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.text.inverse} />
                </>
              )}
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      {/* Hero Gradient Background - Brand Purple */}
      <LinearGradient
        colors={[colors.brand.purple, colors.brand.purpleDeep, colors.brand.purpleDeep]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative Floating Circles */}
      <View style={styles.decorativeCircles}>
        {/* Large Gold Circle - Top Right */}
        <View style={[styles.circle, styles.circleGoldLarge]} />
        {/* Medium Green Circle - Bottom Left */}
        <View style={[styles.circle, styles.circleGreenMedium]} />
        {/* Small Gold Circle - Top Left */}
        <View style={[styles.circle, styles.circleGoldSmall]} />
        {/* Tiny Green Circle - Bottom Right */}
        <View style={[styles.circle, styles.circleGreenTiny]} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {step === 'phone' ? renderPhoneStep() : renderOTPStep()}

            {/* Footer */}
            <View style={styles.footer}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  safeHaptic(Haptics.ImpactFeedbackStyle.Light);
                  handleGoToSignUp();
                }}
                accessibilityLabel="Don't have an account? Sign up"
                accessibilityRole="button"
                accessibilityHint="Double tap to create a new account"
              >
                <Text style={styles.secondaryButtonText}>
                  Don't have an account?{' '}
                  <Text style={styles.signUpText}>Sign Up</Text>
                </Text>
              </Pressable>

              <Pressable
                style={styles.recoveryLink}
                onPress={() => {
                  safeHaptic(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/account-recovery');
                }}
                accessibilityLabel="Can't access your account? Recover it"
                accessibilityRole="button"
                accessibilityHint="Double tap to recover your account"
              >
                <Text style={styles.recoveryLinkText}>
                  Can't access your account?{' '}
                  <Text style={styles.recoveryText}>Recover</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 40,
  },

  // Decorative Circles
  decorativeCircles: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: BorderRadius.full,
  },
  circleGoldLarge: {
    width: 300,
    height: 300,
    top: -80,
    right: -100,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  circleGreenMedium: {
    width: 200,
    height: 200,
    bottom: 50,
    left: -80,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  circleGoldSmall: {
    width: 100,
    height: 100,
    top: 150,
    left: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  circleGreenTiny: {
    width: 60,
    height: 60,
    bottom: 200,
    right: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Step Container
  stepContainer: {
    marginVertical: Spacing.lg,
  },

  // Glass Card
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 28,
    padding: Spacing['2xl'],
    overflow: 'hidden',
    // Glass border
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    // Glass shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 20,
    // Web blur effect
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    }),
  },
  glassShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },

  // App Logo
  logoContainer: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 70,
    height: 70,
  },

  // Shield Icon (OTP step)
  shieldIconContainer: {
    marginBottom: Spacing.lg,
    shadowColor: colors.brand.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  shieldIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Back Button
  backButton: {
    position: 'absolute',
    top: -8,
    left: -8,
    zIndex: 10,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },

  // Typography
  title: {
    ...Typography.h1,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.base,
  },
  phoneNumber: {
    fontWeight: '700',
    color: colors.brand.purple,
    ...Typography.bodyLarge,
  },

  // Gold Underline
  underlineContainer: {
    alignItems: 'center',
  },
  underline: {
    width: 60,
    height: 4,
    borderRadius: 2,
  },

  // Form
  form: {
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  phoneInputContainer: {
    marginBottom: Spacing.xl,
  },
  unifiedPhoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  countryPickerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    gap: 6,
  },
  phoneDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.neutral[200],
  },
  phoneNumberInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  phoneIcon: {
    marginRight: 10,
  },
  phoneTextInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    paddingVertical: 14,
  },
  errorText: {
    color: Colors.error,
    ...Typography.bodySmall,
    marginTop: 6,
    marginLeft: Spacing.xs,
  },

  // OTP Actions
  otpActions: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(154, 167, 178, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  timerText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  resendButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
  },
  resendText: {
    ...Typography.body,
    color: colors.brand.purple,
    fontWeight: '700',
  },
  resendTextDisabled: {
    color: colors.neutral[300],
  },

  // Primary Button
  primaryButtonWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.brand.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
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
    ...Typography.bodyLarge,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: Spacing['2xl'],
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    ...Typography.body,
    fontWeight: '500',
    textAlign: 'center',
  },
  signUpText: {
    color: colors.brand.purple,
    fontWeight: '700',
  },
  recoveryLink: {
    marginTop: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  recoveryLinkText: {
    color: 'rgba(255, 255, 255, 0.7)',
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  recoveryText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default withErrorBoundary(SignInScreen, 'SignIn');
