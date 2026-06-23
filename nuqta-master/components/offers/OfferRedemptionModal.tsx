// @ts-nocheck
/**
 * OfferRedemptionModal Component
 *
 * Modal for redeeming offers from the offers page
 * Shows promo code with copy functionality and redemption instructions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { ThemedText } from '@/components/ThemedText';
import { LightningDeal } from '@/types/offers.types';
import realOffersApi from '@/services/realOffersApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface OfferForModal {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  store?: {
    id?: string;
    name: string;
    logo?: string;
  };
  storeName?: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  totalQuantity?: number;
  claimedQuantity?: number;
  total?: number;
  claimed?: number;
  endTime?: string;
  promoCode?: string;
}

interface OfferRedemptionModalProps {
  visible: boolean;
  offer: OfferForModal | LightningDeal | null;
  onClose: () => void;
  onRedeemed?: (offerId: string) => void;
}

export const OfferRedemptionModal: React.FC<OfferRedemptionModalProps> = ({
  visible,
  offer,
  onClose,
  onRedeemed,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redemptionCode, setRedemptionCode] = useState<string | null>(null);
  const isMounted = useIsMounted();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);

  useEffect(() => {
    if (visible) {
      animateIn();
      // Reset state when modal opens
      setCopySuccess(false);
      setRedemptionCode(null);
    } else {
      animateOut();
    }
  }, [visible]);

  const animateIn = () => {
    fadeAnim.value = withTiming(1, { duration: 300 });
    slideAnim.value = withSpring(0, { stiffness: 50, damping: 7 });
  };

  const animateOut = () => {
    fadeAnim.value = withTiming(0, { duration: 200 });
    slideAnim.value = withTiming(50, { duration: 200 });
  };

  const handleCopy = async () => {
    const codeToCopy = redemptionCode || offer?.promoCode;
    if (!codeToCopy) return;

    try {
      if (!isMounted()) return;
      await Clipboard.setStringAsync(codeToCopy);
      setCopySuccess(true);

      platformAlertSimple('Copied!', `Promo code "${codeToCopy}" copied to clipboard`);

      setTimeout(() => setCopySuccess(false), 3000);
    } catch (error) {
      platformAlertSimple('Error', 'Failed to copy code to clipboard');
    }
  };

  const handleRedeem = async () => {
    if (!offer) return;

    setRedeeming(true);
    try {
      // Call the real API to redeem the offer
      const response = await realOffersApi.redeemOffer(offer.id, 'online');

      if (response.success && response.data) {
        const { voucher } = response.data;
        if (!isMounted()) return;
        setRedemptionCode(voucher.voucherCode || offer.promoCode);

        platformAlertSimple(
          'Offer Redeemed!',
          `Your promo code is: ${voucher.voucherCode || offer.promoCode}\n\nCashback: ${currencySymbol}${voucher.cashbackAmount || offer.discountedPrice}`
        );

        if (onRedeemed) {
          onRedeemed(offer.id);
        }
      } else {
        // If API fails, still show the promo code if available
        if (offer.promoCode) {
          if (!isMounted()) return;
          setRedemptionCode(offer.promoCode);
        } else {
          platformAlertSimple('Error', 'Failed to redeem offer. Please try again.');
        }
      }
    } catch (error) {
      // Fallback to showing existing promo code
      if (offer.promoCode) {
        if (!isMounted()) return;
        setRedemptionCode(offer.promoCode);
        platformAlertSimple('Promo Code', `Use code: ${offer.promoCode}`);
      } else {
        platformAlertSimple('Error', 'Failed to redeem offer. Please try again.');
      }
    } finally {
      if (!isMounted()) return;
      setRedeeming(false);
    }
  };

  if (!offer) return null;

  // Handle both field name formats
  const storeName = (offer as any).store?.name || (offer as any).storeName || 'Store';
  const total = (offer as any).totalQuantity || (offer as any).total || 100;
  const claimed = (offer as any).claimedQuantity || (offer as any).claimed || 0;
  const subtitle = (offer as any).subtitle || (offer as any).description || '';

  const promoCode = redemptionCode || offer.promoCode;
  const progress = total > 0 ? (claimed / total) * 100 : 0;
  const remaining = total - claimed;

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!offer.endTime) return 'Limited time';
    const end = new Date(offer.endTime).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

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
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <LinearGradient
            colors={[colors.warningScale[400], colors.warningScale[700]]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Ionicons name="flash" size={24} color="white" />
                <ThemedText style={styles.headerTitle}>Lightning Deal</ThemedText>
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
            {/* Offer Image */}
            {offer.image && (
              <CachedImage
                source={offer.image}
                style={styles.offerImage}
                contentFit="cover"
              />
            )}

            {/* Offer Info */}
            <View style={styles.offerSection}>
              <ThemedText style={styles.storeName}>{storeName}</ThemedText>
              <ThemedText style={styles.offerTitle}>{offer.title}</ThemedText>
              {subtitle && (
                <ThemedText style={styles.offerDescription}>
                  {subtitle}
                </ThemedText>
              )}

              {/* Price */}
              <View style={styles.priceRow}>
                <ThemedText style={styles.discountedPrice}>
                  {currencySymbol}{offer.discountedPrice}
                </ThemedText>
                <ThemedText style={styles.originalPrice}>
                  {currencySymbol}{offer.originalPrice}
                </ThemedText>
                <View style={styles.discountBadge}>
                  <ThemedText style={styles.discountText}>
                    {offer.discountPercentage}% OFF
                  </ThemedText>
                </View>
              </View>

              {/* Stock Progress */}
              <View style={styles.stockSection}>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%` }]} />
                </View>
                <View style={styles.stockInfo}>
                  <ThemedText style={styles.stockText}>
                    {claimed}/{total} claimed
                  </ThemedText>
                  <ThemedText style={styles.timeRemaining}>
                    {getTimeRemaining()}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Promo Code Section */}
            {promoCode && (
              <View style={styles.codeSection}>
                <ThemedText style={styles.sectionLabel}>Promo Code</ThemedText>
                <View style={styles.codeCard}>
                  <ThemedText style={styles.codeText} selectable>
                    {promoCode}
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
            )}

            {/* Redemption Instructions */}
            <View style={styles.instructionsSection}>
              <ThemedText style={styles.sectionLabel}>How to Use</ThemedText>
              <View style={styles.instructionsList}>
                <InstructionStep
                  number={1}
                  text={promoCode ? "Copy the promo code above" : "Click 'Get Offer' to generate your code"}
                />
                <InstructionStep
                  number={2}
                  text={`Visit ${storeName} and add items to cart`}
                />
                <InstructionStep
                  number={3}
                  text="Apply the promo code at checkout"
                />
                <InstructionStep
                  number={4}
                  text="Enjoy your discount!"
                />
              </View>
            </View>

            {/* Terms */}
            <View style={styles.termsSection}>
              <ThemedText style={styles.termsTitle}>Terms & Conditions:</ThemedText>
              <ThemedText style={styles.termsText}>
                • Limited to {remaining} remaining claims
              </ThemedText>
              <ThemedText style={styles.termsText}>
                • {getTimeRemaining()}
              </ThemedText>
              <ThemedText style={styles.termsText}>
                • Cannot be combined with other offers
              </ThemedText>
              <ThemedText style={styles.termsText}>
                • One use per customer
              </ThemedText>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {!promoCode ? (
              <Pressable
                style={[styles.redeemButton, redeeming && styles.buttonDisabled]}
                onPress={handleRedeem}
                disabled={redeeming}
               
              >
                <LinearGradient
                  colors={[colors.warningScale[400], colors.warningScale[700]]}
                  style={styles.redeemButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="flash" size={20} color="white" />
                  <ThemedText style={styles.redeemButtonText}>
                    {redeeming ? 'Processing...' : 'Get Offer'}
                  </ThemedText>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable
                style={styles.doneButton}
                onPress={onClose}
               
              >
                <LinearGradient
                  colors={[colors.lightMustard, colors.nileBlue]}
                  style={styles.doneButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <ThemedText style={styles.doneButtonText}>Done</ThemedText>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Helper component for instruction steps
const InstructionStep: React.FC<{ number: number; text: string }> = ({
  number,
  text,
}) => (
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
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
    elevation: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: 500,
  },
  offerImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.neutral[100],
  },
  offerSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  storeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
    marginBottom: 4,
  },
  offerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  offerDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    lineHeight: 20,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  discountedPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.nileBlue,
  },
  originalPrice: {
    fontSize: 16,
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.errorScale[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  stockSection: {
    gap: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.warningScale[400],
    borderRadius: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  timeRemaining: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  codeSection: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
    marginBottom: 12,
  },
  codeCard: {
    backgroundColor: colors.tint.amberLight,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.warningScale[400],
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.brand.amberDark,
    letterSpacing: 2,
  },
  copyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  copyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  instructionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  instructionsList: {
    gap: 12,
  },
  instructionStep: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.warningScale[400],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[700],
    lineHeight: 20,
    paddingTop: 2,
  },
  termsSection: {
    backgroundColor: colors.neutral[50],
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    gap: 6,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  termsText: {
    fontSize: 12,
    color: colors.neutral[500],
    lineHeight: 16,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  redeemButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  redeemButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  redeemButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  doneButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  doneButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default React.memo(OfferRedemptionModal);
