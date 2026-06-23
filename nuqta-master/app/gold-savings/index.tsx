/**
 * Gold Savings Page
 * Buy, sell, and invest in digital gold
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthLoading, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { goldSavingsApi, GoldPriceData, GoldHoldingData, GoldTransaction } from '@/services/goldSavingsApi';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { errorReporter } from '@/utils/errorReporter';
import ErrorState from '@/components/common/ErrorState';
import { useIsMounted } from '@/hooks/useIsMounted';

const GOLD_COLOR = colors.warningScale[400];
const GOLD_DARK = colors.warningScale[700];
const QUICK_AMOUNTS = ['100', '500', '1000', '2000', '5000', '10000'];

function generateIdempotencyKey(): string {
  return `gold_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

function GoldSavingsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const currencySymbol = getCurrencySymbol();

  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');

  // API state
  const [goldPrice, setGoldPrice] = useState<GoldPriceData | null>(null);
  const [holding, setHolding] = useState<GoldHoldingData | null>(null);
  const [transactions, setTransactions] = useState<GoldTransaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txHasMore, setTxHasMore] = useState(false);

  const [loadingPrice, setLoadingPrice] = useState(true);
  const [loadingHolding, setLoadingHolding] = useState(true);
  const [loadingTx, setLoadingTx] = useState(false);
  const [loadingMoreTx, setLoadingMoreTx] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processingRef = useRef(false);

  const pricePerGram = goldPrice?.pricePerGram || 0;
  const goldBalance = holding?.balanceGrams || 0;

  const parsedAmount = parseFloat(amount) || 0;
  const goldAmount = activeTab === 'buy'
    ? (pricePerGram > 0 ? parsedAmount / pricePerGram : 0)
    : parsedAmount; // For sell, amount IS grams

  // Fetch gold price (public, no auth needed)
  const fetchPrice = useCallback(async () => {
    try {
      setLoadingPrice(true);
      setError(null);
      const response = await goldSavingsApi.getPrice();
      if (response.success && response.data) {
        if (!isMounted()) return;
        setGoldPrice(response.data);
      } else {
        if (!isMounted()) return;
        setError('Failed to load gold price. Please try again.');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load gold price. Please try again.');
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to fetch gold price'),
        { context: 'GoldSavingsPage.fetchPrice' },
        'warning'
      );
    } finally {
      if (!isMounted()) return;
      setLoadingPrice(false);
    }
  }, []);

  // Fetch user holding
  const fetchHolding = useCallback(async () => {
    if (!isAuthenticated || authLoading) return;
    try {
      setLoadingHolding(true);
      const response = await goldSavingsApi.getHolding();
      if (response.success && response.data) {
        if (!isMounted()) return;
        setHolding(response.data);
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to fetch gold holding'),
        { context: 'GoldSavingsPage.fetchHolding' },
        'warning'
      );
    } finally {
      if (!isMounted()) return;
      setLoadingHolding(false);
    }
  }, [isAuthenticated, authLoading]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!isAuthenticated || authLoading) return;
    try {
      if (page === 1) setLoadingTx(true);
      else setLoadingMoreTx(true);

      const response = await goldSavingsApi.getTransactions(page, 10);
      if (response.success && response.data) {
        const items = response.data;
        if (append) {
          if (!isMounted()) return;
          setTransactions(prev => [...prev, ...items]);
        } else {
          if (!isMounted()) return;
          setTransactions(items);
        }
        const pagination = response.meta?.pagination;
        if (!isMounted()) return;
        setTxHasMore(pagination ? pagination.page < pagination.pages : false);
        if (!isMounted()) return;
        setTxPage(page);
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to fetch gold transactions'),
        { context: 'GoldSavingsPage.fetchTransactions' },
        'warning'
      );
    } finally {
      if (!isMounted()) return;
      setLoadingTx(false);
      if (!isMounted()) return;
      setLoadingMoreTx(false);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchHolding();
      fetchTransactions(1);
    }
  }, [isAuthenticated, authLoading, fetchHolding, fetchTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPrice(), fetchHolding(), fetchTransactions(1)]);
    if (!isMounted()) return;
    setRefreshing(false);
  }, [fetchPrice, fetchHolding, fetchTransactions]);

  const handleProceed = useCallback(() => {
    if (processingRef.current) return;

    if (!isAuthenticated) {
      platformAlertSimple('Sign In Required', 'Please sign in to trade gold.');
      return;
    }

    if (!goldPrice || pricePerGram <= 0) {
      platformAlertSimple('Price Unavailable', 'Gold price is currently unavailable. Please try again.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      platformAlertSimple('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (activeTab === 'buy') {
      const gramsToGet = numAmount / pricePerGram;
      platformAlertConfirm(
        'Confirm Purchase',
        `Buy ${gramsToGet.toFixed(4)} gm gold for ${currencySymbol}${numAmount.toLocaleString()}?`,
        async () => {
          await executeBuy(numAmount);
        }
      );
    } else {
      // For sell, amount field represents grams
      const gramsToSell = numAmount;
      if (gramsToSell > goldBalance) {
        platformAlertSimple('Insufficient Balance', `You only have ${goldBalance.toFixed(4)} gm of gold.`);
        return;
      }
      const sellAmount = gramsToSell * pricePerGram;
      platformAlertConfirm(
        'Confirm Sale',
        `Sell ${gramsToSell.toFixed(4)} gm gold for ${currencySymbol}${sellAmount.toFixed(2)}?`,
        async () => {
          await executeSell(gramsToSell);
        }
      );
    }
  }, [isAuthenticated, goldPrice, pricePerGram, amount, activeTab, goldBalance, currencySymbol]);

  const executeBuy = async (buyAmount: number) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    setError(null);

    try {
      const key = generateIdempotencyKey();
      const response = await goldSavingsApi.buyGold(buyAmount, key);
      if (response.success && response.data) {
        const result = response.data;
        platformAlertSimple(
          'Purchase Successful',
          `You bought ${result.grams.toFixed(4)} gm of gold for ${currencySymbol}${result.amount.toLocaleString()}.`
        );
        if (!isMounted()) return;
        setAmount('');
        fetchHolding();
        fetchTransactions(1);
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Purchase failed');
        platformAlertSimple('Purchase Failed', response.message || 'Something went wrong.');
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Gold purchase failed'),
        { context: 'GoldSavingsPage.executeBuy' },
        'warning'
      );
      if (!isMounted()) return;
      setError('Purchase failed. Please try again.');
      platformAlertSimple('Error', 'Purchase failed. Please try again.');
    } finally {
      if (!isMounted()) return;
      setProcessing(false);
      processingRef.current = false;
    }
  };

  const executeSell = async (grams: number) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    setError(null);

    try {
      const key = generateIdempotencyKey();
      const response = await goldSavingsApi.sellGold(grams, key);
      if (response.success && response.data) {
        const result = response.data;
        platformAlertSimple(
          'Sale Successful',
          `You sold ${result.grams.toFixed(4)} gm of gold for ${currencySymbol}${result.amount.toFixed(2)}.`
        );
        if (!isMounted()) return;
        setAmount('');
        fetchHolding();
        fetchTransactions(1);
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Sale failed');
        platformAlertSimple('Sale Failed', response.message || 'Something went wrong.');
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Gold sale failed'),
        { context: 'GoldSavingsPage.executeSell' },
        'warning'
      );
      if (!isMounted()) return;
      setError('Sale failed. Please try again.');
      platformAlertSimple('Error', 'Sale failed. Please try again.');
    } finally {
      if (!isMounted()) return;
      setProcessing(false);
      processingRef.current = false;
    }
  };

  const loadMoreTransactions = useCallback(() => {
    if (loadingMoreTx || !txHasMore) return;
    fetchTransactions(txPage + 1, true);
  }, [loadingMoreTx, txHasMore, txPage, fetchTransactions]);

  // Sell tab shows grams input instead of currency
  const inputPlaceholder = activeTab === 'buy' ? '0' : '0.0000';
  const inputLabel = activeTab === 'buy' ? 'Enter Amount to Buy' : 'Enter Grams to Sell';
  const conversionText = activeTab === 'buy'
    ? `= ${(pricePerGram > 0 ? parsedAmount / pricePerGram : 0).toFixed(4)} gm Gold`
    : `= ${currencySymbol}${(parsedAmount * pricePerGram).toFixed(2)}`;

  const isPageLoading = loadingPrice && loadingHolding;

  if (isPageLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Digital Gold</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconWrapper}>
            <Ionicons name="diamond" size={40} color={GOLD_COLOR} />
          </View>
          <ActivityIndicator size="large" color={GOLD_COLOR} style={{ marginTop: Spacing.lg }} />
          <Text style={styles.loadingText}>Loading gold prices...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !goldPrice && !loadingPrice) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Digital Gold</Text>
          <View style={{ width: 24 }} />
        </View>
        <ErrorState error={error} onRetry={() => fetchPrice()} title="Failed to Load Gold Prices" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Digital Gold</Text>
        <Pressable onPress={() => router.push('/gold-savings/history' as any)}>
          <Ionicons name="time-outline" size={24} color={Colors.text.primary} />
        </Pressable>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={18} color={colors.error} />
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <Ionicons name="close" size={18} color={colors.error} />
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD_COLOR} />
        }
      >
        {/* Gold Balance Card */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={[GOLD_COLOR, GOLD_DARK]}
            style={styles.balanceGradient}
          >
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Your Gold Balance</Text>
              <Ionicons name="diamond" size={24} color={Colors.background.primary} />
            </View>
            {loadingHolding ? (
              <ActivityIndicator color={colors.background.primary} size="small" style={{ marginVertical: Spacing.lg }} />
            ) : (
              <>
                <Text style={styles.balanceAmount}>{goldBalance.toFixed(4)} gm</Text>
                <Text style={styles.balanceValue}>
                  {currencySymbol}{(goldBalance * pricePerGram).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </>
            )}
            <View style={styles.priceStrip}>
              <Text style={styles.priceLabel}>24K Gold Price</Text>
              {loadingPrice ? (
                <ActivityIndicator color="rgba(255,255,255,0.8)" size="small" />
              ) : (
                <Text style={styles.priceValue}>
                  {currencySymbol}{pricePerGram.toLocaleString()}/gm
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Buy/Sell Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'buy' && styles.tabActive]}
            onPress={() => { setActiveTab('buy'); setAmount(''); }}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={activeTab === 'buy' ? Colors.background.primary : Colors.text.secondary}
            />
            <Text style={[styles.tabText, activeTab === 'buy' && styles.tabTextActive]}>
              Buy Gold
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'sell' && styles.tabActive]}
            onPress={() => { setActiveTab('sell'); setAmount(''); }}
          >
            <Ionicons
              name="remove-circle-outline"
              size={20}
              color={activeTab === 'sell' ? Colors.background.primary : Colors.text.secondary}
            />
            <Text style={[styles.tabText, activeTab === 'sell' && styles.tabTextActive]}>
              Sell Gold
            </Text>
          </Pressable>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{inputLabel}</Text>
          <View style={styles.inputContainer}>
            {activeTab === 'buy' && (
              <Text style={styles.rupeeSymbol}>{currencySymbol}</Text>
            )}
            <TextInput
              style={styles.amountInput}
              placeholder={inputPlaceholder}
              placeholderTextColor={Colors.text.secondary}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              editable={!processing}
            />
            {activeTab === 'sell' && (
              <Text style={styles.unitLabel}>gm</Text>
            )}
          </View>
          {parsedAmount > 0 && pricePerGram > 0 && (
            <View style={styles.goldConversion}>
              <Ionicons name="swap-vertical" size={20} color={Colors.text.secondary} />
              <Text style={styles.goldConversionText}>{conversionText}</Text>
            </View>
          )}
        </View>

        {/* Quick Amounts (only for buy) */}
        {activeTab === 'buy' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Select</Text>
            <View style={styles.quickAmountsGrid}>
              {QUICK_AMOUNTS.map((amt) => (
                <Pressable
                  key={amt}
                  style={[
                    styles.quickAmountCard,
                    amount === amt && styles.quickAmountCardActive,
                  ]}
                  onPress={() => setAmount(amt)}
                  disabled={processing}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      amount === amt && styles.quickAmountTextActive,
                    ]}
                  >
                    {currencySymbol}{parseInt(amt).toLocaleString()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.slice(0, 5).map((tx) => (
              <View key={tx._id} style={styles.txCard}>
                <View style={[styles.txIcon, { backgroundColor: tx.type === 'buy' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                  <Ionicons
                    name={tx.type === 'buy' ? 'arrow-down' : 'arrow-up'}
                    size={18}
                    color={tx.type === 'buy' ? colors.successScale[400] : colors.error}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txTitle}>
                    {tx.type === 'buy' ? 'Bought Gold' : 'Sold Gold'}
                  </Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.txAmounts}>
                  <Text style={[styles.txAmount, { color: tx.type === 'buy' ? colors.successScale[400] : colors.error }]}>
                    {tx.type === 'buy' ? '+' : '-'}{tx.grams.toFixed(4)} gm
                  </Text>
                  <Text style={styles.txValue}>
                    {currencySymbol}{tx.amount.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
            {transactions.length > 5 && (
              <Pressable
                style={styles.viewAllButton}
                onPress={() => router.push('/gold-savings/history' as any)}
              >
                <Text style={styles.viewAllText}>View All Transactions</Text>
                <Ionicons name="chevron-forward" size={16} color={GOLD_COLOR} />
              </Pressable>
            )}
          </View>
        )}

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Digital Gold?</Text>
          <View style={styles.benefitsList}>
            {[
              { icon: 'shield-checkmark', title: '100% Secure', desc: 'Insured & stored in secure vaults' },
              { icon: 'wallet', title: `Start with ${currencySymbol}1`, desc: 'No minimum investment required' },
              { icon: 'flash', title: 'Instant Buy/Sell', desc: 'Trade anytime, 24x7' },
              { icon: 'gift', title: 'Earn Rewards', desc: `Get ${BRAND.COIN_NAME} on every transaction` },
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={benefit.icon as any} size={24} color={GOLD_COLOR} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDesc}>{benefit.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* SIP Option */}
        <View style={styles.sipCard}>
          <LinearGradient
            colors={['rgba(251, 191, 36, 0.15)', 'rgba(249, 115, 22, 0.15)']}
            style={styles.sipGradient}
          >
            <View style={styles.sipContent}>
              <View style={styles.sipIcon}>
                <Ionicons name="calendar" size={24} color={GOLD_COLOR} />
              </View>
              <View style={styles.sipText}>
                <Text style={styles.sipTitle}>Start Gold SIP</Text>
                <Text style={styles.sipDesc}>Auto-invest daily, weekly, or monthly</Text>
              </View>
              <Pressable
                style={styles.sipButton}
                onPress={() => router.push('/gold-savings/sip' as any)}
              >
                <Text style={styles.sipButtonText}>Setup</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustSection}>
          <View style={styles.trustBadge}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
            <Text style={styles.trustText}>Powered by MMTC-PAMP</Text>
          </View>
          <View style={styles.trustBadge}>
            <Ionicons name="lock-closed" size={20} color={Colors.gold} />
            <Text style={styles.trustText}>Bank-grade Security</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      {parsedAmount > 0 && pricePerGram > 0 && (
        <View style={styles.bottomCta}>
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>
              {activeTab === 'buy' ? 'You get' : 'You receive'}
            </Text>
            <Text style={styles.summaryValue}>
              {activeTab === 'buy'
                ? `${(parsedAmount / pricePerGram).toFixed(4)} gm Gold`
                : `${currencySymbol}${(parsedAmount * pricePerGram).toFixed(2)}`}
            </Text>
          </View>
          <Pressable
            style={[styles.proceedButton, processing && styles.proceedButtonDisabled]}
            onPress={handleProceed}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={Colors.background.primary} size="small" />
            ) : (
              <>
                <Text style={styles.proceedButtonText}>
                  {activeTab === 'buy' ? 'Buy Gold' : 'Sell Gold'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.background.primary} />
              </>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorScale[100],
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.errorScale[200],
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
    lineHeight: 18,
  },
  // Balance card
  balanceCard: {
    margin: Spacing.base,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  balanceGradient: {
    padding: Spacing.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  balanceValue: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.base,
  },
  priceStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  priceLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 10,
    gap: Spacing.sm,
  },
  tabActive: {
    backgroundColor: GOLD_COLOR,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.text.inverse,
  },
  // Sections
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  rupeeSymbol: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.text.primary,
    marginRight: 8,
  },
  unitLabel: {
    fontSize: 24,
    fontWeight: '500',
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  goldConversion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  goldConversionText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  // Quick amounts
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickAmountCard: {
    width: '31%',
    padding: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickAmountCardActive: {
    borderColor: GOLD_COLOR,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  quickAmountText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  quickAmountTextActive: {
    color: GOLD_COLOR,
  },
  // Transactions
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  txDate: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  txAmounts: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  txValue: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: GOLD_COLOR,
  },
  // Benefits
  benefitsList: {
    gap: Spacing.md,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  // SIP
  sipCard: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  sipGradient: {
    padding: Spacing.base,
  },
  sipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sipIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sipText: {
    flex: 1,
  },
  sipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  sipDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  sipButton: {
    backgroundColor: GOLD_COLOR,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
  },
  sipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  // Trust
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.xl,
    marginBottom: 120,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  // Bottom CTA
  bottomCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  summary: {},
  summaryLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: GOLD_COLOR,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GOLD_COLOR,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    minWidth: 130,
    justifyContent: 'center',
  },
  proceedButtonDisabled: {
    opacity: 0.7,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(GoldSavingsPage, 'Gold Savings');
