// VouchersSection.tsx
// Displays available store vouchers in horizontal scrollable list

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Clipboard,
  Platform} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import storeVouchersApi, { StoreVoucher } from '@/services/storeVouchersApi';
import VoucherCardSkeleton from '@/components/skeletons/VoucherCardSkeleton';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface VouchersSectionProps {
  storeId: string;
  storeName: string;
}

const VouchersSection: React.FC<VouchersSectionProps> = ({ storeId, storeName }) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const router = useRouter();
  const [vouchers, setVouchers] = useState<StoreVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadVouchers();
  }, [storeId]);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const response = await storeVouchersApi.getStoreVouchers(storeId, { limit: 5 });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setVouchers(response.data.vouchers || []);
      }
    } catch (error) {
      // Load mock vouchers as fallback
      if (!isMounted()) return;
      setVouchers(getMockVouchers(storeId));
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string, voucherName: string) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(code);
    } else {
      Clipboard.setString(code);
    }

    platformAlertSimple('Code Copied!', `Voucher code "${code}" has been copied to clipboard.`);
  };

  const handleClaimVoucher = async (voucherId: string, voucherName: string) => {
    try {
      const response = await storeVouchersApi.claimVoucher(voucherId);

      if (response.success) {
        platformAlertSimple('Voucher Claimed!', `${voucherName} has been added to your vouchers.`);
        loadVouchers(); // Refresh voucher list
      }
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to claim voucher');
    }
  };

  const handleViewAll = () => {
    router.push(`/my-vouchers?storeId=${storeId}`);
  };

  const formatDiscountBadge = (voucher: StoreVoucher) => {
    if (voucher.discountType === 'percentage') {
      return `${voucher.discountValue}% OFF`;
    } else {
      return `${currencySymbol}${voucher.discountValue} OFF`;
    }
  };

  const formatValidity = (validUntil: string) => {
    const date = new Date(validUntil);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    if (diffDays <= 7) return `${diffDays} days left`;

    return `Valid until ${date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Available Vouchers</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={false}
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <VoucherCardSkeleton key={index} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (vouchers.length === 0) {
    return null; // Don't show section if no vouchers
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Vouchers</Text>
        <Pressable onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {vouchers.map((voucher) => (
          <View key={voucher._id} style={styles.voucherCard}>
            {/* Discount Badge */}
            <View style={styles.discountBadge}>
              <Ionicons name="pricetag" size={16} color={colors.background.primary} />
              <Text style={styles.discountText}>
                {formatDiscountBadge(voucher)}
              </Text>
            </View>

            {/* Voucher Code */}
            <View style={styles.codeContainer}>
              <View style={styles.codeDashed}>
                <Text style={styles.codeText}>{voucher.code}</Text>
              </View>
            </View>

            {/* Voucher Details */}
            <Text style={styles.voucherName} numberOfLines={2}>
              {voucher.name}
            </Text>

            {/* Terms */}
            <View style={styles.termsContainer}>
              <Ionicons name="information-circle-outline" size={14} color={colors.neutral[500]} />
              <Text style={styles.termsText} numberOfLines={2}>
                Min. bill {currencySymbol}{voucher.minBillAmount}
                {voucher.maxDiscountAmount && ` • Max ${currencySymbol}${voucher.maxDiscountAmount}`}
              </Text>
            </View>

            {/* Validity */}
            <View style={styles.validityContainer}>
              <Ionicons name="time-outline" size={14} color={colors.successScale[700]} />
              <Text style={styles.validityText}>
                {formatValidity(voucher.validUntil)}
              </Text>
            </View>

            {/* Action Button */}
            {voucher.isAssigned ? (
              <Pressable
                style={styles.copiedButton}
                disabled
              >
                <Ionicons name="checkmark-circle" size={16} color={colors.successScale[700]} />
                <Text style={styles.copiedButtonText}>Claimed</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.copyButton}
                onPress={() => handleClaimVoucher(voucher._id, voucher.name)}
               
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.brand.purple} />
                <Text style={styles.copyButtonText}>Claim Voucher</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// Mock vouchers for fallback
const getMockVouchers = (storeId: string): StoreVoucher[] => [
  {
    _id: 'voucher-1',
    code: 'SAVE20',
    store: { _id: storeId, name: 'Store' },
    name: 'Get 20% off on your bill',
    description: 'Save 20% on entire bill',
    type: 'store_visit',
    discountType: 'percentage',
    discountValue: 20,
    minBillAmount: 500,
    maxDiscountAmount: 100,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    restrictions: {
      isOfflineOnly: true,
      notValidAboveStoreDiscount: false,
      singleVoucherPerBill: true,
    },
    usageLimit: 100,
    usedCount: 0,
    isActive: true,
    canRedeem: true,
    isAssigned: false,
  },
  {
    _id: 'voucher-2',
    code: 'FIRST500',
    store: { _id: storeId, name: 'Store' },
    name: 'Flat 500 off on first visit',
    description: 'First time customer discount',
    type: 'first_purchase',
    discountType: 'fixed',
    discountValue: 500,
    minBillAmount: 2000,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    restrictions: {
      isOfflineOnly: false,
      notValidAboveStoreDiscount: true,
      singleVoucherPerBill: true,
    },
    usageLimit: 50,
    usedCount: 0,
    isActive: true,
    canRedeem: true,
    isAssigned: false,
  },
  {
    _id: 'voucher-3',
    code: 'WEEKEND15',
    store: { _id: storeId, name: 'Store' },
    name: 'Weekend Special - 15% off',
    description: 'Valid on Saturdays and Sundays',
    type: 'promotional',
    discountType: 'percentage',
    discountValue: 15,
    minBillAmount: 300,
    maxDiscountAmount: 150,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    restrictions: {
      isOfflineOnly: true,
      notValidAboveStoreDiscount: false,
      singleVoucherPerBill: true,
    },
    usageLimit: 200,
    usedCount: 45,
    isActive: true,
    canRedeem: true,
    isAssigned: false,
  },
];

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purple,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  voucherCard: {
    width: 280,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.purple,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.white,
  },
  codeContainer: {
    marginBottom: 12,
  },
  codeDashed: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.brand.purple,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.purple,
    letterSpacing: 2,
  },
  voucherName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 8,
    lineHeight: 20,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: colors.neutral[500],
    lineHeight: 16,
  },
  validityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  validityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.successScale[700],
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint.pink,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purple,
  },
  copiedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint.green,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  copiedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.successScale[700],
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
});

export default React.memo(VouchersSection);
