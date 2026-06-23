/**
 * Loyalty Rewards & Redemption Page
 * Complete loyalty system with redemption, tier benefits, and gamification
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  RefreshControl,
  Modal,
} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import useLoyaltyRedemption from '@/hooks/useLoyaltyRedemption';
import RewardCard from '@/components/loyalty/RewardCard';
import RedemptionModal from '@/components/loyalty/RedemptionModal';
import TierBenefitsCard from '@/components/loyalty/TierBenefitsCard';
import RewardCatalog from '@/components/loyalty/RewardCatalog';
import RedemptionHistory from '@/components/loyalty/RedemptionHistory';
import PointsExpiryBanner from '@/components/loyalty/PointsExpiryBanner';
import { RewardItem } from '@/types/loyaltyRedemption.types';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { useIsMounted } from '@/hooks/useIsMounted';

type TabType = 'rewards' | 'history' | 'challenges';

const LoyaltyPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const {
    balance,
    rewards,
    redemptions,
    tierConfig,
    loading,
    error,
    refreshing,
    catalog,
    expiryNotification,
    challenges,
    checkInStatus,
    refresh,
    redeemReward,
    canRedeemReward,
    filterRewards,
    searchRewards,
    dailyCheckIn,
    claimChallenge,
    getTierColor,
    getTierProgress,
  } = useLoyaltyRedemption();

  const [activeTab, setActiveTab] = useState<TabType>('rewards');
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [showAllTiersModal, setShowAllTiersModal] = useState(false);

  const safeNav = (path: string) => {
    try { router.push(path as any); }
    catch { platformAlertSimple('Error', 'Could not open screen. Please try again.'); }
  };

  // Handle reward redemption
  const handleRedeemReward = (reward: RewardItem) => {
    setSelectedReward(reward);
    setShowRedemptionModal(true);
  };

  const handleConfirmRedemption = async (reward: RewardItem, quantity: number) => {
    try {
      const result = await redeemReward({
        rewardId: reward._id,
        points: reward.points * quantity,
        quantity,
      });

      return result;
    } catch (error) {
      throw error;
    }
  };

  // Handle daily check-in
  const handleDailyCheckIn = async () => {
    try {
      const result = await dailyCheckIn();
      platformAlertSimple(
        'Check-in Successful!',
        `You earned ${result.points} points!\n${result.bonus ? `Bonus: ${result.bonus.points} points - ${result.bonus.message}` : ''}`
      );
    } catch (error) {
      platformAlertSimple('Check-in Failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  // Handle challenge claim
  const handleClaimChallenge = async (challengeId: string) => {
    try {
      const result = await claimChallenge(challengeId);
      platformAlertSimple(
        'Challenge Completed!',
        `You earned ${result.points} points!${result.reward ? `\nBonus: ${result.reward.title}` : ''}`
      );
    } catch (error) {
      platformAlertSimple('Claim Failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  // Render tier benefits section
  const renderTierSection = () => {
    if (!balance || !tierConfig) return null;

    return (
      <View style={styles.section}>
        <TierBenefitsCard
          tierConfig={tierConfig}
          currentPoints={balance.currentPoints}
          pointsToNextTier={balance.pointsToNextTier}
          nextTier={balance.nextTier}
          onViewAllTiers={() => setShowAllTiersModal(true)}
        />
      </View>
    );
  };

  // Render quick actions
  const renderQuickActions = () => {
    const canCheckIn = checkInStatus ? true : false;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Quick Actions</ThemedText>

        <View style={styles.actionsGrid}>
          <Pressable
            style={[styles.actionCard, !canCheckIn && styles.actionCardDisabled]}
            onPress={handleDailyCheckIn}
            disabled={!canCheckIn}
            accessibilityLabel={`Daily check-in${checkInStatus ? `. ${checkInStatus.streak.currentStreak} day streak` : ''}${!canCheckIn ? '. Already checked in today' : ''}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canCheckIn }}
            accessibilityHint="Double tap to check in and earn points"
          >
            <Ionicons name="calendar" size={28} color={canCheckIn ? Colors.brand.purple : Colors.text.tertiary} />
            <ThemedText style={styles.actionTitle}>Daily Check-in</ThemedText>
            {checkInStatus && (
              <ThemedText style={styles.actionSubtitle}>
                {checkInStatus.streak.currentStreak} day streak
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => safeNav('/scratch-card')}
          >
            <Ionicons name="gift" size={28} color={Colors.warning} />
            <ThemedText style={styles.actionTitle}>Scratch Card</ThemedText>
            <ThemedText style={styles.actionSubtitle}>Win points</ThemedText>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => safeNav('/referral')}
          >
            <Ionicons name="people" size={28} color={Colors.success} />
            <ThemedText style={styles.actionTitle}>Refer Friend</ThemedText>
            <ThemedText style={styles.actionSubtitle}>200 points</ThemedText>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => safeNav('/my-reviews')}
          >
            <Ionicons name="star" size={28} color={Colors.error} />
            <ThemedText style={styles.actionTitle}>Write Review</ThemedText>
            <ThemedText style={styles.actionSubtitle}>50 points</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  // Render challenges section
  const renderChallenges = () => {
    if (challenges.length === 0) return null;

    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Active Challenges</ThemedText>

        {challenges.map(challenge => (
          <View key={challenge._id} style={styles.challengeCard}>
            <View style={styles.challengeIcon}>
              <Ionicons name="trophy" size={24} color={Colors.warning} />
            </View>

            <View style={styles.challengeContent}>
              <ThemedText style={styles.challengeTitle}>{challenge.title}</ThemedText>
              <ThemedText style={styles.challengeDescription}>{challenge.description}</ThemedText>

              <View style={styles.challengeProgress}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(challenge.progress / challenge.maxProgress) * 100}%` },
                    ]}
                  />
                </View>
                <ThemedText style={styles.progressText}>
                  {challenge.progress}/{challenge.maxProgress}
                </ThemedText>
              </View>

              <View style={styles.challengeFooter}>
                <View style={styles.challengePoints}>
                  <Ionicons name="diamond" size={16} color={Colors.warning} />
                  <ThemedText style={styles.challengePointsText}>{challenge.points} pts</ThemedText>
                </View>

                {challenge.completed ? (
                  <Pressable
                    style={styles.claimButton}
                    onPress={() => handleClaimChallenge(challenge._id)}
                    accessibilityLabel={`Claim ${challenge.points} points for completing ${challenge.title}`}
                    accessibilityRole="button"
                    accessibilityHint="Double tap to claim challenge reward"
                  >
                    <ThemedText style={styles.claimButtonText}>Claim</ThemedText>
                  </Pressable>
                ) : challenge.expiresAt ? (
                  <ThemedText style={styles.expiryText}>
                    Expires {new Date(challenge.expiresAt).toLocaleDateString()}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render featured rewards
  const renderFeaturedRewards = () => {
    const featuredRewards = rewards.filter(r => r.featured).slice(0, 3);
    if (featuredRewards.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="star" size={20} color={Colors.warning} />
            <ThemedText style={styles.sectionTitle}>Featured Rewards</ThemedText>
          </View>
          <Pressable onPress={() => setActiveTab('rewards')}>
            <ThemedText style={styles.seeAllText}>See All</ThemedText>
          </Pressable>
        </View>

        {featuredRewards.map(reward => {
          const { canRedeem } = canRedeemReward(reward);
          return (
            <RewardCard
              key={reward._id}
              reward={reward}
              canRedeem={canRedeem}
              onRedeem={handleRedeemReward}
              userPoints={balance?.currentPoints || 0}
              tierColor={tierConfig ? tierConfig.color : Colors.brand.purple}
            />
          );
        })}
      </View>
    );
  };

  // Render main content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'rewards':
        return (
          <View style={styles.tabContent}>
            <RewardCatalog
              rewards={rewards}
              onRedeemReward={handleRedeemReward}
              canRedeemReward={canRedeemReward}
              userPoints={balance?.currentPoints || 0}
              tierColor={tierConfig?.color}
              onSearch={searchRewards}
              onFilter={category => filterRewards({ category: category || undefined })}
            />
          </View>
        );
      case 'history':
        return (
          <View style={styles.tabContent}>
            <RedemptionHistory redemptions={redemptions} />
          </View>
        );
      case 'challenges':
        return (
          <View style={styles.tabContent}>
            {renderChallenges()}
          </View>
        );
      default:
        return null;
    }
  };

  if (loading && !balance) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />
        <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Loyalty Rewards</ThemedText>
            <View style={styles.headerButton} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Ionicons name="diamond" size={64} color={Colors.brand.purple} />
          <ThemedText style={styles.loadingText}>Loading loyalty data...</ThemedText>
        </View>
      </View>
    );
  }

  if (error && !balance) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />
        <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Loyalty Rewards</ThemedText>
            <View style={styles.headerButton} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!balance) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />
        <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} accessibilityRole="button">
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Loyalty Rewards</ThemedText>
            <View style={styles.headerButton} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Ionicons name="gift-outline" size={64} color={Colors.brand.purple} />
          <ThemedText style={styles.loadingText}>No loyalty data available yet.</ThemedText>
          <Pressable style={styles.retryButton} onPress={refresh} accessibilityRole="button">
            <ThemedText style={styles.retryButtonText}>Refresh</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />

      {/* Header with Points Card */}
      <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Loyalty Rewards</ThemedText>
          <Pressable
            style={styles.headerButton}
            onPress={() => safeNav('/profile')}
          >
            <Ionicons name="stats-chart" size={24} color="white" />
          </Pressable>
        </View>

        {/* Main Points Display */}
        <View
          style={styles.pointsCard}
          accessibilityLabel={`Available loyalty points: ${balance.currentPoints}${balance.nextTier ? `. ${balance.pointsToNextTier} points needed to reach ${balance.nextTier} tier` : ''}`}
          accessibilityRole="summary"
        >
          <View style={styles.pointsMain}>
            <Ionicons name="diamond" size={40} color={Colors.warning} />
            <ThemedText style={styles.pointsValue}>{balance.currentPoints}</ThemedText>
            <ThemedText style={styles.pointsLabel}>Available Points</ThemedText>
          </View>

          {balance.nextTier && (
            <View style={styles.tierProgress}>
              <View style={styles.tierProgressInfo}>
                <View style={styles.currentTierBadge}>
                  <Ionicons name="star" size={14} color={getTierColor(balance.tier)} />
                  <ThemedText style={[styles.tierBadgeText, { color: getTierColor(balance.tier) }]}>
                    {balance.tier}
                  </ThemedText>
                </View>
                <ThemedText style={styles.tierProgressText}>
                  {balance.pointsToNextTier} pts to {balance.nextTier}
                </ThemedText>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${getTierProgress()}%` }]}
                />
              </View>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'rewards' && styles.tabActive]}
          onPress={() => setActiveTab('rewards')}
        >
          <Ionicons
            name="gift"
            size={20}
            color={activeTab === 'rewards' ? Colors.brand.purple : Colors.text.tertiary}
          />
          <ThemedText
            style={[styles.tabText, activeTab === 'rewards' && styles.tabTextActive]}
          >
            Rewards
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="time"
            size={20}
            color={activeTab === 'history' ? Colors.brand.purple : Colors.text.tertiary}
          />
          <ThemedText
            style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}
          >
            History
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'challenges' && styles.tabActive]}
          onPress={() => setActiveTab('challenges')}
        >
          <Ionicons
            name="trophy"
            size={20}
            color={activeTab === 'challenges' ? Colors.brand.purple : Colors.text.tertiary}
          />
          <ThemedText
            style={[styles.tabText, activeTab === 'challenges' && styles.tabTextActive]}
          >
            Challenges
          </ThemedText>
        </Pressable>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.brand.purple} />}
      >
        {/* Expiry Warning */}
        {expiryNotification && expiryNotification.points > 0 && (
          <PointsExpiryBanner notification={expiryNotification} />
        )}

        {/* Tier Benefits */}
        {activeTab === 'rewards' && renderTierSection()}

        {/* Quick Actions */}
        {activeTab === 'rewards' && renderQuickActions()}

        {/* Featured Rewards */}
        {activeTab === 'rewards' && renderFeaturedRewards()}

        {/* Tab Content */}
        {renderContent()}
      </ScrollView>

      {/* Redemption Modal */}
      <RedemptionModal
        visible={showRedemptionModal}
        reward={selectedReward}
        userPoints={balance.currentPoints}
        onClose={() => {
          setShowRedemptionModal(false);
          setSelectedReward(null);
        }}
        onRedeem={handleConfirmRedemption}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  errorText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    padding: Spacing.sm,
  },
  pointsCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  pointsMain: {
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  pointsLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  tierProgress: {
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  tierProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  currentTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tierBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  tierProgressText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border.light,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.warning,
    borderRadius: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.brand.purple,
  },
  tabText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: Colors.brand.purple,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  tabContent: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
  },
  seeAllText: {
    ...Typography.body,
    color: Colors.brand.purple,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  actionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  challengeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  challengeIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.warningScale[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  challengeContent: {
    flex: 1,
  },
  challengeTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  challengeDescription: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
  },
  challengeProgress: {
    marginBottom: Spacing.md,
  },
  progressText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengePoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  challengePointsText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.warning,
  },
  claimButton: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  claimButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  expiryText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(LoyaltyPage, 'Loyalty');
