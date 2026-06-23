/**
 * PriveLockedTeaser
 *
 * Shown when the user does not have Privé access.
 * Dark premium theme with invite code input.
 */

import { colors } from '@/constants/theme';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PRIVE_COLORS } from './priveTheme';
import priveInviteApi from '@/services/priveInviteApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface PriveLockedTeaserProps {
  onAccessGranted?: () => void;
}

const BENEFITS = [
  { icon: 'star-outline' as const, text: 'Exclusive offers & rewards' },
  { icon: 'diamond-outline' as const, text: 'Premium tier progression' },
  { icon: 'gift-outline' as const, text: 'Invite friends & earn coins' },
  { icon: 'shield-checkmark-outline' as const, text: 'Reputation-based privileges' },
];

function PriveLockedTeaser({ onAccessGranted }: PriveLockedTeaserProps) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const isMounted = useIsMounted();
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    reason?: string;
    creator?: { name: string; tier: string };
  } | null>(null);

  const handleValidate = async () => {
    if (!code.trim()) return;
    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await priveInviteApi.validateCode(code.trim());
      if (response.success && response.data) {
        if (!isMounted()) return;
        setValidationResult(response.data);
      } else {
        setValidationResult({ valid: false, reason: 'Failed to validate code' });
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setValidationResult({ valid: false, reason: err.message || 'Network error' });
    } finally {
      if (!isMounted()) return;
      setIsValidating(false);
    }
  };

  const handleApply = async () => {
    if (!code.trim()) return;
    setIsApplying(true);

    try {
      const response = await priveInviteApi.applyCode(code.trim());
      if (response.success && response.data?.hasAccess) {
        const reward = response.data.inviteeReward || 0;
        platformAlertSimple(
          'Welcome to Prive!',
          reward > 0
            ? `Your access is now active. You received ${reward} welcome coins!`
            : 'Your access is now active. Explore exclusive features!'
        );
        onAccessGranted?.();
      } else {
        platformAlertSimple('Error', 'Failed to apply invite code');
      }
    } catch (err: any) {
      platformAlertSimple('Error', err.message || 'Failed to apply invite code');
    } finally {
      if (!isMounted()) return;
      setIsApplying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { paddingBottom: insets.bottom + 20 }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={['#1A1510', colors.midGrayAlt]}
          style={styles.heroSection}
        >
          <View style={styles.lockIconContainer}>
            <LinearGradient
              colors={[colors.brand.goldAccent, '#A88B4A']}
              style={styles.lockIconGradient}
            >
              <Ionicons name="lock-closed" size={32} color={colors.midGrayAlt} />
            </LinearGradient>
          </View>

          <Text style={styles.heroTitle}>Prive is Invite-Only</Text>
          <Text style={styles.heroSubtitle}>
            An exclusive circle of trusted members. Get an invite from an existing Prive member to unlock premium access.
          </Text>
        </LinearGradient>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>What you unlock</Text>
          {BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={styles.benefitIconContainer}>
                <Ionicons name={benefit.icon} size={20} color={PRIVE_COLORS.gold.primary} />
              </View>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </View>

        {/* Invite Code Input */}
        <View style={styles.codeSection}>
          <Text style={styles.sectionTitle}>Have an invite code?</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(text) => {
                setCode(text.toUpperCase());
                setValidationResult(null);
              }}
              placeholder="PRIVE-XXXXXXXX"
              placeholderTextColor={PRIVE_COLORS.text.tertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={14}
            />
            {code.length > 0 && (
              <Pressable
                style={styles.clearButton}
                onPress={() => { setCode(''); setValidationResult(null); }}
              >
                <Ionicons name="close-circle" size={20} color={PRIVE_COLORS.text.tertiary} />
              </Pressable>
            )}
          </View>

          {/* Validation feedback */}
          {validationResult && (
            <View style={[
              styles.validationFeedback,
              { borderColor: validationResult.valid ? PRIVE_COLORS.status.success : PRIVE_COLORS.status.error }
            ]}>
              <Ionicons
                name={validationResult.valid ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={validationResult.valid ? PRIVE_COLORS.status.success : PRIVE_COLORS.status.error}
              />
              <Text style={[
                styles.validationText,
                { color: validationResult.valid ? PRIVE_COLORS.status.success : PRIVE_COLORS.status.error }
              ]}>
                {validationResult.valid
                  ? `Valid code from ${validationResult.creator?.name || 'Prive Member'}`
                  : validationResult.reason || 'Invalid code'
                }
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            {!validationResult?.valid && (
              <Pressable
                style={[styles.validateButton, (!code.trim() || isValidating) && styles.buttonDisabled]}
                onPress={handleValidate}
                disabled={!code.trim() || isValidating}
              >
                {isValidating ? (
                  <ActivityIndicator size="small" color={PRIVE_COLORS.gold.primary} />
                ) : (
                  <Text style={styles.validateButtonText}>Verify Code</Text>
                )}
              </Pressable>
            )}

            {validationResult?.valid && (
              <Pressable
                style={[styles.applyButton, isApplying && styles.buttonDisabled]}
                onPress={handleApply}
                disabled={isApplying}
              >
                <LinearGradient
                  colors={[colors.brand.goldAccent, '#A88B4A']}
                  style={styles.applyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isApplying ? (
                    <ActivityIndicator size="small" color={colors.midGrayAlt} />
                  ) : (
                    <>
                      <Ionicons name="key" size={18} color={colors.midGrayAlt} />
                      <Text style={styles.applyButtonText}>Unlock Prive</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>

        {/* Footer hint */}
        <Text style={styles.footerHint}>
          Don't have an invite? Ask a Prive member to share their code with you.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.primary,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  lockIconContainer: {
    marginBottom: 20,
  },
  lockIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: PRIVE_COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  benefitsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  benefitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIVE_COLORS.gold.glow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    fontSize: 15,
    color: PRIVE_COLORS.text.secondary,
    flex: 1,
  },
  codeSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  codeInput: {
    flex: 1,
    height: 52,
    fontSize: 17,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    letterSpacing: 1,
  },
  clearButton: {
    padding: 4,
  },
  validationFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIVE_COLORS.background.elevated,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    gap: 8,
  },
  validationText: {
    fontSize: 13,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  validateButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.gold.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
  },
  applyButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.midGrayAlt,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  footerHint: {
    fontSize: 13,
    color: PRIVE_COLORS.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
});

export default React.memo(PriveLockedTeaser);
