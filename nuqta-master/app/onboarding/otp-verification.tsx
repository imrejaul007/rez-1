// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, FadeIn, SlideInDown } from 'react-native-reanimated';
import analyticsService from '@/services/analyticsService';
import { useAuthUser, useAuthLoading, useAuthError, useAuthActions } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import OTPInput from '@/components/onboarding/OTPInput';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  gold: colors.gold,
  nileBlue: colors.nileBlue,
  background: colors.linen,
  cardBg: 'rgba(255, 255, 255, 0.95)',
  text: { primary: colors.nileBlue, tertiary: '#9AA7B2' },
};

function OTPVerificationScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const user = useAuthUser();
  const authLoading = useAuthLoading();
  const authError = useAuthError();
  const actions = useAuthActions();

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');

  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    analyticsService.track('otp_verification_started');
    cardScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    cardOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) { setCanResend(true); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }], opacity: cardOpacity.value }));

  const handleVerify = async () => {
    if (!phoneNumber) { setError('Phone number not found'); return; }
    if (otp.length !== 6) { setError('Please enter the 6-digit code'); return; }
    try {
      await actions.verifyOTP(phoneNumber, otp);
      analyticsService.track('otp_verified');
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!isMounted()) return;
      router.replace(user?.isOnboarded ? '/(tabs)' : '/onboarding/notification-permission');
    } catch (err: any) {
      setError(err?.message || authError || 'Invalid OTP');
      platformAlertSimple('Verification Failed', err?.message || 'Please try again');
      setOtp('');
      actions.clearError();
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || !phoneNumber || isResending) return;
    setIsResending(true);
    try {
      await actions.sendOTP(phoneNumber);
      if (!isMounted()) return;
      setTimer(30);
      setCanResend(false);
      setOtp('');
      platformAlertSimple('OTP Sent', 'A new code has been sent.');
    } catch (err: any) {
      platformAlertSimple('Error', err?.message || 'Failed to resend');
      actions.clearError();
    } finally {
      if (isMounted()) setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient colors={[COLORS.background, '#F5ECD8', COLORS.background]} style={StyleSheet.absoluteFill} />
      <View style={styles.decorativeContainer}>
        <View style={[styles.circleLarge, styles.circleTopRight]} />
        <View style={[styles.circleMedium, styles.circleBottomLeft]} />
      </View>
      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.card, cardAnimatedStyle]}>
            <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.header}>
              <View style={styles.iconBadge}>
                <LinearGradient colors={[COLORS.gold, COLORS.nileBlue]} style={styles.iconGradient}>
                  <Ionicons name="shield-checkmark" size={32} color="#FFF" />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Verify Your Number</Text>
              <Text style={styles.subtitle}>Enter the 6-digit code sent to{'\n'}<Text style={styles.phoneText}>{phoneNumber}</Text></Text>
              <View style={styles.underline} />
            </Animated.View>
            <Animated.View entering={SlideInDown.duration(300).delay(150)} style={styles.form}>
              <View style={styles.otpWrapper}>
                <OTPInput value={otp} onChange={(v) => { setOtp(v); setError(''); }} onComplete={handleVerify} error={error} />
              </View>
              <View style={styles.timerContainer}>
                {timer > 0 ? (
                  <View style={styles.timerPill}><Ionicons name="time-outline" size={14} color={COLORS.text.tertiary} /><Text style={styles.timerText}>Resend in {timer}s</Text></View>
                ) : (
                  <Pressable onPress={handleResendOTP} disabled={isResending} style={styles.resendButton}>
                    {isResending ? <LoadingSpinner size="small" color={COLORS.gold} /> : <><Ionicons name="refresh-outline" size={16} color={COLORS.gold} /><Text style={styles.resendText}>Resend OTP</Text></>}
                  </Pressable>
                )}
              </View>
              <Pressable style={[styles.primaryButton, (authLoading || otp.length !== 6) && styles.primaryButtonDisabled]} onPress={handleVerify} disabled={authLoading || otp.length !== 6}>
                <LinearGradient colors={authLoading || otp.length !== 6 ? [colors.neutral[300], colors.neutral[300]] : [COLORS.gold, COLORS.nileBlue]} style={styles.primaryButtonGradient}>
                  {authLoading ? <><LoadingSpinner size="small" color="#FFF" /><Text style={styles.primaryButtonText}>Verifying...</Text></> : <><Text style={styles.primaryButtonText}>Verify & Continue</Text><Ionicons name="checkmark-circle" size={20} color="#FFF" /></>}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </Animated.View>
          <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.backContainer}>
            <Pressable style={styles.backButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={20} color={COLORS.text.tertiary} /><Text style={styles.backButtonText}>Change phone number</Text></Pressable>
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
  circleTopRight: { top: -100, right: -100 },
  circleBottomLeft: { bottom: -50, left: -80 },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 32, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8, ...(Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }) },
  header: { alignItems: 'center', marginBottom: 32 },
  iconBadge: { marginBottom: 20, shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
  iconGradient: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text.primary, marginBottom: 10, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.text.tertiary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  phoneText: { color: COLORS.gold, fontWeight: '700' },
  underline: { width: 48, height: 4, backgroundColor: COLORS.gold, borderRadius: 2 },
  form: { gap: 20 },
  otpWrapper: { alignItems: 'center', marginBottom: 8 },
  timerContainer: { alignItems: 'center' },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(154, 167, 178, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  timerText: { color: COLORS.text.tertiary, fontSize: 14, fontWeight: '500' },
  resendButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  resendText: { color: COLORS.gold, fontSize: 14, fontWeight: '700' },
  primaryButton: { borderRadius: 16, overflow: 'hidden', shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  backContainer: { alignItems: 'center', marginTop: 32 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  backButtonText: { color: COLORS.text.tertiary, fontSize: 14, fontWeight: '500' },
});

export default withErrorBoundary(OTPVerificationScreen, 'OnboardingOtpVerification');
