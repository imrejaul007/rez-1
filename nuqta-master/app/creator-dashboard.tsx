import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Creator Dashboard
// Shows earnings overview, recent conversions, picks management, and tier progress

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import creatorsApi, { CreatorEarnings, MyPick } from '@/services/creatorsApi';
import { platformAlert } from '@/utils/platformAlert';
import { ProfileSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

const NUQTA_COIN = BRAND.COIN_IMAGE;

const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  starter: { bg: colors.tint.greenLight, text: '#065F46', border: Colors.success },
  bronze: { bg: Colors.warningScale[50], text: colors.brand.amberDark, border: Colors.warning },
  silver: { bg: Colors.background.secondary, text: colors.neutral[700], border: Colors.text.tertiary },
  gold: { bg: colors.tint.orange, text: '#9A3412', border: colors.brand.orange },
  platinum: { bg: colors.tint.purple, text: '#5B21B6', border: colors.brand.purpleLight },
};

function CreatorDashboard() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [picks, setPicks] = useState<MyPick[]>([]);
  const [pickFilter, setPickFilter] = useState<'all' | 'approved' | 'pending' | 'draft' | 'rejected'>('all');
  const [profile, setProfile] = useState<any>(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const [earningsRes, picksRes, profileRes] = await Promise.allSettled([
        creatorsApi.getMyEarnings(),
        creatorsApi.getMyPicks({ limit: 10, page: 1 }),
        creatorsApi.getMyCreatorProfile(),
      ]);

      if (earningsRes.status === 'fulfilled' && earningsRes.value.success && earningsRes.value.data) {
        if (!isMounted()) return;
        setEarnings(earningsRes.value.data);
      }
      if (picksRes.status === 'fulfilled' && picksRes.value.success && picksRes.value.data?.picks) {
        if (!isMounted()) return;
        setPicks(picksRes.value.data.picks);
      }
      if (profileRes.status === 'fulfilled' && profileRes.value.success && profileRes.value.data) {
        if (!isMounted()) return;
        setProfile(profileRes.value.data);
      }

      const earningsFailed = earningsRes.status === 'rejected' || !earningsRes.value.success;
      const profileFailed = profileRes.status === 'rejected' || !profileRes.value.success;
      if (earningsFailed && profileFailed) {
        setError('Failed to load dashboard data');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load dashboard');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchDashboardData();
  }, [fetchDashboardData, isAuthenticated, authLoading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  const handleDeletePick = useCallback((pick: MyPick) => {
    const isApproved = pick.status === 'approved';
    platformAlert(
      isApproved ? 'Archive Pick?' : 'Delete Pick?',
      isApproved
        ? 'This pick will be archived and hidden from public view.'
        : 'This pick will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isApproved ? 'Archive' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistic removal
            const prevPicks = [...picks];
            setPicks(prev => prev.filter(p => p.id !== pick.id));
            try {
              const response = await creatorsApi.deleteMyPick(pick.id);
              if (!response.success) {
                setPicks(prevPicks); // revert
                platformAlert('Error', response.error || 'Failed to delete pick');
              }
            } catch (err: any) {
              if (!isMounted()) return;
              setPicks(prevPicks); // revert
              platformAlert('Error', err.message || 'Something went wrong');
            }
          },
        },
      ]
    );
  }, [picks]);

  const tier = earnings?.tier || profile?.tier || 'starter';
  const tc = tierColors[tier] || tierColors.starter;

  const pickCounts = useMemo(() => ({
    all: picks.length,
    approved: picks.filter(p => p.status === 'approved').length,
    pending: picks.filter(p => p.status === 'pending_merchant' || p.status === 'pending_review').length,
    draft: picks.filter(p => p.status === 'draft').length,
    rejected: picks.filter(p => p.status === 'rejected').length,
  }), [picks]);

  const filteredPicks = useMemo(() => {
    if (pickFilter === 'all') return picks;
    if (pickFilter === 'pending') return picks.filter(p => p.status === 'pending_merchant' || p.status === 'pending_review');
    return picks.filter(p => p.status === pickFilter);
  }, [picks, pickFilter]);

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
        <Header onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />
        <ProfileSkeleton />
      </View>
    );
  }

  // ============================================
  // ERROR
  // ============================================

  if (error && !earnings && !profile) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
        <Header onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchDashboardData()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
      <Header onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.nileBlue} />
        }
      >
        {/* Earnings Overview */}
        <LinearGradient
          colors={[Colors.nileBlue, Colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.earningsCard}
        >
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsTitle}>Total Earnings</Text>
            <View style={[styles.tierBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <CachedImage source={NUQTA_COIN} style={styles.coinIcon14} />
              <Text style={styles.tierBadgeText}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.totalEarningsRow}>
            <CachedImage source={NUQTA_COIN} style={styles.coinIcon28} />
            <Text style={styles.totalEarnings}>
              {formatCount(earnings?.totalEarnings || 0)} coins
            </Text>
          </View>

          <View style={styles.earningsGrid}>
            <View style={styles.earningsGridItem}>
              <Text style={styles.earningsGridLabel}>This Month</Text>
              <Text style={styles.earningsGridValue}>
                {formatCount(earnings?.thisMonthEarnings || 0)}
              </Text>
            </View>
            <View style={styles.earningsGridDivider} />
            <View style={styles.earningsGridItem}>
              <Text style={styles.earningsGridLabel}>Rewards</Text>
              <Text style={styles.earningsGridValue}>
                {formatCount(earnings?.merchantRewards || 0)}
              </Text>
            </View>
            <View style={styles.earningsGridDivider} />
            <View style={styles.earningsGridItem}>
              <Text style={styles.earningsGridLabel}>Conversions</Text>
              <Text style={styles.earningsGridValue}>
                {earnings?.totalConversions || 0}
              </Text>
            </View>
          </View>

          <View style={styles.commissionRow}>
            <Ionicons name="trending-up" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.commissionText}>
              Commission Rate: {earnings?.commissionRate || 2}%
            </Text>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/submit-pick')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.background.tertiary }]}>
              <Ionicons name="add-circle" size={24} color={Colors.nileBlue} />
            </View>
            <Text style={styles.actionText}>New Pick</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => router.push(`/creator/${typeof profile?.user === 'string' ? profile.user : profile?.user?._id || profile?._id}`)}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.infoScale[50] }]}>
              <Ionicons name="person" size={24} color={Colors.info} />
            </View>
            <Text style={styles.actionText}>My Profile</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/creator/edit')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.warningScale[50] }]}>
              <Ionicons name="create-outline" size={24} color={Colors.gold} />
            </View>
            <Text style={styles.actionText}>Edit Profile</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => router.push('/my-earnings')}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.successScale[100] }]}>
              <Ionicons name="stats-chart" size={24} color={Colors.success} />
            </View>
            <Text style={styles.actionText}>Analytics</Text>
          </Pressable>
        </View>

        {/* My Picks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Picks</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterRow}>
              {([
                { key: 'all', label: 'All' },
                { key: 'approved', label: 'Published' },
                { key: 'pending', label: 'Pending' },
                { key: 'draft', label: 'Drafts' },
                { key: 'rejected', label: 'Rejected' },
              ] as const).map(f => (
                <Pressable
                  key={f.key}
                  style={[styles.filterChip, pickFilter === f.key && styles.filterChipActive]}
                  onPress={() => setPickFilter(f.key)}
                 
                >
                  <Text style={[styles.filterChipText, pickFilter === f.key && styles.filterChipTextActive]}>
                    {f.label} ({pickCounts[f.key]})
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {filteredPicks.length > 0 ? (
            filteredPicks.slice(0, 5).map(pick => {
              const isApproved = pick.status === 'approved';
              return (
                <Pressable
                  key={pick.id}
                  style={styles.pickRowWrapper}
                  onPress={() => isApproved ? router.push({ pathname: '/picks/[id]', params: { id: pick.id } }) : undefined}
                 
                >
                  <View style={styles.pickRow}>
                    <View style={styles.positionRelative}>
                      {pick.productImage ? (
                        <CachedImage source={pick.productImage} style={styles.pickImage} />
                      ) : (
                        <View style={[styles.pickImage, styles.pickImagePlaceholder]}>
                          <Ionicons name="image-outline" size={18} color={Colors.border.default} />
                        </View>
                      )}
                      {pick.videoUrl && (
                        <View style={styles.videoIndicator}>
                          <Ionicons name="videocam" size={10} color={Colors.text.inverse} />
                        </View>
                      )}
                    </View>
                    <View style={styles.pickInfo}>
                      <Text style={styles.pickTitle} numberOfLines={1}>{pick.title}</Text>
                      <View style={styles.pickMeta}>
                        {isApproved ? (
                          <>
                            <Text style={styles.pickMetaText}>
                              {formatCount(pick.views)} views
                            </Text>
                            <Text style={styles.pickMetaDot}>·</Text>
                            <Text style={styles.pickMetaText}>
                              {pick.purchases} sales
                            </Text>
                            {pick.earnings > 0 && (
                              <>
                                <Text style={styles.pickMetaDot}>·</Text>
                                <CachedImage source={NUQTA_COIN} style={styles.coinIcon13} />
                                <Text style={styles.pickEarnings}>
                                  +{formatCount(pick.earnings)}
                                </Text>
                              </>
                            )}
                          </>
                        ) : (
                          <Text style={styles.pickMetaText}>
                            {pick.productBrand ? `${pick.productBrand} · ` : ''}{BRAND.CURRENCY_CODE} {pick.productPrice?.toLocaleString() || 0}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={[
                      styles.pickStatusBadge,
                      pick.status === 'approved' && { backgroundColor: Colors.successScale[100] },
                      pick.status === 'pending_review' && { backgroundColor: Colors.warningScale[50] },
                      pick.status === 'pending_merchant' && { backgroundColor: colors.tint.orange },
                      pick.status === 'rejected' && { backgroundColor: Colors.errorScale[100] },
                    ]}>
                      <Text style={[
                        styles.pickStatusText,
                        pick.status === 'approved' && { color: Colors.success },
                        pick.status === 'pending_review' && { color: Colors.gold },
                        pick.status === 'pending_merchant' && { color: colors.brand.orangeDark },
                        pick.status === 'rejected' && { color: Colors.error },
                      ]}>
                        {pick.status === 'pending_merchant' ? 'Awaiting Store' :
                         pick.status === 'pending_review' ? 'In Review' :
                         pick.status.charAt(0).toUpperCase() + pick.status.slice(1)}
                      </Text>
                    </View>
                    {/* Delete/Archive button */}
                    <Pressable
                      style={styles.pickDeleteBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeletePick(pick);
                      }}
                     
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={isApproved ? 'archive-outline' : 'trash-outline'}
                        size={16}
                        color={isApproved ? Colors.gold : Colors.error}
                      />
                    </Pressable>
                  </View>
                  {/* Show merchant rejection reason */}
                  {pick.status === 'rejected' && pick.merchantApproval?.status === 'rejected' && pick.merchantApproval?.rejectionReason && (
                    <Text style={styles.rejectionReasonText}>
                      Store: {pick.merchantApproval.rejectionReason}
                    </Text>
                  )}
                  {/* Show merchant reward if approved with reward */}
                  {pick.merchantApproval?.reward && pick.merchantApproval.reward.type !== 'none' && pick.merchantApproval.reward.amount > 0 && (
                    <View style={styles.merchantRewardRow}>
                      <Ionicons name="gift-outline" size={12} color={Colors.nileBlue} />
                      <CachedImage source={NUQTA_COIN} style={styles.coinIcon13} />
                      <Text style={styles.merchantRewardText}>
                        +{pick.merchantApproval.reward.amount} {pick.merchantApproval.reward.type === 'branded_coins' ? 'branded' : BRAND.APP_NAME} reward
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyPicks}>
              <Ionicons name="bag-outline" size={32} color={Colors.border.default} />
              <Text style={styles.emptyText}>
                {pickFilter === 'all' ? 'No picks yet' : `No ${pickFilter} picks`}
              </Text>
              <Text style={styles.emptySubtext}>
                {pickFilter === 'all' ? 'Start sharing products you love' : 'Try a different filter'}
              </Text>
            </View>
          )}
        </View>

        {/* Recent Conversions */}
        {earnings?.recentConversions && earnings.recentConversions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Conversions</Text>
            </View>

            {earnings.recentConversions.slice(0, 5).map(conv => (
              <View key={conv.id} style={styles.conversionRow}>
                {conv.productImage ? (
                  <CachedImage source={conv.productImage} style={styles.convImage} />
                ) : (
                  <View style={[styles.convImage, styles.pickImagePlaceholder]}>
                    <Ionicons name="cart-outline" size={16} color={Colors.border.default} />
                  </View>
                )}
                <View style={styles.convInfo}>
                  <Text style={styles.convProduct} numberOfLines={1}>{conv.product}</Text>
                  <Text style={styles.convBuyer}>by {conv.buyer}</Text>
                </View>
                <View style={styles.convRight}>
                  <View style={styles.convCoinRow}>
                    <CachedImage source={NUQTA_COIN} style={styles.coinIcon14} />
                    <Text style={styles.convCommission}>+{conv.commission}</Text>
                  </View>
                  <View style={[
                    styles.convStatusBadge,
                    conv.status === 'paid' && { backgroundColor: Colors.successScale[100] },
                    conv.status === 'confirmed' && { backgroundColor: Colors.infoScale[50] },
                    conv.status === 'pending' && { backgroundColor: Colors.warningScale[50] },
                  ]}>
                    <Text style={[
                      styles.convStatusText,
                      conv.status === 'paid' && { color: Colors.success },
                      conv.status === 'confirmed' && { color: Colors.info },
                      conv.status === 'pending' && { color: Colors.gold },
                    ]}>
                      {conv.status.charAt(0).toUpperCase() + conv.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tier Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tier Progress</Text>
          </View>

          <View style={styles.tierCard}>
            <View style={styles.tierRow}>
              {(['starter', 'bronze', 'silver', 'gold', 'platinum'] as const).map((t, idx) => {
                const isActive = t === tier;
                const isPast = ['starter', 'bronze', 'silver', 'gold', 'platinum'].indexOf(tier) >= idx;
                const tColors = tierColors[t];
                const tierIcons: Record<string, { outline: string; filled: string }> = {
                  starter: { outline: 'rocket-outline', filled: 'rocket' },
                  bronze: { outline: 'shield-outline', filled: 'shield' },
                  silver: { outline: 'star-outline', filled: 'star' },
                  gold: { outline: 'trophy-outline', filled: 'trophy' },
                  platinum: { outline: 'diamond-outline', filled: 'diamond' },
                };
                const icon = tierIcons[t];
                return (
                  <View key={t} style={styles.tierItem}>
                    <View style={[
                      styles.tierDot,
                      isPast && !isActive && { backgroundColor: tColors.border, borderColor: tColors.border },
                      isActive && { backgroundColor: tColors.bg, borderColor: tColors.border, borderWidth: 2.5, transform: [{ scale: 1.35 }], shadowColor: tColors.border, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 5 },
                    ]}>
                      {isActive && (
                        <Ionicons name={icon.filled as any} size={13} color={tColors.border} />
                      )}
                      {isPast && !isActive && (
                        <Ionicons name={icon.outline as any} size={10} color={Colors.text.inverse} />
                      )}
                    </View>
                    <Text style={[
                      styles.tierName,
                      isActive && { fontWeight: '700', color: tColors.border },
                      isPast && !isActive && { color: Colors.text.tertiary },
                    ]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ============================================
// HEADER
// ============================================

function Header({ onBack }: { onBack: () => void }) {
  return (
    <LinearGradient colors={[Colors.nileBlue, '#2d5a7b']} style={headerStyles.header}>
      <View style={headerStyles.content}>
        <Pressable style={headerStyles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
        </Pressable>
        <Text style={headerStyles.title}>Creator Dashboard</Text>
        <View style={headerStyles.spacer} />
      </View>
    </LinearGradient>
  );
}

const headerStyles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: 14,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  spacer: { width: 40 },
});

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 15,
    color: Colors.text.tertiary,
  },
  errorTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: 28,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: 15,
    fontWeight: '600',
  },

  // Earnings Card
  earningsCard: {
    margin: Spacing.base,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  earningsTitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  tierBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  totalEarnings: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: Spacing.lg,
  },
  earningsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  earningsGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningsGridLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  earningsGridValue: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  earningsGridDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 2,
  },
  commissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commissionText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  // Sections
  section: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
  },

  // Picks
  pickRowWrapper: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pickImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
  },
  pickImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 3,
    padding: 2,
  },
  pickInfo: {
    flex: 1,
  },
  pickTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 3,
  },
  pickMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickMetaText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  pickMetaDot: {
    ...Typography.bodySmall,
    color: Colors.border.default,
    marginHorizontal: Spacing.xs,
  },
  pickEarnings: {
    ...Typography.bodySmall,
    color: Colors.success,
    fontWeight: '600',
  },
  pickStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
  },
  pickStatusText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  pickDeleteBtn: {
    padding: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    marginLeft: Spacing.xs,
  },

  // Pick filters
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
  },
  filterChipActive: {
    backgroundColor: Colors.nileBlue,
  },
  filterChipText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  filterChipTextActive: {
    color: Colors.text.inverse,
  },

  // Empty
  emptyPicks: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },

  // Conversions
  conversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  convImage: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
  },
  convInfo: {
    flex: 1,
  },
  convProduct: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  convBuyer: {
    fontSize: 11,
    color: Colors.text.tertiary,
  },
  convRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  convCommission: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
  },
  convStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.background.secondary,
  },
  convStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },

  // Tier
  tierCard: {
    padding: 10,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierItem: {
    alignItems: 'center',
    gap: 6,
  },
  tierDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.border.default,
    borderWidth: 2,
    borderColor: Colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierName: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },

  // Extracted inline styles
  totalEarningsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterScroll: { marginBottom: 8 },
  positionRelative: { position: 'relative' },
  rejectionReasonText: { fontSize: 11, color: Colors.error, marginTop: 2, paddingLeft: 56 },
  merchantRewardRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, paddingLeft: 56, gap: 4 },
  merchantRewardText: { fontSize: 11, color: Colors.nileBlue, fontWeight: '500' },
  convCoinRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bottomSpacer: { height: 120 },
  coinIcon13: { width: 13, height: 13, borderRadius: 7 },
  coinIcon14: { width: 14, height: 14, borderRadius: 7 },
  coinIcon28: { width: 28, height: 28, borderRadius: 14 },
});

export default withErrorBoundary(CreatorDashboard, 'CreatorDashboard');
