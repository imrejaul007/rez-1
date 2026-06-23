// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Mobile Recharge Page
 * Allows users to recharge mobile, DTH, etc. with cashback
 * Fetches operators and plans from backend API
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetCurrencySymbol, useIsAuthenticated, useRegionState } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlert } from '@/utils/platformAlert';
import {
  getOperators as fetchOperatorsApi,
  getPlans as fetchPlansApi,
  initiateRecharge,
  Operator,
  Plan,
} from '@/services/rechargeApi';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// ============================================
// CONSTANTS
// ============================================

const COLORS = {
  primaryGreen: Colors.gold,
  primaryGold: Colors.warning,
  textPrimary: Colors.text.primary,
  textSecondary: Colors.text.tertiary,
  white: Colors.background.primary,
  background: Colors.background.secondary,
  border: Colors.border.default,
};

function RechargePage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialAmount = (params.amount as string) || '';
  const getCurrencySymbol = useGetCurrencySymbol();
  const regionState = useRegionState();
  const currencySymbol = getCurrencySymbol();
  // Map region countryCode to phone prefix for fallback
  const regionPhonePrefix = regionState.regionConfig?.countryCode === 'AE' ? '+971'
    : regionState.regionConfig?.countryCode === 'CN' ? '+86' : '+91';
  const isAuthenticated = useIsAuthenticated();
  // Form state
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [amount, setAmount] = useState(initialAmount);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Data state
  const [operators, setOperators] = useState<Operator[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Loading / error state
  const [loadingOperators, setLoadingOperators] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination - plans
  const [plansPage, setPlansPage] = useState(1);
  const [plansHasMore, setPlansHasMore] = useState(false);
  const [loadingMorePlans, setLoadingMorePlans] = useState(false);
  const isMounted = useIsMounted();

  // ============================================
  // FETCH OPERATORS
  // ============================================

  useEffect(() => {
    let cancelled = false;

    const fetchOperators = async () => {
      setLoadingOperators(true);
      setError(null);
      try {
        const response = await fetchOperatorsApi('mobile', 20);
        if (!cancelled && response.success && response.data) {
          setOperators(response.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          if (!isMounted()) return;
          setError(err.message || 'Failed to load operators');
        }
      } finally {
        if (!cancelled) setLoadingOperators(false);
      }
    };

    fetchOperators();
    return () => { cancelled = true; };
  }, []);

  // ============================================
  // FETCH PLANS WHEN OPERATOR SELECTED
  // ============================================

  const fetchPlans = useCallback(async (operatorCode: string, page: number, append: boolean) => {
    if (page === 1) {
      setLoadingPlans(true);
    } else {
      setLoadingMorePlans(true);
    }

    try {
      const response = await fetchPlansApi(operatorCode, page, 10, 'amount');
      if (response.success && response.data) {
        setPlans(prev => append ? [...prev, ...response.data!] : response.data!);
        const pagination = response.meta?.pagination;
        setPlansHasMore(pagination ? pagination.page < pagination.pages : false);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load plans');
    } finally {
      if (!isMounted()) return;
      setLoadingPlans(false);
      if (!isMounted()) return;
      setLoadingMorePlans(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOperator) {
      setPlansPage(1);
      setSelectedPlan(null);
      fetchPlans(selectedOperator.code, 1, false);
    } else {
      setPlans([]);
      setPlansHasMore(false);
    }
  }, [selectedOperator, fetchPlans]);

  const loadMorePlans = useCallback(() => {
    if (!loadingMorePlans && plansHasMore && selectedOperator) {
      const nextPage = plansPage + 1;
      setPlansPage(nextPage);
      fetchPlans(selectedOperator.code, nextPage, true);
    }
  }, [loadingMorePlans, plansHasMore, selectedOperator, plansPage, fetchPlans]);

  // ============================================
  // HANDLE PROCEED
  // ============================================

  const handleProceed = useCallback(async () => {
    if (!mobileNumber || mobileNumber.length !== 10 || !amount || !selectedOperator) return;

    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await initiateRecharge(
        selectedOperator.code,
        Number(amount),
        `${selectedOperator?.countryCode || regionPhonePrefix}${mobileNumber}`,
        selectedPlan?._id,
      );

      if (response.success && response.data) {
        router.push(
          `/payment?type=recharge&amount=${amount}&mobile=${mobileNumber}&txnId=${response.data.transactionId}`
        );
      } else {
        const msg = response.message || 'Failed to initiate recharge';
        if (!isMounted()) return;
        setError(msg);
        platformAlert('Recharge Failed', msg);
      }
    } catch (err: any) {
      const msg = err.message || 'Something went wrong';
      if (!isMounted()) return;
      setError(msg);
      platformAlert('Error', msg);
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  }, [mobileNumber, amount, selectedOperator, selectedPlan, isAuthenticated, router]);

  // ============================================
  // QUICK AMOUNTS (derived from plans or fallback)
  // ============================================

  const quickAmounts = plans.length > 0
    ? [...new Set(plans.map(p => p.amount.toString()))].slice(0, 8)
    : [];

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderOperator = useCallback(({ item }: { item: Operator }) => {
    const isSelected = selectedOperator?.code === item.code;
    return (
      <Pressable
        style={[styles.operatorCard, isSelected && styles.operatorCardActive]}
        onPress={() => setSelectedOperator(isSelected ? null : item)}
      >
        {item.logo ? (
          <CachedImage
            source={{ uri: item.logo }}
            style={styles.operatorLogo}
            contentFit="contain"
          />
        ) : (
          <View style={[styles.operatorIcon, { backgroundColor: (item.color || colors.text.primary) + '20' }]}>
            <Text style={[styles.operatorInitial, { color: item.color || colors.text.primary }]}>
              {item.name[0]}
            </Text>
          </View>
        )}
        <Text style={styles.operatorName}>{item.name}</Text>
      </Pressable>
    );
  }, [selectedOperator]);

  const renderPlan = useCallback(({ item }: { item: Plan }) => {
    const isSelected = selectedPlan?._id === item._id;
    return (
      <Pressable
        style={[styles.planCard, isSelected && styles.planCardActive]}
        onPress={() => {
          setSelectedPlan(item);
          setAmount(item.amount.toString());
        }}
      >
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planAmount}>
              {currencySymbol}{item.amount.toFixed(2)}
            </Text>
            <Text style={styles.planName}>{item.name}</Text>
          </View>
          <View style={styles.planBadges}>
            {item.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>Popular</Text>
              </View>
            )}
            {item.cashbackPercent > 0 && (
              <View style={styles.planCashback}>
                <Text style={styles.planCashbackText}>{item.cashbackPercent}% cashback</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.planDetails}>
          {item.data && (
            <View style={styles.planDetail}>
              <Ionicons name="cellular-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.planDetailText}>{item.data}</Text>
            </View>
          )}
          {item.calls && (
            <View style={styles.planDetail}>
              <Ionicons name="call-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.planDetailText}>{item.calls}</Text>
            </View>
          )}
          {item.validity && (
            <View style={styles.planDetail}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.planDetailText}>{item.validity}</Text>
            </View>
          )}
          {item.sms && (
            <View style={styles.planDetail}>
              <Ionicons name="chatbubble-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.planDetailText}>{item.sms}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }, [selectedPlan, currencySymbol]);

  // ============================================
  // HEADER COMPONENT FOR FLATLIST
  // ============================================

  const ListHeader = useCallback(() => (
    <>
      {/* Cashback Banner */}
      <View style={styles.cashbackBanner}>
        <LinearGradient
          colors={['rgba(255, 205, 87, 0.15)', 'rgba(251, 191, 36, 0.15)']}
          style={styles.cashbackGradient}
        >
          <Ionicons name="gift" size={24} color={COLORS.primaryGold} />
          <View style={styles.cashbackText}>
            <Text style={styles.cashbackTitle}>Get up to 20% Cashback</Text>
            <Text style={styles.cashbackSubtitle}>+ Earn ${BRAND.COIN_NAME} on every recharge</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <Ionicons name="close-circle" size={18} color={colors.error} />
          </Pressable>
        </View>
      )}

      {/* Mobile Number */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mobile Number</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.countryCode}>{selectedOperator?.countryCode || regionPhonePrefix}</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter 10-digit mobile number"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="phone-pad"
            maxLength={10}
            value={mobileNumber}
            onChangeText={setMobileNumber}
          />
          {mobileNumber.length === 10 && (
            <Ionicons name="checkmark-circle" size={24} color={COLORS.primaryGreen} />
          )}
        </View>
      </View>

      {/* Operator Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Operator</Text>
        {loadingOperators ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primaryGreen} />
            <Text style={styles.loadingText}>Loading operators...</Text>
          </View>
        ) : operators.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="wifi-outline" size={32} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No operators available</Text>
            <Text style={styles.emptySubtitle}>Please check back later</Text>
          </View>
        ) : (
          <View style={styles.operatorsGrid}>
            {operators.map(op => (
              <React.Fragment key={op._id}>
                {renderOperator({ item: op })}
              </React.Fragment>
            ))}
          </View>
        )}
      </View>

      {/* Quick Amounts (only if plans loaded) */}
      {quickAmounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Recharge</Text>
          <View style={styles.amountsGrid}>
            {quickAmounts.map((amt) => (
              <Pressable
                key={amt}
                style={[
                  styles.amountCard,
                  amount === amt && styles.amountCardActive,
                ]}
                onPress={() => {
                  setAmount(amt);
                  setSelectedPlan(null);
                }}
              >
                <Text style={[styles.amountText, amount === amt && styles.amountTextActive]}>
                  {currencySymbol}{amt}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Custom Amount */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Or Enter Amount</Text>
        <View style={styles.customAmountContainer}>
          <Text style={styles.rupeeSymbol}>{currencySymbol}</Text>
          <TextInput
            style={styles.customAmountInput}
            placeholder="Enter amount"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="number-pad"
            value={amount}
            onChangeText={(val) => {
              setAmount(val);
              setSelectedPlan(null);
            }}
          />
        </View>
      </View>

      {/* Plans Section Title */}
      {selectedOperator && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedOperator.name} Plans
          </Text>
          {loadingPlans && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primaryGreen} />
              <Text style={styles.loadingText}>Loading plans...</Text>
            </View>
          )}
        </View>
      )}
    </>
  ), [
    error, mobileNumber, operators, loadingOperators, selectedOperator,
    quickAmounts, amount, currencySymbol, loadingPlans, renderOperator,
  ]);

  // ============================================
  // EMPTY / FOOTER FOR PLANS LIST
  // ============================================

  const PlansEmpty = useCallback(() => {
    if (loadingPlans || !selectedOperator) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="pricetag-outline" size={32} color={COLORS.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>No plans available</Text>
        <Text style={styles.emptySubtitle}>Try selecting a different operator</Text>
      </View>
    );
  }, [loadingPlans, selectedOperator]);

  const PlansFooter = useCallback(() => {
    if (!loadingMorePlans) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primaryGreen} />
      </View>
    );
  }, [loadingMorePlans]);

  // ============================================
  // RENDER
  // ============================================

  const canProceed = mobileNumber.length === 10 && !!amount && !!selectedOperator;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Mobile Recharge</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlashList
        data={selectedOperator && !loadingPlans ? plans : []}
        keyExtractor={(item) => item._id}
        renderItem={renderPlan}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={PlansEmpty}
        ListFooterComponent={PlansFooter}
        onEndReached={loadMorePlans}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={80}
      />

      {/* Bottom CTA */}
      {amount ? (
        <View style={styles.bottomCta}>
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>{currencySymbol}{Number(amount).toFixed(2)}</Text>
          </View>
          <Pressable
            style={[styles.proceedButton, !canProceed && styles.proceedButtonDisabled]}
            onPress={handleProceed}
            disabled={!canProceed || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.proceedButtonText}>Proceed to Pay</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  listContent: {
    paddingBottom: 120,
  },
  cashbackBanner: {
    margin: Spacing.base,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  cashbackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  cashbackText: {
    flex: 1,
  },
  cashbackTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  cashbackSubtitle: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: colors.errorScale[50],
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    ...Typography.bodySmall,
    color: colors.error,
  },
  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: Spacing.base,
  },
  countryCode: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginRight: Spacing.sm,
    paddingRight: Spacing.sm,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  input: {
    flex: 1,
    ...Typography.bodyLarge,
    color: COLORS.textPrimary,
    paddingVertical: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    ...Typography.bodySmall,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: COLORS.textSecondary,
  },
  operatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  operatorCard: {
    width: '23%',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  operatorCardActive: {
    borderColor: COLORS.primaryGreen,
  },
  operatorLogo: {
    width: 48,
    height: 48,
    borderRadius: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  operatorIcon: {
    width: 48,
    height: 48,
    borderRadius: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  operatorInitial: {
    ...Typography.h3,
    fontWeight: '700',
  },
  operatorName: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  amountCard: {
    width: '23%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  amountCardActive: {
    borderColor: COLORS.primaryGreen,
    backgroundColor: Colors.gold + '1A',
  },
  amountText: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  amountTextActive: {
    color: COLORS.primaryGreen,
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: Spacing.base,
  },
  rupeeSymbol: {
    ...Typography.h3,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: Spacing.sm,
  },
  customAmountInput: {
    flex: 1,
    ...Typography.h3,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingVertical: 14,
  },
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: 'transparent',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  planCardActive: {
    borderColor: COLORS.primaryGreen,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  planAmount: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  planName: {
    ...Typography.bodySmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  planBadges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  popularBadge: {
    backgroundColor: '#7C3AED1A',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  popularBadgeText: {
    ...Typography.bodySmall,
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.purple,
  },
  planCashback: {
    backgroundColor: Colors.gold + '1A',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  planCashbackText: {
    ...Typography.bodySmall,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryGreen,
  },
  planDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base,
  },
  planDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  planDetailText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  footerLoader: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  bottomCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalSection: {},
  totalLabel: {
    ...Typography.bodySmall,
    color: COLORS.textSecondary,
  },
  totalAmount: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  proceedButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
  proceedButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default withErrorBoundary(RechargePage, 'Recharge');
