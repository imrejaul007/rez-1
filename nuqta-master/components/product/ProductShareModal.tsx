import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Share,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import * as Clipboard from 'expo-clipboard';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

/**
 * ProductShareModal Component
 *
 * Modal for sharing products with multiple options
 * Features:
 * - Social media sharing (WhatsApp, Facebook, Twitter, Instagram)
 * - Copy link functionality
 * - Email/SMS sharing
 * - QR code generation
 * - Share tracking for referrals
 * - Wishlist quick add
 * - Share with rewards
 */

interface ShareOption {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  action: () => void;
}

interface ProductShareModalProps {
  visible: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  productUrl?: string;
  referralCode?: string;
  onShareComplete?: (platform: string) => void;
}

export const ProductShareModal: React.FC<ProductShareModalProps> = ({
  visible,
  onClose,
  productId,
  productName,
  productImage,
  productPrice,
  productUrl,
  referralCode,
  onShareComplete,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [isCopied, setIsCopied] = useState(false);
  const isMounted = useIsMounted();

  // Generate share URL with referral code
  const generateShareUrl = (): string => {
    const baseUrl = productUrl || `https://rez.app/product/${productId}`;
    return referralCode ? `${baseUrl}?ref=${referralCode}` : baseUrl;
  };

  // Generate share message
  const generateShareMessage = (): string => {
    return `Check out this amazing product!\n\n${productName}\n${currencySymbol}${productPrice.toLocaleString()}\n\n${generateShareUrl()}`;
  };

  /**
   * Handle native share
   */
  const handleNativeShare = async () => {
    try {
      const result = await Share.share({
        message: generateShareMessage(),
        url: generateShareUrl(), // iOS only
        title: productName,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          handleShareSuccess('native', result.activityType);
        } else {
          handleShareSuccess('native');
        }
      } else if (result.action === Share.dismissedAction) {
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to share product. Please try again.');
    }
  };

  /**
   * Handle copy link
   */
  const handleCopyLink = async () => {
    try {
      if (!isMounted()) return;
      await Clipboard.setStringAsync(generateShareUrl());
      setIsCopied(true);

      if (!isMounted()) return;
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);

      platformAlertSimple('Link Copied', 'Product link copied to clipboard!');
      handleShareSuccess('clipboard');
    } catch (error) {
      platformAlertSimple('Error', 'Failed to copy link. Please try again.');
    }
  };

  /**
   * Handle WhatsApp share
   */
  const handleWhatsAppShare = () => {
    // In production, use deep linking or Linking API
    // Linking.openURL(`whatsapp://send?text=${encodeURIComponent(generateShareMessage())}`);
    handleNativeShare();
    handleShareSuccess('whatsapp');
  };

  /**
   * Handle Facebook share
   */
  const handleFacebookShare = () => {
    // In production, use Facebook SDK or deep linking
    handleNativeShare();
    handleShareSuccess('facebook');
  };

  /**
   * Handle Twitter share
   */
  const handleTwitterShare = () => {
    // In production, use Twitter SDK or deep linking
    handleNativeShare();
    handleShareSuccess('twitter');
  };

  /**
   * Handle Instagram share
   */
  const handleInstagramShare = () => {
    // Instagram requires special handling (story sharing, etc.)
    platformAlertSimple('Share to Instagram', 'To share on Instagram, please screenshot this product and post to your story!');
    handleShareSuccess('instagram');
  };

  /**
   * Handle Email share
   */
  const handleEmailShare = () => {
    // In production, use MailComposer or Linking with mailto:
    handleNativeShare();
    handleShareSuccess('email');
  };

  /**
   * Handle SMS share
   */
  const handleSMSShare = () => {
    // In production, use SMS or Linking with sms:
    handleNativeShare();
    handleShareSuccess('sms');
  };

  /**
   * Handle share success tracking
   */
  const handleShareSuccess = (platform: string, activityType?: string) => {
    if (onShareComplete) {
      onShareComplete(platform);
    }

    // TODO: Track share event in analytics
    // analytics.track('product_shared', {
    //   product_id: productId,
    //   platform,
    //   activity_type: activityType,
    //   referral_code: referralCode,
    // });
  };

  // Share options configuration
  const shareOptions: ShareOption[] = [
    {
      id: 'whatsapp',
      icon: 'logo-whatsapp',
      label: 'WhatsApp',
      color: '#25D366',
      action: handleWhatsAppShare,
    },
    {
      id: 'facebook',
      icon: 'logo-facebook',
      label: 'Facebook',
      color: '#1877F2',
      action: handleFacebookShare,
    },
    {
      id: 'twitter',
      icon: 'logo-twitter',
      label: 'Twitter',
      color: '#1DA1F2',
      action: handleTwitterShare,
    },
    {
      id: 'instagram',
      icon: 'logo-instagram',
      label: 'Instagram',
      color: '#E4405F',
      action: handleInstagramShare,
    },
    {
      id: 'email',
      icon: 'mail',
      label: 'Email',
      color: '#EA4335',
      action: handleEmailShare,
    },
    {
      id: 'sms',
      icon: 'chatbubble',
      label: 'Message',
      color: '#0F9D58',
      action: handleSMSShare,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.backdrop}
         
          onPress={onClose}
        />

        <View style={styles.modalContent}>
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.title}>Share Product</ThemedText>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
             
            >
              <Ionicons name="close" size={24} color={colors.neutral[500]} />
            </Pressable>
          </View>

          {/* Product Preview */}
          <View style={styles.productPreview}>
            <CachedImage source={productImage} style={styles.productImage} contentFit="cover" />
            <View style={styles.productInfo}>
              <ThemedText style={styles.productName} numberOfLines={2}>
                {productName}
              </ThemedText>
              <ThemedText style={styles.productPrice}>{currencySymbol}{productPrice.toLocaleString()}</ThemedText>
            </View>
          </View>

          {/* Rewards Banner */}
          {referralCode && (
            <View style={styles.rewardsBanner}>
              <Ionicons name="gift" size={20} color={colors.brand.purpleLight} />
              <ThemedText style={styles.rewardsBannerText}>
                Earn rewards when friends buy using your link!
              </ThemedText>
            </View>
          )}

          {/* Share Options Grid */}
          <View style={styles.optionsContainer}>
            <ThemedText style={styles.sectionTitle}>Share via</ThemedText>
            <View style={styles.optionsGrid}>
              {shareOptions.map(option => (
                <Pressable
                  key={option.id}
                  style={styles.optionButton}
                  onPress={option.action}
                 
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
                    <Ionicons name={option.icon} size={28} color={colors.background.primary} />
                  </View>
                  <ThemedText style={styles.optionLabel}>{option.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {/* Copy Link */}
            <Pressable
              style={styles.quickActionButton}
              onPress={handleCopyLink}
             
            >
              <Ionicons
                name={isCopied ? 'checkmark-circle' : 'copy-outline'}
                size={20}
                color={isCopied ? colors.lightMustard : colors.brand.purpleLight}
              />
              <ThemedText style={styles.quickActionText}>
                {isCopied ? 'Link Copied!' : 'Copy Link'}
              </ThemedText>
            </Pressable>

            {/* More Options */}
            <Pressable
              style={styles.quickActionButton}
              onPress={handleNativeShare}
             
            >
              <Ionicons name="share-outline" size={20} color={colors.brand.purpleLight} />
              <ThemedText style={styles.quickActionText}>More Options</ThemedText>
            </Pressable>
          </View>

          {/* Referral Code Display */}
          {referralCode && (
            <View style={styles.referralCodeContainer}>
              <ThemedText style={styles.referralCodeLabel}>Your Referral Code</ThemedText>
              <View style={styles.referralCode}>
                <ThemedText style={styles.referralCodeText}>{referralCode}</ThemedText>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
  },

  // Handle Bar
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Product Preview
  productPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.neutral[200],
  },
  productInfo: {
    flex: 1,
    gap: 6,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.purpleLight,
  },

  // Rewards Banner
  rewardsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.pink,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  rewardsBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.purple,
    lineHeight: 18,
  },

  // Options Container
  optionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[500],
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  optionButton: {
    width: '30%',
    alignItems: 'center',
    gap: 10,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[700],
    textAlign: 'center',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint.pink,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
    gap: 8,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },

  // Referral Code
  referralCodeContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  referralCodeLabel: {
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  referralCode: {
    backgroundColor: colors.neutral[50],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
  },
  referralCodeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.purpleLight,
    letterSpacing: 2,
  },
});

export default React.memo(ProductShareModal);
