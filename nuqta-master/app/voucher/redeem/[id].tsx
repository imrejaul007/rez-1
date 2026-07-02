// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Voucher Detail Screen - Displays QR code for redemption
 * Shows voucher details, expiry countdown, and mark as used option
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Brightness from 'expo-brightness';
import vouchersService from '@/services/realVouchersApi';
import apiClient from '@/services/apiClient';
import { useAuthUser, useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { showToast } from '@/components/common/ToastManager';

interface VoucherDetail {
  id: string;
  code: string;
  brandName: string;
  brandLogo?: string;
  value: number;
  denomination?: number;
  description: string;
  expiryDate: string;
  status: 'active' | 'used' | 'expired';
  purchaseDate?: string;
  category: string;
  qrCode?: string;
  termsAndConditions?: string[];
}

function VoucherDetailScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const user = useAuthUser();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [voucher, setVoucher] = useState<VoucherDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isMarkingUsed, setIsMarkingUsed] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadVoucher();
    }
  }, [params.id]);

  const loadVoucher = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await vouchersService.getVoucherById(params.id!);
      if (response.success && response.data) {
        const v = response.data;
        const brand = typeof v.brand === 'object' ? v.brand : null;

        setVoucher({
          id: v._id || v.id,
          code: v.voucherCode,
          brandName: brand?.name || 'Unknown Brand',
          brandLogo: brand?.logo,
          value: v.denomination || v.value || 0,
          denomination: v.denomination,
          description: brand?.description || `${currencySymbol}${v.denomination} voucher`,
          expiryDate: v.expiryDate,
          status: v.status,
          purchaseDate: v.purchaseDate,
          category: brand?.category || 'General',
          qrCode: v.qrCode,
          termsAndConditions: brand?.termsAndConditions,
        });
      } else {
        setError('Voucher not found');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load voucher');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleShowQR = async () => {
    setShowQR(true);
    // Increase brightness for better QR scanning
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Brightness.requestPermissionsAsync();
        if (status === 'granted') {
          await Brightness.setBrightnessAsync(1);
        }
      }
    } catch (err) {
      // silently handle brightness permission errors
    }
  };

  const handleHideQR = async () => {
    setShowQR(false);
    // Restore brightness
    try {
      if (Platform.OS !== 'web') {
        await Brightness.setBrightnessAsync(0.5);
      }
    } catch (err) {
      // silently handle
    }
  };

  const handleCopyCode = async () => {
    if (!voucher) return;
    try {
      await Clipboard.setStringAsync(voucher.code);
      showToast({
        message: 'Voucher code copied!',
        type: 'success',
        duration: 2000,
      });
    } catch (err) {
      showToast({
        message: 'Failed to copy code',
        type: 'error',
        duration: 2000,
      });
    }
  };

  const handleShare = async () => {
    if (!voucher) return;
    try {
      await Share.share({
        message: `${voucher.brandName} Voucher\nCode: ${voucher.code}\nValue: ${currencySymbol}${voucher.value}\nValid till: ${new Date(voucher.expiryDate).toLocaleDateString()}`,
        title: 'Share Voucher',
      });
    } catch (err) {
      showToast({
        message: 'Failed to share voucher',
        type: 'error',
        duration: 2000,
      });
    }
  };

  const handleMarkAsUsed = async () => {
    if (!voucher) return;

    platformAlertDestructive(
      'Mark as Used',
      `Are you sure you want to mark this ${voucher.brandName} voucher as used? This action cannot be undone.`,
      async () => {
        try {
          setIsMarkingUsed(true);
          const response = await apiClient.post(`/vouchers/${voucher.id}/redeem`, {
            status: 'used',
            redeemedAt: new Date().toISOString(),
          });

          if (response.success) {
            setVoucher(prev => prev ? { ...prev, status: 'used' } : null);
            showToast({
              message: 'Voucher marked as used',
              type: 'success',
              duration: 3000,
            });
          } else {
            throw new Error(response.error || 'Failed to update voucher');
          }
        } catch (err: any) {
          showToast({
            message: err.message || 'Failed to update voucher',
            type: 'error',
            duration: 3000,
          });
        } finally {
          if (!isMounted()) return;
          setIsMarkingUsed(false);
        }
      },
      'Mark as Used'
    );
  };

  const getExpiryInfo = () => {
    if (!voucher) return null;

    const now = new Date();
    const expiry = new Date(voucher.expiryDate);
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs < 0) {
      return { text: 'Expired', isExpired: true, daysLeft: 0 };
    }

    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));

    if (daysLeft <= 1) {
      return { text: `${hoursLeft} hours left`, isExpired: false, daysLeft };
    }
    if (daysLeft <= 7) {
      return { text: `${daysLeft} days left`, isExpired: false, daysLeft };
    }
    return {
      text: `Valid till ${expiry.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      isExpired: false,
      daysLeft,
    };
  };

  const generateQRData = () => {
    if (!voucher) return '';

    const qrData = {
      type: 'VOUCHER',
      voucherId: voucher.id,
      code: voucher.code,
      userId: user?.id || '',
      brandName: voucher.brandName,
      value: voucher.value,
      expiryDate: voucher.expiryDate,
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(qrData);
  };

  const expiryInfo = getExpiryInfo();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Voucher', headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading voucher...</Text>
        </View>
      </View>
    );
  }

  if (error || !voucher) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Voucher', headerShown: false }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.errorScale[500]} />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error || 'Voucher not found'}</Text>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: voucher.brandName,
          headerShown: true,
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: colors.text.primary,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Voucher Card */}
        <View style={styles.voucherCard}>
          <View style={styles.voucherHeader}>
            <View style={styles.brandInfo}>
              {voucher.brandLogo ? (
                <View style={styles.logoContainer}>
                  <Text style={styles.logoText}>{voucher.brandName.charAt(0)}</Text>
                </View>
              ) : (
                <View style={[styles.logoContainer, { backgroundColor: colors.primary[500] }]}>
                  <Text style={styles.logoText}>{voucher.brandName.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.brandDetails}>
                <Text style={styles.brandName}>{voucher.brandName}</Text>
                <Text style={styles.categoryText}>{voucher.category}</Text>
              </View>
            </View>

            {voucher.status !== 'active' && (
              <View style={[
                styles.statusBadge,
                voucher.status === 'used' ? styles.statusUsed : styles.statusExpired
              ]}>
                <Text style={styles.statusText}>
                  {voucher.status === 'used' ? 'USED' : 'EXPIRED'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.valueSection}>
            <Text style={styles.valueLabel}>Value</Text>
            <Text style={styles.valueAmount}>{currencySymbol}{voucher.value}</Text>
          </View>

          {expiryInfo && (
            <View style={[
              styles.expirySection,
              expiryInfo.isExpired && styles.expirySectionExpired
            ]}>
              <Ionicons
                name={expiryInfo.isExpired ? 'alert-circle' : 'time-outline'}
                size={18}
                color={expiryInfo.isExpired ? colors.error : colors.nileBlue}
              />
              <Text style={[
                styles.expiryText,
                expiryInfo.isExpired && styles.expiryTextExpired
              ]}>
                {expiryInfo.text}
              </Text>
            </View>
          )}

          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>Voucher Code</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{voucher.code}</Text>
              <Pressable style={styles.copyButton} onPress={handleCopyCode}>
                <Ionicons name="copy-outline" size={18} color={colors.primary[500]} />
                <Text style={styles.copyText}>Copy</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* QR Code Section */}
        {voucher.status === 'active' && (
          <View style={styles.qrSection}>
            <Text style={styles.sectionTitle}>Scan to Redeem</Text>
            <Text style={styles.sectionSubtitle}>
              Show this QR code to the cashier to redeem your voucher
            </Text>

            <Pressable style={styles.qrButton} onPress={handleShowQR}>
              <Ionicons name="qr-code-outline" size={24} color={colors.background.primary} />
              <Text style={styles.qrButtonText}>Show QR Code</Text>
            </Pressable>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={colors.primary[500]} />
            <Text style={styles.shareButtonText}>Share Voucher</Text>
          </Pressable>

          {voucher.status === 'active' && (
            <Pressable
              style={styles.markUsedButton}
              onPress={handleMarkAsUsed}
              disabled={isMarkingUsed}
            >
              {isMarkingUsed ? (
                <ActivityIndicator size="small" color={colors.background.primary} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.background.primary} />
                  <Text style={styles.markUsedButtonText}>Mark as Used</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* Terms and Conditions */}
        {voucher.termsAndConditions && voucher.termsAndConditions.length > 0 && (
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            {voucher.termsAndConditions.map((term, index) => (
              <View key={index} style={styles.termItem}>
                <Text style={styles.termBullet}>•</Text>
                <Text style={styles.termText}>{term}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* QR Modal */}
      {showQR && (
        <View style={styles.qrModalOverlay}>
          <Pressable style={styles.qrModalBackdrop} onPress={handleHideQR} />
          <View style={styles.qrModalContent}>
            <Pressable style={styles.qrModalClose} onPress={handleHideQR}>
              <Ionicons name="close" size={24} color={colors.neutral[500]} />
            </Pressable>

            <View style={styles.qrHeader}>
              <Ionicons name="qr-code" size={32} color={colors.warningScale[400]} />
              <Text style={styles.qrModalTitle}>Scan to Redeem</Text>
              <Text style={styles.qrModalSubtitle}>{voucher.brandName}</Text>
            </View>

            <View style={styles.qrCodeWrapper}>
              <QRCode
                value={generateQRData()}
                size={220}
                color="#000000"
                backgroundColor="#FFFFFF"
                logo={voucher.brandLogo ? { uri: voucher.brandLogo } : undefined}
                logoSize={40}
                logoBackgroundColor="transparent"
                logoBorderRadius={20}
              />
            </View>

            <View style={styles.qrCodeInfo}>
              <View style={styles.qrCodeDetail}>
                <Text style={styles.qrCodeLabel}>Code</Text>
                <Text style={styles.qrCodeValue}>{voucher.code}</Text>
              </View>
              <View style={styles.qrCodeDetail}>
                <Text style={styles.qrCodeLabel}>Value</Text>
                <Text style={styles.qrCodeValue}>{currencySymbol}{voucher.value}</Text>
              </View>
            </View>

            <View style={styles.qrInstructions}>
              <Ionicons name="information-circle-outline" size={18} color={colors.nileBlue} />
              <Text style={styles.qrInstructionsText}>
                Show this QR code to the cashier at the store to redeem your voucher
              </Text>
            </View>

            <View style={styles.qrBrightnessNote}>
              <Ionicons name="sunny" size={16} color={colors.warningScale[600]} />
              <Text style={styles.qrBrightnessText}>
                Screen brightness increased for better scanning
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.background.primary,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  voucherCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  voucherHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  brandInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.warningScale[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.background.primary,
  },
  brandDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  brandName: {
    ...typography.h4,
    color: colors.text.primary,
  },
  categoryText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusUsed: {
    backgroundColor: colors.successScale[100],
  },
  statusExpired: {
    backgroundColor: colors.errorScale[100],
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  valueSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.md,
  },
  valueLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primary[600],
  },
  expirySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  expirySectionExpired: {
    backgroundColor: colors.errorScale[50],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  expiryText: {
    ...typography.body,
    color: colors.nileBlue,
    fontWeight: '600',
  },
  expiryTextExpired: {
    color: colors.error,
  },
  codeSection: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  codeLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  copyText: {
    ...typography.buttonSmall,
    color: colors.primary[500],
    fontWeight: '600',
  },
  qrSection: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningScale[400],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  qrButtonText: {
    ...typography.button,
    color: colors.background.primary,
    fontWeight: '700',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary[500],
    ...shadows.sm,
  },
  shareButtonText: {
    ...typography.button,
    color: colors.primary[500],
    fontWeight: '600',
  },
  markUsedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  markUsedButtonText: {
    ...typography.button,
    color: colors.background.primary,
    fontWeight: '700',
  },
  termsSection: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  termsTitle: {
    ...typography.h4,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  termItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  termBullet: {
    ...typography.body,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  termText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    flex: 1,
  },
  // QR Modal
  qrModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  qrModalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 24,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 360,
    alignItems: 'center',
  },
  qrModalClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
  },
  qrHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
  qrModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[800],
    marginTop: spacing.sm,
  },
  qrModalSubtitle: {
    ...typography.body,
    color: colors.neutral[500],
    marginTop: 4,
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
  qrCodeInfo: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  qrCodeDetail: {
    alignItems: 'center',
  },
  qrCodeLabel: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  qrCodeValue: {
    ...typography.h4,
    color: colors.neutral[800],
    marginTop: 2,
  },
  qrInstructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.tint.blue,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
    width: '100%',
  },
  qrInstructionsText: {
    ...typography.bodySmall,
    color: '#1E40AF',
    flex: 1,
    lineHeight: 18,
  },
  qrBrightnessNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  qrBrightnessText: {
    ...typography.caption,
    color: colors.warningScale[600],
  },
});

export default withErrorBoundary(VoucherDetailScreen, 'VoucherDetail');
