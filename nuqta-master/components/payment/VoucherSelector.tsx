// VoucherSelector Component
// Allows selection of vouchers during payment flow

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import vouchersService from '@/services/realVouchersApi';
import { useIsAuthenticated, useAuthLoading, useGetCurrencySymbol } from '@/stores/selectors';
import { showToast } from '@/components/common/ToastManager';
import { colors, borderRadius, spacing, typography } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface VoucherItem {
  id: string;
  code: string;
  brandName: string;
  value: number;
  description: string;
  expiryDate: string;
  status: 'active' | 'used' | 'expired';
  minOrderValue?: number;
  maxDiscountAmount?: number;
}

interface VoucherSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (voucher: VoucherItem | null) => void;
  amount: number;
  excludeIds?: string[];
}

export const VoucherSelector: React.FC<VoucherSelectorProps> = ({
  visible,
  onClose,
  onSelect,
  amount,
  excludeIds = [],
}) => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (visible && isAuthenticated && !authLoading) {
      loadVouchers();
    }
  }, [visible, isAuthenticated, authLoading]);

  const loadVouchers = async () => {
    setIsLoading(true);
    try {
      const response = await vouchersService.getUserVouchers({ status: 'active' });
      if (response.success && response.data) {
        if (!isMounted()) return;

        const filteredVouchers: VoucherItem[] = response.data
          .filter((v: any) => !excludeIds.includes(v._id || v.id))
          .map((v: any) => ({
            id: v._id || v.id,
            code: v.voucherCode,
            brandName: v.brand?.name || 'Unknown Brand',
            value: v.denomination || v.value || 0,
            description: v.brand?.description || `${currencySymbol}${v.denomination} voucher`,
            expiryDate: v.expiryDate,
            status: v.status,
            minOrderValue: v.restrictions?.minOrderValue,
            maxDiscountAmount: v.restrictions?.maxDiscountAmount,
          }));

        setVouchers(filteredVouchers);
      }
    } catch (err) {
      if (!isMounted()) return;
      showToast({
        message: 'Failed to load vouchers',
        type: 'error',
        duration: 3000,
      });
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    setIsApplying(true);
    // Small delay for UX feedback
    setTimeout(() => {
      onSelect(selectedVoucher);
      setIsApplying(false);
      setSelectedVoucher(null);
    }, 300);
  };

  const handleSkip = () => {
    onSelect(null);
    onClose();
  };

  const isVoucherEligible = (voucher: VoucherItem): boolean => {
    if (!voucher.minOrderValue || amount === 0) return true;
    return amount >= voucher.minOrderValue;
  };

  const calculateSavings = (voucher: VoucherItem): number => {
    if (voucher.maxDiscountAmount) {
      return Math.min(voucher.value, voucher.maxDiscountAmount);
    }
    return Math.min(voucher.value, amount);
  };

  const getDaysUntilExpiry = (expiryDate: string): number => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const renderVoucherItem = (voucher: VoucherItem) => {
    const isSelected = selectedVoucher?.id === voucher.id;
    const isEligible = isVoucherEligible(voucher);
    const daysLeft = getDaysUntilExpiry(voucher.expiryDate);
    const isExpiringSoon = daysLeft <= 3 && daysLeft >= 0;
    const savings = calculateSavings(voucher);

    return (
      <Pressable
        key={voucher.id}
        style={[
          styles.voucherItem,
          isSelected && styles.voucherItemSelected,
          !isEligible && styles.voucherItemDisabled,
        ]}
        onPress={() => isEligible && setSelectedVoucher(voucher)}
        disabled={!isEligible}
      >
        <View style={styles.voucherItemContent}>
          <View style={styles.voucherHeader}>
            <Text style={styles.voucherBrand}>{voucher.brandName}</Text>
            {isExpiringSoon && (
              <View style={styles.expiringBadge}>
                <Ionicons name="time-outline" size={10} color={colors.warningScale[700]} />
                <Text style={styles.expiringText}>{daysLeft}d</Text>
              </View>
            )}
          </View>

          <View style={styles.voucherDetails}>
            <Text style={styles.voucherValue}>{currencySymbol}{voucher.value}</Text>
            <Text style={styles.voucherDescription} numberOfLines={1}>
              {voucher.description}
            </Text>
          </View>

          {!isEligible && voucher.minOrderValue && (
            <Text style={styles.eligibilityNote}>
              Min: {currencySymbol}{voucher.minOrderValue}
            </Text>
          )}

          {isEligible && (
            <Text style={styles.savingsText}>
              Save up to {currencySymbol}{Math.floor(savings)}
            </Text>
          )}
        </View>

        <View style={styles.voucherSelector}>
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
          ) : isEligible ? (
            <Ionicons name="ellipse-outline" size={24} color={colors.neutral[300]} />
          ) : (
            <Ionicons name="lock-closed" size={20} color={colors.neutral[400]} />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Voucher</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.neutral[500]} />
            </Pressable>
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.loadingText}>Loading vouchers...</Text>
            </View>
          ) : vouchers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyTitle}>No vouchers available</Text>
              <Text style={styles.emptyText}>
                You don't have any active vouchers
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.voucherList} showsVerticalScrollIndicator={false}>
              {vouchers.map(renderVoucherItem)}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <Pressable style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>
            <Pressable
              style={[styles.applyButton, !selectedVoucher && styles.applyButtonDisabled]}
              onPress={handleApply}
              disabled={!selectedVoucher || isApplying}
            >
              {isApplying ? (
                <ActivityIndicator size="small" color={colors.background.primary} />
              ) : (
                <Text style={styles.applyButtonText}>
                  {selectedVoucher
                    ? `Apply (Save ${currencySymbol}${Math.floor(calculateSavings(selectedVoucher))})`
                    : 'Apply Voucher'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  voucherList: {
    flex: 1,
    padding: spacing.md,
  },
  voucherItem: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voucherItemSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  voucherItemDisabled: {
    opacity: 0.6,
  },
  voucherItemContent: {
    flex: 1,
  },
  voucherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  voucherBrand: {
    ...typography.button,
    color: colors.text.primary,
    fontWeight: '600',
  },
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.warningScale[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  expiringText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warningScale[700],
  },
  voucherDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  voucherValue: {
    ...typography.h4,
    color: colors.primary[600],
  },
  voucherDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    flex: 1,
  },
  eligibilityNote: {
    ...typography.caption,
    color: colors.warningScale[700],
    marginTop: spacing.xs,
  },
  savingsText: {
    ...typography.caption,
    color: colors.successScale[700],
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  voucherSelector: {
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  skipButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  skipButtonText: {
    ...typography.button,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  applyButtonText: {
    ...typography.button,
    color: colors.background.primary,
    fontWeight: '700',
  },
});

export default VoucherSelector;
