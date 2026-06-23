// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Received & Sent Gifts Page
// View received gifts (with claim flow) and sent gifts history

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import walletApi from '@/services/walletApi';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { handleWalletError } from '@/utils/walletErrorHandler';
import { CardGridSkeleton } from '@/components/skeletons';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface Gift {
  _id: string;
  sender?: { fullName?: string; phoneNumber?: string; profile?: { avatar?: string } };
  recipient?: { fullName?: string; phoneNumber?: string; profile?: { avatar?: string } };
  amount: number;
  coinType: string;
  theme: string;
  message?: string;
  status: 'pending' | 'delivered' | 'claimed' | 'expired';
  deliveryType: 'instant' | 'scheduled';
  scheduledAt?: string;
  claimedAt?: string;
  expiresAt: string;
  createdAt: string;
}

const THEME_EMOJIS: Record<string, string> = {
  birthday: '🎂',
  christmas: '🎄',
  gift: '🎁',
  love: '💝',
  thanks: '🙏',
  congrats: '🎉',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: colors.warningScale[400], bg: colors.tint.amberLight },
  delivered: { label: 'Unclaimed', color: colors.infoScale[400], bg: colors.tint.blueLight },
  claimed: { label: 'Claimed', color: colors.successScale[400], bg: colors.tint.green },
  expired: { label: 'Expired', color: colors.neutral[500], bg: colors.neutral[100] },
};

function GiftsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [receivedGifts, setReceivedGifts] = useState<Gift[]>([]);
  const [sentGifts, setSentGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchGifts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      if (activeTab === 'received') {
        const res = await walletApi.getReceivedGifts();
        if (!isMounted()) return;
        setReceivedGifts(res?.data?.gifts ?? []);
      } else {
        const res = await walletApi.getSentGifts();
        if (!isMounted()) return;
        setSentGifts(res?.data?.gifts ?? []);
      }
    } catch {
      // silently fail — show empty state
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [activeTab]);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchGifts();
  }, [fetchGifts]);

  const handleClaim = useCallback(async (gift: Gift) => {
    const confirmed = await platformAlertConfirm(
      'Claim Gift',
      `Claim ${gift.amount} ${BRAND.CURRENCY_CODE} from ${gift.sender?.fullName || gift.sender?.phoneNumber || 'someone'}?`
    );
    if (!confirmed) return;

    if (!isMounted()) return;
    setClaimingId(gift._id);
    try {
      const res = await walletApi.claimGift(gift._id);
      if (res?.success) {
        platformAlertSimple('Gift Claimed!', `${res.data?.amount || gift.amount} ${BRAND.CURRENCY_CODE} added to your wallet`);
        // Update the gift status locally
        setReceivedGifts(prev =>
          prev.map(g => g._id === gift._id ? { ...g, status: 'claimed' as const, claimedAt: new Date().toISOString() } : g)
        );
      }
    } catch (err: any) {
      handleWalletError(err, 'Claim Failed');
    } finally {
      if (!isMounted()) return;
      setClaimingId(null);
    }
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTimeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const renderReceivedGift = useCallback(({ item }: { item: Gift }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const emoji = THEME_EMOJIS[item.theme] || '🎁';
    const senderName = item.sender?.fullName || item.sender?.phoneNumber || 'Someone';
    const canClaim = item.status === 'delivered';

    return (
      <View style={styles.giftCard}>
        <View style={styles.giftCardHeader}>
          <View style={styles.emojiContainer}>
            <ThemedText style={styles.emoji}>{emoji}</ThemedText>
          </View>
          <View style={styles.giftInfo}>
            <ThemedText style={styles.giftAmount}>{item.amount} {BRAND.CURRENCY_CODE}</ThemedText>
            <ThemedText style={styles.giftSender}>From {senderName}</ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <ThemedText style={[styles.statusText, { color: status.color }]}>{status.label}</ThemedText>
          </View>
        </View>

        {item.message ? (
          <View style={styles.messageBox}>
            <ThemedText style={styles.messageText}>"{item.message}"</ThemedText>
          </View>
        ) : null}

        <View style={styles.giftCardFooter}>
          <ThemedText style={styles.dateText}>{formatDate(item.createdAt)}</ThemedText>
          {canClaim && (
            <View style={styles.footerRight}>
              <ThemedText style={styles.expiryText}>{getTimeLeft(item.expiresAt)}</ThemedText>
              <Pressable
                style={styles.claimButton}
                onPress={() => handleClaim(item)}
                disabled={claimingId === item._id}
              >
                {claimingId === item._id ? (
                  <ActivityIndicator size="small" color={colors.background.primary} />
                ) : (
                  <ThemedText style={styles.claimButtonText}>Claim</ThemedText>
                )}
              </Pressable>
            </View>
          )}
          {item.status === 'claimed' && item.claimedAt && (
            <ThemedText style={styles.claimedText}>Claimed {formatDate(item.claimedAt)}</ThemedText>
          )}
        </View>
      </View>
    );
  }, [claimingId, handleClaim]);

  const renderSentGift = useCallback(({ item }: { item: Gift }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const emoji = THEME_EMOJIS[item.theme] || '🎁';
    const recipientName = item.recipient?.fullName || item.recipient?.phoneNumber || 'Someone';

    return (
      <View style={styles.giftCard}>
        <View style={styles.giftCardHeader}>
          <View style={styles.emojiContainer}>
            <ThemedText style={styles.emoji}>{emoji}</ThemedText>
          </View>
          <View style={styles.giftInfo}>
            <ThemedText style={styles.giftAmount}>{item.amount} {BRAND.CURRENCY_CODE}</ThemedText>
            <ThemedText style={styles.giftSender}>To {recipientName}</ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <ThemedText style={[styles.statusText, { color: status.color }]}>{status.label}</ThemedText>
          </View>
        </View>

        {item.message ? (
          <View style={styles.messageBox}>
            <ThemedText style={styles.messageText}>"{item.message}"</ThemedText>
          </View>
        ) : null}

        <View style={styles.giftCardFooter}>
          <ThemedText style={styles.dateText}>{formatDate(item.createdAt)}</ThemedText>
          {item.deliveryType === 'scheduled' && item.scheduledAt && (
            <ThemedText style={styles.scheduledText}>Scheduled: {formatDate(item.scheduledAt)}</ThemedText>
          )}
        </View>
      </View>
    );
  }, []);

  const gifts = activeTab === 'received' ? receivedGifts : sentGifts;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>My Gifts</ThemedText>
          <Pressable style={styles.sendButton} onPress={() => router.push('/wallet/gift')}>
            <Ionicons name="gift-outline" size={22} color={colors.background.primary} />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === 'received' && styles.tabActive]}
            onPress={() => setActiveTab('received')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
              Received
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
            onPress={() => setActiveTab('sent')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'sent' && styles.tabTextActive]}>
              Sent
            </ThemedText>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <CardGridSkeleton />
      ) : (
        <FlashList
          data={gifts}
          renderItem={activeTab === 'received' ? renderReceivedGift : renderSentGift}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchGifts(true)} colors={[Colors.primary[600]]} />
          }
          estimatedItemSize={100}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={64} color={Colors.gray[300]} />
              <ThemedText style={styles.emptyTitle}>
                No {activeTab === 'received' ? 'Received' : 'Sent'} Gifts
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {activeTab === 'received'
                  ? 'When someone sends you coins, they will appear here'
                  : 'Gift coins to friends and family to see them here'}
              </ThemedText>
              {activeTab === 'sent' && (
                <Pressable style={styles.emptyButton} onPress={() => router.push('/wallet/gift')}>
                  <ThemedText style={styles.emptyButtonText}>Send a Gift</ThemedText>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
  },
  sendButton: {
    padding: Spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.background.primary,
  },
  tabText: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.8)',
  },
  tabTextActive: {
    color: Colors.primary[600],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  giftCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  giftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[600] + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  giftInfo: {
    flex: 1,
  },
  giftAmount: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  giftSender: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  messageBox: {
    backgroundColor: Colors.gray[50] || colors.neutral[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  messageText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  giftCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  expiryText: {
    ...Typography.caption,
    color: colors.warningScale[400],
    fontWeight: '600',
  },
  claimButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  claimButtonText: {
    ...Typography.labelSmall,
    color: colors.background.primary,
  },
  claimedText: {
    ...Typography.caption,
    color: colors.successScale[400],
  },
  scheduledText: {
    ...Typography.caption,
    color: colors.infoScale[400],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  emptyButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
});

export default withErrorBoundary(GiftsPage, 'WalletGifts');
