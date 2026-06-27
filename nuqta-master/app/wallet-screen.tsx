import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import RechargeWalletCard from "../components/RechargeWalletCard";
import ReferAndEarnCard from "@/components/ReferAndEarnCard";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { CoinBalance, WalletScreenProps, COIN_TYPES, CoinType } from '@/types/wallet';
import { useGetCurrency, useGetCurrencySymbol, useAuthUser, useIsAuthenticated, useAuthLoading, useWalletData, useWalletLoading, useWalletRefreshing, useRefreshWallet } from '@/stores/selectors';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { useProfile } from '@/contexts/ProfileContext';
import { useReferral } from '@/hooks/useReferral';
import { useWalletAnalytics } from '@/hooks/useWalletAnalytics';
import FeatureErrorBoundary from '@/components/common/FeatureErrorBoundary';
import { TransactionListSkeleton } from '@/components/skeletons';
import EarningsBreakdown from '@/components/wallet/EarningsBreakdown';
import { BalanceDisplay } from '@/components/wallet/BalanceDisplay';
import { StickyQuickActions } from '@/components/wallet/StickyQuickActions';
import { CoinDetailCard } from '@/components/wallet/CoinDetailCard';
import { InsightSection } from '@/components/wallet/InsightSection';
import { TransactionCTA } from '@/components/wallet/TransactionCTA';
import { MoreForYouSection } from '@/components/wallet/MoreForYouSection';
import CoinEducationOverlay from '@/components/wallet/CoinEducationOverlay';
import SavingsHero from '@/components/wallet/SavingsHero';
import CoinProportionBar from '@/components/wallet/CoinProportionBar';
import { platformAlert } from '@/utils/platformAlert';
import { ThemedText } from '@/components/ThemedText';
import { BRAND } from '@/constants/brand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, Typography, Gradients } from '@/constants/DesignSystem';
import walletApi from '@/services/walletApi';
import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useUserIdentityStore } from '@/stores/userIdentityStore';

const MODE_THEMES: Record<string, { accent: string; label: string; icon: string }> = {
  'near-u': { accent: '#7C3AED', label: 'Near U', icon: 'location-outline' },
  'mall': { accent: '#3B82F6', label: 'REZ Mall', icon: 'storefront-outline' },
  'prive': { accent: '#D4AF37', label: 'Privé', icon: 'diamond-outline' },
  'cashstore': { accent: '#10B981', label: 'Cash Store', icon: 'cash-outline' },
  'default': { accent: '#7C3AED', label: '', icon: '' },
};

const WalletScreen: React.FC<WalletScreenProps> = ({
  onNavigateBack,
  onCoinPress,
}) => {
  const isMounted = useIsMounted();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const currentUserId = user?.id || '';
  const router = useRouter();
  const { goBack } = useSafeNavigation();
  const getCurrency = useGetCurrency();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [coinEducationVisible, setCoinEducationVisible] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  const walletData = useWalletData();
  const walletLoading = useWalletLoading();
  const walletRefreshing = useWalletRefreshing();
  const refreshWallet = useRefreshWallet();

  const { segment, statedIdentity } = useUserIdentityStore();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const activeMode = modeParam && MODE_THEMES[modeParam] ? modeParam : 'default';
  const modeTheme = MODE_THEMES[activeMode];

  const renderModeBadge = useCallback(() => {
    if (activeMode === 'default' || !modeTheme.label) return null;
    return (
      <View style={{
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: modeTheme.accent + '14',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        marginTop: 8,
        gap: 6,
      }}>
        <Ionicons name={modeTheme.icon as any} size={14} color={modeTheme.accent} />
        <Text style={{ fontSize: 12, fontWeight: '600', color: modeTheme.accent }}>
          {modeTheme.label}
        </Text>
      </View>
    );
  }, [activeMode, modeTheme]);

  const { completionStatus, isLoading: profileLoading, error: profileError } = useProfile();

  const { referralData, isLoading: referralLoading, error: referralError } = useReferral({
    autoFetch: true,
    refreshInterval: 15 * 60 * 1000,
  });

  const {
    trackWalletViewed,
    trackTopupInitiated,
    trackTransactionViewed,
  } = useWalletAnalytics();

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // Sync balance hidden state from AsyncStorage (same key as BalanceDisplay)
  useEffect(() => {
    AsyncStorage.getItem('@wallet_balance_hidden').then(val => {
      if (val === 'true') setIsBalanceHidden(true);
    }).catch(() => {});
  }, []);

  // Compute coin balances for CoinProportionBar
  const rezBalance = useMemo(() => {
    const rezCoin = walletData?.coins?.find(c => c.type === 'rez' || c.type === 'nuqta');
    return rezCoin?.amount ?? 0;
  }, [walletData?.coins]);

  const promoBalance = useMemo(() => {
    const promoCoin = walletData?.coins?.find(c => c.type === 'promo');
    return promoCoin?.amount ?? 0;
  }, [walletData?.coins]);

  const totalBrandedCoins = walletData?.brandedCoinsTotal ?? 0;
  const totalBalance = walletData?.totalBalance ?? 0;

  useEffect(() => {
    let cancelled = false;
    trackWalletViewed();
    // Auto-show coin education on first wallet visit
    AsyncStorage.getItem('wallet_education_seen').then(seen => {
      if (cancelled) return;
      if (!seen) {
        setCoinEducationVisible(true);
        AsyncStorage.setItem('wallet_education_seen', '1').catch(() => {});
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [trackWalletViewed]);

  // Refresh wallet data when screen regains focus (e.g., after a transaction)
  useFocusEffect(
    useCallback(() => {
      refreshWallet();
    }, [refreshWallet])
  );

  // Expiring coins warning
  const [expiringAmount, setExpiringAmount] = useState(0);
  const [expiringLabel, setExpiringLabel] = useState('');
  const [expiringByType, setExpiringByType] = useState<Array<{ type: string; amount: number; expiresAt: string; daysLeft: number }>>([]);

  useEffect(() => {
    if (!currentUserId || authLoading || !isAuthenticated) return;
    let cancelled = false;
    walletApi.getExpiringCoins().then(res => {
      if (cancelled || !res.success || !res.data) return;
      const { expiringCoins, totalExpiring } = res.data;
      if (totalExpiring <= 0) return;
      setExpiringAmount(totalExpiring);
      // Show most urgent bucket
      if (expiringCoins?.this_week?.totalAmount > 0) {
        setExpiringLabel(`${expiringCoins.this_week.totalAmount} ${BRAND.CURRENCY_CODE} expiring this week`);
      } else if (expiringCoins?.this_month?.totalAmount > 0) {
        setExpiringLabel(`${expiringCoins.this_month.totalAmount} ${BRAND.CURRENCY_CODE} expiring this month`);
      } else {
        setExpiringLabel(`${totalExpiring} ${BRAND.CURRENCY_CODE} expiring soon`);
      }

      // Build per-type breakdown from all buckets
      const typeMap = new Map<string, { amount: number; expiresAt: string; daysLeft: number }>();
      for (const period of ['this_week', 'this_month', 'next_month'] as const) {
        const bucket = expiringCoins?.[period];
        if (!bucket?.coins) continue;
        for (const coin of bucket.coins) {
          const coinType = coin.type || coin.source || 'rez';
          const existing = typeMap.get(coinType);
          if (existing) {
            existing.amount += coin.amount;
            if (coin.daysLeft < existing.daysLeft) {
              existing.daysLeft = coin.daysLeft;
              existing.expiresAt = coin.expiresAt;
            }
          } else {
            typeMap.set(coinType, { amount: coin.amount, expiresAt: coin.expiresAt, daysLeft: coin.daysLeft });
          }
        }
      }
      setExpiringByType(Array.from(typeMap.entries()).map(([type, data]) => ({ type, ...data })));
    }).catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [currentUserId, authLoading, isAuthenticated]);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshWallet();
    } catch (error) {
      platformAlert('Refresh Failed', error instanceof Error ? error.message : 'Unable to refresh wallet data');
    }
  }, [refreshWallet]);

  const handleBackPress = useCallback(() => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      goBack('/' as any);
    }
  }, [onNavigateBack, goBack]);

  const handleCoinPress = useCallback((coin: CoinBalance) => {
    if (onCoinPress) {
      onCoinPress(coin);
    } else {
      router.push({
        pathname: '/wallet/coin-detail/[coinType]',
        params: { coinType: coin.type }
      } as any);
    }
  }, [onCoinPress, router]);

  const handleCoinTypePress = useCallback((type: CoinType) => {
    router.push({
      pathname: '/wallet/coin-detail/[coinType]',
      params: { coinType: type }
    } as any);
  }, [router]);

  const handleRetry = useCallback(() => {
    refreshWallet();
  }, [refreshWallet]);

  // Topup state management
  const [topupLoading, setTopupLoading] = useState(false);

  const handleAmountSelect = useCallback((amount: number | "other") => {
    // No-op: amount selection handled by RechargeWalletCard internally
  }, []);

  const handleTopupSubmit = useCallback((amount: number) => {
    trackTopupInitiated(amount);
    router.push({
      pathname: '/payment',
      params: {
        amount: amount.toString(),
        currency: BRAND.CURRENCY_CODE,
        fiatCurrency: getCurrency(),
        timestamp: Date.now().toString()
      }
    });
  }, [trackTopupInitiated, router, getCurrency]);

  // Segment-specific shortcut for verified users — shown at top of More For You
  const segmentShortcut = useMemo(() => {
    const map: Record<string, { id: string; icon: string; title: string; subtitle: string; route: string }> = {
      verified_student:    { id: 'student-deals',    icon: 'school-outline',     title: 'Student Deals',     subtitle: 'Exclusive campus offers',       route: '/offers/student' },
      verified_employee:   { id: 'corporate-deals',  icon: 'briefcase-outline',  title: 'Work Perks',        subtitle: 'Corporate benefits & deals',    route: '/offers/corporate' },
      verified_healthcare: { id: 'health-deals',     icon: 'medkit-outline',     title: 'Healthcare Offers', subtitle: 'Pharmacy & wellness deals',     route: '/offers/zones/healthcare' },
      verified_defence:    { id: 'defence-deals',    icon: 'shield-outline',     title: 'Defence Perks',     subtitle: 'Service member deals',          route: '/offers/zones/defence' },
      verified_teacher:    { id: 'teacher-deals',    icon: 'book-outline',       title: 'Teacher Benefits',  subtitle: 'Education & stationery offers', route: '/offers/zones/teacher' },
    };
    const entry = map[segment];
    if (!entry) return null;
    return {
      id: entry.id,
      icon: entry.icon as any,
      title: entry.title,
      subtitle: entry.subtitle,
      onPress: () => router.push(entry.route as any),
      badge: 'VERIFIED',
    };
  }, [segment, router]);

  // "More for You" options — Ring Sizer + Saved Address moved here from main scroll
  const moreForYouOptions = useMemo(() => [
    ...(segmentShortcut ? [segmentShortcut] : []),
    {
      id: 'profile',
      icon: 'person-outline' as const,
      title: 'Complete Profile',
      subtitle: `${completionStatus?.completionPercentage || 0}% complete`,
      onPress: () => router.push('/profile/edit'),
    },
    {
      id: 'scratch-card',
      icon: 'ticket-outline' as const,
      title: 'Scratch Card',
      subtitle: 'Win coins & discounts',
      onPress: () => router.push('/scratch-card'),
      badge: 'NEW',
    },
    {
      id: 'refer',
      icon: 'people-outline' as const,
      title: 'Refer & Earn',
      subtitle: 'Invite friends, earn coins',
      onPress: () => router.push('/referral'),
    },
    {
      id: 'orders',
      icon: 'receipt-outline' as const,
      title: 'Order History',
      subtitle: 'View order details',
      onPress: () => router.push('/order-history'),
    },
    {
      id: 'wishlist',
      icon: 'heart-outline' as const,
      title: 'Wishlist',
      subtitle: 'All your Favorites',
      onPress: () => router.push('/wishlist'),
    },
    {
      id: 'address',
      icon: 'location-outline' as const,
      title: 'Saved Address',
      subtitle: 'Edit, add, delete your address',
      onPress: () => router.push('/account/addresses'),
    },
    {
      id: 'ring-sizer',
      icon: 'resize-outline' as const,
      title: 'Ring Sizer',
      subtitle: 'Check your ring size',
      onPress: () => router.push('/ring-sizer'),
    },
  ], [completionStatus, router, segmentShortcut]);

  const styles = useMemo(() => createStyles(screenData), [screenData]);

  // --- Loading State ---
  if (walletLoading && !walletData) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
        <LinearGradient colors={Gradients.nileBlue} style={styles.headerBg}>
          <View style={styles.headerContainer}>
            <Pressable style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
            </Pressable>
            <Text style={styles.headerTitle}>Wallet</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <TransactionListSkeleton />
      </View>
    );
  }

  // --- Empty/Loading State (no data yet) ---
  if (!walletData && !walletLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
        <LinearGradient colors={Gradients.nileBlue} style={styles.headerBg}>
          <View style={styles.headerContainer}>
            <Pressable style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
            </Pressable>
            <Text style={styles.headerTitle}>Wallet</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Unable to load wallet</Text>
          <Text style={styles.errorDetails}>Please check your connection and try again.</Text>
          <Pressable
            style={styles.retryButton}
            onPress={handleRetry}
            accessibilityLabel="Try again"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!walletData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background.secondary }}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
        <ThemedText style={{ marginTop: Spacing.md, color: Colors.text.secondary }}>Loading wallet...</ThemedText>
      </View>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Wallet">
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

        {/* Fixed Header */}
        <LinearGradient colors={Gradients.nileBlue} style={styles.headerBg}>
          <View style={styles.headerContainer}>
            <Pressable
              style={styles.backButton}
              onPress={handleBackPress}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
            </Pressable>
            <Text style={styles.headerTitle}>Wallet</Text>
            <Pressable
              style={styles.settingsButton}
              onPress={() => router.push('/settings' as any)}
              accessibilityLabel="Wallet settings"
              accessibilityRole="button"
            >
              <Ionicons name="settings-outline" size={20} color={Colors.text.inverse} />
            </Pressable>
          </View>

          {/* Savings Hero - inside gradient header for white-on-dark text */}
          <SavingsHero
            totalSaved={walletData?.savingsInsights?.totalSaved ?? 0}
            thisMonth={walletData?.savingsInsights?.thisMonth ?? 0}
            currencySymbol={currencySymbol}
            isHidden={isBalanceHidden}
            segment={segment}
          />
        </LinearGradient>

        {/* Scrollable Content */}
        <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={walletRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.nileBlue}
              colors={[Colors.nileBlue]}
              progressBackgroundColor={Colors.background.primary}
            />
          }
        >
          {/* Frozen Wallet Banner */}
          {walletData.isFrozen && (
            <View style={styles.frozenBanner}>
              <Ionicons name="lock-closed" size={18} color={Colors.errorScale[700]} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.frozenTitle}>Wallet Locked</Text>
                <Text style={styles.frozenReason}>
                  {walletData.frozenReason || 'Your wallet is temporarily locked. Contact support for help.'}
                </Text>
              </View>
            </View>
          )}

          {/* Balance Display with hide/reveal + coin chips */}
          <BalanceDisplay
            walletData={walletData}
            onCoinPress={handleCoinTypePress}
            currencySymbol={currencySymbol}
          />

          {/* Mode Badge */}
          {renderModeBadge()}

          {/* Coin Proportion Bar */}
          <CoinProportionBar
            rezBalance={rezBalance}
            promoBalance={promoBalance}
            brandedBalance={totalBrandedCoins}
            totalBalance={totalBalance}
            currencySymbol={currencySymbol}
          />

          {/* Coin Expiry Warning */}
          {expiringAmount > 0 && (
            <Pressable
              style={styles.expiryBanner}
              onPress={() => router.push('/wallet/expiry-tracker' as any)}
            >
              <View style={styles.expiryIconWrap}>
                <Ionicons name="timer-outline" size={18} color={colors.warningScale[700]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.expiryText}>{expiringLabel}</Text>
                {expiringByType.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    {expiringByType.slice(0, 3).map((item, idx) => {
                      const label = item.type === 'promo' ? 'Promo' : item.type === 'branded' ? 'Branded' : item.type === 'prive' ? 'Prive' : 'ReZ';
                      return (
                        <Text key={idx} style={styles.expiryTypeRow}>
                          {label}: {item.amount} {BRAND.CURRENCY_CODE} ({item.daysLeft <= 1 ? 'expires today' : `${item.daysLeft}d left`})
                        </Text>
                      );
                    })}
                  </View>
                )}
                <Text style={styles.expirySubtext}>Use them before they expire</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.warningScale[700]} />
            </Pressable>
          )}

          {/* Quick Actions Bar */}
          {!walletData.isFrozen && <StickyQuickActions />}
          {/* Coin Detail Cards */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>Your Savings Breakdown</Text>
            <Pressable onPress={() => setCoinEducationVisible(true)} hitSlop={8}>
              <Ionicons name="help-circle-outline" size={20} color={colors.neutral[400]} />
            </Pressable>
          </View>
          {walletData.coins.map((coin) => (
            <CoinDetailCard key={coin.id} coin={coin} onPress={handleCoinPress} />
          ))}

          {/* Branded Coins Summary */}
          {walletData.brandedCoins && walletData.brandedCoins.length > 0 && (
            <CoinDetailCard
              coin={{
                id: 'branded-summary',
                type: 'branded',
                name: 'Branded Coins',
                amount: walletData.brandedCoinsTotal,
                currency: BRAND.CURRENCY_CODE,
                formattedAmount: `${BRAND.CURRENCY_CODE} ${walletData.brandedCoinsTotal}`,
                description: `From ${walletData.brandedCoins.length} ${walletData.brandedCoins.length === 1 ? 'store' : 'stores'}`,
                iconPath: BRAND.COIN_IMAGE,
                backgroundColor: COIN_TYPES.branded.backgroundColor,
                color: COIN_TYPES.branded.color,
                isActive: true,
              }}
              onPress={() => router.push('/BrandedCoinsScreen')}
            />
          )}

          {/* Wallet Insights */}
          <InsightSection walletData={walletData} currencySymbol={currencySymbol} segment={segment} />

          {/* Recharge with Discount */}
          <RechargeWalletCard
            cashbackText="Save upto 10% on wallet recharge"
            amountOptions={[120, 500, 1000, 5000, 10000]}
            onAmountSelect={handleAmountSelect}
            onSubmit={handleTopupSubmit}
            isLoading={topupLoading}
            currency={BRAND.CURRENCY_CODE}
          />

          {/* View Transactions CTA */}
          <TransactionCTA onPress={() => {
            trackTransactionViewed();
            router.push('/earnings-history');
          }} />

          {/* Partner Earnings Breakdown */}
          <EarningsBreakdown
            compact={true}
            onViewDetails={() => router.push('/explore')}
          />

          {/* Verification CTA for unverified users who stated an identity */}
          {segment === 'normal' && statedIdentity && statedIdentity !== 'general' && (
            <Pressable
              onPress={() => router.push('/onboarding/identity-select' as any)}
              style={{
                marginHorizontal: 16,
                marginVertical: 12,
                padding: 16,
                backgroundColor: '#FFF7ED',
                borderRadius: 14,
                borderLeftWidth: 3,
                borderLeftColor: '#F97316',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFEDD5', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="lock-open-outline" size={20} color="#F97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 }}>
                  Unlock exclusive deals
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  Verify your identity to access student, corporate & healthcare offers
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#F97316" />
            </Pressable>
          )}

          {/* More For You — collapsible section with profile, scratch card, refer, orders, wishlist, address, ring sizer */}
          <MoreForYouSection options={moreForYouOptions} />

          {/* Refer and Earn Card */}
          <ReferAndEarnCard
            data={{
              title: referralData?.title || "Refer and Earn",
              subtitle: referralData?.subtitle || "Invite your friends and get free jewellery",
              inviteButtonText: referralData?.inviteButtonText || "Invite",
              inviteLink: referralData?.inviteLink || "",
            }}
            onInvite={() => {
              const link = referralData?.inviteLink || '';
              if (link) {
                Share.share({ message: `Join me on ${BRAND.APP_NAME} and earn rewards! ${link}`, url: link }).catch(() => {});
              } else {
                router.push('/referral' as any);
              }
            }}
            isLoading={referralLoading}
          />

          <View style={{ height: 120 }} />
        </ScrollView>

      </View>

      {/* Coin Education Overlay */}
      <CoinEducationOverlay
        visible={coinEducationVisible}
        onDismiss={() => setCoinEducationVisible(false)}
      />
    </FeatureErrorBoundary>
  );
};

const createStyles = (screenData: { width: number; height: number }) => {
  const isSmallScreen = screenData.width < 375;
  const isTablet = screenData.width > 768;
  const horizontalPadding = isSmallScreen ? 10 : isTablet ? 24 : 14;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background.primary },
    headerBg: {
      paddingTop: Platform.OS === 'ios' ? 50 : 40,
      paddingBottom: Spacing.base,
      paddingHorizontal: horizontalPadding,
      borderBottomLeftRadius: BorderRadius.xl,
      borderBottomRightRadius: BorderRadius.xl,
      overflow: 'hidden',
      shadowColor: Colors.nileBlue,
      shadowOpacity: 0.15,
      elevation: 8,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsButton: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: Colors.text.inverse,
      fontSize: isTablet ? Typography.h2.fontSize : isSmallScreen ? Typography.h4.fontSize : Typography.h3.fontSize,
      fontWeight: '800',
      textAlign: 'center',
    },
    headerRight: { width: 36 },
    scroll: { flex: 1, paddingHorizontal: horizontalPadding },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: Typography.body.fontSize, color: Colors.text.secondary },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing['2xl'] },
    errorTitle: { fontSize: Typography.bodyLarge.fontSize, fontWeight: '700', color: Colors.text.primary, marginTop: Spacing.md },
    errorDetails: { fontSize: Typography.bodySmall.fontSize, color: Colors.text.secondary, marginTop: Spacing.xs + 2, textAlign: 'center' },
    retryButton: {
      backgroundColor: Colors.nileBlue,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm + 2,
      borderRadius: BorderRadius.md,
      marginTop: Spacing.sm + 2,
    },
    retryButtonText: { color: Colors.text.inverse, fontSize: Typography.bodySmall.fontSize, fontWeight: '600' },
    frozenBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.errorScale[100],
      marginHorizontal: Spacing.base,
      marginTop: Spacing.sm,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.errorScale[200],
    },
    frozenTitle: {
      fontSize: Typography.bodySmall.fontSize,
      fontWeight: '700',
      color: Colors.errorScale[700],
    },
    frozenReason: {
      fontSize: Typography.caption.fontSize,
      color: '#991B1B',
      marginTop: 1,
    },
    expiryBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.tint.amber,
      borderRadius: BorderRadius.md + 2,
      padding: Spacing.md + 2,
      marginTop: Spacing.sm + 2,
      marginHorizontal: Spacing.base,
      borderWidth: 1,
      borderColor: colors.warningScale[200],
      gap: Spacing.sm + 2,
    },
    expiryIconWrap: {
      width: 34,
      height: 34,
      borderRadius: BorderRadius.sm + 2,
      backgroundColor: colors.tint.amberLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    expiryText: {
      fontSize: Typography.bodySmall.fontSize,
      fontWeight: '700',
      color: colors.brand.amberDark,
    },
    expirySubtext: {
      fontSize: Typography.caption.fontSize,
      color: colors.brand.amberDeep,
      marginTop: 3,
    },
    expiryTypeRow: {
      fontSize: 11,
      color: colors.brand.amberDark,
      marginTop: 1,
    },
  });
};

export default withErrorBoundary(WalletScreen, 'Wallet');
