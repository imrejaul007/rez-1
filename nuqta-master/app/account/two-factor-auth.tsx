import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Two-Factor Authentication Setup Page
// Manages 2FA setup and configuration

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { FormPageSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useSecurity } from '@/contexts/SecurityContext';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import userSettingsApi from '@/services/userSettingsApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type TwoFactorMethod = '2FA_SMS' | '2FA_EMAIL' | '2FA_APP';

interface TwoFactorOption {
  value: TwoFactorMethod;
  title: string;
  description: string;
  icon: string;
  color: string;
  available: boolean;
}

const TWO_FACTOR_OPTIONS: TwoFactorOption[] = [
  {
    value: '2FA_SMS',
    title: 'SMS',
    description: 'Receive verification codes via text message',
    icon: 'chatbubble-outline',
    color: Colors.success,
    available: true,
  },
  {
    value: '2FA_EMAIL',
    title: 'Email',
    description: 'Receive verification codes via email',
    icon: 'mail-outline',
    color: Colors.info,
    available: true,
  },
  {
    value: '2FA_APP',
    title: 'Authenticator App',
    description: 'Use Google Authenticator or similar app',
    icon: 'phone-portrait-outline',
    color: Colors.brand.purpleLight,
    available: true,
  },
];

function TwoFactorAuthPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { 
    securitySettings, 
    updateSecuritySettings, 
    enableTwoFactorAuth, 
    disableTwoFactorAuth,
    generateBackupCodes,
    isLoading 
  } = useSecurity();
  
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod>('2FA_SMS');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const is2FAEnabled = securitySettings?.twoFactorAuth.enabled || false;
  const currentMethod = securitySettings?.twoFactorAuth.method || '2FA_SMS';

  const handleEnable2FA = async () => {
    try {
      setIsVerifying(true);
      
      // Generate backup codes
      const codes = generateBackupCodes();
      setBackupCodes(codes);
      
      // Enable 2FA
      const success = await enableTwoFactorAuth(selectedMethod);
      
      if (success) {
        if (!isMounted()) return;
        setShowBackupCodes(true);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to enable two-factor authentication.');
    } finally {
      if (!isMounted()) return;
      setIsVerifying(false);
    }
  };

  const handleDisable2FA = () => {
    platformAlertDestructive(
      'Disable Two-Factor Authentication',
      'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
      async () => {
        try {
          const success = await disableTwoFactorAuth();
          if (success) {
            router.canGoBack() ? router.back() : router.replace('/(tabs)');
          }
        } catch (error) {
          platformAlertSimple('Error', 'Failed to disable two-factor authentication.');
        }
      }
    );
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      platformAlertSimple('Error', 'Please enter the verification code.');
      return;
    }

    try {
      setIsVerifying(true);

      const response = await userSettingsApi.verifyTwoFactorCode(verificationCode.trim(), selectedMethod || 'sms');

      if (response.success) {
        platformAlertConfirm(
          'Verification Successful',
          'Two-factor authentication has been enabled successfully!',
          () => router.canGoBack() ? router.back() : router.replace('/(tabs)'),
          'OK'
        );
      } else {
        platformAlertSimple('Error', response.message || 'Invalid verification code. Please try again.');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Invalid verification code. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsVerifying(false);
    }
  };

  const renderTwoFactorOption = (option: TwoFactorOption) => (
    <Pressable
      key={option.value}
      style={[
        styles.optionCard,
        selectedMethod === option.value && styles.selectedOption,
        !option.available && styles.disabledOption,
      ]}
      onPress={() => option.available && setSelectedMethod(option.value)}
     
      disabled={!option.available}
      accessibilityLabel={`${option.title}: ${option.description}${selectedMethod === option.value ? ', selected' : ''}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selectedMethod === option.value, disabled: !option.available }}
      accessibilityHint="Double tap to select this verification method"
    >
      <View style={styles.optionHeader}>
        <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
          <Ionicons name={option.icon as any} size={24} color={option.color} />
        </View>

        <View style={styles.optionInfo}>
          <ThemedText style={styles.optionTitle}>{option.title}</ThemedText>
          <ThemedText style={styles.optionDescription}>{option.description}</ThemedText>
        </View>

        {selectedMethod === option.value && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.brand.purpleLight} />
          </View>
        )}
      </View>
    </Pressable>
  );

  const renderBackupCodesModal = () => (
    <Modal
      visible={showBackupCodes}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowBackupCodes(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <ThemedText style={styles.modalTitle}>Backup Codes</ThemedText>
          <Pressable
            onPress={() => setShowBackupCodes(false)}
            accessibilityLabel="Close backup codes modal"
            accessibilityRole="button"
            accessibilityHint="Double tap to close the backup codes screen"
          >
            <Ionicons name="close" size={24} color={Colors.text.tertiary} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={24} color={Colors.warning} />
            <ThemedText style={styles.warningText}>
              Save these backup codes in a safe place. You can use them to access your account if you lose your phone.
            </ThemedText>
          </View>

          <View style={styles.codesContainer}>
            {backupCodes.map((code, index) => (
              <View key={index} style={styles.codeItem}>
                <ThemedText style={styles.codeText}>{code}</ThemedText>
              </View>
            ))}
          </View>

          <Pressable
            style={styles.continueButton}
            onPress={() => setShowBackupCodes(false)}
          >
            <ThemedText style={styles.continueButtonText}>I've Saved These Codes</ThemedText>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />
        <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple] as const} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Two-Factor Authentication</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <FormPageSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purpleLight} />

      {/* Header */}
      <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple] as const} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <ThemedText style={styles.headerTitle}>Two-Factor Authentication</ThemedText>

          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Current Status */}
        <View style={styles.statusSection}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons 
                name={is2FAEnabled ? "shield-checkmark" : "shield-outline"} 
                size={24} 
                color={is2FAEnabled ? Colors.success : Colors.text.tertiary} 
              />
              <ThemedText style={styles.statusTitle}>
                {is2FAEnabled ? 'Enabled' : 'Disabled'}
              </ThemedText>
            </View>
            <ThemedText style={styles.statusDescription}>
              {is2FAEnabled 
                ? `Two-factor authentication is enabled using ${currentMethod.replace('2FA_', '')}.`
                : 'Add an extra layer of security to your account.'
              }
            </ThemedText>
          </View>
        </View>

        {!is2FAEnabled ? (
          <>
            {/* Method Selection */}
            <View style={styles.methodSection}>
              <ThemedText style={styles.sectionTitle}>Choose Verification Method</ThemedText>
              {TWO_FACTOR_OPTIONS.map(renderTwoFactorOption)}
            </View>

            {/* Enable Button */}
            <Pressable
              style={styles.enableButton}
              onPress={handleEnable2FA}
              disabled={isVerifying}
              accessibilityLabel="Enable two-factor authentication"
              accessibilityRole="button"
              accessibilityState={{ disabled: isVerifying }}
              accessibilityHint="Double tap to enable two-factor authentication for your account"
            >
              <ThemedText style={styles.enableButtonText}>
                {isVerifying ? 'Setting up...' : 'Enable Two-Factor Authentication'}
              </ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            {/* Verification Code Input */}
            <View style={styles.verificationSection}>
              <ThemedText style={styles.sectionTitle}>Enter Verification Code</ThemedText>
              <View style={styles.codeInputContainer}>
                <TextInput
                  style={styles.codeInput}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="Enter 6-digit code"
                  keyboardType="numeric"
                  maxLength={6}
                  autoFocus
                  accessibilityLabel="Verification code"
                  accessibilityHint="Enter the 6-digit verification code"
                />
                <Pressable
                  style={styles.verifyButton}
                  onPress={handleVerifyCode}
                  disabled={isVerifying || !verificationCode.trim()}
                  accessibilityLabel="Verify code"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isVerifying || !verificationCode.trim() }}
                  accessibilityHint="Double tap to verify the entered code"
                >
                  <ThemedText style={styles.verifyButtonText}>
                    {isVerifying ? 'Verifying...' : 'Verify'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Disable Button */}
            <Pressable
              style={styles.disableButton}
              onPress={handleDisable2FA}
              accessibilityLabel="Disable two-factor authentication"
              accessibilityRole="button"
              accessibilityHint="Double tap to disable two-factor authentication for your account"
            >
              <ThemedText style={styles.disableButtonText}>Disable Two-Factor Authentication</ThemedText>
            </Pressable>
          </>
        )}

        {/* Information */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color={Colors.brand.purpleLight} />
              <ThemedText style={styles.infoTitle}>About Two-Factor Authentication</ThemedText>
            </View>
            <ThemedText style={styles.infoText}>
              Two-factor authentication adds an extra layer of security to your account. 
              You'll need to enter a verification code in addition to your password when signing in.
            </ThemedText>
          </View>
        </View>

        <View style={styles.footer} />
      </ScrollView>

      {renderBackupCodesModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  statusSection: {
    marginBottom: Spacing.xl,
  },
  statusCard: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: Spacing.md,
  },
  statusDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  methodSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  optionCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: Colors.brand.purpleLight,
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  optionDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  selectedIndicator: {
    marginLeft: Spacing.md,
  },
  enableButton: {
    backgroundColor: Colors.brand.purpleLight,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  enableButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  verificationSection: {
    marginBottom: Spacing.xl,
  },
  codeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  codeInput: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
    marginRight: Spacing.md,
  },
  verifyButton: {
    backgroundColor: Colors.brand.purpleLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.sm,
  },
  verifyButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  disableButton: {
    backgroundColor: Colors.error,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  disableButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: Spacing.xl,
  },
  infoCard: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
  },
  infoText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  footer: {
    height: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h3,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: colors.tint.amberLight,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  warningText: {
    flex: 1,
    ...Typography.body,
    color: colors.brand.amberDark,
    marginLeft: Spacing.md,
    lineHeight: 20,
  },
  codesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  codeItem: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  codeText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    fontFamily: 'monospace',
  },
  continueButton: {
    backgroundColor: Colors.brand.purpleLight,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  continueButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
});


export default withErrorBoundary(TwoFactorAuthPage, 'AccountTwoFactorAuth');
