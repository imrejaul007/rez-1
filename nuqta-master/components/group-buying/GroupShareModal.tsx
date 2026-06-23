// Group Share Modal Component
// Modal for sharing group invitation

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Share} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { GroupBuyingGroup } from '@/types/groupBuying.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface GroupShareModalProps {
  visible: boolean;
  group: GroupBuyingGroup | null;
  onClose: () => void;
}

function GroupShareModal({
  visible,
  group,
  onClose,
}: GroupShareModalProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  if (!group) return null;

  const shareUrl = `rez://group-buy/join?code=${group.code}`;
  const spotsLeft = group.maxMembers - group.currentMemberCount;

  const shareMessage = `🎉 Join my group buying deal!

📦 ${group.product.name}
💰 Save ${group.currentTier.discountPercentage}% - Get it for just ${currencySymbol}${group.currentTier.pricePerUnit}!
👥 Only ${spotsLeft} spots left!

Use code: ${group.code}
Or click: ${shareUrl}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: shareMessage,
        title: 'Join my Group Buy',
      });
    } catch (error) {
      // silently handle
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(group.code);
    platformAlertSimple('Copied!', 'Group code copied to clipboard');
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(shareUrl);
    platformAlertSimple('Copied!', 'Group link copied to clipboard');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="share-social" size={32} color={colors.brand.purpleLight} />
            <Text style={styles.headerTitle}>Invite Friends</Text>
            <Text style={styles.headerSubtitle}>
              Share this group to unlock better discounts!
            </Text>
          </View>

          {/* Group Code */}
          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>Group Code</Text>
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{group.code}</Text>
              <Pressable style={styles.copyButton} onPress={handleCopyCode}>
                <Ionicons name="copy-outline" size={20} color={colors.brand.purpleLight} />
              </Pressable>
            </View>
          </View>

          {/* Share Options */}
          <View style={styles.shareOptions}>
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <View style={styles.shareIconContainer}>
                <Ionicons name="share-outline" size={24} color="white" />
              </View>
              <Text style={styles.shareButtonText}>Share</Text>
            </Pressable>

            <Pressable style={styles.shareButton} onPress={handleCopyLink}>
              <View style={styles.shareIconContainer}>
                <Ionicons name="link-outline" size={24} color="white" />
              </View>
              <Text style={styles.shareButtonText}>Copy Link</Text>
            </Pressable>
          </View>

          {/* Incentive */}
          <View style={styles.incentiveCard}>
            <Ionicons name="gift" size={24} color={colors.successScale[400]} />
            <Text style={styles.incentiveText}>
              Get {spotsLeft > 1 ? `${spotsLeft} more members` : '1 more member'} to unlock the
              next discount tier!
            </Text>
          </View>

          {/* Close Button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
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
  modal: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  codeSection: {
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[500],
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.brand.purpleLight,
    borderStyle: 'dashed',
  },
  codeText: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.brand.purpleLight,
    letterSpacing: 2,
    textAlign: 'center',
  },
  copyButton: {
    padding: 8,
  },
  shareOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  shareButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  shareIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  incentiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.tint.green,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  incentiveText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#065F46',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: colors.neutral[100],
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[500],
  },
});

export default React.memo(GroupShareModal);
