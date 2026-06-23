// UPI Verification Modal
// Handles UPI ID verification

import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import paymentVerificationService from '@/services/paymentVerificationService';
import type { UPIVerificationResponse } from '@/types/paymentVerification.types';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface UPIVerificationModalProps {
  visible: boolean;
  paymentMethodId: string;
  vpa: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function UPIVerificationModal({
  visible,
  paymentMethodId,
  vpa,
  onClose,
  onSuccess,
  onError,
}: UPIVerificationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [verificationData, setVerificationData] = useState<UPIVerificationResponse | null>(null);
  const [testVPA, setTestVPA] = useState(vpa);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (visible) {
      setTestVPA(vpa);
      handleVerify();
    }
  }, [visible, vpa]);

  const handleVerify = async () => {
    if (!testVPA) {
      setError('Please enter UPI ID');
      return;
    }

    if (!paymentVerificationService.validateUPIVPA(testVPA)) {
      setError('Invalid UPI ID format');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await paymentVerificationService.initiateUPIVerification({
        paymentMethodId,
        vpa: testVPA,
      });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setVerificationData(response.data);

        if (response.data.status === 'VERIFIED' && response.data.vpaValid) {
          if (!isMounted()) return;
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
        } else {
          if (!isMounted()) return;
          setError('UPI ID could not be verified. Please check and try again.');
          onError('UPI ID verification failed');
        }
      } else {
        throw new Error(response.error || 'Failed to verify UPI ID');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to verify UPI ID');
      onError(err.message || 'Failed to verify UPI ID');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.neutral[800]} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>UPI Verification</ThemedText>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.content}>
          {verificationData?.status === 'VERIFIED' && verificationData?.vpaValid ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={64} color={colors.successScale[400]} />
              <ThemedText style={styles.successTitle}>UPI ID Verified!</ThemedText>
              {verificationData.nameAtBank && (
                <ThemedText style={styles.nameText}>Name: {verificationData.nameAtBank}</ThemedText>
              )}
              <ThemedText style={styles.vpaText}>{testVPA}</ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.infoCard}>
                <Ionicons name="flash" size={32} color={colors.warningScale[400]} />
                <ThemedText style={styles.infoTitle}>Verify UPI ID</ThemedText>
                <ThemedText style={styles.infoText}>
                  We'll verify your UPI ID to ensure secure payments
                </ThemedText>
              </View>

              <View style={styles.inputSection}>
                <ThemedText style={styles.label}>UPI ID</ThemedText>
                <View style={styles.inputContainer}>
                  <Ionicons name="at" size={20} color={colors.brand.purpleLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="username@upi"
                    placeholderTextColor={colors.neutral[400]}
                    value={testVPA}
                    onChangeText={setTestVPA}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>
                <ThemedText style={styles.hint}>
                  Example: yourname@paytm, yourname@gpay
                </ThemedText>

                {error && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color={colors.error} />
                    <ThemedText style={styles.errorText}>{error}</ThemedText>
                  </View>
                )}
              </View>

              <Pressable
                style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
                onPress={handleVerify}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.verifyButtonText}>Verify UPI ID</ThemedText>
                )}
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.securityInfo}>
          <Ionicons name="lock-closed" size={16} color={colors.neutral[500]} />
          <ThemedText style={styles.securityText}>
            Verification is done securely through UPI network
          </ThemedText>
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
    padding: 20,
  },

  infoCard: {
    backgroundColor: colors.tint.amberLight,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
  },

  inputSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: colors.neutral[800],
  },
  hint: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 8,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorScale[100],
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    marginLeft: 8,
  },

  verifyButton: {
    backgroundColor: colors.warningScale[400],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },

  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    marginTop: 16,
  },
  nameText: {
    fontSize: 16,
    color: colors.neutral[500],
    marginTop: 12,
  },
  vpaText: {
    fontSize: 14,
    color: colors.brand.purpleLight,
    marginTop: 4,
    fontWeight: '600',
  },

  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  securityText: {
    fontSize: 12,
    color: colors.neutral[500],
    marginLeft: 8,
  },
});

export default React.memo(UPIVerificationModal);
