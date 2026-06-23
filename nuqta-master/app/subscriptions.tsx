import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Subscriptions Page
 * Shows available subscription tiers and user's current subscription.
 * Wired to real backend: GET /api/subscriptions/tiers (public) and GET /api/subscriptions/current (auth).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import subscriptionApi from '@/services/subscriptionApi';
import type { SubscriptionTier, CurrentSubscription } from '@/services/subscriptionApi';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { TierCard, BenefitsTable, ValueCalculator } from '@/components/subscriptions';
import { useIsMounted } from '@/hooks/useIsMounted';

function SubscriptionsPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // Always fetch tiers (public endpoint)
      const tiersData = await subscriptionApi.getAvailableTiers();
      if (!isMounted()) return;
      setTiers(tiersData || []);

      // Fetch current subscription only if authenticated
      if (isAuthenticated && !authLoading) {
        try {
          const subData = await subscriptionApi.getCurrentSubscription();
          if (!isMounted()) return;
          setCurrentSub(subData || null);
        } catch {
          // User may not have a subscription — that's fine
          if (!isMounted()) return;
          setCurrentSub(null);
        }
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError('Unable to load subscription plans. Pull to refresh.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [isAuthenticated, authLoading]);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [fetchData, authLoading]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const getSelectedPrice = () => {
    if (!selectedTier) return 0;
    return selectedCycle === 'yearly'
      ? selectedTier.pricing.yearly
      : selectedTier.pricing.monthly;
  };

  const handleSubscribe = () => {
    if (!selectedTier) return;
    router.push(
      `/payment?type=subscription&tier=${selectedTier.tier}&cycle=${selectedCycle}&amount=${getSelectedPrice()}` as any
    );
  };

  const getDaysRemaining = () => {
    if (!currentSub?.endDate) return 0;
    const diff = new Date(currentSub.endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return Colors.text.secondary;
      case 'premium': return Colors.gold;
      case 'vip': return colors.brand.purpleLight;
      default: return Colors.text.primary;
    }
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Subscriptions</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconCircle}>
            <Ionicons name="card-outline" size={36} color={Colors.gold} />
          </View>
          <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: Spacing.lg }} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
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
        <Text style={styles.headerTitle}>Subscriptions</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.gold} />
        }
      >
        {/* Banner */}
        <View style={styles.banner}>
          <LinearGradient
            colors={['rgba(236, 72, 153, 0.15)', 'rgba(139, 92, 246, 0.15)']}
            style={styles.bannerGradient}
          >
            <Ionicons name="diamond-outline" size={32} color={colors.brand.purpleLight} />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Unlock Premium Benefits</Text>
              <Text style={styles.bannerSubtitle}>
                Get more cashback, free delivery, and exclusive perks
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Error state */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={Colors.warning} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Current Subscription */}
        {currentSub && currentSub.status !== 'cancelled' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Current Plan</Text>
            <View style={styles.activeCard}>
              <View style={[styles.activeIcon, { backgroundColor: getTierColor(currentSub.tier) + '20' }]}>
                <Ionicons
                  name={currentSub.tier === 'vip' ? 'diamond' : currentSub.tier === 'premium' ? 'star' : 'person'}
                  size={24}
                  color={getTierColor(currentSub.tier)}
                />
              </View>
              <View style={styles.activeInfo}>
                <Text style={styles.activePlatform}>
                  {currentSub.tier.charAt(0).toUpperCase() + currentSub.tier.slice(1)}
                </Text>
                <Text style={styles.activePlan}>
                  {currentSub.billingCycle} &middot; {currentSub.status}
                </Text>
              </View>
              <View style={styles.activeExpiry}>
                <Text style={styles.activeExpiryLabel}>Expires in</Text>
                <Text style={styles.activeExpiryValue}>
                  {getDaysRemaining()} days
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Empty state for no tiers */}
        {tiers.length === 0 && !error && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="card-outline" size={36} color={Colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Plans Available</Text>
            <Text style={styles.emptyText}>
              Subscription plans are not available yet.{'\n'}Please check back later.
            </Text>
          </View>
        )}

        {/* Value Calculator - above billing cycle for visibility */}
        <ValueCalculator
          selectedTier={selectedTier || tiers.find(t => t.tier !== 'free') || null}
          currencySymbol={currencySymbol}
          isAuthenticated={isAuthenticated}
          selectedCycle={selectedCycle}
        />

        {/* Billing Cycle Toggle */}
        {tiers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose a Plan</Text>
            <View style={styles.cycleToggle}>
              <Pressable
                style={[styles.cycleButton, selectedCycle === 'monthly' && styles.cycleButtonActive]}
                onPress={() => setSelectedCycle('monthly')}
              >
                <Text style={[styles.cycleButtonText, selectedCycle === 'monthly' && styles.cycleButtonTextActive]}>
                  Monthly
                </Text>
              </Pressable>
              <Pressable
                style={[styles.cycleButton, selectedCycle === 'yearly' && styles.cycleButtonActive]}
                onPress={() => setSelectedCycle('yearly')}
              >
                <Text style={[styles.cycleButtonText, selectedCycle === 'yearly' && styles.cycleButtonTextActive]}>
                  Yearly
                </Text>
                {tiers.some(t => t.pricing.yearlyDiscount > 0) && (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>Save up to {Math.max(...tiers.map(t => t.pricing.yearlyDiscount))}%</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Plan Cards */}
        {tiers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.plansList}>
              {tiers.map((tier) => (
                <TierCard
                  key={tier.tier}
                  tier={tier}
                  selectedCycle={selectedCycle}
                  isSelected={selectedTier?.tier === tier.tier}
                  isCurrent={currentSub?.tier === tier.tier}
                  currencySymbol={currencySymbol}
                  onSelect={setSelectedTier}
                />
              ))}
            </View>
          </View>
        )}

        {/* Benefits Comparison Table */}
        {tiers.length > 0 && <BenefitsTable tiers={tiers} />}
      </ScrollView>

      {/* Bottom CTA */}
      {selectedTier && (
        <View style={styles.bottomCta}>
          <View style={styles.summary}>
            <Text style={styles.summaryPlatform}>
              {selectedTier.name} &middot; {selectedCycle}
            </Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryPrice}>
                {currencySymbol}{getSelectedPrice().toFixed(2)}
              </Text>
              {selectedCycle === 'yearly' && selectedTier.pricing.yearlyDiscount > 0 && (
                <Text style={styles.summarySavings}>
                  Save {selectedTier.pricing.yearlyDiscount}%
                </Text>
              )}
            </View>
          </View>
          <Pressable style={styles.buyButton} onPress={handleSubscribe}>
            <Text style={styles.buyButtonText}>Subscribe Now</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.background.primary} />
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
    ...Typography.h3,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gold + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  // Empty
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.text.tertiary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: 10,
  },
  errorText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
  },
  // Banner
  banner: {
    margin: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.base,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  bannerSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  // Sections
  section: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    ...Typography.h3,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  // Cycle toggle
  cycleToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 4,
    gap: 4,
  },
  cycleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  cycleButtonActive: {
    backgroundColor: Colors.gold,
  },
  cycleButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  cycleButtonTextActive: {
    color: Colors.text.inverse,
  },
  saveBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: 4,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.success,
  },
  // Plan cards
  plansList: {
    gap: Spacing.md,
  },
  // Active subscription
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  activeIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeInfo: {
    flex: 1,
  },
  activePlatform: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  activePlan: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
  activeExpiry: {
    alignItems: 'flex-end',
  },
  activeExpiryLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  activeExpiryValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.gold,
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
  summaryPlatform: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  summarySavings: {
    ...Typography.bodySmall,
    color: Colors.gold,
    fontWeight: '500',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  buyButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(SubscriptionsPage, 'Subscriptions');
