// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Modal,
  TextInput,
  Share,
  Linking,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import gamificationApi, {
  CheckInReward,
  StreakData,
  AffiliateStats,
  PromotionalPoster,
  ShareSubmission,
  StreakBonus,
} from '@/services/gamificationApi';
import { useGamification } from '@/contexts/GamificationContext';
import { useGetCurrencySymbol, useRefreshWallet } from '@/stores/selectors';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import apiClient from '@/services/apiClient';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';

const { width } = Dimensions.get('window');

function DailyCheckInPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { actions: gamificationActions } = useGamification();
  const getCurrencySymbol = useGetCurrencySymbol();
  const refreshWallet = useRefreshWallet();
  const currencySymbol = getCurrencySymbol();
  const scrollViewRef = useRef<ScrollView>(null);
  const postersYPosition = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // API state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);

  const [checkInRewards, setCheckInRewards] = useState<CheckInReward[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [selectedPoster, setSelectedPoster] = useState<PromotionalPoster | null>(null);

  // Error states for API failures
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [postersError, setPostersError] = useState<string | null>(null);
  const [bonusesError, setBonusesError] = useState<string | null>(null);

  // Data fetched from API
  const [promotionalPosters, setPromotionalPosters] = useState<PromotionalPoster[]>([]);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats>({
    totalShares: 0,
    appDownloads: 0,
    purchases: 0,
    commissionEarned: 0,
  });
  const [streakBonuses, setStreakBonuses] = useState<StreakBonus[]>([]);
  // Countdown timer for next check-in
  const [countdown, setCountdown] = useState('');
  const [streakWasReset, setStreakWasReset] = useState(false);

  // Streak freeze state
  const [freezeLoading, setFreezeLoading] = useState(false);
  const [isStreakFrozen, setIsStreakFrozen] = useState(false);

  // Check-in success animation values (Gap 28)
  const rewardScaleAnim = useSharedValue(0.3);
  const rewardOpacityAnim = useSharedValue(0);
  const rewardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rewardScaleAnim.value }],
    opacity: rewardOpacityAnim.value,
  }));

  // Countdown timer effect — ticks every second when checked in today
  useEffect(() => {
    if (!hasCheckedInToday) {
      setCountdown('');
      return;
    }

    const tick = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
      nextMidnight.setUTCHours(0, 0, 0, 0);
      const diff = nextMidnight.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('Available now!');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    tick(); // Initial
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [hasCheckedInToday]);

  const [proTips, setProTips] = useState<string[]>([
    'Check in at the same time daily to build a habit',
    'Share posters daily to maximize your affiliate earnings',
    'Track your affiliate performance to see which posters work best',
    'Missing even one day resets your streak to zero',
  ]);
  const [affiliateTip, setAffiliateTip] = useState('Share posters → Friends download the app → Earn 100 coins/download + 5% commission on their first 3 purchases!');
  const [reviewTimeframe, setReviewTimeframe] = useState('within 24 hours');

  // Fetch all check-in page data from APIs
  const fetchCheckInData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Clear previous errors
      setCalendarError(null);
      setPostersError(null);
      setBonusesError(null);

      // Fetch streak first, then pass to calendar to avoid duplicate API call
      const streakResponse = await gamificationApi.getStreakStatus();

      if (!isMountedRef.current) return;

      // Fetch remaining data in parallel
      const [
        calendarResponse,
        affiliateResponse,
        postersResponse,
        submissionsResponse,
        bonusesResponse,
        configResponse,
      ] = await Promise.all([
        gamificationApi.getWeeklyCalendar(streakResponse.data || undefined),
        gamificationApi.getAffiliateStats(),
        gamificationApi.getPromotionalPosters(),
        gamificationApi.getShareSubmissions(),
        gamificationApi.getStreakBonuses(),
        gamificationApi.getCheckinConfig(),
      ]);

      if (!isMountedRef.current) return;

      // Update streak data
      if (streakResponse.success && streakResponse.data) {
        const { currentStreak: streak, longestStreak, hasCheckedInToday: checkedIn, totalEarned: earned } = streakResponse.data;
        // Detect streak reset: user had a higher streak before but now at 0 or 1
        if (longestStreak > 1 && streak <= 1 && !checkedIn) {
          setStreakWasReset(true);
        }
        setCurrentStreak(streak);
        setBestStreak(longestStreak);
        setHasCheckedInToday(checkedIn);
        setTotalEarned(earned);
      }

      // Update calendar
      if (calendarResponse.success && calendarResponse.data) {
        setCheckInRewards(calendarResponse.data);
        setCalendarError(null);
      } else {
        setCalendarError(calendarResponse.error || 'Unable to load check-in calendar');
      }

      // Update affiliate stats
      if (affiliateResponse.success && affiliateResponse.data) {
        setAffiliateStats(affiliateResponse.data);
      }

      // Update promotional posters
      if (postersResponse.success && postersResponse.data) {
        setPromotionalPosters(postersResponse.data);
        setPostersError(null);
      } else if (!postersResponse.success) {
        setPostersError(postersResponse.error || 'Unable to load promotional posters');
      }

      // Update submissions
      if (submissionsResponse.success && submissionsResponse.data) {
        setSubmissions(submissionsResponse.data);
      }

      // Update streak bonuses
      if (bonusesResponse.success && bonusesResponse.data) {
        setStreakBonuses(bonusesResponse.data);
        setBonusesError(null);
      } else {
        setBonusesError(bonusesResponse.error || 'Unable to load streak bonuses');
      }

      // Update config (pro tips, affiliate tip, review timeframe)
      if (configResponse.success && configResponse.data) {
        if (configResponse.data.proTips?.length > 0) {
          setProTips(configResponse.data.proTips);
        }
        if (configResponse.data.affiliateTip) {
          setAffiliateTip(configResponse.data.affiliateTip);
        }
        if (configResponse.data.reviewTimeframe) {
          setReviewTimeframe(configResponse.data.reviewTimeframe);
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      setCalendarError('Network error. Please try again.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCheckInData();
  }, [fetchCheckInData]);

  const onRefresh = useCallback(() => {
    fetchCheckInData(true);
  }, [fetchCheckInData]);

  // Submission workflow states
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitUrl, setSubmitUrl] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [submissions, setSubmissions] = useState<ShareSubmission[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [checkInStarted, setCheckInStarted] = useState(false);
  const [pendingCheckInReward, setPendingCheckInReward] = useState<CheckInReward | null>(null);
  const [sharedPoster, setSharedPoster] = useState<PromotionalPoster | null>(null);

  // Streak freeze handler (Gap 27)
  const handleFreezeStreak = () => {
    const FREEZE_COST = 50;
    platformAlertConfirm(
      'Freeze Streak',
      `Spend ${FREEZE_COST} ${BRAND.CURRENCY_CODE} to freeze your streak for 1 day? Your streak won't reset if you miss tomorrow's check-in.`,
      async () => {
        setFreezeLoading(true);
        try {
          const response = await apiClient.post<any>('/streak/freeze', {
            type: 'daily_checkin',
            days: 1,
          });
          if (response.success) {
            setIsStreakFrozen(true);
            platformAlertSimple('Streak Frozen!', 'Your streak is protected for 1 day. You can still check in as usual.');
          } else {
            platformAlertSimple('Failed', response.error || 'Could not freeze streak. Please try again.');
          }
        } catch (error: any) {
          platformAlertSimple('Error', error.message || 'Something went wrong. Please try again.');
        } finally {
          setFreezeLoading(false);
        }
      },
      'Freeze',
      'Cancel',
    );
  };

  // Check-in success animation trigger (Gap 28)
  const triggerRewardAnimation = () => {
    rewardScaleAnim.value = 0.3;
    rewardOpacityAnim.value = 0;

    rewardScaleAnim.value = withSpring(1, { damping: 4, stiffness: 60 });
    rewardOpacityAnim.value = withTiming(1, { duration: 300 });
  };

  const handleCheckIn = async () => {
    if (hasCheckedInToday || checkInLoading) return;

    const todayReward = checkInRewards.find(r => r.today);
    if (todayReward && !todayReward.claimed) {
      setCheckInStarted(true);
      setPendingCheckInReward(todayReward);
      // Scroll to promotional posters section
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: postersYPosition.current, animated: true });
      }, 100);
    }
  };

  const completeCheckIn = async () => {
    if (pendingCheckInReward) {
      try {
        setCheckInLoading(true);

        // Call API to perform check-in
        const response = await gamificationApi.performCheckIn();

        if (response.success && response.data) {
          setShowReward(true);
          triggerRewardAnimation();
          setCurrentStreak(response.data.streak);
          setTotalEarned(prev => prev + response.data.totalEarned);
          setHasCheckedInToday(true);

          // Update the checkInRewards to mark as claimed
          setCheckInRewards(prev => prev.map(r =>
            r.day === pendingCheckInReward.day ? { ...r, claimed: true } : r
          ));

          // Refresh wallet to reflect the earned coins
          await refreshWallet();
          await gamificationActions.syncCoinsFromWallet();

          setTimeout(() => {
            setShowReward(false);
          }, 3000);
        } else {
          platformAlertSimple('Check-in Failed', response.error || 'Please try again later');
        }
      } catch (error: any) {
        platformAlertSimple('Error', error.message || 'Something went wrong');
      } finally {
        setCheckInLoading(false);
        setCheckInStarted(false);
        setPendingCheckInReward(null);
      }
    }
  };

  const handleSharePoster = async (poster: typeof promotionalPosters[0], platform: string) => {
    const affiliateCode = `REZ${Date.now().toString(36)}`;
    const shareUrl = `https://rez.app?ref=${affiliateCode}`;
    const shareText = `${poster.title} - ${poster.subtitle}! Download ${BRAND.APP_NAME} app and get amazing deals. Use my code: ${affiliateCode}`;

    try {
      if (platform === 'instagram') {
        platformAlertSimple('Link Copied!', 'Paste it in your Instagram story or post.');
      }

      await Share.share({
        message: shareText + ' ' + shareUrl,
        title: poster.title,
      });

      // Save poster data for submission, then close poster modal
      setSharedPoster(poster);
      setSelectedPlatform(platform);
      setSelectedPoster(null);
      setShowSubmitModal(true);
    } catch (error) {
    }
  };

  const handleSubmitPost = async () => {
    if (!submitUrl.trim()) {
      platformAlertSimple('Error', 'Please enter the URL of your shared post');
      return;
    }

    // Validate URL format
    try {
      new URL(submitUrl);
    } catch {
      platformAlertSimple('Error', 'Please enter a valid URL');
      return;
    }

    setSubmitting(true);

    try {
      // Call API to submit the post
      const response = await gamificationApi.submitSharePost({
        posterId: sharedPoster?.id || '',
        posterTitle: sharedPoster?.title || 'Promotional Poster',
        postUrl: submitUrl,
        platform: selectedPlatform,
        shareBonus: sharedPoster?.shareBonus || 0,
      });

      if (response.success && response.data) {
        // Add the new submission to the list
        setSubmissions(prev => [response.data!, ...prev]);

        // Update affiliate stats locally (single increment for the share+submit)
        setAffiliateStats(prev => ({
          ...prev,
          totalShares: prev.totalShares + 1,
        }));

        setShowSubmitModal(false);
        setSubmitUrl('');
        setSelectedPlatform('');
        setSharedPoster(null);

        // Complete the check-in if it was started
        if (checkInStarted) {
          await completeCheckIn();
        }

        platformAlertSimple(
          'Success!',
          'Your post has been submitted for review! Check-in completed! You will receive share bonus coins once approved.'
        );
      } else {
        platformAlertSimple('Submission Failed', response.error || 'Please try again later');
      }
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const todayReward = checkInRewards.find(r => r.today);
  const isNewAffiliate = affiliateStats.totalShares === 0 && affiliateStats.appDownloads === 0 && affiliateStats.purchases === 0 && affiliateStats.commissionEarned === 0;

  return (
    <View style={styles.container}>
      {/* Hide default expo-router header */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="calendar" size={20} color={Colors.info} />
          <Text style={styles.headerTitle}>Daily Check-In & Earn</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.info]} />
        }
      >
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: 'rgba(249, 115, 22, 0.1)', borderColor: 'rgba(249, 115, 22, 0.2)' }]}>
            <Ionicons name="flame" size={20} color={colors.brand.orange} />
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
            <CachedImage source={BRAND.COIN_IMAGE} style={styles.coinIcon20} contentFit="contain" />
            <Text style={styles.statValue}>{currencySymbol}{totalEarned}</Text>
            <Text style={styles.statLabel}>Total earned</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)' }]}>
            <Ionicons name="trending-up" size={20} color={colors.brand.purpleLight} />
            <Text style={styles.statValue}>{bestStreak}</Text>
            <Text style={styles.statLabel}>Best streak</Text>
          </View>
        </View>

        {/* Skeleton Loading State */}
        {loading && (
          <View style={styles.skeletonContainer}>
            {/* Calendar skeleton */}
            <View style={styles.skeletonSection}>
              <View style={styles.skeletonTitleBar} />
              <View style={styles.skeletonCalendarGrid}>
                {[1,2,3,4,5,6].map(i => (
                  <View key={i} style={styles.skeletonCalendarDay} />
                ))}
              </View>
              <View style={styles.skeletonBonusDay} />
            </View>
            {/* Check-in button skeleton */}
            <View style={[styles.skeletonBlock, styles.skeletonCheckInBtn]} />
            {/* Affiliate stats skeleton */}
            <View style={styles.skeletonSection}>
              <View style={styles.skeletonTitleBar} />
              <View style={styles.skeletonStatsRow}>
                {[1,2,3,4].map(i => (
                  <View key={i} style={[styles.skeletonBlock, styles.skeletonStatItem]} />
                ))}
              </View>
            </View>
            {/* Posters skeleton */}
            <View style={styles.skeletonSection}>
              <View style={styles.skeletonTitleBar} />
              <View style={styles.skeletonPostersRow}>
                {[1,2].map(i => (
                  <View key={i} style={[styles.skeletonBlock, styles.skeletonPosterItem]} />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Info Banner */}
        {!loading && <View style={styles.infoBannerContainer}>
          {checkInStarted ? (
            <LinearGradient
              colors={[Colors.warning, colors.brand.orange]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.infoBanner}
            >
              <View style={styles.infoBannerHeader}>
                <Ionicons name="gift" size={20} color={Colors.text.inverse} />
                <Text style={styles.infoBannerTitle}>Complete Your Check-In!</Text>
              </View>
              <Text style={styles.infoBannerText}>
                Share a promotional poster below and submit your post link to complete today's check-in and earn {currencySymbol}{pendingCheckInReward?.coins} coins!
              </Text>
            </LinearGradient>
          ) : (
            <LinearGradient
              colors={[Colors.nileBlue, Colors.nileBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.infoBanner}
            >
              <View style={styles.infoBannerHeader}>
                <Ionicons name="gift" size={20} color={Colors.text.inverse} />
                <Text style={styles.infoBannerTitle}>How Daily Check-In Works!</Text>
              </View>
              <Text style={styles.infoBannerText}>
                1. Click "Check In Now" → 2. Share a promotional poster → 3. Submit your post link → 4. Earn coins + share bonus!
              </Text>
            </LinearGradient>
          )}
        </View>}

        {/* Check-In Calendar */}
        {!loading && (<>
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={16} color={Colors.text.primary} />
            <Text style={styles.sectionTitle}>Daily Check-In Calendar</Text>
          </View>
          {calendarError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={32} color={Colors.error} />
              <Text style={styles.errorText}>{calendarError}</Text>
              <Pressable style={styles.retryButton} onPress={() => fetchCheckInData()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : checkInRewards.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={32} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>No check-in data available</Text>
            </View>
          ) : (
          <>
          <View style={styles.calendarGrid}>
            {checkInRewards.filter(r => !r.bonus).map((reward) => (
              <View
                key={reward.day}
                style={[
                  styles.calendarDay,
                  reward.claimed && styles.calendarDayClaimed,
                  reward.today && !reward.claimed && styles.calendarDayToday,
                ]}
              >
                <Text style={styles.calendarDayLabel}>Day {reward.day}</Text>
                <View style={styles.calendarCoinContainer}>
                  <CachedImage
                    source={BRAND.COIN_IMAGE}
                    style={{ width: 12, height: 12 }}
                    contentFit="contain"
                  />
                  <Text style={[
                    styles.calendarCoinText,
                    reward.claimed && { color: Colors.gold },
                    reward.today && !reward.claimed && { color: Colors.info },
                  ]}>
                    {currencySymbol}{reward.coins}
                  </Text>
                </View>
                {reward.claimed && (
                  <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
                )}
              </View>
            ))}
          </View>
          {/* Bonus Day 7 */}
          {checkInRewards.filter(r => r.bonus).map((reward) => (
            <View
              key={reward.day}
              style={[
                styles.bonusDay,
                reward.claimed && styles.bonusDayClaimed,
              ]}
            >
              <Text style={styles.calendarDayLabel}>Day {reward.day}</Text>
              <View style={styles.calendarCoinContainer}>
                <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 14, height: 14 }} contentFit="contain" />
                <Text style={styles.bonusCoinText}>{currencySymbol}{reward.coins}</Text>
              </View>
              <Text style={styles.bonusLabel}>BONUS!</Text>
            </View>
          ))}
          </>
          )}
        </View>

        {/* Check-In Button */}
        <View style={styles.checkInButtonContainer}>
          <Pressable
            onPress={handleCheckIn}
            disabled={hasCheckedInToday || todayReward?.claimed || checkInStarted}
            style={[
              styles.checkInButton,
              (hasCheckedInToday || todayReward?.claimed) && styles.checkInButtonChecked,
              checkInStarted && styles.checkInButtonPending,
            ]}
          >
            <LinearGradient
              colors={
                (hasCheckedInToday || todayReward?.claimed)
                  ? [Colors.gold, Colors.nileBlue]
                  : checkInStarted
                    ? [Colors.warning, colors.warningScale[700]]
                    : [Colors.success, colors.brand.greenDark]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.checkInButtonGradient}
            >
              {(hasCheckedInToday || todayReward?.claimed) ? (
                <View style={styles.checkInButtonContent}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.text.inverse} />
                  <Text style={styles.checkInButtonText}>Checked In Today</Text>
                </View>
              ) : checkInStarted ? (
                <View style={styles.checkInButtonContent}>
                  <Ionicons name="time" size={20} color={Colors.text.inverse} />
                  <Text style={styles.checkInButtonText}>Share & Submit Post to Complete</Text>
                </View>
              ) : (
                <View style={styles.checkInButtonContent}>
                  <Ionicons name="calendar" size={20} color={Colors.text.inverse} />
                  <Text style={styles.checkInButtonText}>Check In Now (+{currencySymbol}{todayReward?.coins})</Text>
                </View>
              )}
            </LinearGradient>
          </Pressable>

          {/* Countdown to next check-in */}
          {hasCheckedInToday && countdown ? (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>
                Next check-in in <Text style={{ fontWeight: '700', color: colors.brand.orange }}>{countdown}</Text>
              </Text>
            </View>
          ) : null}

          {/* Streak reset notification */}
          {streakWasReset && currentStreak === 1 ? (
            <View style={styles.streakResetBanner}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.streakResetText}>
                Your streak was reset because you missed a day. Start building it back!
              </Text>
            </View>
          ) : null}

          {/* Freeze Streak Button (Gap 27) */}
          {currentStreak >= 2 && !isStreakFrozen && (
            <Pressable
              style={styles.freezeStreakButton}
              onPress={handleFreezeStreak}
              disabled={freezeLoading}
            >
              {freezeLoading ? (
                <ActivityIndicator size="small" color={Colors.info} />
              ) : (
                <>
                  <Ionicons name="snow" size={16} color={Colors.info} />
                  <Text style={styles.freezeStreakText}>{`Freeze for 50 ${BRAND.CURRENCY_CODE}`}</Text>
                </>
              )}
            </Pressable>
          )}
          {isStreakFrozen && (
            <View style={styles.freezeStreakActive}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
              <Text style={styles.freezeStreakActiveText}>Streak protected for today</Text>
            </View>
          )}
        </View>

        {/* Affiliate Stats Dashboard */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={16} color={Colors.text.primary} />
            <Text style={styles.sectionTitle}>Your Affiliate Performance</Text>
          </View>
          <View style={styles.affiliateGrid}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.1)', 'rgba(6, 182, 212, 0.1)']}
              style={styles.affiliateCard}
            >
              <Ionicons name="share-social" size={20} color={Colors.info} />
              <Text style={styles.affiliateValue}>{affiliateStats.totalShares}</Text>
              <Text style={styles.affiliateLabel}>Total Shares</Text>
            </LinearGradient>
            <LinearGradient
              colors={['rgba(34, 197, 94, 0.1)', 'rgba(16, 185, 129, 0.1)']}
              style={styles.affiliateCard}
            >
              <Ionicons name="people" size={20} color={Colors.success} />
              <Text style={styles.affiliateValue}>{affiliateStats.appDownloads}</Text>
              <Text style={styles.affiliateLabel}>App Downloads</Text>
            </LinearGradient>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(236, 72, 153, 0.1)']}
              style={styles.affiliateCard}
            >
              <Ionicons name="cart" size={20} color={Colors.nileBlue} />
              <Text style={styles.affiliateValue}>{affiliateStats.purchases}</Text>
              <Text style={styles.affiliateLabel}>Purchases Made</Text>
            </LinearGradient>
            <LinearGradient
              colors={['rgba(245, 158, 11, 0.1)', 'rgba(249, 115, 22, 0.1)']}
              style={styles.affiliateCard}
            >
              <CachedImage source={BRAND.COIN_IMAGE} style={styles.coinIcon20} contentFit="contain" />
              <Text style={styles.affiliateValue}>{currencySymbol}{affiliateStats.commissionEarned}</Text>
              <Text style={styles.affiliateLabel}>Commission Earned</Text>
            </LinearGradient>
          </View>
          {isNewAffiliate && (
            <View style={styles.affiliateOnboarding}>
              <Ionicons name="rocket-outline" size={28} color={Colors.info} />
              <Text style={styles.affiliateOnboardingTitle}>Start Earning Today!</Text>
              <Text style={styles.affiliateOnboardingText}>
                Share your first promotional poster below to begin earning affiliate commissions. Every share counts!
              </Text>
            </View>
          )}
          <View style={styles.affiliateTip}>
            <Text style={styles.affiliateTipText}>
              <Text style={styles.affiliateTipBold}>How it works: </Text>
              {affiliateTip}
            </Text>
          </View>
        </View>

        {/* Promotional Posters */}
        <View
          style={styles.sectionContainer}
          onLayout={(event) => {
            postersYPosition.current = event.nativeEvent.layout.y;
          }}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="share-social" size={16} color={Colors.text.primary} />
            <Text style={styles.sectionTitle}>Share Promotional Posters</Text>
            {checkInStarted && (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>Required</Text>
              </View>
            )}
          </View>
          {postersError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={32} color={Colors.error} />
              <Text style={styles.errorText}>{postersError}</Text>
              <Pressable style={styles.retryButton} onPress={() => fetchCheckInData()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : promotionalPosters.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={32} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>No promotional posters available</Text>
              <Text style={styles.emptySubtext}>Check back later for new campaigns!</Text>
            </View>
          ) : (
          <View style={[
            styles.postersGrid,
            checkInStarted && styles.postersGridHighlight,
          ]}>
            {promotionalPosters.map((poster) => (
              <Pressable
                key={poster.id}
                style={styles.posterCard}
                onPress={() => setSelectedPoster(poster)}
              >
                <LinearGradient
                  colors={poster.colors}
                  style={styles.posterGradient}
                >
                  <CachedImage
                    source={poster.image}
                    style={styles.posterImage}
                    blurRadius={2}
                  />
                  <View style={styles.posterContent}>
                    <Text style={styles.posterTitle}>{poster.title}</Text>
                    <Text style={styles.posterSubtitle}>{poster.subtitle}</Text>
                    <View style={styles.posterFooter}>
                      <View style={styles.posterBonus}>
                        <Text style={styles.posterBonusText}>+{currencySymbol}{poster.shareBonus} bonus</Text>
                      </View>
                      <Ionicons name="share-social" size={16} color={Colors.text.inverse} />
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
          )}
        </View>

        {/* Submission History */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="link" size={16} color={Colors.text.primary} />
            <Text style={styles.sectionTitle}>Your Submissions</Text>
          </View>
          {submissions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={32} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>No submissions yet</Text>
              <Text style={styles.emptySubtext}>Share your first poster to start earning!</Text>
            </View>
          ) : (
          <>
            {submissions.map((submission) => (
              <View key={submission.id} style={styles.submissionCard}>
                <View style={styles.submissionHeader}>
                  <View style={styles.submissionInfo}>
                    <Text style={styles.submissionTitle}>{submission.posterTitle}</Text>
                    <Text style={styles.submissionDate}>Submitted: {new Date(submission.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    <Pressable
                      onPress={() => { try { Linking.openURL(submission.postUrl); } catch (e) { catchAndWarn(e, 'DailyCheckin/openURL'); } }}
                      style={styles.submissionLink}
                    >
                      <Ionicons name="link" size={12} color={Colors.info} />
                      <Text style={styles.submissionLinkText}>View Post</Text>
                    </Pressable>
                  </View>
                  <View style={styles.submissionStatus}>
                    {submission.status === 'pending' && (
                      <View style={styles.statusBadgePending}>
                        <Ionicons name="time" size={12} color={colors.warningScale[700]} />
                        <Text style={styles.statusTextPending}>Pending</Text>
                      </View>
                    )}
                    {(submission.status === 'approved' || submission.status === 'credited') && (
                      <View style={styles.statusBadgeApproved}>
                        <Ionicons name="checkmark-circle" size={12} color={Colors.nileBlue} />
                        <Text style={styles.statusTextApproved}>Approved</Text>
                      </View>
                    )}
                    {submission.status === 'rejected' && (
                      <View style={styles.statusBadgeRejected}>
                        <Ionicons name="close-circle" size={12} color={Colors.error} />
                        <Text style={styles.statusTextRejected}>Rejected</Text>
                      </View>
                    )}
                    <Text style={styles.submissionBonus}>+{currencySymbol}{submission.shareBonus}</Text>
                  </View>
                </View>
                {(submission.status === 'approved' || submission.status === 'credited') && (
                  <View style={styles.submissionFooter}>
                    <Ionicons name="trophy" size={12} color={Colors.nileBlue} />
                    <Text style={styles.submissionFooterText}>
                      Approved{submission.approvedAt ? ` on ${new Date(submission.approvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''} - {currencySymbol}{submission.shareBonus} credited!
                    </Text>
                  </View>
                )}
                {submission.status === 'pending' && (
                  <View style={styles.submissionFooterPending}>
                    <Text style={styles.submissionFooterPendingText}>
                      Under review - You'll earn {currencySymbol}{submission.shareBonus} once approved!
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </>
          )}
        </View>

        {/* Streak Bonuses */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Streak Bonuses</Text>
          {bonusesError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={32} color={Colors.error} />
              <Text style={styles.errorText}>{bonusesError}</Text>
              <Pressable style={styles.retryButton} onPress={() => fetchCheckInData()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : streakBonuses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={32} color={Colors.text.tertiary} />
              <Text style={styles.emptyText}>No streak bonuses available</Text>
            </View>
          ) : (
          <View style={styles.streakList}>
            {streakBonuses.map((bonus, index) => {
              // Dynamic colors based on index
              const colors = [
                { bg: 'rgba(59, 130, 246, 0.2)', icon: Colors.info },
                { bg: 'rgba(139, 92, 246, 0.2)', icon: Colors.nileBlue },
                { bg: 'rgba(236, 72, 153, 0.2)', icon: colors.brand.pink },
              ];
              const colorSet = colors[index % colors.length];

              return (
                <View
                  key={bonus.days}
                  style={[
                    styles.streakCard,
                    bonus.achieved && styles.streakCardAchieved,
                  ]}
                >
                  <View style={[styles.streakIcon, { backgroundColor: colorSet.bg }]}>
                    <Ionicons
                      name={bonus.achieved ? "checkmark-circle" : "flame"}
                      size={20}
                      color={bonus.achieved ? Colors.gold : colorSet.icon}
                    />
                  </View>
                  <View style={styles.streakInfo}>
                    <Text style={styles.streakTitle}>{bonus.days}-Day Streak</Text>
                    <Text style={styles.streakDescription}>
                      {bonus.achieved ? 'Completed!' : `Complete ${bonus.days} days`}
                    </Text>
                  </View>
                  <Text style={[
                    styles.streakReward,
                    bonus.achieved && { color: Colors.gold },
                  ]}>
                    {bonus.achieved ? '✓ ' : ''}{currencySymbol}{bonus.reward}
                  </Text>
                </View>
              );
            })}
          </View>
          )}
        </View>

        {/* Tips — driven by backend config */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Pro Tips</Text>
          <View style={styles.tipsList}>
            {proTips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
        </>)}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Reward Animation Modal (Gap 28 - animated) */}
      <Modal
        visible={showReward}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReward(false)}
      >
        <View style={styles.rewardOverlay}>
          <Animated.View style={rewardAnimStyle}>
            <LinearGradient
              colors={[Colors.gold, colors.tealGreen]}
              style={styles.rewardCard}
            >
              <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 64, height: 64 }} contentFit="contain" />
              <Text style={styles.rewardAmount}>+{currencySymbol}{pendingCheckInReward?.coins || todayReward?.coins}</Text>
              <Text style={styles.rewardText}>Check-in completed successfully!</Text>
              <Text style={styles.rewardSubtext}>Keep the streak going! Your post is under review for share bonus approval.</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Share Poster Modal */}
      <Modal
        visible={!!selectedPoster}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPoster(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedPoster(null)} />
          <View style={styles.modalContent}>
            {selectedPoster && (
              <>
                {/* Poster Preview */}
                <LinearGradient
                  colors={selectedPoster.colors}
                  style={styles.modalPosterPreview}
                >
                  <CachedImage
                    source={selectedPoster.image}
                    style={styles.modalPosterImage}
                    blurRadius={2}
                  />
                  <View style={styles.modalPosterContent}>
                    <Text style={styles.modalPosterTitle}>{selectedPoster.title}</Text>
                    <Text style={styles.modalPosterSubtitle}>{selectedPoster.subtitle}</Text>
                  </View>
                </LinearGradient>

                {/* Share Options */}
                <View style={styles.shareOptions}>
                  <Text style={styles.shareOptionsTitle}>Share on Social Media</Text>
                  <View style={styles.shareButtonsGrid}>
                    <Pressable
                      style={[styles.shareButton, { backgroundColor: '#25D366' }]}
                      onPress={() => handleSharePoster(selectedPoster, 'whatsapp')}
                    >
                      <Text style={styles.shareButtonText}>WhatsApp</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.shareButton, { backgroundColor: '#1877F2' }]}
                      onPress={() => handleSharePoster(selectedPoster, 'facebook')}
                    >
                      <Text style={styles.shareButtonText}>Facebook</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.shareButton, { backgroundColor: '#1DA1F2' }]}
                      onPress={() => handleSharePoster(selectedPoster, 'twitter')}
                    >
                      <Text style={styles.shareButtonText}>Twitter</Text>
                    </Pressable>
                    <Pressable
                      style={styles.shareButtonInstagram}
                      onPress={() => handleSharePoster(selectedPoster, 'instagram')}
                    >
                      <Text style={styles.shareButtonText}>Instagram</Text>
                    </Pressable>
                  </View>
                  <View style={styles.shareBonusInfo}>
                    <Text style={styles.shareBonusText}>
                      +{currencySymbol}{selectedPoster.shareBonus} bonus when you submit your post link for approval!
                    </Text>
                  </View>
                  <Pressable
                    style={styles.closeButton}
                    onPress={() => setSelectedPoster(null)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Submit Post URL Modal */}
      <Modal
        visible={showSubmitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubmitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSubmitModal(false)} />
          <View style={styles.submitModalContent}>
            <View style={styles.submitModalHeader}>
              <View style={styles.submitModalIcon}>
                <Ionicons name="link" size={24} color={Colors.info} />
              </View>
              <View>
                <Text style={styles.submitModalTitle}>Submit Your Post</Text>
                <Text style={styles.submitModalSubtitle}>Paste the link to your shared post</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Post URL</Text>
            <TextInput
              style={styles.urlInput}
              value={submitUrl}
              onChangeText={setSubmitUrl}
              placeholder={`https://${selectedPlatform}.com/your-post-link`}
              placeholderTextColor={Colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.submitTip}>
              <Text style={styles.submitTipText}>
                <Text style={{ fontWeight: '700' }}>How to get your post link:</Text>{'\n'}
                • WhatsApp/Facebook/Twitter: Click share button and copy link{'\n'}
                • Instagram: Go to your post → ··· → Share → Copy Link
              </Text>
            </View>

            <View style={styles.submitInfo}>
              <Text style={styles.submitInfoText}>
                Your post will be reviewed {reviewTimeframe}. You'll earn {currencySymbol}{sharedPoster?.shareBonus || 0} once approved!
              </Text>
            </View>

            <View style={styles.submitButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setShowSubmitModal(false);
                  setSubmitUrl('');
                  setSharedPoster(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitPost}
                disabled={submitting}
              >
                <LinearGradient
                  colors={submitting ? [Colors.text.tertiary, Colors.text.tertiary] : [Colors.nileBlue, Colors.nileBlue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  {submitting ? (
                    <View style={styles.submitButtonLoading}>
                      <ActivityIndicator size="small" color={Colors.text.inverse} />
                      <Text style={styles.submitButtonText}>Submitting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitButtonText}>Submit for Review</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  infoBannerContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  infoBanner: {
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  infoBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoBannerTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  infoBannerText: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  sectionContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  calendarDay: {
    width: (width - 32 - 48) / 6,
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xs,
  },
  calendarDayClaimed: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: Colors.gold,
    borderWidth: 2,
  },
  calendarDayToday: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: Colors.info,
    borderWidth: 2,
  },
  calendarDayLabel: {
    fontSize: 9,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  calendarCoinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 2,
  },
  calendarCoinText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  bonusDay: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  bonusDayClaimed: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: Colors.gold,
    borderWidth: 2,
  },
  bonusCoinText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  bonusLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.warning,
  },
  checkInButtonContainer: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  checkInButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  checkInButtonChecked: {
    opacity: 0.8,
  },
  checkInButtonPending: {
    opacity: 0.9,
  },
  checkInButtonGradient: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkInButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  affiliateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  affiliateCard: {
    width: (width - 32 - 12) / 2,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  affiliateValue: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  affiliateLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  affiliateTip: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  affiliateTipText: {
    ...Typography.bodySmall,
    color: colors.brand.amberDeep,
    lineHeight: 18,
  },
  affiliateTipBold: {
    fontWeight: '700',
  },
  requiredBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginLeft: 'auto',
  },
  requiredBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
    color: colors.warningScale[700],
  },
  postersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  postersGridHighlight: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.warning,
  },
  posterCard: {
    width: (width - 32 - 12) / 2,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  posterGradient: {
    height: 128,
    position: 'relative',
  },
  posterImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  posterContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  posterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: 2,
  },
  posterSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  posterFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  posterBonus: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  posterBonusText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  submissionCard: {
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.md,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submissionInfo: {
    flex: 1,
  },
  submissionTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  submissionDate: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  submissionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  submissionLinkText: {
    ...Typography.bodySmall,
    color: Colors.info,
  },
  submissionStatus: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusTextPending: {
    ...Typography.caption,
    fontWeight: '600',
    color: colors.warningScale[700],
  },
  statusBadgeApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusTextApproved: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  statusBadgeRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  statusTextRejected: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.error,
  },
  submissionBonus: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  submissionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  submissionFooterText: {
    ...Typography.caption,
    color: Colors.nileBlue,
  },
  submissionFooterPending: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  submissionFooterPendingText: {
    ...Typography.caption,
    color: colors.warningScale[700],
  },
  streakList: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  streakCardAchieved: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: Colors.gold,
  },
  streakIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  streakInfo: {
    flex: 1,
  },
  streakTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  streakDescription: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  streakReward: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.warning,
  },
  tipsContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xl,
  },
  tipsTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  tipsList: {
    backgroundColor: Colors.background.secondary,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginTop: 6,
  },
  tipText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    flex: 1,
    lineHeight: 20,
  },
  rewardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  rewardCard: {
    padding: Spacing['2xl'],
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    maxWidth: 320,
  },
  rewardAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  rewardText: {
    ...Typography.h4,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.sm,
  },
  rewardSubtext: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    overflow: 'hidden',
  },
  modalPosterPreview: {
    height: 192,
    position: 'relative',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalPosterImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  modalPosterContent: {
    zIndex: 1,
  },
  modalPosterTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.sm,
  },
  modalPosterSubtitle: {
    ...Typography.bodyLarge,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  shareOptions: {
    padding: Spacing.xl,
  },
  shareOptionsTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  shareButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  shareButton: {
    width: (width - 48 - 12) / 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  shareButtonInstagram: {
    width: (width - 48 - 12) / 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    backgroundColor: '#833AB4',
  },
  shareButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  shareBonusInfo: {
    padding: Spacing.md,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: Spacing.base,
  },
  shareBonusText: {
    ...Typography.bodySmall,
    color: Colors.nileBlue,
    textAlign: 'center',
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 14,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  submitModalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
  },
  submitModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  submitModalIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitModalTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  submitModalSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  inputLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  urlInput: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  submitTip: {
    padding: Spacing.md,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginBottom: Spacing.base,
  },
  submitTipText: {
    ...Typography.bodySmall,
    color: '#1E40AF',
    lineHeight: 18,
  },
  submitInfo: {
    padding: Spacing.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    marginBottom: Spacing.lg,
  },
  submitInfoText: {
    ...Typography.bodySmall,
    color: colors.brand.amberDeep,
    textAlign: 'center',
  },
  submitButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  submitButton: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  submitButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  errorContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  emptyContainer: {
    padding: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  // Skeleton loader styles
  skeletonSection: {
    marginBottom: Spacing.lg,
  },
  skeletonTitleBar: {
    width: 160,
    height: 16,
    backgroundColor: Colors.border.default,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  skeletonCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  skeletonCalendarDay: {
    width: (width - 72) / 3,
    height: 70,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
  },
  skeletonBonusDay: {
    height: 50,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  skeletonBlock: {
    backgroundColor: Colors.background.secondary,
  },
  // Affiliate onboarding styles
  affiliateOnboarding: {
    alignItems: 'center',
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    borderStyle: 'dashed',
  },
  affiliateOnboardingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  affiliateOnboardingText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  // Streak Freeze styles (Gap 27)
  freezeStreakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: 10,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  freezeStreakText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.info,
  },
  freezeStreakActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: 10,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  freezeStreakActiveText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },

  // Extracted inline styles
  headerSpacer: { width: 40 },
  coinIcon20: { width: 20, height: 20 },
  skeletonContainer: { paddingHorizontal: Spacing.base },
  skeletonCheckInBtn: { height: 48, borderRadius: BorderRadius['2xl'], marginBottom: Spacing.lg },
  skeletonStatsRow: { flexDirection: 'row', gap: Spacing.sm },
  skeletonStatItem: { flex: 1, height: 80, borderRadius: BorderRadius.md },
  skeletonPostersRow: { flexDirection: 'row', gap: Spacing.md },
  skeletonPosterItem: { flex: 1, height: 140, borderRadius: BorderRadius.lg },
  countdownContainer: { marginTop: Spacing.sm, alignItems: 'center' },
  countdownText: { fontSize: 13, color: Colors.text.tertiary },
  streakResetBanner: { marginTop: 10, backgroundColor: colors.errorScale[50], borderRadius: BorderRadius.sm, padding: 10, flexDirection: 'row', alignItems: 'center' },
  streakResetText: { flex: 1, marginLeft: Spacing.sm, ...Typography.bodySmall, color: '#991B1B' },
  bottomSpacer: { height: 120 },
});

export default withErrorBoundary(DailyCheckInPage, 'ExploreDailyCheckin');
