// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * My Locked Deals Page
 *
 * Shows user's locked deals with status tabs:
 * Active (locked/paid_balance), Picked Up, Expired/Cancelled
 */

import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import CoinIcon from '@/components/ui/CoinIcon';
import { platformAlertConfirm, platformAlertSimple } from '@/utils/platformAlert';
import lockDealApi, { UserLockDeal, UserLockDealStatus } from '@/services/lockDealApi';
import { CardGridSkeleton } from '@/components/skeletons';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
type TabKey = 'active' | 'completed' | 'cancelled';

const TABS: { key: TabKey; label: string; statuses: string }[] = [
  { key: 'active', label: 'Active', statuses: 'locked,paid_balance' },
  { key: 'completed', label: 'Picked Up', statuses: 'picked_up' },
  { key: 'cancelled', label: 'Cancelled/Expired', statuses: 'expired,refunded,cancelled' },
];

const MyLocksPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [locks, setLocks] = useState<UserLockDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchLocks();
  }, [activeTab, authLoading, isAuthenticated]);

  const fetchLocks = async () => {
    try {
      setIsLoading(true);
      const tab = TABS.find(t => t.key === activeTab)!;
      // Pass comma-separated statuses
      const response = await lockDealApi.getMyLocks(tab.statuses as any);

      if (response?.data) {
        if (!isMounted()) return;
        setLocks(Array.isArray(response.data) ? response.data : response.data.data || []);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchLocks();
  }, [activeTab]);

  const handleCancelLock = useCallback(async (lock: UserLockDeal) => {
    const confirmed = await platformAlertConfirm(
      'Cancel Lock?',
      `Are you sure you want to cancel your lock on "${lock.dealSnapshot.title}"?\n\nYour deposit of ${getCurrencySymbol(lock.dealSnapshot.currency)}${lock.depositAmount} will be refunded.`
    );

    if (!confirmed) return;

    try {
      if (!isMounted()) return;
      setCancellingId(lock._id);
      const response = await lockDealApi.cancelLock(lock._id, 'User cancelled');

      if (response?.data?.cancelled) {
        platformAlertSimple(
          'Lock Cancelled',
          `Refund of ${getCurrencySymbol(lock.dealSnapshot.currency)}${response.data.refundAmount} will be processed.`
        );
        fetchLocks();
      }
    } catch (error: any) {
      platformAlertSimple('Error', error?.message || 'Failed to cancel lock');
    } finally {
      if (!isMounted()) return;
      setCancellingId(null);
    }
  }, [fetchLocks]);

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'INR': return '\u20B9';
      case 'AED': return 'AED ';
      case 'USD': return '$';
      default: return '\u20B9';
    }
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getStatusConfig = (status: UserLockDealStatus) => {
    switch (status) {
      case 'locked':
        return { label: 'Locked', color: Colors.warning, bg: Colors.warningScale[50], icon: 'lock-closed' as const };
      case 'paid_balance':
        return { label: 'Balance Paid', color: Colors.info, bg: colors.tint.blue, icon: 'checkmark-circle' as const };
      case 'picked_up':
        return { label: 'Picked Up', color: Colors.success, bg: Colors.successScale[50], icon: 'bag-check' as const };
      case 'expired':
        return { label: 'Expired', color: Colors.error, bg: Colors.errorScale[50], icon: 'time' as const };
      case 'refunded':
        return { label: 'Refunded', color: Colors.text.tertiary, bg: Colors.background.secondary, icon: 'arrow-undo' as const };
      case 'cancelled':
        return { label: 'Cancelled', color: Colors.text.tertiary, bg: Colors.background.secondary, icon: 'close-circle' as const };
      default:
        return { label: status, color: Colors.text.tertiary, bg: Colors.background.secondary, icon: 'help-circle' as const };
    }
  };

  const renderLockCard = useCallback(({ item: lock }: { item: UserLockDeal }) => {
    const snap = lock.dealSnapshot;
    const currSymbol = getCurrencySymbol(snap.currency);
    const statusConfig = getStatusConfig(lock.status);
    const daysLeft = getDaysUntilExpiry(lock.expiresAt);
    const isActive = ['locked', 'paid_balance'].includes(lock.status);
    const isCancelling = cancellingId === lock._id;

    return (
      <View style={styles.lockCard}>
        {/* Top Row: Image + Info */}
        <View style={styles.lockCardTop}>
          <CachedImage source={snap.image} style={styles.lockImage} contentFit="cover" />
          <View style={styles.lockInfo}>
            <Text style={styles.lockTitle} numberOfLines={2}>{snap.title}</Text>
            <Text style={styles.lockStore} numberOfLines={1}>{snap.storeName}</Text>

            <View style={styles.lockPriceRow}>
              <Text style={styles.lockPrice}>{currSymbol}{snap.lockedPrice}</Text>
              <Text style={styles.lockOriginal}>{currSymbol}{snap.originalPrice}</Text>
            </View>

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.lockDetails}>
          {/* Deposit & Balance */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Deposit Paid</Text>
            <Text style={styles.detailValue}>{currSymbol}{lock.depositAmount}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {lock.status === 'paid_balance' || lock.status === 'picked_up' ? 'Balance Paid' : 'Balance Due'}
            </Text>
            <Text style={[styles.detailValue, isActive && lock.status === 'locked' && { color: Colors.warning }]}>
              {currSymbol}{lock.balanceAmount}
            </Text>
          </View>

          {/* Rewards */}
          {(lock.lockRewardCredited || lock.pickupRewardCredited) && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rewards Earned</Text>
              <View style={styles.rewardBadge}>
                <CoinIcon size={12} />
                <Text style={styles.rewardText}>
                  {(lock.lockRewardCredited ? lock.lockRewardAmount : 0) +
                   (lock.pickupRewardCredited ? lock.pickupRewardAmount : 0)}
                </Text>
              </View>
            </View>
          )}

          {/* Pickup Code (for active locks) */}
          {isActive && (
            <View style={styles.pickupCodeSection}>
              <Text style={styles.pickupCodeLabel}>Pickup Code</Text>
              <View style={styles.pickupCodeContainer}>
                <Text style={styles.pickupCode}>{lock.pickupCode}</Text>
              </View>
            </View>
          )}

          {/* Expiry countdown */}
          {isActive && (
            <View style={styles.expiryRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={daysLeft <= 2 ? Colors.error : Colors.text.tertiary}
              />
              <Text style={[styles.expiryText, daysLeft <= 2 && { color: Colors.error, fontWeight: '600' }]}>
                {daysLeft === 0 ? 'Expires today!' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} to pick up`}
              </Text>
            </View>
          )}

          {/* Picked up info */}
          {lock.status === 'picked_up' && lock.pickedUpAt && (
            <View style={styles.expiryRow}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={[styles.expiryText, { color: Colors.success }]}>
                Picked up on {new Date(lock.pickedUpAt).toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Refund info */}
          {lock.refundAmount && lock.refundAmount > 0 && (
            <View style={styles.expiryRow}>
              <Ionicons name="arrow-undo" size={14} color={Colors.text.tertiary} />
              <Text style={styles.expiryText}>Refund: {currSymbol}{lock.refundAmount}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {isActive && (
          <View style={styles.lockActions}>
            {lock.status === 'locked' && (
              <Pressable
                style={styles.payBalanceButton}
                onPress={() => router.push({
                  pathname: '/lock-deals/balance-payment' as any,
                  params: { lockId: lock._id },
                })}
              >
                <Text style={styles.payBalanceText}>Pay Balance</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.cancelButton}
              onPress={() => handleCancelLock(lock)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <Text style={styles.cancelText}>Cancel</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  }, [cancellingId, router, handleCancelLock]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
        </Pressable>
        <Text style={styles.headerTitle}>My Locked Deals</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Lock List */}
      {isLoading ? (
        <CardGridSkeleton />
      ) : (
        <FlashList
          data={locks}
          renderItem={renderLockCard}
          keyExtractor={(item) => item._id}
          estimatedItemSize={120}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={activeTab === 'active' ? 'lock-open-outline' : activeTab === 'completed' ? 'bag-check-outline' : 'time-outline'}
                size={48}
                color={Colors.text.tertiary}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'active' ? 'No active locks' : activeTab === 'completed' ? 'No picked up deals yet' : 'No cancelled or expired deals'}
              </Text>
              {activeTab === 'active' && (
                <Pressable
                  style={styles.browseCta}
                  onPress={() => router.push('/lock-deals' as any)}
                >
                  <Text style={styles.browseCtaText}>Browse Lock Deals</Text>
                </Pressable>
              )}
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.nileBlue,
  },
  tabText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },

  // Lock Card
  lockCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  lockCardTop: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  lockImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
  },
  lockInfo: {
    flex: 1,
  },
  lockTitle: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
    lineHeight: 20,
    marginBottom: 2,
  },
  lockStore: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  lockPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  lockPrice: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  lockOriginal: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '600',
  },

  // Lock Details
  lockDetails: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  detailValue: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.successScale[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rewardText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.success,
  },

  // Pickup Code
  pickupCodeSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  pickupCodeLabel: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  pickupCodeContainer: {
    backgroundColor: Colors.background.secondary,
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  pickupCode: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '800',
    color: Colors.nileBlue,
    letterSpacing: 2,
  },

  // Expiry
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  expiryText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },

  // Actions
  lockActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
  },
  payBalanceButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.success,
    alignItems: 'center',
  },
  payBalanceText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.error,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  browseCta: {
    marginTop: Spacing.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.success,
  },
  browseCtaText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(MyLocksPage, 'LockDealsMyLocks');
