// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import referralTierApi from '../../services/referralTierApi';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import {
  REFERRAL_TIERS,
  TIER_COLORS,
  TIER_GRADIENTS,
  ReferralStats,
  ReferralProgress,
  ReferralReward,
  LeaderboardEntry
} from '../../types/referral.types';
import { ProfileSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

function ReferralDashboard() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [progress, setProgress] = useState<ReferralProgress | null>(null);
  const [rewards, setRewards] = useState<{
    claimable: ReferralReward[];
    claimed: ReferralReward[];
    totalClaimableValue: number;
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<{ rank: number; totalReferrals: number } | null>(null);
  const isMounted = useIsMounted();
  const [qrData, setQrData] = useState<{
    qrCode: string;
    referralLink: string;
    referralCode: string;
  } | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    loadData();
  }, [isAuthenticated, authLoading]);

  const loadData = async () => {
    try {
      setLoading(true);

      const results = await Promise.allSettled([
        referralTierApi.getTier(),
        referralTierApi.getRewards(),
        referralTierApi.getLeaderboard(10),
        referralTierApi.generateQR()
      ]);

      if (results[0].status === 'fulfilled' && results[0].value) {
        if (!isMounted()) return;
        setStats(results[0].value.stats);
        if (!isMounted()) return;
        setProgress(results[0].value.progress);
      }
      if (results[1].status === 'fulfilled' && results[1].value) {
        if (!isMounted()) return;
        setRewards(results[1].value);
      }
      if (results[2].status === 'fulfilled' && results[2].value) {
        if (!isMounted()) return;
        setLeaderboard(results[2].value.leaderboard || []);
        if (!isMounted()) return;
        setUserRank(results[2].value.userRank || null);
      }
      if (results[3].status === 'fulfilled' && results[3].value) {
        if (!isMounted()) return;
        setQrData(results[3].value);
      }

      // Only show error if ALL failed
      const allFailed = results.every(r => r.status === 'rejected');
      if (allFailed) {
        platformAlertSimple('Error', 'Failed to load referral data');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to load referral data');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleClaimReward = useCallback(async (referralId: string, rewardType: string) => {
    try {
      await referralTierApi.claimReward(referralId, rewardType);
      platformAlertSimple('Success', 'Reward claimed successfully!');
      await loadData();
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to claim reward');
    }
  }, []);

  const handleCopyCode = async () => {
    if (qrData?.referralCode) {
      await Clipboard.setStringAsync(qrData.referralCode);
      platformAlertSimple('Copied!', 'Referral code copied to clipboard');
    }
  };

  const handleShare = () => {
    router.push('/referral/share' as any);
  };

  const handleViewLeaderboard = () => {
    // Link to main leaderboard page with referral type
    router.push('/leaderboard' as any);
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  const currentTier = stats?.currentTier || 'STARTER';
  const currentTierData = REFERRAL_TIERS[currentTier];
  const tierGradient = TIER_GRADIENTS[currentTier];

  return (
    <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Tier Badge */}
      <LinearGradient colors={tierGradient as any} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.tierBadge}>
            <Ionicons name="ribbon" size={32} color={colors.background.primary} />
            <Text style={styles.tierName}>{currentTierData.name}</Text>
            <Text style={styles.tierBadgeText}>{currentTierData.badge}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.qualifiedReferrals || 0}</Text>
              <Text style={styles.statLabel}>Qualified</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currencySymbol}{stats?.lifetimeEarnings || 0}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.successRate?.toFixed(0) || 0}%</Text>
              <Text style={styles.statLabel}>Success</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Progress to Next Tier */}
      {progress?.nextTier && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              Progress to {REFERRAL_TIERS[progress.nextTier].name}
            </Text>
            <Text style={styles.progressSubtitle}>
              {progress.referralsNeeded} more referrals needed
            </Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <LinearGradient
                colors={TIER_GRADIENTS[progress.nextTier] as any}
                style={[styles.progressBarFill, { width: `${progress.progress}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.progressPercentage}>{progress.progress.toFixed(0)}%</Text>
          </View>

          {progress.nextTierData && (
            <View style={styles.nextTierRewards}>
              <Text style={styles.nextTierRewardsTitle}>Unlock Rewards:</Text>
              <View style={styles.rewardsList}>
                {progress.nextTierData.rewards.tierBonus && (
                  <View style={styles.rewardItem}>
                    <Ionicons name="cash" size={16} color={Colors.brand.purple} />
                    <Text style={styles.rewardText}>
                      {currencySymbol}{progress.nextTierData.rewards.tierBonus} Tier Bonus
                    </Text>
                  </View>
                )}
                {progress.nextTierData.rewards.voucher && (
                  <View style={styles.rewardItem}>
                    <Ionicons name="gift" size={16} color={Colors.brand.purple} />
                    <Text style={styles.rewardText}>
                      {progress.nextTierData.rewards.voucher.type} {currencySymbol}
                      {progress.nextTierData.rewards.voucher.amount} Voucher
                    </Text>
                  </View>
                )}
                {progress.nextTierData.rewards.lifetimePremium && (
                  <View style={styles.rewardItem}>
                    <Ionicons name="star" size={16} color={Colors.warning} />
                    <Text style={styles.rewardText}>Lifetime Premium</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Share Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Share & Earn</Text>

        <Pressable
          style={styles.shareButton}
          onPress={handleShare}
          accessibilityLabel={`Invite friends. Earn ${currencySymbol}${currentTierData.rewards.perReferral} per referral`}
          accessibilityRole="button"
          accessibilityHint="Opens share options to invite friends"
        >
          <LinearGradient colors={[Colors.brand.purple, Colors.brand.purpleLight || '#a78bfa']} style={styles.shareButtonGradient}>
            <Ionicons name="share-social" size={24} color={Colors.text.inverse} />
            <View style={styles.shareButtonText}>
              <Text style={styles.shareButtonTitle}>Invite Friends</Text>
              <Text style={styles.shareButtonSubtitle}>
                Earn {currencySymbol}{currentTierData.rewards.perReferral} per referral
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.text.inverse} />
          </LinearGradient>
        </Pressable>

        <View style={styles.referralCodeBox}>
          <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
          <Text style={styles.referralCode}>{qrData?.referralCode}</Text>
          <Pressable
            style={styles.copyButton}
            onPress={handleCopyCode}
            accessibilityLabel={`Copy referral code ${qrData?.referralCode}`}
            accessibilityRole="button"
            accessibilityHint="Copies your referral code to clipboard"
          >
            <Ionicons name="copy-outline" size={20} color={Colors.brand.purple} />
            <Text style={styles.copyButtonText}>Copy Code</Text>
          </Pressable>
        </View>
      </View>

      {/* Claimable Rewards */}
      {rewards && rewards.claimable.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Claimable Rewards</Text>

          {rewards.claimable.map((reward, index) => (
            <View key={index} style={styles.rewardCard}>
              <View style={styles.rewardCardLeft}>
                <Ionicons
                  name={
                    reward.type === 'coins'
                      ? 'cash'
                      : reward.type === 'voucher'
                      ? 'gift'
                      : 'star'
                  }
                  size={32}
                  color={Colors.brand.purple}
                />
                <View style={styles.rewardCardInfo}>
                  <Text style={styles.rewardCardTitle}>{reward.description}</Text>
                  <Text style={styles.rewardCardAmount}>
                    {reward.type === 'coins' && `${currencySymbol}${reward.amount}`}
                    {reward.type === 'voucher' &&
                      `${reward.voucherType} ${currencySymbol}${reward.amount}`}
                    {reward.type === 'premium' && 'Lifetime Premium'}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.claimButton}
                onPress={() =>
                  handleClaimReward(reward.referralId!, reward.type!)
                }
                accessibilityLabel={`Claim ${reward.description}`}
                accessibilityRole="button"
                accessibilityHint={`Claims your reward of ${(reward.amount ?? 0) > 0 ? currencySymbol + reward.amount : 'premium access'}`}
              >
                <Text style={styles.claimButtonText}>Claim</Text>
              </Pressable>
            </View>
          ))}

          <View style={styles.totalClaimable}>
            <Text style={styles.totalClaimableText}>
              Total Claimable: {currencySymbol}{rewards.totalClaimableValue}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rewards</Text>
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIconContainer}>
              <Ionicons name="gift-outline" size={36} color={Colors.text.tertiary} />
            </View>
            <Text style={styles.emptyStateTitle}>No rewards yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Invite friends to start earning rewards
            </Text>
          </View>
        </View>
      )}

      {/* Leaderboard Preview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <Pressable
            onPress={handleViewLeaderboard}
            accessibilityLabel="View full leaderboard"
            accessibilityRole="button"
            accessibilityHint="Opens complete leaderboard page"
          >
            <Text style={styles.viewAllButton}>View All</Text>
          </Pressable>
        </View>

        {userRank && (
          <View style={styles.userRankCard}>
            <Ionicons name="trophy" size={24} color={Colors.warning} />
            <View style={styles.userRankInfo}>
              <Text style={styles.userRankText}>Your Rank</Text>
              <Text style={styles.userRankNumber}>#{userRank.rank}</Text>
            </View>
            <Text style={styles.userRankReferrals}>
              {userRank.totalReferrals} referrals
            </Text>
          </View>
        )}

        {leaderboard.length > 0 ? (
          leaderboard.slice(0, 5).map((entry) => (
            <View key={entry.userId} style={styles.leaderboardItem}>
              <View style={styles.leaderboardRank}>
                <Text style={styles.leaderboardRankText}>#{entry.rank}</Text>
              </View>
              <View style={styles.leaderboardInfo}>
                <Text style={styles.leaderboardName}>
                  {entry.fullName || entry.username}
                </Text>
                <Text style={styles.leaderboardStats}>
                  {entry.totalReferrals} referrals · {currencySymbol}{entry.lifetimeEarnings}
                </Text>
              </View>
              <View style={styles.leaderboardTierBadge}>
                <Text style={styles.leaderboardTierText}>
                  {REFERRAL_TIERS[entry.tier]?.badge || 'Starter'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIconContainer}>
              <Ionicons name="podium-outline" size={36} color={Colors.text.tertiary} />
            </View>
            <Text style={styles.emptyStateTitle}>No rankings yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Be the first to climb the leaderboard!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: Spacing.lg
  },
  headerContent: {
    alignItems: 'center'
  },
  tierBadge: {
    alignItems: 'center',
    marginBottom: Spacing.lg
  },
  tierName: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.inverse,
    marginTop: Spacing.sm
  },
  tierBadgeText: {
    ...Typography.body,
    color: Colors.text.inverse,
    opacity: 0.9,
    marginTop: Spacing.xs
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%'
  },
  statItem: {
    alignItems: 'center',
    flex: 1
  },
  statValue: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.inverse
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.inverse,
    opacity: 0.9,
    marginTop: Spacing.xs
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.text.inverse,
    opacity: 0.3
  },
  progressSection: {
    backgroundColor: Colors.background.primary,
    marginTop: -20,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium
  },
  progressHeader: {
    marginBottom: Spacing.base
  },
  progressTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  progressSubtitle: {
    ...Typography.body,
    color: colors.slateGray,
    marginTop: Spacing.xs
  },
  progressBarContainer: {
    marginBottom: Spacing.base
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: colors.slateLight,
    borderRadius: 6,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6
  },
  progressPercentage: {
    ...Typography.bodySmall,
    color: colors.slateGray,
    marginTop: Spacing.sm,
    textAlign: 'right'
  },
  nextTierRewards: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base
  },
  nextTierRewardsTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: Spacing.md
  },
  rewardsList: {
    gap: Spacing.sm
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm
  },
  rewardText: {
    ...Typography.body,
    color: Colors.text.secondary
  },
  section: {
    backgroundColor: Colors.background.primary,
    marginTop: Spacing.base,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: Spacing.base
  },
  viewAllButton: {
    ...Typography.body,
    color: Colors.brand.purple,
    fontWeight: '600'
  },
  shareButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.base
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md
  },
  shareButtonText: {
    flex: 1
  },
  shareButtonTitle: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.inverse
  },
  shareButtonSubtitle: {
    ...Typography.body,
    color: Colors.text.inverse,
    opacity: 0.9,
    marginTop: 2
  },
  referralCodeBox: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center'
  },
  referralCodeLabel: {
    ...Typography.body,
    color: colors.slateGray,
    marginBottom: Spacing.sm
  },
  referralCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.brand.purple,
    letterSpacing: 4,
    marginBottom: Spacing.md
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.purpleScale?.[50] || '#ede9fe',
    borderRadius: BorderRadius.sm
  },
  copyButtonText: {
    ...Typography.body,
    color: Colors.brand.purple,
    fontWeight: '600'
  },
  rewardCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md
  },
  rewardCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1
  },
  rewardCardInfo: {
    flex: 1
  },
  rewardCardTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: Spacing.xs
  },
  rewardCardAmount: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.brand.purple
  },
  claimButton: {
    backgroundColor: Colors.brand.purple,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm
  },
  claimButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600'
  },
  totalClaimable: {
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.slateLight
  },
  totalClaimableText: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center'
  },
  userRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.warningScale[50],
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
    gap: Spacing.md
  },
  userRankInfo: {
    flex: 1
  },
  userRankText: {
    ...Typography.body,
    color: '#92400e',
    marginBottom: 2
  },
  userRankNumber: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: '#92400e'
  },
  userRankReferrals: {
    ...Typography.body,
    color: '#92400e',
    fontWeight: '600'
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md
  },
  leaderboardRank: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.brand.purple,
    justifyContent: 'center',
    alignItems: 'center'
  },
  leaderboardRankText: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.text.inverse
  },
  leaderboardInfo: {
    flex: 1
  },
  leaderboardName: {
    ...Typography.body,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2
  },
  leaderboardStats: {
    ...Typography.bodySmall,
    color: colors.slateGray
  },
  leaderboardTierBadge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.purpleScale?.[50] || '#ede9fe',
    borderRadius: BorderRadius.md
  },
  leaderboardTierText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.brand.purple
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyStateIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  emptyStateTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  emptyStateSubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(ReferralDashboard, 'ReferralDashboard');
