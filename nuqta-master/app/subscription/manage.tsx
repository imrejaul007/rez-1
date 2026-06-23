import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Subscription Management Page
// Manage current subscription, view usage statistics, and handle upgrades/cancellations

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSubscription } from '@/contexts/SubscriptionContext';
import subscriptionAPI from '@/services/subscriptionApi';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { TIER_COLORS, TIER_GRADIENTS, TIER_ICONS, SubscriptionTier } from '@/types/subscription.types';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { ManageSubscriptionSkeleton } from '@/components/subscription/SubscriptionSkeleton';
import PaymentFailedBanner from '@/components/subscription/PaymentFailedBanner';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useUserIdentityStore, IdentitySegment } from '@/stores/userIdentityStore';
// StickyCTAContainer available for future use

const SEGMENT_SAVINGS_TITLE: Partial<Record<IdentitySegment, string>> = {
  verified_student: 'Student Savings',
  verified_employee: 'Work Perks Saved',
  verified_healthcare: 'Healthcare Savings',
  verified_defence: 'Defence Savings',
  verified_teacher: 'Teacher Benefits',
  verified_senior: 'Senior Benefits',
};

function SubscriptionManagePage() {
  const router = useRouter();
  const { state, actions, computed } = useSubscription();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  // BUG FIX #6: Changed default from 'BASIC' to 'free' (valid SubscriptionTier)
  const currentTier = (state.currentSubscription?.tier || 'free') as SubscriptionTier;
  const isActive = state.currentSubscription?.status === 'active';
  const daysRemaining = computed.daysRemaining;
  const benefits: any = state.currentSubscription?.benefits || {};
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const isMounted = useIsMounted();
  const { segment } = useUserIdentityStore();
  const savingsTitle = SEGMENT_SAVINGS_TITLE[segment] ?? 'Total Savings';

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchUsageStats();
  }, [isAuthenticated, authLoading]);

  // Fetch usage statistics
  const fetchUsageStats = async () => {
    try {
      setIsLoading(true);
      const response = await subscriptionAPI.getSubscriptionUsage();
      if (response) {
        setStats(response);
      }
    } catch (error: any) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = () => {
    // Navigate to cancellation feedback flow
    router.push('/subscription/cancel-feedback');
  };

  // Handle upgrade
  const handleUpgrade = () => {
    if (currentTier === 'free') {
      // Free users should see all plans to choose from
      router.push('/subscription/plans');
    } else {
      // Premium users go directly to VIP upgrade confirmation
      router.push({
        pathname: '/subscription/upgrade-confirmation',
        params: {
          currentTier: currentTier,
          newTier: 'vip',
        },
      });
    }
  };

  // Render usage stat card
  const renderStatCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <ThemedText style={styles.statValue}>{value}</ThemedText>
        <ThemedText style={styles.statTitle}>{title}</ThemedText>
      </View>
    </View>
  );

  // Render benefit item with locked/unlocked state
  const renderBenefit = (title: string, isActive: boolean, icon: string) => {
    if (isActive) {
      return (
        <View style={styles.benefitRow}>
          <View style={[styles.benefitIcon, { backgroundColor: Colors.success + '20' }]}>
            <Ionicons name={icon as any} size={20} color={Colors.success} />
          </View>
          <ThemedText style={styles.benefitText}>{title}</ThemedText>
          <View style={styles.activeBadge}>
            <ThemedText style={styles.activeBadgeText}>Active</ThemedText>
          </View>
        </View>
      );
    }
    return (
      <Pressable
        style={styles.benefitRow}
        onPress={() => router.push('/subscription/plans')}
       
      >
        <View style={[styles.benefitIcon, { backgroundColor: Colors.border.default }]}>
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={12} color={Colors.text.tertiary} />
          </View>
          <Ionicons name={icon as any} size={20} color={Colors.text.tertiary} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.benefitTextInactive}>{title}</ThemedText>
          <ThemedText style={styles.upgradeHint}>Upgrade to unlock</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.border.default} />
      </Pressable>
    );
  };

  const tierColor = TIER_COLORS[currentTier];
  const tierGradient = TIER_GRADIENTS[currentTier];
  const tierIcon = TIER_ICONS[currentTier];

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={tierColor} />

      {/* Header */}
      <LinearGradient colors={tierGradient as any} style={styles.header}>
        <View style={styles.headerContainer}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Manage Subscription</ThemedText>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      {/* Loading Skeleton */}
      {state.isLoading && !state.currentSubscription && (
        <ManageSubscriptionSkeleton />
      )}

      {/* Payment Failed Banner */}
      {state.currentSubscription?.status === 'grace_period' && (
        <PaymentFailedBanner
          daysRemaining={daysRemaining}
          onRetryPayment={() => router.push('/subscription/billing')}
        />
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Current Plan Card */}
        <View style={styles.currentPlanCard}>
          <LinearGradient colors={tierGradient as any} style={styles.planHeaderGradient}>
            <Ionicons name={tierIcon as any} size={48} color={Colors.text.inverse} />
            <ThemedText style={styles.planTierName}>
              {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Plan
            </ThemedText>
            {isActive && (
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.text.inverse} />
                <ThemedText style={styles.statusText}>Active</ThemedText>
              </View>
            )}
          </LinearGradient>

          <View style={styles.planDetails}>
            {currentTier !== 'free' && (
              <>
                <View style={styles.planDetailRow}>
                  <ThemedText style={styles.planDetailLabel}>Billing Cycle</ThemedText>
                  <ThemedText style={styles.planDetailValue}>
                    {state.currentSubscription?.billingCycle || 'Monthly'}
                  </ThemedText>
                </View>
                <View style={styles.planDetailRow}>
                  <ThemedText style={styles.planDetailLabel}>Days Remaining</ThemedText>
                  <ThemedText style={styles.planDetailValue}>{daysRemaining} days</ThemedText>
                </View>
                <View style={styles.planDetailRow}>
                  <ThemedText style={styles.planDetailLabel}>Auto Renewal</ThemedText>
                  <ThemedText style={styles.planDetailValue}>
                    {state.currentSubscription?.autoRenew ? 'On' : 'Off'}
                  </ThemedText>
                </View>
              </>
            )}

            {currentTier === 'free' && (
              <View style={styles.upgradePrompt}>
                <ThemedText style={styles.upgradePromptText}>
                  Upgrade to Premium or VIP to unlock exclusive benefits!
                </ThemedText>
                <Pressable style={styles.upgradePromptButton} onPress={handleUpgrade}>
                  <ThemedText style={styles.upgradePromptButtonText}>View Plans</ThemedText>
                  <Ionicons name="arrow-forward" size={16} color={Colors.text.inverse} />
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Usage Statistics */}
        {stats && currentTier !== 'free' && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Usage Statistics</ThemedText>
            <View style={styles.statsGrid}>
              {renderStatCard(
                savingsTitle,
                `${currencySymbol}${stats.usage?.totalSavings || 0}`,
                'cash-outline',
                colors.successScale[400]
              )}
              {renderStatCard(
                'Orders This Month',
                stats.usage?.ordersThisMonth || 0,
                'cart-outline',
                colors.brand.purpleLight
              )}
              {renderStatCard(
                'Cashback Earned',
                `${currencySymbol}${stats.usage?.cashbackEarned || 0}`,
                'wallet-outline',
                colors.warningScale[400]
              )}
              {renderStatCard(
                'Delivery Saved',
                `${currencySymbol}${stats.usage?.deliveryFeesSaved || 0}`,
                'bicycle-outline',
                colors.infoScale[400]
              )}
            </View>

            {/* ROI Card */}
            {stats.roi && (
              <View style={styles.roiCard}>
                <ThemedText style={styles.roiTitle}>Return on Investment</ThemedText>
                <View style={styles.roiContent}>
                  <View style={styles.roiRow}>
                    <ThemedText style={styles.roiLabel}>Subscription Cost</ThemedText>
                    <ThemedText style={styles.roiValue}>{currencySymbol}{stats.roi.subscriptionCost}</ThemedText>
                  </View>
                  <View style={styles.roiRow}>
                    <ThemedText style={styles.roiLabel}>Total Savings</ThemedText>
                    <ThemedText style={[styles.roiValue, { color: Colors.success }]}>
                      {currencySymbol}{stats.roi.totalSavings}
                    </ThemedText>
                  </View>
                  <View style={[styles.roiRow, styles.roiTotalRow]}>
                    <ThemedText style={styles.roiTotalLabel}>Net Savings</ThemedText>
                    <ThemedText style={styles.roiTotalValue}>
                      {currencySymbol}{stats.roi.netSavings}
                    </ThemedText>
                  </View>
                  <View style={styles.roiPercentage}>
                    <ThemedText style={styles.roiPercentageText}>
                      {stats.roi.roiPercentage}% ROI
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Active Benefits */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Your Benefits</ThemedText>
          <View style={styles.benefitsContainer}>
            {renderBenefit(
              `${benefits?.cashbackMultiplier || 1}x Cashback Multiplier`,
              true,
              'cash'
            )}
            {renderBenefit('Free Delivery', benefits?.freeDelivery || false, 'bicycle')}
            {renderBenefit('Priority Support', benefits?.prioritySupport || false, 'headset')}
            {renderBenefit('Exclusive Deals', benefits?.exclusiveDeals || false, 'pricetag')}
            {renderBenefit(
              'Unlimited Wishlists',
              benefits?.unlimitedWishlists || false,
              'heart'
            )}
            {renderBenefit(
              'Early Flash Sales',
              benefits?.earlyFlashSaleAccess || false,
              'flash'
            )}
            {currentTier === 'vip' && (
              <>
                {renderBenefit('Personal Shopper', true, 'person')}
                {renderBenefit('Premium Events', true, 'calendar')}
                {renderBenefit('Concierge Service', true, 'shield-checkmark')}
              </>
            )}

            {/* Locked benefits divider for non-VIP users */}
            {currentTier !== 'vip' && (
              <>
                <View style={styles.lockedDivider}>
                  <View style={styles.dividerLine} />
                  <ThemedText style={styles.dividerText}>What you're missing</ThemedText>
                  <View style={styles.dividerLine} />
                </View>
                {currentTier === 'free' && (
                  <>
                    {renderBenefit('Priority Support', false, 'headset')}
                    {renderBenefit('Exclusive Deals', false, 'pricetag')}
                  </>
                )}
                {renderBenefit('Personal Shopper', false, 'person')}
                {renderBenefit('Premium Events', false, 'calendar')}
                {renderBenefit('Concierge Service', false, 'shield-checkmark')}
                {renderBenefit('Birthday Offer', false, 'gift')}
              </>
            )}
          </View>
        </View>

        {/* Actions */}
        {currentTier !== 'free' && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Manage Plan</ThemedText>

            <Pressable
              style={styles.actionButton}
              onPress={() => router.push('/subscription/billing')}
            >
              <Ionicons name="receipt-outline" size={24} color={Colors.info} />
              <View style={styles.actionContent}>
                <ThemedText style={styles.actionTitle}>View Billing History</ThemedText>
                <ThemedText style={styles.actionSubtitle}>
                  See payments and download invoices
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.text.tertiary} />
            </Pressable>

            {currentTier === 'premium' && (
              <Pressable style={styles.actionButton} onPress={handleUpgrade}>
                <Ionicons name="arrow-up-circle-outline" size={24} color={Colors.warning} />
                <View style={styles.actionContent}>
                  <ThemedText style={styles.actionTitle}>Upgrade to VIP</ThemedText>
                  <ThemedText style={styles.actionSubtitle}>
                    Get 3x cashback and exclusive benefits
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={24} color={Colors.text.tertiary} />
              </Pressable>
            )}

            <Pressable
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelSubscription}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator color={Colors.error} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={24} color={Colors.error} />
                  <View style={styles.actionContent}>
                    <ThemedText style={[styles.actionTitle, { color: Colors.error }]}>
                      Cancel Subscription
                    </ThemedText>
                    <ThemedText style={styles.actionSubtitle}>
                      You'll keep benefits until period ends
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={Colors.text.tertiary} />
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ThemedView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: StatusBar.currentHeight || 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  currentPlanCard: {
    margin: Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.strong,
  },
  planHeaderGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  planTierName: {
    color: Colors.text.inverse,
    ...Typography.h1,
    fontWeight: 'bold',
    marginTop: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  statusText: {
    color: Colors.text.inverse,
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  planDetails: {
    padding: Spacing.lg,
  },
  planDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  planDetailLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  planDetailValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  upgradePrompt: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  upgradePromptText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  upgradePromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.purpleLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  upgradePromptButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.subtle,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  statTitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  roiCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginTop: Spacing.md,
    ...Shadows.subtle,
  },
  roiTitle: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  roiContent: {
    gap: Spacing.sm,
  },
  roiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  roiLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  roiValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  roiTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
  },
  roiTotalLabel: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  roiTotalValue: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.success,
  },
  roiPercentage: {
    backgroundColor: Colors.success + '20',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  roiPercentageText: {
    ...Typography.body,
    fontWeight: 'bold',
    color: Colors.success,
  },
  benefitsContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  benefitText: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  benefitTextInactive: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  upgradeHint: {
    ...Typography.caption,
    color: Colors.border.default,
    marginTop: 1,
  },
  lockOverlay: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.sm,
    padding: 1,
    zIndex: 1,
  },
  lockedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.default,
  },
  dividerText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  activeBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  activeBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.success,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  actionContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  actionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  actionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.errorScale[50],
    backgroundColor: Colors.errorScale[50],
  },
});

export default withErrorBoundary(SubscriptionManagePage, 'SubscriptionManage');
