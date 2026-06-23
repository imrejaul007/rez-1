import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Coin Detail Page - Shows detailed info for each coin type (nuqta/promo/branded)
 * Route: /wallet/coin-detail/[coinType]
 */
import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useWalletData, useWalletLoading, useWalletRefreshing, useRefreshWallet } from '@/stores/selectors';
import { COIN_TYPES, CoinType } from '@/types/wallet';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/DesignSystem';
import { ThemedText } from '@/components/ThemedText';
import { platformAlert } from '@/utils/platformAlert';
import walletApi from '@/services/walletApi';
import { TransactionListSkeleton } from '@/components/skeletons';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const nuqtaCoinImage = BRAND.COIN_IMAGE;

const DEFAULT_COIN_RULES: Record<string, { usageRules: string[]; earningMethods: string[] }> = {
  rez: {
    usageRules: [`Use anywhere on ${BRAND.APP_NAME}`, 'No usage cap per transaction', 'Never expires'],
    earningMethods: ['Purchases & Orders', 'Referrals', 'Daily Check-in', 'Games & Challenges', 'Reviews & Social'],
  },
  nuqta: {
    usageRules: [`Use anywhere on ${BRAND.APP_NAME}`, 'No usage cap per transaction', 'Never expires'],
    earningMethods: ['Purchases & Orders', 'Referrals', 'Daily Check-in', 'Games & Challenges', 'Reviews & Social'],
  },
  promo: {
    usageRules: ['Max 20% of bill value per transaction', 'Valid only during campaign period', 'Check expiry date'],
    earningMethods: ['Bonus Campaigns', 'Festival Offers', 'Flash Sales', 'Category Multipliers'],
  },
  branded: {
    usageRules: ['Use only at the issuing merchant', 'No expiry (merchant-specific)', 'Cannot transfer to others'],
    earningMethods: ['Store Purchases', 'Merchant Promotions', 'Loyalty Programs'],
  },
};

function CoinDetailPage() {
  const { coinType } = useLocalSearchParams<{ coinType: string }>();
  const router = useRouter();
  const walletData = useWalletData();
  const walletLoading = useWalletLoading();
  const walletRefreshing = useWalletRefreshing();
  const refreshWallet = useRefreshWallet();

  const validTypes = ['rez', 'nuqta', 'promo', 'branded'];
  const type = (validTypes.includes(coinType || '') ? coinType : 'rez') as CoinType;
  const coinInfo = COIN_TYPES[type] || COIN_TYPES.rez;

  const [dynamicRules, setDynamicRules] = useState<Record<string, { usageRules: string[]; earningMethods: string[] }> | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    walletApi.getCoinRules().then(res => {
      if (res?.data?.coinRules) setDynamicRules(res.data.coinRules);
    }).catch(() => { /* silently handle */ });
  }, []);

  const ruleSource = dynamicRules || DEFAULT_COIN_RULES;
  const ruleKey = type === 'nuqta' ? 'rez' : type;
  const rules = ruleSource[ruleKey] || DEFAULT_COIN_RULES.rez;

  const coin = walletData?.coins.find(c => c.type === type || (type === 'nuqta' && c.type === 'rez'));
  const brandedTotal = type === 'branded' ? (walletData?.brandedCoinsTotal || 0) : 0;
  const amount = type === 'branded' ? brandedTotal : (coin?.amount || 0);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshWallet();
    } catch (error) {
      platformAlert('Refresh Failed', 'Unable to refresh data');
    }
  }, [refreshWallet]);

  // Loading state
  if (walletLoading && !walletData) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={coinInfo.amountColor} />
        <TransactionListSkeleton />
      </View>
    );
  }

  // Error state
  if (!walletData && !walletLoading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <StatusBar barStyle="light-content" backgroundColor={coinInfo.amountColor} />
        <Ionicons name="alert-circle-outline" size={48} color={Colors.text.tertiary} />
        <ThemedText style={{ marginTop: 12, color: Colors.text.secondary, textAlign: 'center' }}>
          Failed to load wallet data
        </ThemedText>
        <Pressable
          style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: coinInfo.amountColor, borderRadius: 8 }}
          onPress={handleRefresh}
        >
          <ThemedText style={{ color: colors.background.primary, fontWeight: '600' }}>Retry</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={coinInfo.amountColor} />

      {/* Hero Header */}
      <LinearGradient
        colors={[Colors.nileBlue, coinInfo.amountColor + '60'] as const}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={22} color={colors.background.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>{coinInfo.name}</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.heroBalance}>
          <View style={[styles.heroIcon, { backgroundColor: coinInfo.backgroundColor }]}>
            {type === 'rez' || type === 'nuqta' ? (
              <CachedImage source={nuqtaCoinImage} style={styles.heroCoinImage} contentFit="contain" />
            ) : (
              <Ionicons
                name={type === 'branded' ? 'storefront' : 'flash'}
                size={28}
                color={coinInfo.color}
              />
            )}
          </View>
          <Text style={styles.heroAmount}>{amount.toLocaleString()} {BRAND.CURRENCY_CODE}</Text>
          <Text style={styles.heroLabel}>{coinInfo.description}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={walletRefreshing} onRefresh={handleRefresh} tintColor={coinInfo.amountColor} />
        }
      >
        {/* Expiry Info (Promo only) */}
        {type === 'promo' && coin?.expiryDate && (
          <View style={[styles.card, styles.warningCard]}>
            <Ionicons name="time" size={18} color={colors.warningScale[700]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <ThemedText style={styles.warningTitle}>Expires Soon</ThemedText>
              <ThemedText style={styles.warningText}>
                {coin.expiryCountdown || (coin.expiryDate ? `Expires ${new Date(coin.expiryDate).toLocaleDateString()}` : 'Check expiry details')}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Usage Rules */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Usage Rules</ThemedText>
          {rules.usageRules.map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.successScale[700]} />
              <ThemedText style={styles.ruleText}>{rule}</ThemedText>
            </View>
          ))}
        </View>

        {/* How to Earn */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>How to Earn</ThemedText>
          {rules.earningMethods.map((method, i) => (
            <View key={i} style={styles.ruleRow}>
              <Ionicons name="add-circle" size={16} color={coinInfo.amountColor} />
              <ThemedText style={styles.ruleText}>{method}</ThemedText>
            </View>
          ))}
        </View>

        {/* Branded Coins Breakdown */}
        {type === 'branded' && walletData?.brandedCoins && walletData.brandedCoins.length > 0 && (
          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>By Merchant</ThemedText>
            {walletData.brandedCoins.map((bc, i) => (
              <View key={bc.merchantId} style={[styles.merchantRow, i < walletData.brandedCoins.length - 1 && styles.merchantBorder]}>
                <View style={[styles.merchantIcon, { backgroundColor: (bc.merchantColor || colors.brand.indigo) + '15' }]}>
                  <Ionicons name="storefront" size={16} color={bc.merchantColor || colors.brand.indigo} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.merchantName}>{bc.merchantName}</ThemedText>
                </View>
                <ThemedText style={[styles.merchantAmount, { color: coinInfo.amountColor }]}>
                  {bc.amount} {BRAND.CURRENCY_CODE}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Conversion Info */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Coin Value</ThemedText>
          <ThemedText style={styles.conversionText}>
            1 ${BRAND.CURRENCY_CODE} = 1 ${BRAND.CURRENCY_CODE} (${BRAND.COIN_SINGLE}){'\n'}
            Coins are earned and spent within the ${BRAND.APP_NAME} platform.
          </ThemedText>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 24,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: colors.background.primary, fontSize: 18, fontWeight: '700' },
  heroBalance: { alignItems: 'center' },
  heroIcon: {
    width: 56, height: 56, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  heroCoinImage: {
    width: 34,
    height: 34,
  },
  heroAmount: { color: colors.background.primary, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500', marginTop: 4, textAlign: 'center' },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 16 },
  card: {
    backgroundColor: colors.background.primary, borderRadius: 16, padding: 16, marginBottom: 12,
    ...Shadows.subtle,
  },
  warningCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.tint.amberLight, borderColor: 'rgba(245, 158, 11, 0.13)', borderWidth: 1,
  },
  warningTitle: { fontSize: 13, fontWeight: '700', color: colors.brand.amberDark },
  warningText: { fontSize: 11, color: colors.brand.amberDark, marginTop: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary, marginBottom: 10 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  ruleText: { fontSize: 13, color: Colors.text.secondary, flex: 1 },
  merchantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  merchantBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F0F0' },
  merchantIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  merchantName: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  merchantAmount: { fontSize: 14, fontWeight: '800' },
  conversionText: { fontSize: 12, color: Colors.text.tertiary, lineHeight: 18 },
});

export default withErrorBoundary(CoinDetailPage, 'WalletCoinDetailCoinType');
