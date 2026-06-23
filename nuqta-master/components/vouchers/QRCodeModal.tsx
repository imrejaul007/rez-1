// QR Code Modal Component
// Displays QR code for voucher redemption with controls

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Share,
  Dimensions} from 'react-native';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Brightness from 'expo-brightness';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

interface VoucherData {
  id: string;
  code: string;
  brandName: string;
  brandLogo?: string;
  value: number;
  description: string;
  expiryDate: string;
  userId: string;
}

interface QRCodeModalProps {
  visible: boolean;
  voucher: VoucherData | null;
  onClose: () => void;
  onMarkAsUsed?: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  visible,
  voucher,
  onClose,
  onMarkAsUsed,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [qrRef, setQrRef] = useState<any>(null);
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(null);
  const isMounted = useIsMounted();

  // Generate QR code data with all voucher information
  const generateQRData = () => {
    if (!voucher) return '';

    const qrData = {
      type: 'VOUCHER',
      voucherId: voucher.id,
      code: voucher.code,
      userId: voucher.userId,
      brandName: voucher.brandName,
      value: voucher.value,
      expiryDate: voucher.expiryDate,
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(qrData);
  };

  // Increase brightness when modal opens for better scanning
  const handleModalShow = async () => {
    try {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === 'granted') {
        const currentBrightness = await Brightness.getBrightnessAsync();
        if (!isMounted()) return;
        setOriginalBrightness(currentBrightness);
        if (!isMounted()) return;
        await Brightness.setBrightnessAsync(1); // Max brightness
      }
    } catch (error) {
      // silently handle
    }
  };

  // Restore brightness when modal closes
  const handleModalClose = async () => {
    try {
      if (originalBrightness !== null) {
        if (!isMounted()) return;
        await Brightness.setBrightnessAsync(originalBrightness);
      }
    } catch (error) {
      // silently handle
    }
    onClose();
  };

  // Copy voucher code to clipboard
  const handleCopyCode = async () => {
    if (!voucher) return;

    try {
      if (!isMounted()) return;
      await Clipboard.setStringAsync(voucher.code);
      platformAlertSimple('Copied!', 'Voucher code copied to clipboard');
    } catch (error) {
      platformAlertSimple('Error', 'Failed to copy code');
    }
  };

  // Share QR code as image
  const handleShareQR = async () => {
    if (!voucher || !qrRef) return;

    try {
      // Fallback to text sharing for now (QR image sharing requires additional setup)
      await Share.share({
        message: `${voucher.brandName} Voucher\nCode: ${voucher.code}\nValue: ${currencySymbol}${voucher.value}\nValid till: ${new Date(voucher.expiryDate).toLocaleDateString()}`,
        title: 'Share Voucher',
      });
    } catch (error) {
      platformAlertSimple('Error', 'Failed to share voucher');
    }
  };


  // Download/Save QR code
  const handleDownloadQR = async () => {
    if (!voucher) return;

    // For now, just copy the code as downloading requires additional setup
    try {
      if (!isMounted()) return;
      await Clipboard.setStringAsync(voucher.code);
      platformAlertSimple('Code Copied!', 'Voucher code has been copied to clipboard. You can save it for later use.');
    } catch (error) {
      platformAlertSimple('Error', 'Failed to copy voucher code');
    }
  };

  // Handle mark as used
  const handleMarkAsUsed = () => {
    platformAlertDestructive('Confirm Usage', `Are you sure you want to mark this ${voucher?.brandName} voucher as used? This action cannot be undone.`, () => {
            handleModalClose();
            onMarkAsUsed?.();
          }, 'Mark as Used');
  };

  if (!voucher) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleModalClose}
      onShow={handleModalShow}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <Pressable
            style={styles.closeButton}
            onPress={handleModalClose}
          >
            <Ionicons name="close" size={24} color={colors.neutral[500]} />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="qr-code" size={32} color={colors.warningScale[400]} />
            <Text style={styles.modalTitle}>Scan to Redeem</Text>
            <Text style={styles.modalSubtitle}>{voucher.brandName}</Text>
          </View>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <View style={styles.qrCodeWrapper}>
              <QRCode
                value={generateQRData()}
                size={width * 0.6}
                color="#000000"
                backgroundColor={colors.background.primary}
                getRef={(ref) => setQrRef(ref)}
                logo={voucher.brandLogo ? { uri: voucher.brandLogo } : undefined}
                logoSize={50}
                logoBackgroundColor="transparent"
                logoBorderRadius={25}
              />
            </View>
            <View style={styles.brightnessIndicator}>
              <Ionicons name="sunny" size={16} color={colors.warningScale[400]} />
              <Text style={styles.brightnessText}>Brightness increased for scanning</Text>
            </View>
          </View>

          {/* Voucher Details */}
          <View style={styles.detailsSection}>
            <View style={styles.codeRow}>
              <View style={styles.codeInfo}>
                <Text style={styles.codeLabel}>Voucher Code</Text>
                <Text style={styles.codeText}>{voucher.code}</Text>
              </View>
              <Pressable
                style={styles.copyButton}
                onPress={handleCopyCode}
              >
                <Ionicons name="copy-outline" size={20} color={colors.warningScale[400]} />
                <Text style={styles.copyText}>Copy</Text>
              </Pressable>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Value</Text>
                <Text style={styles.detailValue}>{currencySymbol}{voucher.value}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Valid Till</Text>
                <Text style={styles.detailValue}>
                  {new Date(voucher.expiryDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Ionicons name="information-circle-outline" size={20} color={colors.neutral[500]} />
            <Text style={styles.instructionsText}>
              Show this QR code to the cashier at the store to redeem your voucher
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Pressable
              style={styles.actionButton}
              onPress={handleShareQR}
            >
              <Ionicons name="share-social-outline" size={20} color={colors.warningScale[400]} />
              <Text style={styles.actionButtonText}>Share</Text>
            </Pressable>

            <Pressable
              style={styles.actionButton}
              onPress={handleDownloadQR}
            >
              <Ionicons name="download-outline" size={20} color={colors.warningScale[400]} />
              <Text style={styles.actionButtonText}>Save</Text>
            </Pressable>
          </View>

          {/* Mark as Used Button */}
          {onMarkAsUsed && (
            <Pressable
              style={styles.markUsedButton}
              onPress={handleMarkAsUsed}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.background.primary} />
              <Text style={styles.markUsedButtonText}>Mark as Used</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[800],
    marginTop: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.neutral[500],
    marginTop: 4,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCodeWrapper: {
    padding: 20,
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  brightnessIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.tint.amberLight,
    borderRadius: 12,
  },
  brightnessText: {
    fontSize: 11,
    color: colors.brand.amberDark,
    fontWeight: '500',
  },
  detailsSection: {
    backgroundColor: colors.neutral[50],
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  codeInfo: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
    letterSpacing: 1.5,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warningScale[400],
  },
  copyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.tint.blue,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.tint.amberLight,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warningScale[400],
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warningScale[400],
  },
  markUsedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.warningScale[400],
    paddingVertical: 16,
    borderRadius: 12,
  },
  markUsedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background.primary,
  },
});

export default React.memo(QRCodeModal);
