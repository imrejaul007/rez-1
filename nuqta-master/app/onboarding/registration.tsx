import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, TextInput, KeyboardAvoidingView, ScrollView } from 'react-native';
import analyticsService from '@/services/analyticsService';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import FormInput from '@/components/onboarding/FormInput';
import { useAuthLoading, useAuthError, useAuthActions } from '@/stores/selectors';
import CountryCodePicker, { COUNTRY_CODES, CountryCode } from '@/components/common/CountryCodePicker';
import { platformAlertSimple } from '@/utils/platformAlert';
import ReferralHandler from '@/utils/referralHandler';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
// Nuqta Design System Colors
function RegistrationScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams<{ referralCode?: string }>();
  const authLoading = useAuthLoading();
  const authError = useAuthError();
  const actions = useAuthActions();

  const [formData, setFormData] = useState({
    phoneNumber: '',
    email: '',
    referralCode: '',
  });

  useEffect(() => {
    analyticsService.track('registration_started');
  }, []);

  // Auto-populate referral code from deep link or route params
  useEffect(() => {
    const loadReferralCode = async () => {
      // Priority: route params > stored deep link code
      if (params.referralCode) {
        setFormData(prev => ({ ...prev, referralCode: params.referralCode! }));
        return;
      }
      try {
        const storedReferral = await ReferralHandler.getStoredReferralCode();
        if (storedReferral?.code) {
          if (!isMounted()) return;
          setFormData(prev => ({ ...prev, referralCode: storedReferral.code }));
        }
      } catch (error) {
        // silently handle
      }
    };
    loadReferralCode();
  }, [params.referralCode]);

  // Default to UAE (+971)
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);

  const [errors, setErrors] = useState({
    phoneNumber: '',
    email: '',
  });

  const [showExistingUserMessage, setShowExistingUserMessage] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      phoneNumber: '',
      email: '',
    };

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^[1-9]\d{4,14}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    // Email is optional, but validate format if provided
    if (formData.email.trim() && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return !newErrors.phoneNumber && !newErrors.email;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const formattedPhone = `${selectedCountry.dialCode}${formData.phoneNumber}`;
      const emailToSend = formData.email.trim() || undefined;
      await actions.sendOTP(formattedPhone, emailToSend, formData.referralCode || undefined);

      router.push({
        pathname: '/onboarding/otp-verification',
        params: { phoneNumber: formattedPhone }
      });
    } catch (error: any) {
      const errorMessage = error?.message || authError || 'Failed to send OTP. Please try again.';

      if (errorMessage.toLowerCase().includes('already') &&
          (errorMessage.toLowerCase().includes('registered') ||
           errorMessage.toLowerCase().includes('exists'))) {
        if (!isMounted()) return;
        setShowExistingUserMessage(true);
      } else if (errorMessage.toLowerCase().includes('phone')) {
        // Show phone number error in the UI
        if (!isMounted()) return;
        setErrors(prev => ({ ...prev, phoneNumber: errorMessage }));
      } else {
        platformAlertSimple('Error', errorMessage);
      }
      actions.clearError();
    }
  };

  const handleGoToSignIn = () => {
    router.push('/sign-in');
  };

  const handleTryAgain = () => {
    setShowExistingUserMessage(false);
    setFormData({ phoneNumber: '', email: '', referralCode: '' });
    setErrors({ phoneNumber: '', email: '' });
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={[colors.linen, '#EDF2F7', colors.linen]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Elements */}
      <View style={styles.decorativeCircles}>
        <View style={[styles.circle, styles.circleGreen]} />
        <View style={[styles.circle, styles.circleGold]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showExistingUserMessage ? (
          // Existing User Message
          <View style={styles.glassCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
              style={styles.glassShine}
            />

            <View style={styles.existingUserContainer}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[Colors.gold, Colors.nileBlue]}
                  style={styles.iconGradient}
                >
                  <Ionicons name="person-circle" size={48} color={Colors.background.primary} />
                </LinearGradient>
              </View>

              <Text style={styles.existingUserTitle}>Account Already Exists</Text>
              <Text style={styles.existingUserMessage}>
                This phone number is already registered.{'\n'}
                Please use Sign In to access your account.
              </Text>

              <Pressable
                style={styles.primaryButtonWrapper}
                onPress={handleGoToSignIn}
               
              >
                <LinearGradient
                  colors={[Colors.gold, Colors.nileBlue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButton}
                >
                  <Ionicons name="log-in-outline" size={20} color={Colors.background.primary} />
                  <Text style={styles.primaryButtonText}>Go to Sign In</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={handleTryAgain}>
                <Text style={styles.secondaryButtonText}>Try Different Number</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          // Registration Form
          <View style={styles.glassCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
              style={styles.glassShine}
            />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepText}>Step 1 of 3</Text>
              </View>

              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Enter your details to get started</Text>

              <View style={styles.underlineContainer}>
                <LinearGradient
                  colors={[Colors.gold, colors.lightPeach]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.underline}
                />
              </View>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.phoneFieldContainer}>
                <View style={styles.unifiedPhoneInput}>
                  <CountryCodePicker
                    selectedCountry={selectedCountry}
                    onSelect={setSelectedCountry}
                    style={styles.countryPickerInline}
                  />
                  <View style={styles.phoneDivider} />
                  <View style={styles.phoneNumberInput}>
                    <Ionicons name="call-outline" size={18} color={Colors.gold} style={styles.phoneIcon} />
                    <TextInput
                      style={styles.phoneTextInput}
                      placeholder="Mobile number"
                      placeholderTextColor={colors.gray[400]}
                      value={formData.phoneNumber}
                      onChangeText={(value) => handleInputChange('phoneNumber', value)}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
                {errors.phoneNumber ? (
                  <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                ) : null}
              </View>

              <FormInput
                placeholder="Email Id (Optional)"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                containerStyle={styles.inputContainer}
                leftIcon={<Ionicons name="mail-outline" size={20} color={Colors.gold} />}
              />

              <FormInput
                placeholder="Referral code (Optional)"
                value={formData.referralCode}
                onChangeText={(value) => handleInputChange('referralCode', value)}
                autoCapitalize="characters"
                containerStyle={styles.inputContainer}
                leftIcon={<Ionicons name="gift-outline" size={20} color={Colors.gold} />}
              />
            </View>

            {/* Submit Button */}
            <Pressable
              style={styles.primaryButtonWrapper}
              onPress={handleSubmit}
              disabled={authLoading}
             
            >
              <LinearGradient
                colors={authLoading ? [Colors.border.default, Colors.border.default] : [Colors.gold, Colors.nileBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>
                  {authLoading ? 'Submitting...' : 'Continue'}
                </Text>
                {!authLoading && <Ionicons name="arrow-forward" size={20} color={Colors.background.primary} />}
              </LinearGradient>
            </Pressable>

            {/* Sign In Link */}
            <Pressable style={styles.signInLink} onPress={handleGoToSignIn}>
              <Text style={styles.signInText}>
                Already have an account?{' '}
                <Text style={styles.signInHighlight}>Sign In</Text>
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
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
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.gold,        // Light Mustard,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.nileBlue,    // Nile Blue,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.body.fontSize,
    color: colors.gray[400],
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  underlineContainer: {
    alignItems: 'center',
  },
  underline: {
    width: 50,
    height: 4,
    borderRadius: 2,
  },

  // Form
  form: {
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.base,
  },
  phoneFieldContainer: {
    marginBottom: Spacing.base,
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
    backgroundColor: Colors.border.default,
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
    fontSize: Typography.body.fontSize,
    color: Colors.nileBlue,    // Nile Blue,
    paddingVertical: 14,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.bodySmall.fontSize,
    marginTop: 6,
    marginLeft: Spacing.xs,
  },

  // Buttons
  primaryButtonWrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: Colors.gold,        // Light Mustard,
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
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: Spacing.base,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: Typography.body.fontSize,
    color: colors.gray[400],
    fontWeight: '600',
  },
  signInLink: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  signInText: {
    fontSize: Typography.body.fontSize,
    color: colors.gray[400],
  },
  signInHighlight: {
    color: Colors.gold,        // Light Mustard,
    fontWeight: '700',
  },

  // Existing User
  existingUserContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
    shadowColor: Colors.gold,        // Light Mustard,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  existingUserTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.nileBlue,    // Nile Blue,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  existingUserMessage: {
    fontSize: Typography.body.fontSize,
    color: colors.gray[400],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
});

export default withErrorBoundary(RegistrationScreen, 'OnboardingRegistration');
