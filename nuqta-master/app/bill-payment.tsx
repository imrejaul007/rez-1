// @ts-nocheck
/**
 * Bill Payment Page
 * Pay utility bills with cashback - fully wired to backend APIs
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
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthLoading, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple } from '@/utils/platformAlert';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { errorReporter } from '@/utils/errorReporter';
import ErrorState from '@/components/common/ErrorState';
import {
  getBillTypes,
  getProviders,
  fetchBill,
  payBill,
  getPlans,
  getPaymentHistory,
  BillTypeInfo,
  BillProviderInfo,
  BillPlanInfo,
  FetchedBillInfo,
  BillPaymentRecord,
} from '@/services/billPaymentApi';
import { useIsMounted } from '@/hooks/useIsMounted';

type PageStep = 'types' | 'providers' | 'input' | 'plans' | 'bill';

function BillPaymentPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialType = (params.type as string) || '';
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  // Data state
  const [billTypes, setBillTypes] = useState<BillTypeInfo[]>([]);
  const [providers, setProviders] = useState<BillProviderInfo[]>([]);
  const [recentPayments, setRecentPayments] = useState<BillPaymentRecord[]>([]);
  const [fetchedBill, setFetchedBill] = useState<FetchedBillInfo | null>(null);

  // Plans state (for mobile_prepaid recharge)
  const [plans, setPlans] = useState<BillPlanInfo[]>([]);
  const [popularPlans, setPopularPlans] = useState<BillPlanInfo[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BillPlanInfo | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Payment success state (inline success view instead of alert)
  const [paymentSuccess, setPaymentSuccess] = useState<{
    amount: number;
    promoCoinsEarned: number;
    providerName: string;
  } | null>(null);

  // UI state
  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedProvider, setSelectedProvider] = useState<BillProviderInfo | null>(null);
  const [consumerNumber, setConsumerNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingBill, setLoadingBill] = useState(false);
  const [loadingPay, setLoadingPay] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Pagination for history
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchBillTypes = useCallback(async () => {
    try {
      setLoadingTypes(true);
      setError(null);
      const res = await getBillTypes();
      if (res.success && res.data) {
        setBillTypes(res.data);
        if (initialType && res.data.some((t) => t.id === initialType)) {
          setSelectedType(initialType);
        }
      } else {
        if (!isMounted()) return;
        setError('Failed to load bill types. Please try again.');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load bill types. Please try again.');
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to fetch bill types'),
        { context: 'BillPaymentPage.fetchBillTypes' },
        'warning'
      );
    } finally {
      if (!isMounted()) return;
      setLoadingTypes(false);
    }
  }, [initialType]);

  // Fetch bill types on mount
  useEffect(() => {
    fetchBillTypes();
  }, [fetchBillTypes]);

  // Fetch providers when type changes
  useEffect(() => {
    if (!selectedType) {
      setProviders([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingProviders(true);
        setSelectedProvider(null);
        setFetchedBill(null);
        setConsumerNumber('');
        const res = await getProviders(selectedType, 1, 50);
        if (!cancelled && res.success && res.data) {
          setProviders(res.data.providers);
        }
      } catch (err) {
        errorReporter.captureError(
          err instanceof Error ? err : new Error('Failed to fetch bill providers'),
          { context: 'BillPaymentPage.fetchProviders' },
          'warning'
        );
        if (!isMounted()) return;
        setProviders([]);
      } finally {
        if (!cancelled) setLoadingProviders(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedType]);

  // Fetch payment history
  const loadHistory = useCallback(async (page: number, append = false) => {
    if (authLoading || !isAuthenticated) return;
    try {
      if (page === 1) setLoadingHistory(true);
      else setLoadingMoreHistory(true);
      const res = await getPaymentHistory(page, 10);
      if (res.success && res.data) {
        if (append) {
          setRecentPayments((prev) => [...prev, ...res.data!.payments]);
        } else {
          setRecentPayments(res.data.payments);
        }
        setHasMoreHistory(res.data.pagination.hasNextPage);
        setHistoryPage(page);
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to fetch payment history'),
        { context: 'BillPaymentPage.loadHistory' },
        'info'
      );
    } finally {
      if (!isMounted()) return;
      setLoadingHistory(false);
      if (!isMounted()) return;
      setLoadingMoreHistory(false);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadHistory(1);
    }
  }, [authLoading, isAuthenticated, loadHistory]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleFetchBill = useCallback(async () => {
    if (!selectedProvider || !consumerNumber.trim()) return;
    try {
      setLoadingBill(true);
      const res = await fetchBill(selectedProvider._id, consumerNumber.trim());
      if (res.success && res.data) {
        const data = res.data as any;
        // If backend says this provider requires plan selection (mobile_prepaid)
        if (data.requiresPlanSelection) {
          // Fetch plans for this provider
          setLoadingPlans(true);
          try {
            const plansRes = await getPlans(selectedProvider._id);
            if (plansRes.success && plansRes.data) {
              setPlans(plansRes.data.allPlans || []);
              setPopularPlans(plansRes.data.popular || []);
            }
          } catch {
            setPlans([]);
            setPopularPlans([]);
          } finally {
            if (isMounted()) setLoadingPlans(false);
          }
          setSelectedPlan(null);
          // Don't set fetchedBill — go to plans step instead
          return;
        }
        setFetchedBill(res.data);
      } else {
        platformAlertSimple('Error', res.message || 'Could not fetch bill details');
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Failed to fetch bill details'),
        { context: 'BillPaymentPage.handleFetchBill' },
        'warning'
      );
      platformAlertSimple('Error', 'Failed to fetch bill. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoadingBill(false);
    }
  }, [selectedProvider, consumerNumber]);

  const handlePayBill = useCallback(async () => {
    const amount = fetchedBill?.amount ?? selectedPlan?.price;
    if (!selectedProvider || !amount) return;
    if (!fetchedBill && !selectedPlan) return;
    try {
      setLoadingPay(true);
      const res = await payBill(
        selectedProvider._id,
        consumerNumber.trim(),
        amount,
        undefined,
        selectedPlan?.id
      );
      if (res.success && res.data) {
        const { promoCoinsEarned = 0 } = res.data;
        // Show inline success view
        if (!isMounted()) return;
        setPaymentSuccess({
          amount,
          promoCoinsEarned,
          providerName: selectedProvider.name,
        });
        setFetchedBill(null);
        setSelectedPlan(null);
        setPlans([]);
        setPopularPlans([]);
        setConsumerNumber('');
        setSelectedProvider(null);
        loadHistory(1);
      } else {
        platformAlertSimple('Error', res.message || 'Payment failed');
      }
    } catch (err) {
      errorReporter.captureError(
        err instanceof Error ? err : new Error('Bill payment failed'),
        { context: 'BillPaymentPage.handlePayBill' },
        'warning'
      );
      platformAlertSimple('Error', 'Payment failed. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoadingPay(false);
    }
  }, [fetchedBill, selectedPlan, selectedProvider, consumerNumber, loadHistory]);

  const handleLoadMoreHistory = useCallback(() => {
    if (!hasMoreHistory || loadingMoreHistory) return;
    loadHistory(historyPage + 1, true);
  }, [hasMoreHistory, loadingMoreHistory, historyPage, loadHistory]);

  // ============================================
  // HELPER: bill type icon/color from backend data or local meta
  // ============================================

  const getBillTypeMeta = useCallback(
    (typeId: string) => {
      const found = billTypes.find((t) => t.id === typeId);
      return found || { icon: 'receipt-outline', color: Colors.gold, label: typeId };
    },
    [billTypes]
  );

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderBillTypeCard = useCallback(
    (type: BillTypeInfo) => {
      const isActive = selectedType === type.id;
      return (
        <Pressable
          key={type.id}
          style={[styles.billTypeCard, isActive && styles.billTypeCardActive]}
          onPress={() => {
            setSelectedType(type.id);
          }}
        >
          <View style={[styles.billTypeIcon, { backgroundColor: type.color + '20' }]}>
            <Ionicons name={type.icon as any} size={24} color={type.color} />
          </View>
          <Text style={styles.billTypeName}>{type.label}</Text>
          {type.providerCount > 0 && (
            <Text style={styles.billTypeCount}>{type.providerCount}</Text>
          )}
        </Pressable>
      );
    },
    [selectedType]
  );

  const renderProviderCard = useCallback(
    (provider: BillProviderInfo) => {
      const isActive = selectedProvider?._id === provider._id;
      return (
        <Pressable
          key={provider._id}
          style={[styles.providerCard, isActive && styles.providerCardActive]}
          onPress={() => {
            setSelectedProvider(provider);
            setFetchedBill(null);
            setConsumerNumber('');
          }}
        >
          {provider.logo ? (
            <CachedImage
              source={{ uri: provider.logo }}
              style={styles.providerLogo}
              contentFit="contain"
            />
          ) : (
            <View style={styles.providerIcon}>
              <Ionicons
                name={getBillTypeMeta(provider.type).icon as any}
                size={20}
                color={Colors.gold}
              />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.providerName}>{provider.name}</Text>
            {provider.cashbackPercent > 0 && (
              <Text style={styles.providerCashback}>
                {provider.cashbackPercent}% cashback
              </Text>
            )}
          </View>
          {isActive && (
            <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
          )}
        </Pressable>
      );
    },
    [selectedProvider, getBillTypeMeta]
  );

  const renderRecentPayment = useCallback(
    ({ item }: { item: BillPaymentRecord }) => {
      const meta = getBillTypeMeta(item.billType);
      const isPaid = item.status === 'completed';
      return (
        <Pressable style={styles.recentCard}>
          <View style={styles.recentIcon}>
            <Ionicons name={meta.icon as any} size={20} color={Colors.gold} />
          </View>
          <View style={styles.recentInfo}>
            <Text style={styles.recentType}>{meta.label}</Text>
            <Text style={styles.recentProvider}>
              {item.provider?.name || 'Unknown'} - {item.customerNumber}
            </Text>
          </View>
          <View style={styles.recentAmount}>
            <Text style={styles.recentAmountText}>
              {currencySymbol}{item.amount.toLocaleString()}
            </Text>
            <View style={[styles.recentStatus, isPaid && styles.recentStatusPaid]}>
              <Text
                style={[styles.recentStatusText, isPaid && styles.recentStatusTextPaid]}
              >
                {isPaid ? 'Paid' : item.status === 'failed' ? 'Failed' : 'Pending'}
              </Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [currencySymbol, getBillTypeMeta]
  );

  const renderHistoryFooter = useCallback(() => {
    if (!loadingMoreHistory) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.gold} />
      </View>
    );
  }, [loadingMoreHistory]);

  // ============================================
  // MAIN LIST HEADER (all content above history)
  // ============================================

  const ListHeader = useCallback(() => {
    const typeMeta = selectedType ? getBillTypeMeta(selectedType) : null;

    return (
      <View>
        {/* Cashback Banner */}
        <View style={styles.banner}>
          <LinearGradient
            colors={['rgba(255, 205, 87, 0.15)', 'rgba(251, 191, 36, 0.15)']}
            style={styles.bannerGradient}
          >
            <Ionicons name="gift" size={24} color={Colors.gold} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Earn Cashback</Text>
              <Text style={styles.bannerSubtitle}>
                {`Pay your utility bills and earn ${BRAND.COIN_NAME} as cashback`}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Bill Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Bill Type</Text>
          {loadingTypes ? (
            <View style={styles.centeredLoader}>
              <ActivityIndicator size="small" color={Colors.gold} />
            </View>
          ) : billTypes.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={32} color={Colors.text.secondary} />
              </View>
              <Text style={styles.emptyTitle}>No Bill Types Available</Text>
              <Text style={styles.emptySubtitle}>Please check back later</Text>
            </View>
          ) : (
            <View style={styles.billTypesGrid}>
              {billTypes.map(renderBillTypeCard)}
            </View>
          )}
        </View>

        {/* Provider Selection */}
        {selectedType && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Provider</Text>
            {loadingProviders ? (
              <View style={styles.centeredLoader}>
                <ActivityIndicator size="small" color={Colors.gold} />
              </View>
            ) : providers.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name={typeMeta?.icon as any || 'business-outline'}
                    size={28}
                    color={Colors.text.secondary}
                  />
                </View>
                <Text style={styles.emptyTitle}>No Providers Found</Text>
                <Text style={styles.emptySubtitle}>
                  No providers available for {typeMeta?.label || selectedType}
                </Text>
              </View>
            ) : (
              <View style={styles.providersList}>
                {providers.map(renderProviderCard)}
              </View>
            )}
          </View>
        )}

        {/* Consumer Number Input */}
        {selectedProvider && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedProvider.requiredFields?.[0]?.label || 'Consumer/Account Number'}
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={
                  selectedProvider.requiredFields?.[0]?.placeholder ||
                  'Enter your consumer number'
                }
                placeholderTextColor={Colors.text.secondary}
                value={consumerNumber}
                onChangeText={setConsumerNumber}
                keyboardType={
                  selectedProvider.requiredFields?.[0]?.type === 'number'
                    ? 'numeric'
                    : 'default'
                }
              />
              <Pressable
                style={[
                  styles.fetchButton,
                  (!consumerNumber.trim() || loadingBill) && styles.fetchButtonDisabled,
                ]}
                onPress={handleFetchBill}
                disabled={!consumerNumber.trim() || loadingBill}
              >
                {loadingBill ? (
                  <ActivityIndicator size="small" color={Colors.background.primary} />
                ) : (
                  <Text style={styles.fetchButtonText}>Fetch Bill</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Plans Selection (mobile_prepaid recharge) */}
        {(plans.length > 0 || loadingPlans) && selectedProvider && !fetchedBill && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select a Plan</Text>
            {loadingPlans ? (
              <View style={styles.centeredLoader}>
                <ActivityIndicator size="small" color={Colors.gold} />
              </View>
            ) : (
              <>
                {/* Popular Plans horizontal scroll */}
                {popularPlans.length > 0 && (
                  <View style={{ marginBottom: Spacing.base }}>
                    <Text style={styles.plansSectionLabel}>Popular Plans</Text>
                    <View style={{ height: 130 }}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: Spacing.base, alignItems: 'center', gap: Spacing.md }}
                      >
                        {popularPlans.map((plan) => {
                          const isActive = selectedPlan?.id === plan.id;
                          return (
                            <Pressable
                              key={plan.id}
                              style={[styles.popularPlanCard, isActive && styles.popularPlanCardActive]}
                              onPress={() => setSelectedPlan(plan)}
                            >
                              <Text style={[styles.popularPlanPrice, isActive && styles.popularPlanPriceActive]}>
                                {currencySymbol}{plan.price}
                              </Text>
                              <Text style={styles.popularPlanValidity}>{plan.validity}</Text>
                              {plan.data && (
                                <Text style={styles.popularPlanData}>{plan.data}</Text>
                              )}
                              {isActive && (
                                <View style={styles.popularPlanCheck}>
                                  <Ionicons name="checkmark-circle" size={18} color={Colors.gold} />
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* All Plans list */}
                <Text style={styles.plansSectionLabel}>All Plans</Text>
                <View style={styles.allPlansList}>
                  {plans.map((plan) => {
                    const isActive = selectedPlan?.id === plan.id;
                    return (
                      <Pressable
                        key={plan.id}
                        style={[styles.allPlanRow, isActive && styles.allPlanRowActive]}
                        onPress={() => setSelectedPlan(plan)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.allPlanName}>{plan.name}</Text>
                          <View style={styles.allPlanMeta}>
                            <Text style={styles.allPlanMetaText}>{plan.validity}</Text>
                            {plan.data && <Text style={styles.allPlanMetaText}>{plan.data}</Text>}
                            {plan.calls && <Text style={styles.allPlanMetaText}>{plan.calls}</Text>}
                          </View>
                        </View>
                        <Text style={styles.allPlanPrice}>
                          {currencySymbol}{plan.price}
                        </Text>
                        {isActive ? (
                          <Ionicons name="checkmark-circle" size={22} color={Colors.gold} />
                        ) : (
                          <View style={styles.allPlanRadio} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {/* Fetched Bill Details */}
        {fetchedBill && (
          <View style={styles.billCard}>
            <View style={styles.billHeader}>
              <Ionicons name="receipt-outline" size={24} color={Colors.gold} />
              <Text style={styles.billTitle}>Bill Details</Text>
            </View>
            <View style={styles.billDetails}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Provider</Text>
                <Text style={styles.billValue}>{fetchedBill.provider.name}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Consumer Number</Text>
                <Text style={styles.billValue}>{fetchedBill.customerNumber}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Due Date</Text>
                <Text style={styles.billValue}>
                  {new Date(fetchedBill.dueDate).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Bill Amount</Text>
                <Text style={styles.billAmount}>
                  {currencySymbol}{fetchedBill.amount.toLocaleString()}
                </Text>
              </View>
              {fetchedBill.cashbackAmount > 0 && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Cashback</Text>
                  <Text style={styles.billCashback}>
                    + {currencySymbol}{fetchedBill.cashbackAmount.toLocaleString()} ({fetchedBill.cashbackPercent}%)
                  </Text>
                </View>
              )}
              <View style={styles.billDivider} />
              <View style={styles.billRow}>
                <Text style={styles.billTotalLabel}>You Pay</Text>
                <Text style={styles.billTotal}>
                  {currencySymbol}{fetchedBill.amount.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Success Inline View */}
        {paymentSuccess && (
          <View style={styles.successCard}>
            <View style={styles.successCheckCircle}>
              <Ionicons name="checkmark-circle" size={56} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successAmount}>
              {currencySymbol}{paymentSuccess.amount.toLocaleString()}
            </Text>
            <Text style={styles.successProvider}>
              Paid to {paymentSuccess.providerName}
            </Text>
            {paymentSuccess.promoCoinsEarned > 0 && (
              <View style={styles.successCoinsBadge}>
                <Ionicons name="sparkles" size={16} color={Colors.gold} />
                <Text style={styles.successCoinsText}>
                  You earned {paymentSuccess.promoCoinsEarned} Promo Coins!
                </Text>
              </View>
            )}
            {paymentSuccess.promoCoinsEarned > 0 && (
              <Text style={styles.successHint}>
                Use them at any merchant within 30 days
              </Text>
            )}
            <Pressable
              style={styles.successBackButton}
              onPress={() => {
                setPaymentSuccess(null);
                router.canGoBack() ? router.back() : router.replace('/(tabs)');
              }}
            >
              <Text style={styles.successBackButtonText}>Back to Home</Text>
            </Pressable>
          </View>
        )}

        {/* Recent Payments Header */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          {loadingHistory && (
            <View style={styles.centeredLoader}>
              <ActivityIndicator size="small" color={Colors.gold} />
            </View>
          )}
          {!loadingHistory && recentPayments.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={32} color={Colors.text.secondary} />
              </View>
              <Text style={styles.emptyTitle}>No Payments Yet</Text>
              <Text style={styles.emptySubtitle}>
                Your bill payment history will appear here
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }, [
    billTypes,
    selectedType,
    providers,
    selectedProvider,
    consumerNumber,
    fetchedBill,
    loadingTypes,
    loadingProviders,
    loadingBill,
    loadingHistory,
    recentPayments.length,
    currencySymbol,
    renderBillTypeCard,
    renderProviderCard,
    getBillTypeMeta,
    handleFetchBill,
    plans,
    popularPlans,
    selectedPlan,
    loadingPlans,
    paymentSuccess,
  ]);

  // ============================================
  // RENDER
  // ============================================

  if (error && !loadingTypes) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Bill Payments</Text>
          <View style={{ width: 32 }} />
        </View>
        <ErrorState error={error} onRetry={fetchBillTypes} title="Failed to Load Bill Types" />
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
        <Text style={styles.headerTitle}>Bill Payments</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlashList
        data={recentPayments}
        renderItem={renderRecentPayment}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={renderHistoryFooter}
        onEndReached={handleLoadMoreHistory}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        estimatedItemSize={80}
      />

      {/* Bottom CTA */}
      {(fetchedBill || selectedPlan) && !paymentSuccess && (
        <View style={styles.bottomCta}>
          <Pressable
            style={[styles.payButton, loadingPay && styles.payButtonDisabled]}
            onPress={handlePayBill}
            disabled={loadingPay}
          >
            {loadingPay ? (
              <ActivityIndicator size="small" color={Colors.background.primary} />
            ) : (
              <>
                <Text style={styles.payButtonText}>
                  {selectedPlan
                    ? `Recharge ${currencySymbol}${selectedPlan.price.toLocaleString()}`
                    : `Pay ${currencySymbol}${fetchedBill!.amount.toLocaleString()}`}
                </Text>
                {selectedProvider?.promoCoinsFixed && selectedProvider.promoCoinsFixed > 0 ? (
                  <Text style={styles.payButtonCoins}>
                    Earn {selectedProvider.promoCoinsFixed} coins
                  </Text>
                ) : (
                  <Ionicons name="arrow-forward" size={20} color={Colors.background.primary} />
                )}
              </>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

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
  listContent: {
    paddingBottom: 120,
  },
  banner: {
    margin: Spacing.base,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  billTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  billTypeCard: {
    width: '22%',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  billTypeCardActive: {
    borderColor: Colors.gold,
  },
  billTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  billTypeName: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  billTypeCount: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  providersList: {
    gap: Spacing.sm,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  providerCardActive: {
    borderColor: Colors.gold,
  },
  providerLogo: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  providerCashback: {
    fontSize: 12,
    color: Colors.gold,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  fetchButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    minWidth: 90,
    alignItems: 'center',
  },
  fetchButtonDisabled: {
    backgroundColor: Colors.text.secondary,
  },
  fetchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  billCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  billDetails: {
    gap: Spacing.md,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  billValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  billAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  billCashback: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gold,
  },
  billDivider: {
    height: 1,
    backgroundColor: Colors.border.default,
    marginVertical: Spacing.sm,
  },
  billTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  billTotal: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gold,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentInfo: {
    flex: 1,
  },
  recentType: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  recentProvider: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  recentAmount: {
    alignItems: 'flex-end',
  },
  recentAmountText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  recentStatus: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  recentStatusPaid: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
  },
  recentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.error,
  },
  recentStatusTextPaid: {
    color: Colors.gold,
  },
  bottomCta: {
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  centeredLoader: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  payButtonCoins: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.inverse,
    opacity: 0.9,
  },
  // Plans styles
  plansSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  popularPlanCard: {
    width: 110,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  popularPlanCardActive: {
    borderColor: Colors.gold,
  },
  popularPlanPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  popularPlanPriceActive: {
    color: Colors.gold,
  },
  popularPlanValidity: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  popularPlanData: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  popularPlanCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  allPlansList: {
    gap: Spacing.sm,
  },
  allPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    gap: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  allPlanRowActive: {
    borderColor: Colors.gold,
  },
  allPlanName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  allPlanMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  allPlanMetaText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  allPlanPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginRight: Spacing.sm,
  },
  allPlanRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border.default,
  },
  // Success view styles
  successCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  successCheckCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  successProvider: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: Spacing.base,
  },
  successCoinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255, 205, 87, 0.15)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm,
  },
  successCoinsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gold,
  },
  successHint: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  successBackButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  successBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(BillPaymentPage, 'Bill Payment');
