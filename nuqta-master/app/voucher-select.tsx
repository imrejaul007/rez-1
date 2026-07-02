// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Voucher Select Screen
 * Shows user's available vouchers grouped by store/category
 * Allows selection and preview of savings before payment
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import vouchersService from '@/services/realVouchersApi';
import realOffersApi from '@/services/realOffersApi';
import { useAuthUser, useIsAuthenticated, useAuthLoading, useGetCurrencySymbol } from '@/stores/selectors';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { showToast } from '@/components/common/ToastManager';

interface UserVoucher {
  id: string;
  code: string;
  brandName: string;
  brandLogo?: string;
  value: number;
  denomination?: number;
  description: string;
  expiryDate: string;
  status: 'active' | 'used' | 'expired';
  category: string;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  storeId?: string;
  storeName?: string;
}

interface GroupedVouchers {
  storeName: string;
  storeId: string;
  vouchers: UserVoucher[];
  totalValue: number;
}

type FilterType = 'all' | 'active' | 'expiring_soon';

function VoucherSelectScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { amount, storeId, storeName, returnRoute } = params;
  const numericAmount = parseFloat(amount || '0');
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [selectedVouchers, setSelectedVouchers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadVouchers();
  }, [storeId, authLoading, isAuthenticated]);

  const loadVouchers = async (refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      // Fetch user's vouchers
      const response = await vouchersService.getUserVouchers({ status: 'active' });
      if (response.success && response.data) {
        const mappedVouchers: UserVoucher[] = response.data.map((v: any) => ({
          id: v._id || v.id,
          code: v.voucherCode,
          brandName: v.brand?.name || 'Unknown Brand',
          brandLogo: v.brand?.logo,
          value: v.denomination || v.value || 0,
          denomination: v.denomination,
          description: v.brand?.description || `${currencySymbol}${v.denomination} voucher`,
          expiryDate: v.expiryDate,
          status: v.status,
          category: v.brand?.category || 'General',
          minOrderValue: v.restrictions?.minOrderValue,
          maxDiscountAmount: v.restrictions?.maxDiscountAmount,
          storeId: v.brand?._id,
          storeName: v.brand?.name,
        }));

        if (!isMounted()) return;
        setVouchers(mappedVouchers);
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
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  };

  const filteredVouchers = useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return vouchers.filter(v => {
      if (filter === 'active') return v.status === 'active';
      if (filter === 'expiring_soon') {
        const expiryDate = new Date(v.expiryDate);
        return v.status === 'active' && expiryDate <= threeDaysFromNow;
      }
      return true;
    });
  }, [vouchers, filter]);

  const groupedVouchers = useMemo((): GroupedVouchers[] => {
    const groups: Map<string, GroupedVouchers> = new Map();

    filteredVouchers.forEach(voucher => {
      const key = voucher.storeId || 'general';
      const groupName = voucher.storeName || 'General Vouchers';

      if (!groups.has(key)) {
        groups.set(key, {
          storeName: groupName,
          storeId: key,
          vouchers: [],
          totalValue: 0,
        });
      }

      const group = groups.get(key)!;
      group.vouchers.push(voucher);
      group.totalValue += voucher.value;
    });

    return Array.from(groups.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredVouchers]);

  const calculateSavings = useCallback((): number => {
    let totalSavings = 0;
    selectedVouchers.forEach(voucherId => {
      const voucher = vouchers.find(v => v.id === voucherId);
      if (!voucher) return;

      if (voucher.maxDiscountAmount) {
        totalSavings += Math.min(voucher.value, voucher.maxDiscountAmount);
      } else if (numericAmount > 0) {
        totalSavings += Math.min(voucher.value, numericAmount);
      } else {
        totalSavings += voucher.value;
      }
    });
    return totalSavings;
  }, [selectedVouchers, vouchers, numericAmount]);

  const toggleVoucher = (voucherId: string) => {
    setSelectedVouchers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(voucherId)) {
        newSet.delete(voucherId);
      } else {
        newSet.add(voucherId);
      }
      return newSet;
    });
  };

  const selectAllInGroup = (group: GroupedVouchers) => {
    const allIds = group.vouchers.map(v => v.id);
    const allSelected = allIds.every(id => selectedVouchers.has(id));

    setSelectedVouchers(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        allIds.forEach(id => newSet.delete(id));
      } else {
        allIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  const handleContinue = () => {
    const selectedData = vouchers.filter(v => selectedVouchers.has(v.id));
    const returnPath = returnRoute || '/pay-in-store/offers';
    const currentParams: any = { ...params };

    // Convert selected vouchers to simplified format
    currentParams.selectedVouchers = JSON.stringify(selectedData.map(v => ({
      id: v.id,
      code: v.code,
      value: v.value,
      brandName: v.brandName,
    })));

    router.replace({
      pathname: returnPath,
      params: currentParams,
    });
  };

  const handleSkip = () => {
    const returnPath = returnRoute || '/pay-in-store/offers';
    router.replace(returnPath as any);
  };

  const totalSavings = calculateSavings();
  const selectedCount = selectedVouchers.size;

  const isVoucherEligible = (voucher: UserVoucher): boolean => {
    if (!voucher.minOrderValue || numericAmount === 0) return true;
    return numericAmount >= voucher.minOrderValue;
  };

  const renderVoucherCard = (voucher: UserVoucher) => {
    const isSelected = selectedVouchers.has(voucher.id);
    const isEligible = isVoucherEligible(voucher);
    const daysUntilExpiry = Math.ceil((new Date(voucher.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isExpiringSoon = daysUntilExpiry <= 3 && daysUntilExpiry >= 0;

    return (
      <Pressable
        key={voucher.id}
        style={[
          styles.voucherCard,
          isSelected && styles.voucherCardSelected,
          !isEligible && styles.voucherCardDisabled,
        ]}
        onPress={() => isEligible && toggleVoucher(voucher.id)}
        disabled={!isEligible}
      >
        <View style={styles.voucherCardContent}>
          <View style={styles.voucherHeader}>
            <Text style={styles.voucherBrandName}>{voucher.brandName}</Text>
            {isExpiringSoon && (
              <View style={styles.expiringBadge}>
                <Ionicons name="time-outline" size={12} color={colors.warningScale[700]} />
                <Text style={styles.expiringText}>{daysUntilExpiry}d left</Text>
              </View>
            )}
          </View>

          <View style={styles.voucherValueRow}>
            <Text style={styles.voucherValue}>{currencySymbol}{voucher.value}</Text>
            <Text style={styles.voucherDescription} numberOfLines={1}>
              {voucher.description}
            </Text>
          </View>

          {!isEligible && voucher.minOrderValue && (
            <Text style={styles.eligibilityNote}>
              Add {currencySymbol}{voucher.minOrderValue - numericAmount} more to unlock
            </Text>
          )}

          {voucher.maxDiscountAmount && (
            <Text style={styles.maxDiscountNote}>
              Max: {currencySymbol}{voucher.maxDiscountAmount}
            </Text>
          )}
        </View>

        <View style={styles.voucherSelection}>
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

  const renderGroup = (group: GroupedVouchers) => {
    const allSelected = group.vouchers.every(v => selectedVouchers.has(v.id));
    const anySelected = group.vouchers.some(v => selectedVouchers.has(v.id));

    return (
      <View key={group.storeId} style={styles.groupContainer}>
        <View style={styles.groupHeader}>
          <View>
            <Text style={styles.groupTitle}>{group.storeName}</Text>
            <Text style={styles.groupSubtitle}>
              {group.vouchers.length} voucher{group.vouchers.length !== 1 ? 's' : ''} • Total: {currencySymbol}{group.totalValue}
            </Text>
          </View>
          <Pressable
            style={[styles.selectAllButton, anySelected && styles.selectAllButtonActive]}
            onPress={() => selectAllInGroup(group)}
          >
            <Text style={[styles.selectAllText, anySelected && styles.selectAllTextActive]}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.vouchersList}>
          {group.vouchers.map(renderVoucherCard)}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={handleSkip}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Apply Vouchers</Text>
          {storeName && (
            <Text style={styles.headerSubtitle}>
              {storeName} • {currencySymbol}{numericAmount.toFixed(0)}
            </Text>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'active', 'expiring_soon'] as FilterType[]).map((filterOption) => (
          <Pressable
            key={filterOption}
            style={[styles.filterTab, filter === filterOption && styles.filterTabActive]}
            onPress={() => setFilter(filterOption)}
          >
            <Text style={[styles.filterText, filter === filterOption && styles.filterTextActive]}>
              {filterOption === 'all' ? 'All' : filterOption === 'active' ? 'Active' : 'Expiring Soon'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading vouchers...</Text>
        </View>
      ) : filteredVouchers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="ticket-outline" size={64} color={colors.neutral[300]} />
          <Text style={styles.emptyTitle}>No vouchers available</Text>
          <Text style={styles.emptyText}>
            {filter === 'expiring_soon'
              ? 'No vouchers expiring in the next 3 days'
              : 'You don\'t have any active vouchers'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadVouchers(true)}
              colors={[colors.primary[500]]}
            />
          }
        >
          {groupedVouchers.map(renderGroup)}
          <View style={{ height: 160 }} />
        </ScrollView>
      )}

      {/* Bottom Action */}
      {selectedCount > 0 && (
        <View style={styles.bottomAction}>
          <View style={styles.savingsPreview}>
            <Text style={styles.savingsLabel}>You'll save</Text>
            <Text style={styles.savingsValue}>{currencySymbol}{Math.floor(totalSavings)}</Text>
          </View>
          <Pressable style={styles.applyButton} onPress={handleContinue}>
            <Text style={styles.applyButtonText}>
              Apply {selectedCount} Voucher{selectedCount !== 1 ? 's' : ''}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
          </Pressable>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.primary,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
  },
  filterTabActive: {
    backgroundColor: colors.primary[500],
  },
  filterText: {
    ...typography.buttonSmall,
    color: colors.text.secondary,
  },
  filterTextActive: {
    color: colors.background.primary,
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
  content: {
    flex: 1,
    padding: spacing.md,
  },
  groupContainer: {
    marginBottom: spacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  groupTitle: {
    ...typography.h4,
    color: colors.text.primary,
  },
  groupSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  selectAllButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  selectAllButtonActive: {
    backgroundColor: colors.primary[100],
  },
  selectAllText: {
    ...typography.buttonSmall,
    color: colors.text.secondary,
  },
  selectAllTextActive: {
    color: colors.primary[600],
  },
  vouchersList: {
    gap: spacing.sm,
  },
  voucherCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  voucherCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  voucherCardDisabled: {
    opacity: 0.6,
  },
  voucherCardContent: {
    flex: 1,
  },
  voucherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  voucherBrandName: {
    ...typography.button,
    color: colors.text.primary,
    fontWeight: '600',
  },
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningScale[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  expiringText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.warningScale[700],
    fontWeight: '600',
  },
  voucherValueRow: {
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
    color: colors.warningScale[600],
    marginTop: spacing.xs,
  },
  maxDiscountNote: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  voucherSelection: {
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.md,
    ...shadows.md,
  },
  savingsPreview: {
    alignItems: 'center',
  },
  savingsLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  savingsValue: {
    ...typography.h4,
    color: colors.successScale[600],
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[500],
    gap: spacing.sm,
  },
  applyButtonText: {
    ...typography.button,
    color: colors.background.primary,
  },
});

export default withErrorBoundary(VoucherSelectScreen, 'VoucherSelect');
