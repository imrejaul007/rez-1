// @ts-nocheck
// components/voucher/OnlineRedemptionModal.tsx - Online voucher redemption modal

import React, { useState,  useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Platform} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming } from 'react-native-reanimated';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { ThemedText } from '@/components/ThemedText';
import logger from '@/utils/logger';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface Brand {
  name: string;
  logo: string;
  backgroundColor?: string;
  logoColor?: string;
  websiteUrl?: string;
}

interface UserVoucher {
  _id: string;
  voucherCode: string;
  denomination: number;
  expiryDate: string;
  brand: Brand;
}

interface OnlineRedemptionModalProps {
  visible: boolean;
  voucher: UserVoucher | null;
  onClose: () => void;
  onMarkAsUsed: (voucherId: string) => Promise<void>;
}

/**
 * OnlineRedemptionModal Component
 *
 * Modal for redeeming vouchers online
 * Shows voucher code with copy functionality and redemption instructions
 *
 * @example
 * <OnlineRedemptionModal
 *   visible={showModal}
 *   voucher={selectedVoucher}
 *   onClose={() => setShowModal(false)}
 *   onMarkAsUsed={handleMarkAsUsed}
 * />
 */
export const OnlineRedemptionModal: React.FC<OnlineRedemptionModalProps> = ({
  visible,
  voucher,
  onClose,
  onMarkAsUsed }) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [copySuccess, setCopySuccess] = useState(false);
  const [marking, setMarking] = useState(false);
  const isMounted = useIsMounted();

  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const fadeSlideStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value, transform: [{ translateY: slideAnim.value }] }));

  useEffect(() => {
    if (visible) {
      animateIn();
    } else {
      animateOut();
    }
  }, [visible]);

  const animateIn = () => {
    fadeAnim.value = withTiming(1, { duration: 300 });
    slideAnim.value = withSpring(0, { tension: 50, friction: 7 });
  };

  const animateOut = () => {
    fadeAnim.value = withTiming(0, { duration: 200 });
    slideAnim.value = withTiming(50, { duration: 200 });
  };

  const handleCopy = async () => {
    if (!voucher) return;

    try {
      if (!isMounted()) return;
      await Clipboard.setStringAsync(voucher.voucherCode);
      setCopySuccess(true);

      // Show toast-like feedback
      platformAlertSimple('Copied!', `Voucher code "${voucher.voucherCode}" copied to clipboard`);

      // Reset copy success indicator after 3 seconds
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (error) {
      logger.error('Failed to copy:', error);
      platformAlertSimple('Error', 'Failed to copy code to clipboard');
    }
  };

  const handleOpenWebsite = async () => {
    if (!voucher?.brand.websiteUrl) {
      platformAlertSimple('Website Not Available', 'Website URL not available for this brand');
      return;
    }

    try {
      const url = voucher.brand.websiteUrl.startsWith('http')
        ? voucher.brand.websiteUrl
        : `https://${voucher.brand.websiteUrl}`;

      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        platformAlertSimple('Error', `Cannot open URL: ${url}`);
      }
    } catch (error) {
      logger.error('Failed to open URL:', error);
      platformAlertSimple('Error', 'Failed to open website');
    }
  };

  const handleMarkAsUsed = () => {
    if (!voucher) return;

    platformAlertDestructive(
      'Confirm Redemption',
      `Have you successfully redeemed this ${currencySymbol}${voucher.denomination} voucher?\n\nThis action cannot be undone.`,
      async () => {
        setMarking(true);
        try {
          await onMarkAsUsed(voucher._id);
          onClose();
          platformAlertSimple('Success', 'Voucher marked as used successfully');
        } catch (error) {
          logger.error('Failed to mark as used:', error);
          platformAlertSimple('Error', 'Failed to mark voucher as used');
        } finally {
          if (!isMounted()) return;
          setMarking(false);
        }
      },
      'Yes, Mark as Used'
    );
  };

  if (!voucher) return null;

  const expiryDate = new Date(voucher.expiryDate);
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.backdrop}
         
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <LinearGradient
            colors={['#9333EA', colors.brand.purple]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Ionicons name="ticket" size={24} color="white" />
                <ThemedText style={styles.headerTitle}>Redeem Voucher</ThemedText>
              </View>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="white" />
              </Pressable>
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Brand Info */}
            <View style={styles.brandSection}>
              <LinearGradient
                colors={[
                  voucher.brand.backgroundColor || colors.neutral[100],
                  (voucher.brand.backgroundColor || colors.neutral[100]) + 'DD',
                ]}
                style={[
                  styles.brandLogo,
                  { backgroundColor: voucher.brand.backgroundColor || colors.neutral[100] },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <ThemedText
                  style={[
                    styles.brandLogoText,
                    { color: voucher.brand.logoColor || colors.text.primary },
                  ]}
                >
                  {voucher.brand.logo}
                </ThemedText>
              </LinearGradient>
              <ThemedText style={styles.brandName}>{voucher.brand.name}</ThemedText>
              <ThemedText style={styles.denominationText}>
                {currencySymbol}{voucher.denomination}
              </ThemedText>
            </View>

            {/* Voucher Code */}
            <View style={styles.codeSection}>
              <ThemedText style={styles.sectionLabel}>Voucher Code</ThemedText>
              <View style={styles.codeCard}>
                <ThemedText style={styles.codeText} selectable>
                  {voucher.voucherCode}
                </ThemedText>
              </View>

              <Pressable
                style={styles.copyButton}
                onPress={handleCopy}
               
              >
                <LinearGradient
                  colors={copySuccess ? [colors.lightMustard, colors.nileBlue] : [colors.infoScale[400], colors.brand.blue]}
                  style={styles.copyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name={copySuccess ? 'checkmark-circle' : 'copy-outline'}
                    size={20}
                    color="white"
                  />
                  <ThemedText style={styles.copyButtonText}>
                    {copySuccess ? 'Copied!' : 'Copy Code'}
                  </ThemedText>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Redemption Instructions */}
            <View style={styles.instructionsSection}>
              <ThemedText style={styles.sectionLabel}>How to Redeem</ThemedText>
              <View style={styles.instructionsList}>
                <InstructionStep
                  number={1}
                  text="Copy the voucher code using the button above"
                />
                <InstructionStep
                  number={2}
                  text={`Visit ${voucher.brand.name} website and add items to cart`}
                />
                <InstructionStep
                  number={3}
                  text="Proceed to checkout and look for 'Apply Coupon' or 'Promo Code' section"
                />
                <InstructionStep
                  number={4}
                  text="Paste the voucher code and apply"
                />
                <InstructionStep
                  number={5}
                  text="Discount will be automatically deducted from your total"
                />
                <InstructionStep
                  number={6}
                  text="Complete your purchase and come back to mark this voucher as used"
                />
              </View>
            </View>

            {/* Expiry Warning */}
            {daysUntilExpiry <= 7 && (
              <View style={styles.expiryWarning}>
                <Ionicons name="time" size={20} color={colors.warningScale[400]} />
                <ThemedText style={styles.expiryText}>
                  {daysUntilExpiry <= 0
                    ? 'Expired'
                    : `Expires in ${daysUntilExpiry} ${
                        daysUntilExpiry === 1 ? 'day' : 'days'
                      }`}
                </ThemedText>
              </View>
            )}

            {/* Terms */}
            <View style={styles.termsSection}>
              <ThemedText style={styles.termsTitle}>Important Notes:</ThemedText>
              <ThemedText style={styles.termsText}>
                • This voucher can only be used once
              </ThemedText>
              <ThemedText style={styles.termsText}>
                • Cannot be combined with other offers (unless specified)
              </ThemedText>
              <ThemedText style={styles.termsText}>
                • Valid until {expiryDate.toLocaleDateString()}
              </ThemedText>
              <ThemedText style={styles.termsText}>
                • Non-refundable and cannot be exchanged for cash
              </ThemedText>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {voucher.brand.websiteUrl && (
              <Pressable
                style={styles.websiteButton}
                onPress={handleOpenWebsite}
               
              >
                <LinearGradient
                  colors={[colors.infoScale[400], colors.brand.blue]}
                  style={styles.websiteButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="open-outline" size={20} color="white" />
                  <ThemedText style={styles.websiteButtonText}>
                    Open {voucher.brand.name}
                  </ThemedText>
                </LinearGradient>
              </Pressable>
            )}

            <Pressable
              style={[styles.markUsedButton, marking && styles.buttonDisabled]}
              onPress={handleMarkAsUsed}
              disabled={marking}
             
            >
              <LinearGradient
                colors={[colors.error, colors.error]}
                style={styles.markUsedButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <ThemedText style={styles.markUsedButtonText}>
                  {marking ? 'Marking...' : 'Mark as Used'}
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Helper component for instruction steps
const InstructionStep: React.FC<{ number: number; text: string }> = ({
  number,
  text }) => (
  <View style={styles.instructionStep}>
    <View style={styles.stepNumber}>
      <ThemedText style={styles.stepNumberText}>{number}</ThemedText>
    </View>
    <ThemedText style={styles.stepText}>{text}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0 },
  modalContent: {
    width: width - 40,
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20 },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white' },
  closeButton: {
    padding: 4 },
  scrollView: {
    maxHeight: 500 },
  brandSection: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100] },
  brandLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12 },
  brandLogoText: {
    fontSize: 40 },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4 },
  denominationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9333EA' },
  codeSection: {
    padding: 20 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
    marginBottom: 12 },
  codeCard: {
    backgroundColor: colors.neutral[100],
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed' },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    letterSpacing: 2 },
  copyButton: {
    borderRadius: 12,
    overflow: 'hidden' },
  copyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8 },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white' },
  instructionsSection: {
    padding: 20,
    paddingTop: 0 },
  instructionsList: {
    gap: 16 },
  instructionStep: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start' },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center' },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white' },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[700],
    lineHeight: 20,
    paddingTop: 4 },
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amberLight,
    margin: 20,
    marginTop: 0,
    padding: 12,
    borderRadius: 12,
    gap: 8 },
  expiryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warningScale[400] },
  termsSection: {
    backgroundColor: colors.neutral[50],
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    gap: 8 },
  termsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8 },
  termsText: {
    fontSize: 13,
    color: colors.neutral[500],
    lineHeight: 18 },
  footer: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100] },
  websiteButton: {
    borderRadius: 12,
    overflow: 'hidden' },
  websiteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8 },
  websiteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white' },
  markUsedButton: {
    borderRadius: 12,
    overflow: 'hidden' },
  markUsedButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8 },
  markUsedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white' },
  buttonDisabled: {
    opacity: 0.5 } });

export default React.memo(OnlineRedemptionModal);
