import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Privé Redeem Page
 * Coin redemption options with dynamic config from backend
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  runOnJS,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  interpolate} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { Colors } from '@/constants/DesignSystem';
import { usePriveSection } from '@/hooks/usePriveSection';
import { useRefreshWallet, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import priveApi, { RedeemConfig } from '@/services/priveApi';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Fallback config matching backend defaults
const FALLBACK_CONFIG: RedeemConfig = {
  conversionRates: { gift_card: 0.10, bill_pay: 0.10, experience: 0.12, charity: 0.15 },
  minCoinsPerCategory: { gift_card: 500, bill_pay: 100, experience: 1000, charity: 100 },
  maxCoinsPerRedemption: 50000,
  dailyRedemptionLimit: 5,
  enabledCategories: ['gift_card', 'bill_pay', 'experience', 'charity'],
  expiryDays: { gift_card: 365, bill_pay: 30, experience: 90, charity: 7 },
  currency: 'INR'};

const OPTION_META: Record<string, { title: string; description: string; icon: string; route: string }> = {
  gift_card: { title: 'Gift Cards', description: 'Amazon, Flipkart, Swiggy & more', icon: '🎁', route: '/prive/redeem/gift-cards' },
  bill_pay: { title: 'Bill Pay', description: 'Use coins at checkout', icon: '🧾', route: '/prive/redeem/bill-pay' },
  experience: { title: 'Experiences', description: 'Exclusive Privé experiences', icon: '✨', route: '/prive/redeem/experiences' },
  charity: { title: 'Charity', description: 'Donate to causes', icon: '💝', route: '/prive/redeem/charity' }};

// Skeleton shimmer placeholder
const SkeletonBlock = ({ width, height, style }: { width: number | string; height: number; style?: any }) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ), -1);
  }, [shimmer]);

  const opacity = interpolate(shimmer.value, [0, 1], [0.3, 0.6]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: 8, backgroundColor: PRIVE_COLORS.transparent.white08, opacity },
        style,
      ]}
    />
  );
};

function RedeemScreen() {
  const router = useRouter();
  const { userData, isLoading: priveLoading, error: priveError, refresh: priveRefresh } = usePriveSection();
  const refreshWallet = useRefreshWallet();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [config, setConfig] = useState<RedeemConfig>(FALLBACK_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animated balance counter
  const animatedValue = useSharedValue(0);
  const [displayBalance, setDisplayBalance] = useState(0);
  const prevBalanceRef = useRef(0);

  // Unlock animation values per category
  const unlockAnims = useRef<Record<string, { value: number }>>({}).current;

  const availableCoins = userData?.priveCoins || 0;
  const isLoading = priveLoading || configLoading;

  // Fetch redemption config from backend
  const fetchConfig = useCallback(async () => {
    try {
      setConfigLoading(true);
      const response = await priveApi.getRedeemConfig();
      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch {
      // Use fallback silently
    } finally {
      if (!isMounted()) return;
      setConfigLoading(false);
    }
  }, []);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchConfig();
  }, [fetchConfig, authLoading, isAuthenticated]);

  // Animated balance counter effect
  useEffect(() => {
    if (isLoading) return;

    const prevBalance = prevBalanceRef.current;

    // Check for unlock animation
    const prevUnlocked = new Set<string>();
    const newUnlocked = new Set<string>();
    for (const cat of config.enabledCategories) {
      const min = config.minCoinsPerCategory[cat] || 0;
      if (prevBalance >= min) prevUnlocked.add(cat);
      if (availableCoins >= min) newUnlocked.add(cat);
    }

    // Animate newly unlocked cards
    for (const cat of newUnlocked) {
      if (!prevUnlocked.has(cat) && prevBalance > 0) {
        if (!unlockAnims[cat]) {
          unlockAnims[cat] = { value: 0 };
        }
        unlockAnims[cat].value = 0;
        unlockAnims[cat].value = 1; // Snap to unlocked state
      }
    }

    prevBalanceRef.current = availableCoins;

    // Animate the balance number
    animatedValue.value = prevBalance;
    animatedValue.value = withTiming(availableCoins, { duration: 800 });
  }, [availableCoins, isLoading]);

  // React to animated balance value changes
  useAnimatedReaction(
    () => animatedValue.value,
    (val) => {
      runOnJS(setDisplayBalance)(Math.round(val));
    },
    [availableCoins]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await Promise.all([
        priveRefresh(),
        refreshWallet(),
        fetchConfig(),
      ]);
    } catch {
      if (!isMounted()) return;
      setError('Failed to refresh data');
    } finally {
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [priveRefresh, refreshWallet, fetchConfig]);

  const combinedError = error || priveError;

  // Build options from server config
  const redeemOptions = config.enabledCategories
    .filter((cat) => OPTION_META[cat])
    .map((cat) => ({
      id: cat,
      ...OPTION_META[cat],
      minCoins: config.minCoinsPerCategory[cat] || 100}));

  if (combinedError && !isLoading && availableCoins === 0) {
    // Full error state
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={PRIVE_COLORS.text.primary} />
            </Pressable>
            <Text style={styles.headerTitle}>Redeem Coins</Text>
            <View style={styles.headerSpacer} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={PRIVE_COLORS.text.tertiary} />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{combinedError}</Text>
            <Pressable style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PRIVE_COLORS.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Redeem Coins</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={PRIVE_COLORS.gold.primary}
            />
          }
        >
          {/* Balance Card */}
          {isLoading ? (
            <View style={styles.balanceCard}>
              <SkeletonBlock width={140} height={14} style={{ marginBottom: 12 }} />
              <SkeletonBlock width={120} height={48} style={{ marginBottom: 8 }} />
              <SkeletonBlock width={40} height={14} />
            </View>
          ) : (
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available to Redeem</Text>
              <Text style={styles.balanceAmount}>{displayBalance.toLocaleString()}</Text>
              <Text style={styles.balanceSubtext}>coins</Text>

              {/* Coin-type breakdown */}
              <View style={styles.coinSplit}>
                <View style={[styles.coinChip, { opacity: 0.5 }]}>
                  <Ionicons name="lock-closed" size={10} color={PRIVE_COLORS.text.disabled} />
                  <View style={[styles.coinDot, { backgroundColor: colors.brand.emerald }]} />
                  <Text style={styles.coinChipText}>{BRAND.APP_NAME}: {(userData?.rezCoins || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.coinChip}>
                  <View style={[styles.coinDot, { backgroundColor: PRIVE_COLORS.gold.primary }]} />
                  <Text style={styles.coinChipText}>Privé: {(userData?.priveCoins || 0).toLocaleString()}</Text>
                </View>
                {(userData?.brandedCoins || 0) > 0 && (
                  <View style={[styles.coinChip, { opacity: 0.5 }]}>
                    <Ionicons name="lock-closed" size={10} color={PRIVE_COLORS.text.disabled} />
                    <View style={[styles.coinDot, { backgroundColor: '#9C27B0' }]} />
                    <Text style={styles.coinChipText}>Branded: {(userData?.brandedCoins || 0).toLocaleString()}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.brandedNote}>Only Privé coins are redeemable here</Text>
            </View>
          )}

          {/* Zero Balance Guidance */}
          {!isLoading && availableCoins === 0 && (
            <View style={styles.zeroBalanceCard}>
              <Text style={styles.zeroBalanceIcon}>🚀</Text>
              <Text style={styles.zeroBalanceTitle}>Start Earning Coins</Text>
              <Text style={styles.zeroBalanceText}>
                Earn coins through purchases, daily check-ins, referrals, and games.
              </Text>
              <Pressable
                style={styles.earnButton}
                onPress={() => router.push('/prive' as any)}
              >
                <Text style={styles.earnButtonText}>Explore Ways to Earn</Text>
              </Pressable>
            </View>
          )}

          {/* Redeem Options */}
          <Text style={styles.sectionTitle}>Redeem Options</Text>

          {isLoading ? (
            // Skeleton option cards
            [1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.optionCard}>
                <SkeletonBlock width={48} height={48} style={{ borderRadius: 24, marginRight: 16 }} />
                <View style={{ flex: 1 }}>
                  <SkeletonBlock width={100} height={16} style={{ marginBottom: 6 }} />
                  <SkeletonBlock width={160} height={12} />
                </View>
              </View>
            ))
          ) : (
            redeemOptions.map((option) => {
              const hasEnoughCoins = availableCoins >= option.minCoins;
              const unlockAnim = unlockAnims[option.id];
              const scale = unlockAnim
                ? interpolate(unlockAnim.value, [0, 0.5, 1], [1, 1.05, 1])
                : 1;

              return (
                <Animated.View key={option.id} style={{ transform: [{ scale: scale as any }] }}>
                  <Pressable
                    style={[styles.optionCard, !hasEnoughCoins && styles.optionCardDisabled]}
                   
                    onPress={() => {
                      if (hasEnoughCoins) {
                        router.push(option.route as any);
                      }
                    }}
                  >
                    <View style={styles.optionIcon}>
                      <Text style={styles.optionEmoji}>{option.icon}</Text>
                    </View>
                    <View style={styles.optionInfo}>
                      <Text style={[styles.optionTitle, !hasEnoughCoins && styles.optionTitleDisabled]}>
                        {option.title}
                      </Text>
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    </View>
                    <View style={styles.optionRight}>
                      <Text style={[styles.optionMinCoins, !hasEnoughCoins && styles.optionMinCoinsInsufficient]}>
                        {hasEnoughCoins ? `Min ${option.minCoins}` : `Need ${option.minCoins - availableCoins} more`}
                      </Text>
                      <Ionicons
                        name={hasEnoughCoins ? 'chevron-forward' : 'lock-closed'}
                        size={20}
                        color={hasEnoughCoins ? PRIVE_COLORS.text.tertiary : PRIVE_COLORS.text.disabled}
                      />
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              Only Privé coins are eligible for redemption in this module.
              ${BRAND.APP_NAME} and Branded coins can be used for other purposes.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1},
  safeArea: {
    flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.lg},
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center'},
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary},
  headerSpacer: {
    width: 40},
  content: {
    flex: 1,
    paddingHorizontal: PRIVE_SPACING.xl},
  // Balance Card
  balanceCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    marginBottom: PRIVE_SPACING.xl},
  balanceLabel: {
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: PRIVE_SPACING.sm},
  balanceAmount: {
    fontSize: 48,
    fontWeight: '200',
    color: PRIVE_COLORS.gold.primary},
  balanceSubtext: {
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary},
  // Coin split
  coinSplit: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: PRIVE_SPACING.sm,
    marginTop: PRIVE_SPACING.lg},
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIVE_COLORS.transparent.white08,
    borderRadius: PRIVE_RADIUS.md,
    paddingHorizontal: PRIVE_SPACING.md,
    paddingVertical: 4,
    gap: 6},
  coinDot: {
    width: 8,
    height: 8,
    borderRadius: 4},
  coinChipText: {
    fontSize: 11,
    color: PRIVE_COLORS.text.secondary,
    fontWeight: '500'},
  brandedNote: {
    fontSize: 10,
    color: PRIVE_COLORS.text.disabled,
    marginTop: 6,
    fontStyle: 'italic'},
  // Zero balance guidance
  zeroBalanceCard: {
    backgroundColor: PRIVE_COLORS.transparent.gold10,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xl,
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.xl},
  zeroBalanceIcon: {
    fontSize: 36,
    marginBottom: PRIVE_SPACING.md},
  zeroBalanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.sm},
  zeroBalanceText: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: PRIVE_SPACING.lg},
  earnButton: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.md,
    borderRadius: PRIVE_RADIUS.lg},
  earnButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.background.primary},
  // Section
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.lg},
  // Option cards
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.md},
  optionCardDisabled: {
    opacity: 0.6,
    borderColor: PRIVE_COLORS.border.secondary},
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: PRIVE_SPACING.lg},
  optionEmoji: {
    fontSize: 24},
  optionInfo: {
    flex: 1},
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary},
  optionTitleDisabled: {
    color: PRIVE_COLORS.text.tertiary},
  optionDescription: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 2},
  optionRight: {
    alignItems: 'flex-end'},
  optionMinCoins: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: 4},
  optionMinCoinsInsufficient: {
    color: PRIVE_COLORS.status.warning},
  // Info card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: PRIVE_COLORS.transparent.gold10,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    marginTop: PRIVE_SPACING.lg,
    gap: PRIVE_SPACING.md},
  infoIcon: {
    fontSize: 20},
  infoText: {
    flex: 1,
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 18},
  // Error state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PRIVE_SPACING.xxl},
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginTop: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.sm},
  errorText: {
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: PRIVE_SPACING.xl},
  retryButton: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    paddingHorizontal: PRIVE_SPACING.xxl,
    paddingVertical: PRIVE_SPACING.md,
    borderRadius: PRIVE_RADIUS.lg},
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.background.primary}});

export default withErrorBoundary(RedeemScreen, 'PriveRedeemIndex');
