import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Payment Success Page
import React, { useEffect, useState, useLayoutEffect } from 'react';
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
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { showToast } from '@/components/common/ToastManager';
import { Platform } from 'react-native';
import subscriptionAPI from '@/services/subscriptionApi';
import { useIsMounted } from '@/hooks/useIsMounted';

function PaymentSuccessPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const { state, actions } = useSubscription();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  // Hide the default header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  const isMounted = useIsMounted();

  useEffect(() => {
    // Reload subscription data to get updated status
    const loadSubscription = async () => {
      try {
        // CRITICAL: After Stripe redirect, ensure token is restored first
        const authStorage = require('@/utils/authStorage');
        const token = await authStorage.getAuthToken();

        if (!token) {
          // Wait for token to be restored from localStorage
          await new Promise(resolve => setTimeout(resolve, 500));

          const tokenNow = await authStorage.getAuthToken();
          if (!tokenNow) {
            throw new Error('Token not available after waiting');
          }
        }

        // Check if this is an upgrade flow — confirm the upgrade first
        if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
          const pendingUpgradeId = sessionStorage.getItem('pendingUpgradeId');
          if (pendingUpgradeId) {
            try {
              await subscriptionAPI.confirmUpgrade(pendingUpgradeId);
            } catch (upgradeError: any) {
              // If already completed, that's fine (idempotent)
              if (!upgradeError?.message?.includes('already completed')) {
              }
            } finally {
              sessionStorage.removeItem('pendingUpgradeId');
            }
          }
        }

        // Retry mechanism: Try up to 3 times with delays
        let freshSubscription = null;
        let retries = 3;

        for (let i = 0; i < retries; i++) {
          freshSubscription = await subscriptionAPI.getCurrentSubscription();

          // Check if we got real data (not free-default fallback)
          if (freshSubscription && freshSubscription._id !== 'free-default') {
            break;
          }

          // If we got free-default, wait and retry
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
          }
        }

        if (!freshSubscription || freshSubscription._id === 'free-default') {
        }

        if (!isMounted()) return;
        setSubscriptionData(freshSubscription);

        // Haptic feedback on successful subscription payment
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        // Also update context
        await actions.loadSubscription(true);

        if (!isMounted()) return;
        setLoading(false);

        if (Platform.OS === 'web') {
          showToast({ message: 'Payment successful! Your subscription is now active.', type: 'success', duration: 5000 });
        }
      } catch (error) {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    loadSubscription();
  }, []);

  const handleContinue = () => {
    router.replace('/');
  };

  const handleViewSubscription = () => {
    router.replace('/subscription/manage');
  };

  // Use fresh subscription data if available, otherwise fall back to context
  const subscription = subscriptionData || state.currentSubscription;
  const tier = subscription?.tier || 'premium';
  const tierName = tier === 'vip' ? 'VIP' : tier === 'premium' ? 'Premium' : 'Free';
  const amount = subscription?.price || 0;

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />

      {/* Success Header */}
      <LinearGradient colors={[Colors.gold, Colors.nileBlue] as const} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.text.inverse} />
          </View>
          <ThemedText style={styles.headerTitle}>Payment Successful!</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            {loading ? 'Loading subscription details...' : `Your ${tierName} subscription is now active`}
          </ThemedText>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.gold} />
            <ThemedText style={styles.loadingText}>Loading subscription details...</ThemedText>
          </View>
        ) : (
          <>
            {/* Subscription Details */}
            <View style={styles.detailsCard}>
              <View style={styles.detailsHeader}>
                <Ionicons name="star" size={24} color={Colors.gold} />
                <ThemedText style={styles.detailsTitle}>Subscription Details</ThemedText>
              </View>

              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Plan:</ThemedText>
                <ThemedText style={styles.detailValue}>{tierName}</ThemedText>
              </View>

              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Status:</ThemedText>
                <View style={styles.statusBadge}>
                  <ThemedText style={styles.statusText}>
                    {subscription?.status === 'trial' ? 'Trial Active' : 'Active'}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Billing:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {subscription?.billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}
                </ThemedText>
              </View>

              {subscription?.trialEndDate && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Trial Ends:</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {new Date(subscription.trialEndDate).toLocaleDateString()}
                  </ThemedText>
                </View>
              )}

              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Next Billing:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {subscription?.endDate
                    ? new Date(subscription.endDate).toLocaleDateString()
                    : 'N/A'}
                </ThemedText>
              </View>

              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Amount:</ThemedText>
                <ThemedText style={styles.detailValueHighlight}>
                  {currencySymbol}{amount}
                </ThemedText>
              </View>
            </View>

            {/* Benefits Section */}
            <View style={styles.benefitsCard}>
              <View style={styles.benefitsHeader}>
                <Ionicons name="gift" size={24} color={Colors.brand.purpleLight} />
                <ThemedText style={styles.benefitsTitle}>Your Benefits</ThemedText>
              </View>

              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
                  <ThemedText style={styles.benefitText}>
                    {tier === 'vip' ? '3x' : '2x'} cashback on all orders
                  </ThemedText>
                </View>

                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
                  <ThemedText style={styles.benefitText}>
                    Free delivery on {tier === 'vip' ? 'all orders' : `orders above ${currencySymbol}500`}
                  </ThemedText>
                </View>

                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
                  <ThemedText style={styles.benefitText}>
                    Priority customer support
                  </ThemedText>
                </View>

                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
                  <ThemedText style={styles.benefitText}>
                    Exclusive deals & early access
                  </ThemedText>
                </View>

                {tier === 'vip' && (
                  <>
                    <View style={styles.benefitItem}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
                      <ThemedText style={styles.benefitText}>
                        Personal shopping assistant
                      </ThemedText>
                    </View>

                    <View style={styles.benefitItem}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
                      <ThemedText style={styles.benefitText}>
                        Premium events access
                      </ThemedText>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Trial Info */}
            {subscription?.status === 'trial' && (
              <View style={styles.trialInfoCard}>
                <Ionicons name="information-circle" size={24} color={Colors.info} />
                <View style={styles.trialInfoContent}>
                  <ThemedText style={styles.trialInfoTitle}>7-Day Free Trial</ThemedText>
                  <ThemedText style={styles.trialInfoText}>
                    Your trial is active! You won't be charged until {' '}
                    {subscription.trialEndDate
                      ? new Date(subscription.trialEndDate).toLocaleDateString()
                      : '7 days from now'}
                    . Cancel anytime before then for a full refund.
                  </ThemedText>
                </View>
              </View>
            )}

            {/* What's Next */}
            <View style={styles.nextStepsCard}>
              <ThemedText style={styles.nextStepsTitle}>What's Next?</ThemedText>

              <Pressable style={styles.nextStepItem}>
                <View style={styles.nextStepIcon}>
                  <Ionicons name="cart" size={24} color={Colors.brand.purpleLight} />
                </View>
                <View style={styles.nextStepContent}>
                  <ThemedText style={styles.nextStepTitle}>Start Shopping</ThemedText>
                  <ThemedText style={styles.nextStepText}>
                    Explore stores and start earning cashback
                  </ThemedText>
                </View>
              </Pressable>

              <Pressable style={styles.nextStepItem}>
                <View style={styles.nextStepIcon}>
                  <Ionicons name="wallet" size={24} color={Colors.gold} />
                </View>
                <View style={styles.nextStepContent}>
                  <ThemedText style={styles.nextStepTitle}>Track Savings</ThemedText>
                  <ThemedText style={styles.nextStepText}>
                    Monitor your cashback and savings in your wallet
                  </ThemedText>
                </View>
              </Pressable>

              <Pressable style={styles.nextStepItem}>
                <View style={styles.nextStepIcon}>
                  <Ionicons name="settings" size={24} color={Colors.warning} />
                </View>
                <View style={styles.nextStepContent}>
                  <ThemedText style={styles.nextStepTitle}>Manage Subscription</ThemedText>
                  <ThemedText style={styles.nextStepText}>
                    Update billing, cancel, or upgrade anytime
                  </ThemedText>
                </View>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable style={styles.primaryButton} onPress={handleContinue}>
          <ThemedText style={styles.primaryButtonText}>Continue Shopping</ThemedText>
          <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleViewSubscription}>
          <ThemedText style={styles.secondaryButtonText}>View Subscription</ThemedText>
        </Pressable>
      </View>

      {/* Toast handled by global ToastManager */}
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
    paddingBottom: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    color: Colors.text.inverse,
    ...Typography.h1,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  headerSubtitle: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    textAlign: 'center',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: Spacing['3xl'],
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  detailsCard: {
    backgroundColor: Colors.background.primary,
    margin: Spacing.lg,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  detailsTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginLeft: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  detailLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  detailValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  detailValueHighlight: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.gold,
  },
  statusBadge: {
    backgroundColor: Colors.linen,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    color: Colors.nileBlue,
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  benefitsCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  benefitsTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginLeft: Spacing.md,
  },
  benefitsList: {
    gap: Spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    marginLeft: Spacing.md,
    ...Typography.body,
    color: Colors.text.secondary,
    flex: 1,
  },
  trialInfoCard: {
    backgroundColor: Colors.infoScale[50],
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  trialInfoContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  trialInfoTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: Spacing.xs,
  },
  trialInfoText: {
    ...Typography.bodySmall,
    color: Colors.info,
    lineHeight: 18,
  },
  nextStepsCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: 100,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  nextStepsTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  nextStepIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepContent: {
    flex: 1,
    marginLeft: Spacing.base,
  },
  nextStepTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  nextStepText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.primary,
    padding: Spacing.lg,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    ...Shadows.medium,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.text.secondary,
    ...Typography.body,
    fontWeight: '600',
  },
});

export default withErrorBoundary(PaymentSuccessPage, 'SubscriptionPaymentSuccess');
