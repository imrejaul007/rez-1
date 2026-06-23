// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Referral Program Page
// Invite friends and earn rewards

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  Share,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import * as Clipboard from 'expo-clipboard';
import { useIsAuthenticated, useGetCurrencySymbol } from '@/stores/selectors';
import {
  getReferralStats,
  getReferralHistory,
  getReferralCode,
  trackShare,
  type ReferralStats,
  type ReferralHistoryItem,
} from '@/services/referralApi';
import { anonymizeEmail } from '@/utils/privacy';
import ShareModal from '@/components/referral/ShareModal';
import TierUpCelebration from '@/components/referral/TierUpCelebration';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { REFERRAL_TIERS } from '@/types/referral.types';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import analyticsService from '@/services/analyticsService';
import { ProfileSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper to get next tier info based on current referrals
const getNextTierInfo = (currentReferrals: number) => {
  const tiers = Object.entries(REFERRAL_TIERS).sort(
    (a, b) => a[1].referralsRequired - b[1].referralsRequired
  );

  for (const [tierKey, tierData] of tiers) {
    if (currentReferrals < tierData.referralsRequired) {
      return {
        target: tierData.referralsRequired,
        nextTier: tierData.name,
        tierKey,
      };
    }
  }

  // User is at max tier
  const lastTier = tiers[tiers.length - 1];
  return {
    target: lastTier[1].referralsRequired,
    nextTier: lastTier[1].name,
    tierKey: lastTier[0],
  };
};

const ReferralPageContent = () => {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [tierUpVisible, setTierUpVisible] = useState(false);
  const [tierUpName, setTierUpName] = useState('');
  const [tierUpBonus, setTierUpBonus] = useState(0);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [codeInfo, setCodeInfo] = useState<{
    referralCode: string;
    referralLink: string;
    shareMessage: string;
  } | null>(null);

  // Refs for cleanup and timeout
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // AuthContext navigation guard handles unauthenticated redirect
  useEffect(() => {
    if (!isAuthenticated) return;

    // ✅ Analytics: Track referral page view
    analyticsService.track('referral_page_viewed');

    fetchReferralData();

    // ✅ FIX #4: Loading timeout - prevent infinite loading (max 15 seconds)
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && loading) {
        setLoading(false);
        setRefreshing(false);
        setLoadingError('Request timed out. Please check your connection and try again.');
      }
    }, 15000);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isAuthenticated]);

  // ✅ FIX #2: Individual try-catch for each API (fix race condition)
  const fetchReferralData = async () => {
    // Clear any previous errors
    setLoadingError(null);

    // Check auth again before API calls
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let hasError = false;

    // Fetch stats (independent)
    try {
      const statsData = await getReferralStats();
      if (isMountedRef.current) {
        setStats(statsData);

        // Tier-up detection: compare current tier with stored tier
        if (statsData?.totalReferrals != null) {
          const currentTierInfo = getNextTierInfo(statsData.totalReferrals);
          // Find current tier (one before next)
          const tiers = Object.entries(REFERRAL_TIERS).sort(
            (a, b) => a[1].referralsRequired - b[1].referralsRequired
          );
          let currentTierKey = '';
          for (const [key, data] of tiers) {
            if (statsData.totalReferrals >= data.referralsRequired) currentTierKey = key;
          }
          if (currentTierKey) {
            const storedTier = await AsyncStorage.getItem('referral_last_tier');
            if (storedTier && storedTier !== currentTierKey) {
              // Tier changed — check if it's an upgrade
              const storedIdx = tiers.findIndex(([k]) => k === storedTier);
              const currentIdx = tiers.findIndex(([k]) => k === currentTierKey);
              if (currentIdx > storedIdx) {
                const tierData = REFERRAL_TIERS[currentTierKey as keyof typeof REFERRAL_TIERS];
                setTierUpName(tierData?.name || currentTierKey);
                setTierUpBonus(tierData?.rewards?.tierBonus || 0);
                setTierUpVisible(true);
              }
            }
            await AsyncStorage.setItem('referral_last_tier', currentTierKey);
          }
        }
      }
    } catch (error) {
      hasError = true;
      // Don't fail entire page, just show empty stats
      if (isMountedRef.current) {
        setStats(null);
      }
    }

    // Fetch history (independent)
    try {
      const historyData = await getReferralHistory();
      if (isMountedRef.current) {
        setHistory(historyData || []);
      }
    } catch (error) {
      hasError = true;
      // Don't fail entire page, just show empty history
      if (isMountedRef.current) {
        setHistory([]);
      }
    }

    // Fetch code (independent)
    try {
      const codeData = await getReferralCode();
      if (isMountedRef.current) {
        setCodeInfo(codeData);
      }
    } catch (error) {
      hasError = true;
      // Show error for code since it's critical
      if (isMountedRef.current) {
        platformAlertSimple('Error', 'Failed to load referral code. Please try again.');
      }
    }

    // Only show error if ALL API calls failed
    if (hasError && isMountedRef.current) {
      // Don't show alert if at least one API succeeded
      const hasData = stats !== null || history.length > 0 || codeInfo !== null;
      if (!hasData) {
        platformAlertSimple('Error', 'Failed to load referral data. Please check your connection.');
      }
    }

    // Clear loading timeout if data loaded successfully
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    if (isMountedRef.current) {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (!isAuthenticated) {
      platformAlertSimple('Error', 'Please sign in to refresh data');
      return;
    }
    setRefreshing(true);
    fetchReferralData();
  }, [isAuthenticated]);

  const referralCode = codeInfo?.referralCode || 'LOADING...';
  const referralLink = codeInfo?.referralLink || `https://rezapp.com/invite/${referralCode}`;

  // ✅ FIX #3: Fix memory leak from setTimeout (add cleanup)
  const handleCopyCode = useCallback(async () => {
    try {
      if (!referralCode || referralCode === 'LOADING...') {
        platformAlertSimple('Error', 'Referral code not loaded yet');
        return;
      }

      await Clipboard.setStringAsync(referralCode);

      if (isMountedRef.current) {
        setCopied(true);
      }

      // Clear existing timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      // Set new timeout with cleanup
      copyTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setCopied(false);
        }
      }, 2000);

      // ✅ Analytics: Track copy action
      analyticsService.track('referral_code_copied', { referralCode });

      platformAlertSimple('Copied!', 'Referral code copied to clipboard');
    } catch (error) {
      platformAlertSimple('Error', 'Failed to copy referral code');
    }
  }, [referralCode]);

  // ✅ UPDATED: Open ShareModal instead of native share
  const handleShareReferral = useCallback(() => {
    if (!referralCode || referralCode === 'LOADING...') {
      platformAlertSimple('Error', 'Referral code not loaded yet');
      return;
    }

    // ✅ Analytics: Track share modal open
    analyticsService.track('referral_share_started');

    setShareModalVisible(true);
  }, [referralCode]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return { backgroundColor: Colors.gold };
      case 'active':
        return { backgroundColor: Colors.warning };
      case 'pending':
        return { backgroundColor: Colors.text.tertiary };
      case 'expired':
        return { backgroundColor: Colors.error };
      default:
        return { backgroundColor: Colors.gold };
    }
  };

  const renderReferralHistoryItem = useCallback(({ item }: { item: ReferralHistoryItem }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View>
          <ThemedText style={styles.historyName}>{item.referredUser?.name || 'User'}</ThemedText>
          <Text style={styles.historyPhone}>
            {item.referredUser?.email ? anonymizeEmail(item.referredUser.email) : 'No email'}
          </Text>
        </View>
        <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.historyReward}>
        <Ionicons name="cash-outline" size={16} color={Colors.gold} />
        <Text style={styles.rewardText}>
          {item.rewardStatus === 'credited'
            ? `Earned ${currencySymbol}${item.rewardAmount}`
            : `${item.rewardStatus === 'pending' ? 'Pending' : 'Cancelled'} ${currencySymbol}${item.rewardAmount}`}
        </Text>
      </View>
      <Text style={styles.historyDate}>
        {new Date(item.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })}
      </Text>
    </View>
  ), [currencySymbol, getStatusStyle]);

  // Performance optimization: Memoize calculated values
  const totalReferrals = useMemo(() => stats?.totalReferrals || 0, [stats?.totalReferrals]);
  const totalEarned = useMemo(() => stats?.totalEarned || 0, [stats?.totalEarned]);

  // ✅ FIX #4: Loading state with timeout and error handling
  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />
        <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Refer & Earn</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          {loadingError ? (
            <>
              <Ionicons name="alert-circle" size={48} color={Colors.error} />
              <Text style={styles.errorText}>{loadingError}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => {
                  setLoading(true);
                  setLoadingError(null);
                  fetchReferralData();
                }}
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </>
          ) : (
            <ProfileSkeleton />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />

      {/* Header */}
      <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityLabel="Go back"
            accessibilityHint="Returns to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Refer & Earn</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.gold]} />
        }
      >
        {/* Referral Code Card */}
        <View style={styles.codeCard}>
          <View style={styles.codeHeader}>
            <Ionicons name="gift" size={32} color={Colors.gold} />
            <ThemedText style={styles.codeTitle}>Your Referral Code</ThemedText>
          </View>

          <View style={styles.codeBox}>
            <ThemedText style={styles.code}>{referralCode}</ThemedText>
            <Pressable
              style={styles.copyButton}
              onPress={handleCopyCode}
              accessibilityLabel={copied ? "Code copied" : "Copy referral code"}
              accessibilityRole="button"
              accessibilityState={{ selected: copied }}
              accessibilityHint="Copies your referral code to clipboard"
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={20}
                color="white"
              />
            </Pressable>
          </View>

          <Pressable
            style={styles.shareButton}
            onPress={handleShareReferral}
            accessibilityLabel="Share referral code with friends"
            accessibilityRole="button"
            accessibilityHint="Opens share options to invite friends and earn rewards"
          >
            <Ionicons name="share-social" size={20} color="white" />
            <Text style={styles.shareButtonText}>Share with Friends</Text>
          </Pressable>
        </View>

        {/* How it Works */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>How it Works</ThemedText>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <ThemedText style={styles.stepTitle}>Share your code</ThemedText>
              <Text style={styles.stepDescription}>
                Send your referral code to friends via WhatsApp, SMS, or social media
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <ThemedText style={styles.stepTitle}>Friend signs up</ThemedText>
              <Text style={styles.stepDescription}>
                Your friend creates an account using your referral code
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <ThemedText style={styles.stepTitle}>Both get rewards</ThemedText>
              <Text style={styles.stepDescription}>
                You earn {currencySymbol}50 and your friend gets {currencySymbol}30 off their first order
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <ThemedText style={styles.statsTitle}>Your Referral Stats</ThemedText>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>
                {totalReferrals}
              </ThemedText>
              <Text style={styles.statLabel}>Total Referrals</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>
                {currencySymbol}{totalEarned}
              </ThemedText>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
          </View>

          {/* Additional Stats Row */}
          {(stats?.pendingEarnings || 0) > 0 && (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {stats?.pendingReferrals || 0}
                </ThemedText>
                <Text style={styles.statLabel}>Pending</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {currencySymbol}{stats?.pendingEarnings || 0}
                </ThemedText>
                <Text style={styles.statLabel}>Pending Earnings</Text>
              </View>
            </View>
          )}
        </View>

        {/* View Dashboard Button */}
        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.push('/referral/dashboard' as any)}
          accessibilityLabel="View full dashboard"
          accessibilityHint="Opens the full referral dashboard with tier progression and leaderboard"
        >
          <LinearGradient
            colors={[Colors.gold, Colors.nileBlue]}
            style={styles.dashboardButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="trophy" size={24} color="white" />
            <Text style={styles.dashboardButtonText}>View Full Dashboard</Text>
            <Ionicons name="chevron-forward" size={24} color="white" />
          </LinearGradient>
        </Pressable>

        {/* Referral History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Referral History</ThemedText>
            <FlashList
              data={history.slice(0, 5)}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
          estimatedItemSize={70}
              renderItem={renderReferralHistoryItem}
            />
          </View>
        )}

        {/* Terms */}
        <View style={styles.termsCard}>
          <ThemedText style={styles.termsTitle}>Terms & Conditions</ThemedText>
          <Text style={styles.termsText}>
            • Referral bonus is credited after friend's first successful order{'\n'}
            • Minimum order value {currencySymbol}500 required{'\n'}
            • Rewards expire after 90 days{'\n'}
            • Cannot be combined with other offers{'\n'}
            • REZ reserves the right to modify terms
          </Text>
        </View>
      </ScrollView>

      {/* ✅ ShareModal - Advanced sharing with QR code */}
      <ShareModal
        visible={shareModalVisible}
        referralCode={referralCode}
        referralLink={referralLink}
        onClose={() => setShareModalVisible(false)}
        currentTierProgress={
          stats
            ? (() => {
                const nextTierInfo = getNextTierInfo(stats.totalReferrals || 0);
                return {
                  current: stats.totalReferrals || 0,
                  target: nextTierInfo.target,
                  nextTier: nextTierInfo.nextTier,
                };
              })()
            : undefined
        }
      />

      {/* Tier-up celebration modal */}
      <TierUpCelebration
        visible={tierUpVisible}
        tierName={tierUpName}
        bonusCoins={tierUpBonus}
        onDismiss={() => setTierUpVisible(false)}
      />
    </View>
  );
};

// Wrap the page in an ErrorBoundary
const ReferralPage = () => {
  const router = useRouter();

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error to error tracking service (e.g., Sentry)
      }}
      onReset={() => {
        // Optionally navigate back or refresh
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
      }}
    >
      <ReferralPageContent />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
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
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  codeCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  codeHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  codeTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 192, 106, 0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderStyle: 'dashed',
  },
  code: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.gold,
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: Colors.gold,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  shareButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0, 192, 106, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  stepNumberText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.gold,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  stepDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  statsCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  statsTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border.default,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.gold,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  termsCard: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  termsTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  termsText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  errorText: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  historyCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  historyName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  historyPhone: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    ...Typography.overline,
    fontWeight: '600',
    color: Colors.text.inverse,
    textTransform: 'capitalize',
  },
  historyReward: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  rewardText: {
    ...Typography.body,
    color: Colors.gold,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  bonusText: {
    ...Typography.bodySmall,
    color: Colors.gold,
    fontWeight: '600',
  },
  historyDate: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  dashboardButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  dashboardButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  dashboardButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
  },
});

export default withErrorBoundary(ReferralPage, 'Referral');
