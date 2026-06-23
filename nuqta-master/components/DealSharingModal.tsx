import React, { useState, useEffect} from 'react';
import {
  View,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  ScrollView,
  Share,
  Clipboard} from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { platformAlertSimple } from '@/utils/platformAlert';
import { CrossPlatformBlurView as BlurView } from '@/components/ui/CrossPlatformBlurView';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Deal } from '@/types/deals';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface DealSharingModalProps {
  visible: boolean;
  onClose: () => void;
  deal: Deal | null;
  storeName?: string;
}

interface SharingOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  action: (deal: Deal, storeName: string) => void;
}

function DealSharingModal({
  visible,
  onClose,
  deal,
  storeName = 'Store',
}: DealSharingModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [copyFeedback, setCopyFeedback] = useState(false);
  const isMounted = useIsMounted();
  
  const slideAnim = useSharedValue(screenData.height);
  const fadeAnim = useSharedValue(0);
  const feedbackAnim = useSharedValue(0);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
      slideAnim.value = window.height;
    });

    return () => subscription?.remove();
  }, [slideAnim]);

  const styles = createStyles(screenData);

  useEffect(() => {
    let _anim: any;
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 200 });
      slideAnim.value = withSpring(0);
      
    } else {
      fadeAnim.value = withTiming(0, { duration: 150 });
      slideAnim.value = withTiming(screenData.height, { duration: 200 });
      
    }
  
    }, [visible, fadeAnim, slideAnim]);

  // Copy feedback animation
  useEffect(() => {
    if (copyFeedback) {
      feedbackAnim.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1500, withTiming(0, { duration: 200 }, (finished) => {
          if (finished) {
            runOnJS(setCopyFeedback)(false);
          }
        }))
      );
    }
  }, [copyFeedback, feedbackAnim]);

  const handleBackdropPress = () => {
    onClose();
  };

  const handleModalPress = (event: any) => {
    event.stopPropagation();
  };

  // Generate shareable content
  const generateShareContent = (deal: Deal, storeName: string) => {
    const expiryDate = deal.validUntil.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const message = `🎉 Amazing Deal Alert! 🎉

${deal.title}
💰 Save ${deal.discountValue}%
🏪 At ${storeName}
💳 Minimum bill: ${currencySymbol}${deal.minimumBill.toLocaleString()}
⏰ Valid until: ${expiryDate}

${deal.description || 'Don\'t miss out on this incredible offer!'}

#Deals #Savings #${storeName.replace(/\s+/g, '')}`;

    const url = `https://store.app/deals/${deal.id}`;
    
    return { message, url };
  };

  // Sharing options
  const sharingOptions: SharingOption[] = [
    {
      id: 'native',
      name: 'Share',
      icon: 'share-outline',
      color: colors.brand.purpleLight,
      action: async (deal: Deal, storeName: string) => {
        try {
          const { message, url } = generateShareContent(deal, storeName);
          await Share.share({
            message: `${message}\n\n${url}`,
            url,
            title: deal.title,
          });
        } catch (error) {
          platformAlertSimple('Error', 'Failed to share deal. Please try again.');
        }
      },
    },
    {
      id: 'copy',
      name: 'Copy Link',
      icon: 'copy-outline',
      color: colors.lightMustard,
      action: async (deal: Deal, storeName: string) => {
        try {
          const { message, url } = generateShareContent(deal, storeName);
          const shareText = `${message}\n\n${url}`;
          if (!isMounted()) return;
          await Clipboard.setString(shareText);
          setCopyFeedback(true);
        } catch (error) {
          platformAlertSimple('Error', 'Failed to copy link. Please try again.');
        }
      },
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'logo-whatsapp',
      color: '#25D366',
      action: async (deal: Deal, storeName: string) => {
        try {
          const { message } = generateShareContent(deal, storeName);
          // In a real app, you might use a WhatsApp URL scheme or external app
          await Share.share({
            message,
            title: `Share ${deal.title} on WhatsApp`,
          });
        } catch (error) {
          platformAlertSimple('Error', 'Failed to share to WhatsApp. Please try again.');
        }
      },
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: 'chatbubble-outline',
      color: colors.infoScale[400],
      action: async (deal: Deal, storeName: string) => {
        try {
          const { message } = generateShareContent(deal, storeName);
          // In a real app, you might use SMS URL scheme
          await Share.share({
            message,
            title: `Share ${deal.title} via SMS`,
          });
        } catch (error) {
          platformAlertSimple('Error', 'Failed to share via SMS. Please try again.');
        }
      },
    },
  ];

  if (!deal) return null;

  const handleShareOption = (option: SharingOption) => {
    option.action(deal, storeName);
    if (option.id !== 'copy') {
      onClose();
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
      accessibilityLabel="Share deal dialog"
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <Animated.View style={[styles.blurContainer, { opacity: fadeAnim }]}>
            <BlurView intensity={50} style={styles.blur} />
          </Animated.View>

          <TouchableWithoutFeedback onPress={handleModalPress}>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.modal}>
                {/* Header */}
                <View style={styles.header}>
                  <Pressable
                    style={styles.closeButton}
                    onPress={onClose}
                    accessibilityLabel="Close share dialog"
                    accessibilityRole="button"
                    accessibilityHint="Double tap to close this dialog"
                  >
                    <Ionicons name="close" size={20} color="#555" />
                  </Pressable>
                  
                  <ThemedText style={styles.title}>Share Deal</ThemedText>
                  <ThemedText style={styles.subtitle}>Spread the savings with friends!</ThemedText>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
                  {/* Deal Preview */}
                  <View style={styles.dealPreview}>
                    <View style={styles.dealBadge}>
                      <ThemedText style={styles.dealBadgeText}>
                        {deal.badge?.text || `Save ${deal.discountValue}%`}
                      </ThemedText>
                    </View>
                    
                    <ThemedText style={styles.dealTitle}>{deal.title}</ThemedText>
                    
                    {deal.description && (
                      <ThemedText style={styles.dealDescription}>{deal.description}</ThemedText>
                    )}
                    
                    <View style={styles.dealDetails}>
                      <View style={styles.dealDetailRow}>
                        <Ionicons name="storefront-outline" size={16} color={colors.brand.purpleLight} />
                        <ThemedText style={styles.dealDetailText}>Available at {storeName}</ThemedText>
                      </View>
                      
                      <View style={styles.dealDetailRow}>
                        <Ionicons name="wallet-outline" size={16} color={colors.brand.purpleLight} />
                        <ThemedText style={styles.dealDetailText}>
                          Minimum bill: {currencySymbol}{deal.minimumBill.toLocaleString()}
                        </ThemedText>
                      </View>
                      
                      <View style={styles.dealDetailRow}>
                        <Ionicons name="time-outline" size={16} color={colors.brand.purpleLight} />
                        <ThemedText style={styles.dealDetailText}>
                          Valid until: {deal.validUntil.toLocaleDateString('en-IN')}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Sharing Options */}
                  <View style={styles.sharingSection}>
                    <ThemedText style={styles.sectionTitle}>Choose how to share</ThemedText>
                    
                    <View style={styles.sharingGrid}>
                      {sharingOptions.map((option) => (
                        <Pressable
                          key={option.id}
                          style={styles.sharingOption}
                          onPress={() => handleShareOption(option)}
                          accessibilityLabel={`Share via ${option.name}`}
                          accessibilityRole="button"
                          accessibilityHint={`Double tap to share this deal using ${option.name}`}
                        >
                          <View style={[styles.sharingIcon, { backgroundColor: option.color }]}>
                            <Ionicons name={option.icon as any} size={24} color={colors.background.primary} />
                          </View>
                          <ThemedText style={styles.sharingLabel}>{option.name}</ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Share Benefits */}
                  <View style={styles.benefitsSection}>
                    <ThemedText style={styles.sectionTitle}>Why share deals?</ThemedText>
                    
                    <View style={styles.benefitItem}>
                      <Ionicons name="people-outline" size={20} color={colors.lightMustard} />
                      <View style={styles.benefitContent}>
                        <ThemedText style={styles.benefitTitle}>Help friends save</ThemedText>
                        <ThemedText style={styles.benefitDescription}>
                          Share amazing deals with your friends and family
                        </ThemedText>
                      </View>
                    </View>
                    
                    <View style={styles.benefitItem}>
                      <Ionicons name="gift-outline" size={20} color={colors.warningScale[400]} />
                      <View style={styles.benefitContent}>
                        <ThemedText style={styles.benefitTitle}>Earn rewards</ThemedText>
                        <ThemedText style={styles.benefitDescription}>
                          Get bonus points when friends use your shared deals
                        </ThemedText>
                      </View>
                    </View>
                    
                    <View style={styles.benefitItem}>
                      <Ionicons name="trending-up-outline" size={20} color={colors.brand.purpleLight} />
                      <View style={styles.benefitContent}>
                        <ThemedText style={styles.benefitTitle}>Unlock more deals</ThemedText>
                        <ThemedText style={styles.benefitDescription}>
                          Active sharers get access to exclusive offers
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>

          {/* Copy Feedback */}
          <Animated.View 
            style={[
              styles.copyFeedback,
              {
                opacity: feedbackAnim,
                transform: [{
                  translateY: interpolate(feedbackAnim.value, [0, 1], [100, 0]),
                }],
                pointerEvents: 'none',
              }
            ]}
          >
            <View style={styles.feedbackContent}>
              <Ionicons name="checkmark-circle" size={20} color={colors.lightMustard} />
              <ThemedText style={styles.feedbackText}>Deal link copied!</ThemedText>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
);
}

const createStyles = (screenData: { width: number; height: number }) => {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    blurContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    blur: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    modal: {
      backgroundColor: colors.background.primary,
      borderRadius: 20,
      width: '100%',
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 6,
    },
    header: {
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.tint.slate,
      position: 'relative',
    },
    closeButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: '#f2f2f2',
      borderRadius: 20,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.neutral[900],
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.neutral[500],
    },
    content: {
      flex: 1,
      padding: 20,
    },
    dealPreview: {
      backgroundColor: colors.tint.coolGray,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      position: 'relative',
    },
    dealBadge: {
      position: 'absolute',
      top: 16,
      right: 16,
      backgroundColor: colors.brand.purpleLight,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    dealBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.background.primary,
    },
    dealTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.neutral[900],
      marginBottom: 8,
      paddingRight: 80,
    },
    dealDescription: {
      fontSize: 14,
      color: colors.neutral[500],
      lineHeight: 20,
      marginBottom: 16,
    },
    dealDetails: {
      gap: 8,
    },
    dealDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dealDetailText: {
      fontSize: 13,
      color: colors.neutral[700],
      marginLeft: 8,
    },
    sharingSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.neutral[700],
      marginBottom: 16,
    },
    sharingGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 16,
    },
    sharingOption: {
      alignItems: 'center',
      width: '22%',
      minWidth: 70,
    },
    sharingIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    sharingLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.neutral[700],
      textAlign: 'center',
    },
    benefitsSection: {
      marginBottom: 20,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    benefitContent: {
      flex: 1,
      marginLeft: 12,
    },
    benefitTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.neutral[700],
      marginBottom: 2,
    },
    benefitDescription: {
      fontSize: 12,
      color: colors.neutral[500],
      lineHeight: 16,
    },
    copyFeedback: {
      position: 'absolute',
      bottom: 100,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    feedbackContent: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#065F46',
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    feedbackText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background.primary,
      marginLeft: 8,
    },
  });
};

export default React.memo(DealSharingModal);
