import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, StatusBar, Pressable, Platform, Clipboard, Animated, RefreshControl, ActivityIndicator } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PartnerPageState, ClaimableOffer, RewardTask, OrderMilestone, JackpotMilestone } from '@/types/partner.types';
import { partnerLevels } from '@/data/partnerData';
import partnerApi from '@/services/partnerApi';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import toast from '@/utils/toast';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

// Import all partner components
import JackpotTimeline from '@/components/partner/JackpotTimeline';
import MilestoneTracker from '@/components/partner/MilestoneTracker';
import RewardTasks from '@/components/partner/RewardTasks';
import BenefitsTable from '@/components/partner/BenefitsTable';
import FAQAccordion from '@/components/partner/FAQAccordion';
import OffersGrid from '@/components/partner/OffersGrid';
import LevelWarningBanner from '@/components/partner/LevelWarningBanner';
import PartnerStatsDashboard from '@/components/partner/PartnerStatsDashboard';
import LevelUpCelebration from '@/components/partner/LevelUpCelebration';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { useIsMounted } from '@/hooks/useIsMounted';
// ReZ Premium Design System Colors
function PartnerProfilePage() {
  const { goBack } = useSafeNavigation();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [enrolled, setEnrolled] = useState<boolean | null>(null); // null = unknown yet
  const [enrolling, setEnrolling] = useState(false);
  const [partnerState, setPartnerState] = useState<PartnerPageState>({
    profile: null,
    milestones: [],
    tasks: [],
    jackpotProgress: [],
    claimableOffers: [],
    faqs: [],
    loading: true,
    error: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useIsMounted();
  const [levelUpModal, setLevelUpModal] = useState<{
    visible: boolean;
    oldLevel: number;
    newLevel: number;
    levelName: string;
    benefits: any[];
    bonusAmount: number;
  }>({
    visible: false,
    oldLevel: 1,
    newLevel: 1,
    levelName: '',
    benefits: [],
    bonusAmount: 0,
  });
  const previousLevelRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadPartnerData();
  }, [isAuthenticated, authLoading]);

  const loadPartnerData = async () => {
    try {
      setPartnerState(prev => ({ ...prev, loading: true, error: null }));

      const dashboardResponse = await partnerApi.getDashboard();

      if (dashboardResponse.success && dashboardResponse.data) {
        // Check if user is enrolled in the partner program
        if (dashboardResponse.data.enrolled === false) {
          if (!isMounted()) return;
          setEnrolled(false);
          if (!isMounted()) return;
          setPartnerState(prev => ({ ...prev, loading: false, error: null }));
          return;
        }

        if (!isMounted()) return;
        setEnrolled(true);

        const benefitsResponse = await partnerApi.getBenefits();
        const levelsWithBenefits = benefitsResponse.success && benefitsResponse.data
          ? benefitsResponse.data.allLevels
          : [];

        if (!isMounted()) return;
        setPartnerState({
          profile: dashboardResponse.data.profile as any,
          milestones: dashboardResponse.data.milestones as any,
          tasks: dashboardResponse.data.tasks as any,
          jackpotProgress: dashboardResponse.data.jackpotProgress as any,
          claimableOffers: dashboardResponse.data.claimableOffers as any,
          faqs: dashboardResponse.data.faqs as any,
          levels: levelsWithBenefits,
          loading: false,
          error: null,
        });
      } else {
        throw new Error(dashboardResponse.error || 'Failed to load partner data');
      }
    } catch (error) {
      if (!isMounted()) return;
      setPartnerState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load partner data',
      }));
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      const response = await partnerApi.enrollPartner();

      if (response.success && response.data) {
        if (!isMounted()) return;
        setEnrolled(true);
        toast.success('Welcome to the Partner Program!');
        // Reload full dashboard data after enrollment
        await loadPartnerData();
      } else {
        platformAlertSimple('Error', response.error || 'Failed to join the Partner Program. Please try again.');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to join the Partner Program. Please try again.');
    } finally {
      if (!isMounted()) return;
      setEnrolling(false);
    }
  };

  // Level-up detection effect
  useEffect(() => {
    const currentLevel = partnerState.profile?.level?.level;
    if (currentLevel && previousLevelRef.current !== null) {
      if (currentLevel > previousLevelRef.current) {
        // Level up detected!
        const levelName = partnerState.profile?.level?.name || `Level ${currentLevel}`;
        const levelBenefits = partnerState.levels?.find(l => l.level === currentLevel)?.benefits || [];
        const bonusAmount = currentLevel * 500; // 500, 1000, 1500 based on level

        setLevelUpModal({
          visible: true,
          oldLevel: previousLevelRef.current,
          newLevel: currentLevel,
          levelName,
          benefits: levelBenefits,
          bonusAmount,
        });
      }
    }
    if (currentLevel) {
      previousLevelRef.current = currentLevel;
    }
  }, [partnerState.profile?.level?.level, partnerState.levels]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPartnerData();
    if (!isMounted()) return;
    setRefreshing(false);
  }, []);

  // Close level-up modal
  const closeLevelUpModal = () => {
    setLevelUpModal(prev => ({ ...prev, visible: false }));
  };

  const handleGoBack = () => {
    goBack('/profile' as any);
  };

  const handleClaimReward = async (milestoneId: string) => {
    try {
      const response = await partnerApi.claimMilestoneReward(milestoneId);

      if (response.success) {
        platformAlertSimple('Reward Claimed!', response.data?.message || 'Your reward has been successfully claimed.');
        loadPartnerData();
      } else {
        platformAlertSimple('Error', response.error || 'Failed to claim reward');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to claim reward. Please try again.');
    }
  };

  const handleCompleteTask = (taskId: string) => {
    platformAlertSimple('Task Started!', 'Keep completing this task to earn your reward.');
  };

  const handleClaimTaskReward = async (taskId: string) => {
    try {
      const response = await partnerApi.claimTaskReward(taskId);

      if (response.success) {
        platformAlertSimple('Task Reward Claimed!', response.data?.message || 'Congratulations! Your task reward has been claimed.');
        loadPartnerData();
      } else {
        platformAlertSimple('Error', response.error || 'Failed to claim task reward');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to claim task reward. Please try again.');
    }
  };

  const handleClaimOffer = async (offerId: string) => {
    try {
      const response = await partnerApi.claimOffer(offerId);

      if (response.success && response.data) {
        const voucherCode = response.data.voucher.code;
        const expiryDate = new Date(response.data.voucher.expiryDate).toLocaleDateString();

        await loadPartnerData();

        platformAlertConfirm(
          'Offer Claimed!',
          `Your exclusive offer has been activated.\n\nVoucher Code: ${voucherCode}\nExpires: ${expiryDate}\n\nUse this code during checkout to get your discount!`,
          () => {
            if (Platform.OS === 'web') {
              navigator.clipboard.writeText(voucherCode).catch(() => {});
            } else {
              Clipboard.setString(voucherCode);
            }
          },
          'Copy Code'
        );
      } else {
        platformAlertSimple('Error', response.error || 'Failed to claim offer');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to claim offer. Please try again.');
    }
  };

  const handleViewOfferTerms = (offer: ClaimableOffer) => {
    platformAlertSimple('Terms & Conditions', offer.termsAndConditions.join('\n\n'));
  };

  const handleContactSupport = () => {
    router.push('/help/chat' as any);
  };

  const handleJackpotMilestonePress = async (milestone: JackpotMilestone) => {
    if (milestone.claimedAt) {
      platformAlertSimple(
        'Already Claimed',
        `You claimed this jackpot reward on ${new Date(milestone.claimedAt).toLocaleDateString()}`
      );
      return;
    }

    if (!milestone.achieved) {
      const remaining = (milestone.spendAmount ?? 0) - ((partnerState.profile as any)?.totalSpent || 0);
      platformAlertSimple(
        milestone.title,
        `${milestone.description}\n\nSpend ${currencySymbol}${remaining.toLocaleString()} more to unlock this jackpot!`
      );
      return;
    }

    platformAlertConfirm(
      'Claim Jackpot Reward?',
      `${milestone.title}\n\nReward: ${milestone.reward.title}\nValue: ${currencySymbol}${milestone.reward.value}`,
      async () => {
        try {
          const response = await partnerApi.claimJackpotReward(milestone.spendAmount ?? 0);

          if (response.success) {
            platformAlertSimple(
              'Jackpot Claimed!',
              `Congratulations! ${currencySymbol}${milestone.reward.value} has been added to your wallet!`
            );
            loadPartnerData();
          } else {
            platformAlertSimple('Error', response.error || 'Failed to claim jackpot reward');
          }
        } catch (error) {
          platformAlertSimple('Error', 'Failed to claim jackpot reward. Please try again.');
        }
      },
      'Claim Now'
    );
  };

  const handleUpgradeLevel = (targetLevel: any) => {
    platformAlertSimple(
      'Upgrade to ' + targetLevel.name,
      `Requirements: ${targetLevel.requirements.orders} orders in ${targetLevel.requirements.timeframe} days`
    );
  };

  // Safe computed values with fallbacks
  const profile = partnerState.profile;
  const ordersRequired = profile?.level?.requirements?.orders ?? 0;
  const ordersThisLevel = profile?.ordersThisLevel ?? 0;
  const daysRemaining = profile?.daysRemaining ?? 0;
  const levelName = profile?.level?.name ?? 'Partner';
  const currentLevelNumber = profile?.level?.level ?? 1;

  // Format validity date properly
  const formatValidityDate = () => {
    if (profile?.validUntil) {
      const date = new Date(profile.validUntil);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    }
    return 'N/A';
  };

  // Get dynamic level data from backend or use defaults
  const getLevelCards = () => {
    if (partnerState.levels && partnerState.levels.length > 0) {
      return partnerState.levels.map((level: any, index: number) => ({
        level: level.level || index + 1,
        name: level.name || `Level ${index + 1}`,
        orders: level.requirements?.orders || 0,
        days: level.requirements?.timeframe || 0,
        current: (level.level || index + 1) === currentLevelNumber,
        locked: (level.level || index + 1) > currentLevelNumber,
        future: (level.level || index + 1) > currentLevelNumber + 1,
      }));
    }
    // Fallback to basic structure from backend profile
    return [
      { level: 1, name: 'Partner', orders: profile?.level?.requirements?.orders || 15, days: profile?.level?.requirements?.timeframe || 44, current: currentLevelNumber === 1, locked: false, future: false },
      { level: 2, name: 'Influencer', orders: 45, days: 44, current: currentLevelNumber === 2, locked: currentLevelNumber < 2, future: currentLevelNumber < 1 },
      { level: 3, name: 'Ambassador', orders: 100, days: 44, current: currentLevelNumber === 3, locked: currentLevelNumber < 3, future: currentLevelNumber < 2 }
    ];
  };

  if (partnerState.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />
        <LinearGradient
          colors={[Colors.gold, Colors.nileBlue]}
          style={styles.loadingContainer}
        >
          <View style={styles.loadingContent}>
            <View style={styles.loadingSpinner}>
              <Ionicons name="trophy" size={32} color={colors.brand.goldWarm} />
            </View>
            <Text style={styles.loadingText}>Loading Partner Profile...</Text>
            <Text style={styles.loadingSubtext}>Fetching your rewards</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (partnerState.error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={48} color={Colors.error} />
          </View>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{partnerState.error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={loadPartnerData}

          >
            <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.retryButtonGradient}>
              <Ionicons name="refresh" size={18} color="white" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Not enrolled — show join screen
  if (enrolled === false) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />
        <LinearGradient
          colors={[Colors.gold, Colors.nileBlue]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerGlassOverlay} />
          <View style={styles.headerContent}>
            <Pressable onPress={handleGoBack} style={styles.backButton}>
              <View style={styles.backButtonInner}>
                <Ionicons name="arrow-back" size={20} color="white" />
              </View>
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Partner Program</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <View style={styles.enrollContainer}>
          <View style={styles.enrollIconWrapper}>
            <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.enrollIconGradient}>
              <Ionicons name="people" size={40} color="white" />
            </LinearGradient>
          </View>
          <Text style={styles.enrollTitle}>Partner Program</Text>
          <Text style={styles.enrollDescription}>
            Earn rewards, unlock milestones, and get exclusive offers as a REZ partner. Track your progress and level up for bigger benefits.
          </Text>

          <View style={styles.enrollBenefits}>
            {[
              { icon: 'trophy' as const, text: 'Unlock milestones and earn cashback' },
              { icon: 'gift' as const, text: 'Claim exclusive partner offers' },
              { icon: 'trending-up' as const, text: 'Level up for bigger rewards' },
            ].map((item, index) => (
              <View key={index} style={styles.enrollBenefitRow}>
                <View style={styles.enrollBenefitIcon}>
                  <Ionicons name={item.icon} size={18} color={Colors.gold} />
                </View>
                <Text style={styles.enrollBenefitText}>{item.text}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={[styles.enrollButton, enrolling && styles.enrollButtonDisabled]}
            onPress={handleEnroll}
            disabled={enrolling}
          >
            <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.enrollButtonGradient}>
              {enrolling ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="rocket" size={20} color="white" />
                  <Text style={styles.enrollButtonText}>Join Now</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />

      {/* Premium Header with Green/Gold Gradient */}
      <LinearGradient
        colors={[Colors.gold, Colors.nileBlue]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Glass overlay */}
        <View style={styles.headerGlassOverlay} />

        {/* Decorative elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />

        <View style={styles.headerContent}>
          <Pressable onPress={handleGoBack} style={styles.backButton}>
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={20} color="white" />
            </View>
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Partner Profile</Text>
            <Text style={styles.headerSubtitle}>Rewards & Benefits Dashboard</Text>
          </View>

          <Pressable
            style={styles.menuButton}
           
            onPress={() => {
              router.push('/profile/activity' as any);
            }}
          >
            <View style={styles.menuButtonInner}>
              <Ionicons name="ellipsis-horizontal" size={20} color="white" />
            </View>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.gold]}
            tintColor={Colors.gold}
          />
        }
      >
        {/* Partner Card with Premium Glass Effect */}
        <View style={styles.partnerCard}>
          <LinearGradient
            colors={[Colors.gold, Colors.nileBlue]}
            style={styles.partnerCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Glass overlay */}
            <View style={styles.cardGlassOverlay} />

            <View style={styles.partnerInfo}>
              {/* Avatar with gold ring */}
              <View style={styles.avatarWrapper}>
                <LinearGradient
                  colors={[colors.brand.goldWarm, colors.warning]}
                  style={styles.avatarRing}
                >
                  {profile?.avatar ? (
                    <CachedImage
                      source={{ uri: profile.avatar }}
                      style={styles.avatar}
                      cachePolicy="memory-disk"
                      key={profile.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>
                        {profile?.name?.substring(0, 2).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
                {/* Level badge */}
                <View style={styles.levelBadge}>
                  <LinearGradient colors={[colors.brand.goldWarm, colors.warning]} style={styles.levelBadgeGradient}>
                    <Text style={styles.levelBadgeText}>{levelName}</Text>
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.partnerDetails}>
                <Text style={styles.partnerName}>{profile?.name || 'User'}</Text>
                <Text style={styles.partnerValidity}>Valid till {formatValidityDate()}</Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile?.totalOrders?.toLocaleString() || '0'}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{currencySymbol}{(profile as any)?.totalSpent?.toLocaleString() || '0'}</Text>
                <Text style={styles.statLabel}>Spent</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{daysRemaining}</Text>
                <Text style={styles.statLabel}>Days Left</Text>
              </View>
            </View>

            {/* Benefits Button */}
            <Pressable
              style={styles.benefitsButton}
             
              onPress={() => {
                const benefits = profile?.level?.benefits || profile?.currentBenefits || [];
                const benefitsList = Array.isArray(benefits) ? benefits.join('\n\u2022 ') : 'No benefits available';
                platformAlertSimple(
                  'Your Current Benefits',
                  `As a ${levelName}, you enjoy:\n\n\u2022 ${benefitsList}`
                );
              }}
            >
              <View style={styles.benefitsButtonInner}>
                <Ionicons name="gift" size={18} color={colors.brand.goldWarm} />
                <Text style={styles.benefitsButtonText}>View My Benefits</Text>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
              </View>
            </Pressable>
          </LinearGradient>
        </View>

        {/* Level Warning Banner - Shows when level is at risk */}
        {daysRemaining <= 7 && daysRemaining > 0 && ordersThisLevel < ordersRequired && (
          <LevelWarningBanner
            daysRemaining={daysRemaining}
            ordersNeeded={ordersRequired - ordersThisLevel}
            currentLevel={levelName}
            onShopNow={() => router.push('/(tabs)')}
          />
        )}

        {/* Partner Statistics Dashboard - Shows ranking and leaderboard preview */}
        <PartnerStatsDashboard
          compact={true}
          onViewLeaderboard={() => router.push('/partner/leaderboard')}
        />

        {/* Level Criteria Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrapper}>
              <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.sectionIcon}>
                <Ionicons name="trophy" size={16} color="white" />
              </LinearGradient>
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Level Criteria</Text>
              <Text style={styles.sectionSubtitle}>Track your progress and unlock rewards</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              style={styles.upgradeButton}
             
              onPress={() => {
                const nextLevel = currentLevelNumber + 1;
                const levelNames = ['Partner', 'Influencer', 'Ambassador'];
                const nextLevelName = levelNames[nextLevel - 1] || 'Next Level';
                const ordersNeeded = Math.max(0, ordersRequired - ordersThisLevel);
                platformAlertSimple(
                  `Upgrade to ${nextLevelName}`,
                  `Complete ${ordersNeeded} more orders within ${daysRemaining} days to upgrade and unlock exclusive benefits!`
                );
              }}
            >
              <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.upgradeButtonGradient}>
                <Ionicons name="trending-up" size={16} color="white" />
                <Text style={styles.upgradeButtonText}>Upgrade Level</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={styles.maintainButton}
             
              onPress={() => {
                platformAlertSimple(
                  'Maintain Your Level',
                  `To maintain your ${levelName} status, complete ${ordersRequired} orders every ${profile?.level?.requirements?.timeframe || 44} days.\n\nKeep shopping to retain your benefits!`
                );
              }}
            >
              <Ionicons name="shield-checkmark" size={16} color={Colors.gold} />
              <Text style={styles.maintainButtonText}>Maintain Level</Text>
            </Pressable>
          </View>

          {/* Level Cards */}
          <View style={styles.levelCards}>
            {getLevelCards().map((level) => (
              <View
                key={level.level}
                style={[
                  styles.levelCard,
                  level.current && styles.currentLevelCard,
                  level.locked && styles.lockedLevelCard
                ]}
              >
                {level.current && <View style={styles.currentIndicator} />}

                <Text style={[styles.levelCardLabel, level.current && styles.currentLevelText]}>
                  Level {level.level}
                </Text>
                <Text style={[styles.levelCardName, level.current && styles.currentLevelText]}>
                  {level.name}
                </Text>

                {!level.future ? (
                  <View style={styles.levelRequirements}>
                    <Text style={[styles.levelOrderCount, level.current && styles.currentLevelText]}>
                      {level.orders}
                    </Text>
                    <Text style={[styles.levelDays, level.current && styles.currentLevelSubtext]}>
                      {level.days} days
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.futureLevelText}>
                    Unlock{'\n'}this level
                  </Text>
                )}

                {level.locked && !level.future && (
                  <Ionicons name="lock-closed" size={14} color={colors.gray[400]} style={styles.lockIcon} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Important Information */}
        <View style={styles.infoSection}>
          <LinearGradient colors={[colors.linen, colors.linen]} style={styles.infoGradient}>
            <View style={styles.infoHeader}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="information-circle" size={20} color={Colors.gold} />
              </View>
              <View>
                <Text style={styles.infoTitle}>Important Information</Text>
                <Text style={styles.infoSubtitle}>Level maintenance requirements</Text>
              </View>
            </View>
            <View style={styles.infoContent}>
              <View style={styles.infoPoint}>
                <View style={[styles.bullet, { backgroundColor: Colors.gold }]} />
                <Text style={styles.infoText}>
                  Level progress resets when upgrading - maintain your achievements through consistent activity.
                </Text>
              </View>
              <View style={styles.infoPoint}>
                <View style={[styles.bullet, { backgroundColor: Colors.gold }]} />
                <Text style={styles.infoText}>
                  Failure to meet requirements within the timeframe will automatically revert you to the previous level.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Jackpot Timeline */}
        <JackpotTimeline
          milestones={partnerState.jackpotProgress}
          currentSpent={(profile as any)?.totalSpent || 0}
          onMilestonePress={handleJackpotMilestonePress}
        />

        {/* Milestone Tracker */}
        <MilestoneTracker
          milestones={partnerState.milestones}
          currentOrders={profile?.totalOrders ?? 0}
          onClaimReward={handleClaimReward}
        />

        {/* Reward Tasks */}
        <RewardTasks
          tasks={partnerState.tasks}
          onCompleteTask={handleCompleteTask}
          onClaimReward={handleClaimTaskReward}
        />

        {/* Benefits Comparison Table */}
        <BenefitsTable
          levels={partnerState.levels || partnerLevels}
          currentLevel={currentLevelNumber}
          onUpgradePress={handleUpgradeLevel}
        />

        {/* Claimable Offers */}
        <OffersGrid
          offers={partnerState.claimableOffers}
          onClaimOffer={handleClaimOffer}
          onViewTerms={handleViewOfferTerms}
        />

        {/* FAQ Section */}
        <FAQAccordion
          faqs={partnerState.faqs}
          onContactPress={handleContactSupport}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Level Up Celebration Modal */}
      <LevelUpCelebration
        visible={levelUpModal.visible}
        oldLevel={levelUpModal.oldLevel}
        newLevel={levelUpModal.newLevel}
        levelName={levelUpModal.levelName}
        benefits={levelUpModal.benefits}
        bonusAmount={levelUpModal.bonusAmount}
        onClose={closeLevelUpModal}
        onShopNow={() => {
          closeLevelUpModal();
          router.push('/(tabs)');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.linen,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  loadingText: {
    color: Colors.text.inverse,
    fontSize: Typography.h4.fontSize,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Typography.body.fontSize,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: colors.linen,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  errorTitle: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
  },
  errorText: {
    color: colors.gray[400],
    fontSize: Typography.bodyLarge.fontSize,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  retryButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    fontSize: Typography.body.fontSize,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 35,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -20,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    top: 60,
    left: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorativeCircle3: {
    position: 'absolute',
    bottom: -20,
    right: 40,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 200, 87, 0.2)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  backButton: {
    zIndex: 3,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.text.inverse,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: Typography.bodySmall.fontSize,
    marginTop: 2,
  },
  menuButton: {
    zIndex: 3,
  },
  menuButtonInner: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 100,
  },

  // Partner Card
  partnerCard: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 192, 106, 0.2)',
      },
      default: {
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
      },
    }),
  },
  partnerCardGradient: {
    padding: Spacing.xl,
    position: 'relative',
  },
  cardGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.base,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    backgroundColor: Colors.background.primary,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.gold,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  levelBadgeGradient: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  levelBadgeText: {
    color: Colors.nileBlue,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  partnerDetails: {
    flex: 1,
  },
  partnerName: {
    color: Colors.text.inverse,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    letterSpacing: -0.3,
  },
  partnerValidity: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: Typography.body.fontSize,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: Colors.text.inverse,
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: Typography.caption.fontSize,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: Spacing.xs,
  },

  // Benefits Button
  benefitsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  benefitsButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  benefitsButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    flex: 1,
  },

  // Section
  section: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionIconWrapper: {
    marginRight: Spacing.md,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: colors.gray[400],
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  upgradeButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  upgradeButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  maintainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: Spacing.sm,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  maintainButtonText: {
    color: Colors.gold,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },

  // Level Cards
  levelCards: {
    flexDirection: 'row',
    gap: 10,
  },
  levelCard: {
    flex: 1,
    backgroundColor: colors.linen,
    borderRadius: BorderRadius.lg,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    position: 'relative',
  },
  currentLevelCard: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 192, 106, 0.3)',
      },
      default: {
        shadowColor: Colors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  lockedLevelCard: {
    opacity: 0.5,
  },
  currentIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.brand.goldWarm,
    borderWidth: 2,
    borderColor: 'white',
  },
  levelCardLabel: {
    fontSize: Typography.overline.fontSize,
    fontWeight: '600',
    color: colors.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  levelCardName: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
  },
  currentLevelText: {
    color: Colors.text.inverse,
  },
  currentLevelSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  levelRequirements: {
    alignItems: 'center',
  },
  levelOrderCount: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  levelDays: {
    fontSize: Typography.caption.fontSize,
    color: colors.gray[400],
    marginTop: 2,
  },
  futureLevelText: {
    fontSize: Typography.overline.fontSize,
    color: colors.gray[400],
    textAlign: 'center',
    lineHeight: 14,
  },
  lockIcon: {
    marginTop: Spacing.xs,
  },

  // Info Section
  infoSection: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  infoGradient: {
    padding: Spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  infoTitle: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: 2,
  },
  infoSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: colors.gray[400],
  },
  infoContent: {
    gap: Spacing.md,
  },
  infoPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: Spacing.md,
  },
  infoText: {
    fontSize: Typography.body.fontSize,
    color: '#1F2D3D',
    lineHeight: 20,
    flex: 1,
  },

  bottomSpacer: {
    height: 40,
  },

  // Enrollment Screen
  enrollContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 60,
  },
  enrollIconWrapper: {
    marginBottom: Spacing.xl,
    borderRadius: 44,
    overflow: 'hidden',
  },
  enrollIconGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enrollTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  enrollDescription: {
    fontSize: Typography.bodyLarge.fontSize,
    color: colors.gray[400],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  enrollBenefits: {
    width: '100%',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  enrollBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  enrollBenefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 205, 87, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  enrollBenefitText: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    color: Colors.nileBlue,
    fontWeight: '500',
  },
  enrollButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  enrollButtonDisabled: {
    opacity: 0.7,
  },
  enrollButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: Spacing.sm,
  },
  enrollButtonText: {
    color: Colors.text.inverse,
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
  },
});

export default withErrorBoundary(PartnerProfilePage, 'Partner');
