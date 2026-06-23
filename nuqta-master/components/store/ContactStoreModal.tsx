// Contact Store Modal
// Provides multiple options to contact a store

import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  Linking,
  ScrollView,
  Platform} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { PROFILE_COLORS } from '@/types/profile.types';
import { QUICK_MESSAGE_TEMPLATES } from '@/types/messaging.types';
import { useRouter } from 'expo-router';
import storeMessagingService from '@/services/storeMessagingApi';
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ContactStoreModalProps {
  visible: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  storePhone?: string;
  storeEmail?: string;
  orderId?: string;
  orderNumber?: string;
}

function ContactStoreModal({
  visible,
  onClose,
  storeId,
  storeName,
  storePhone,
  storeEmail,
  orderId,
  orderNumber,
}: ContactStoreModalProps) {
  const router = useRouter();
  const [isStoreOnline, setIsStoreOnline] = useState(false);
  const [responseTime, setResponseTime] = useState('Usually replies in a few hours');
  const [loading, setLoading] = useState(false);
  const isMounted = useIsMounted();

  // Load store availability
  useEffect(() => {
    if (visible && storeId) {
      loadStoreAvailability();
    }
  }, [visible, storeId]);

  const loadStoreAvailability = async () => {
    try {
      const response = await storeMessagingService.getStoreAvailability(storeId);
      if (response.success && response.data) {
        if (!isMounted()) return;
        setIsStoreOnline(response.data.isOnline && response.data.isOpen);
        if (response.data.averageResponseTime) {
          const minutes = response.data.averageResponseTime;
          if (minutes < 5) {
            if (!isMounted()) return;
            setResponseTime('Usually replies instantly');
          } else if (minutes < 30) {
            setResponseTime(`Usually replies in ${minutes} minutes`);
          } else if (minutes < 120) {
            setResponseTime(`Usually replies in ${Math.floor(minutes / 60)} hour`);
          } else {
            setResponseTime('Usually replies in a few hours');
          }
        }
      }
    } catch (error) {
      // silently handle
    }
  };

  // Open chat with store
  const handleOpenChat = async (template?: typeof QUICK_MESSAGE_TEMPLATES[0]) => {
    setLoading(true);
    try {
      // Create or get conversation
      const response = await storeMessagingService.getOrCreateConversation(storeId, orderId);

      if (response.success && response.data) {
        onClose();

        // Navigate to chat screen with optional template
        const params: any = {
          conversationId: response.data.id,
          storeId,
          storeName,
        };

        if (template && orderNumber) {
          // Pre-fill message with template
          params.prefilledMessage = template.content.replace('{orderNumber}', orderNumber);
        }

        router.push({
          pathname: '/store/[id]/chat' as any,
          params: {
            id: storeId,
            ...params,
          },
        });
      } else {
        platformAlertSimple('Error', 'Failed to start conversation. Please try again.');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to start conversation. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  // Make phone call
  const handleCall = () => {
    if (!storePhone) {
      platformAlertSimple('Phone number not available', 'This store has not provided a phone number.');
      return;
    }

    const phoneUrl = `tel:${storePhone}`;
    Linking.canOpenURL(phoneUrl).then((supported) => {
      if (supported) {
        Linking.openURL(phoneUrl).catch(() => {});
      } else {
        platformAlertSimple('Error', 'Unable to make phone calls on this device');
      }
    }).catch(() => {});
  };

  // Open WhatsApp
  const handleWhatsApp = () => {
    if (!storePhone) {
      platformAlertSimple('Phone number not available', 'This store has not provided a WhatsApp number.');
      return;
    }

    // Remove all non-digit characters from phone number
    const cleanPhone = storePhone.replace(/\D/g, '');
    const message = orderNumber
      ? `Hi, I have a question about my order #${orderNumber}`
      : `Hi, I have a question about your store`;

    const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(whatsappUrl).then((supported) => {
      if (supported) {
        Linking.openURL(whatsappUrl).catch(() => {});
      } else {
        platformAlertSimple('WhatsApp not installed', 'Please install WhatsApp to use this feature');
      }
    }).catch(() => {});
  };

  // Send email
  const handleEmail = () => {
    if (!storeEmail) {
      platformAlertSimple('Email not available', 'This store has not provided an email address.');
      return;
    }

    const subject = orderNumber
      ? `Question about Order #${orderNumber}`
      : 'Customer Inquiry';
    const emailUrl = `mailto:${storeEmail}?subject=${encodeURIComponent(subject)}`;

    try { Linking.openURL(emailUrl); } catch (e) { catchAndWarn(e, 'ContactStoreModal/openURL'); }
  };

  // Render contact option
  const renderContactOption = (
    icon: string,
    title: string,
    description: string,
    onPress: () => void,
    color: string = PROFILE_COLORS.primary,
    disabled: boolean = false
  ) => (
    <Pressable
      style={[styles.contactOption, disabled && styles.contactOptionDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <View style={[styles.contactIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.contactOptionContent}>
        <ThemedText style={styles.contactOptionTitle}>{title}</ThemedText>
        <ThemedText style={styles.contactOptionDescription}>{description}</ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </Pressable>
  );

  // Render quick action template
  const renderQuickAction = (template: typeof QUICK_MESSAGE_TEMPLATES[0]) => (
    <Pressable
      key={template.id}
      style={styles.quickAction}
      onPress={() => handleOpenChat(template)}
      disabled={loading}
    >
      <Ionicons name={template.icon as any} size={20} color={PROFILE_COLORS.primary} />
      <ThemedText style={styles.quickActionText}>{template.title}</ThemedText>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.modalBackdrop}
         
          onPress={onClose}
        />

        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <ThemedText style={styles.modalTitle}>Contact {storeName}</ThemedText>
              <View style={styles.storeStatus}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: isStoreOnline ? PROFILE_COLORS.success : '#999' }
                ]} />
                <ThemedText style={styles.statusText}>
                  {isStoreOnline ? 'Online' : 'Offline'} • {responseTime}
                </ThemedText>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.darkGray} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Quick Actions (for orders) */}
            {orderId && orderNumber && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>
                <View style={styles.quickActionsContainer}>
                  {QUICK_MESSAGE_TEMPLATES
                    .filter(t => t.category === 'order_status' || t.category === 'delivery')
                    .map(renderQuickAction)}
                </View>
              </View>
            )}

            {/* Contact Methods */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Contact Methods</ThemedText>

              {renderContactOption(
                'chatbubble-ellipses',
                'Chat with Store',
                isStoreOnline
                  ? 'Get instant replies from the store'
                  : 'Send a message and get a reply soon',
                () => handleOpenChat(),
                PROFILE_COLORS.primary
              )}

              {storePhone && renderContactOption(
                'call',
                'Call Store',
                `Call ${storePhone}`,
                handleCall,
                PROFILE_COLORS.success
              )}

              {storePhone && renderContactOption(
                'logo-whatsapp',
                'WhatsApp',
                'Chat on WhatsApp',
                handleWhatsApp,
                '#25D366'
              )}

              {storeEmail && renderContactOption(
                'mail',
                'Email',
                `Send email to ${storeEmail}`,
                handleEmail,
                colors.info
              )}
            </View>

            {/* General Quick Actions */}
            {!orderId && (
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Common Questions</ThemedText>
                <View style={styles.quickActionsContainer}>
                  {QUICK_MESSAGE_TEMPLATES
                    .filter(t => t.category === 'general')
                    .map(renderQuickAction)}
                </View>
              </View>
            )}

            {/* Help Text */}
            <View style={styles.helpTextContainer}>
              <Ionicons name="information-circle-outline" size={16} color={colors.midGray} />
              <ThemedText style={styles.helpText}>
                Your conversation history will be saved so you can reference it later
              </ThemedText>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 4,
  },
  storeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.midGray,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 600,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.midGray,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.offWhite,
    borderRadius: 12,
    marginBottom: 12,
  },
  contactOptionDisabled: {
    opacity: 0.5,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactOptionContent: {
    flex: 1,
  },
  contactOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 2,
  },
  contactOptionDescription: {
    fontSize: 13,
    color: colors.midGray,
  },
  quickActionsContainer: {
    gap: 8,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.darkGray,
    marginLeft: 12,
  },
  helpTextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: colors.offWhite,
    margin: 20,
    borderRadius: 8,
  },
  helpText: {
    fontSize: 12,
    color: colors.midGray,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default React.memo(ContactStoreModal);
