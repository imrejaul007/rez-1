// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { platformAlertSimple } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import partnerApi, { ClaimableOffer } from '@/services/partnerApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface PartnerVouchersSectionProps {
  onVoucherCopied?: (code: string) => void;
  onApplyVoucher?: (code: string) => void;
  compact?: boolean;
}

const COLORS = {
  primary: colors.lightMustard,
  primaryDark: colors.brand.teal,
  gold: colors.brand.goldWarm,
  navy: colors.brand.navyDark,
  surface: '#F7FAFC',
  white: colors.background.primary,
  textPrimary: colors.neutral[800],
  textSecondary: colors.neutral[500],
  border: colors.neutral[200],
};

function PartnerVouchersSection({
  onVoucherCopied,
  onApplyVoucher,
  compact = false,
}: PartnerVouchersSectionProps) {
  const [offers, setOffers] = useState<ClaimableOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchPartnerOffers();
  }, []);

  const fetchPartnerOffers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await partnerApi.getOffers();
      if (response.success && response.data) {
        // Only show claimed offers with voucher codes
        const claimedOffers = response.data.offers.filter(
          (offer) => offer.claimed && (offer as any).voucherCode
        );
        if (!isMounted()) return;
        setOffers(claimedOffers);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load partner vouchers');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleCopyCode = async (voucherCode: string) => {
    try {
      if (!isMounted()) return;
      await Clipboard.setStringAsync(voucherCode);
      platformAlertSimple('Copied!', `Voucher code ${voucherCode} copied to clipboard`);
      onVoucherCopied?.(voucherCode);
    } catch (error) {
      platformAlertSimple('Error', 'Failed to copy voucher code');
    }
  };

  const handleApplyVoucher = (voucherCode: string) => {
    onApplyVoucher?.(voucherCode);
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const getDaysRemaining = (validUntil: string) => {
    const now = new Date();
    const expiry = new Date(validUntil);
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const renderVoucher = ({ item }: { item: ClaimableOffer }) => {
    const voucherCode = (item as any).voucherCode;
    const expired = isExpired(item.validUntil);
    const daysLeft = getDaysRemaining(item.validUntil);

    return (
      <View style={[styles.voucherCard, expired && styles.voucherExpired]}>
        {/* Left Badge */}
        <View style={styles.voucherLeft}>
          <LinearGradient
            colors={expired ? [colors.neutral[400], colors.neutral[500]] : [COLORS.primary, COLORS.primaryDark]}
            style={styles.voucherBadge}
          >
            <Text style={styles.voucherDiscount}>{item.discount}%</Text>
            <Text style={styles.voucherOff}>OFF</Text>
          </LinearGradient>
        </View>

        {/* Main Content */}
        <View style={styles.voucherContent}>
          <View style={styles.voucherHeader}>
            <Text style={styles.voucherTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          </View>

          <Text style={styles.voucherDescription} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Voucher Code */}
          <View style={styles.codeContainer}>
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>CODE:</Text>
              <Text style={styles.codeText}>{voucherCode}</Text>
            </View>
            <Pressable
              style={styles.copyButton}
              onPress={() => handleCopyCode(voucherCode)}
            >
              <Ionicons name="copy-outline" size={18} color={COLORS.primary} />
            </Pressable>
          </View>

          {/* Expiry Info */}
          <View style={styles.expiryRow}>
            <Ionicons
              name={expired ? 'close-circle' : 'time-outline'}
              size={14}
              color={expired ? colors.error : COLORS.textSecondary}
            />
            <Text
              style={[styles.expiryText, expired && styles.expiryTextExpired]}
            >
              {expired
                ? 'Expired'
                : daysLeft <= 3
                ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                : `Valid until ${new Date(item.validUntil).toLocaleDateString()}`}
            </Text>
          </View>
        </View>

        {/* Apply Button */}
        {!expired && onApplyVoucher && (
          <Pressable
            style={styles.applyButton}
            onPress={() => handleApplyVoucher(voucherCode)}
          >
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </Pressable>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading partner vouchers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={32} color={COLORS.textSecondary} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchPartnerOffers}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (offers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="ticket-outline" size={48} color={COLORS.textSecondary} />
        <Text style={styles.emptyTitle}>No Partner Vouchers</Text>
        <Text style={styles.emptyText}>
          Claim offers from your Partner Profile to get exclusive vouchers!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!compact && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="ribbon" size={20} color={COLORS.primary} />
            <Text style={styles.headerTitle}>Partner Vouchers</Text>
          </View>
          <Text style={styles.voucherCount}>{offers.length} voucher{offers.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      <FlashList
        data={offers}
        keyExtractor={(item) => item.id}
        renderItem={renderVoucher}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!compact}
        estimatedItemSize={80}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  voucherCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  voucherCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  voucherExpired: {
    opacity: 0.6,
  },
  voucherLeft: {
    width: 72,
  },
  voucherBadge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  voucherDiscount: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  voucherOff: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  voucherContent: {
    flex: 1,
    padding: 12,
  },
  voucherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  voucherTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  categoryBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  voucherDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  codeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  copyButton: {
    padding: 4,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  expiryTextExpired: {
    color: colors.error,
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default React.memo(PartnerVouchersSection);
