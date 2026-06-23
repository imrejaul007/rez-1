// Share Modal Component
// Beautiful modal for sharing wishlists with multiple platforms

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
  Dimensions,
  Platform} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { ThemedText } from '@/components/ThemedText';
import wishlistSharingService, {
  ShareableLink,
  PrivacySettings,
} from '@/services/wishlistSharingApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  wishlistId: string;
  wishlistName: string;
  itemCount: number;
  ownerName: string;
}

interface SharePlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  action: 'whatsapp' | 'facebook' | 'instagram' | 'twitter' | 'telegram' | 'email' | 'sms' | 'link' | 'qrcode';
}

const SHARE_PLATFORMS: SharePlatform[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'logo-whatsapp',
    color: '#25D366',
    action: 'whatsapp',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'logo-facebook',
    color: '#1877F2',
    action: 'facebook',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'logo-instagram',
    color: '#E4405F',
    action: 'instagram',
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: 'logo-twitter',
    color: '#1DA1F2',
    action: 'twitter',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: 'paper-plane',
    color: '#0088CC',
    action: 'telegram',
  },
  {
    id: 'email',
    name: 'Email',
    icon: 'mail',
    color: '#EA4335',
    action: 'email',
  },
  {
    id: 'sms',
    name: 'SMS',
    icon: 'chatbubble',
    color: colors.lightMustard,
    action: 'sms',
  },
  {
    id: 'link',
    name: 'Copy Link',
    icon: 'link',
    color: colors.brand.purpleLight,
    action: 'link',
  },
];

function ShareModal({
  visible,
  onClose,
  wishlistId,
  wishlistName,
  itemCount,
  ownerName,
}: ShareModalProps) {
  const [shareLink, setShareLink] = useState<ShareableLink | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useIsMounted();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    visibility: 'public',
    allowComments: true,
    allowGiftReservation: true,
    showPrices: true,
    notifyOnView: false,
    notifyOnLike: true,
  });
  const [showQRCode, setShowQRCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadShareLink();
      loadPrivacySettings();
    }
  }, [visible, wishlistId]);

  const loadShareLink = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await wishlistSharingService.generateShareableLink(wishlistId);
      if (response.success && response.data) {
        if (!isMounted()) return;
        setShareLink(response.data);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to generate share link');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, [wishlistId]);

  const loadPrivacySettings = useCallback(async () => {
    try {
      const response = await wishlistSharingService.getPrivacySettings(wishlistId);
      if (response.success && response.data) {
        if (!isMounted()) return;
        setPrivacySettings(response.data);
      }
    } catch (error) {
      // silently handle
    }
  }, [wishlistId]);

  const handleUpdatePrivacySettings = useCallback(
    async (updates: Partial<PrivacySettings>) => {
      try {
        setIsSaving(true);
        const newSettings = { ...privacySettings, ...updates };
        setPrivacySettings(newSettings);

        const response = await wishlistSharingService.updatePrivacySettings(
          wishlistId,
          newSettings
        );
        if (!response.success) {
          throw new Error('Failed to update privacy settings');
        }
      } catch (error) {
        platformAlertSimple('Error', 'Failed to update privacy settings');
        // Revert changes
        loadPrivacySettings();
      } finally {
        if (!isMounted()) return;
        setIsSaving(false);
      }
    },
    [wishlistId, privacySettings, loadPrivacySettings]
  );

  const handleShare = useCallback(
    async (platform: SharePlatform) => {
      if (!shareLink) return;

      try {
        // Track analytics
        await wishlistSharingService.trackShareAnalytics(wishlistId, platform.action);

        const shareOptions = {
          wishlistName,
          ownerName,
          shareUrl: shareLink.shareUrl,
          itemCount,
        };

        let success = false;

        switch (platform.action) {
          case 'whatsapp':
            success = await wishlistSharingService.shareViaWhatsApp(shareOptions);
            break;
          case 'facebook':
            success = await wishlistSharingService.shareViaFacebook(shareLink.shareUrl);
            break;
          case 'instagram':
            success = await wishlistSharingService.shareViaInstagram(shareOptions);
            break;
          case 'twitter':
            success = await wishlistSharingService.shareViaTwitter(shareOptions);
            break;
          case 'telegram':
            success = await wishlistSharingService.shareViaTelegram(shareOptions);
            break;
          case 'email':
            success = await wishlistSharingService.shareViaEmail(shareOptions);
            break;
          case 'sms':
            success = await wishlistSharingService.shareViaSMS(shareOptions);
            break;
          case 'link':
            success = await wishlistSharingService.copyLinkToClipboard(shareLink.shareUrl);
            if (success) {
              platformAlertSimple('Success', 'Link copied to clipboard!');
            }
            break;
          case 'qrcode':
            if (!isMounted()) return;
            setShowQRCode(true);
            return;
        }

        if (success && platform.action !== 'link') {
          platformAlertSimple('Success', `Shared via ${platform.name}!`);
        }
      } catch (error) {
        platformAlertSimple('Error', `Failed to share via ${platform.name}`);
      }
    },
    [shareLink, wishlistId, wishlistName, ownerName, itemCount]
  );

  const renderPrivacySettings = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Privacy Settings</ThemedText>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingLabel}>Public Wishlist</ThemedText>
          <ThemedText style={styles.settingDescription}>
            Anyone with the link can view
          </ThemedText>
        </View>
        <Switch
          value={privacySettings.visibility === 'public'}
          onValueChange={(value) =>
            handleUpdatePrivacySettings({
              visibility: value ? 'public' : 'private',
            })
          }
          trackColor={{ false: colors.neutral[300], true: colors.brand.purpleLight }}
          thumbColor={colors.background.primary}
          disabled={isSaving}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingLabel}>Allow Comments</ThemedText>
          <ThemedText style={styles.settingDescription}>
            Let others comment on items
          </ThemedText>
        </View>
        <Switch
          value={privacySettings.allowComments}
          onValueChange={(value) =>
            handleUpdatePrivacySettings({ allowComments: value })
          }
          trackColor={{ false: colors.neutral[300], true: colors.brand.purpleLight }}
          thumbColor={colors.background.primary}
          disabled={isSaving}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingLabel}>Allow Gift Reservation</ThemedText>
          <ThemedText style={styles.settingDescription}>
            Let others mark items as "buying this"
          </ThemedText>
        </View>
        <Switch
          value={privacySettings.allowGiftReservation}
          onValueChange={(value) =>
            handleUpdatePrivacySettings({ allowGiftReservation: value })
          }
          trackColor={{ false: colors.neutral[300], true: colors.brand.purpleLight }}
          thumbColor={colors.background.primary}
          disabled={isSaving}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingLabel}>Show Prices</ThemedText>
          <ThemedText style={styles.settingDescription}>
            Display item prices to viewers
          </ThemedText>
        </View>
        <Switch
          value={privacySettings.showPrices}
          onValueChange={(value) => handleUpdatePrivacySettings({ showPrices: value })}
          trackColor={{ false: colors.neutral[300], true: colors.brand.purpleLight }}
          thumbColor={colors.background.primary}
          disabled={isSaving}
        />
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <ThemedText style={styles.settingLabel}>Notify on Likes</ThemedText>
          <ThemedText style={styles.settingDescription}>
            Get notified when someone likes your wishlist
          </ThemedText>
        </View>
        <Switch
          value={privacySettings.notifyOnLike}
          onValueChange={(value) =>
            handleUpdatePrivacySettings({ notifyOnLike: value })
          }
          trackColor={{ false: colors.neutral[300], true: colors.brand.purpleLight }}
          thumbColor={colors.background.primary}
          disabled={isSaving}
        />
      </View>
    </View>
  );

  const renderSharePlatforms = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Share Via</ThemedText>
      <View style={styles.platformsGrid}>
        {SHARE_PLATFORMS.map((platform) => (
          <Pressable
            key={platform.id}
            style={styles.platformButton}
            onPress={() => handleShare(platform)}
            disabled={!shareLink || isLoading}
          >
            <View style={[styles.platformIcon, { backgroundColor: platform.color }]}>
              <Ionicons name={platform.icon as any} size={24} color={colors.background.primary} />
            </View>
            <ThemedText style={styles.platformName}>{platform.name}</ThemedText>
          </Pressable>
        ))}

        <Pressable
          style={styles.platformButton}
          onPress={() => setShowQRCode(true)}
          disabled={!shareLink || isLoading}
        >
          <View style={[styles.platformIcon, { backgroundColor: colors.neutral[500] }]}>
            <Ionicons name="qr-code" size={24} color={colors.background.primary} />
          </View>
          <ThemedText style={styles.platformName}>QR Code</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderSharePreview = () => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Preview</ThemedText>
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Ionicons name="heart-outline" size={24} color={colors.brand.purpleLight} />
          <ThemedText style={styles.previewTitle}>{wishlistName}</ThemedText>
        </View>
        <ThemedText style={styles.previewDescription}>
          by {ownerName}
        </ThemedText>
        <ThemedText style={styles.previewItems}>{itemCount} items</ThemedText>
      </View>
    </View>
  );

  const renderQRCodeModal = () => (
    <Modal
      visible={showQRCode}
      transparent
      animationType="fade"
      onRequestClose={() => setShowQRCode(false)}
    >
      <View style={styles.qrModalOverlay}>
        <View style={styles.qrModalContent}>
          <View style={styles.qrModalHeader}>
            <ThemedText style={styles.qrModalTitle}>Share QR Code</ThemedText>
            <Pressable onPress={() => setShowQRCode(false)}>
              <Ionicons name="close" size={28} color={colors.neutral[800]} />
            </Pressable>
          </View>

          <View style={styles.qrCodeContainer}>
            {shareLink && (
              <QRCode
                value={shareLink.shareUrl}
                size={250}
                backgroundColor="white"
                color="black"
              />
            )}
          </View>

          <ThemedText style={styles.qrInstructions}>
            Scan this QR code to open the wishlist
          </ThemedText>

          <Pressable
            style={styles.qrCloseButton}
            onPress={() => setShowQRCode(false)}
          >
            <ThemedText style={styles.qrCloseButtonText}>Close</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[colors.brand.purpleLight, colors.brand.purple]}
              style={styles.modalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ThemedText style={styles.modalTitle}>Share Wishlist</ThemedText>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={28} color={colors.background.primary} />
              </Pressable>
            </LinearGradient>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.brand.purpleLight} />
                  <ThemedText style={styles.loadingText}>
                    Generating share link...
                  </ThemedText>
                </View>
              ) : (
                <>
                  {renderSharePreview()}
                  {renderSharePlatforms()}
                  {renderPrivacySettings()}
                </>
              )}

              <View style={styles.bottomSpace} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {renderQRCodeModal()}
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.background.primary,
  },
  modalBody: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[800],
    marginBottom: 16,
  },
  previewCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[800],
  },
  previewDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  previewItems: {
    fontSize: 14,
    color: colors.brand.purpleLight,
    fontWeight: '500',
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  platformButton: {
    width: (width - 64) / 4,
    alignItems: 'center',
    gap: 8,
  },
  platformIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformName: {
    fontSize: 12,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.neutral[800],
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.neutral[400],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: colors.neutral[500],
    marginTop: 12,
  },
  bottomSpace: {
    height: 40,
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.neutral[800],
  },
  qrCodeContainer: {
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  qrInstructions: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 24,
  },
  qrCloseButton: {
    backgroundColor: colors.brand.purpleLight,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  qrCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
});

export default React.memo(ShareModal);
