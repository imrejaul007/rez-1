import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Cashback Page
// View and manage cashback earnings — Cash Store theme

import React, { useState, useEffect, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Text
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import cashbackService, {
  CashbackSummary,
  UserCashback,
  CashbackCampaign } from '@/services/cashbackApi';
import cashStoreApi, { AffiliatePurchase, AffiliateCashbackSummary } from '@/services/cashStoreApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { TransactionListSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type SourceType = 'store' | 'cashstore';
type TabType = 'all' | 'pending' | 'credited' | 'expired';

function CashbackPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSource, setActiveSource] = useState<SourceType>('store');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [summary, setSummary] = useState<CashbackSummary>({
    totalEarned: 0,
    pending: 0,
    credited: 0,
    expired: 0,
    cancelled: 0,
    pendingCount: 0,
    creditedCount: 0,
    expiredCount: 0,
    cancelledCount: 0 });
  const [cashbacks, setCashbacks] = useState<UserCashback[]>([]);
  const [pendingReady, setPendingReady] = useState<UserCashback[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<UserCashback[]>([]);
  const [campaigns, setCampaigns] = useState<CashbackCampaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  // ─── Cash Store Affiliate State ──────────────────────────────
  const [affiliatePurchases, setAffiliatePurchases] = useState<AffiliatePurchase[]>([]);
  const [affiliateSummary, setAffiliateSummary] = useState<AffiliateCashbackSummary | null>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);

  // Animations
  const totalAnim = useSharedValue(0);
  const totalAnimStyle = useAnimatedStyle(() => ({
    opacity: totalAnim.value,
  }));

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeSource === 'store') loadCashbackHistory();
    else loadAffiliateData();
  }, [activeTab, activeSource]);

  useEffect(() => {
    totalAnim.value = withTiming(1, { duration: 600 });
  }, [summary.totalEarned]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, pendingRes, expiringSoonRes, campaignsRes] = await Promise.allSettled([
        cashbackService.getCashbackSummary(),
        cashbackService.getPendingCashback(),
        cashbackService.getExpiringSoon(7),
        cashbackService.getActiveCampaigns(),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value.success && summaryRes.value.data) {
        if (!isMounted()) return;
        setSummary(summaryRes.value.data);
      } else if (summaryRes.status === 'rejected') {
        if (!isMounted()) return;
        setError('Failed to load cashback summary');
      }

      if (pendingRes.status === 'fulfilled' && pendingRes.value.success && pendingRes.value.data) {
        if (!isMounted()) return;
        setPendingReady(pendingRes.value.data.cashbacks || []);
      }

      if (expiringSoonRes.status === 'fulfilled' && expiringSoonRes.value.success && expiringSoonRes.value.data) {
        if (!isMounted()) return;
        setExpiringSoon(expiringSoonRes.value.data.cashbacks || []);
      }

      if (campaignsRes.status === 'fulfilled' && campaignsRes.value.success && campaignsRes.value.data) {
        if (!isMounted()) return;
        setCampaigns(campaignsRes.value.data.campaigns || []);
      }

      await loadCashbackHistory();
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load cashback data. Pull down to retry.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const loadCashbackHistory = async () => {
    try {
      const filters: any = { page: 1, limit: 20 };
      if (activeTab !== 'all') {
        filters.status = activeTab;
      }
      const response = await cashbackService.getCashbackHistory(filters);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setCashbacks(response.data.cashbacks || []);
        if (!isMounted()) return;
        setHistoryTotal(response.data.total || 0);
        if (!isMounted()) return;
        setHistoryPage(1);
      } else {
        if (!isMounted()) return;
        setCashbacks([]);
      }
    } catch (err) {
      if (!isMounted()) return;
      setCashbacks([]);
    }
  };

  const loadAffiliateData = async () => {
    setAffiliateLoading(true);
    try {
      const [summaryRes, purchasesRes] = await Promise.allSettled([
        cashStoreApi.getCashbackSummary(),
        cashStoreApi.getUserPurchases(1, 20),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        if (!isMounted()) return;
        setAffiliateSummary(summaryRes.value);
      }

      if (purchasesRes.status === 'fulfilled' && purchasesRes.value) {
        if (!isMounted()) return;
        let filtered = purchasesRes.value.purchases || [];
        if (activeTab === 'pending') filtered = filtered.filter(p => p.status === 'pending' || p.status === 'confirmed');
        else if (activeTab === 'credited') filtered = filtered.filter(p => p.status === 'credited');
        else if (activeTab === 'expired') filtered = filtered.filter(p => p.status === 'rejected' || p.status === 'refunded');
        setAffiliatePurchases(filtered);
      }
    } catch {
      // silent
    } finally {
      if (!isMounted()) return;
      setAffiliateLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    if (!isMounted()) return;
    setRefreshing(false);
  }, []);

  const handleRedeemCashback = useCallback(async () => {
    if (isRedeeming || pendingReady.length === 0) return;

    const totalAmount = pendingReady.reduce((sum, cb) => sum + cb.amount, 0);

    platformAlertConfirm(
      'Redeem Cashback',
      `Transfer ${currencySymbol}${totalAmount.toFixed(2)} to your wallet?`,
      async () => {
        setIsRedeeming(true);
        try {
          const response = await cashbackService.redeemCashback();
          if (response.success) {
            platformAlertSimple(
              'Cashback Redeemed!',
              `${currencySymbol}${response.data?.totalAmount?.toFixed(2) || totalAmount.toFixed(2)} has been added to your wallet.`
            );
            loadData();
          } else {
            platformAlertSimple('Error', response.error || 'Failed to redeem cashback');
          }
        } catch {
          platformAlertSimple('Error', 'Failed to redeem cashback. Please try again.');
        } finally {
          if (!isMounted()) return;
          setIsRedeeming(false);
        }
      },
      'Redeem Now'
    );
  }, [isRedeeming, pendingReady, currencySymbol]);

  const formatAmount = (amount: number) => {
    return `${currencySymbol}${(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric' });
  };

  const getSourceIcon = (source: string): string => {
    switch (source) {
      case 'order': return 'cart-outline';
      case 'referral': return 'people-outline';
      case 'promotion': return 'gift-outline';
      case 'special_offer': return 'star-outline';
      case 'bonus': return 'trophy-outline';
      case 'signup': return 'person-add-outline';
      case 'mall_purchase': return 'storefront-outline';
      default: return 'cash-outline';
    }
  };

  const getSourceLabel = (source: string): string => {
    switch (source) {
      case 'order': return 'Order';
      case 'referral': return 'Referral';
      case 'promotion': return 'Promo';
      case 'special_offer': return 'Offer';
      case 'bonus': return 'Bonus';
      case 'signup': return 'Signup';
      case 'mall_purchase': return 'Mall';
      default: return 'Cashback';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.warning;
      case 'credited': return Colors.success;
      case 'expired': return Colors.error;
      case 'cancelled': return Colors.text.secondary;
      default: return Colors.text.secondary;
    }
  };

  const getAffiliatePurchaseStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.warning;
      case 'confirmed': return '#3B82F6';
      case 'credited': return Colors.success;
      case 'rejected': case 'refunded': return Colors.error;
      default: return Colors.text.secondary;
    }
  };

  const headerTop = Platform.OS === 'web' ? 0 : insets.top;

  // ─── Loading State ─────────────────────────────────────────
  if (loading && cashbacks.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={[styles.header, { paddingTop: headerTop }]}>
          <View style={styles.headerContent}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="chevron-back" size={20} color={Colors.nileBlue} />
            </Pressable>
            <Text style={styles.headerTitle}>Track Cashback</Text>
            <View style={{ width: Spacing['2xl'] }} />
          </View>
        </View>
        <TransactionListSkeleton />
      </View>
    );
  }

  // Active summary values
  const hasRedeemable = pendingReady.length > 0;
  const redeemableAmount = summary.pending || pendingReady.reduce((sum, cb) => sum + cb.amount, 0);
  const hasExpiringSoon = expiringSoon.length > 0;
  const expiringAmount = expiringSoon.reduce((sum, cb) => sum + cb.amount, 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: headerTop }]}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={Colors.nileBlue} />
          </Pressable>
          <Text style={styles.headerTitle}>Track Cashback</Text>
          <Pressable onPress={() => router.push('/wallet' as any)} style={styles.walletButton}>
            <Ionicons name="wallet-outline" size={18} color={Colors.nileBlue} />
          </Pressable>
        </View>
      </View>

      {/* ─── Source Toggle (Store vs Cash Store) ─────────────── */}
      <View style={styles.sourceToggleRow}>
        <Pressable
          style={[styles.sourceToggle, activeSource === 'store' && styles.sourceToggleActive]}
          onPress={() => setActiveSource('store')}
        >
          <Ionicons name="storefront-outline" size={14} color={activeSource === 'store' ? Colors.text.inverse : '#7C8A97'} />
          <Text style={[styles.sourceToggleText, activeSource === 'store' && styles.sourceToggleTextActive]}>Store Cashback</Text>
        </Pressable>
        <Pressable
          style={[styles.sourceToggle, activeSource === 'cashstore' && styles.sourceToggleActive]}
          onPress={() => setActiveSource('cashstore')}
        >
          <Ionicons name="globe-outline" size={14} color={activeSource === 'cashstore' ? Colors.text.inverse : '#7C8A97'} />
          <Text style={[styles.sourceToggleText, activeSource === 'cashstore' && styles.sourceToggleTextActive]}>Cash Store</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand.sand}
            colors={[colors.brand.sand]}
          />
        }
      >
        {/* ─── Cash Store Affiliate View ────────────────────────── */}
        {activeSource === 'cashstore' ? (
          <View>
            {/* Affiliate Summary Hero */}
            <Animated.View style={[styles.heroCard, totalAnimStyle]}>
              <LinearGradient
                colors={[colors.nileBlue, '#234b6b']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                <View style={[styles.decoCircle, { top: -20, right: -20, width: 80, height: 80 }]} />
                <View style={[styles.decoCircle, { bottom: -15, left: -15, width: 60, height: 60 }]} />
                <View style={styles.heroRow}>
                  <View style={styles.heroLeft}>
                    <Text style={styles.heroLabel}>Total Coins Earned</Text>
                    <Text style={styles.heroAmount}>{affiliateSummary?.totalCoinsEarned ?? 0} coins</Text>
                  </View>
                  <View style={styles.heroIconWrap}>
                    <Ionicons name="globe" size={28} color="rgba(232,184,150,0.6)" />
                  </View>
                </View>
                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStat}>
                    <View style={[styles.heroStatDot, { backgroundColor: Colors.warning }]} />
                    <Text style={styles.heroStatLabel}>Pending</Text>
                    <Text style={styles.heroStatValue}>{affiliateSummary?.pendingCoins ?? 0}</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <View style={[styles.heroStatDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={styles.heroStatLabel}>Confirmed</Text>
                    <Text style={styles.heroStatValue}>{affiliateSummary?.confirmedCoins ?? 0}</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStat}>
                    <View style={[styles.heroStatDot, { backgroundColor: Colors.success }]} />
                    <Text style={styles.heroStatLabel}>Credited</Text>
                    <Text style={styles.heroStatValue}>{affiliateSummary?.creditedCoins ?? 0}</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* History Tabs */}
            <View style={styles.tabsContainer}>
              {(['all', 'pending', 'credited', 'expired'] as TabType[]).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    style={[styles.tab, isActive && styles.activeTab]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                      {tab === 'expired' ? 'Rejected' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Affiliate Purchase List */}
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Affiliate Purchases</Text>
              {affiliateLoading ? (
                <ActivityIndicator size="large" color={colors.brand.sand} style={{ marginTop: 20 }} />
              ) : affiliatePurchases.length > 0 ? (
                affiliatePurchases.map((purchase) => (
                  <View key={purchase._id} style={styles.historyCard}>
                    <View style={[styles.historyIcon, { backgroundColor: `${getAffiliatePurchaseStatusColor(purchase.status)}12` }]}>
                      <Ionicons name="globe-outline" size={20} color={getAffiliatePurchaseStatusColor(purchase.status)} />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyDesc} numberOfLines={1}>
                        {purchase.brand?.name || 'Online Purchase'}
                      </Text>
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyDate}>{formatDate(purchase.purchasedAt)}</Text>
                        <View style={styles.historyDot} />
                        <Text style={styles.historyDate}>{formatAmount(purchase.orderAmount)}</Text>
                      </View>
                      {/* Purchase Timeline (CS-M02) */}
                      {(purchase.status === 'pending' || purchase.status === 'confirmed') && (
                        <View style={styles.historyExpiryRow}>
                          <Ionicons name="time-outline" size={11} color={Colors.warning} />
                          <Text style={styles.historyExpiryText}>
                            {purchase.status === 'pending' ? 'Awaiting confirmation' : 'Confirmed — coins crediting soon'}
                          </Text>
                        </View>
                      )}
                      {purchase.creditedAt && (
                        <View style={styles.historyExpiryRow}>
                          <Ionicons name="checkmark-circle-outline" size={11} color={Colors.success} />
                          <Text style={[styles.historyExpiryText, { color: Colors.success }]}>
                            Credited {formatDate(purchase.creditedAt)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={[styles.historyAmount, { color: getAffiliatePurchaseStatusColor(purchase.status) }]}>
                        {purchase.actualCashback} coins
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: `${getAffiliatePurchaseStatusColor(purchase.status)}15` }]}>
                        <Text style={[styles.statusPillText, { color: getAffiliatePurchaseStatusColor(purchase.status) }]}>
                          {purchase.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="globe-outline" size={32} color="#C4956A" />
                  </View>
                  <Text style={styles.emptyText}>No affiliate purchases</Text>
                  <Text style={styles.emptySubtext}>Shop through Cash Store brands to earn coins!</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
        <>
        {/* ─── Total Earned Hero ──────────────────────────────── */}
        <Animated.View style={[styles.heroCard, totalAnimStyle]}>
          <LinearGradient
            colors={[colors.nileBlue, '#234b6b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Decorative circles */}
            <View style={[styles.decoCircle, { top: -20, right: -20, width: 80, height: 80 }]} />
            <View style={[styles.decoCircle, { bottom: -15, left: -15, width: 60, height: 60 }]} />

            <View style={styles.heroRow}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroLabel}>Total Earned</Text>
                <Text style={styles.heroAmount}>{formatAmount(summary.totalEarned)}</Text>
              </View>
              <View style={styles.heroIconWrap}>
                <Ionicons name="trending-up" size={28} color="rgba(232,184,150,0.6)" />
              </View>
            </View>

            {/* Mini stats row */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <View style={[styles.heroStatDot, { backgroundColor: Colors.warning }]} />
                <Text style={styles.heroStatLabel}>Pending</Text>
                <Text style={styles.heroStatValue}>{formatAmount(summary.pending)}</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <View style={[styles.heroStatDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.heroStatLabel}>Credited</Text>
                <Text style={styles.heroStatValue}>{formatAmount(summary.credited)}</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <View style={[styles.heroStatDot, { backgroundColor: Colors.error }]} />
                <Text style={styles.heroStatLabel}>Expired</Text>
                <Text style={styles.heroStatValue}>{formatAmount(summary.expired)}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ─── Summary Cards (2x2 grid) ──────────────────────── */}
        <View style={styles.summarySection}>
          <View style={styles.summaryGrid}>
            <SummaryCard
              title="Pending"
              amount={summary.pending}
              count={summary.pendingCount}
              color={Colors.warning}
              icon="hourglass-outline"
              currencySymbol={currencySymbol}
            />
            <SummaryCard
              title="Credited"
              amount={summary.credited}
              count={summary.creditedCount}
              color={Colors.success}
              icon="checkmark-circle-outline"
              currencySymbol={currencySymbol}
            />
          </View>
          <View style={styles.summaryGrid}>
            <SummaryCard
              title="Expired"
              amount={summary.expired}
              count={summary.expiredCount}
              color={Colors.error}
              icon="time-outline"
              currencySymbol={currencySymbol}
            />
            <SummaryCard
              title="Cancelled"
              amount={summary.cancelled}
              count={summary.cancelledCount}
              color={Colors.text.secondary}
              icon="close-circle-outline"
              currencySymbol={currencySymbol}
            />
          </View>
        </View>

        {/* ─── Redeem Section ────────────────────────────────── */}
        {hasRedeemable && (
          <Pressable
            style={styles.redeemCard}
            onPress={handleRedeemCashback}
            disabled={isRedeeming}
           
          >
            <LinearGradient
              colors={[colors.successScale[400], colors.successScale[700]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.redeemGradient}
            >
              <View style={styles.redeemLeft}>
                <View style={styles.redeemIconWrap}>
                  <Ionicons name="flash" size={18} color={Colors.text.inverse} />
                </View>
                <View>
                  <Text style={styles.redeemLabel}>Ready to Redeem</Text>
                  <Text style={styles.redeemAmount}>{formatAmount(redeemableAmount)}</Text>
                </View>
              </View>
              <View style={styles.redeemBtn}>
                {isRedeeming ? (
                  <ActivityIndicator size="small" color={Colors.success} />
                ) : (
                  <>
                    <Text style={styles.redeemBtnText}>Redeem</Text>
                    <Ionicons name="arrow-forward" size={14} color={Colors.success} />
                  </>
                )}
              </View>
            </LinearGradient>
          </Pressable>
        )}

        {/* ─── Expiring Soon Warning ─────────────────────────── */}
        {hasExpiringSoon && (
          <View style={styles.expiringCard}>
            <View style={styles.expiringIcon}>
              <Ionicons name="warning" size={18} color={Colors.warning} />
            </View>
            <View style={styles.expiringContent}>
              <Text style={styles.expiringTitle}>
                {expiringAmount > 0 ? formatAmount(expiringAmount) : ''} expiring soon
              </Text>
              <Text style={styles.expiringSubtext}>
                {expiringSoon.length} cashback{expiringSoon.length !== 1 ? 's' : ''} expire within 7 days
              </Text>
            </View>
            <Pressable
              onPress={() => setActiveTab('pending')}
              style={styles.expiringAction}
            >
              <Text style={styles.expiringActionText}>View</Text>
            </Pressable>
          </View>
        )}

        {/* ─── Double Cashback ──────────────────────────────── */}
        {campaigns.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Double Cashback</Text>
              <Pressable onPress={() => router.push('/offers/double-cashback' as any)}>
                <Text style={styles.seeAllText}>See All</Text>
              </Pressable>
            </View>
            {campaigns.map((campaign) => (
              <View key={campaign.id} style={styles.campaignCard}>
                <LinearGradient
                  colors={[colors.nileBlue, '#0f2536']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.campaignGradient}
                >
                  <View style={styles.campaignRow}>
                    <View style={styles.campaignInfo}>
                      <Text style={styles.campaignName}>{campaign.name}</Text>
                      <Text style={styles.campaignDesc}>{campaign.description}</Text>
                    </View>
                    <View style={styles.campaignRateBadge}>
                      <Text style={styles.campaignRateValue}>{campaign.cashbackRate}x</Text>
                    </View>
                  </View>
                  {campaign.categories.length > 0 && (
                    <View style={styles.campaignTags}>
                      {campaign.categories.slice(0, 4).map((cat, idx) => (
                        <View key={idx} style={styles.campaignTag}>
                          <Text style={styles.campaignTagText}>{cat}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {campaign.validTo && (
                    <Text style={styles.campaignValidity}>
                      Valid till {formatDate(campaign.validTo)}
                    </Text>
                  )}
                </LinearGradient>
              </View>
            ))}
          </View>
        )}

        {/* ─── Quick Actions ─────────────────────────────────── */}
        <View style={styles.quickActions}>
          <Pressable
            style={styles.quickAction}
            onPress={() => router.push('/wallet' as any)}
           
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.success + '1A' }]}>
              <Ionicons name="wallet-outline" size={18} color={Colors.success} />
            </View>
            <Text style={styles.quickActionLabel}>My Wallet</Text>
          </Pressable>
          <Pressable
            style={styles.quickAction}
            onPress={() => router.push('/cash-store/offers' as any)}
           
          >
            <View style={[styles.quickActionIcon, { backgroundColor: Colors.warning + '1A' }]}>
              <Ionicons name="flash-outline" size={18} color={Colors.warning} />
            </View>
            <Text style={styles.quickActionLabel}>Offers</Text>
          </Pressable>
          <Pressable
            style={styles.quickAction}
            onPress={() => router.push('/my-vouchers' as any)}
           
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(139,92,246,0.1)' }]}>
              <Ionicons name="ticket-outline" size={18} color={colors.brand.purpleLight} />
            </View>
            <Text style={styles.quickActionLabel}>Vouchers</Text>
          </Pressable>
          <Pressable
            style={styles.quickAction}
            onPress={() => router.push('/account/coupons' as any)}
           
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(232,184,150,0.15)' }]}>
              <Ionicons name="pricetag-outline" size={18} color={colors.brand.sand} />
            </View>
            <Text style={styles.quickActionLabel}>Coupons</Text>
          </Pressable>
        </View>

        {/* ─── History Tabs ──────────────────────────────────── */}
        <View style={styles.tabsContainer}>
          {(['all', 'pending', 'credited', 'expired'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
               
              >
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ─── Error ─────────────────────────────────────────── */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* ─── Cashback History ──────────────────────────────── */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>
            {activeTab === 'all' ? 'All Cashback' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Cashback`}
            {historyTotal > 0 && (
              <Text style={styles.historyCount}> ({historyTotal})</Text>
            )}
          </Text>

          {cashbacks.length > 0 ? (
            cashbacks.map((cashback, index) => (
              <CashbackHistoryCard
                key={cashback._id}
                cashback={cashback}
                index={index}
                formatAmount={formatAmount}
                formatDate={formatDate}
                getSourceIcon={getSourceIcon}
                getSourceLabel={getSourceLabel}
                getStatusColor={getStatusColor}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name={activeTab === 'all' ? 'wallet-outline' : activeTab === 'pending' ? 'hourglass-outline' : activeTab === 'credited' ? 'checkmark-circle-outline' : 'time-outline'}
                  size={32}
                  color="#C4956A"
                />
              </View>
              <Text style={styles.emptyText}>No cashback found</Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'all'
                  ? 'Start shopping to earn cashback!'
                  : `No ${activeTab} cashback yet`}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: Spacing['3xl'] }} />
        </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Summary Card Component ──────────────────────────────────
const SummaryCard = React.memo(({
  title,
  amount,
  count,
  color,
  icon,
  currencySymbol }: {
  title: string;
  amount: number;
  count: number;
  color: string;
  icon: string;
  currencySymbol: string;
}) => (
  <View style={[styles.summaryCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
    <View style={styles.summaryTop}>
      <View style={[styles.summaryIconWrap, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <Text style={[styles.summaryCountBadge, { color }]}>{count}</Text>
    </View>
    <Text style={styles.summaryTitle}>{title}</Text>
    <Text style={[styles.summaryAmount, { color }]}>
      {currencySymbol}{(amount || 0).toFixed(2)}
    </Text>
  </View>
));

// ─── Cashback History Card Component ─────────────────────────
const CashbackHistoryCard = React.memo(({
  cashback,
  index,
  formatAmount,
  formatDate,
  getSourceIcon,
  getSourceLabel,
  getStatusColor }: {
  cashback: UserCashback;
  index: number;
  formatAmount: (n: number) => string;
  formatDate: (d: string) => string;
  getSourceIcon: (s: string) => string;
  getSourceLabel: (s: string) => string;
  getStatusColor: (s: string) => string;
}) => {
  const fadeAnim = useSharedValue(0);
  const fadeAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));
  const statusColor = getStatusColor(cashback.status);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 250 });
  }, [index]);

  return (
    <Animated.View style={[styles.historyCard, fadeAnimStyle]}>
      {/* Source icon */}
      <View style={[styles.historyIcon, { backgroundColor: `${statusColor}12` }]}>
        <Ionicons name={getSourceIcon(cashback.source) as any} size={20} color={statusColor} />
      </View>

      {/* Info */}
      <View style={styles.historyInfo}>
        <Text style={styles.historyDesc} numberOfLines={1}>
          {cashback.description || 'Cashback earned'}
        </Text>
        <View style={styles.historyMeta}>
          <Text style={styles.historyDate}>{formatDate(cashback.earnedDate)}</Text>
          <View style={styles.historyDot} />
          <Text style={[styles.historySource, { color: statusColor }]}>
            {getSourceLabel(cashback.source)}
          </Text>
        </View>

        {/* Pending: show expiry + days remaining */}
        {cashback.status === 'pending' && cashback.expiryDate && (
          <View style={styles.historyExpiryRow}>
            <Ionicons name="time-outline" size={11} color={Colors.warning} />
            <Text style={styles.historyExpiryText}>
              Expires {formatDate(cashback.expiryDate)}
            </Text>
          </View>
        )}

        {/* Credited: show credit date */}
        {cashback.status === 'credited' && cashback.creditedDate && (
          <View style={styles.historyExpiryRow}>
            <Ionicons name="checkmark-circle-outline" size={11} color={Colors.success} />
            <Text style={[styles.historyExpiryText, { color: Colors.success }]}>
              Credited {formatDate(cashback.creditedDate)}
            </Text>
          </View>
        )}
      </View>

      {/* Amount + status */}
      <View style={styles.historyRight}>
        <Text style={[styles.historyAmount, { color: statusColor }]}>
          {formatAmount(cashback.amount)}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}15` }]}>
          <Text style={[styles.statusPillText, { color: statusColor }]}>
            {cashback.status.charAt(0).toUpperCase() + cashback.status.slice(1)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED' },

  // ── Header ──
  header: {
    backgroundColor: Colors.background.primary,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEAE6' },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: 10,
    gap: 10 },
  backButton: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: Spacing.base,
    backgroundColor: '#F4F1ED',
    justifyContent: 'center',
    alignItems: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.nileBlue,
    letterSpacing: -0.3 },
  walletButton: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: Spacing.base,
    backgroundColor: '#F4F1ED',
    justifyContent: 'center',
    alignItems: 'center' },

  sourceToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: 8,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEAE6' },
  sourceToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    backgroundColor: '#F4F1ED' },
  sourceToggleActive: {
    backgroundColor: Colors.nileBlue },
  sourceToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C8A97' },
  sourceToggleTextActive: {
    color: Colors.text.inverse },

  content: {
    flex: 1 },

  // ── Hero Card ──
  heroCard: {
    margin: Spacing.base,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: Colors.nileBlue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 12px rgba(26,58,82,0.15)' } }) },
  heroGradient: {
    padding: Spacing.lg,
    position: 'relative',
    overflow: 'hidden' },
  decoCircle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)' },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base },
  heroLeft: {},
  heroLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 4 },
  heroAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: -0.5 },
  heroIconWrap: {
    width: Spacing['4xl'],
    height: Spacing['4xl'],
    borderRadius: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center' },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    gap: 3 },
  heroStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3 },
  heroStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500' },
  heroStatValue: {
    fontSize: 12,
    color: Colors.text.inverse,
    fontWeight: '700' },
  heroStatDivider: {
    width: 1,
    height: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.12)' },

  // ── Summary Cards ──
  summarySection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#8B7355', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 4px rgba(139,115,85,0.06)' } }) },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm },
  summaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center' },
  summaryCountBadge: {
    fontSize: 12,
    fontWeight: '700' },
  summaryTitle: {
    fontSize: 11,
    color: '#7C8A97',
    marginBottom: 2,
    fontWeight: '500' },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3 },

  // ── Redeem ──
  redeemCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: Colors.success, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
      android: { elevation: 4 },
      web: { boxShadow: '0 3px 8px rgba(5,150,105,0.2)' } }) },
  redeemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Spacing.base },
  redeemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  redeemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center' },
  redeemLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500' },
  redeemAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: -0.3 },
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: 10 },
  redeemBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success },

  // ── Expiring Soon ──
  expiringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: colors.tint.amber,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.warningScale[200],
    gap: 10 },
  expiringIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.12)',
    justifyContent: 'center',
    alignItems: 'center' },
  expiringContent: {
    flex: 1 },
  expiringTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.amberDark },
  expiringSubtext: {
    fontSize: 11,
    color: colors.brand.amberDeep,
    marginTop: 1 },
  expiringAction: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.sm },
  expiringActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.inverse },

  // ── Campaigns ──
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.nileBlue,
    letterSpacing: -0.2 },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.sand },
  campaignCard: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: Colors.nileBlue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 4px rgba(26,58,82,0.1)' } }) },
  campaignGradient: {
    padding: 14 },
  campaignRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6 },
  campaignInfo: {
    flex: 1,
    marginRight: 10 },
  campaignName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: 3 },
  campaignDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16 },
  campaignRateBadge: {
    backgroundColor: 'rgba(232,184,150,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10 },
  campaignRateValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brand.sand },
  campaignTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm },
  campaignTag: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6 },
  campaignTagText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'capitalize' },
  campaignValidity: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: Spacing.sm },

  // ── Quick Actions ──
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    gap: Spacing.sm },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: 6,
    ...Platform.select({
      ios: { shadowColor: '#8B7355', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(139,115,85,0.05)' } }) },
  quickActionIcon: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center' },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7C8A97' },

  // ── Tabs ──
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: 6,
    marginBottom: Spacing.xs },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDEAE6' },
  activeTab: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue },
  tabText: {
    fontSize: 12,
    color: '#7C8A97',
    fontWeight: '600' },
  activeTabText: {
    color: Colors.text.inverse },

  // ── History ──
  historySection: {
    padding: Spacing.base },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.md },
  historyCount: {
    fontWeight: '500',
    color: Colors.text.tertiary },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#8B7355', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(139,115,85,0.05)' } }) },
  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center' },
  historyInfo: {
    flex: 1 },
  historyDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginBottom: Spacing.xs },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 },
  historyDate: {
    fontSize: 11,
    color: Colors.text.tertiary },
  historyDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.neutral[300] },
  historySource: {
    fontSize: 11,
    fontWeight: '600' },
  historyExpiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs },
  historyExpiryText: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: '500' },
  historyRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs },
  historyAmount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3 },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6 },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3 },

  // ── Error ──
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.base,
    padding: Spacing.md,
    backgroundColor: colors.errorScale[50],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.errorScale[200],
    gap: 10 },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error },
  retryButton: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: 12,
    fontWeight: '600' },

  // ── Empty ──
  emptyContainer: {
    padding: Spacing['3xl'],
    alignItems: 'center' },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(196,149,106,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md },
  emptyText: {
    fontSize: 15,
    color: Colors.nileBlue,
    fontWeight: '700',
    marginBottom: Spacing.xs },
  emptySubtext: {
    fontSize: 12,
    color: '#A0A8B1',
    textAlign: 'center' },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['3xl'] },
  loadingText: {
    fontSize: 13,
    color: '#7C8A97',
    marginTop: Spacing.md } });

export default withErrorBoundary(CashbackPage, 'AccountCashback');
