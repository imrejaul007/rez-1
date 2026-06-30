// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useRef } from 'react';
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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useRootNavigationState } from 'expo-router';
import { platformAlertConfirm } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeIn,
  SlideInDown,
  SlideInUp,
} from 'react-native-reanimated';
import { useAuthUser, useIsAuthenticated, useAuthLoading, useAuthError, useAuthActions } from '@/stores/selectors';
import OTPInput from '@/components/onboarding/OTPInput';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CountryCodePicker, { COUNTRY_CODES, CountryCode } from '@/components/common/CountryCodePicker';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useErrorToast } from '@/hooks/useErrorToast';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Design System Colors
const COLORS = {
  gold: colors.gold,
  goldLight: '#FFF3CC',
  nileBlue: colors.nileBlue,
  background: colors.linen,
  cardBg: 'rgba(255, 255, 255, 0.95)',
  text: {
    primary: colors.nileBlue,
    secondary: '#627D98',
    tertiary: '#9AA7B2',
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SignInScreen() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const authError = useAuthError();
  const actions = useAuthActions();
  const { showSuccess, showError } = useErrorToast();
  const isMounted = useIsMounted();

  const [formData, setFormData] = useState({ phoneNumber: '', otp: '' });
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [errors, setErrors] = useState({ phoneNumber: '', otp: '' });
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOTP, setCanResendOTP] = useState(false);
  const [isResending, setIsResending] = useState(false);
  // Warming-up state: shown when backend is cold-starting (e.g. Render free tier)
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [warmupAttempts, setWarmupAttempts] = useState(0);

  // Animation values
  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    // Entry animation
    cardScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    cardOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  useEffect(() => {
    if (otpTimer <= 0) return;

    const interval = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) {
          setCanResendOTP(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [otpTimer]);

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (isAuthenticated && user) {
      const timer = setTimeout(() => {
        try {
          router.replace(user.isOnboarded ? '/(tabs)/' as any : '/onboarding/notification-permission');
        } catch {}
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, rootNavigationState?.key]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const validatePhoneNumber = (phone: string): boolean => {
    return /^[+]?[1-9][\d]{0,15}$/.test(phone.replace(/\s/g, ''));
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

      // Clear warming-up state on success
      setIsWarmingUp(false);
      setWarmupAttempts(0);

      // Animate transition to OTP step
      cardScale.value = withSequence(withTiming(0.98, { duration: 100 }), withSpring(1));
      setStep('otp');
      setOtpTimer(60);
      setCanResendOTP(false);

      const otpMessage = __DEV__ ? 'OTP sent. (Demo: 123456)' : `OTP sent to ${selectedCountry.dialCode} ${formData.phoneNumber}`;
      showSuccess(otpMessage);
    } catch (error: any) {
      const errorMessage = error?.message || authError || 'Failed to send OTP.';
      const errorCode = (error?.code || error?.response?.data?.code || '').toString().toUpperCase();

      // Detect cold-start / backend-waking errors (timeout, 502, network, server may be slow)
      const isColdStart =
        errorMessage.includes('timeout') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('slow') ||
        errorMessage.includes('unresponsive') ||
        errorMessage.includes('network') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('cold');

      if (isColdStart) {
        setIsWarmingUp(true);
        setWarmupAttempts(prev => prev + 1);
        setErrors(prev => ({ ...prev, phoneNumber: '' }));
        return;
      }

      if (errorCode.includes('RATE_LIMIT') || errorCode.includes('TOO_MANY')) {
        setErrors(prev => ({ ...prev, phoneNumber: 'Too many requests. Please wait.' }));
        setIsWarmingUp(false);
        return;
      }

      if (errorMessage.toLowerCase().includes('user not found')) {
        setErrors(prev => ({ ...prev, phoneNumber: 'This number is not registered.' }));
        setIsWarmingUp(false);
        platformAlertConfirm('User Not Found', 'Please sign up first.', () => router.push('/onboarding/splash'), 'Sign Up');
      } else {
        setErrors(prev => ({ ...prev, phoneNumber: errorMessage }));
        showError(errorMessage);
        setIsWarmingUp(false);
      }
      actions.clearError();
    }
  };

  const handleVerifyOTP = async () => {
    if (!formData.otp.trim() || formData.otp.length !== 6) {
      setErrors(prev => ({ ...prev, otp: 'Please enter the 6-digit code' }));
      return;
    }

    try {
      const formattedPhone = `${selectedCountry.dialCode}${formData.phoneNumber}`;
      await actions.login(formattedPhone, formData.otp);
    } catch (error: any) {
      const errorMessage = error?.message || authError || 'Invalid OTP.';
      setErrors(prev => ({ ...prev, otp: errorMessage }));
      showError(errorMessage);
      actions.clearError();
    }
  };

  const handleResendOTP = async () => {
    if (!canResendOTP || isResending) return;

    setIsResending(true);
    try {
      const formattedPhone = `${selectedCountry.dialCode}${formData.phoneNumber}`;
      await actions.sendOTP(formattedPhone);
      if (!isMounted()) return;
      setOtpTimer(60);
      setCanResendOTP(false);
      showSuccess('New OTP sent!');
    } catch (error: any) {
      showError('Failed to resend OTP.');
      actions.clearError();
    } finally {
      if (isMounted()) setIsResending(false);
    }
  };

  const handleOTPChange = (otp: string) => {
    handleInputChange('otp', otp);
  };

  const handleOTPComplete = async (otp: string) => {
    handleInputChange('otp', otp);
    if (otp.length !== 6 || authLoading) return;

    try {
      const formattedPhone = `${selectedCountry.dialCode}${formData.phoneNumber}`;
      await actions.login(formattedPhone, otp);
    } catch (error: any) {
      const errorMessage = error?.message || authError || 'Invalid OTP.';
      setErrors(prev => ({ ...prev, otp: errorMessage }));
      showError(errorMessage);
      actions.clearError();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[COLORS.background, '#F5ECD8', COLORS.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Elements */}
      <View style={styles.decorativeContainer}>
        <View style={[styles.circleLarge, styles.circleTopRight]} />
        <View style={[styles.circleMedium, styles.circleBottomLeft]} />
        <View style={[styles.circleSmall, styles.circleTopLeft]} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={[styles.card, cardAnimatedStyle]}>
            {/* Header with Logo */}
            <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.header}>
              <View style={styles.logoContainer}>
                <CachedImage source={BRAND.LOGO_IMAGE} style={styles.logo} contentFit="contain" />
              </View>
              <Text style={styles.title}>{step === 'phone' ? 'Welcome Back!' : 'Verification'}</Text>
              <Text style={styles.subtitle}>
                {step === 'phone'
                  ? 'Sign in to continue'
                  : `Enter the code sent to\n${selectedCountry.dialCode} ${formData.phoneNumber}`}
              </Text>
              <View style={styles.underline} />
            </Animated.View>

            {/* Phone Step */}
            {step === 'phone' && (
              <Animated.View entering={SlideInDown.duration(300)} style={styles.form}>
                <View style={styles.inputWrapper}>
                  <View style={styles.phoneInputContainer}>
                    <CountryCodePicker
                      selectedCountry={selectedCountry}
                      onSelect={setSelectedCountry}
                      style={styles.countryPicker}
                    />
                    <View style={styles.divider} />
                    <View style={styles.phoneInputWrapper}>
                      <Ionicons name="call-outline" size={18} color={COLORS.gold} style={styles.inputIcon} />
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="Mobile number"
                        placeholderTextColor={COLORS.text.tertiary}
                        value={formData.phoneNumber}
                        onChangeText={(v) => handleInputChange('phoneNumber', v)}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        maxLength={15}
                        returnKeyType="done"
                        onSubmitEditing={handleRequestOTP}
                      />
                    </View>
                  </View>
                  {errors.phoneNumber ? (
                    <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                  ) : null}
                </View>

                {/* Warming-up card: shown when backend is cold-starting */}
                {isWarmingUp && (
                  <Animated.View entering={FadeIn.duration(400)} style={styles.warmupCard}>
                    <Ionicons name="server-outline" size={28} color={COLORS.gold} />
                    <Text style={styles.warmupTitle}>Waking up server...</Text>
                    <Text style={styles.warmupSubtitle}>
                      Backend is starting after inactivity.{'\n'}
                      This takes up to 2 minutes on free hosting.{'\n'}
                      We'll retry automatically.
                    </Text>
                    <View style={styles.warmupAttemptsRow}>
                      <LoadingSpinner size="small" color={COLORS.gold} />
                      <Text style={styles.warmupAttemptsText}>
                        Attempt {warmupAttempts} of 4
                      </Text>
                    </View>
                  </Animated.View>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    authLoading && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleRequestOTP}
                  disabled={authLoading}
                >
                  <LinearGradient
                    colors={authLoading ? [colors.neutral[300], colors.neutral[300]] : [COLORS.gold, COLORS.nileBlue]}
                    style={styles.primaryButtonGradient}
                  >
                    {authLoading ? (
                      <>
                        <LoadingSpinner size="small" color="#FFF" />
                        <Text style={styles.primaryButtonText}>Sending...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.primaryButtonText}>Send OTP</Text>
                        <Ionicons name="arrow-forward-circle" size={20} color="#FFF" />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}

            {/* OTP Step */}
            {step === 'otp' && (
              <Animated.View entering={SlideInDown.duration(300)} style={styles.form}>
                <Pressable style={styles.backButton} onPress={() => setStep('phone')}>
                  <Ionicons name="arrow-back" size={20} color={COLORS.nileBlue} />
                  <Text style={styles.backButtonText}>Change number</Text>
                </Pressable>

                <View style={styles.otpWrapper}>
                  <OTPInput
                    value={formData.otp}
                    onChange={handleOTPChange}
                    onComplete={handleOTPComplete}
                    error={errors.otp}
                    autoFocus
                  />
                </View>

                <View style={styles.timerContainer}>
                  {otpTimer > 0 ? (
                    <View style={styles.timerPill}>
                      <Ionicons name="time-outline" size={14} color={COLORS.text.tertiary} />
                      <Text style={styles.timerText}>Resend in {otpTimer}s</Text>
                    </View>
                  ) : (
                    <Pressable onPress={handleResendOTP} disabled={isResending}>
                      {isResending ? (
                        <LoadingSpinner size="small" color={COLORS.gold} />
                      ) : (
                        <Text style={styles.resendText}>Resend OTP</Text>
                      )}
                    </Pressable>
                  )}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    authLoading && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleVerifyOTP}
                  disabled={authLoading || formData.otp.length !== 6}
                >
                  <LinearGradient
                    colors={authLoading || formData.otp.length !== 6
                      ? [colors.neutral[300], colors.neutral[300]]
                      : [COLORS.gold, COLORS.nileBlue]}
                    style={styles.primaryButtonGradient}
                  >
                    {authLoading ? (
                      <>
                        <LoadingSpinner size="small" color="#FFF" />
                        <Text style={styles.primaryButtonText}>Verifying...</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.footer}>
            <Pressable style={styles.footerButton} onPress={() => router.push('/onboarding/splash')}>
              <Text style={styles.footerText}>
                Don't have an account? <Text style={styles.footerLink}>Sign Up</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardContainer: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 40 },
  decorativeContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  circleLarge: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(26, 58, 82, 0.06)' },
  circleMedium: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255, 205, 87, 0.08)' },
  circleSmall: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 205, 87, 0.06)' },
  circleTopRight: { top: -100, right: -100 },
  circleBottomLeft: { bottom: -50, left: -80 },
  circleTopLeft: { top: 150, left: -30 },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 32,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }),
  },
  header: { alignItems: 'center', marginBottom: 32 },
  logoContainer: { marginBottom: 16 },
  logo: { width: 72, height: 72, borderRadius: 20 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text.primary, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.text.tertiary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  underline: { width: 48, height: 4, backgroundColor: COLORS.gold, borderRadius: 2 },
  form: { gap: 20 },
  inputWrapper: { marginBottom: 8 },
  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFA', borderRadius: 16, borderWidth: 1.5, borderColor: colors.neutral[200],
  },
  countryPicker: { paddingHorizontal: 12, paddingVertical: 14 },
  divider: { width: 1, height: 24, backgroundColor: colors.neutral[200] },
  phoneInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 16, color: COLORS.text.primary, paddingVertical: 14 },
  errorText: { color: colors.error, fontSize: 12, marginTop: 8, marginLeft: 4 },
  primaryButton: { borderRadius: 16, overflow: 'hidden', shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  primaryButtonPressed: { transform: [{ scale: 0.98 }] },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24, alignSelf: 'flex-start' },
  backButtonText: { color: COLORS.text.secondary, fontSize: 14, fontWeight: '500' },
  otpWrapper: { marginBottom: 16 },
  timerContainer: { alignItems: 'center', marginBottom: 24 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(154, 167, 178, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  timerText: { color: COLORS.text.tertiary, fontSize: 14, fontWeight: '500' },
  resendText: { color: COLORS.gold, fontSize: 14, fontWeight: '700' },
  footer: { alignItems: 'center', marginTop: 32 },
  footerButton: { paddingVertical: 12, paddingHorizontal: 24 },
  footerText: { color: COLORS.text.tertiary, fontSize: 14 },
  footerLink: { color: COLORS.gold, fontWeight: '700' },
  // Warming-up card styles
  warmupCard: {
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.3)',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  warmupTitle: { fontSize: 15, fontWeight: '700', color: COLORS.nileBlue, textAlign: 'center' },
  warmupSubtitle: { fontSize: 12, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 18 },
  warmupAttemptsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  warmupAttemptsText: { fontSize: 12, color: COLORS.text.tertiary, fontWeight: '500' },
});

export default withErrorBoundary(SignInScreen, 'SignIn');
