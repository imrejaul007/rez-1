// Share Modal Component
// Modal for sharing referral code via multiple channels

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Share as RNShare,
  Clipboard,
  Linking} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { ThemedText } from '@/components/ThemedText';
import referralService from '@/services/referralApi';
import type { ShareTemplate } from '@/types/referral.types';
import analyticsService from '@/services/analyticsService';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { safeOpenURL } from '@/utils/linking';

interface ShareModalProps {
  visible: boolean;
  referralCode: string;
  referralLink: string;
  currentTierProgress?: {
    current: number;
    target: number;
    nextTier: string;
  };
  onClose: () => void;
}

const getSharePlatforms = (currencySymbol: string): ShareTemplate[] => [
  {
    type: 'whatsapp',
    icon: 'logo-whatsapp',
    color: '#25D366',
    message: `🎉 Join me on REZ and get ${currencySymbol}30 off your first order! Use my code: {CODE}\n\n✨ Shop from top brands\n💰 Earn rewards\n\n{LINK}`,
  },
  {
    type: 'facebook',
    icon: 'logo-facebook',
    color: '#1877f2',
    message: `Just discovered REZ - amazing deals! 🛍️\n\nUse my code {CODE} for ${currencySymbol}30 off!\n\n{LINK}`,
  },
  {
    type: 'instagram',
    icon: 'logo-instagram',
    color: '#E4405F',
    message: `💎 Shop smarter with REZ!\n\nCode: {CODE}\nGet ${currencySymbol}30 off!\n\n{LINK}`,
  },
  {
    type: 'telegram',
    icon: 'paper-plane',
    color: '#0088cc',
    message: `🚀 Check out REZ!\n\nUse code {CODE} for ${currencySymbol}30 off.\n\n{LINK}`,
  },
  {
    type: 'sms',
    icon: 'chatbox',
    color: colors.successScale[400],
    message: `Hey! Join REZ and get ${currencySymbol}30 off. Code: {CODE}\n{LINK}`,
  },
  {
    type: 'email',
    icon: 'mail',
    color: '#6366f1',
    subject: `Get ${currencySymbol}30 off on REZ - My referral gift!`,
    message: `Hi!\n\nI've been using REZ to shop from local stores. Use my code {CODE} for ${currencySymbol}30 off!\n\n{LINK}`,
  },
];

function ShareModal({
  visible,
  referralCode,
  referralLink,
  currentTierProgress,
  onClose,
}: ShareModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const SHARE_PLATFORMS = getSharePlatforms(currencySymbol);
  const [isCopied, setIsCopied] = useState(false);
  const isMounted = useIsMounted();

  // Handle copy code
  const handleCopyCode = async () => {
    if (!isMounted()) return;
    try {
      Clipboard.setString(referralCode);
    } catch (error) {
      // Silently handle clipboard errors
      return;
    }
    setIsCopied(true);

    // ✅ Analytics: Track code copy from share modal

    platformAlertSimple('Copied!', 'Referral code copied to clipboard');

    setTimeout(() => setIsCopied(false), 3000);
  };

  // Handle copy link
  const handleCopyLink = async () => {
    if (!isMounted()) return;
    Clipboard.setString(referralLink);

    // ✅ Analytics: Track link copy

    platformAlertSimple('Copied!', 'Referral link copied to clipboard');
  };

  // Handle share via platform
  const handleShare = async (platform: ShareTemplate) => {
    try {
      // Replace placeholders
      const message = platform.message
        .replace('{CODE}', referralCode)
        .replace('{LINK}', referralLink);

      // ✅ Analytics: Track share attempt by platform
      analyticsService.track('referral_shared', { platform: platform.type });

      // Track share event - non-blocking, errors are silent
      referralService.shareReferralLink(platform.type as any).catch(() => {
        // Silently ignore tracking errors
      });

      switch (platform.type) {
        case 'whatsapp':
          const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
          await safeOpenURL(whatsappUrl);
          break;

        case 'facebook':
          const fbUrl = `fb://facewebmodal/f?href=${encodeURIComponent(referralLink)}`;
          await safeOpenURL(fbUrl);
          break;

        case 'telegram':
          const telegramUrl = `tg://msg?text=${encodeURIComponent(message)}`;
          await safeOpenURL(telegramUrl);
          break;

        case 'email':
          const emailUrl = `mailto:?subject=${encodeURIComponent(platform.subject || '')}&body=${encodeURIComponent(message)}`;
          await safeOpenURL(emailUrl);
          break;

        case 'sms':
          const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
          await safeOpenURL(smsUrl);
          break;

        default:
          // Use native share sheet
          await RNShare.share({
            message,
            title: 'Join REZ',
          });
      }
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        platformAlertSimple('Error', 'Could not open share dialog');
      }
    }
  };

  // Render share button
  const renderShareButton = (platform: ShareTemplate) => (
    <Pressable
      key={platform.type}
      style={styles.platformButton}
      onPress={() => handleShare(platform)}
    >
      <View style={[styles.platformIcon, { backgroundColor: platform.color }]}>
        <Ionicons name={platform.icon as any} size={24} color={colors.background.primary} />
      </View>
      <ThemedText style={styles.platformText}>
        {platform.type.charAt(0).toUpperCase() + platform.type.slice(1)}
      </ThemedText>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalContainer}>
          <LinearGradient colors={[colors.brand.purpleLight, colors.brand.purple]} style={styles.header}>
            <ThemedText style={styles.headerTitle}>Share Referral</ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.background.primary} />
            </Pressable>
          </LinearGradient>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Tier Progress (if available) */}
            {currentTierProgress && (
              <View style={styles.progressCard}>
                <ThemedText style={styles.progressTitle}>Progress to {currentTierProgress.nextTier}</ThemedText>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(currentTierProgress.current / currentTierProgress.target) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.progressText}>
                  {currentTierProgress.current}/{currentTierProgress.target} referrals
                </ThemedText>
              </View>
            )}

            {/* QR Code */}
            <View style={styles.qrSection}>
              <ThemedText style={styles.sectionTitle}>QR Code</ThemedText>
              <View style={styles.qrContainer}>
                <QRCode value={referralLink} size={180} />
              </View>
              <ThemedText style={styles.qrSubtext}>Scan to join with your referral code</ThemedText>
            </View>

            {/* Referral Code */}
            <View style={styles.codeSection}>
              <ThemedText style={styles.sectionTitle}>Your Referral Code</ThemedText>
              <Pressable style={styles.codeContainer} onPress={handleCopyCode}>
                <ThemedText style={styles.codeText}>{referralCode}</ThemedText>
                <View style={styles.copyButton}>
                  <Ionicons name={isCopied ? 'checkmark' : 'copy'} size={20} color={colors.brand.purpleLight} />
                  <ThemedText style={styles.copyText}>{isCopied ? 'Copied!' : 'Copy'}</ThemedText>
                </View>
              </Pressable>
            </View>

            {/* Referral Link */}
            <View style={styles.linkSection}>
              <ThemedText style={styles.sectionTitle}>Referral Link</ThemedText>
              <Pressable style={styles.linkContainer} onPress={handleCopyLink}>
                <ThemedText style={styles.linkText} numberOfLines={1}>
                  {referralLink}
                </ThemedText>
                <Ionicons name="copy-outline" size={20} color={colors.neutral[500]} />
              </Pressable>
            </View>

            {/* Share Platforms */}
            <View style={styles.platformsSection}>
              <ThemedText style={styles.sectionTitle}>Share Via</ThemedText>
              <View style={styles.platformsGrid}>
                {SHARE_PLATFORMS.map(renderShareButton)}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContainer: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    color: colors.background.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
  },
  progressCard: {
    backgroundColor: colors.tint.purpleLight,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purple,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand.purpleLight,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 16,
  },
  qrContainer: {
    backgroundColor: colors.background.primary,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    marginBottom: 12,
  },
  qrSubtext: {
    fontSize: 12,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  codeSection: {
    marginBottom: 24,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.neutral[900],
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  copyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purpleLight,
  },
  linkSection: {
    marginBottom: 24,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  linkText: {
    flex: 1,
    fontSize: 12,
    color: colors.neutral[500],
    marginRight: 8,
  },
  platformsSection: {
    marginBottom: 24,
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  platformButton: {
    alignItems: 'center',
    width: '30%',
  },
  platformIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  platformText: {
    fontSize: 12,
    color: colors.neutral[700],
    textAlign: 'center',
  },
});

export default React.memo(ShareModal);
