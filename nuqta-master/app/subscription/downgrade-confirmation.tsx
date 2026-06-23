import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Downgrade Confirmation Screen
// Warning screen before downgrading subscription tier

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, StatusBar, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useGetCurrencySymbol } from '@/stores/selectors';
import subscriptionAPI from '@/services/subscriptionApi';
import { SubscriptionTier, TIER_NAMES, TIER_COLORS } from '@/types/subscription.types';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function DowngradeConfirmationPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state, computed, actions } = useSubscription();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const currentTier = (params.currentTier as SubscriptionTier) || state.currentSubscription?.tier || 'premium';
  const newTier = (params.newTier as SubscriptionTier) || 'free';

  const [understood, setUnderstood] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const isMounted = useIsMounted();

  const calculateCredit = () => {
    const daysRemaining = computed.daysRemaining;
    // Get price from DB-driven available tiers, fall back to subscription price
    const tierConfig = state.availableTiers?.find((t: any) => t.tier === currentTier);
    const billingCycle = state.currentSubscription?.billingCycle || 'monthly';
    const currentPrice = tierConfig?.pricing
      ? (billingCycle === 'yearly' ? tierConfig.pricing.yearly : tierConfig.pricing.monthly)
      : (state.currentSubscription?.price || 0);
    const totalDays = billingCycle === 'yearly' ? 365 : 30;
    const dailyRate = currentPrice / totalDays;
    return Math.round(dailyRate * daysRemaining);
  };

  const getEffectiveDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + computed.daysRemaining);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getLostFeatures = () => {
    if (currentTier === 'vip' && newTier === 'premium') {
      return [
        { icon: 'cash', text: '3x cashback (downgrade to 2x)' },
        { icon: 'bicycle', text: 'Free delivery on ALL orders' },
        { icon: 'person', text: 'Personal shopper assistance' },
        { icon: 'calendar', text: 'Premium events access' },
        { icon: 'shield-checkmark', text: 'Dedicated concierge service' },
      ];
    } else if (currentTier === 'vip' && newTier === 'free') {
      return [
        { icon: 'cash', text: '3x cashback multiplier' },
        { icon: 'bicycle', text: 'Free delivery on all orders' },
        { icon: 'headset', text: 'Priority customer support' },
        { icon: 'person', text: 'Personal shopper assistance' },
        { icon: 'calendar', text: 'Premium events access' },
        { icon: 'shield-checkmark', text: 'Concierge service' },
        { icon: 'pricetag', text: 'Exclusive deals & early access' },
        { icon: 'flash', text: 'Early flash sale access' },
      ];
    } else if (currentTier === 'premium' && newTier === 'free') {
      return [
        { icon: 'cash', text: '2x cashback multiplier' },
        { icon: 'bicycle', text: `Free delivery (orders above ${currencySymbol}500)` },
        { icon: 'headset', text: 'Priority customer support' },
        { icon: 'pricetag', text: 'Exclusive deals & early access' },
        { icon: 'heart', text: 'Unlimited wishlists' },
        { icon: 'gift', text: 'Birthday & anniversary offers' },
      ];
    }
    return [];
  };

  const getRetainedFeatures = () => {
    if (newTier === 'premium') {
      return [
        { icon: 'cash', text: '2x cashback on all orders' },
        { icon: 'bicycle', text: `Free delivery (orders above ${currencySymbol}500)` },
        { icon: 'headset', text: 'Priority customer support' },
        { icon: 'pricetag', text: 'Exclusive deals' },
      ];
    } else if (newTier === 'free') {
      return [
        { icon: 'cash', text: 'Basic cashback' },
        { icon: 'home', text: 'Access to all stores' },
        { icon: 'mail', text: 'Email support' },
      ];
    }
    return [];
  };

  const handleDowngrade = async () => {
    if (!understood) {
      platformAlertSimple('Confirmation Required', 'Please confirm that you understand the consequences of downgrading.');
      return;
    }

    try {
      setIsDowngrading(true);

      const result = await subscriptionAPI.downgradeSubscription(newTier as 'free' | 'premium');

      await actions.refreshSubscription();

      platformAlertSimple('Downgrade Scheduled', `Your plan will change to ${TIER_NAMES[newTier]} on ${getEffectiveDate()}. ${calculateCredit() > 0 ? `${currencySymbol}${calculateCredit()} will be added to your wallet.` : ''}`);
      router.push('/subscription/manage');
    } catch (error: any) {
      platformAlertSimple('Downgrade Failed', error.message || 'Failed to process downgrade');
    } finally {
      if (!isMounted()) return;
      setIsDowngrading(false);
    }
  };

  const creditAmount = calculateCredit();

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.warning} />

      {/* Header */}
      <LinearGradient colors={[Colors.warning, colors.warningScale[700]] as any} style={styles.header}>
        <View style={styles.headerContainer}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to cancel and return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Confirm Downgrade</ThemedText>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={32} color={Colors.warning} />
          <ThemedText style={styles.warningTitle}>You're about to lose benefits</ThemedText>
          <ThemedText style={styles.warningMessage}>
            Downgrading to {TIER_NAMES[newTier]} will remove several premium features from your account
          </ThemedText>
        </View>

        {/* Plan Comparison */}
        <View style={styles.comparisonCard}>
          <View style={styles.comparisonRow}>
            <View style={[styles.planBox, { borderColor: TIER_COLORS[currentTier] }]}>
              <ThemedText style={styles.planLabel}>Current Plan</ThemedText>
              <ThemedText style={[styles.planName, { color: TIER_COLORS[currentTier] }]}>
                {TIER_NAMES[currentTier]}
              </ThemedText>
            </View>

            <Ionicons name="arrow-forward" size={32} color={Colors.text.tertiary} />

            <View style={[styles.planBox, { borderColor: TIER_COLORS[newTier] }]}>
              <ThemedText style={styles.planLabel}>New Plan</ThemedText>
              <ThemedText style={[styles.planName, { color: TIER_COLORS[newTier] }]}>
                {TIER_NAMES[newTier]}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Features You'll Lose */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Features You'll Lose</ThemedText>
          <View style={styles.featuresContainer}>
            {getLostFeatures().map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.lostIcon}>
                  <Ionicons name="close-circle" size={24} color={Colors.error} />
                </View>
                <ThemedText style={styles.lostFeatureText}>{feature.text}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Features You'll Keep */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Features You'll Keep</ThemedText>
          <View style={styles.featuresContainer}>
            {getRetainedFeatures().map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.retainedIcon}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                </View>
                <ThemedText style={styles.retainedFeatureText}>{feature.text}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Credit Info */}
        {creditAmount > 0 && (
          <View style={styles.creditCard}>
            <Ionicons name="wallet" size={32} color={Colors.success} />
            <View style={styles.creditContent}>
              <ThemedText style={styles.creditTitle}>Wallet Credit</ThemedText>
              <ThemedText style={styles.creditMessage}>
                We'll add {currencySymbol}{creditAmount} to your wallet for unused days on your current plan
              </ThemedText>
            </View>
          </View>
        )}

        {/* Effective Date */}
        <View style={styles.dateCard}>
          <Ionicons name="calendar-outline" size={24} color={Colors.brand.purpleLight} />
          <View style={styles.dateContent}>
            <ThemedText style={styles.dateLabel}>Effective Date</ThemedText>
            <ThemedText style={styles.dateValue}>{getEffectiveDate()}</ThemedText>
            <ThemedText style={styles.dateNote}>
              You'll keep {TIER_NAMES[currentTier]} benefits until then
            </ThemedText>
          </View>
        </View>

        {/* Confirmation Checkbox */}
        <Pressable
          style={styles.checkboxContainer}
          onPress={() => setUnderstood(!understood)}
          accessibilityRole="checkbox"
          accessibilityLabel={`I understand the consequences. ${understood ? 'Checked' : 'Unchecked'}`}
          accessibilityState={{ checked: understood }}
          accessibilityHint="Double tap to confirm you understand you will lose premium benefits"
        >
          <View style={[styles.checkbox, understood && styles.checkboxChecked]}>
            {understood && <Ionicons name="checkmark" size={20} color={Colors.text.inverse} />}
          </View>
          <ThemedText style={styles.checkboxLabel}>
            I understand I will lose these benefits and want to proceed with the downgrade
          </ThemedText>
        </Pressable>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={[styles.downgradeButton, !understood && styles.downgradeButtonDisabled]}
            onPress={handleDowngrade}
            disabled={!understood || isDowngrading}
            accessibilityLabel={isDowngrading ? 'Processing downgrade' : 'Confirm downgrade'}
            accessibilityRole="button"
            accessibilityState={{ disabled: !understood || isDowngrading, busy: isDowngrading }}
            accessibilityHint={understood ? 'Double tap to confirm downgrade' : 'Confirm checkbox first to enable this button'}
          >
            {isDowngrading ? (
              <ActivityIndicator color={Colors.text.inverse} />
            ) : (
              <ThemedText style={styles.downgradeButtonText}>Confirm Downgrade</ThemedText>
            )}
          </Pressable>

          <Pressable
            style={styles.keepPlanButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            disabled={isDowngrading}
            accessibilityLabel="Keep my current plan"
            accessibilityRole="button"
            accessibilityState={{ disabled: isDowngrading }}
            accessibilityHint="Double tap to cancel downgrade and keep your current subscription"
          >
            <ThemedText style={styles.keepPlanButtonText}>Keep My Current Plan</ThemedText>
          </Pressable>
        </View>
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
  warningBanner: {
    margin: Spacing.lg,
    backgroundColor: colors.tint.amberLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.warningScale[200],
  },
  warningTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: colors.brand.amberDark,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  warningMessage: {
    ...Typography.body,
    color: colors.brand.amberDark,
    textAlign: 'center',
    lineHeight: 20,
  },
  comparisonCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  planBox: {
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
    minWidth: 110,
  },
  planLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  planName: {
    ...Typography.h4,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  featuresContainer: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  lostIcon: {
    marginRight: Spacing.md,
  },
  retainedIcon: {
    marginRight: Spacing.md,
  },
  lostFeatureText: {
    flex: 1,
    ...Typography.body,
    color: Colors.error,
    textDecorationLine: 'line-through',
  },
  retainedFeatureText: {
    flex: 1,
    ...Typography.body,
    color: Colors.success,
  },
  creditCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    flexDirection: 'row',
    backgroundColor: colors.successScale[100],
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.md,
  },
  creditContent: {
    flex: 1,
  },
  creditTitle: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: Spacing.xs,
  },
  creditMessage: {
    ...Typography.bodySmall,
    color: colors.successScale[700],
    lineHeight: 18,
  },
  dateCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateContent: {
    flex: 1,
  },
  dateLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  dateValue: {
    ...Typography.bodyLarge,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  dateNote: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  checkboxContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.brand.purpleLight,
    borderColor: Colors.brand.purpleLight,
  },
  checkboxLabel: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  actionsContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 40,
  },
  downgradeButton: {
    backgroundColor: Colors.warning,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  downgradeButtonDisabled: {
    backgroundColor: Colors.border.default,
  },
  downgradeButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: 'bold',
  },
  keepPlanButton: {
    backgroundColor: Colors.brand.purpleLight,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  keepPlanButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: 'bold',
  },
});

export default withErrorBoundary(DowngradeConfirmationPage, 'SubscriptionDowngradeConfirmation');
