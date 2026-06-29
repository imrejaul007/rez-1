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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import analyticsService from '@/services/analyticsService';
import { useAuthLoading, useAuthError, useAuthActions } from '@/stores/selectors';
import FormInput from '@/components/onboarding/FormInput';
import CountryCodePicker, { COUNTRY_CODES, CountryCode } from '@/components/common/CountryCodePicker';
import { platformAlertSimple } from '@/utils/platformAlert';
import ReferralHandler from '@/utils/referralHandler';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

function RegistrationScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams<{ referralCode?: string }>();
  const authLoading = useAuthLoading();
  const authError = useAuthError();
  const actions = useAuthActions();

  const [formData, setFormData] = useState({ phoneNumber: '', email: '', referralCode: '' });
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [errors, setErrors] = useState({ phoneNumber: '', email: '' });
  const [showExistingUser, setShowExistingUser] = useState(false);

  // Animation values
  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    analyticsService.track('registration_started');
    cardScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    cardOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  useEffect(() => {
    if (params.referralCode) {
      setFormData(prev => ({ ...prev, referralCode: params.referralCode! }));
    } else {
      ReferralHandler.getStoredReferralCode().then(stored => {
        if (stored?.code && isMounted()) {
          setFormData(prev => ({ ...prev, referralCode: stored.code }));
        }
      }).catch(() => {});
    }
  }, [params.referralCode]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = { phoneNumber: '', email: '' };
    if (!formData.phoneNumber.trim() || !/^[1-9]\d{4,14}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    if (formData.email.trim() && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    setErrors(newErrors);
    return !newErrors.phoneNumber && !newErrors.email;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    Keyboard.dismiss();

    try {
      const formattedPhone = `${selectedCountry.dialCode}${formData.phoneNumber}`;
      await actions.sendOTP(formattedPhone, formData.email.trim() || undefined, formData.referralCode || undefined);
      router.push({ pathname: '/onboarding/otp-verification', params: { phoneNumber: formattedPhone } });
    } catch (error: any) {
      const errorMessage = error?.message || authError || 'Failed to send OTP.';
      if (errorMessage.toLowerCase().includes('already') && errorMessage.toLowerCase().includes('registered')) {
        setShowExistingUser(true);
      } else if (errorMessage.toLowerCase().includes('phone')) {
        setErrors(prev => ({ ...prev, phoneNumber: errorMessage }));
      } else {
        platformAlertSimple('Error', errorMessage);
      }
      actions.clearError();
    }
  };

  const handleTryAgain = () => {
    setShowExistingUser(false);
    setFormData({ phoneNumber: '', email: '', referralCode: '' });
    setErrors({ phoneNumber: '', email: '' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient colors={[COLORS.background, '#F5ECD8', COLORS.background]} style={StyleSheet.absoluteFill} />

      {/* Decorative Elements */}
      <View style={styles.decorativeContainer}>
        <View style={[styles.circleLarge, styles.circleTopRight]} />
        <View style={[styles.circleMedium, styles.circleBottomLeft]} />
      </View>

      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={[styles.card, cardAnimatedStyle]}>
            {showExistingUser ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.existingUserContainer}>
                <View style={styles.iconBadge}>
                  <LinearGradient colors={[COLORS.gold, COLORS.nileBlue]} style={styles.iconGradient}>
                    <Ionicons name="person-circle" size={48} color="#FFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.existingUserTitle}>Account Already Exists</Text>
                <Text style={styles.existingUserMessage}>This phone number is already registered.{'\n'}Please use Sign In to access your account.</Text>
                <Pressable style={styles.primaryButton} onPress={() => router.push('/sign-in')}>
                  <LinearGradient colors={[COLORS.gold, COLORS.nileBlue]} style={styles.primaryButtonGradient}>
                    <Ionicons name="log-in-outline" size={20} color="#FFF" />
                    <Text style={styles.primaryButtonText}>Go to Sign In</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={handleTryAgain}>
                  <Text style={styles.secondaryButtonText}>Try Different Number</Text>
                </Pressable>
              </Animated.View>
            ) : (
              <>
                <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.header}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>Step 1 of 3</Text>
                  </View>
                  <Text style={styles.title}>Create Account</Text>
                  <Text style={styles.subtitle}>Enter your details to get started</Text>
                  <View style={styles.underline} />
                </Animated.View>

                <Animated.View entering={SlideInDown.duration(300).delay(150)} style={styles.form}>
                  {/* Phone Input */}
                  <View style={styles.inputWrapper}>
                    <View style={styles.phoneInputContainer}>
                      <CountryCodePicker selectedCountry={selectedCountry} onSelect={setSelectedCountry} style={styles.countryPicker} />
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
                          maxLength={15}
                        />
                      </View>
                    </View>
                    {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}
                  </View>

                  {/* Email Input */}
                  <FormInput
                    placeholder="Email (Optional)"
                    value={formData.email}
                    onChangeText={(v) => handleInputChange('email', v)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={errors.email}
                    containerStyle={styles.inputContainer}
                    leftIcon={<Ionicons name="mail-outline" size={20} color={COLORS.gold} />}
                  />

                  {/* Referral Code */}
                  <FormInput
                    placeholder="Referral Code (Optional)"
                    value={formData.referralCode}
                    onChangeText={(v) => handleInputChange('referralCode', v)}
                    autoCapitalize="characters"
                    containerStyle={styles.inputContainer}
                    leftIcon={<Ionicons name="gift-outline" size={20} color={COLORS.gold} />}
                  />

                  {/* Submit Button */}
                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                    onPress={handleSubmit}
                    disabled={authLoading}
                  >
                    <LinearGradient
                      colors={authLoading ? [colors.neutral[300], colors.neutral[300]] : [COLORS.gold, COLORS.nileBlue]}
                      style={styles.primaryButtonGradient}
                    >
                      <Text style={styles.primaryButtonText}>{authLoading ? 'Submitting...' : 'Continue'}</Text>
                      {!authLoading && <Ionicons name="arrow-forward" size={20} color="#FFF" />}
                    </LinearGradient>
                  </Pressable>

                  {/* Sign In Link */}
                  <View style={styles.signInContainer}>
                    <Text style={styles.signInText}>Already have an account? </Text>
                    <Pressable onPress={() => router.push('/sign-in')}>
                      <Text style={styles.signInLink}>Sign In</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </>
            )}
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
  header: { alignItems: 'center', marginBottom: 28 },
  stepBadge: { backgroundColor: 'rgba(255, 205, 87, 0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 205, 87, 0.3)' },
  stepBadgeText: { color: COLORS.gold, fontSize: 12, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text.primary, marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.text.tertiary, textAlign: 'center', marginBottom: 16 },
  underline: { width: 48, height: 4, backgroundColor: COLORS.gold, borderRadius: 2 },
  form: { gap: 16 },
  inputWrapper: { marginBottom: 8 },
  inputContainer: { marginBottom: 0 },
  phoneInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 16, borderWidth: 1.5, borderColor: colors.neutral[200] },
  countryPicker: { paddingHorizontal: 12, paddingVertical: 14 },
  divider: { width: 1, height: 24, backgroundColor: colors.neutral[200] },
  phoneInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 16, color: COLORS.text.primary, paddingVertical: 14 },
  errorText: { color: colors.error, fontSize: 12, marginTop: 8, marginLeft: 4 },
  primaryButton: { borderRadius: 16, overflow: 'hidden', shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6, marginTop: 8 },
  primaryButtonPressed: { transform: [{ scale: 0.98 }] },
  primaryButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { color: COLORS.text.tertiary, fontSize: 14, fontWeight: '500' },
  signInContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  signInText: { color: COLORS.text.tertiary, fontSize: 14 },
  signInLink: { color: COLORS.gold, fontSize: 14, fontWeight: '700' },
  existingUserContainer: { alignItems: 'center', paddingVertical: 20 },
  iconBadge: { marginBottom: 20, shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
  iconGradient: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  existingUserTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text.primary, marginBottom: 12, textAlign: 'center' },
  existingUserMessage: { color: COLORS.text.tertiary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
});

export default withErrorBoundary(RegistrationScreen, 'OnboardingRegistration');
