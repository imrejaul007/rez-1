// Card Verification Modal
// Handles 3D Secure card verification flow

import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { platformAlertDestructive } from '@/utils/platformAlert';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import paymentVerificationService from '@/services/paymentVerificationService';
import type { CardVerificationResponse } from '@/types/paymentVerification.types';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface CardVerificationModalProps {
  visible: boolean;
  paymentMethodId: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function CardVerificationModal({
  visible,
  paymentMethodId,
  onClose,
  onSuccess,
  onError,
}: CardVerificationModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [verificationData, setVerificationData] = useState<CardVerificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (visible && paymentMethodId) {
      initiateVerification();
    }
  }, [visible, paymentMethodId]);

  const initiateVerification = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await paymentVerificationService.initiateCardVerification({
        paymentMethodId,
        returnUrl: 'rez://payment-verification/callback',
      });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setVerificationData(response.data);

        // If no authentication required, mark as success
        if (!response.data.requiresAuthentication) {
          if (!isMounted()) return;
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1000);
        }
      } else {
        throw new Error(response.error || 'Failed to initiate verification');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to verify card');
      onError(err.message || 'Failed to verify card');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleWebViewNavigationStateChange = (navState: any) => {
    const { url } = navState;

    // Check if we've completed the 3DS flow
    if (url && url.includes('payment-verification/callback')) {
      // Parse success/failure from URL
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const status = urlParams.get('status');

      if (status === 'success') {
        onSuccess();
        onClose();
      } else {
        const errorMsg = urlParams.get('error') || 'Verification failed';
        onError(errorMsg);
        onClose();
      }
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'verification_complete') {
        if (data.success) {
          onSuccess();
          onClose();
        } else {
          onError(data.error || 'Verification failed');
          onClose();
        }
      }
    } catch (error) {
      // silently handle
    }
  };

  const handleClose = () => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        'Are you sure you want to cancel verification? Your card will remain unverified.'
      );
      
      if (confirm) {
        onClose();
      }
    } else {
      platformAlertDestructive(
        'Cancel Verification',
        'Are you sure you want to cancel verification? Your card will remain unverified.',
        onClose,
        'Cancel'
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.neutral[800]} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Card Verification</ThemedText>
          <View style={styles.closeButton} />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brand.purpleLight} />
            <ThemedText style={styles.loadingText}>Initiating secure verification...</ThemedText>
            <ThemedText style={styles.loadingSubtext}>
              This will verify your card using 3D Secure authentication
            </ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color={colors.error} />
            <ThemedText style={styles.errorTitle}>Verification Failed</ThemedText>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={styles.retryButton} onPress={initiateVerification}>
              <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </Pressable>
          </View>
        ) : verificationData?.requiresAuthentication &&
          (verificationData.authenticationUrl || verificationData.threeDSUrl) ? (
          <>
            <View style={styles.infoContainer}>
              <Ionicons name="shield-checkmark" size={32} color={colors.brand.purpleLight} />
              <ThemedText style={styles.infoTitle}>Secure Verification</ThemedText>
              <ThemedText style={styles.infoText}>
                Complete the verification on the next screen to secure your card
              </ThemedText>
            </View>

            <View style={styles.webViewContainer}>
              <WebView
                source={{
                  uri: verificationData.authenticationUrl || verificationData.threeDSUrl || '',
                }}
                onNavigationStateChange={handleWebViewNavigationStateChange}
                onMessage={handleWebViewMessage}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.webViewLoading}>
                    <ActivityIndicator size="large" color={colors.brand.purpleLight} />
                  </View>
                )}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                style={styles.webView}
              />
            </View>
          </>
        ) : (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={64} color={colors.successScale[400]} />
            <ThemedText style={styles.successTitle}>Card Verified!</ThemedText>
            <ThemedText style={styles.successText}>
              Your card has been successfully verified and is ready to use
            </ThemedText>
          </View>
        )}

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Ionicons name="lock-closed" size={16} color={colors.neutral[500]} />
          <ThemedText style={styles.securityText}>
            Your card details are encrypted and secure
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

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  cancelButton: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
  },

  infoContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
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

  webViewContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
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
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
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

export default React.memo(CardVerificationModal);
