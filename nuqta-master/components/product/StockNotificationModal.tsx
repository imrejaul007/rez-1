import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

/**
 * StockNotificationModal Component
 *
 * Modal for users to subscribe to stock notifications
 * Collects email/phone and notifies when product is back in stock
 */
interface StockNotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe: (email: string, phone?: string) => Promise<void>;
  productName: string;
  productImage?: string;
  variantDetails?: string;
}

export const StockNotificationModal: React.FC<StockNotificationModalProps> = ({
  visible,
  onClose,
  onSubscribe,
  productName,
  productImage,
  variantDetails,
}) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const isMounted = useIsMounted();

  /**
   * Validate email format
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate phone format (basic)
   */
  const isValidPhone = (phone: string): boolean => {
    if (!phone) return true; // Phone is optional
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    return phoneRegex.test(phone);
  };

  /**
   * Handle subscription
   */
  const handleSubscribe = async () => {
    // Reset error
    setError(null);

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (phone && !isValidPhone(phone)) {
      setError('Please enter a valid phone number');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubscribe(email, phone || undefined);
      if (!isMounted()) return;
      setSubscribed(true);

      // Auto-close after 2 seconds on success
      if (!isMounted()) return;
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to subscribe. Please try again.');
      setIsSubmitting(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    // Reset form
    setEmail('');
    setPhone('');
    setError(null);
    setSubscribed(false);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
         
          onPress={handleClose}
        />

        <View style={styles.modalContainer}>
          {!subscribed ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Header Icon */}
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={[colors.brand.purpleLight, colors.brand.purpleDeep]}
                  style={styles.iconGradient}
                >
                  <Ionicons name="notifications-outline" size={40} color={colors.background.primary} />
                </LinearGradient>
              </View>

              {/* Title */}
              <ThemedText style={styles.title}>Notify Me</ThemedText>
              <ThemedText style={styles.subtitle}>
                We'll let you know when this product is back in stock
              </ThemedText>

              {/* Product Info */}
              <View style={styles.productInfo}>
                <ThemedText style={styles.productName} numberOfLines={2}>
                  {productName}
                </ThemedText>
                {variantDetails && (
                  <ThemedText style={styles.variantDetails}>{variantDetails}</ThemedText>
                )}
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="mail-outline" size={18} color={colors.neutral[500]} />
                  <ThemedText style={styles.inputLabel}>Email Address *</ThemedText>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor={colors.neutral[400]}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Phone Input (Optional) */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Ionicons name="call-outline" size={18} color={colors.neutral[500]} />
                  <ThemedText style={styles.inputLabel}>Phone Number (Optional)</ThemedText>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor={colors.neutral[400]}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setError(null);
                  }}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              )}

              {/* Subscribe Button */}
              <Pressable
                style={[styles.subscribeButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleSubscribe}
                disabled={isSubmitting}
               
              >
                <LinearGradient
                  colors={[colors.brand.purpleLight, colors.brand.purpleDeep]}
                  style={styles.buttonGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.background.primary} />
                  ) : (
                    <>
                      <Ionicons name="notifications" size={20} color={colors.background.primary} />
                      <ThemedText style={styles.subscribeButtonText}>
                        Notify Me
                      </ThemedText>
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Cancel Button */}
              <Pressable
                style={styles.cancelButton}
                onPress={handleClose}
               
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </Pressable>

              {/* Privacy Note */}
              <ThemedText style={styles.privacyNote}>
                We respect your privacy. You'll only receive notifications about this product.
              </ThemedText>
            </ScrollView>
          ) : (
            // Success State
            <View style={styles.successContainer}>
              <View style={styles.successIconContainer}>
                <LinearGradient
                  colors={[colors.successScale[400], colors.successScale[700]]}
                  style={styles.successIconGradient}
                >
                  <Ionicons name="checkmark-circle" size={60} color={colors.background.primary} />
                </LinearGradient>
              </View>

              <ThemedText style={styles.successTitle}>You're All Set!</ThemedText>
              <ThemedText style={styles.successSubtitle}>
                We'll notify you as soon as this product is back in stock
              </ThemedText>

              <View style={styles.successInfo}>
                <Ionicons name="mail" size={20} color={colors.brand.purpleLight} />
                <ThemedText style={styles.successEmail}>{email}</ThemedText>
              </View>
            </View>
          )}

          {/* Close Button */}
          <Pressable
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.neutral[400]} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const modalWidth = Math.min(width - 48, 400);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: modalWidth,
    maxHeight: '80%',
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },

  // Header
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // Product Info
  productInfo: {
    width: '100%',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 4,
  },
  variantDetails: {
    fontSize: 12,
    color: colors.neutral[500],
  },

  // Input
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[700],
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.neutral[900],
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorScale[100],
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
  },

  // Buttons
  subscribeButton: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  privacyNote: {
    fontSize: 11,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 16,
  },

  // Success State
  successContainer: {
    padding: 32,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  successInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.pink,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 10,
  },
  successEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purpleDeep,
  },

  // Close Button
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

export default React.memo(StockNotificationModal);
