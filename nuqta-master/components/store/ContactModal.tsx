// ContactModal.tsx
// Beautiful modal for displaying store contact information with copy functionality

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ContactModalProps {
  visible: boolean;
  onClose: () => void;
  phone?: string;
  email?: string;
  storeName?: string;
}

function ContactModal({
  visible,
  onClose,
  phone,
  email,
  storeName,
}: ContactModalProps) {
  const [copiedField, setCopiedField] = useState<'phone' | 'email' | null>(null);
  const isMounted = useIsMounted();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const fadeAnim = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      fadeAnim.value = withSpring(1, { damping: 7, stiffness: 50 });
    } else {
      fadeAnim.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { scale: interpolate(fadeAnim.value, [0, 1], [0.9, 1]) },
    ],
  }));

  const handleCopy = async (text: string, field: 'phone' | 'email') => {
    try {
      if (Platform.OS === 'web') {
        // Web clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand('copy');
          } catch (err) {
            // silently handle
          }
          document.body.removeChild(textArea);
        }
      } else {
        // Expo Clipboard for React Native
        if (!isMounted()) return;
        await Clipboard.setStringAsync(text);
      }

      if (!isMounted()) return;
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } catch (error) {
      // silently handle
    }
  };

  const handleCall = async () => {
    if (!phone) return;

    try {
      const url = `tel:${phone}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      // silently handle
    }
  };

  const handleEmail = async () => {
    if (!email) return;

    try {
      const url = `mailto:${email}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      // silently handle
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            animatedStyle,
          ]}
        >
          <LinearGradient
            colors={[colors.background.primary, colors.neutral[50]]}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="call" size={28} color={colors.brand.purpleLight} />
                </View>
                <View style={styles.headerText}>
                  <ThemedText style={styles.title}>Contact Store</ThemedText>
                  {storeName && (
                    <ThemedText style={styles.subtitle}>{storeName}</ThemedText>
                  )}
                </View>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close contact modal"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </Pressable>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {/* Phone Number */}
              {phone && (
                <View style={styles.contactItem}>
                  <View style={styles.contactHeader}>
                    <Ionicons name="call" size={20} color={colors.brand.purpleLight} />
                    <ThemedText style={styles.contactLabel}>Phone Number</ThemedText>
                  </View>
                  <Pressable
                    style={[
                      styles.contactValueContainer,
                      copiedField === 'phone' && styles.contactValueContainerCopied,
                    ]}
                    onPress={() => handleCopy(phone, 'phone')}

                    accessibilityLabel={`Phone number: ${phone}. Double tap to copy`}
                    accessibilityRole="button"
                  >
                    <ThemedText style={styles.contactValue}>{phone}</ThemedText>
                    {copiedField === 'phone' ? (
                      <View style={styles.copiedBadge}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.successScale[400]} />
                        <Text style={styles.copiedText}>Copied</Text>
                      </View>
                    ) : (
                      <Ionicons name="copy-outline" size={18} color={colors.neutral[500]} />
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.actionButton}
                    onPress={handleCall}

                    accessibilityLabel="Call this number"
                    accessibilityRole="button"
                  >
                    <Ionicons name="call" size={18} color={colors.background.primary} />
                    <Text style={styles.actionButtonText}>Call Now</Text>
                  </Pressable>
                </View>
              )}

              {/* Email */}
              {email && (
                <View style={[styles.contactItem, !phone && styles.contactItemFirst]}>
                  <View style={styles.contactHeader}>
                    <Ionicons name="mail" size={20} color={colors.brand.purpleLight} />
                    <ThemedText style={styles.contactLabel}>Email Address</ThemedText>
                  </View>
                  <Pressable
                    style={[
                      styles.contactValueContainer,
                      copiedField === 'email' && styles.contactValueContainerCopied,
                    ]}
                    onPress={() => handleCopy(email, 'email')}

                    accessibilityLabel={`Email address: ${email}. Double tap to copy`}
                    accessibilityRole="button"
                  >
                    <ThemedText style={styles.contactValue}>{email}</ThemedText>
                    {copiedField === 'email' ? (
                      <View style={styles.copiedBadge}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.successScale[400]} />
                        <Text style={styles.copiedText}>Copied</Text>
                      </View>
                    ) : (
                      <Ionicons name="copy-outline" size={18} color={colors.neutral[500]} />
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.actionButton}
                    onPress={handleEmail}

                    accessibilityLabel="Send email"
                    accessibilityRole="button"
                  >
                    <Ionicons name="mail" size={18} color={colors.background.primary} />
                    <Text style={styles.actionButtonText}>Send Email</Text>
                  </Pressable>
                </View>
              )}

              {/* No contact info message */}
              {!phone && !email && (
                <View style={styles.emptyState}>
                  <Ionicons name="information-circle-outline" size={48} color={colors.neutral[400]} />
                  <ThemedText style={styles.emptyStateText}>
                    Contact information is not available
                  </ThemedText>
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  gradient: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  contactItem: {
    marginBottom: 24,
  },
  contactItemFirst: {
    marginTop: 0,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    minHeight: 56,
  },
  contactValueContainerCopied: {
    borderColor: colors.success,
    backgroundColor: colors.successScale[50],
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    flex: 1,
    marginRight: 12,
  },
  copiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  copiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.white,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.white,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 16,
  },
});

export default React.memo(ContactModal);
